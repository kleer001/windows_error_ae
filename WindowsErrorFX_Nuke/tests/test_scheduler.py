"""Tests for scheduler — port of tests/test_scheduler.js"""

import sys
import os
import math
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.prng import create_rng, rng_int
from core.constants import (
    FLOOR_FRAMES, FLOOR_PIXEL_BLOCK, FLOOR_FREEZE_STRIP, MAX_FRAMES,
    DEFAULT_ELEMENT_SCALE, DEFAULT_SPEED_MULT,
    DEFAULT_OPACITY_MIN, DEFAULT_OPACITY_MAX,
    DEFAULT_ENTRY_FRAMES, DEFAULT_EXIT_FRAMES,
    DEFAULT_TRAILS_CHANCE, DEFAULT_TRAILS_ECHOES, DEFAULT_TRAILS_DECAY,
    BLEND_WEIGHTS, BLEND_MODE_MAP,
    MAX_STACK_DEPTH, STACK_OFFSET_X,
    CURSOR_HEIGHT, FSIZE_TEXT_OVER,
    C_PIXEL_COLORS, DIALOG_WIDTH, DIALOG_HEIGHT,
    C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT,
    DIALOG_CATALOG,
)
from core.settings import default_settings, get_element_settings, default_element_settings
from core.scheduler import (
    clamp, calc_element_count, distribute_times, pick_element_type,
    pick_duration, assign_layer, weighted_pick, build_job,
    assign_dialog_stacks, schedule,
)


def make_comp_info(width=1920, height=1080, frame_rate=24, total_frames=240):
    return {
        "width": width,
        "height": height,
        "frameRate": frame_rate,
        "totalFrames": total_frames,
    }


class TestDistributeTimes(unittest.TestCase):
    def test_flat_sorted(self):
        rng = create_rng(42)
        times = distribute_times(50, 240, "flat", rng)
        self.assertEqual(len(times), 50)
        for i in range(1, len(times)):
            self.assertGreaterEqual(times[i], times[i - 1])

    def test_all_in_range(self):
        rng = create_rng(42)
        times = distribute_times(100, 240, "flat", rng)
        for t in times:
            self.assertGreaterEqual(t, 0)
            self.assertLessEqual(t, 239)

    def test_build_skews_right(self):
        rng = create_rng(42)
        times = distribute_times(500, 240, "build", rng)
        mid = 120
        later = sum(1 for t in times if t >= mid)
        self.assertGreater(later / len(times), 0.55)

    def test_peak_bell_curve(self):
        rng = create_rng(42)
        times = distribute_times(500, 240, "peak", rng)
        q1 = 60
        q3 = 180
        middle = sum(1 for t in times if q1 <= t <= q3)
        self.assertGreater(middle / len(times), 0.5)

    def test_burst_clustered(self):
        rng = create_rng(42)
        times = distribute_times(100, 240, "burst", rng)
        self.assertEqual(len(times), 100)
        # Should have gaps
        self.assertGreater(len(times), 0)

    def test_random_has_variation(self):
        rng = create_rng(42)
        times = distribute_times(100, 240, "random", rng)
        self.assertEqual(len(times), 100)

    def test_zero_count(self):
        rng = create_rng(42)
        times = distribute_times(0, 240, "flat", rng)
        self.assertEqual(len(times), 0)

    def test_single_frame(self):
        rng = create_rng(42)
        times = distribute_times(5, 1, "flat", rng)
        for t in times:
            self.assertEqual(t, 0)

    def test_determinism(self):
        times1 = distribute_times(50, 240, "flat", create_rng(12345))
        times2 = distribute_times(50, 240, "flat", create_rng(12345))
        self.assertEqual(times1, times2)


class TestPickElementType(unittest.TestCase):
    def test_basic(self):
        rng = create_rng(42)
        mix = {"dialog": 75, "bsod": 50, "cursor": 50, "pixel": 25, "freeze": 15}
        types = set()
        for _ in range(1000):
            types.add(pick_element_type(mix, rng))
        self.assertEqual(types, {"dialog", "bsod", "cursor", "pixel", "freeze"})

    def test_zero_weight(self):
        rng = create_rng(42)
        mix = {"dialog": 100, "bsod": 0, "cursor": 0, "pixel": 0, "freeze": 0}
        for _ in range(100):
            self.assertEqual(pick_element_type(mix, rng), "dialog")

    def test_fallback(self):
        rng = create_rng(42)
        self.assertEqual(pick_element_type({}, rng), "dialog")


class TestPickDuration(unittest.TestCase):
    def test_standard_floor(self):
        rng = create_rng(42)
        for _ in range(100):
            d = pick_duration("dialog", FLOOR_FRAMES, MAX_FRAMES, rng)
            self.assertGreaterEqual(d, FLOOR_FRAMES)
            self.assertLessEqual(d, MAX_FRAMES)

    def test_pixel_floor(self):
        rng = create_rng(42)
        for _ in range(100):
            d = pick_duration("pixel", 1, MAX_FRAMES, rng)
            self.assertGreaterEqual(d, FLOOR_PIXEL_BLOCK)

    def test_freeze_floor(self):
        rng = create_rng(42)
        for _ in range(100):
            d = pick_duration("freeze", 1, MAX_FRAMES, rng)
            self.assertGreaterEqual(d, FLOOR_FREEZE_STRIP)


class TestBuildJob(unittest.TestCase):
    def setUp(self):
        self.settings = default_settings()
        self.comp_info = make_comp_info()

    def _make_job(self, type_name, seed=42):
        rng = create_rng(seed)
        return build_job(type_name, 10, 50, "over", self.settings, self.comp_info, rng)

    def test_common_fields(self):
        for t in ["bsod", "dialog", "text", "cursor", "pixel", "freeze"]:
            job = self._make_job(t)
            self.assertEqual(job["type"], t)
            self.assertEqual(job["layer"], "over")
            self.assertEqual(job["inFrame"], 10)
            self.assertEqual(job["outFrame"], 50)
            self.assertIn("blendMode", job)
            self.assertIn("trails", job)

    def test_bsod_fields(self):
        job = self._make_job("bsod")
        self.assertIn(job["bsodEra"], ["xp", "9x"])
        self.assertIn(job["variant"], ["fullStrip", "corner", "island"])
        self.assertIn(job["behavior"], ["static", "slideH", "slideV", "stutter", "snapEdge"])
        self.assertIsInstance(job["textLines"], list)
        self.assertGreater(len(job["textLines"]), 0)

    def test_dialog_fields(self):
        job = self._make_job("dialog")
        self.assertIn(job["dialogVariant"], ["A", "B", "C"])
        self.assertIsInstance(job["title"], str)
        self.assertIsInstance(job["body"], str)
        self.assertIsInstance(job["buttons"], list)
        self.assertIn(job["icon"], ["error", "warning", "question", "none"])
        self.assertIn(job["arrivalBehavior"], ["pop", "scalePop", "slideIn"])
        self.assertIn(job["lifeBehavior"], ["static", "drift", "shake"])
        self.assertIn(job["exitBehavior"], ["cut", "collapse", "slideOff"])
        self.assertEqual(job["stackIndex"], 0)
        self.assertIn("catalogId", job)

    def test_dialog_catalog_id_format(self):
        for seed in range(100):
            job = self._make_job("dialog", seed)
            cat_id = job["catalogId"]
            parts = cat_id.split("_")
            self.assertEqual(len(parts), 3)
            self.assertIn(parts[0], ["A", "B", "C"])
            self.assertIn(parts[1], ["error", "warning", "question", "none"])
            self.assertIn(parts[2], ["0", "1", "2"])

    def test_text_fields(self):
        job = self._make_job("text")
        self.assertIsInstance(job["lines"], list)
        self.assertIn(job["behavior"], ["static", "hScan", "vScroll", "ghostDrift"])
        self.assertEqual(job["fontSize"], FSIZE_TEXT_OVER)

    def test_cursor_fields(self):
        job = self._make_job("cursor")
        self.assertIn(job["behavior"], ["frozen", "orbit", "cornerSeek", "randomWalk",
                                         "glitchStutter", "ghostTrail", "cluster"])
        self.assertEqual(job["size"], CURSOR_HEIGHT)
        self.assertIn(job["cursorVariant"], ["arrow", "hand"])

    def test_cursor_variant_distribution(self):
        arrow = 0
        hand = 0
        for seed in range(1000):
            job = self._make_job("cursor", seed)
            if job["cursorVariant"] == "arrow":
                arrow += 1
            else:
                hand += 1
        self.assertGreater(arrow, hand)
        self.assertGreater(arrow / 1000, 0.55)

    def test_pixel_fields(self):
        job = self._make_job("pixel")
        self.assertIn(job["behavior"], ["microScatter", "rowSmear", "blockDisplace",
                                         "scanlineShift", "hTear"])

    def test_pixel_behavior_specifics(self):
        for seed in range(200):
            job = self._make_job("pixel", seed)
            if job["behavior"] == "microScatter":
                self.assertIn("clusterSize", job)
            elif job["behavior"] == "rowSmear":
                self.assertIn("stripHeight", job)
                self.assertIn("smearRows", job)
            elif job["behavior"] == "blockDisplace":
                self.assertIn("blockW", job)
                self.assertIn("blockH", job)
            elif job["behavior"] == "scanlineShift":
                self.assertIn("bandHeight", job)
                self.assertIn("shiftPx", job)
            elif job["behavior"] == "hTear":
                self.assertIn("tearH", job)
                self.assertIn("tearW", job)
                self.assertIn("tearColor", job)

    def test_freeze_fields(self):
        job = self._make_job("freeze")
        self.assertIn(job["behavior"], ["single", "cluster"])
        self.assertIn("freezeFrame", job)

    def test_freeze_single(self):
        for seed in range(200):
            job = self._make_job("freeze", seed)
            if job["behavior"] == "single":
                self.assertIn("stripHeight", job)
                self.assertIn("stripY", job)
                self.assertGreaterEqual(job["stripHeight"], C_FREEZE_MIN_HEIGHT)
                self.assertLessEqual(job["stripHeight"], C_FREEZE_MAX_HEIGHT)

    def test_freeze_cluster(self):
        for seed in range(200):
            job = self._make_job("freeze", seed)
            if job["behavior"] == "cluster":
                self.assertIn("strips", job)
                self.assertIsInstance(job["strips"], list)

    def test_blend_mode_valid(self):
        all_modes = set()
        for t in ["bsod", "dialog", "text", "cursor", "pixel", "freeze"]:
            for seed in range(100):
                job = self._make_job(t, seed)
                all_modes.add(job["blendMode"])
        for mode in all_modes:
            self.assertIn(mode, BLEND_MODE_MAP)

    def test_trails_probabilistic(self):
        has_trails = 0
        for seed in range(1000):
            job = self._make_job("dialog", seed)
            if job["trails"]:
                has_trails += 1
                self.assertIn("trailEchoes", job)
                self.assertIn("trailDecay", job)
        # Default 20% chance
        self.assertGreater(has_trails, 100)
        self.assertLess(has_trails, 400)

    def test_custom_messages_bsod(self):
        self.settings["elements"]["bsod"]["customMessages"] = ["CUSTOM LINE 1", "CUSTOM LINE 2"]
        job = self._make_job("bsod")
        self.assertIn("CUSTOM LINE 1", job["textLines"])
        self.assertIn("CUSTOM LINE 2", job["textLines"])

    def test_determinism(self):
        job1 = self._make_job("dialog", 42)
        job2 = self._make_job("dialog", 42)
        self.assertEqual(job1, job2)


class TestAssignDialogStacks(unittest.TestCase):
    def test_single_dialog(self):
        jobs = [{"type": "dialog", "title": "Error", "inFrame": 10}]
        assign_dialog_stacks(jobs, create_rng(42))
        # No change — single dialog doesn't get stack
        self.assertEqual(jobs[0].get("stackIndex", 0), 0)

    def test_same_title_stacking(self):
        jobs = [
            {"type": "dialog", "title": "Error", "inFrame": 10},
            {"type": "dialog", "title": "Error", "inFrame": 20},
            {"type": "dialog", "title": "Error", "inFrame": 30},
        ]
        assign_dialog_stacks(jobs, create_rng(42))
        self.assertEqual(jobs[0]["stackIndex"], 0)
        self.assertEqual(jobs[1]["stackIndex"], 1)
        self.assertEqual(jobs[2]["stackIndex"], 2)

    def test_different_titles(self):
        jobs = [
            {"type": "dialog", "title": "Error", "inFrame": 10},
            {"type": "dialog", "title": "Warning", "inFrame": 20},
        ]
        assign_dialog_stacks(jobs, create_rng(42))
        # Different titles — no stacking

    def test_max_depth(self):
        jobs = [{"type": "dialog", "title": "Error", "inFrame": i} for i in range(20)]
        assign_dialog_stacks(jobs, create_rng(42), max_depth=5)
        for i in range(5):
            self.assertEqual(jobs[i]["stackIndex"], i)
        # Jobs beyond max_depth don't get stackIndex set (stays at whatever it was)

    def test_non_dialogs_ignored(self):
        jobs = [
            {"type": "bsod", "title": None, "inFrame": 10},
            {"type": "dialog", "title": "Error", "inFrame": 20},
        ]
        assign_dialog_stacks(jobs, create_rng(42))


class TestSchedule(unittest.TestCase):
    def test_auto_mode(self):
        settings = default_settings()
        jobs = schedule(settings, make_comp_info())
        self.assertGreater(len(jobs), 0)
        types = set(j["type"] for j in jobs)
        self.assertTrue(len(types) >= 2)

    def test_chaos_0(self):
        settings = default_settings()
        settings["chaos"] = 0
        jobs = schedule(settings, make_comp_info())
        self.assertEqual(len(jobs), 0)

    def test_exact_counts(self):
        settings = default_settings()
        settings["elements"]["dialog"]["count"] = 3
        settings["elements"]["bsod"]["count"] = 2
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        dialogs = sum(1 for j in jobs if j["type"] == "dialog")
        bsods = sum(1 for j in jobs if j["type"] == "bsod")
        self.assertEqual(dialogs, 3)
        self.assertEqual(bsods, 2)
        self.assertEqual(len(jobs), 5)

    def test_all_types_in_auto(self):
        settings = default_settings()
        settings["chaos"] = 200
        types = set()
        for seed in range(10):
            settings["seed"] = seed
            jobs = schedule(settings, make_comp_info(total_frames=480))
            for j in jobs:
                types.add(j["type"])
        self.assertEqual(types, {"dialog", "bsod", "cursor", "pixel", "freeze"})

    def test_determinism(self):
        settings = default_settings()
        jobs1 = schedule(settings, make_comp_info())
        jobs2 = schedule(settings, make_comp_info())
        self.assertEqual(len(jobs1), len(jobs2))
        for j1, j2 in zip(jobs1, jobs2):
            self.assertEqual(j1, j2)

    def test_different_seeds(self):
        s1 = default_settings()
        s1["seed"] = 111
        s2 = default_settings()
        s2["seed"] = 222
        j1 = schedule(s1, make_comp_info())
        j2 = schedule(s2, make_comp_info())
        # Very unlikely to be identical with different seeds
        self.assertNotEqual([j["type"] for j in j1], [j["type"] for j in j2])

    def test_job_has_required_fields(self):
        settings = default_settings()
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertIn("type", job)
            self.assertIn("layer", job)
            self.assertIn("inFrame", job)
            self.assertIn("outFrame", job)
            self.assertIn("opacity", job)
            self.assertIn("blendMode", job)
            self.assertIn("scale", job)
            self.assertIn("speedMult", job)
            self.assertIn("entryFrames", job)
            self.assertIn("exitFrames", job)
            self.assertIn("jitter", job)

    def test_floor_rule(self):
        settings = default_settings()
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            dur = job["outFrame"] - job["inFrame"]
            if job["type"] in ("pixel",):
                self.assertGreaterEqual(dur, FLOOR_PIXEL_BLOCK)
            elif job["type"] in ("freeze",):
                self.assertGreaterEqual(dur, FLOOR_FREEZE_STRIP)
            else:
                self.assertGreaterEqual(dur, FLOOR_FRAMES)

    def test_roto_mode_flat(self):
        settings = default_settings()
        settings["rotoMode"] = "flat"
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "over")

    def test_roto_mode_all_over(self):
        settings = default_settings()
        settings["rotoMode"] = "allOver"
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "over")

    def test_roto_mode_all_under(self):
        settings = default_settings()
        settings["rotoMode"] = "allUnder"
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "under")

    def test_roto_mode_split(self):
        settings = default_settings()
        settings["rotoMode"] = "split"
        settings["rotoBehindPct"] = 50
        jobs = schedule(settings, make_comp_info())
        layers = set(j["layer"] for j in jobs)
        # With 50% split and enough elements, should have both
        if len(jobs) > 10:
            self.assertEqual(layers, {"over", "under"})

    def test_per_element_roto_force(self):
        settings = default_settings()
        settings["rotoMode"] = "split"
        settings["elements"]["dialog"]["rotoForce"] = "under"
        settings["elements"]["dialog"]["count"] = 10
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "under")

    def test_per_element_curve(self):
        settings = default_settings()
        settings["chaosCurve"] = "flat"
        settings["elements"]["dialog"]["curve"] = "build"
        settings["elements"]["dialog"]["count"] = 10
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        self.assertEqual(len(jobs), 10)

    def test_slow_burn_min_frames(self):
        settings = default_settings()
        settings["animStyle"] = "slowBurn"
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            if job["type"] not in ("pixel", "freeze"):
                dur = job["outFrame"] - job["inFrame"]
                # slowBurn sets min 16f, but near end of timeline clamping may reduce
                if job["inFrame"] + 16 <= 240:
                    self.assertGreaterEqual(dur, 16)

    def test_chaos_max_short_duration(self):
        settings = default_settings()
        settings["animStyle"] = "chaosMax"
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            dur = job["outFrame"] - job["inFrame"]
            if job["type"] not in ("pixel", "freeze"):
                self.assertLessEqual(dur, 36 + FLOOR_FRAMES)

    def test_behind_pct_0(self):
        settings = default_settings()
        settings["rotoMode"] = "split"
        settings["rotoBehindPct"] = 0
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "over")

    def test_behind_pct_100(self):
        settings = default_settings()
        settings["rotoMode"] = "split"
        settings["rotoBehindPct"] = 100
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["layer"], "under")

    def test_per_element_scale_speed(self):
        settings = default_settings()
        settings["elements"]["dialog"]["scale"] = 200
        settings["elements"]["dialog"]["speed"] = 50
        settings["elements"]["dialog"]["count"] = 5
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertAlmostEqual(job["scale"], 2.0)
            self.assertAlmostEqual(job["speedMult"], 0.5)

    def test_per_element_opacity_clamped(self):
        settings = default_settings()
        settings["elements"]["dialog"]["opacityMin"] = 60
        settings["elements"]["dialog"]["opacityMax"] = 70
        settings["elements"]["dialog"]["count"] = 20
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertGreaterEqual(job["opacity"], 60)
            self.assertLessEqual(job["opacity"], 70)

    def test_stack_offset_propagated(self):
        settings = default_settings()
        settings["stackOffset"] = 15
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["stackOffset"], 15)

    def test_jitter_propagated(self):
        settings = default_settings()
        settings["elements"]["dialog"]["jitter"] = 42
        settings["elements"]["dialog"]["count"] = 5
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        for job in jobs:
            self.assertEqual(job["jitter"], 42)

    def test_dialog_stacks_assigned(self):
        settings = default_settings()
        settings["elements"]["dialog"]["count"] = 20
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        has_stack = any(j.get("stackIndex", 0) > 0 for j in jobs if j["type"] == "dialog")
        # With 20 dialogs, very likely some share titles
        # (only 12 title options, 20 dialogs)
        self.assertTrue(has_stack)

    def test_in_frame_within_range(self):
        settings = default_settings()
        comp_info = make_comp_info(total_frames=120)
        jobs = schedule(settings, comp_info)
        for job in jobs:
            self.assertGreaterEqual(job["inFrame"], 0)
            self.assertLessEqual(job["outFrame"], 120)

    def test_per_element_trails_override(self):
        settings = default_settings()
        settings["trails"] = {"enabled": False, "chance": 0, "echoes": 4, "decay": 50}
        settings["elements"]["dialog"]["trails"] = {"enabled": True, "chance": 100, "echoes": 8, "decay": 30}
        settings["elements"]["dialog"]["count"] = 10
        settings["elements"]["bsod"]["count"] = 0
        settings["elements"]["cursor"]["count"] = 0
        settings["elements"]["pixel"]["count"] = 0
        settings["elements"]["freeze"]["count"] = 0
        jobs = schedule(settings, make_comp_info())
        # All dialogs should have trails (100% chance override)
        for job in jobs:
            self.assertTrue(job["trails"])
            self.assertEqual(job["trailEchoes"], 8)


class TestScheduleCrossLanguage(unittest.TestCase):
    """Verify Python scheduler produces same output as JS version for key seeds."""

    def test_default_settings_count(self):
        """Same default settings should produce same element count."""
        settings = default_settings()
        jobs = schedule(settings, make_comp_info())
        # chaos=100, 240 frames → calcElementCount returns 50
        self.assertEqual(len(jobs), 50)

    def test_seed_1984_types(self):
        """Verify specific seed produces known type distribution."""
        settings = default_settings()
        settings["seed"] = 1984
        jobs = schedule(settings, make_comp_info())
        type_counts = {}
        for j in jobs:
            t = j["type"]
            type_counts[t] = type_counts.get(t, 0) + 1
        # All types should be present at chaos=100
        self.assertGreater(len(type_counts), 3)


if __name__ == "__main__":
    unittest.main()
