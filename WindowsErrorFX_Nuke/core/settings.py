"""Settings helpers — defaults, per-element resolution, migration, randomization."""

import math
import random

from .constants import (
    FLOOR_FRAMES, MAX_FRAMES,
    DEFAULT_ELEMENT_SCALE, DEFAULT_SPEED_MULT,
    DEFAULT_OPACITY_MIN, DEFAULT_OPACITY_MAX,
    DEFAULT_ENTRY_FRAMES, DEFAULT_EXIT_FRAMES,
    DEFAULT_SCANLINE_OPACITY, DEFAULT_SCANLINE_SPACING,
    DEFAULT_NOISE_OPACITY, DEFAULT_NOISE_SCALE, DEFAULT_NOISE_COMPLEXITY,
    DEFAULT_HEADSCRATCH_FREQ, DEFAULT_HEADSCRATCH_HEIGHT,
    DEFAULT_TRAILS_CHANCE, DEFAULT_TRAILS_ECHOES, DEFAULT_TRAILS_DECAY,
    MAX_STACK_DEPTH, STACK_OFFSET_X,
    DEFAULT_VIRTUAL_RES_INDEX, VIRTUAL_RESOLUTIONS,
)


def default_element_settings():
    """Returns a fresh per-element settings dict with all defaults."""
    return {
        "count": 0,
        "minFrames": FLOOR_FRAMES,
        "maxFrames": MAX_FRAMES,
        "scale": DEFAULT_ELEMENT_SCALE,
        "speed": DEFAULT_SPEED_MULT,
        "opacityMin": DEFAULT_OPACITY_MIN,
        "opacityMax": DEFAULT_OPACITY_MAX,
        "entryFrames": DEFAULT_ENTRY_FRAMES,
        "exitFrames": DEFAULT_EXIT_FRAMES,
        "trails": None,
        "rotoForce": None,
        "curve": None,
        "customMessages": None,
        "customTitles": None,
        "jitter": 0,
    }


def get_element_settings(settings, type_name):
    """Resolve per-element settings with null-safe defaults.

    Returns filled dict even if settings['elements'] or the type key is missing.
    """
    defaults = default_element_settings()
    if not settings or "elements" not in settings or type_name not in settings.get("elements", {}):
        return defaults
    src = settings["elements"][type_name]
    return {
        "count": src.get("count") if src.get("count") is not None else defaults["count"],
        "minFrames": src.get("minFrames") if src.get("minFrames") is not None else defaults["minFrames"],
        "maxFrames": src.get("maxFrames") if src.get("maxFrames") is not None else defaults["maxFrames"],
        "scale": src.get("scale") if src.get("scale") is not None else defaults["scale"],
        "speed": src.get("speed") if src.get("speed") is not None else defaults["speed"],
        "opacityMin": src.get("opacityMin") if src.get("opacityMin") is not None else defaults["opacityMin"],
        "opacityMax": src.get("opacityMax") if src.get("opacityMax") is not None else defaults["opacityMax"],
        "entryFrames": src.get("entryFrames") if src.get("entryFrames") is not None else defaults["entryFrames"],
        "exitFrames": src.get("exitFrames") if src.get("exitFrames") is not None else defaults["exitFrames"],
        "trails": src.get("trails"),
        "rotoForce": src.get("rotoForce"),
        "curve": src.get("curve"),
        "customMessages": src.get("customMessages"),
        "customTitles": src.get("customTitles"),
        "jitter": src.get("jitter") if src.get("jitter") is not None else defaults["jitter"],
    }


def migrate_settings(raw):
    """Detect old-format settings and convert to new per-element format.

    Old format had flat fields: counts, minFrames, maxFrames, elementScale, etc.
    New format nests under raw['elements'][type].
    Returns raw unchanged if elements already exists.
    """
    if not raw:
        return raw

    if raw.get("virtualRes") is None:
        raw["virtualRes"] = DEFAULT_VIRTUAL_RES_INDEX
    if raw.get("rotoBehindPct") is None:
        raw["rotoBehindPct"] = 50

    if "elements" in raw:
        if "freeze" not in raw["elements"]:
            raw["elements"]["freeze"] = default_element_settings()
        for t in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
            if t in raw["elements"] and raw["elements"][t].get("jitter") is None:
                raw["elements"][t]["jitter"] = 0
        return raw

    if "counts" not in raw and raw.get("minFrames") is None and raw.get("elementScale") is None:
        return raw

    type_names = ["dialog", "bsod", "cursor", "pixel", "freeze"]
    old_counts = raw.get("counts", {})
    base_elem = {
        "minFrames": raw.get("minFrames") if raw.get("minFrames") is not None else FLOOR_FRAMES,
        "maxFrames": raw.get("maxFrames") if raw.get("maxFrames") is not None else MAX_FRAMES,
        "scale": raw.get("elementScale") if raw.get("elementScale") is not None else DEFAULT_ELEMENT_SCALE,
        "speed": raw.get("speedMult") if raw.get("speedMult") is not None else DEFAULT_SPEED_MULT,
        "opacityMin": raw.get("opacityMin") if raw.get("opacityMin") is not None else DEFAULT_OPACITY_MIN,
        "opacityMax": raw.get("opacityMax") if raw.get("opacityMax") is not None else DEFAULT_OPACITY_MAX,
        "entryFrames": raw.get("entryFrames") if raw.get("entryFrames") is not None else DEFAULT_ENTRY_FRAMES,
        "exitFrames": raw.get("exitFrames") if raw.get("exitFrames") is not None else DEFAULT_EXIT_FRAMES,
    }

    raw["elements"] = {}
    for t in type_names:
        raw["elements"][t] = {
            "count": old_counts.get(t, 0),
            "minFrames": base_elem["minFrames"],
            "maxFrames": base_elem["maxFrames"],
            "scale": base_elem["scale"],
            "speed": base_elem["speed"],
            "opacityMin": base_elem["opacityMin"],
            "opacityMax": base_elem["opacityMax"],
            "entryFrames": base_elem["entryFrames"],
            "exitFrames": base_elem["exitFrames"],
        }

    for key in ["counts", "minFrames", "maxFrames", "elementScale", "speedMult",
                "opacityMin", "opacityMax", "entryFrames", "exitFrames"]:
        raw.pop(key, None)

    return raw


def default_settings():
    """Returns a complete default settings dict."""
    return {
        "seed": 1984,
        "chaos": 100,
        "rotoMode": "split",
        "chaosCurve": "flat",
        "animStyle": "xpClassic",
        "elements": {
            "dialog": default_element_settings(),
            "bsod": default_element_settings(),
            "cursor": default_element_settings(),
            "pixel": default_element_settings(),
            "freeze": default_element_settings(),
        },
        "scanlines": {
            "enabled": True,
            "opacity": DEFAULT_SCANLINE_OPACITY,
            "spacing": DEFAULT_SCANLINE_SPACING,
            "jitter": False,
        },
        "noise": {
            "enabled": True,
            "opacity": DEFAULT_NOISE_OPACITY,
            "scale": DEFAULT_NOISE_SCALE,
            "complexity": DEFAULT_NOISE_COMPLEXITY,
        },
        "headScratch": {
            "enabled": False,
            "freq": DEFAULT_HEADSCRATCH_FREQ,
            "height": DEFAULT_HEADSCRATCH_HEIGHT,
        },
        "trails": {
            "enabled": True,
            "chance": DEFAULT_TRAILS_CHANCE,
            "echoes": DEFAULT_TRAILS_ECHOES,
            "decay": DEFAULT_TRAILS_DECAY,
        },
        "stackDepth": MAX_STACK_DEPTH,
        "stackOffset": STACK_OFFSET_X,
        "virtualRes": DEFAULT_VIRTUAL_RES_INDEX,
        "rotoBehindPct": 50,
        "customMessages": [],
        "customTitles": [],
        "rotoKeywords": [],
        "rotoLayerNames": [],
    }


def randomize_settings():
    """Returns a fully randomized settings dict.

    Uses random.random() (not PRNG) since this is a UI action.
    """
    curves = ["flat", "build", "peak", "burst", "random"]
    styles = ["xpClassic", "glitchHeavy", "slowBurn", "chaosMax"]
    roto_modes = ["split", "allOver", "allUnder", "flat"]

    elements = {}
    for t in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
        min_f = int(random.random() * 40) + 4
        max_f = min_f + int(random.random() * 80) + 10
        trails = None
        if random.random() < 0.3:
            trails = {
                "enabled": random.random() > 0.2,
                "chance": int(random.random() * 80) + 5,
                "echoes": int(random.random() * 8) + 2,
                "decay": int(random.random() * 70) + 20,
            }
        roto_force = None
        if random.random() < 0.3:
            roto_force = "over" if random.random() < 0.5 else "under"
        curve = None
        if random.random() < 0.3:
            curve = curves[int(random.random() * len(curves))]
        elements[t] = {
            "count": int(random.random() * 30),
            "minFrames": min_f,
            "maxFrames": max_f,
            "scale": int(random.random() * 150) + 50,
            "speed": int(random.random() * 150) + 50,
            "opacityMin": int(random.random() * 50) + 20,
            "opacityMax": int(random.random() * 30) + 70,
            "entryFrames": int(random.random() * 8) + 1,
            "exitFrames": int(random.random() * 6) + 1,
            "trails": trails,
            "rotoForce": roto_force,
            "curve": curve,
            "customMessages": None,
            "customTitles": None,
            "jitter": int(random.random() * 100),
        }

    return {
        "seed": int(random.random() * 89999) + 10000,
        "chaos": int(random.random() * 181) + 20,
        "rotoMode": roto_modes[int(random.random() * len(roto_modes))],
        "chaosCurve": curves[int(random.random() * len(curves))],
        "animStyle": styles[int(random.random() * len(styles))],
        "virtualRes": int(random.random() * len(VIRTUAL_RESOLUTIONS)),
        "elements": elements,
        "scanlines": {
            "enabled": random.random() > 0.3,
            "opacity": int(random.random() * 40) + 5,
            "spacing": int(random.random() * 8) + 2,
            "jitter": random.random() > 0.5,
        },
        "noise": {
            "enabled": random.random() > 0.3,
            "opacity": int(random.random() * 20) + 2,
            "scale": int(random.random() * 150) + 50,
            "complexity": int(random.random() * 15) + 1,
        },
        "headScratch": {
            "enabled": random.random() > 0.5,
            "freq": int(random.random() * 30) + 5,
            "height": int(random.random() * 4) + 1,
        },
        "trails": {
            "enabled": random.random() > 0.3,
            "chance": int(random.random() * 80) + 5,
            "echoes": int(random.random() * 8) + 2,
            "decay": int(random.random() * 70) + 20,
        },
        "stackDepth": int(random.random() * 12) + 3,
        "stackOffset": int(random.random() * 20) + 5,
        "rotoBehindPct": int(random.random() * 101),
        "customMessages": [],
        "customTitles": [],
        "rotoKeywords": [],
        "rotoLayerNames": [],
    }
