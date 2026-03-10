"""Freeze strip element builder for Nuke."""

import nuke


def build_freeze(job, comp_w, comp_h, frame_rate, footage_node=None):
    """Build freeze strip nodes — frozen horizontal strips from source footage.

    Requires footage_node. Returns (output_node, list_of_all_nodes).
    Returns (None, []) if no footage available.
    """
    if not footage_node:
        return None, []

    in_frame = job["inFrame"]
    scale = job.get("scale", 1.0)
    freeze_frame = job.get("freezeFrame", 0)
    behavior = job.get("behavior", "single")

    prefix = "WEFX_freeze_%d" % in_frame
    nodes = []

    if behavior == "single":
        strip_h = max(1, int(job.get("stripHeight", 10) * scale))
        strip_y = job.get("stripY", comp_h // 2)

        output, strip_nodes = _make_freeze_strip(
            prefix + "_s0", footage_node, comp_w, comp_h, strip_y, strip_h, freeze_frame
        )
        nodes.extend(strip_nodes)
        return output, nodes

    elif behavior == "cluster":
        strips = job.get("strips", [])
        if not strips:
            return None, []

        last_merge = None
        for i, strip in enumerate(strips):
            h = max(1, int(strip["height"] * scale))
            y = strip["y"]

            output, strip_nodes = _make_freeze_strip(
                prefix + "_s%d" % i, footage_node, comp_w, comp_h, y, h, freeze_frame
            )
            nodes.extend(strip_nodes)

            if last_merge is None:
                last_merge = output
            else:
                merge = nuke.nodes.Merge2(name=prefix + "_merge%d" % i)
                merge.setInput(0, last_merge)
                merge.setInput(1, output)
                merge["operation"].setValue("over")
                nodes.append(merge)
                last_merge = merge

        return last_merge, nodes

    return None, []


def _make_freeze_strip(name, footage_node, comp_w, comp_h, strip_y, strip_h, freeze_frame):
    """Create a single frozen horizontal strip from footage.

    Returns (output_node, list_of_nodes).
    """
    # FrameHold to freeze at the target frame
    hold = nuke.nodes.FrameHold(name=name + "_hold")
    hold.setInput(0, footage_node)
    hold["firstFrame"].setValue(freeze_frame)

    # Crop to the strip region
    crop = nuke.nodes.Crop(name=name + "_crop")
    crop.setInput(0, hold)
    y_bottom = comp_h - strip_y - strip_h
    y_top = comp_h - strip_y
    crop["box"].setValue([0, y_bottom, comp_w, y_top])
    crop["reformat"].setValue(False)

    return crop, [hold, crop]
