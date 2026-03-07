"""Mouse cursor artifact element builder for Nuke."""

import math
import nuke

from ..core.constants import C_CURSOR_FILL, C_CURSOR_STROKE, CURSOR_HEIGHT


def build_cursor(job, comp_w, comp_h, frame_rate):
    """Build a mouse cursor artifact node.

    Uses a simple polygon shape for the cursor.
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)
    speed_mult = job.get("speedMult", 1.0)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)
    cursor_h = int(CURSOR_HEIGHT * scale)

    prefix = "WEFX_cursor_%d" % in_frame

    # Draw cursor as a white polygon on transparent background
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([0, 0, 0, 0])
    bg["format"].setValue(nuke.root().format())

    # Use Roto node to draw cursor shape
    roto = nuke.nodes.Roto(name=prefix + "_shape")
    roto.setInput(0, bg)

    # Create cursor arrow shape using the Roto's curves knob
    # The cursor is drawn as a simple arrow polygon
    curve_knob = roto["curves"]
    root_layer = curve_knob.rootLayer
    shape = nuke.rotopaint.Shape(curve_knob)
    shape.name = "cursor"

    # Arrow cursor vertices (normalized to cursor_h size)
    s = cursor_h / 24.0
    cx = x
    cy = comp_h - y  # Nuke Y is bottom-up
    pts = [
        (cx, cy),
        (cx, cy - 16 * s),
        (cx + 4 * s, cy - 12 * s),
        (cx + 8 * s, cy - 18 * s),
        (cx + 10 * s, cy - 17 * s),
        (cx + 6 * s, cy - 11 * s),
        (cx + 11 * s, cy - 11 * s),
    ]

    for px, py in pts:
        cp = shape.append(px, py)
        cp[0].interpolation = nuke.SMOOTH
        cp[1].interpolation = nuke.SMOOTH

    attrs = shape.getAttributes()
    attrs.set("r", 1.0)
    attrs.set("g", 1.0)
    attrs.set("b", 1.0)
    attrs.set("a", 1.0)

    root_layer.append(shape)

    # Transform for behavior animation
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, roto)
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
        xform["translate"].setValueAt(in_frame, 0, 0)
        xform["translate"].setValueAt(in_frame, 0, 1)
        frames = out_frame - in_frame
        xform["translate"].setValueAt(out_frame, dx * frames, 0)
        xform["translate"].setValueAt(out_frame, dy * frames, 1)

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

    nodes = [bg, roto, xform]
    return xform, nodes
