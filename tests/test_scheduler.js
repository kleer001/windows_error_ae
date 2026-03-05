// test_scheduler.js — Tests for Scheduler (Section 6)

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

console.log("=== Scheduler Tests ===");

// ── calcElementCount ──────────────────────────────────

assert(ctx.calcElementCount(0, 240) === 0, "calcElementCount: chaos 0 = 0 elements");
assert(ctx.calcElementCount(100, 240) === 50, "calcElementCount: chaos 100, 240f = 50");

var c10 = ctx.calcElementCount(10, 240);
var c50 = ctx.calcElementCount(50, 240);
var c100 = ctx.calcElementCount(100, 240);
assert(c10 < c50, "calcElementCount: chaos 10 < chaos 50 (" + c10 + " < " + c50 + ")");
assert(c50 < c100, "calcElementCount: chaos 50 < chaos 100 (" + c50 + " < " + c100 + ")");
assert(c10 >= 1, "calcElementCount: chaos 10 yields at least 1");

// Duration scaling
var c50_240 = ctx.calcElementCount(50, 240);
var c50_480 = ctx.calcElementCount(50, 480);
assert(c50_480 > c50_240, "calcElementCount: longer comp = more elements");
assert(Math.abs(c50_480 / c50_240 - 2) < 0.5,
    "calcElementCount: 2x duration ≈ 2x elements (ratio: " + (c50_480 / c50_240).toFixed(2) + ")");


// ── distributeTimes ──────────────────────────────────

// Basic: correct count
var rng1 = ctx.createRNG(42);
var times1 = ctx.distributeTimes(20, 240, "flat", rng1);
assert(times1.length === 20, "distributeTimes: returns correct count (20)");

// Sorted
var sorted = true;
for (var i = 1; i < times1.length; i++) {
    if (times1[i] < times1[i - 1]) { sorted = false; break; }
}
assert(sorted, "distributeTimes: output is sorted ascending");

// All in valid range
var allValid = true;
for (var i = 0; i < times1.length; i++) {
    if (times1[i] < 0 || times1[i] > 239) { allValid = false; break; }
}
assert(allValid, "distributeTimes: all frames in [0, totalFrames-1]");

// Determinism
var rng2a = ctx.createRNG(77);
var rng2b = ctx.createRNG(77);
var t2a = ctx.distributeTimes(15, 240, "flat", rng2a);
var t2b = ctx.distributeTimes(15, 240, "flat", rng2b);
var match = true;
for (var i = 0; i < t2a.length; i++) {
    if (t2a[i] !== t2b[i]) { match = false; break; }
}
assert(match, "distributeTimes: deterministic with same seed");

// Curve: "build" should cluster more toward the end
var rngBuild = ctx.createRNG(42);
var buildTimes = ctx.distributeTimes(100, 1000, "build", rngBuild);
var firstHalf = 0, secondHalf = 0;
for (var i = 0; i < buildTimes.length; i++) {
    if (buildTimes[i] < 500) firstHalf++;
    else secondHalf++;
}
assert(secondHalf > firstHalf,
    "distributeTimes 'build': more elements in second half (" + secondHalf + " vs " + firstHalf + ")");

// Curve: "peak" should cluster in the middle
var rngPeak = ctx.createRNG(42);
var peakTimes = ctx.distributeTimes(100, 1000, "peak", rngPeak);
var middle = 0, edges = 0;
for (var i = 0; i < peakTimes.length; i++) {
    if (peakTimes[i] >= 250 && peakTimes[i] <= 750) middle++;
    else edges++;
}
assert(middle > edges,
    "distributeTimes 'peak': more elements in middle (" + middle + " vs " + edges + ")");

// Curve: "burst" produces clustered output
var rngBurst = ctx.createRNG(42);
var burstTimes = ctx.distributeTimes(50, 1000, "burst", rngBurst);
assert(burstTimes.length === 50, "distributeTimes 'burst': correct count");
// Check that elements cluster (standard deviation should be lower than flat)
var mean = 0;
for (var i = 0; i < burstTimes.length; i++) mean += burstTimes[i];
mean /= burstTimes.length;
var variance = 0;
for (var i = 0; i < burstTimes.length; i++) {
    var diff = burstTimes[i] - mean;
    variance += diff * diff;
}
variance /= burstTimes.length;
var burstStd = Math.sqrt(variance);
// Compare to flat distribution std
var rngFlat = ctx.createRNG(42);
var flatTimes = ctx.distributeTimes(50, 1000, "flat", rngFlat);
var fMean = 0;
for (var i = 0; i < flatTimes.length; i++) fMean += flatTimes[i];
fMean /= flatTimes.length;
var fVariance = 0;
for (var i = 0; i < flatTimes.length; i++) {
    var diff = flatTimes[i] - fMean;
    fVariance += diff * diff;
}
fVariance /= flatTimes.length;
var flatStd = Math.sqrt(fVariance);
assert(burstStd < flatStd,
    "distributeTimes 'burst': tighter clustering than flat (std: " +
    burstStd.toFixed(1) + " vs " + flatStd.toFixed(1) + ")");

// Count 0 returns empty
var rng0 = ctx.createRNG(42);
assert(ctx.distributeTimes(0, 240, "flat", rng0).length === 0,
    "distributeTimes: count 0 returns empty array");


// ── pickElementType ──────────────────────────────────

var mix = { dialog: 75, bsod: 50, cursor: 50, pixel: 25 };
var rngMix = ctx.createRNG(42);
var typeCounts = { dialog: 0, bsod: 0, cursor: 0, pixel: 0 };
for (var i = 0; i < 10000; i++) {
    var t = ctx.pickElementType(mix, rngMix);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
}
assert(typeCounts.dialog > typeCounts.pixel,
    "pickElementType: dialog (wt 75) more frequent than pixel (wt 25)");
assert(typeCounts.dialog > 0 && typeCounts.bsod > 0 &&
       typeCounts.cursor > 0 && typeCounts.pixel > 0,
    "pickElementType: all types produced");

// Disabled type should produce 0
var mixDisabled = { dialog: 100, bsod: 0, cursor: 0, pixel: 0 };
var rngD = ctx.createRNG(42);
var onlyDialog = true;
for (var i = 0; i < 1000; i++) {
    if (ctx.pickElementType(mixDisabled, rngD) !== "dialog") { onlyDialog = false; break; }
}
assert(onlyDialog, "pickElementType: 0% types are never picked");


// ── pickDuration ──────────────────────────────────────

var rngDur = ctx.createRNG(42);
for (var i = 0; i < 100; i++) {
    var d = ctx.pickDuration("dialog", 8, 96, rngDur);
    assert(d >= 8 && d <= 96, "pickDuration dialog in [8,96]: got " + d);
}

// Pixel block floor exception
var rngPx = ctx.createRNG(42);
var pixelDurs = [];
for (var i = 0; i < 100; i++) {
    pixelDurs.push(ctx.pickDuration("pixel", 2, 16, rngPx));
}
var minPixel = Math.min.apply(null, pixelDurs);
assert(minPixel >= 2, "pickDuration pixel: min >= 2 (got " + minPixel + ")");

// Non-pixel types respect FLOOR_FRAMES
var rngNP = ctx.createRNG(42);
for (var i = 0; i < 100; i++) {
    var d = ctx.pickDuration("bsod", 4, 96, rngNP); // user set min=4, but floor is 8
    assert(d >= 8, "pickDuration bsod respects FLOOR_FRAMES=8 even when minFrames=4: got " + d);
}


// ── assignLayer ──────────────────────────────────────

// Flat mode: always "over"
var rngL = ctx.createRNG(42);
for (var i = 0; i < 100; i++) {
    assert(ctx.assignLayer("dialog", "flat", rngL) === "over",
        "assignLayer flat mode always returns 'over'");
}

// AllOver mode
for (var i = 0; i < 100; i++) {
    assert(ctx.assignLayer("bsod", "allOver", rngL) === "over",
        "assignLayer allOver always returns 'over'");
}

// AllUnder mode
for (var i = 0; i < 100; i++) {
    assert(ctx.assignLayer("dialog", "allUnder", rngL) === "under",
        "assignLayer allUnder always returns 'under'");
}

// Split mode: BSOD is mostly under
var rngSB = ctx.createRNG(42);
var bsodUnder = 0;
for (var i = 0; i < 1000; i++) {
    if (ctx.assignLayer("bsod", "split", rngSB) === "under") bsodUnder++;
}
assert(bsodUnder > 600,
    "assignLayer split: BSOD mostly under (80% expected, got " + (bsodUnder / 10).toFixed(1) + "%)");

// Split mode: cursor mostly over
var rngSC = ctx.createRNG(42);
var cursorOver = 0;
for (var i = 0; i < 1000; i++) {
    if (ctx.assignLayer("cursor", "split", rngSC) === "over") cursorOver++;
}
assert(cursorOver > 700,
    "assignLayer split: cursor mostly over (90% expected, got " + (cursorOver / 10).toFixed(1) + "%)");


// ── buildJob ──────────────────────────────────────────

var compInfo = {
    duration: 10,
    frameRate: 24,
    width: 1920,
    height: 1080,
    totalFrames: 240
};
var settings = ctx.defaultSettings();

var rngJ = ctx.createRNG(42);
var dialogJob = ctx.buildJob("dialog", 10, 50, "over", settings, compInfo, rngJ);
assert(dialogJob.type === "dialog",
    "buildJob dialog returns dialog type");
assert(dialogJob.inFrame === 10, "buildJob sets inFrame correctly");
assert(dialogJob.outFrame === 50, "buildJob sets outFrame correctly");
assert(typeof dialogJob.x === "number", "buildJob sets x position");
assert(typeof dialogJob.y === "number", "buildJob sets y position");
assert(typeof dialogJob.title === "string", "buildJob dialog has title");
assert(typeof dialogJob.body === "string", "buildJob dialog has body");
assert(Array.isArray(dialogJob.buttons), "buildJob dialog has buttons array");

var rngJ2 = ctx.createRNG(42);
var bsodJob = ctx.buildJob("bsod", 0, 100, "under", settings, compInfo, rngJ2);
assert(bsodJob.type === "bsod", "buildJob bsod type is correct");
assert(Array.isArray(bsodJob.textLines), "buildJob bsod has textLines");
assert(typeof bsodJob.behavior === "string", "buildJob bsod has behavior");
assert(typeof bsodJob.variant === "string", "buildJob bsod has variant");

var rngJ3 = ctx.createRNG(42);
var cursorJob = ctx.buildJob("cursor", 20, 60, "over", settings, compInfo, rngJ3);
assert(cursorJob.type === "cursor", "buildJob cursor type is correct");
assert(typeof cursorJob.behavior === "string", "buildJob cursor has behavior");

var rngJ5 = ctx.createRNG(42);
var pixelJob = ctx.buildJob("pixel", 0, 10, "over", settings, compInfo, rngJ5);
assert(pixelJob.type === "pixel", "buildJob pixel type is correct");
assert(typeof pixelJob.behavior === "string", "buildJob pixel has behavior");

// ── Pixel corruption sub-variant tests ───────────────

// All 5 new behaviors appear across many pixel jobs
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.chaos = 0;
    s.elements.pixel = ctx.defaultElementSettings();
    s.elements.pixel.count = 200;
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 0;
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 0;
    s.elements.cursor = ctx.defaultElementSettings();
    s.elements.cursor.count = 0;
    var jobs = ctx.schedule(s, ci);
    var behaviorCounts = {};
    for (var i = 0; i < jobs.length; i++) {
        var b = jobs[i].behavior;
        behaviorCounts[b] = (behaviorCounts[b] || 0) + 1;
    }
    var validBehaviors = ["microScatter", "rowSmear", "blockDisplace", "scanlineShift", "hTear"];
    var allValid = true;
    for (var i = 0; i < jobs.length; i++) {
        var found = false;
        for (var vi = 0; vi < validBehaviors.length; vi++) {
            if (jobs[i].behavior === validBehaviors[vi]) { found = true; break; }
        }
        if (!found) { allValid = false; break; }
    }
    assert(allValid, "pixel behaviors: all jobs have one of 5 valid behaviors");
    // All 5 behaviors should appear with 200 jobs
    for (var vi = 0; vi < validBehaviors.length; vi++) {
        assert((behaviorCounts[validBehaviors[vi]] || 0) > 0,
            "pixel behaviors: " + validBehaviors[vi] + " appears (count=" +
            (behaviorCounts[validBehaviors[vi]] || 0) + ")");
    }
    // Old behaviors should never appear
    assert(!behaviorCounts["flash"], "pixel behaviors: no 'flash' (old)");
    assert(!behaviorCounts["stutterHold"], "pixel behaviors: no 'stutterHold' (old)");
    assert(!behaviorCounts["blockCrawl"], "pixel behaviors: no 'blockCrawl' (old)");
})();

// microScatter: clusterSize field validation
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    for (var seed = 1; seed <= 500; seed++) {
        var rng = ctx.createRNG(seed);
        var job = ctx.buildJob("pixel", 0, 100, "over", s, ci, rng);
        if (job.behavior === "microScatter") {
            assert(job.clusterSize >= 5 && job.clusterSize <= 15,
                "microScatter: clusterSize in [5,15] (got " + job.clusterSize + ")");
            assert(job.clusterSize === Math.round(job.clusterSize),
                "microScatter: clusterSize is integer");
            break;
        }
    }
})();

// rowSmear: field validation
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    for (var seed = 1; seed <= 500; seed++) {
        var rng = ctx.createRNG(seed);
        var job = ctx.buildJob("pixel", 0, 100, "over", s, ci, rng);
        if (job.behavior === "rowSmear") {
            assert(job.stripHeight >= 1 && job.stripHeight <= 5,
                "rowSmear: stripHeight in [1,5] (got " + job.stripHeight + ")");
            assert(job.smearRows >= 3 && job.smearRows <= 20,
                "rowSmear: smearRows in [3,20] (got " + job.smearRows + ")");
            break;
        }
    }
})();

// blockDisplace: field validation
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    for (var seed = 1; seed <= 500; seed++) {
        var rng = ctx.createRNG(seed);
        var job = ctx.buildJob("pixel", 0, 100, "over", s, ci, rng);
        if (job.behavior === "blockDisplace") {
            assert(job.blockW >= 20 && job.blockW <= 80,
                "blockDisplace: blockW in [20,80] (got " + job.blockW + ")");
            assert(job.blockH >= 10 && job.blockH <= 60,
                "blockDisplace: blockH in [10,60] (got " + job.blockH + ")");
            assert(job.offsetX >= -100 && job.offsetX <= 100,
                "blockDisplace: offsetX in [-100,100] (got " + job.offsetX + ")");
            assert(job.offsetY >= -100 && job.offsetY <= 100,
                "blockDisplace: offsetY in [-100,100] (got " + job.offsetY + ")");
            break;
        }
    }
})();

// scanlineShift: field validation
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    for (var seed = 1; seed <= 500; seed++) {
        var rng = ctx.createRNG(seed);
        var job = ctx.buildJob("pixel", 0, 100, "over", s, ci, rng);
        if (job.behavior === "scanlineShift") {
            assert(job.bandHeight >= 3 && job.bandHeight <= 15,
                "scanlineShift: bandHeight in [3,15] (got " + job.bandHeight + ")");
            assert((job.shiftPx >= 5 && job.shiftPx <= 30) || (job.shiftPx >= -30 && job.shiftPx <= -5),
                "scanlineShift: shiftPx in [5,30] or [-30,-5] (got " + job.shiftPx + ")");
            assert(job.bandCount >= 1 && job.bandCount <= 4,
                "scanlineShift: bandCount in [1,4] (got " + job.bandCount + ")");
            break;
        }
    }
})();

// hTear: field validation
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    for (var seed = 1; seed <= 500; seed++) {
        var rng = ctx.createRNG(seed);
        var job = ctx.buildJob("pixel", 0, 100, "over", s, ci, rng);
        if (job.behavior === "hTear") {
            assert(job.tearH >= 1 && job.tearH <= 2,
                "hTear: tearH in [1,2] (got " + job.tearH + ")");
            assert(job.tearW >= Math.round(ci.width / 2) && job.tearW <= ci.width,
                "hTear: tearW in [compW/2, compW] (got " + job.tearW + ")");
            assert(Array.isArray(job.tearColor) && job.tearColor.length === 3,
                "hTear: tearColor is [r,g,b] array");
            break;
        }
    }
})();

// Pixel determinism: same seed = same pixel jobs
(function() {
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var s = ctx.defaultSettings();
    s.seed = 123;
    s.chaos = 0;
    s.elements.pixel = ctx.defaultElementSettings();
    s.elements.pixel.count = 20;
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 0;
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 0;
    s.elements.cursor = ctx.defaultElementSettings();
    s.elements.cursor.count = 0;
    var jobs1 = ctx.schedule(s, ci);
    var jobs2 = ctx.schedule(s, ci);
    assert(jobs1.length === jobs2.length, "pixel determinism: same count");
    var allMatch = true;
    for (var i = 0; i < jobs1.length; i++) {
        if (jobs1[i].behavior !== jobs2[i].behavior ||
            jobs1[i].x !== jobs2[i].x ||
            jobs1[i].y !== jobs2[i].y) {
            allMatch = false;
            break;
        }
    }
    assert(allMatch, "pixel determinism: same seed = same pixel jobs");
})();

// Weight distribution: approximate check
(function() {
    var ci = { duration: 60, frameRate: 24, width: 1920, height: 1080, totalFrames: 1440 };
    var s = ctx.defaultSettings();
    s.seed = 99;
    s.chaos = 0;
    s.elements.pixel = ctx.defaultElementSettings();
    s.elements.pixel.count = 500;
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 0;
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 0;
    s.elements.cursor = ctx.defaultElementSettings();
    s.elements.cursor.count = 0;
    var jobs = ctx.schedule(s, ci);
    var bc = {};
    for (var i = 0; i < jobs.length; i++) {
        bc[jobs[i].behavior] = (bc[jobs[i].behavior] || 0) + 1;
    }
    // microScatter (30%) should be most common
    assert((bc.microScatter || 0) > (bc.hTear || 0),
        "pixel weights: microScatter (30%) > hTear (15%) (" +
        (bc.microScatter || 0) + " vs " + (bc.hTear || 0) + ")");
    assert((bc.microScatter || 0) > (bc.scanlineShift || 0),
        "pixel weights: microScatter (30%) > scanlineShift (15%) (" +
        (bc.microScatter || 0) + " vs " + (bc.scanlineShift || 0) + ")");
})();

// All pixel jobs have common fields (opacity, x, y)
(function() {
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.chaos = 0;
    s.elements.pixel = ctx.defaultElementSettings();
    s.elements.pixel.count = 20;
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 0;
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 0;
    s.elements.cursor = ctx.defaultElementSettings();
    s.elements.cursor.count = 0;
    var jobs = ctx.schedule(s, ci);
    var allHaveCommon = true;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].opacity == null || jobs[i].x == null || jobs[i].y == null) {
            allHaveCommon = false;
            break;
        }
    }
    assert(allHaveCommon, "pixel common fields: all jobs have opacity, x, y");
    // Old fields should NOT be present
    var noOldFields = true;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].blockCount != null || jobs[i].crawlRadius != null ||
            jobs[i].crawlInterval != null || jobs[i].colors != null ||
            jobs[i].w != null || jobs[i].h != null) {
            noOldFields = false;
            break;
        }
    }
    assert(noOldFields, "pixel old fields: no blockCount/crawlRadius/crawlInterval/colors/w/h");
})();


// ── assignDialogStacks ────────────────────────────────

var stackJobs = [
    { type: "dialog", title: "Error", inFrame: 0, outFrame: 30, stackIndex: 0 },
    { type: "dialog", title: "Error", inFrame: 10, outFrame: 40, stackIndex: 0 },
    { type: "dialog", title: "Error", inFrame: 20, outFrame: 50, stackIndex: 0 },
    { type: "dialog", title: "Warning", inFrame: 5, outFrame: 35, stackIndex: 0 },
    { type: "bsod",   title: null, inFrame: 0, outFrame: 100, stackIndex: 0 }
];
var rngStack = ctx.createRNG(42);
ctx.assignDialogStacks(stackJobs, rngStack);
assert(stackJobs[0].stackIndex === 0, "assignDialogStacks: first 'Error' dialog gets index 0");
assert(stackJobs[1].stackIndex === 1, "assignDialogStacks: second 'Error' dialog gets index 1");
assert(stackJobs[2].stackIndex === 2, "assignDialogStacks: third 'Error' dialog gets index 2");
assert(stackJobs[3].stackIndex === 0, "assignDialogStacks: lone 'Warning' dialog keeps index 0");
assert(stackJobs[4].stackIndex === 0, "assignDialogStacks: non-dialog not affected");


// ── schedule (full integration) ────────────────────────

// Basic scheduling
var schedSettings = ctx.defaultSettings();
schedSettings.seed = 42;
schedSettings.chaos = 50;
var jobs = ctx.schedule(schedSettings, compInfo);
assert(jobs.length > 0, "schedule: produces jobs");
assert(jobs.length === ctx.calcElementCount(50, 240),
    "schedule: job count matches calcElementCount (" + jobs.length + ")");

// Determinism
var jobs2 = ctx.schedule(schedSettings, compInfo);
assert(jobs.length === jobs2.length, "schedule: deterministic job count");
var jobsMatch = true;
for (var i = 0; i < Math.min(jobs.length, jobs2.length); i++) {
    if (jobs[i].type !== jobs2[i].type || jobs[i].inFrame !== jobs2[i].inFrame) {
        jobsMatch = false;
        break;
    }
}
assert(jobsMatch, "schedule: deterministic job content");

// Different seed = different output
var schedSettings2 = ctx.defaultSettings();
schedSettings2.seed = 99;
schedSettings2.chaos = 50;
var jobs3 = ctx.schedule(schedSettings2, compInfo);
var anyDiff = false;
for (var i = 0; i < Math.min(jobs.length, jobs3.length); i++) {
    if (jobs[i].type !== jobs3[i].type || jobs[i].inFrame !== jobs3[i].inFrame) {
        anyDiff = true;
        break;
    }
}
assert(anyDiff, "schedule: different seed produces different output");

// Chaos 0 = no elements
var schedSettings0 = ctx.defaultSettings();
schedSettings0.seed = 42;
schedSettings0.chaos = 0;
var jobs0 = ctx.schedule(schedSettings0, compInfo);
assert(jobs0.length === 0, "schedule: chaos 0 produces no elements");

// Exact counts mode: specify per-type counts
var schedSettingsExact = ctx.defaultSettings();
schedSettingsExact.seed = 42;
schedSettingsExact.chaos = 100;
schedSettingsExact.elements.dialog.count = 3;
schedSettingsExact.elements.bsod.count = 2;
schedSettingsExact.elements.cursor.count = 1;
schedSettingsExact.elements.pixel.count = 0;
var jobsExact = ctx.schedule(schedSettingsExact, compInfo);
assert(jobsExact.length === 6, "schedule: exact counts mode produces 3+2+0+1+0 = 6 jobs (got " + jobsExact.length + ")");
// Count types
var exactTypeCounts = {};
for (var ei = 0; ei < jobsExact.length; ei++) {
    var et = jobsExact[ei].type;
    exactTypeCounts[et] = (exactTypeCounts[et] || 0) + 1;
}
assert((exactTypeCounts.dialog || 0) === 3,
    "schedule exact: 3 dialogs (got " + (exactTypeCounts.dialog || 0) + ")");
assert((exactTypeCounts.bsod || 0) === 2,
    "schedule exact: 2 bsod (got " + (exactTypeCounts.bsod || 0) + ")");
assert((exactTypeCounts.cursor || 0) === 1,
    "schedule exact: 1 cursor (got " + (exactTypeCounts.cursor || 0) + ")");

assert((exactTypeCounts.pixel || 0) === 0,
    "schedule exact: 0 pixel (got " + (exactTypeCounts.pixel || 0) + ")");

// All counts 0 + chaos 0 = nothing
var schedSettingsNone = ctx.defaultSettings();
schedSettingsNone.seed = 42;
schedSettingsNone.chaos = 0;
var jobsNone = ctx.schedule(schedSettingsNone, compInfo);
assert(jobsNone.length === 0, "schedule: all counts 0 + chaos 0 = no elements");

// Floor rule check
var allAboveFloor = true;
for (var i = 0; i < jobs.length; i++) {
    var dur = jobs[i].outFrame - jobs[i].inFrame;
    var floor = (jobs[i].type === "pixel") ? 2 : 8;
    if (dur < floor) {
        allAboveFloor = false;
        console.error("  Floor violation: job " + i + " type=" + jobs[i].type +
            " dur=" + dur + " floor=" + floor);
    }
}
assert(allAboveFloor, "schedule: all jobs respect floor rule");

// Time bounds check
var allInBounds = true;
for (var i = 0; i < jobs.length; i++) {
    if (jobs[i].inFrame < 0 || jobs[i].outFrame > compInfo.totalFrames) {
        allInBounds = false;
        console.error("  Bounds violation: job " + i + " in=" + jobs[i].inFrame +
            " out=" + jobs[i].outFrame + " total=" + compInfo.totalFrames);
    }
}
assert(allInBounds, "schedule: all jobs within comp time bounds");

// inPoint/outPoint are set correctly
var timesCorrect = true;
for (var i = 0; i < jobs.length; i++) {
    var expectedIn = jobs[i].inFrame / compInfo.frameRate;
    var expectedOut = jobs[i].outFrame / compInfo.frameRate;
    if (Math.abs(jobs[i].inPoint - expectedIn) > 0.001 ||
        Math.abs(jobs[i].outPoint - expectedOut) > 0.001) {
        timesCorrect = false;
    }
}
assert(timesCorrect, "schedule: inPoint/outPoint match frame-to-seconds conversion");

// Every job has required fields
var allHaveFields = true;
for (var i = 0; i < jobs.length; i++) {
    var j = jobs[i];
    if (!j.type || !j.layer || j.inFrame == null || j.outFrame == null ||
        j.x == null || j.y == null || j.compW == null || j.compH == null) {
        allHaveFields = false;
        console.error("  Missing field in job " + i + ": type=" + j.type);
    }
}
assert(allHaveFields, "schedule: all jobs have required fields");

// Type distribution includes variety at chaos 50
var typesSeen = {};
for (var i = 0; i < jobs.length; i++) {
    typesSeen[jobs[i].type] = true;
}
var typeCount = 0;
for (var k in typesSeen) {
    if (typesSeen.hasOwnProperty(k)) typeCount++;
}
assert(typeCount >= 3, "schedule: chaos 50 produces at least 3 element types (got " + typeCount + ")");

// High chaos test
var schedHigh = ctx.defaultSettings();
schedHigh.seed = 42;
schedHigh.chaos = 100;
var jobsHigh = ctx.schedule(schedHigh, compInfo);
assert(jobsHigh.length > jobs.length,
    "schedule: chaos 100 produces more elements than chaos 50 (" +
    jobsHigh.length + " vs " + jobs.length + ")");

// Chaos curve test: "build" should cluster elements toward end
var schedBuild = ctx.defaultSettings();
schedBuild.seed = 42;
schedBuild.chaos = 50;
schedBuild.chaosCurve = "build";
var jobsBuild = ctx.schedule(schedBuild, compInfo);
var firstHalf = 0, secondHalf = 0;
for (var i = 0; i < jobsBuild.length; i++) {
    if (jobsBuild[i].inFrame < compInfo.totalFrames / 2) firstHalf++;
    else secondHalf++;
}
assert(secondHalf > firstHalf,
    "schedule 'build' curve: more elements in second half (" +
    secondHalf + " vs " + firstHalf + ")");

// Animation style: slowBurn should have longer durations
var schedSlow = ctx.defaultSettings();
schedSlow.seed = 42;
schedSlow.chaos = 50;
schedSlow.animStyle = "slowBurn";
var jobsSlow = ctx.schedule(schedSlow, compInfo);
var avgDurSlow = 0;
for (var i = 0; i < jobsSlow.length; i++) {
    avgDurSlow += jobsSlow[i].outFrame - jobsSlow[i].inFrame;
}
avgDurSlow /= jobsSlow.length;

var avgDurNorm = 0;
for (var i = 0; i < jobs.length; i++) {
    avgDurNorm += jobs[i].outFrame - jobs[i].inFrame;
}
avgDurNorm /= jobs.length;
assert(avgDurSlow > avgDurNorm,
    "schedule slowBurn: longer avg duration (" +
    avgDurSlow.toFixed(1) + " vs " + avgDurNorm.toFixed(1) + ")");


// ── dialogVariant on dialog jobs ──────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 100, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic", elements: { dialog: { count: 20 }, bsod: { count: 0 }, cursor: { count: 0 }, pixel: { count: 0 } } };
    var jobs = ctx.schedule(settings, compInfo);
    var dialogJobs = [];
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "dialog") dialogJobs.push(jobs[i]);
    }
    assert(dialogJobs.length > 0, "dialogVariant: has dialog jobs");
    var hasVariant = true;
    var variantCounts = { A: 0, B: 0, C: 0 };
    for (var i = 0; i < dialogJobs.length; i++) {
        var v = dialogJobs[i].dialogVariant;
        if (v !== "A" && v !== "B" && v !== "C") { hasVariant = false; break; }
        variantCounts[v]++;
    }
    assert(hasVariant, "dialogVariant: all dialog jobs have variant A/B/C");
    // B should be most common (weight 50 vs 25/25)
    assert(variantCounts.B >= variantCounts.A, "dialogVariant: B >= A (B=" + variantCounts.B + " A=" + variantCounts.A + ")");
    assert(variantCounts.B >= variantCounts.C, "dialogVariant: B >= C (B=" + variantCounts.B + " C=" + variantCounts.C + ")");
})();

// ── bsodEra on bsod jobs ─────────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 100, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic", elements: { dialog: { count: 0 }, bsod: { count: 20 }, cursor: { count: 0 }, pixel: { count: 0 } } };
    var jobs = ctx.schedule(settings, compInfo);
    var bsodJobs = [];
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "bsod") bsodJobs.push(jobs[i]);
    }
    assert(bsodJobs.length === 20, "bsodEra: has 20 bsod jobs");
    var hasEra = true;
    var eraCounts = { xp: 0, "9x": 0 };
    for (var i = 0; i < bsodJobs.length; i++) {
        var era = bsodJobs[i].bsodEra;
        if (era !== "xp" && era !== "9x") { hasEra = false; break; }
        eraCounts[era]++;
    }
    assert(hasEra, "bsodEra: all bsod jobs have era xp or 9x");
    assert(eraCounts.xp > 0, "bsodEra: has xp jobs (" + eraCounts.xp + ")");
    assert(eraCounts["9x"] > 0, "bsodEra: has 9x jobs (" + eraCounts["9x"] + ")");
    // Both eras present confirms weighted pick is working (60/40 split)
})();

// ── trails fields on all jobs ─────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 50, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        trails: { enabled: true, chance: 20, echoes: 4, decay: 50 } };
    var jobs = ctx.schedule(settings, compInfo);
    assert(jobs.length > 0, "trails: has jobs");
    var allHaveTrails = true;
    var trueCount = 0, falseCount = 0;
    for (var i = 0; i < jobs.length; i++) {
        if (typeof jobs[i].trails !== "boolean") { allHaveTrails = false; break; }
        if (jobs[i].trails) {
            trueCount++;
            if (typeof jobs[i].trailEchoes !== "number" || typeof jobs[i].trailDecay !== "number") {
                allHaveTrails = false;
                break;
            }
        } else {
            falseCount++;
        }
    }
    assert(allHaveTrails, "trails: all jobs have boolean trails field");
    assert(trueCount > 0, "trails: some jobs have trails=true (count=" + trueCount + ")");
    assert(falseCount > 0, "trails: some jobs have trails=false (count=" + falseCount + ")");
})();

// ── trails disabled ───────────────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 50, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        trails: { enabled: false, chance: 100, echoes: 4, decay: 50 } };
    var jobs = ctx.schedule(settings, compInfo);
    var anyTrails = false;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].trails) { anyTrails = true; break; }
    }
    assert(!anyTrails, "trails disabled: no jobs have trails=true");
})();

// ── trails chance 0 ───────────────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 50, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        trails: { enabled: true, chance: 0, echoes: 4, decay: 50 } };
    var jobs = ctx.schedule(settings, compInfo);
    var anyTrails = false;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].trails) { anyTrails = true; break; }
    }
    assert(!anyTrails, "trails chance=0: no jobs have trails=true");
})();

// ── trails chance 100 ─────────────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 50, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        trails: { enabled: true, chance: 100, echoes: 6, decay: 75 } };
    var jobs = ctx.schedule(settings, compInfo);
    var allTrails = true;
    for (var i = 0; i < jobs.length; i++) {
        if (!jobs[i].trails) { allTrails = false; break; }
    }
    assert(allTrails, "trails chance=100: all jobs have trails=true");
    if (jobs.length > 0) {
        assert(jobs[0].trailEchoes === 6, "trails chance=100: echoes=6 propagated");
        assert(jobs[0].trailDecay === 75, "trails chance=100: decay=75 propagated");
    }
})();

// ── DIALOG_VARIANTS structure ─────────────────────────────
(function() {
    var variants = ctx.DIALOG_VARIANTS;
    assert(variants != null, "DIALOG_VARIANTS exported");
    assert(variants.A != null, "DIALOG_VARIANTS has A");
    assert(variants.B != null, "DIALOG_VARIANTS has B");
    assert(variants.C != null, "DIALOG_VARIANTS has C");
    var keys = ["body", "titleStart", "titleEnd", "borderL", "borderD", "borderOuter", "btnBg", "btnBorderL", "btnBorderD", "cornerRadius", "titleH"];
    for (var ki = 0; ki < keys.length; ki++) {
        assert(variants.B[keys[ki]] != null, "DIALOG_VARIANTS.B." + keys[ki] + " exists");
    }
    assert(variants.C.closeBtn != null, "DIALOG_VARIANTS.C.closeBtn exists (red oval)");
    assert(variants.A.closeBtn == null, "DIALOG_VARIANTS.A.closeBtn is null");
    assert(variants.C.titleH === 25, "DIALOG_VARIANTS.C.titleH = 25 (XP)");
    assert(variants.A.titleH === 18, "DIALOG_VARIANTS.A.titleH = 18 (Classic)");
    assert(variants.B.titleH === 18, "DIALOG_VARIANTS.B.titleH = 18 (Standard)");
    assert(variants.C.cornerRadius === 4, "DIALOG_VARIANTS.C.cornerRadius = 4");
    assert(variants.A.cornerRadius === 0, "DIALOG_VARIANTS.A.cornerRadius = 0");
})();

// ── BSOD text arrays exported ─────────────────────────────
(function() {
    assert(ctx.BSOD_LINES_XP != null && ctx.BSOD_LINES_XP.length > 10, "BSOD_LINES_XP exported with > 10 lines");
    assert(ctx.BSOD_LINES_9X != null && ctx.BSOD_LINES_9X.length > 5, "BSOD_LINES_9X exported with > 5 lines");
    assert(ctx.BSOD_CODES != null && ctx.BSOD_CODES.length > 3, "BSOD_CODES exported");
    assert(ctx.BSOD_EXCEPTIONS != null && ctx.BSOD_EXCEPTIONS.length > 2, "BSOD_EXCEPTIONS exported");
})();


// ── Per-type duration test ──────────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 100, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        elements: {
            dialog: { count: 10, minFrames: 20, maxFrames: 40 },
            bsod: { count: 10, minFrames: 50, maxFrames: 80 },
            cursor: { count: 0 }, pixel: { count: 0 }
        }
    };
    var jobs = ctx.schedule(settings, compInfo);
    var dialogDurs = [], bsodDurs = [];
    for (var i = 0; i < jobs.length; i++) {
        var dur = jobs[i].outFrame - jobs[i].inFrame;
        if (jobs[i].type === "dialog") dialogDurs.push(dur);
        else if (jobs[i].type === "bsod") bsodDurs.push(dur);
    }
    // Average bsod duration should be > dialog duration
    var avgDialog = 0, avgBsod = 0;
    for (var i = 0; i < dialogDurs.length; i++) avgDialog += dialogDurs[i];
    avgDialog /= (dialogDurs.length || 1);
    for (var i = 0; i < bsodDurs.length; i++) avgBsod += bsodDurs[i];
    avgBsod /= (bsodDurs.length || 1);
    assert(avgBsod > avgDialog,
        "per-type duration: bsod avg (" + avgBsod.toFixed(1) + ") > dialog avg (" + avgDialog.toFixed(1) + ")");
})();

// ── Per-type scale/speed test ──────────────────────────
(function() {
    var compInfo = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var settings = { seed: 42, chaos: 100, rotoMode: "flat", chaosCurve: "flat", animStyle: "xpClassic",
        elements: {
            dialog: { count: 5, scale: 200, speed: 50 },
            bsod: { count: 5, scale: 75, speed: 150 },
            cursor: { count: 0 }, pixel: { count: 0 }
        }
    };
    var jobs = ctx.schedule(settings, compInfo);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "dialog") {
            assert(jobs[i].scale === 2.0,
                "per-type scale: dialog scale = 2.0 (got " + jobs[i].scale + ")");
            assert(jobs[i].speedMult === 0.5,
                "per-type speed: dialog speedMult = 0.5 (got " + jobs[i].speedMult + ")");
            break; // just check first one
        }
    }
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "bsod") {
            assert(jobs[i].scale === 0.75,
                "per-type scale: bsod scale = 0.75 (got " + jobs[i].scale + ")");
            assert(jobs[i].speedMult === 1.5,
                "per-type speed: bsod speedMult = 1.5 (got " + jobs[i].speedMult + ")");
            break;
        }
    }
})();


// ── Per-Element Override Tests ────────────────────────

// --- assignLayer forceLayer ---
(function() {
    var rng = ctx.createRNG(42);
    assert(ctx.assignLayer("dialog", "split", rng, "over") === "over",
        "assignLayer: forceLayer 'over' overrides split mode");
    assert(ctx.assignLayer("bsod", "flat", rng, "under") === "under",
        "assignLayer: forceLayer 'under' overrides flat mode");
    assert(ctx.assignLayer("dialog", "allUnder", rng, "over") === "over",
        "assignLayer: forceLayer 'over' overrides allUnder mode");
    // null forceLayer falls through to normal logic
    assert(ctx.assignLayer("dialog", "allUnder", rng, null) === "under",
        "assignLayer: null forceLayer uses normal logic (allUnder)");
    assert(ctx.assignLayer("dialog", "allOver", rng, null) === "over",
        "assignLayer: null forceLayer uses normal logic (allOver)");
    assert(ctx.assignLayer("dialog", "flat", rng, undefined) === "over",
        "assignLayer: undefined forceLayer uses normal logic");
})();

// --- Per-element rotoForce in schedule ---
(function() {
    var s = ctx.defaultSettings();
    s.seed = 99;
    s.chaos = 0; // use explicit counts
    s.rotoMode = "split";
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 5;
    s.elements.dialog.rotoForce = "under"; // force all dialogs under
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 5;
    s.elements.bsod.rotoForce = null; // use global (split)
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    assert(jobs.length === 10, "rotoForce schedule: 10 jobs total");
    var allDialogsUnder = true;
    for (var i = 0; i < jobs.length; i++) {
        if ((jobs[i].type === "dialog") && jobs[i].layer !== "under") {
            allDialogsUnder = false;
        }
    }
    assert(allDialogsUnder, "rotoForce: all dialog jobs forced under");
    // BSOD should have mix of over/under in split mode (at least some of each over multiple seeds)
})();

// --- Per-element trails override in buildJob ---
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.trails = { enabled: false, chance: 0, echoes: 4, decay: 50 }; // global trails disabled
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 10;
    s.elements.dialog.trails = { enabled: true, chance: 100, echoes: 8, decay: 30 }; // force trails on dialogs
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 10;
    // bsod has no trails override, inherits global (disabled)
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    var dialogTrails = 0, bsodTrails = 0;
    for (var i = 0; i < jobs.length; i++) {
        if ((jobs[i].type === "dialog") && jobs[i].trails) dialogTrails++;
        if (jobs[i].type === "bsod" && jobs[i].trails) bsodTrails++;
    }
    assert(dialogTrails > 0, "per-element trails: dialog has trails when override enabled (got " + dialogTrails + ")");
    assert(bsodTrails === 0, "per-element trails: bsod has no trails when global disabled (got " + bsodTrails + ")");
    // Check trail settings values
    for (var i = 0; i < jobs.length; i++) {
        if ((jobs[i].type === "dialog") && jobs[i].trails) {
            assert(jobs[i].trailEchoes === 8, "per-element trails: dialog echoes = 8");
            assert(jobs[i].trailDecay === 30, "per-element trails: dialog decay = 30");
            break;
        }
    }
})();

// --- Per-element custom messages in buildJob ---
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.customMessages = ["Global error"];
    s.customTitles = ["Global title"];
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 5;
    s.elements.dialog.customMessages = ["Dialog specific error"];
    s.elements.dialog.customTitles = ["Dialog specific title"];
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 3;
    s.elements.bsod.customMessages = ["BSOD custom line"];
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);

    // Check dialog jobs use per-element messages
    var foundDialogCustom = false;
    var foundBsodCustom = false;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "dialog") {
            // title and body come from per-element pools
            if (jobs[i].title === "Dialog specific title" || jobs[i].body === "Dialog specific error") {
                foundDialogCustom = true;
            }
        }
        if (jobs[i].type === "bsod") {
            // BSOD textLines should include custom line
            if (jobs[i].textLines) {
                for (var li = 0; li < jobs[i].textLines.length; li++) {
                    if (jobs[i].textLines[li] === "BSOD custom line") {
                        foundBsodCustom = true;
                    }
                }
            }
        }
    }
    assert(foundBsodCustom, "per-element customMessages: BSOD includes custom line");
})();

// --- Per-element curve in schedule ---
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.chaos = 0;
    s.chaosCurve = "flat"; // global curve
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 20;
    s.elements.dialog.curve = "build"; // override to build
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 20;
    // bsod inherits flat

    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);

    // Collect spawn frames per type
    var dialogFrames = [], bsodFrames = [];
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "dialog") dialogFrames.push(jobs[i].inFrame);
        if (jobs[i].type === "bsod") bsodFrames.push(jobs[i].inFrame);
    }

    // Build curve should skew later; compute average spawn time
    var dialogAvg = 0;
    for (var i = 0; i < dialogFrames.length; i++) dialogAvg += dialogFrames[i];
    dialogAvg = dialogAvg / dialogFrames.length;
    var bsodAvg = 0;
    for (var i = 0; i < bsodFrames.length; i++) bsodAvg += bsodFrames[i];
    bsodAvg = bsodAvg / bsodFrames.length;

    // Build curve averages should be higher (later) than flat
    assert(dialogAvg > bsodAvg,
        "per-element curve: build (dialog avg=" + dialogAvg.toFixed(1) +
        ") later than flat (bsod avg=" + bsodAvg.toFixed(1) + ")");
})();

// --- Determinism with overrides ---
(function() {
    var s = ctx.defaultSettings();
    s.seed = 777;
    s.chaos = 0;
    s.rotoMode = "split";
    s.elements.dialog = ctx.defaultElementSettings();
    s.elements.dialog.count = 5;
    s.elements.dialog.rotoForce = "over";
    s.elements.dialog.curve = "peak";
    s.elements.dialog.trails = { enabled: true, chance: 100, echoes: 6, decay: 40 };
    s.elements.bsod = ctx.defaultElementSettings();
    s.elements.bsod.count = 3;
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };

    var jobs1 = ctx.schedule(s, ci);
    var jobs2 = ctx.schedule(s, ci);
    assert(jobs1.length === jobs2.length, "determinism w/ overrides: same job count");
    var allMatch = true;
    for (var i = 0; i < jobs1.length; i++) {
        if (jobs1[i].type !== jobs2[i].type ||
            jobs1[i].inFrame !== jobs2[i].inFrame ||
            jobs1[i].layer !== jobs2[i].layer ||
            jobs1[i].trails !== jobs2[i].trails) {
            allMatch = false;
            break;
        }
    }
    assert(allMatch, "determinism w/ overrides: identical jobs across runs");
})();


// ── Freeze strip tests ──────────────────────────────

// Freeze jobs appear in high-chaos auto mode
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.chaos = 200;  // high chaos for more elements
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    var freezeJobs = [];
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "freeze") freezeJobs.push(jobs[i]);
    }
    assert(freezeJobs.length > 0, "freeze jobs appear at high chaos");
})();

// Freeze with explicit count
(function() {
    var s = ctx.defaultSettings();
    s.seed = 100;
    s.elements.freeze.count = 10;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    var freezeCount = 0;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "freeze") freezeCount++;
    }
    assert(freezeCount === 10, "freeze explicit count=10 produces 10 freeze jobs (got " + freezeCount + ")");
})();

// Freeze behavior is "single" or "cluster"
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 30;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    var singles = 0, clusters = 0;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        if (jobs[i].behavior === "single") singles++;
        else if (jobs[i].behavior === "cluster") clusters++;
        else assert(false, "freeze job has unknown behavior: " + jobs[i].behavior);
    }
    assert(singles > 0, "freeze produces single behavior (" + singles + ")");
    assert(clusters > 0, "freeze produces cluster behavior (" + clusters + ")");
})();

// Freeze single: stripHeight in range, stripY valid
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 50;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze" || jobs[i].behavior !== "single") continue;
        assert(jobs[i].stripHeight >= ctx.C_FREEZE_MIN_HEIGHT && jobs[i].stripHeight <= ctx.C_FREEZE_MAX_HEIGHT,
            "freeze single stripHeight in [1,64] (got " + jobs[i].stripHeight + ")");
        assert(jobs[i].stripY >= 0 && jobs[i].stripY + jobs[i].stripHeight <= ci.height,
            "freeze single stripY within bounds (y=" + jobs[i].stripY + " h=" + jobs[i].stripHeight + ")");
    }
})();

// Freeze cluster: strips array valid
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 50;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze" || jobs[i].behavior !== "cluster") continue;
        var strips = jobs[i].strips;
        assert(strips != null && strips.length >= 1, "freeze cluster has strips array");
        assert(strips.length <= ctx.C_FREEZE_CLUSTER_MAX, "freeze cluster strips <= " + ctx.C_FREEZE_CLUSTER_MAX);
        for (var si = 0; si < strips.length; si++) {
            assert(strips[si].height >= ctx.C_FREEZE_MIN_HEIGHT && strips[si].height <= ctx.C_FREEZE_MAX_HEIGHT,
                "freeze cluster strip[" + si + "] height in range (got " + strips[si].height + ")");
            assert(strips[si].y >= 0 && strips[si].y + strips[si].height <= ci.height,
                "freeze cluster strip[" + si + "] within bounds (y=" + strips[si].y + " h=" + strips[si].height + ")");
        }
        // Verify strips don't overlap
        for (var si = 1; si < strips.length; si++) {
            assert(strips[si].y >= strips[si - 1].y + strips[si - 1].height,
                "freeze cluster strips don't overlap (strip " + si + " y=" + strips[si].y +
                " vs prev end=" + (strips[si - 1].y + strips[si - 1].height) + ")");
        }
    }
})();

// Freeze freezeFrame in valid range
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 30;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        assert(jobs[i].freezeFrame >= 0 && jobs[i].freezeFrame <= ci.totalFrames - 1,
            "freeze freezeFrame in [0," + (ci.totalFrames - 1) + "] (got " + jobs[i].freezeFrame + ")");
    }
})();

// Freeze opacity in 85-100 (before per-element clamping) — after clamping, within element bounds
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 30;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        assert(jobs[i].opacity >= 50 && jobs[i].opacity <= 100,
            "freeze opacity in clamped range (got " + jobs[i].opacity + ")");
    }
})();

// Freeze determinism
(function() {
    var s = ctx.defaultSettings();
    s.seed = 777;
    s.elements.freeze.count = 15;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs1 = ctx.schedule(s, ci);
    var jobs2 = ctx.schedule(s, ci);
    assert(jobs1.length === jobs2.length, "freeze determinism: same job count");
    var allMatch = true;
    for (var i = 0; i < jobs1.length; i++) {
        if (jobs1[i].type !== jobs2[i].type ||
            jobs1[i].behavior !== jobs2[i].behavior ||
            jobs1[i].inFrame !== jobs2[i].inFrame ||
            jobs1[i].freezeFrame !== jobs2[i].freezeFrame) {
            allMatch = false;
            break;
        }
    }
    assert(allMatch, "freeze determinism: identical jobs with same seed");
})();

// Freeze weight distribution (~60/40 single/cluster)
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 200;
    var ci = { duration: 30, frameRate: 24, width: 1920, height: 1080, totalFrames: 720 };
    var jobs = ctx.schedule(s, ci);
    var singles = 0, clusters = 0;
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        if (jobs[i].behavior === "single") singles++;
        else if (jobs[i].behavior === "cluster") clusters++;
    }
    var total = singles + clusters;
    var singlePct = total > 0 ? (singles / total * 100) : 0;
    assert(singlePct > 40 && singlePct < 80,
        "freeze single% ≈ 60 (got " + singlePct.toFixed(1) + "% of " + total + ")");
})();

// Freeze per-element overrides (rotoForce, curve)
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 10;
    s.elements.freeze.rotoForce = "under";
    s.elements.freeze.curve = "build";
    s.rotoMode = "split";
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        assert(jobs[i].layer === "under",
            "freeze rotoForce=under forces all to under layer");
    }
})();

// Freeze has entryFrames and exitFrames
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 5;
    s.elements.freeze.entryFrames = 2;
    s.elements.freeze.exitFrames = 1;
    var ci = { duration: 10, frameRate: 24, width: 1920, height: 1080, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        assert(jobs[i].entryFrames === 2, "freeze entryFrames = 2");
        assert(jobs[i].exitFrames === 1, "freeze exitFrames = 1");
    }
})();

// Freeze with small comp height — cluster strips stay within bounds
(function() {
    var s = ctx.defaultSettings();
    s.seed = 42;
    s.elements.freeze.count = 20;
    var ci = { duration: 10, frameRate: 24, width: 640, height: 100, totalFrames: 240 };
    var jobs = ctx.schedule(s, ci);
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type !== "freeze") continue;
        if (jobs[i].behavior === "single") {
            assert(jobs[i].stripY + jobs[i].stripHeight <= ci.height,
                "freeze single within small comp (y=" + jobs[i].stripY + " h=" + jobs[i].stripHeight + ")");
        } else if (jobs[i].behavior === "cluster") {
            for (var si = 0; si < jobs[i].strips.length; si++) {
                assert(jobs[i].strips[si].y + jobs[i].strips[si].height <= ci.height,
                    "freeze cluster strip within small comp");
            }
        }
    }
})();

// Freeze assignLayer: freeze type gets "over" or "under" in split mode
(function() {
    var rng = ctx.createRNG(42);
    var overs = 0, unders = 0;
    for (var i = 0; i < 100; i++) {
        var l = ctx.assignLayer("freeze", "split", rng, null);
        if (l === "over") overs++;
        else if (l === "under") unders++;
    }
    assert(overs > 0 && unders > 0, "freeze assignLayer split: produces both over and under");
    assert(Math.abs(overs - 50) < 25, "freeze assignLayer split: ~50/50 distribution (over=" + overs + ")");
})();

// Freeze pickDuration uses FLOOR_FREEZE_STRIP
(function() {
    var rng = ctx.createRNG(42);
    for (var i = 0; i < 50; i++) {
        var dur = ctx.pickDuration("freeze", 1, 100, rng);
        assert(dur >= ctx.FLOOR_FREEZE_STRIP, "freeze pickDuration >= FLOOR_FREEZE_STRIP (" + dur + ")");
    }
})();


// ── Pre-rendered dialog catalog ID tests ────────────────
(function() {
    var rng = ctx.createRNG(42);
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();

    // Dialog jobs produce valid catalogId
    var catalogIdPattern = /^[ABC]_(error|warning|question|none)_[012]$/;
    for (var i = 0; i < 50; i++) {
        var job = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng);
        assert(typeof job.catalogId === "string", "dialog job has catalogId string");
        assert(catalogIdPattern.test(job.catalogId),
            "dialog catalogId matches pattern: " + job.catalogId);
        // catalogId variant must match job.dialogVariant
        assert(job.catalogId.charAt(0) === job.dialogVariant,
            "catalogId variant matches dialogVariant: " + job.catalogId + " vs " + job.dialogVariant);
    }
})();

// Dialog catalogId is deterministic for same seed
(function() {
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();

    var rng1 = ctx.createRNG(123);
    var job1 = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng1);

    var rng2 = ctx.createRNG(123);
    var job2 = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng2);

    assert(job1.catalogId === job2.catalogId,
        "catalogId deterministic: " + job1.catalogId + " === " + job2.catalogId);
})();

// Info icon maps to question in catalogId
(function() {
    // Run enough iterations to find an info icon (weight 0, but question is in catalog)
    // Since info is not in the icon weight list, catalogIcon maps icon="info" to "question"
    // We need to verify the mapping logic handles the icon values correctly
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();
    var rng = ctx.createRNG(42);
    var foundError = false, foundWarning = false, foundQuestion = false, foundNone = false;
    for (var i = 0; i < 200; i++) {
        var job = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng);
        if (job.catalogId.indexOf("_error_") !== -1) foundError = true;
        if (job.catalogId.indexOf("_warning_") !== -1) foundWarning = true;
        if (job.catalogId.indexOf("_question_") !== -1) foundQuestion = true;
        if (job.catalogId.indexOf("_none_") !== -1) foundNone = true;
        // Verify no "info" appears in catalogId
        assert(job.catalogId.indexOf("_info_") === -1,
            "catalogId never contains _info_: " + job.catalogId);
    }
    assert(foundError, "catalogId covers error icon");
    assert(foundWarning, "catalogId covers warning icon");
    assert(foundQuestion, "catalogId covers question icon");
    assert(foundNone, "catalogId covers none icon");
})();

// Cursor jobs produce cursorVariant
(function() {
    var rng = ctx.createRNG(42);
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();
    var arrows = 0, hands = 0;
    for (var i = 0; i < 100; i++) {
        var job = ctx.buildJob("cursor", 10, 100, "over", settings, ci, rng);
        assert(job.cursorVariant === "arrow" || job.cursorVariant === "hand",
            "cursor cursorVariant is arrow or hand: " + job.cursorVariant);
        if (job.cursorVariant === "arrow") arrows++;
        else hands++;
    }
    // ~70/30 split, allow wide margin
    assert(arrows > 40, "cursor arrow variant > 40% (" + arrows + ")");
    assert(hands > 10, "cursor hand variant > 10% (" + hands + ")");
})();

// Dialog jobs still have title, body, buttons (for backwards compat)
(function() {
    var rng = ctx.createRNG(42);
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();
    var job = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng);
    assert(typeof job.title === "string" && job.title.length > 0, "dialog still has title");
    assert(typeof job.body === "string" && job.body.length > 0, "dialog still has body");
    assert(job.buttons && job.buttons.length > 0, "dialog still has buttons");
})();

// catalogId references valid catalog entries
(function() {
    var catalog = ctx.DIALOG_CATALOG;
    assert(catalog && catalog.length === 36, "DIALOG_CATALOG has 36 entries");

    var catalogIds = {};
    for (var i = 0; i < catalog.length; i++) {
        catalogIds[catalog[i].id] = true;
    }

    var rng = ctx.createRNG(99);
    var ci = { width: 1920, height: 1080, frameRate: 24, totalFrames: 240 };
    var settings = ctx.defaultSettings();
    for (var i = 0; i < 100; i++) {
        var job = ctx.buildJob("dialog", 10, 100, "over", settings, ci, rng);
        assert(catalogIds[job.catalogId] === true,
            "catalogId exists in DIALOG_CATALOG: " + job.catalogId);
    }
})();


// ── Scheduler Distribution Summary ────────────────────

console.log("\n  --- Distribution Summary (chaos 50, seed 42) ---");
var distCounts = {};
for (var i = 0; i < jobs.length; i++) {
    distCounts[jobs[i].type] = (distCounts[jobs[i].type] || 0) + 1;
}
for (var k in distCounts) {
    if (distCounts.hasOwnProperty(k)) {
        console.log("  " + k + ": " + distCounts[k] + " (" +
            (distCounts[k] / jobs.length * 100).toFixed(1) + "%)");
    }
}

var layerCounts = { over: 0, under: 0 };
for (var i = 0; i < jobs.length; i++) {
    layerCounts[jobs[i].layer] = (layerCounts[jobs[i].layer] || 0) + 1;
}
console.log("  over: " + layerCounts.over + ", under: " + layerCounts.under);

console.log("\nScheduler: " + passed + " passed, " + failed + " failed");
module.exports = { passed: passed, failed: failed };
