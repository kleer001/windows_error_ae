"""Compositor — merge chain wiring, roto split, rebuild.

Builds the Nuke node graph inside a Group node.
"""

import nuke

from .core.constants import BLEND_MODE_MAP
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
    for node in to_delete:
        nuke.delete(node)
    group.end()


def generate(group, settings=None):
    """Generate the full WindowsErrorFX network inside the Group.

    Args:
        group: The Nuke Group node containing Input/Output nodes.
        settings: Settings dict. Uses defaults if None.
    """
    if settings is None:
        settings = default_settings()

    # Clear previous generated nodes
    clear_generated_nodes(group)

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

    comp_info = {
        "width": comp_w,
        "height": comp_h,
        "frameRate": frame_rate,
        "totalFrames": total_frames,
    }

    # Run the scheduler
    jobs = schedule(settings, comp_info)

    if not jobs:
        output_node.setInput(0, input_node)
        group.end()
        return

    # Determine roto mode
    roto_mode = settings.get("rotoMode", "flat")
    has_roto = roto_input is not None and roto_mode != "flat"

    # Separate jobs into over and under
    over_jobs = [j for j in jobs if j["layer"] == "over"]
    under_jobs = [j for j in jobs if j["layer"] == "under"]

    # Build element nodes
    all_nodes = []
    footage_node = input_node

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

    else:
        # Flat mode: all elements composited over footage
        current = input_node
        for job in jobs:
            element_out, element_nodes = _build_element(job, comp_w, comp_h, frame_rate, footage_node)
            if element_out is None:
                continue
            all_nodes.extend(element_nodes)

            merge = _create_element_merge(job, current, element_out, all_nodes)
            current = merge

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


def _build_element(job, comp_w, comp_h, frame_rate, footage_node):
    """Dispatch to the correct builder based on job type."""
    type_name = job["type"]

    if type_name in BUILDER_MAP:
        return BUILDER_MAP[type_name](job, comp_w, comp_h, frame_rate)
    elif type_name == "pixel":
        return build_pixel(job, comp_w, comp_h, frame_rate, footage_node)
    elif type_name == "freeze":
        return build_freeze(job, comp_w, comp_h, frame_rate, footage_node)
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
