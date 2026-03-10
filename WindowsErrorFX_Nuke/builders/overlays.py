"""Global overlay builders for Nuke — noise and head scratch.

Scanlines dropped per port plan (Nuke users can make their own).
"""

import nuke

from ..core.constants import (
    DEFAULT_NOISE_OPACITY, DEFAULT_NOISE_SCALE, DEFAULT_NOISE_COMPLEXITY,
    DEFAULT_HEADSCRATCH_FREQ, DEFAULT_HEADSCRATCH_HEIGHT,
)
from ..core.log import wlog


def build_noise(settings, comp_w, comp_h):
    """Build a Noise overlay node with Grade for opacity control.

    Returns (output_node, list_of_nodes) or (None, []) if disabled.
    """
    noise_settings = settings.get("noise", {})
    if not noise_settings.get("enabled", True):
        return None, []

    opacity = noise_settings.get("opacity", DEFAULT_NOISE_OPACITY) / 100.0
    scale_val = noise_settings.get("scale", DEFAULT_NOISE_SCALE)
    complexity = noise_settings.get("complexity", DEFAULT_NOISE_COMPLEXITY)

    wlog("Building noise: opacity=%d, scale=%d, complexity=%d" % (
        noise_settings.get("opacity", DEFAULT_NOISE_OPACITY), scale_val, complexity))
    noise = nuke.nodes.Noise(name="WEFX_noise")
    noise["size"].setValue(scale_val)
    noise["octaves"].setValue(complexity)
    noise["z"].setExpression("frame * 100")
    noise["gain"].setValue(0.5)
    noise["gamma"].setValue(0.5)
    noise["format"].setValue(nuke.root().format())

    # Grade to control opacity
    grade = nuke.nodes.Grade(name="WEFX_noise_grade")
    grade.setInput(0, noise)
    grade["multiply"].setValue(opacity)

    return grade, [noise, grade]


def build_head_scratch(settings, comp_w, comp_h, total_frames, frame_rate):
    """Build a head scratch overlay — bright horizontal slice that appears periodically.

    Returns (output_node, list_of_nodes) or (None, []) if disabled.
    The returned output node has a mix expression for visibility timing.
    """
    hs_settings = settings.get("headScratch", {})
    if not hs_settings.get("enabled", False):
        return None, []

    freq = hs_settings.get("freq", DEFAULT_HEADSCRATCH_FREQ)
    height = max(1, hs_settings.get("height", DEFAULT_HEADSCRATCH_HEIGHT))

    wlog("Building head scratch: freq=%d, height=%d" % (freq, height))
    # Constant bright line (unique format name)
    line = nuke.nodes.Constant(name="WEFX_hscratch")
    line["color"].setValue([1.0, 1.0, 1.0, 0.8])
    line["format"].setValue(nuke.addFormat("%d %d WEFX_hs_fmt_%d" % (comp_w, height, freq)))

    # Animate position — moves to different Y every freq frames
    xform = nuke.nodes.Transform(name="WEFX_hscratch_xform")
    xform.setInput(0, line)
    xform["filter"].setValue("Impulse")
    xform["translate"].setExpression("0", 0)
    # Y position cycles based on frame and frequency
    xform["translate"].setExpression(
        "(int(frame / %d) %% %d) * %d" % (freq, max(1, comp_h // (height * 3)), height * 3), 1
    )

    return xform, [line, xform]
