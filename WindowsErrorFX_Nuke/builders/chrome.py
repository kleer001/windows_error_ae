"""Chrome fragment element builder for Nuke."""

import nuke

from ..core.constants import C_DIALOG_BG, C_DIALOG_BORDER_L, C_DIALOG_BORDER_D


def build_chrome(job, comp_w, comp_h, frame_rate):
    """Build a chrome fragment (window debris) node.

    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    scale = job.get("scale", 1.0)

    frag_w = int(80 * scale)
    frag_h = int(20 * scale)

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    prefix = "WEFX_chrome_%d" % in_frame

    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([C_DIALOG_BG[0], C_DIALOG_BG[1], C_DIALOG_BG[2], 1.0])
    bg["format"].setValue(nuke.addFormat("%d %d WEFX_chrome_fmt_%d" % (frag_w, frag_h, in_frame)))

    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, bg)
    xform["translate"].setValue([x - frag_w / 2, comp_h - y - frag_h / 2])
    xform["filter"].setValue("Impulse")

    nodes = [bg, xform]
    return xform, nodes
