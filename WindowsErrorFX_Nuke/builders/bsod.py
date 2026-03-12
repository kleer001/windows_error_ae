"""BSOD panel element builder for Nuke."""

import nuke

from ..core.constants import (
    C_BSOD_BG, C_BSOD_TEXT, FONT_MONO_CANDIDATES, FSIZE_BSOD,
    BSOD_LINES_XP, BSOD_LINES_9X, BSOD_CODES, BSOD_EXCEPTIONS,
    set_font,
)
from ..core.prng import create_rng, rng_pick, rng_int
from ..core.scheduler import resolve_hex_placeholders


def build_bsod(job, comp_w, comp_h, frame_rate):
    """Build BSOD panel nodes inside a Group.

    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)

    # Pick era-specific text
    if job.get("bsodEra") == "9x":
        text_lines = list(BSOD_LINES_9X)
    else:
        text_lines = list(BSOD_LINES_XP)

    # Append any pre-picked lines from scheduler
    if job.get("textLines"):
        text_lines.extend(job["textLines"])

    # Resolve placeholders in era text lines
    rng = create_rng(in_frame * 7919)
    resolved = []
    for line in text_lines:
        line = line.replace("%BSOD_EXCEPTION%", rng_pick(rng, BSOD_EXCEPTIONS))
        line = line.replace("%BSOD_CODE%", rng_pick(rng, BSOD_CODES))
        line = resolve_hex_placeholders(line, rng)
        resolved.append(line)
    body_text = "\n".join(resolved)

    # Determine BSOD panel size based on variant
    variant = job.get("variant", "island")
    if variant == "fullStrip":
        panel_w = comp_w
        panel_h = int(300 * scale)
    elif variant == "corner":
        panel_w = int(comp_w * 0.6 * scale)
        panel_h = int(comp_h * 0.5 * scale)
    else:  # island
        panel_w = int(640 * scale)
        panel_h = int(400 * scale)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    # Constant node for BSOD blue background (unique format name per element)
    prefix = "WEFX_bsod_%d" % in_frame
    fmt_name = "WEFX_bsod_fmt_%d" % in_frame
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([C_BSOD_BG[0], C_BSOD_BG[1], C_BSOD_BG[2], 1.0])
    bg["format"].setValue(nuke.addFormat("%d %d %s" % (panel_w, panel_h, fmt_name)))

    # Text node for BSOD content
    text_node = nuke.nodes.Text2(name=prefix + "_text")
    text_node.setInput(0, bg)
    text_node["message"].setValue(body_text)
    set_font(text_node["font"], FONT_MONO_CANDIDATES)
    text_node["font_size"].setValue(int(FSIZE_BSOD * scale))
    text_node["color"].setValue([C_BSOD_TEXT[0], C_BSOD_TEXT[1], C_BSOD_TEXT[2], 1.0])
    text_node["box"].setValue([10, 10, panel_w - 10, panel_h - 10])

    # Transform for positioning
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, text_node)
    xform["translate"].setValue([x - panel_w / 2, comp_h - y - panel_h / 2])
    xform["filter"].setValue("Impulse")

    # Behavior animation
    behavior = job.get("behavior", "static")
    if behavior in ("slideH", "slideV", "stutter"):
        speed = job.get("slideSpeed", 40) * job.get("speedMult", 1.0)
        slide_dir = job.get("slideDir", "right")
        tx_start = x - panel_w / 2
        ty_start = comp_h - y - panel_h / 2
        tx_end = tx_start
        ty_end = ty_start

        if slide_dir == "left":
            tx_end = tx_start - speed * (out_frame - in_frame)
        elif slide_dir == "right":
            tx_end = tx_start + speed * (out_frame - in_frame)
        elif slide_dir == "up":
            ty_end = ty_start + speed * (out_frame - in_frame)
        else:  # down
            ty_end = ty_start - speed * (out_frame - in_frame)

        xform["translate"].setAnimated()
        xform["translate"].setValueAt(tx_start, in_frame, 0)
        xform["translate"].setValueAt(tx_end, out_frame, 0)
        xform["translate"].setValueAt(ty_start, in_frame, 1)
        xform["translate"].setValueAt(ty_end, out_frame, 1)

    nodes = [bg, text_node, xform]
    return xform, nodes
