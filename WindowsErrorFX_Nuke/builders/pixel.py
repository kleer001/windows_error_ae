"""Pixel corruption block element builder for Nuke."""

import nuke

from ..core.constants import C_PIXEL_COLORS


def build_pixel(job, comp_w, comp_h, frame_rate, footage_node=None):
    """Build pixel corruption block nodes.

    Five sub-variants: microScatter, rowSmear, blockDisplace, scanlineShift, hTear.
    Returns (output_node, list_of_all_nodes).
    """
    in_frame = job["inFrame"]
    scale = job.get("scale", 1.0)
    behavior = job.get("behavior", "microScatter")

    x = job.get("x", comp_w // 2)
    y = job.get("y", comp_h // 2)

    prefix = "WEFX_pixel_%d" % in_frame
    nodes = []

    if behavior == "hTear":
        tear_h = max(1, int(job.get("tearH", 1) * scale))
        tear_w = int(job.get("tearW", comp_w // 2) * scale)
        tear_color = job.get("tearColor", [1, 1, 1])

        bg = nuke.nodes.Constant(name=prefix + "_bg")
        bg["color"].setValue([tear_color[0], tear_color[1], tear_color[2], 1.0])
        bg["format"].setValue(nuke.addFormat("%d %d WEFX_tear_fmt" % (tear_w, tear_h)))

        xform = nuke.nodes.Transform(name=prefix + "_xform")
        xform.setInput(0, bg)
        xform["translate"].setValue([x - tear_w / 2, comp_h - y])
        xform["filter"].setValue("Impulse")

        nodes = [bg, xform]
        return xform, nodes

    elif behavior == "microScatter":
        cluster_size = job.get("clusterSize", 8)
        # Create small colored dots as Constant+Crop nodes
        last_merge = None
        for i in range(min(cluster_size, 15)):
            dot_size = max(1, int(3 * scale))
            color_idx = i % len(C_PIXEL_COLORS)
            color = C_PIXEL_COLORS[color_idx]

            dot = nuke.nodes.Constant(name=prefix + "_dot%d" % i)
            dot["color"].setValue([color[0], color[1], color[2], 1.0])
            dot["format"].setValue(nuke.addFormat("%d %d WEFX_dot_fmt" % (dot_size, dot_size)))

            dot_xform = nuke.nodes.Transform(name=prefix + "_dotX%d" % i)
            dot_xform.setInput(0, dot)
            # Scatter positions around the anchor point
            offset_x = (i * 7 - cluster_size * 3) * scale
            offset_y = ((i * 11) % 20 - 10) * scale
            dot_xform["translate"].setValue([x + offset_x, comp_h - y + offset_y])
            dot_xform["filter"].setValue("Impulse")

            nodes.extend([dot, dot_xform])

            if last_merge is None:
                last_merge = dot_xform
            else:
                merge = nuke.nodes.Merge2(name=prefix + "_merge%d" % i)
                merge.setInput(0, last_merge)
                merge.setInput(1, dot_xform)
                merge["operation"].setValue("over")
                nodes.append(merge)
                last_merge = merge

        return last_merge, nodes

    elif behavior == "rowSmear" and footage_node:
        strip_h = max(1, int(job.get("stripHeight", 2) * scale))
        smear_rows = job.get("smearRows", 10)

        crop = nuke.nodes.Crop(name=prefix + "_crop")
        crop.setInput(0, footage_node)
        crop["box"].setValue([0, comp_h - y - strip_h, comp_w, comp_h - y])
        crop["reformat"].setValue(False)

        xform = nuke.nodes.Transform(name=prefix + "_xform")
        xform.setInput(0, crop)
        xform["scale"].setValue([1, smear_rows])
        xform["center"].setValue([comp_w / 2, comp_h - y])
        xform["filter"].setValue("Impulse")

        nodes = [crop, xform]
        return xform, nodes

    elif behavior == "blockDisplace" and footage_node:
        block_w = int(job.get("blockW", 40) * scale)
        block_h = int(job.get("blockH", 30) * scale)
        offset_x = job.get("offsetX", 0) * scale
        offset_y = job.get("offsetY", 0) * scale

        crop = nuke.nodes.Crop(name=prefix + "_crop")
        crop.setInput(0, footage_node)
        crop["box"].setValue([x - block_w / 2, comp_h - y - block_h / 2,
                              x + block_w / 2, comp_h - y + block_h / 2])
        crop["reformat"].setValue(False)

        xform = nuke.nodes.Transform(name=prefix + "_xform")
        xform.setInput(0, crop)
        xform["translate"].setValue([offset_x, -offset_y])
        xform["filter"].setValue("Impulse")

        nodes = [crop, xform]
        return xform, nodes

    elif behavior == "scanlineShift" and footage_node:
        band_h = max(1, int(job.get("bandHeight", 5) * scale))
        shift_px = job.get("shiftPx", 10) * scale
        band_count = job.get("bandCount", 2)

        last_merge = None
        for i in range(band_count):
            band_y = comp_h - y + i * band_h * 3

            crop = nuke.nodes.Crop(name=prefix + "_band%d" % i)
            crop.setInput(0, footage_node)
            crop["box"].setValue([0, band_y, comp_w, band_y + band_h])
            crop["reformat"].setValue(False)

            xform = nuke.nodes.Transform(name=prefix + "_shift%d" % i)
            xform.setInput(0, crop)
            xform["translate"].setValue([shift_px, 0])
            xform["filter"].setValue("Impulse")

            nodes.extend([crop, xform])

            if last_merge is None:
                last_merge = xform
            else:
                merge = nuke.nodes.Merge2(name=prefix + "_merge%d" % i)
                merge.setInput(0, last_merge)
                merge.setInput(1, xform)
                merge["operation"].setValue("over")
                nodes.append(merge)
                last_merge = merge

        return last_merge, nodes

    # Fallback: simple colored block
    block_size = int(20 * scale)
    color = C_PIXEL_COLORS[0]
    bg = nuke.nodes.Constant(name=prefix + "_bg")
    bg["color"].setValue([color[0], color[1], color[2], 1.0])
    bg["format"].setValue(nuke.addFormat("%d %d WEFX_pix_fmt" % (block_size, block_size)))

    xform = nuke.nodes.Transform(name=prefix + "_xform")
    xform.setInput(0, bg)
    xform["translate"].setValue([x, comp_h - y])
    xform["filter"].setValue("Impulse")

    nodes = [bg, xform]
    return xform, nodes
