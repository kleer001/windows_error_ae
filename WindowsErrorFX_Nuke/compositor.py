"""Compositor — merge chain wiring, roto split, rebuild.

Builds the Nuke node graph inside a Group node.
"""

import nuke

from .core.constants import BLEND_MODE_MAP
from .core.log import wlog, wwarn, werr
from .core.scheduler import schedule
from .core.settings import default_settings, get_element_settings

from .builders.bsod import build_bsod
from .builders.dialog import build_dialog
from .builders.chrome import build_chrome
from .builders.text_overlay import build_text_overlay
from .builders.cursor import build_cursor
from .builders.pixel import build_pixel
from .builders.freeze import build_freeze
from .builders.overlays import build_noise, build_head_scratch


BUILDER_MAP = {
    "bsod": build_bsod,
    "dialog": build_dialog,
    "chrome": build_chrome,
    "text": build_text_overlay,
    "cursor": build_cursor,
}


def clear_generated_nodes(group):
    """Remove all WEFX_ prefixed nodes from inside the Group."""
    group.begin()
    to_delete = []
    for node in nuke.allNodes():
        if node.name().startswith("WEFX_"):
            to_delete.append(node)
    wlog("clearEffect: scanning nodes, found %d WEFX_ nodes to remove" % len(to_delete))
    for node in to_delete:
        wlog("  removing: \"%s\"" % node.name())
        nuke.delete(node)
    group.end()
    wlog("clearEffect: done")


def generate(group, settings=None):
    """Generate the full WindowsErrorFX network inside the Group.

    Args:
        group: The Nuke Group node containing Input/Output nodes.
        settings: Settings dict. Uses defaults if None.
    """
    if settings is None:
        settings = default_settings()

    wlog("=== GENERATE START ===")

    # Clear previous generated nodes
    wlog("Clearing existing nodes...")
    clear_generated_nodes(group)
    wlog("Cleared.")

    group.begin()

    # Find Input/Output nodes
    input_node = None
    roto_input = None
    output_node = None
    for node in nuke.allNodes():
        if node.Class() == "Input":
            if node["number"].value() == 0:
                input_node = node
            elif node["number"].value() == 1:
                roto_input = node
        elif node.Class() == "Output":
            output_node = node

    if not input_node or not output_node:
        werr("Missing Input or Output node inside Group")
        group.end()
        return

    # Comp info from the root
    root = nuke.root()
    fmt = root.format()
    comp_w = fmt.width()
    comp_h = fmt.height()
    frame_rate = root["fps"].value()
    first_frame = int(root["first_frame"].value())
    last_frame = int(root["last_frame"].value())
    total_frames = last_frame - first_frame + 1

    wlog("Comp: %dx%d @ %.2ffps, frames %d-%d (%d total)" % (
        comp_w, comp_h, frame_rate, first_frame, last_frame, total_frames))

    comp_info = {
        "width": comp_w,
        "height": comp_h,
        "frameRate": frame_rate,
        "totalFrames": total_frames,
    }

    # Run the scheduler
    wlog("Scheduling elements...")
    jobs = schedule(settings, comp_info)
    wlog("Scheduled %d elements" % len(jobs))

    if not jobs:
        wwarn("No elements scheduled. Chaos=%s" % settings.get("chaos"))
        output_node.setInput(0, input_node)
        group.end()
        return

    # Offset scheduler's 0-based frames to Nuke's absolute timeline
    for job in jobs:
        job["inFrame"] += first_frame
        job["outFrame"] += first_frame
        if "freezeFrame" in job:
            job["freezeFrame"] += first_frame

    # Determine roto mode
    roto_mode = settings.get("rotoMode", "flat")
    has_roto = roto_input is not None and roto_mode != "flat"
    if roto_input is None and roto_mode != "flat":
        wlog("No roto input connected, switched rotoMode to 'flat'")
    wlog("Effective rotoMode: %s" % ("split" if has_roto else "flat"))

    # Separate jobs into over and under
    over_jobs = [j for j in jobs if j["layer"] == "over"]
    under_jobs = [j for j in jobs if j["layer"] == "under"]

    # Job summary
    type_counts = {}
    for job in jobs:
        t = job["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    summary_parts = ["%s=%d" % (t, c) for t, c in sorted(type_counts.items())]
    wlog("  Types: %s" % ", ".join(summary_parts))
    wlog("  Layers: over=%d, under=%d" % (len(over_jobs), len(under_jobs)))
    wlog("  Frame range: %d to %d" % (jobs[0]["inFrame"], jobs[-1]["outFrame"]))

    # Build element nodes
    wlog("Building %d elements..." % len(jobs))
    all_nodes = []
    footage_node = input_node
    built_count = 0

    if has_roto:
        # Split mode: build UNDER elements, then stencil with roto, then OVER elements
        current = input_node

        # UNDER elements
        for job in under_jobs:
            element_out, element_nodes = _build_element(job, comp_w, comp_h, frame_rate, footage_node)
            if element_out is None:
                continue
            all_nodes.extend(element_nodes)

            merge = _create_element_merge(job, current, element_out, all_nodes)
            current = merge
            built_count += 1

        # Stencil: composite the roto subject on top of the UNDER result
        # This puts the subject (with its matte) on top of background + under elements
        roto_merge = nuke.nodes.Merge2(name="WEFX_roto_merge")
        roto_merge.setInput(0, current)
        roto_merge.setInput(1, roto_input)
        roto_merge["operation"].setValue("over")
        all_nodes.append(roto_merge)
        current = roto_merge

        # OVER elements
        for job in over_jobs:
            element_out, element_nodes = _build_element(job, comp_w, comp_h, frame_rate, footage_node)
            if element_out is None:
                continue
            all_nodes.extend(element_nodes)

            merge = _create_element_merge(job, current, element_out, all_nodes)
            current = merge
            built_count += 1

    else:
        # Flat mode: all elements composited over footage
        current = input_node
        for job in jobs:
            element_out, element_nodes = _build_element(job, comp_w, comp_h, frame_rate, footage_node)
            if element_out is None:
                if job["type"] == "freeze":
                    wlog("  Skipping freeze (no footage layer)")
                continue
            all_nodes.extend(element_nodes)

            merge = _create_element_merge(job, current, element_out, all_nodes)
            current = merge
            built_count += 1

    # Add overlays (noise, head scratch)
    noise_out, noise_nodes = build_noise(settings, comp_w, comp_h)
    if noise_out:
        all_nodes.extend(noise_nodes)
        noise_merge = nuke.nodes.Merge2(name="WEFX_noise_merge")
        noise_merge.setInput(0, current)
        noise_merge.setInput(1, noise_out)
        noise_merge["operation"].setValue("overlay")
        noise_merge["mix"].setValue(1.0)
        all_nodes.append(noise_merge)
        current = noise_merge

    hs_out, hs_nodes = build_head_scratch(settings, comp_w, comp_h, total_frames, frame_rate)
    if hs_out:
        all_nodes.extend(hs_nodes)
        hs_merge = nuke.nodes.Merge2(name="WEFX_hscratch_merge")
        hs_merge.setInput(0, current)
        hs_merge.setInput(1, hs_out)
        hs_merge["operation"].setValue("plus")
        # Visibility: only show for 2-3 frames every freq frames
        hs_freq = settings.get("headScratch", {}).get("freq", 20)
        hs_merge["mix"].setExpression(
            "(frame %% %d < 3) ? 0.3 : 0" % hs_freq
        )
        all_nodes.append(hs_merge)
        current = hs_merge

    # Connect to output
    output_node.setInput(0, current)

    # Auto-layout
    for node in all_nodes:
        node.autoplace()

    group.end()

    wlog("Built %d/%d elements" % (built_count, len(jobs)))
    wlog("=== GENERATE COMPLETE ===")


def _build_element(job, comp_w, comp_h, frame_rate, footage_node):
    """Dispatch to the correct builder based on job type."""
    type_name = job["type"]

    desc_parts = ["type=%s" % type_name, "in=%d" % job["inFrame"], "out=%d" % job["outFrame"],
                  "layer=%s" % job.get("layer", "?")]
    if type_name == "dialog":
        desc_parts.append("variant=%s" % job.get("dialogVariant", "?"))
    elif type_name == "bsod":
        desc_parts.append("variant=%s" % job.get("variant", "?"))
    elif type_name == "cursor":
        desc_parts.append("behavior=%s" % job.get("behavior", "?"))
    elif type_name == "pixel":
        desc_parts.append("behavior=%s" % job.get("behavior", "?"))
    elif type_name == "freeze":
        desc_parts.append("behavior=%s" % job.get("behavior", "?"))
    wlog("  Build: %s" % ", ".join(desc_parts))

    if type_name in BUILDER_MAP:
        return BUILDER_MAP[type_name](job, comp_w, comp_h, frame_rate)
    elif type_name == "pixel":
        return build_pixel(job, comp_w, comp_h, frame_rate, footage_node)
    elif type_name == "freeze":
        return build_freeze(job, comp_w, comp_h, frame_rate, footage_node)

    wwarn("Unknown element type: %s" % type_name)
    return None, []


def _create_element_merge(job, bg_node, fg_node, all_nodes):
    """Create a Merge2 node for an element with proper operation and mix keyframes."""
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]

    merge_name = "WEFX_merge_%s_%d" % (job["type"], in_frame)
    merge = nuke.nodes.Merge2(name=merge_name)
    merge.setInput(0, bg_node)
    merge.setInput(1, fg_node)

    # Set blend mode
    blend_mode = job.get("blendMode", "normal")
    nuke_op = BLEND_MODE_MAP.get(blend_mode, "over")
    merge["operation"].setValue(nuke_op)

    # Set opacity via mix
    opacity = job.get("opacity", 100) / 100.0
    merge["mix"].setValue(opacity)

    # Element lifespan via mix keyframes
    # Before inFrame: mix=0, at inFrame: ramp up, at outFrame: ramp down, after: mix=0
    entry_frames = job.get("entryFrames", 3)
    exit_frames = job.get("exitFrames", 2)

    merge["mix"].setAnimated()

    # Off before element life
    if in_frame > 0:
        merge["mix"].setValueAt(0, in_frame - 1)

    # Entry ramp
    if entry_frames > 0:
        merge["mix"].setValueAt(0, in_frame)
        merge["mix"].setValueAt(opacity, in_frame + entry_frames)
    else:
        merge["mix"].setValueAt(opacity, in_frame)

    # Hold at opacity during life
    if exit_frames > 0:
        merge["mix"].setValueAt(opacity, out_frame - exit_frames)
        merge["mix"].setValueAt(0, out_frame)
    else:
        merge["mix"].setValueAt(opacity, out_frame)
        merge["mix"].setValueAt(0, out_frame + 1)

    all_nodes.append(merge)
    return merge
