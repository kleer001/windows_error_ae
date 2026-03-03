// test_prng.js — Tests for PRNG (Section 2)

var ctx = require("./test_harness");
var passed = 0;
var failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error("  FAIL: " + msg);
    }
}

function assertClose(actual, expected, tolerance, msg) {
    assert(Math.abs(actual - expected) < tolerance,
        msg + " (expected ~" + expected + ", got " + actual + ")");
}

console.log("=== PRNG Tests ===");

// Test 1: createRNG returns a function
var rng = ctx.createRNG(42);
assert(typeof rng === "function", "createRNG returns a function");

// Test 2: Determinism — same seed produces same sequence
var rng1 = ctx.createRNG(12345);
var rng2 = ctx.createRNG(12345);
var seq1 = [];
var seq2 = [];
for (var i = 0; i < 20; i++) {
    seq1.push(rng1());
    seq2.push(rng2());
}
var seqMatch = true;
for (var i = 0; i < 20; i++) {
    if (seq1[i] !== seq2[i]) { seqMatch = false; break; }
}
assert(seqMatch, "Same seed produces identical sequence");

// Test 3: Different seeds produce different sequences
var rng3 = ctx.createRNG(11111);
var rng4 = ctx.createRNG(22222);
var diffFound = false;
for (var i = 0; i < 20; i++) {
    if (rng3() !== rng4()) { diffFound = true; break; }
}
assert(diffFound, "Different seeds produce different sequences");

// Test 4: Values are in [0, 1)
var rngRange = ctx.createRNG(99999);
var allInRange = true;
for (var i = 0; i < 10000; i++) {
    var v = rngRange();
    if (v < 0 || v >= 1) { allInRange = false; break; }
}
assert(allInRange, "All values in [0, 1) range");

// Test 5: Distribution is roughly uniform (chi-squared-lite)
var rngDist = ctx.createRNG(7777);
var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var N = 100000;
for (var i = 0; i < N; i++) {
    var b = Math.floor(rngDist() * 10);
    if (b >= 10) b = 9;
    buckets[b]++;
}
var expected = N / 10;
var maxDeviation = 0;
for (var i = 0; i < 10; i++) {
    var dev = Math.abs(buckets[i] - expected) / expected;
    if (dev > maxDeviation) maxDeviation = dev;
}
assert(maxDeviation < 0.05, "Uniform distribution (max bucket deviation < 5%): " + (maxDeviation * 100).toFixed(2) + "%");

// Test 6: rngInt basic
var rngI = ctx.createRNG(555);
var allInIntRange = true;
for (var i = 0; i < 1000; i++) {
    var v = ctx.rngInt(rngI, 5, 15);
    if (v < 5 || v > 15 || v !== Math.floor(v)) { allInIntRange = false; break; }
}
assert(allInIntRange, "rngInt returns integers in [min, max]");

// Test 7: rngInt covers the full range
var rngI2 = ctx.createRNG(666);
var seen = {};
for (var i = 0; i < 10000; i++) {
    seen[ctx.rngInt(rngI2, 0, 4)] = true;
}
assert(seen[0] && seen[1] && seen[2] && seen[3] && seen[4],
    "rngInt(0,4) covers all 5 values");

// Test 8: rngPick returns items from array
var rngP = ctx.createRNG(888);
var arr = ["a", "b", "c", "d"];
var allFromArr = true;
for (var i = 0; i < 100; i++) {
    var v = ctx.rngPick(rngP, arr);
    if (arr.indexOf(v) === -1) { allFromArr = false; break; }
}
assert(allFromArr, "rngPick returns items from the array");

// Test 9: rngBool respects probability
var rngB = ctx.createRNG(111);
var trueCount = 0;
var bN = 10000;
for (var i = 0; i < bN; i++) {
    if (ctx.rngBool(rngB, 0.3)) trueCount++;
}
var trueRate = trueCount / bN;
assert(Math.abs(trueRate - 0.3) < 0.03,
    "rngBool(0.3) produces ~30% true: " + (trueRate * 100).toFixed(1) + "%");

// Test 10: rngFloat range
var rngF = ctx.createRNG(222);
var allFloatInRange = true;
for (var i = 0; i < 1000; i++) {
    var v = ctx.rngFloat(rngF, 2.5, 7.5);
    if (v < 2.5 || v >= 7.5) { allFloatInRange = false; break; }
}
assert(allFloatInRange, "rngFloat returns values in [min, max)");

// Test 11: Seed 0 works
var rng0 = ctx.createRNG(0);
var v0 = rng0();
assert(typeof v0 === "number" && v0 >= 0 && v0 < 1, "Seed 0 produces valid output");

// Test 12: Large seed works
var rngBig = ctx.createRNG(2147483647);
var vBig = rngBig();
assert(typeof vBig === "number" && vBig >= 0 && vBig < 1, "Large seed produces valid output");

// Test 13: Negative seed handled
var rngNeg = ctx.createRNG(-42);
var vNeg = rngNeg();
assert(typeof vNeg === "number" && vNeg >= 0 && vNeg < 1, "Negative seed produces valid output");

console.log("PRNG: " + passed + " passed, " + failed + " failed");
module.exports = { passed: passed, failed: failed };
