"""Scheduler — pure logic, no Nuke API. Identical output to the AE version."""

import math

from .prng import create_rng, rng_int, rng_pick, rng_bool, rng_float
from .constants import (
    FLOOR_FRAMES, FLOOR_PIXEL_BLOCK, FLOOR_FREEZE_STRIP, MAX_FRAMES,
    BLEND_WEIGHTS, DIALOG_WIDTH, DIALOG_HEIGHT,
    MAX_STACK_DEPTH, STACK_OFFSET_X,
    CURSOR_HEIGHT, FSIZE_TEXT_OVER,
    C_PIXEL_COLORS, C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT,
    C_FREEZE_CLUSTER_MIN, C_FREEZE_CLUSTER_MAX, C_FREEZE_CLUSTER_BAND,
    C_FREEZE_CLUSTER_GAP_MIN, C_FREEZE_CLUSTER_GAP_MAX,
    ERROR_MESSAGES, WINDOW_TITLES, BUTTON_COMBOS,
    BSOD_LINES, CORRUPT_TEXT_LINES,
    DEFAULT_TRAILS_CHANCE, DEFAULT_TRAILS_ECHOES, DEFAULT_TRAILS_DECAY,
)
from .settings import get_element_settings


def clamp(val, min_val, max_val):
    """Clamp val between min_val and max_val."""
    if val < min_val:
        return min_val
    if val > max_val:
        return max_val
    return val


def calc_comp_scale(comp_w, virtual_res_index):
    """Compute scale factor from comp width and virtual resolution preset."""
    from .constants import VIRTUAL_RESOLUTIONS
    res = VIRTUAL_RESOLUTIONS[virtual_res_index]
    if not res or res["w"] == 0:
        return 1.0
    return comp_w / res["w"]


def fake_hex(rng):
    """Generate a fake hex string like 0x1A2B3C."""
    chars = "0123456789ABCDEF"
    length = rng_int(rng, 6, 10)
    hex_str = "0x"
    for _ in range(length):
        hex_str += chars[rng_int(rng, 0, 15)]
    return hex_str


def resolve_hex_placeholders(s, rng):
    """Replace %HEX% placeholders with fake hex values."""
    while "%HEX%" in s:
        s = s.replace("%HEX%", fake_hex(rng), 1)
    return s


def pick_error_message(rng, custom_pool=None):
    """Pick a random error message from pool + custom entries."""
    pool = list(ERROR_MESSAGES)
    if custom_pool:
        pool.extend(custom_pool)
    msg = rng_pick(rng, pool)
    return resolve_hex_placeholders(msg, rng)


def pick_window_title(rng, custom_titles=None):
    """Pick a random window title from pool + custom entries."""
    pool = list(WINDOW_TITLES)
    if custom_titles:
        pool.extend(custom_titles)
    return rng_pick(rng, pool)


def pick_bsod_lines(rng, count):
    """Pick N random BSOD text lines with hex placeholders resolved."""
    lines = []
    for _ in range(count):
        line = rng_pick(rng, BSOD_LINES)
        lines.append(resolve_hex_placeholders(line, rng))
    return lines


def pick_corrupt_lines(rng, count):
    """Pick N random corrupt text lines."""
    lines = []
    for _ in range(count):
        lines.append(rng_pick(rng, CORRUPT_TEXT_LINES))
    return lines


def calc_element_count(chaos, total_frames):
    """Calculate total element count from chaos and comp duration."""
    if chaos <= 0:
        return 0
    normalized = chaos / 100.0
    count = math.pow(normalized, 1.5) * 50 * (total_frames / 240.0)
    return max(1, round(count))


def distribute_times(count, total_frames, curve, rng):
    """Distribute spawn times across the comp using a chaos curve.

    Returns sorted list of integer frame numbers.
    """
    times = []
    max_frame = total_frames - 1
    if max_frame < 0:
        max_frame = 0

    burst_centers = None
    if curve == "burst":
        num_bursts = 2 + (1 if rng() < 0.4 else 0)
        burst_centers = []
        for _ in range(num_bursts):
            burst_centers.append(rng() * 0.7 + 0.15)

    seg_cumulative = None
    if curve == "random":
        num_segs = rng_int(rng, 4, 8)
        seg_weights = []
        seg_total = 0
        for _ in range(num_segs):
            w = rng() * rng() * 3 + 0.1
            seg_weights.append(w)
            seg_total += w
        seg_cumulative = []
        cum = 0
        for sw in range(num_segs):
            cum += seg_weights[sw] / seg_total
            seg_cumulative.append(cum)

    for i in range(count):
        if curve == "build":
            t = max(rng(), rng())
        elif curve == "peak":
            t = (rng() + rng() + rng()) / 3.0
        elif curve == "burst":
            burst_idx = i % len(burst_centers)
            center = burst_centers[burst_idx]
            t = center + (rng() - 0.5) * 0.2
            t = clamp(t, 0, 1)
        elif curve == "random":
            roll = rng()
            seg = 0
            for si in range(len(seg_cumulative)):
                if roll < seg_cumulative[si]:
                    seg = si
                    break
                seg = si
            t_start = seg / len(seg_cumulative)
            t_end = (seg + 1) / len(seg_cumulative)
            t = t_start + rng() * (t_end - t_start)
            t = clamp(t, 0, 1)
        else:
            # "flat" — uniform
            t = rng()

        times.append(round(t * max_frame))

    times.sort()
    return times


def pick_element_type(mix, rng):
    """Pick an element type weighted by mix values."""
    types = [
        {"name": "dialog", "weight": mix.get("dialog", 0)},
        {"name": "bsod", "weight": mix.get("bsod", 0)},
        {"name": "cursor", "weight": mix.get("cursor", 0)},
        {"name": "pixel", "weight": mix.get("pixel", 0)},
        {"name": "freeze", "weight": mix.get("freeze", 0)},
    ]

    total_weight = sum(t["weight"] for t in types)
    if total_weight <= 0:
        return "dialog"

    roll = rng() * total_weight
    cumulative = 0
    for t in types:
        cumulative += t["weight"]
        if roll < cumulative:
            return t["name"]

    return types[-1]["name"]


def pick_duration(type_name, min_frames, max_frames, rng):
    """Pick element duration in frames, respecting floor rules."""
    if type_name == "pixel":
        floor = FLOOR_PIXEL_BLOCK
    elif type_name == "freeze":
        floor = FLOOR_FREEZE_STRIP
    else:
        floor = FLOOR_FRAMES
    effective_min = max(floor, min_frames or floor)
    effective_max = max(effective_min, max_frames or MAX_FRAMES)
    return rng_int(rng, effective_min, effective_max)


def assign_layer(type_name, roto_mode, rng, force_layer=None, behind_pct=None):
    """Assign 'over' or 'under' layer based on type and roto mode."""
    if force_layer == "over":
        return "over"
    if force_layer == "under":
        return "under"
    if roto_mode in ("flat", "allOver"):
        return "over"
    if roto_mode == "allUnder":
        return "under"

    pct = behind_pct if behind_pct is not None else 50
    return "under" if rng_bool(rng, pct / 100.0) else "over"


def weighted_pick(items, rng):
    """Pick a weighted random item from a list of {value, weight} dicts."""
    total = sum(item["weight"] for item in items)
    if total <= 0:
        return items[0]["value"]
    roll = rng() * total
    cum = 0
    for item in items:
        cum += item["weight"]
        if roll < cum:
            return item["value"]
    return items[-1]["value"]


def build_job(type_name, in_frame, out_frame, layer, settings, comp_info, rng):
    """Build a full ElementJob dict for a given element type.

    This is the core job-creation function that picks all behaviors and parameters.
    """
    job = {
        "type": type_name,
        "layer": layer,
        "inFrame": in_frame,
        "outFrame": out_frame,
        "inPoint": in_frame / comp_info["frameRate"],
        "outPoint": out_frame / comp_info["frameRate"],
        "compW": comp_info["width"],
        "compH": comp_info["height"],
        "opacity": 100,
    }

    style = settings.get("animStyle", "xpClassic")
    margin = 40

    if type_name == "bsod":
        job["bsodEra"] = weighted_pick([
            {"value": "xp", "weight": 60},
            {"value": "9x", "weight": 40},
        ], rng)

        job["variant"] = weighted_pick([
            {"value": "fullStrip", "weight": 40},
            {"value": "corner", "weight": 30},
            {"value": "island", "weight": 30},
        ], rng)

        job["behavior"] = weighted_pick([
            {"value": "static", "weight": 80 if style == "slowBurn" else 60},
            {"value": "slideH", "weight": 25 if style == "glitchHeavy" else 15},
            {"value": "slideV", "weight": 10},
            {"value": "stutter", "weight": 20 if style == "glitchHeavy" else 10},
            {"value": "snapEdge", "weight": 5},
        ], rng)

        job["textBehavior"] = weighted_pick([
            {"value": "static", "weight": 70},
            {"value": "typewriter", "weight": 15},
            {"value": "lineShuffle", "weight": 15},
        ], rng)

        job["slideDir"] = rng_pick(rng, ["left", "right", "up", "down"])
        job["slideSpeed"] = rng_int(rng, 20, 80)
        job["stutterFrame"] = rng_int(rng, 4, max(5, round((out_frame - in_frame) / 2)))
        job["stutterDur"] = rng_int(rng, 3, 6)
        job["textLines"] = pick_bsod_lines(rng, rng_int(rng, 3, 8))

        es_bsod = get_element_settings(settings, "bsod")
        if es_bsod.get("customMessages") and len(es_bsod["customMessages"]) > 0:
            for bci in range(min(len(es_bsod["customMessages"]), 3)):
                job["textLines"].append(es_bsod["customMessages"][bci])
        job["opacity"] = rng_int(rng, 80, 95)

        if job["variant"] == "fullStrip":
            job["x"] = comp_info["width"] / 2
            if rng_bool(rng, 0.5):
                job["y"] = rng_int(rng, 0, 100)
            else:
                job["y"] = rng_int(rng, comp_info["height"] - 120, comp_info["height"])
        elif job["variant"] == "corner":
            corner = rng_pick(rng, ["TL", "TR", "BL", "BR"])
            if corner in ("TL", "BL"):
                job["x"] = rng_int(rng, -50, 100)
            else:
                job["x"] = rng_int(rng, comp_info["width"] - 200, comp_info["width"] + 50)
            if corner in ("TL", "TR"):
                job["y"] = rng_int(rng, -20, 80)
            else:
                job["y"] = rng_int(rng, comp_info["height"] - 120, comp_info["height"] + 20)
        else:
            job["x"] = rng_int(rng, margin, comp_info["width"] - margin)
            job["y"] = rng_int(rng, margin, comp_info["height"] - margin)

    elif type_name == "dialog":
        es_dialog = get_element_settings(settings, "dialog")
        job["dialogVariant"] = weighted_pick([
            {"value": "A", "weight": 25},
            {"value": "B", "weight": 50},
            {"value": "C", "weight": 25},
        ], rng)

        dlg_titles = es_dialog.get("customTitles") if es_dialog.get("customTitles") else (settings.get("customTitles") or [])
        dlg_msgs = es_dialog.get("customMessages") if es_dialog.get("customMessages") else (settings.get("customMessages") or [])
        job["title"] = pick_window_title(rng, dlg_titles)
        job["body"] = pick_error_message(rng, dlg_msgs)
        job["buttons"] = rng_pick(rng, BUTTON_COMBOS)
        job["icon"] = weighted_pick([
            {"value": "error", "weight": 40},
            {"value": "warning", "weight": 30},
            {"value": "question", "weight": 20},
            {"value": "none", "weight": 10},
        ], rng)

        job["arrivalBehavior"] = weighted_pick([
            {"value": "pop", "weight": 60},
            {"value": "scalePop", "weight": 20},
            {"value": "slideIn", "weight": 20},
        ], rng)

        job["lifeBehavior"] = weighted_pick([
            {"value": "static", "weight": 60 if style == "slowBurn" else 40},
            {"value": "drift", "weight": 30 if style == "slowBurn" else 30},
            {"value": "shake", "weight": 50 if style == "glitchHeavy" else 30},
        ], rng)

        job["exitBehavior"] = weighted_pick([
            {"value": "cut", "weight": 50},
            {"value": "collapse", "weight": 25},
            {"value": "slideOff", "weight": 25},
        ], rng)

        job["driftDir"] = rng_float(rng, 0, 360)
        job["driftSpeed"] = rng_float(rng, 0.5, 2)
        job["shakeFrame"] = rng_int(rng, 4, max(5, out_frame - in_frame - 20))
        job["shakeDur"] = rng_int(rng, 8, 16)
        job["stackIndex"] = 0
        job["opacity"] = rng_int(rng, 85, 98)

        job["x"] = rng_int(rng, margin, comp_info["width"] - DIALOG_WIDTH - margin) + DIALOG_WIDTH // 2
        job["y"] = rng_int(rng, margin, comp_info["height"] - DIALOG_HEIGHT - margin) + DIALOG_HEIGHT // 2

        catalog_icon = "question" if job["icon"] == "info" else (job["icon"] or "none")
        catalog_index = rng_int(rng, 0, 2)
        job["catalogId"] = job["dialogVariant"] + "_" + catalog_icon + "_" + str(catalog_index)

    elif type_name == "text":
        line_count = rng_int(rng, 1, 6)
        job["lines"] = pick_corrupt_lines(rng, line_count)
        job["behavior"] = weighted_pick([
            {"value": "static", "weight": 30},
            {"value": "hScan", "weight": 25},
            {"value": "vScroll", "weight": 25},
            {"value": "ghostDrift", "weight": 20},
        ], rng)

        job["driftDir"] = rng_pick(rng, ["up", "down"])
        job["driftSpeed"] = rng_float(rng, 0.3, 1)
        job["corruption"] = rng_bool(rng, 0.6 if style == "glitchHeavy" else 0.4)
        job["corruptType"] = rng_pick(rng, ["swap", "block", "dropout"])
        job["corruptRate"] = rng_int(rng, 8, 16)
        job["opacity"] = rng_int(rng, 50, 85)
        job["fontSize"] = FSIZE_TEXT_OVER

        job["x"] = rng_int(rng, margin, comp_info["width"] - margin)
        job["y"] = rng_int(rng, margin, comp_info["height"] - margin)

    elif type_name == "cursor":
        job["behavior"] = weighted_pick([
            {"value": "frozen", "weight": 25},
            {"value": "orbit", "weight": 15},
            {"value": "cornerSeek", "weight": 15},
            {"value": "randomWalk", "weight": 15},
            {"value": "glitchStutter", "weight": 20 if style == "glitchHeavy" else 10},
            {"value": "ghostTrail", "weight": 10},
            {"value": "cluster", "weight": 10},
        ], rng)

        job["orbitRadius"] = rng_int(rng, 40, 120)
        job["orbitSpeed"] = rng_float(rng, 4, 12)
        job["orbitDir"] = rng_pick(rng, [1, -1])
        job["targetCorner"] = rng_pick(rng, ["TL", "TR", "BL", "BR"])
        job["seekSpeed"] = rng_int(rng, 6, 18)
        job["walkInterval"] = rng_int(rng, 8, 16)
        job["walkRadius"] = rng_int(rng, 40, 80)
        job["trailCount"] = rng_int(rng, 2, 6)
        job["trailOffset"] = rng_int(rng, 3, 6)
        job["clusterCount"] = rng_int(rng, 4, 8)
        job["clusterSpread"] = rng_int(rng, 30, 60)
        job["size"] = CURSOR_HEIGHT
        job["opacity"] = rng_int(rng, 80, 100)

        job["x"] = rng_int(rng, margin, comp_info["width"] - margin)
        job["y"] = rng_int(rng, margin, comp_info["height"] - margin)

        job["cursorVariant"] = "arrow" if rng_bool(rng, 0.7) else "hand"

    elif type_name == "pixel":
        job["behavior"] = weighted_pick([
            {"value": "microScatter", "weight": 30},
            {"value": "rowSmear", "weight": 20},
            {"value": "blockDisplace", "weight": 20},
            {"value": "scanlineShift", "weight": 15},
            {"value": "hTear", "weight": 15},
        ], rng)

        job["opacity"] = rng_int(rng, 80, 100)
        job["x"] = rng_int(rng, 0, comp_info["width"])
        job["y"] = rng_int(rng, 0, comp_info["height"])

        if job["behavior"] == "microScatter":
            job["clusterSize"] = rng_int(rng, 5, 15)
        elif job["behavior"] == "rowSmear":
            job["stripHeight"] = rng_int(rng, 1, 5)
            job["smearRows"] = rng_int(rng, 3, 20)
        elif job["behavior"] == "blockDisplace":
            job["blockW"] = rng_int(rng, 20, 80)
            job["blockH"] = rng_int(rng, 10, 60)
            job["offsetX"] = rng_int(rng, -100, 100)
            job["offsetY"] = rng_int(rng, -100, 100)
        elif job["behavior"] == "scanlineShift":
            job["bandHeight"] = rng_int(rng, 3, 15)
            job["shiftPx"] = rng_int(rng, 5, 30) if rng_bool(rng, 0.5) else rng_int(rng, -30, -5)
            job["bandCount"] = rng_int(rng, 1, 4)
        elif job["behavior"] == "hTear":
            job["tearH"] = rng_int(rng, 1, 2)
            job["tearW"] = rng_int(rng, round(comp_info["width"] / 2), comp_info["width"])
            job["tearColor"] = rng_pick(rng, C_PIXEL_COLORS)

    elif type_name == "freeze":
        job["behavior"] = weighted_pick([
            {"value": "single", "weight": 60},
            {"value": "cluster", "weight": 40},
        ], rng)

        job["opacity"] = rng_int(rng, 85, 100)
        job["freezeFrame"] = rng_int(rng, 0, comp_info["totalFrames"] - 1)

        if job["behavior"] == "single":
            job["stripHeight"] = rng_int(rng, C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT)
            job["stripY"] = rng_int(rng, 0, comp_info["height"] - job["stripHeight"])
        elif job["behavior"] == "cluster":
            cluster_count = rng_int(rng, C_FREEZE_CLUSTER_MIN, C_FREEZE_CLUSTER_MAX)
            band_start = rng_int(rng, 0, max(0, comp_info["height"] - C_FREEZE_CLUSTER_BAND))
            current_y = band_start
            job["strips"] = []
            for _ in range(cluster_count):
                h = rng_int(rng, C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT)
                if current_y + h > comp_info["height"]:
                    break
                job["strips"].append({"height": h, "y": current_y})
                current_y += h + rng_int(rng, C_FREEZE_CLUSTER_GAP_MIN, C_FREEZE_CLUSTER_GAP_MAX)

    # Trails
    es_trails = get_element_settings(settings, type_name).get("trails")
    trail_settings = es_trails if es_trails is not None else (settings.get("trails") or {})
    trail_chance = trail_settings.get("chance") if trail_settings.get("chance") is not None else DEFAULT_TRAILS_CHANCE
    if trail_settings.get("enabled") is not False and rng_bool(rng, trail_chance / 100.0):
        job["trails"] = True
        job["trailEchoes"] = trail_settings.get("echoes") or DEFAULT_TRAILS_ECHOES
        job["trailDecay"] = trail_settings.get("decay") if trail_settings.get("decay") is not None else DEFAULT_TRAILS_DECAY
    else:
        job["trails"] = False

    # Blend mode
    blend_weights = BLEND_WEIGHTS.get(type_name, BLEND_WEIGHTS["dialog"])
    job["blendMode"] = weighted_pick(blend_weights, rng)

    return job


def assign_dialog_stacks(jobs, rng, max_depth=None):
    """Find dialogs with same title and assign stackIndex for cascade effect."""
    stack_max = max_depth or MAX_STACK_DEPTH
    groups = {}
    for i, job in enumerate(jobs):
        if job.get("type") == "dialog" and job.get("title"):
            title = job["title"]
            if title not in groups:
                groups[title] = []
            groups[title].append(i)

    for key in sorted(groups.keys()):
        indices = groups[key]
        if len(indices) < 2:
            continue
        indices.sort(key=lambda idx: jobs[idx]["inFrame"])
        depth = min(len(indices), stack_max)
        for si in range(depth):
            jobs[indices[si]]["stackIndex"] = si


def schedule(settings, comp_info):
    """Master scheduler. Returns list of ElementJob dicts.

    Pure function — no Nuke API calls.
    """
    rng = create_rng(settings.get("seed", 1984))
    chaos = settings["chaos"] if settings.get("chaos") is not None else 100
    total_frames = comp_info["totalFrames"]
    curve = settings.get("chaosCurve", "flat")
    roto_mode = settings.get("rotoMode", "flat")
    style = settings.get("animStyle", "xpClassic")

    type_list = []
    type_names = ["dialog", "bsod", "cursor", "pixel", "freeze"]
    total_counts = 0
    for t in type_names:
        total_counts += get_element_settings(settings, t)["count"]

    if total_counts > 0:
        for t in type_names:
            n = get_element_settings(settings, t)["count"]
            for _ in range(n):
                type_list.append(t)
        # Fisher-Yates shuffle
        for si in range(len(type_list) - 1, 0, -1):
            j = rng_int(rng, 0, si)
            type_list[si], type_list[j] = type_list[j], type_list[si]
    else:
        auto_mix = {"dialog": 75, "bsod": 50, "cursor": 50, "pixel": 25, "freeze": 15}
        count = calc_element_count(chaos, total_frames)
        if count == 0:
            return []
        for _ in range(count):
            type_list.append(pick_element_type(auto_mix, rng))

    if not type_list:
        return []

    # Distribute spawn times — group by effective curve
    curve_groups = {}
    for cgi in range(len(type_list)):
        es_curve = get_element_settings(settings, type_list[cgi]).get("curve") or curve
        if es_curve not in curve_groups:
            curve_groups[es_curve] = []
        curve_groups[es_curve].append(cgi)

    curve_keys = sorted(curve_groups.keys())

    spawn_times = [0] * len(type_list)

    for gi in range(len(curve_keys)):
        group_indices = curve_groups[curve_keys[gi]]
        group_times = distribute_times(len(group_indices), total_frames, curve_keys[gi], rng)
        for gj in range(len(group_indices)):
            spawn_times[group_indices[gj]] = group_times[gj]

    stack_depth = settings.get("stackDepth") or MAX_STACK_DEPTH
    stack_off = settings.get("stackOffset") or STACK_OFFSET_X

    jobs = []
    for i in range(len(spawn_times)):
        in_frame = spawn_times[i]
        type_name = type_list[i]

        es = get_element_settings(settings, type_name)
        type_min_f = es["minFrames"]
        type_max_f = es["maxFrames"]

        if style == "slowBurn":
            type_min_f = max(type_min_f, 16)
            type_max_f = max(type_max_f, MAX_FRAMES)
        elif style == "chaosMax":
            type_max_f = min(type_max_f, 36)

        duration = pick_duration(type_name, type_min_f, type_max_f, rng)
        out_frame = min(in_frame + duration, total_frames)

        actual_dur = out_frame - in_frame
        if type_name == "pixel":
            floor = FLOOR_PIXEL_BLOCK
        elif type_name == "freeze":
            floor = FLOOR_FREEZE_STRIP
        else:
            floor = FLOOR_FRAMES
        if actual_dur < floor:
            in_frame = max(0, out_frame - floor)
            if out_frame - in_frame < floor:
                out_frame = min(in_frame + floor, total_frames)

        roto_force = es.get("rotoForce")
        behind_pct = settings.get("rotoBehindPct") if settings.get("rotoBehindPct") is not None else 50
        layer_assign = assign_layer(type_name, roto_mode, rng, roto_force, behind_pct)
        job = build_job(type_name, in_frame, out_frame, layer_assign, settings, comp_info, rng)

        job["scale"] = es["scale"] / 100.0
        job["speedMult"] = es["speed"] / 100.0
        job["opacity"] = clamp(job["opacity"], es["opacityMin"], es["opacityMax"])
        job["entryFrames"] = es["entryFrames"]
        job["exitFrames"] = es["exitFrames"]
        job["stackOffset"] = stack_off
        job["jitter"] = es.get("jitter", 0)

        jobs.append(job)

    assign_dialog_stacks(jobs, rng, stack_depth)

    return jobs
