"""Tests for PRNG — port of tests/test_prng.js"""

import sys
import os
import math
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.prng import create_rng, rng_int, rng_pick, rng_bool, rng_float


class TestCreateRNG(unittest.TestCase):

    def test_returns_callable(self):
        rng = create_rng(42)
        self.assertTrue(callable(rng))

    def test_determinism(self):
        rng1 = create_rng(12345)
        rng2 = create_rng(12345)
        seq1 = [rng1() for _ in range(20)]
        seq2 = [rng2() for _ in range(20)]
        self.assertEqual(seq1, seq2)

    def test_different_seeds(self):
        rng1 = create_rng(11111)
        rng2 = create_rng(22222)
        diff = False
        for _ in range(20):
            if rng1() != rng2():
                diff = True
                break
        self.assertTrue(diff)

    def test_range_0_to_1(self):
        rng = create_rng(99999)
        for _ in range(10000):
            v = rng()
            self.assertGreaterEqual(v, 0.0)
            self.assertLess(v, 1.0)

    def test_uniform_distribution(self):
        rng = create_rng(7777)
        buckets = [0] * 10
        N = 100000
        for _ in range(N):
            b = min(int(rng() * 10), 9)
            buckets[b] += 1
        expected = N / 10
        max_dev = max(abs(b - expected) / expected for b in buckets)
        self.assertLess(max_dev, 0.05)

    def test_seed_0(self):
        rng = create_rng(0)
        v = rng()
        self.assertIsInstance(v, float)
        self.assertGreaterEqual(v, 0.0)
        self.assertLess(v, 1.0)

    def test_large_seed(self):
        rng = create_rng(2147483647)
        v = rng()
        self.assertIsInstance(v, float)
        self.assertGreaterEqual(v, 0.0)
        self.assertLess(v, 1.0)

    def test_negative_seed(self):
        rng = create_rng(-42)
        v = rng()
        self.assertIsInstance(v, float)
        self.assertGreaterEqual(v, 0.0)
        self.assertLess(v, 1.0)


class TestRngInt(unittest.TestCase):

    def test_range(self):
        rng = create_rng(555)
        for _ in range(1000):
            v = rng_int(rng, 5, 15)
            self.assertGreaterEqual(v, 5)
            self.assertLessEqual(v, 15)
            self.assertEqual(v, int(v))

    def test_full_coverage(self):
        rng = create_rng(666)
        seen = set()
        for _ in range(10000):
            seen.add(rng_int(rng, 0, 4))
        self.assertEqual(seen, {0, 1, 2, 3, 4})


class TestRngPick(unittest.TestCase):

    def test_from_array(self):
        rng = create_rng(888)
        arr = ["a", "b", "c", "d"]
        for _ in range(100):
            v = rng_pick(rng, arr)
            self.assertIn(v, arr)


class TestRngBool(unittest.TestCase):

    def test_probability(self):
        rng = create_rng(111)
        true_count = 0
        N = 10000
        for _ in range(N):
            if rng_bool(rng, 0.3):
                true_count += 1
        rate = true_count / N
        self.assertAlmostEqual(rate, 0.3, delta=0.03)


class TestRngFloat(unittest.TestCase):

    def test_range(self):
        rng = create_rng(222)
        for _ in range(1000):
            v = rng_float(rng, 2.5, 7.5)
            self.assertGreaterEqual(v, 2.5)
            self.assertLess(v, 7.5)


if __name__ == "__main__":
    unittest.main()
