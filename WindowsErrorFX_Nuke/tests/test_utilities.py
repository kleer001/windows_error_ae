"""Tests for utilities, settings, message pools, roto detector."""

import sys
import os
import math
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.prng import create_rng, rng_int, rng_pick, rng_bool, rng_float
from core.constants import (
    FLOOR_FRAMES, FLOOR_PIXEL_BLOCK, FLOOR_FREEZE_STRIP, MAX_FRAMES,
    DEFAULT_ELEMENT_SCALE, DEFAULT_SPEED_MULT,
    DEFAULT_OPACITY_MIN, DEFAULT_OPACITY_MAX,
    DEFAULT_ENTRY_FRAMES, DEFAULT_EXIT_FRAMES,
    DEFAULT_TRAILS_CHANCE, DEFAULT_TRAILS_ECHOES, DEFAULT_TRAILS_DECAY,
    DEFAULT_VIRTUAL_RES_INDEX, VIRTUAL_RESOLUTIONS,
    ERROR_MESSAGES, WINDOW_TITLES, BUTTON_COMBOS,
    BSOD_LINES, CORRUPT_TEXT_LINES, ROTO_KEYWORDS,
    BLEND_WEIGHTS, BLEND_MODE_MAP,
    MAX_STACK_DEPTH, STACK_OFFSET_X,
    C_BSOD_BG, C_DIALOG_BG, C_PIXEL_COLORS,
    DIALOG_CATALOG, DIALOG_VARIANTS,
    BSOD_CODES, BSOD_EXCEPTIONS, BSOD_LINES_XP, BSOD_LINES_9X,
    C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT,
)
from core.settings import (
    default_element_settings, get_element_settings,
    migrate_settings, default_settings, randomize_settings,
)
from core.scheduler import (
    clamp, calc_comp_scale, fake_hex, resolve_hex_placeholders,
    pick_error_message, pick_window_title, pick_bsod_lines, pick_corrupt_lines,
    calc_element_count, weighted_pick, assign_layer,
)


# ── Utility function tests ──────────────────────────────────────

class TestClamp(unittest.TestCase):
    def test_within_range(self):
        self.assertEqual(clamp(5, 0, 10), 5)

    def test_below_min(self):
        self.assertEqual(clamp(-5, 0, 10), 0)

    def test_above_max(self):
        self.assertEqual(clamp(15, 0, 10), 10)

    def test_at_boundaries(self):
        self.assertEqual(clamp(0, 0, 10), 0)
        self.assertEqual(clamp(10, 0, 10), 10)


class TestCalcCompScale(unittest.TestCase):
    def test_1920_at_1024x768(self):
        scale = calc_comp_scale(1920, 2)
        self.assertAlmostEqual(scale, 1920.0 / 1024.0, places=4)

    def test_native(self):
        self.assertEqual(calc_comp_scale(1920, 4), 1.0)

    def test_640x480(self):
        scale = calc_comp_scale(1920, 0)
        self.assertAlmostEqual(scale, 1920.0 / 640.0, places=4)


class TestFakeHex(unittest.TestCase):
    def test_format(self):
        rng = create_rng(42)
        h = fake_hex(rng)
        self.assertTrue(h.startswith("0x"))
        self.assertGreaterEqual(len(h), 8)  # 0x + at least 6

    def test_determinism(self):
        rng1 = create_rng(42)
        rng2 = create_rng(42)
        self.assertEqual(fake_hex(rng1), fake_hex(rng2))


class TestResolveHexPlaceholders(unittest.TestCase):
    def test_replaces_all(self):
        rng = create_rng(42)
        result = resolve_hex_placeholders("addr %HEX% offset %HEX%", rng)
        self.assertNotIn("%HEX%", result)
        self.assertIn("0x", result)

    def test_no_placeholder(self):
        rng = create_rng(42)
        self.assertEqual(resolve_hex_placeholders("hello world", rng), "hello world")


# ── Message pool tests ──────────────────────────────────────────

class TestMessagePools(unittest.TestCase):
    def test_error_messages_nonempty(self):
        self.assertGreater(len(ERROR_MESSAGES), 0)

    def test_window_titles_nonempty(self):
        self.assertGreater(len(WINDOW_TITLES), 0)

    def test_button_combos_nonempty(self):
        self.assertGreater(len(BUTTON_COMBOS), 0)

    def test_bsod_lines_nonempty(self):
        self.assertGreater(len(BSOD_LINES), 0)

    def test_corrupt_lines_nonempty(self):
        self.assertGreater(len(CORRUPT_TEXT_LINES), 0)

    def test_pick_error_message(self):
        rng = create_rng(42)
        msg = pick_error_message(rng)
        self.assertIsInstance(msg, str)
        self.assertGreater(len(msg), 0)
        self.assertNotIn("%HEX%", msg)

    def test_pick_error_message_with_custom(self):
        rng = create_rng(42)
        custom = ["CUSTOM ERROR"]
        # Run enough picks to statistically get a custom one
        found = False
        for _ in range(1000):
            rng2 = create_rng(rng_int(rng, 0, 99999))
            msg = pick_error_message(rng2, custom)
            if msg == "CUSTOM ERROR":
                found = True
                break
        self.assertTrue(found)

    def test_pick_window_title(self):
        rng = create_rng(42)
        title = pick_window_title(rng)
        self.assertIsInstance(title, str)
        self.assertGreater(len(title), 0)

    def test_pick_window_title_with_custom(self):
        rng = create_rng(42)
        custom = ["MY TITLE"]
        found = False
        for _ in range(1000):
            rng2 = create_rng(rng_int(rng, 0, 99999))
            t = pick_window_title(rng2, custom)
            if t == "MY TITLE":
                found = True
                break
        self.assertTrue(found)

    def test_pick_bsod_lines(self):
        rng = create_rng(42)
        lines = pick_bsod_lines(rng, 5)
        self.assertEqual(len(lines), 5)
        for line in lines:
            self.assertNotIn("%HEX%", line)

    def test_pick_corrupt_lines(self):
        rng = create_rng(42)
        lines = pick_corrupt_lines(rng, 3)
        self.assertEqual(len(lines), 3)
        for line in lines:
            self.assertIn(line, CORRUPT_TEXT_LINES)


# ── Constants structure tests ────────────────────────────────────

class TestConstants(unittest.TestCase):
    def test_pixel_colors_count(self):
        self.assertEqual(len(C_PIXEL_COLORS), 7)

    def test_pixel_colors_rgb(self):
        for c in C_PIXEL_COLORS:
            self.assertEqual(len(c), 3)

    def test_virtual_resolutions(self):
        self.assertEqual(len(VIRTUAL_RESOLUTIONS), 5)
        self.assertEqual(VIRTUAL_RESOLUTIONS[2]["w"], 1024)

    def test_blend_weights_types(self):
        for t in ["bsod", "pixel", "dialog", "cursor", "freeze"]:
            self.assertIn(t, BLEND_WEIGHTS)
            total = sum(w["weight"] for w in BLEND_WEIGHTS[t])
            self.assertGreater(total, 0)

    def test_blend_mode_map(self):
        for key in ["normal", "add", "screen", "overlay", "hardLight", "difference"]:
            self.assertIn(key, BLEND_MODE_MAP)

    def test_dialog_catalog(self):
        self.assertEqual(len(DIALOG_CATALOG), 36)
        for entry in DIALOG_CATALOG:
            self.assertIn("id", entry)
            self.assertIn("variant", entry)
            self.assertIn("icon", entry)

    def test_dialog_variants(self):
        for v in ["A", "B", "C"]:
            self.assertIn(v, DIALOG_VARIANTS)
            self.assertIn("body", DIALOG_VARIANTS[v])
            self.assertIn("titleH", DIALOG_VARIANTS[v])

    def test_bsod_codes(self):
        self.assertGreater(len(BSOD_CODES), 0)
        self.assertGreater(len(BSOD_EXCEPTIONS), 0)

    def test_roto_keywords(self):
        self.assertGreater(len(ROTO_KEYWORDS), 0)
        self.assertIn("roto", ROTO_KEYWORDS)


# ── Settings tests ───────────────────────────────────────────────

class TestDefaultElementSettings(unittest.TestCase):
    def test_returns_dict(self):
        s = default_element_settings()
        self.assertIsInstance(s, dict)

    def test_has_all_fields(self):
        s = default_element_settings()
        for key in ["count", "minFrames", "maxFrames", "scale", "speed",
                     "opacityMin", "opacityMax", "entryFrames", "exitFrames",
                     "trails", "rotoForce", "curve", "customMessages",
                     "customTitles", "jitter"]:
            self.assertIn(key, s)

    def test_defaults(self):
        s = default_element_settings()
        self.assertEqual(s["count"], 0)
        self.assertEqual(s["minFrames"], FLOOR_FRAMES)
        self.assertEqual(s["maxFrames"], MAX_FRAMES)
        self.assertEqual(s["scale"], DEFAULT_ELEMENT_SCALE)
        self.assertEqual(s["speed"], DEFAULT_SPEED_MULT)
        self.assertEqual(s["opacityMin"], DEFAULT_OPACITY_MIN)
        self.assertEqual(s["opacityMax"], DEFAULT_OPACITY_MAX)
        self.assertEqual(s["entryFrames"], DEFAULT_ENTRY_FRAMES)
        self.assertEqual(s["exitFrames"], DEFAULT_EXIT_FRAMES)
        self.assertIsNone(s["trails"])
        self.assertIsNone(s["rotoForce"])
        self.assertIsNone(s["curve"])
        self.assertEqual(s["jitter"], 0)

    def test_independent_copies(self):
        s1 = default_element_settings()
        s2 = default_element_settings()
        s1["count"] = 99
        self.assertEqual(s2["count"], 0)


class TestGetElementSettings(unittest.TestCase):
    def test_missing_settings(self):
        result = get_element_settings(None, "dialog")
        self.assertEqual(result["count"], 0)

    def test_missing_elements(self):
        result = get_element_settings({"chaos": 50}, "dialog")
        self.assertEqual(result["count"], 0)

    def test_missing_type(self):
        result = get_element_settings({"elements": {}}, "dialog")
        self.assertEqual(result["count"], 0)

    def test_partial_override(self):
        settings = {
            "elements": {
                "dialog": {"count": 5, "scale": 150}
            }
        }
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["count"], 5)
        self.assertEqual(result["scale"], 150)
        self.assertEqual(result["minFrames"], FLOOR_FRAMES)  # default

    def test_null_values_use_defaults(self):
        settings = {
            "elements": {
                "dialog": {"count": None, "scale": None}
            }
        }
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["scale"], DEFAULT_ELEMENT_SCALE)

    def test_zero_values_preserved(self):
        settings = {
            "elements": {
                "dialog": {"count": 0, "jitter": 0}
            }
        }
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["jitter"], 0)

    def test_override_trails(self):
        trails = {"enabled": True, "chance": 50, "echoes": 6, "decay": 30}
        settings = {"elements": {"dialog": {"trails": trails}}}
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["trails"], trails)

    def test_override_roto_force(self):
        settings = {"elements": {"dialog": {"rotoForce": "over"}}}
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["rotoForce"], "over")

    def test_override_curve(self):
        settings = {"elements": {"dialog": {"curve": "burst"}}}
        result = get_element_settings(settings, "dialog")
        self.assertEqual(result["curve"], "burst")


class TestMigrateSettings(unittest.TestCase):
    def test_none_passthrough(self):
        self.assertIsNone(migrate_settings(None))

    def test_new_format_passthrough(self):
        s = default_settings()
        result = migrate_settings(s)
        self.assertIn("elements", result)
        self.assertIn("dialog", result["elements"])

    def test_backfills_freeze(self):
        s = {"elements": {"dialog": {}, "bsod": {}, "cursor": {}, "pixel": {}}}
        result = migrate_settings(s)
        self.assertIn("freeze", result["elements"])

    def test_backfills_jitter(self):
        s = {"elements": {
            "dialog": {"count": 0}, "bsod": {"count": 0},
            "cursor": {"count": 0}, "pixel": {"count": 0},
            "freeze": {"count": 0},
        }}
        result = migrate_settings(s)
        for t in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
            self.assertEqual(result["elements"][t]["jitter"], 0)

    def test_backfills_virtual_res(self):
        s = {"elements": {"dialog": {}, "bsod": {}, "cursor": {}, "pixel": {}, "freeze": {}}}
        result = migrate_settings(s)
        self.assertEqual(result["virtualRes"], DEFAULT_VIRTUAL_RES_INDEX)

    def test_backfills_roto_behind_pct(self):
        s = {"elements": {"dialog": {}, "bsod": {}, "cursor": {}, "pixel": {}, "freeze": {}}}
        result = migrate_settings(s)
        self.assertEqual(result["rotoBehindPct"], 50)

    def test_old_format_migration(self):
        old = {
            "counts": {"dialog": 5, "bsod": 3},
            "minFrames": 10,
            "maxFrames": 80,
            "elementScale": 120,
            "speedMult": 90,
            "opacityMin": 30,
            "opacityMax": 95,
            "entryFrames": 4,
            "exitFrames": 3,
        }
        result = migrate_settings(old)
        self.assertIn("elements", result)
        self.assertEqual(result["elements"]["dialog"]["count"], 5)
        self.assertEqual(result["elements"]["bsod"]["count"], 3)
        self.assertEqual(result["elements"]["cursor"]["count"], 0)
        self.assertEqual(result["elements"]["dialog"]["minFrames"], 10)
        self.assertEqual(result["elements"]["dialog"]["scale"], 120)
        # Old keys removed
        self.assertNotIn("counts", result)
        self.assertNotIn("elementScale", result)

    def test_no_old_format_markers(self):
        raw = {"seed": 42, "chaos": 50}
        result = migrate_settings(raw)
        self.assertNotIn("elements", result)  # no elements added


class TestDefaultSettings(unittest.TestCase):
    def test_structure(self):
        s = default_settings()
        self.assertEqual(s["seed"], 1984)
        self.assertEqual(s["chaos"], 100)
        self.assertIn("elements", s)
        for t in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
            self.assertIn(t, s["elements"])
        self.assertIn("scanlines", s)
        self.assertIn("noise", s)
        self.assertIn("headScratch", s)
        self.assertIn("trails", s)
        self.assertEqual(s["stackDepth"], MAX_STACK_DEPTH)
        self.assertEqual(s["stackOffset"], STACK_OFFSET_X)


class TestRandomizeSettings(unittest.TestCase):
    def test_structure(self):
        s = randomize_settings()
        self.assertIn("seed", s)
        self.assertIn("chaos", s)
        self.assertIn("elements", s)
        for t in ["dialog", "bsod", "cursor", "pixel", "freeze"]:
            self.assertIn(t, s["elements"])
            el = s["elements"][t]
            self.assertIn("count", el)
            self.assertIn("jitter", el)

    def test_seed_range(self):
        for _ in range(100):
            s = randomize_settings()
            self.assertGreaterEqual(s["seed"], 10000)
            self.assertLessEqual(s["seed"], 99999)

    def test_chaos_range(self):
        for _ in range(100):
            s = randomize_settings()
            self.assertGreaterEqual(s["chaos"], 20)
            self.assertLessEqual(s["chaos"], 200)


# ── Weighted pick tests ──────────────────────────────────────────

class TestWeightedPick(unittest.TestCase):
    def test_single_option(self):
        rng = create_rng(42)
        result = weighted_pick([{"value": "only", "weight": 100}], rng)
        self.assertEqual(result, "only")

    def test_zero_total(self):
        rng = create_rng(42)
        result = weighted_pick([{"value": "a", "weight": 0}], rng)
        self.assertEqual(result, "a")

    def test_distribution(self):
        rng = create_rng(42)
        items = [{"value": "heavy", "weight": 90}, {"value": "light", "weight": 10}]
        counts = {"heavy": 0, "light": 0}
        for _ in range(10000):
            v = weighted_pick(items, rng)
            counts[v] += 1
        self.assertGreater(counts["heavy"], counts["light"] * 5)


# ── Assign layer tests ──────────────────────────────────────────

class TestAssignLayer(unittest.TestCase):
    def test_flat_mode(self):
        rng = create_rng(42)
        self.assertEqual(assign_layer("dialog", "flat", rng), "over")

    def test_all_over(self):
        rng = create_rng(42)
        self.assertEqual(assign_layer("dialog", "allOver", rng), "over")

    def test_all_under(self):
        rng = create_rng(42)
        self.assertEqual(assign_layer("dialog", "allUnder", rng), "under")

    def test_force_over(self):
        rng = create_rng(42)
        self.assertEqual(assign_layer("dialog", "split", rng, "over"), "over")

    def test_force_under(self):
        rng = create_rng(42)
        self.assertEqual(assign_layer("dialog", "split", rng, "under"), "under")

    def test_split_distribution(self):
        rng = create_rng(42)
        over = 0
        under = 0
        for _ in range(1000):
            layer = assign_layer("dialog", "split", rng, None, 50)
            if layer == "over":
                over += 1
            else:
                under += 1
        self.assertAlmostEqual(over / 1000, 0.5, delta=0.06)

    def test_behind_pct_0(self):
        rng = create_rng(42)
        results = set()
        for _ in range(100):
            results.add(assign_layer("dialog", "split", rng, None, 0))
        self.assertEqual(results, {"over"})

    def test_behind_pct_100(self):
        rng = create_rng(42)
        results = set()
        for _ in range(100):
            results.add(assign_layer("dialog", "split", rng, None, 100))
        self.assertEqual(results, {"under"})


# ── Calc element count tests ────────────────────────────────────

class TestCalcElementCount(unittest.TestCase):
    def test_zero_chaos(self):
        self.assertEqual(calc_element_count(0, 240), 0)

    def test_chaos_100_240f(self):
        count = calc_element_count(100, 240)
        self.assertEqual(count, 50)

    def test_scales_with_frames(self):
        c1 = calc_element_count(100, 240)
        c2 = calc_element_count(100, 480)
        self.assertGreater(c2, c1)

    def test_minimum_1(self):
        count = calc_element_count(1, 10)
        self.assertGreaterEqual(count, 1)


if __name__ == "__main__":
    unittest.main()
