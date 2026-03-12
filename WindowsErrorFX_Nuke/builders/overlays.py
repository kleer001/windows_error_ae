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
    """Build a Noise overlay node.

    Returns (output_node, mix_value, list_of_nodes) or (None, 0, []) if disabled.
    The mix_value should be used on the Merge2 node, not the noise itself.
    """
    noise_settings = settings.get("noise", {})
    if not noise_settings.get("enabled", True):
        return None, []

    # Opacity: default 8 -> 0.08 * 0.02 = 0.0016. Use this as the merge mix.
    mix_value = noise_settings.get("opacity", DEFAULT_NOISE_OPACITY) / 100.0 * 0.02
    scale_val = noise_settings.get("scale", DEFAULT_NOISE_SCALE)
    complexity = noise_settings.get("complexity", DEFAULT_NOISE_COMPLEXITY)

    wlog("Building noise: mix=%.4f, scale=%d, complexity=%d" % (mix_value, scale_val, complexity))
    noise = nuke.nodes.Noise(name="WEFX_noise")
    noise["size"].setValue(scale_val)
    noise["octaves"].setValue(complexity)
    noise["zoffset"].setExpression("frame * 100")
    noise["gain"].setValue(0.5)
    noise["gamma"].setValue(0.5)

    # Reformat to comp size
    reformat = nuke.nodes.Reformat(name="WEFX_noise_reformat")
    reformat.setInput(0, noise)
    reformat["type"].setValue("to format")
    reformat["format"].setValue(nuke.root().format())

    return reformat, [noise, reformat], mix_value


def build_head_scratch(settings, comp_w, comp_h, total_frames, frame_rate):
    """Build a head scratch overlay — bright horizontal slice that appears periodically.

    Returns (output_node, list_of_nodes) or (None, []) if disabled.
    """
    hs_settings = settings.get("headScratch", {})
    if not hs_settings.get("enabled", False):
        return None, []

    freq = hs_settings.get("freq", DEFAULT_HEADSCRATCH_FREQ)
    height = max(1, hs_settings.get("height", DEFAULT_HEADSCRATCH_HEIGHT))

    wlog("Building head scratch: freq=%d, height=%d" % (freq, height))
    line = nuke.nodes.Constant(name="WEFX_hscratch")
    line["color"].setValue([1.0, 1.0, 1.0, 0.8])
    line["format"].setValue(nuke.addFormat("%d %d WEFX_hs_fmt_%d" % (comp_w, height, freq)))

    xform = nuke.nodes.Transform(name="WEFX_hscratch_xform")
    xform.setInput(0, line)
    xform["filter"].setValue("Impulse")
    xform["translate"].setExpression("0", 0)
    xform["translate"].setExpression(
        "(int(frame / %d) %% %d) * %d" % (freq, max(1, comp_h // (height * 3)), height * 3), 1
    )

    return xform, [line, xform]
