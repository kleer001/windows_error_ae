"""Corrupted text overlay element builder for Nuke."""

import nuke

from ..core.constants import C_TEXT_OVERLAY, FONT_MONO, FSIZE_TEXT_OVER


def build_text_overlay(job, comp_w, comp_h, frame_rate):
    """Build a corrupted text overlay node.

    Static text only (no per-frame content changes — feature cut for Nuke port).
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)

    lines = job.get("lines", ["ERROR"])
    body_text = "\\n".join(lines)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)
    font_size = int(job.get("fontSize", FSIZE_TEXT_OVER) * scale)

    prefix = "WEFX_text_%d" % in_frame

    # Create a constant for the text to render on top of
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([0, 0, 0, 0])  # transparent
    bg["format"].setValue(nuke.root().format())

    text_node = nuke.nodes.Text2(name=prefix + "_text")
    text_node.setInput(0, bg)
    text_node["message"].setValue(body_text)
    text_node["font"].setValue(FONT_MONO)
    text_node["font_size"].setValue(font_size)
    text_node["color"].setValue([C_TEXT_OVERLAY[0], C_TEXT_OVERLAY[1],
                                 C_TEXT_OVERLAY[2], 1.0])
    text_node["box"].setValue([x, comp_h - y - 100 * scale,
                               x + 400 * scale, comp_h - y])

    # Behavior animation
    behavior = job.get("behavior", "static")
    if behavior == "ghostDrift":
        drift_dir = job.get("driftDir", "up")
        drift_speed = job.get("driftSpeed", 0.5) * job.get("speedMult", 1.0)
        text_node["translate"].setAnimated()
        if drift_dir == "up":
            text_node["translate"].setValueAt(0, in_frame, 1)
            text_node["translate"].setValueAt(drift_speed * (out_frame - in_frame), out_frame, 1)
        else:
            text_node["translate"].setValueAt(0, in_frame, 1)
            text_node["translate"].setValueAt(-drift_speed * (out_frame - in_frame), out_frame, 1)

    nodes = [bg, text_node]
    return text_node, nodes
