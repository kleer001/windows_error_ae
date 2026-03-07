"""Mouse cursor artifact element builder for Nuke."""

import math
import nuke

from ..core.constants import C_CURSOR_FILL, C_CURSOR_STROKE, CURSOR_HEIGHT


def build_cursor(job, comp_w, comp_h, frame_rate):
    """Build a mouse cursor artifact node.

    Uses a small white Constant block as the cursor shape (simple and reliable).
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)
    speed_mult = job.get("speedMult", 1.0)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)
    cursor_h = max(2, int(CURSOR_HEIGHT * scale))
    cursor_w = max(2, int(12 * scale))

    prefix = "WEFX_cursor_%d" % in_frame

    # Draw cursor as a small white block (reliable cross-version approach)
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([C_CURSOR_FILL[0], C_CURSOR_FILL[1], C_CURSOR_FILL[2], 1.0])
    bg["format"].setValue(nuke.addFormat(
        "%d %d WEFX_cursor_fmt_%d" % (cursor_w, cursor_h, in_frame)
    ))

    # Position transform
    pos_xform = nuke.nodes.Transform(name=prefix + "_pos")
    pos_xform.setInput(0, bg)
    pos_xform["translate"].setValue([x, comp_h - y])
    pos_xform["filter"].setValue("Impulse")

    # Behavior transform (separate node so expressions don't override position)
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, pos_xform)
    xform["filter"].setValue("Impulse")

    behavior = job.get("behavior", "frozen")

    if behavior == "orbit":
        radius = job.get("orbitRadius", 60) * scale
        orbit_speed = job.get("orbitSpeed", 6) * speed_mult
        orbit_dir = job.get("orbitDir", 1)
        xform["translate"].setExpression(
            "cos(frame * %f * %d * pi / 180) * %f" % (orbit_speed, orbit_dir, radius), 0
        )
        xform["translate"].setExpression(
            "sin(frame * %f * %d * pi / 180) * %f" % (orbit_speed, orbit_dir, radius), 1
        )

    elif behavior == "cornerSeek":
        corner = job.get("targetCorner", "BR")
        seek_speed = job.get("seekSpeed", 10) * speed_mult
        if corner == "TL":
            tx, ty = -x, -(comp_h - y)
        elif corner == "TR":
            tx, ty = comp_w - x, -(comp_h - y)
        elif corner == "BL":
            tx, ty = -x, y
        else:
            tx, ty = comp_w - x, y

        length = math.sqrt(tx * tx + ty * ty) or 1
        dx = tx / length * seek_speed
        dy = ty / length * seek_speed

        xform["translate"].setAnimated()
        xform["translate"].setValueAt(0, in_frame, 0)
        xform["translate"].setValueAt(0, in_frame, 1)
        frames = out_frame - in_frame
        xform["translate"].setValueAt(dx * frames, out_frame, 0)
        xform["translate"].setValueAt(dy * frames, out_frame, 1)

    elif behavior == "randomWalk":
        walk_interval = job.get("walkInterval", 12)
        walk_radius = job.get("walkRadius", 60) * scale
        xform["translate"].setExpression(
            "(int(frame / %d) %% 2 == 0 ? 1 : -1) * %f * noise(frame * 0.1)" % (
                walk_interval, walk_radius
            ), 0
        )
        xform["translate"].setExpression(
            "(int(frame / %d) %% 2 == 0 ? -1 : 1) * %f * noise(frame * 0.13)" % (
                walk_interval, walk_radius
            ), 1
        )

    elif behavior == "glitchStutter":
        xform["translate"].setExpression(
            "(frame %% 4 < 2) ? noise(frame * 0.5) * 20 : -noise(frame * 0.5) * 20", 0
        )
        xform["translate"].setExpression(
            "(frame %% 4 < 2) ? noise(frame * 0.7) * 10 : -noise(frame * 0.7) * 10", 1
        )

    nodes = [bg, pos_xform, xform]
    return xform, nodes
