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

    # Dialog body background (unique format name per element)
    body_color = variant["body"]
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([body_color[0], body_color[1], body_color[2], 1.0])
    bg["format"].setValue(nuke.addFormat("%d %d WEFX_dlg_fmt_%d" % (dlg_w, dlg_h, in_frame)))

    # Title bar — same width as dialog, positioned at the top
    title_h = int(variant["titleH"] * scale)
    title_start = variant["titleStart"]
    title_bg = nuke.nodes.Constant(name=prefix + "_title")
    title_bg["color"].setValue([title_start[0], title_start[1], title_start[2], 1.0])
    title_bg["format"].setValue(nuke.addFormat(
        "%d %d WEFX_title_fmt_%d" % (dlg_w, title_h, in_frame)
    ))

    # Transform title bar to top of dialog (Nuke Y=0 is bottom)
    title_xform = nuke.nodes.Transform(name=prefix + "_titleXform")
    title_xform.setInput(0, title_bg)
    title_xform["translate"].setValue([0, dlg_h - title_h])
    title_xform["filter"].setValue("Impulse")

    # Merge title bar over body
    merge_title = nuke.nodes.Merge2(name=prefix + "_mergeTitle")
    merge_title.setInput(0, bg)
    merge_title.setInput(1, title_xform)
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

    # Transform for positioning in comp space
    base_tx = x - dlg_w / 2
    base_ty = comp_h - y - dlg_h / 2

    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, body_node)
    xform["translate"].setValue([base_tx, base_ty])
    xform["filter"].setValue("Impulse")

    # Stack offset
    stack_index = job.get("stackIndex", 0)
    stack_offset = job.get("stackOffset", 10)
    if stack_index > 0:
        base_tx = x - dlg_w / 2 + stack_index * stack_offset
        base_ty = comp_h - y - dlg_h / 2 - stack_index * stack_offset
        xform["translate"].setValue([base_tx, base_ty])

    # Arrival/life/exit behaviors
    _animate_dialog(xform, job, comp_w, comp_h, dlg_w, dlg_h,
                    in_frame, out_frame, frame_rate, base_tx, base_ty)

    nodes = [bg, title_bg, title_xform, merge_title, title_node, body_node, xform]
    return xform, nodes


def _animate_dialog(xform, job, comp_w, comp_h, dlg_w, dlg_h, in_f, out_f, fps,
                    base_tx, base_ty):
    """Apply arrival/life/exit animation to the dialog Transform node."""
    speed_mult = job.get("speedMult", 1.0)
    entry_frames = job.get("entryFrames", 3)
    exit_frames = job.get("exitFrames", 2)

    arrival = job.get("arrivalBehavior", "pop")
    life = job.get("lifeBehavior", "static")
    exit_b = job.get("exitBehavior", "cut")

    if arrival == "scalePop" and entry_frames > 0:
        xform["uniform_scale"].setAnimated()
        xform["uniform_scale"].setValueAt(0.8, in_f)
        xform["uniform_scale"].setValueAt(0.95, in_f + 1)
        xform["uniform_scale"].setValueAt(1.0, in_f + entry_frames)

    if life == "shake":
        shake_start = in_f + job.get("shakeFrame", 10)
        shake_dur = job.get("shakeDur", 8)
        # Expression adds shake offset to base position
        xform["translate"].setExpression(
            "%f + ((frame >= %d && frame <= %d) ? "
            "(((frame - %d) %% 4 < 2) ? 3 : -3) : 0)" % (
                base_tx, shake_start, shake_start + shake_dur, shake_start
            ), 0
        )

    if exit_b == "collapse" and exit_frames > 0:
        collapse_start = out_f - exit_frames
        xform["uniform_scale"].setAnimated()
        xform["uniform_scale"].setValueAt(1.0, collapse_start)
        xform["uniform_scale"].setValueAt(0.5, collapse_start + 1)
        xform["uniform_scale"].setValueAt(0.0, out_f)
