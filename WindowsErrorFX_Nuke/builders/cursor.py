"""Mouse cursor artifact element builder for Nuke.

Uses pre-rendered cursor PNGs with transparency from the assets directory.
"""

import math
import os

import nuke

from ..core.constants import CURSOR_HEIGHT


# Path to bundled cursor PNGs
_ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

_CURSOR_FILES = {
    "arrow": "windows_arrow.png",  # 12x19 RGBA
    "hand": "windows_hand.png",    # 17x22 RGBA
}
_CURSOR_SIZES = {
    "arrow": (12, 19),
    "hand": (17, 22),
}


def build_cursor(job, comp_w, comp_h, frame_rate):
    """Build a mouse cursor artifact using a pre-rendered PNG.

    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)
    speed_mult = job.get("speedMult", 1.0)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    prefix = "WEFX_cursor_%d" % in_frame

    # Pick cursor variant (arrow or hand)
    cursor_variant = job.get("cursorVariant", "arrow")
    if cursor_variant not in _CURSOR_FILES:
        cursor_variant = "arrow"

    png_path = os.path.join(_ASSETS_DIR, _CURSOR_FILES[cursor_variant])
    native_w, native_h = _CURSOR_SIZES.get(cursor_variant, (12, 19))

    # Read node for cursor PNG (has transparency)
    read = nuke.nodes.Read(name=prefix + "_read")
    read["file"].setValue(png_path)
    read["colorspace"].setValue("sRGB")
    read["first"].setValue(1)
    read["last"].setValue(1)
    read["origfirst"].setValue(1)
    read["origlast"].setValue(1)
    read["on_error"].setValue("black")
    # Premultiply since the PNG has alpha
    read["premultiplied"].setValue(True)

    # Premult to handle alpha correctly
    premult = nuke.nodes.Premult(name=prefix + "_premult")
    premult.setInput(0, read)

    # Position transform — scale up for pixel-art look, then position
    pos_xform = nuke.nodes.Transform(name=prefix + "_pos")
    pos_xform.setInput(0, premult)
    pos_xform["scale"].setValue([scale, scale])
    pos_xform["center"].setValue([native_w / 2.0, native_h / 2.0])
    pos_xform["translate"].setValue([x, comp_h - y])
    pos_xform["filter"].setValue("Impulse")  # Nearest-neighbor for pixel-art

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
            tx, ty = -x, y
        elif corner == "TR":
            tx, ty = comp_w - x, y
        elif corner == "BL":
            tx, ty = -x, -(comp_h - y)
        else:
            tx, ty = comp_w - x, -(comp_h - y)

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

    nodes = [read, premult, pos_xform, xform]
    return xform, nodes
