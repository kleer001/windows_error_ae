"""Deterministic PRNG (mulberry32) — identical output to the AE version."""

import math


def _imul(a, b):
    """32-bit integer multiply matching JS Math.imul."""
    a = a & 0xFFFFFFFF
    b = b & 0xFFFFFFFF
    ah = (a >> 16) & 0xFFFF
    al = a & 0xFFFF
    bh = (b >> 16) & 0xFFFF
    bl = b & 0xFFFF
    return ((al * bl) + (((ah * bl + al * bh) << 16) & 0xFFFFFFFF)) & 0xFFFFFFFF


def create_rng(seed):
    """Create a seeded deterministic PRNG (mulberry32).

    Returns a callable that produces float in [0.0, 1.0) on each call.
    """
    state = [seed & 0xFFFFFFFF]

    def rng():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = _imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rng


def rng_int(rng, min_val, max_val):
    """Random integer in [min_val, max_val] inclusive."""
    return int(math.floor(rng() * (max_val - min_val + 1))) + min_val


def rng_pick(rng, arr):
    """Random item from a list."""
    return arr[int(math.floor(rng() * len(arr)))]


def rng_bool(rng, probability):
    """Returns True with given probability (0.0-1.0)."""
    return rng() < probability


def rng_float(rng, min_val, max_val):
    """Random float in [min_val, max_val)."""
    return rng() * (max_val - min_val) + min_val
