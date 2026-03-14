"""BSOD panel element builder for Nuke.

Uses pre-rendered BSOD PNGs from the assets directory instead of
building from scratch with Constant/Text2 nodes.
"""

import os

import nuke

from ..core.prng import create_rng, rng_int, rng_float


# Path to bundled pre-rendered BSOD PNGs
_ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

# Available BSOD PNGs per era
_BSOD_COUNTS = {"9x": 5, "xp": 7}
# Native dimensions of BSOD PNGs
_BSOD_SIZES = {"9x": (640, 180), "xp": (640, 260)}


def build_bsod(job, comp_w, comp_h, frame_rate):
    """Build BSOD panel using a pre-rendered PNG.

    Reads the appropriate BSOD PNG from the assets directory, scales it,
    and positions it in comp space.
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)
    era = job.get("bsodEra", "xp")

    rng = create_rng(in_frame * 7919)

    # Pick a random BSOD PNG for this era
    count = _BSOD_COUNTS.get(era, 7)
    index = rng_int(rng, 0, count - 1)
    png_name = "bsod_%s_%d.png" % (era, index)
    png_path = os.path.join(_ASSETS_DIR, png_name)

    if not os.path.exists(png_path):
        # Fallback to index 0
        png_path = os.path.join(_ASSETS_DIR, "bsod_%s_0.png" % era)

    native_w, native_h = _BSOD_SIZES.get(era, (640, 260))

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)
    prefix = "WEFX_bsod_%d" % in_frame

    # Read node for the pre-rendered BSOD PNG
    read = nuke.nodes.Read(name=prefix + "_read")
    read["file"].setValue(png_path.replace("\\", "/"))
    read["colorspace"].setValue("default")
    read["first"].setValue(1)
    read["last"].setValue(1)
    read["origfirst"].setValue(1)
    read["origlast"].setValue(1)
    read["on_error"].setValue("black")

    # Determine variant-specific scaling
    # The PNG is at 640px native width. Apply variant sizing then compScale.
    variant = job.get("variant", "island")
    if variant == "fullStrip":
        # Stretch to fill comp width, maintaining aspect ratio
        variant_scale_x = float(comp_w) / native_w
        variant_scale_y = scale
    elif variant == "corner":
        # Smaller panel — random 30-60% of native size, scaled by compScale
        size_factor = rng_float(rng, 0.3, 0.6)
        variant_scale_x = scale * size_factor
        variant_scale_y = scale * size_factor
    else:  # island
        # Moderate panel — random 40-80% of native size, scaled by compScale
        size_factor = rng_float(rng, 0.4, 0.8)
        variant_scale_x = scale * size_factor
        variant_scale_y = scale * size_factor

    # Transform: scale + position
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, read)
    xform["scale"].setValue([variant_scale_x, variant_scale_y])
    xform["center"].setValue([native_w / 2.0, native_h / 2.0])
    xform["filter"].setValue("Impulse")  # Nearest-neighbor for pixel-art

    # Position in comp space
    panel_w = native_w * variant_scale_x
    panel_h = native_h * variant_scale_y
    tx_start = x - panel_w / 2.0
    ty_start = comp_h - y - panel_h / 2.0
    xform["translate"].setValue([tx_start, ty_start])

    # Behavior animation
    behavior = job.get("behavior", "static")
    if behavior in ("slideH", "slideV", "stutter"):
        speed = job.get("slideSpeed", 40) * job.get("speedMult", 1.0)
        slide_dir = job.get("slideDir", "right")
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

    nodes = [read, xform]
    return xform, nodes
