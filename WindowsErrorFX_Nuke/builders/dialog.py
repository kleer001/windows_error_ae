"""Dialog box element builder for Nuke.

Uses pre-rendered dialog PNGs from the assets directory instead of
building dialogs from scratch with Constant/Text2 nodes.
"""

import os

import nuke

from ..core.constants import DIALOG_CATALOG


# Path to bundled pre-rendered dialog PNGs
_ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")


def _get_dialog_png_path(catalog_id):
    """Return the full path to a pre-rendered dialog PNG."""
    return os.path.join(_ASSETS_DIR, catalog_id + ".png")


def build_dialog(job, comp_w, comp_h, frame_rate):
    """Build Win9x dialog box using a pre-rendered PNG.

    Reads the appropriate PNG from the assets directory, scales it by
    compScale, and positions it in comp space.
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    out_frame = job["outFrame"]
    scale = job.get("scale", 1.0)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    prefix = "WEFX_dlg_%d" % in_frame

    # Resolve catalog PNG
    catalog_id = job.get("catalogId", "B_error_0")
    png_path = _get_dialog_png_path(catalog_id)

    if not os.path.exists(png_path):
        # Fallback: try any B_error variant
        png_path = _get_dialog_png_path("B_error_0")

    # Read node for the pre-rendered dialog PNG
    read = nuke.nodes.Read(name=prefix + "_read")
    read["file"].setValue(png_path.replace("\\", "/"))
    read["colorspace"].setValue("default")
    # Static image — set to single frame
    read["first"].setValue(1)
    read["last"].setValue(1)
    read["origfirst"].setValue(1)
    read["origlast"].setValue(1)
    read["on_error"].setValue("black")

    # Get native PNG dimensions from the catalog
    native_w = 280
    native_h = 140
    for entry in DIALOG_CATALOG:
        if entry["id"] == catalog_id:
            native_w = entry["w"]
            native_h = entry["h"]
            break

    # Transform: scale from native res to comp space, then position
    # The PNG is at native virtual resolution (280x140), scale maps it
    # to the correct size in the comp (matching AE's approach)
    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, read)
    xform["scale"].setValue([scale, scale])
    xform["center"].setValue([native_w / 2.0, native_h / 2.0])
    xform["filter"].setValue("Impulse")  # Nearest-neighbor for pixel-art

    # Position in comp space (Nuke Y=0 is bottom, comp Y=0 is top)
    dlg_w = native_w * scale
    dlg_h = native_h * scale
    base_tx = x - dlg_w / 2.0
    base_ty = comp_h - y - dlg_h / 2.0
    xform["translate"].setValue([base_tx, base_ty])

    # Stack offset
    stack_index = job.get("stackIndex", 0)
    stack_offset = job.get("stackOffset", 10)
    if stack_index > 0:
        base_tx = x - dlg_w / 2.0 + stack_index * stack_offset
        base_ty = comp_h - y - dlg_h / 2.0 - stack_index * stack_offset
        xform["translate"].setValue([base_tx, base_ty])

    # Arrival/life/exit behaviors
    _animate_dialog(xform, job, comp_w, comp_h, dlg_w, dlg_h,
                    in_frame, out_frame, frame_rate, base_tx, base_ty)

    nodes = [read, xform]
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
        xform["scale"].setAnimated()
        xform["scale"].setValueAt(0.8 * job.get("scale", 1.0), in_f, 0)
        xform["scale"].setValueAt(0.8 * job.get("scale", 1.0), in_f, 1)
        xform["scale"].setValueAt(0.95 * job.get("scale", 1.0), in_f + 1, 0)
        xform["scale"].setValueAt(0.95 * job.get("scale", 1.0), in_f + 1, 1)
        xform["scale"].setValueAt(1.0 * job.get("scale", 1.0), in_f + entry_frames, 0)
        xform["scale"].setValueAt(1.0 * job.get("scale", 1.0), in_f + entry_frames, 1)

    if life == "shake":
        shake_start = in_f + job.get("shakeFrame", 10)
        shake_dur = job.get("shakeDur", 8)
        xform["translate"].setExpression(
            "%f + ((frame >= %d && frame <= %d) ? "
            "(((frame - %d) %% 4 < 2) ? 3 : -3) : 0)" % (
                base_tx, shake_start, shake_start + shake_dur, shake_start
            ), 0
        )

    if exit_b == "collapse" and exit_frames > 0:
        collapse_start = out_f - exit_frames
        s = job.get("scale", 1.0)
        xform["scale"].setAnimated()
        xform["scale"].setValueAt(1.0 * s, collapse_start, 0)
        xform["scale"].setValueAt(1.0 * s, collapse_start, 1)
        xform["scale"].setValueAt(0.5 * s, collapse_start + 1, 0)
        xform["scale"].setValueAt(0.5 * s, collapse_start + 1, 1)
        xform["scale"].setValueAt(0.0, out_f, 0)
        xform["scale"].setValueAt(0.0, out_f, 1)
