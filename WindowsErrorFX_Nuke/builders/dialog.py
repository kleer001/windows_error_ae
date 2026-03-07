"""Dialog box element builder for Nuke."""

import nuke

from ..core.constants import (
    DIALOG_VARIANTS, DIALOG_WIDTH, DIALOG_HEIGHT,
    C_DIALOG_TITLE_TX, FONT_UI, FSIZE_DIALOG_BODY, FSIZE_DIALOG_TITLE,
    FSIZE_BUTTON,
)


def build_dialog(job, comp_w, comp_h, frame_rate):
    """Build Win9x dialog box nodes inside a Group.

    Uses Nuke Constant + Text2 nodes to draw the dialog.
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)
    variant_key = job.get("dialogVariant", "B")
    variant = DIALOG_VARIANTS[variant_key]

    dlg_w = int(DIALOG_WIDTH * scale)
    dlg_h = int(DIALOG_HEIGHT * scale)
    if variant_key == "C":
        dlg_h = int(147 * scale)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    prefix = "WEFX_dlg_%d" % in_frame

    # Dialog body background
    body_color = variant["body"]
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([body_color[0], body_color[1], body_color[2], 1.0])
    bg["format"].setValue(nuke.addFormat("%d %d WEFX_dlg_fmt" % (dlg_w, dlg_h)))

    # Title bar (using a Constant + Crop for the title area)
    title_h = int(variant["titleH"] * scale)
    title_start = variant["titleStart"]
    title_bg = nuke.nodes.Constant(name=prefix + "_title")
    title_bg["color"].setValue([title_start[0], title_start[1], title_start[2], 1.0])
    title_bg["format"].setValue(nuke.addFormat("%d %d WEFX_title_fmt" % (dlg_w, title_h)))

    # Merge title bar over body
    merge_title = nuke.nodes.Merge2(name=prefix + "_mergeTitle")
    merge_title.setInput(0, bg)
    merge_title.setInput(1, title_bg)
    merge_title["operation"].setValue("over")

    # Title text
    title_text = job.get("title", "Error")
    title_node = nuke.nodes.Text2(name=prefix + "_titleText")
    title_node.setInput(0, merge_title)
    title_node["message"].setValue(title_text)
    title_node["font"].setValue(FONT_UI)
    title_node["font_size"].setValue(int(FSIZE_DIALOG_TITLE * scale))
    title_node["color"].setValue([C_DIALOG_TITLE_TX[0], C_DIALOG_TITLE_TX[1],
                                  C_DIALOG_TITLE_TX[2], 1.0])
    title_node["box"].setValue([4 * scale, dlg_h - title_h + 2 * scale,
                                dlg_w - 4 * scale, dlg_h - 2 * scale])

    # Body text
    body_text = job.get("body", "An error has occurred.")
    body_node = nuke.nodes.Text2(name=prefix + "_bodyText")
    body_node.setInput(0, title_node)
    body_node["message"].setValue(body_text)
    body_node["font"].setValue(FONT_UI)
    body_node["font_size"].setValue(int(FSIZE_DIALOG_BODY * scale))
    body_node["color"].setValue([0, 0, 0, 1.0])
    body_node["box"].setValue([50 * scale, 30 * scale,
                                dlg_w - 10 * scale, dlg_h - title_h - 10 * scale])

    # Transform for positioning
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, body_node)
    xform["translate"].setValue([x - dlg_w / 2, comp_h - y - dlg_h / 2])
    xform["filter"].setValue("Impulse")

    # Stack offset
    stack_index = job.get("stackIndex", 0)
    stack_offset = job.get("stackOffset", 10)
    if stack_index > 0:
        tx = x - dlg_w / 2 + stack_index * stack_offset
        ty = comp_h - y - dlg_h / 2 - stack_index * stack_offset
        xform["translate"].setValue([tx, ty])

    # Arrival/life/exit behaviors
    _animate_dialog(xform, job, comp_w, comp_h, dlg_w, dlg_h, in_frame, out_frame, frame_rate)

    nodes = [bg, title_bg, merge_title, title_node, body_node, xform]
    return xform, nodes


def _animate_dialog(xform, job, comp_w, comp_h, dlg_w, dlg_h, in_f, out_f, fps):
    """Apply arrival/life/exit animation to the dialog Transform node."""
    speed_mult = job.get("speedMult", 1.0)
    entry_frames = job.get("entryFrames", 3)
    exit_frames = job.get("exitFrames", 2)

    arrival = job.get("arrivalBehavior", "pop")
    life = job.get("lifeBehavior", "static")
    exit_b = job.get("exitBehavior", "cut")

    if arrival == "scalePop" and entry_frames > 0:
        xform["scale"].setAnimated()
        xform["scale"].setValueAt(in_f, 0.8)
        xform["scale"].setValueAt(in_f + 1, 0.95)
        xform["scale"].setValueAt(in_f + entry_frames, 1.0)

    if life == "shake":
        shake_start = in_f + job.get("shakeFrame", 10)
        shake_dur = job.get("shakeDur", 8)
        # Set expression for shake
        xform["translate"].setExpression(
            "(frame >= %d && frame <= %d) ? "
            "(((frame - %d) %% 4 < 2) ? 3 : -3) : 0" % (
                shake_start, shake_start + shake_dur, shake_start
            ), 0
        )

    if exit_b == "collapse" and exit_frames > 0:
        collapse_start = out_f - exit_frames
        xform["scale"].setAnimated()
        xform["scale"].setValueAt(collapse_start, 1.0)
        xform["scale"].setValueAt(collapse_start + 1, 0.5)
        xform["scale"].setValueAt(out_f, 0.0)
