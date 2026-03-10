"""Control node — NoOp with custom knobs for all settings.

Creates the WindowsErrorFX Group node with embedded controls and callbacks.
"""

import nuke

from .core.log import wlog, wlog_open, wlog_close, get_log_path
from .core.constants import (
    FLOOR_FRAMES, MAX_FRAMES,
    DEFAULT_ELEMENT_SCALE, DEFAULT_SPEED_MULT,
    DEFAULT_OPACITY_MIN, DEFAULT_OPACITY_MAX,
    DEFAULT_ENTRY_FRAMES, DEFAULT_EXIT_FRAMES,
    DEFAULT_NOISE_OPACITY, DEFAULT_NOISE_SCALE, DEFAULT_NOISE_COMPLEXITY,
    DEFAULT_HEADSCRATCH_FREQ, DEFAULT_HEADSCRATCH_HEIGHT,
    DEFAULT_TRAILS_CHANCE, DEFAULT_TRAILS_ECHOES, DEFAULT_TRAILS_DECAY,
    MAX_STACK_DEPTH, STACK_OFFSET_X,
    VIRTUAL_RESOLUTIONS,
)
from .core.settings import default_settings


def create_wefx_group():
    """Create the WindowsErrorFX Group node with control knobs.

    Returns the Group node.
    """
    group = nuke.createNode("Group")
    group.setName("WindowsErrorFX")

    group.begin()

    # Create Input and Output nodes
    inp = nuke.createNode("Input")
    inp.setName("Footage")
    inp["number"].setValue(0)

    inp_roto = nuke.createNode("Input")
    inp_roto.setName("Roto")
    inp_roto["number"].setValue(1)

    out = nuke.createNode("Output")
    out.setInput(0, inp)

    group.end()

    # Add custom knobs
    _add_control_knobs(group)

    return group


def _add_control_knobs(group):
    """Add all custom control knobs to the Group node."""

    # ── Core Controls ──────────────────────────────────
    tab = nuke.Tab_Knob("wefx_tab", "WindowsErrorFX")
    group.addKnob(tab)

    # Seed
    seed_knob = nuke.Int_Knob("wefx_seed", "Seed")
    seed_knob.setValue(1984)
    group.addKnob(seed_knob)

    # Chaos
    chaos_knob = nuke.Int_Knob("wefx_chaos", "Chaos")
    chaos_knob.setValue(100)
    group.addKnob(chaos_knob)

    # Virtual Resolution
    res_labels = [r["label"] for r in VIRTUAL_RESOLUTIONS]
    res_knob = nuke.Enumeration_Knob("wefx_virtualRes", "Resolution", res_labels)
    res_knob.setValue("1024 x 768")
    group.addKnob(res_knob)

    # Roto Mode
    roto_knob = nuke.Enumeration_Knob("wefx_rotoMode", "Roto Mode",
                                       ["split", "allOver", "allUnder", "flat"])
    group.addKnob(roto_knob)

    # Behind %
    behind_knob = nuke.Int_Knob("wefx_rotoBehindPct", "Behind %")
    behind_knob.setValue(50)
    behind_knob.setRange(0, 100)
    group.addKnob(behind_knob)

    # Animation Style
    style_knob = nuke.Enumeration_Knob("wefx_animStyle", "Anim Style",
                                        ["xpClassic", "glitchHeavy", "slowBurn", "chaosMax"])
    group.addKnob(style_knob)

    # Chaos Curve
    curve_knob = nuke.Enumeration_Knob("wefx_chaosCurve", "Chaos Curve",
                                        ["flat", "build", "peak", "burst", "random"])
    group.addKnob(curve_knob)

    # Stack controls
    stack_depth = nuke.Int_Knob("wefx_stackDepth", "Stack Depth")
    stack_depth.setValue(MAX_STACK_DEPTH)
    group.addKnob(stack_depth)

    stack_offset = nuke.Int_Knob("wefx_stackOffset", "Stack Offset")
    stack_offset.setValue(STACK_OFFSET_X)
    group.addKnob(stack_offset)

    # ── Generate / Clear Buttons ───────────────────────
    div1 = nuke.Text_Knob("wefx_div1", "")
    group.addKnob(div1)

    gen_btn = nuke.PyScript_Knob("wefx_generate", "Generate",
                                  "import WindowsErrorFX_Nuke.control as ctrl; "
                                  "ctrl.on_generate(nuke.thisNode())")
    group.addKnob(gen_btn)

    clear_btn = nuke.PyScript_Knob("wefx_clear", "Clear",
                                    "import WindowsErrorFX_Nuke.control as ctrl; "
                                    "ctrl.on_clear(nuke.thisNode())")
    group.addKnob(clear_btn)

    randomize_btn = nuke.PyScript_Knob("wefx_randomize", "Randomize",
                                        "import WindowsErrorFX_Nuke.control as ctrl; "
                                        "ctrl.on_randomize(nuke.thisNode())")
    group.addKnob(randomize_btn)

    # ── Per-Element Tabs ───────────────────────────────
    for type_name in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
        _add_element_tab(group, type_name)

    # ── Overlays Tab ───────────────────────────────────
    overlay_tab = nuke.Tab_Knob("wefx_overlays_tab", "Overlays")
    group.addKnob(overlay_tab)

    # Noise
    noise_en = nuke.Boolean_Knob("wefx_noise_enabled", "Noise")
    noise_en.setValue(True)
    group.addKnob(noise_en)

    noise_opacity = nuke.Int_Knob("wefx_noise_opacity", "Noise Opacity")
    noise_opacity.setValue(DEFAULT_NOISE_OPACITY)
    group.addKnob(noise_opacity)

    noise_scale = nuke.Int_Knob("wefx_noise_scale", "Noise Scale")
    noise_scale.setValue(DEFAULT_NOISE_SCALE)
    group.addKnob(noise_scale)

    noise_complex = nuke.Int_Knob("wefx_noise_complexity", "Noise Complexity")
    noise_complex.setValue(DEFAULT_NOISE_COMPLEXITY)
    group.addKnob(noise_complex)

    # Head Scratch
    hs_en = nuke.Boolean_Knob("wefx_hs_enabled", "Head Scratch")
    hs_en.setValue(False)
    group.addKnob(hs_en)

    hs_freq = nuke.Int_Knob("wefx_hs_freq", "HS Frequency")
    hs_freq.setValue(DEFAULT_HEADSCRATCH_FREQ)
    group.addKnob(hs_freq)

    hs_height = nuke.Int_Knob("wefx_hs_height", "HS Height")
    hs_height.setValue(DEFAULT_HEADSCRATCH_HEIGHT)
    group.addKnob(hs_height)

    # ── Trails Tab ─────────────────────────────────────
    trails_tab = nuke.Tab_Knob("wefx_trails_tab", "Trails")
    group.addKnob(trails_tab)

    trails_en = nuke.Boolean_Knob("wefx_trails_enabled", "Trails")
    trails_en.setValue(True)
    group.addKnob(trails_en)

    trails_chance = nuke.Int_Knob("wefx_trails_chance", "Trails Chance %")
    trails_chance.setValue(DEFAULT_TRAILS_CHANCE)
    group.addKnob(trails_chance)

    trails_echoes = nuke.Int_Knob("wefx_trails_echoes", "Trails Echoes")
    trails_echoes.setValue(DEFAULT_TRAILS_ECHOES)
    group.addKnob(trails_echoes)

    trails_decay = nuke.Int_Knob("wefx_trails_decay", "Trails Decay %")
    trails_decay.setValue(DEFAULT_TRAILS_DECAY)
    group.addKnob(trails_decay)


def _add_element_tab(group, type_name):
    """Add a per-element settings tab to the Group."""
    label = type_name.capitalize()
    tab = nuke.Tab_Knob("wefx_%s_tab" % type_name, label)
    group.addKnob(tab)

    prefix = "wefx_%s_" % type_name

    count = nuke.Int_Knob(prefix + "count", "Count")
    count.setValue(0)
    group.addKnob(count)

    min_f = nuke.Int_Knob(prefix + "minFrames", "Min Frames")
    min_f.setValue(FLOOR_FRAMES)
    group.addKnob(min_f)

    max_f = nuke.Int_Knob(prefix + "maxFrames", "Max Frames")
    max_f.setValue(MAX_FRAMES)
    group.addKnob(max_f)

    scale = nuke.Int_Knob(prefix + "scale", "Scale %")
    scale.setValue(DEFAULT_ELEMENT_SCALE)
    group.addKnob(scale)

    speed = nuke.Int_Knob(prefix + "speed", "Speed %")
    speed.setValue(DEFAULT_SPEED_MULT)
    group.addKnob(speed)

    opac_min = nuke.Int_Knob(prefix + "opacityMin", "Opacity Min")
    opac_min.setValue(DEFAULT_OPACITY_MIN)
    group.addKnob(opac_min)

    opac_max = nuke.Int_Knob(prefix + "opacityMax", "Opacity Max")
    opac_max.setValue(DEFAULT_OPACITY_MAX)
    group.addKnob(opac_max)

    entry = nuke.Int_Knob(prefix + "entryFrames", "Entry Frames")
    entry.setValue(DEFAULT_ENTRY_FRAMES)
    group.addKnob(entry)

    exit_f = nuke.Int_Knob(prefix + "exitFrames", "Exit Frames")
    exit_f.setValue(DEFAULT_EXIT_FRAMES)
    group.addKnob(exit_f)

    jitter = nuke.Int_Knob(prefix + "jitter", "Jitter")
    jitter.setValue(0)
    group.addKnob(jitter)


def settings_from_knobs(group):
    """Read all knob values and return a settings dict."""
    settings = default_settings()

    settings["seed"] = int(group["wefx_seed"].value())
    settings["chaos"] = int(group["wefx_chaos"].value())
    settings["virtualRes"] = int(group["wefx_virtualRes"].getValue())
    settings["rotoMode"] = group["wefx_rotoMode"].value()
    settings["rotoBehindPct"] = int(group["wefx_rotoBehindPct"].value())
    settings["animStyle"] = group["wefx_animStyle"].value()
    settings["chaosCurve"] = group["wefx_chaosCurve"].value()
    settings["stackDepth"] = int(group["wefx_stackDepth"].value())
    settings["stackOffset"] = int(group["wefx_stackOffset"].value())

    for type_name in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
        prefix = "wefx_%s_" % type_name
        settings["elements"][type_name] = {
            "count": int(group[prefix + "count"].value()),
            "minFrames": int(group[prefix + "minFrames"].value()),
            "maxFrames": int(group[prefix + "maxFrames"].value()),
            "scale": int(group[prefix + "scale"].value()),
            "speed": int(group[prefix + "speed"].value()),
            "opacityMin": int(group[prefix + "opacityMin"].value()),
            "opacityMax": int(group[prefix + "opacityMax"].value()),
            "entryFrames": int(group[prefix + "entryFrames"].value()),
            "exitFrames": int(group[prefix + "exitFrames"].value()),
            "jitter": int(group[prefix + "jitter"].value()),
            "trails": None,
            "rotoForce": None,
            "curve": None,
            "customMessages": None,
            "customTitles": None,
        }

    # Overlays
    settings["noise"] = {
        "enabled": group["wefx_noise_enabled"].value(),
        "opacity": int(group["wefx_noise_opacity"].value()),
        "scale": int(group["wefx_noise_scale"].value()),
        "complexity": int(group["wefx_noise_complexity"].value()),
    }
    settings["headScratch"] = {
        "enabled": group["wefx_hs_enabled"].value(),
        "freq": int(group["wefx_hs_freq"].value()),
        "height": int(group["wefx_hs_height"].value()),
    }

    # Trails
    settings["trails"] = {
        "enabled": group["wefx_trails_enabled"].value(),
        "chance": int(group["wefx_trails_chance"].value()),
        "echoes": int(group["wefx_trails_echoes"].value()),
        "decay": int(group["wefx_trails_decay"].value()),
    }

    return settings


def apply_settings_to_knobs(group, settings):
    """Apply a settings dict to the Group's knobs."""
    group["wefx_seed"].setValue(settings.get("seed", 1984))
    group["wefx_chaos"].setValue(settings.get("chaos", 100))
    group["wefx_virtualRes"].setValue(settings.get("virtualRes", 2))
    group["wefx_rotoMode"].setValue(settings.get("rotoMode", "split"))
    group["wefx_animStyle"].setValue(settings.get("animStyle", "xpClassic"))
    group["wefx_chaosCurve"].setValue(settings.get("chaosCurve", "flat"))
    group["wefx_stackDepth"].setValue(settings.get("stackDepth", MAX_STACK_DEPTH))
    group["wefx_stackOffset"].setValue(settings.get("stackOffset", STACK_OFFSET_X))
    group["wefx_rotoBehindPct"].setValue(settings.get("rotoBehindPct", 50))

    for type_name in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
        es = settings.get("elements", {}).get(type_name, {})
        prefix = "wefx_%s_" % type_name
        group[prefix + "count"].setValue(es.get("count", 0))
        group[prefix + "minFrames"].setValue(es.get("minFrames", FLOOR_FRAMES))
        group[prefix + "maxFrames"].setValue(es.get("maxFrames", MAX_FRAMES))
        group[prefix + "scale"].setValue(es.get("scale", DEFAULT_ELEMENT_SCALE))
        group[prefix + "speed"].setValue(es.get("speed", DEFAULT_SPEED_MULT))
        group[prefix + "opacityMin"].setValue(es.get("opacityMin", DEFAULT_OPACITY_MIN))
        group[prefix + "opacityMax"].setValue(es.get("opacityMax", DEFAULT_OPACITY_MAX))
        group[prefix + "entryFrames"].setValue(es.get("entryFrames", DEFAULT_ENTRY_FRAMES))
        group[prefix + "exitFrames"].setValue(es.get("exitFrames", DEFAULT_EXIT_FRAMES))
        group[prefix + "jitter"].setValue(es.get("jitter", 0))

    noise = settings.get("noise", {})
    group["wefx_noise_enabled"].setValue(noise.get("enabled", True))
    group["wefx_noise_opacity"].setValue(noise.get("opacity", DEFAULT_NOISE_OPACITY))
    group["wefx_noise_scale"].setValue(noise.get("scale", DEFAULT_NOISE_SCALE))
    group["wefx_noise_complexity"].setValue(noise.get("complexity", DEFAULT_NOISE_COMPLEXITY))

    hs = settings.get("headScratch", {})
    group["wefx_hs_enabled"].setValue(hs.get("enabled", False))
    group["wefx_hs_freq"].setValue(hs.get("freq", DEFAULT_HEADSCRATCH_FREQ))
    group["wefx_hs_height"].setValue(hs.get("height", DEFAULT_HEADSCRATCH_HEIGHT))

    trails = settings.get("trails", {})
    group["wefx_trails_enabled"].setValue(trails.get("enabled", True))
    group["wefx_trails_chance"].setValue(trails.get("chance", DEFAULT_TRAILS_CHANCE))
    group["wefx_trails_echoes"].setValue(trails.get("echoes", DEFAULT_TRAILS_ECHOES))
    group["wefx_trails_decay"].setValue(trails.get("decay", DEFAULT_TRAILS_DECAY))


# ── Button Callbacks ──────────────────────────────────

def on_generate(group):
    """Generate button callback."""
    wlog_open()
    try:
        from . import compositor
        settings = settings_from_knobs(group)
        wlog("Settings: seed=%d, chaos=%d, rotoMode=%s, virtualRes=%s" % (
            settings["seed"], settings["chaos"],
            settings["rotoMode"], settings.get("virtualRes")))
        compositor.generate(group, settings)
        count = len([n for n in group.nodes() if n.name().startswith("WEFX_merge_")])
        wlog("Log file: %s" % get_log_path())
        nuke.message("WindowsErrorFX: Generated %d elements." % count)
    finally:
        wlog_close()


def on_clear(group):
    """Clear button callback."""
    wlog_open()
    try:
        wlog("=== CLEAR ALL ===")
        from . import compositor
        compositor.clear_generated_nodes(group)
        # Reconnect Input directly to Output
        group.begin()
        for node in nuke.allNodes():
            if node.Class() == "Output":
                for inp in nuke.allNodes():
                    if inp.Class() == "Input" and inp["number"].value() == 0:
                        node.setInput(0, inp)
                        break
                break
        group.end()
        wlog("=== CLEAR COMPLETE ===")
        nuke.message("WindowsErrorFX: Cleared.")
    finally:
        wlog_close()


def on_randomize(group):
    """Randomize button callback."""
    wlog_open()
    from .core.settings import randomize_settings
    settings = randomize_settings()
    wlog("Randomize: new seed=%d, chaos=%d" % (settings["seed"], settings["chaos"]))
    apply_settings_to_knobs(group, settings)
    wlog_close()
