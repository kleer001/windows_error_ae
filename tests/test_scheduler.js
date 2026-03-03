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

var mix = { dialog: 75, bsod: 50, text: 75, cursor: 50, pixel: 25 };
var rngMix = ctx.createRNG(42);
var typeCounts = { dialog: 0, bsod: 0, text: 0, cursor: 0, pixel: 0 };
for (var i = 0; i < 10000; i++) {
    var t = ctx.pickElementType(mix, rngMix);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
}
assert(typeCounts.dialog > typeCounts.pixel,
    "pickElementType: dialog (wt 75) more frequent than pixel (wt 25)");
assert(typeCounts.dialog > 0 && typeCounts.bsod > 0 && typeCounts.text > 0 &&
       typeCounts.cursor > 0 && typeCounts.pixel > 0,
    "pickElementType: all types produced");

// Disabled type should produce 0
var mixDisabled = { dialog: 100, bsod: 0, text: 0, cursor: 0, pixel: 0 };
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
    assert(ctx.assignLayer("text", "allUnder", rngL) === "under",
        "assignLayer allUnder always returns 'under'");
}

// Split mode: chrome is always over
var rngS = ctx.createRNG(42);
for (var i = 0; i < 100; i++) {
    assert(ctx.assignLayer("chrome", "split", rngS) === "over",
        "assignLayer split: chrome always over");
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
assert(dialogJob.type === "dialog" || dialogJob.type === "chrome",
    "buildJob dialog returns dialog or chrome type");
assert(dialogJob.inFrame === 10, "buildJob sets inFrame correctly");
assert(dialogJob.outFrame === 50, "buildJob sets outFrame correctly");
assert(typeof dialogJob.x === "number", "buildJob sets x position");
assert(typeof dialogJob.y === "number", "buildJob sets y position");
if (dialogJob.type === "dialog") {
    assert(typeof dialogJob.title === "string", "buildJob dialog has title");
    assert(typeof dialogJob.body === "string", "buildJob dialog has body");
    assert(Array.isArray(dialogJob.buttons), "buildJob dialog has buttons array");
}

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

var rngJ4 = ctx.createRNG(42);
var textJob = ctx.buildJob("text", 5, 30, "over", settings, compInfo, rngJ4);
assert(textJob.type === "text", "buildJob text type is correct");
assert(Array.isArray(textJob.lines), "buildJob text has lines array");

var rngJ5 = ctx.createRNG(42);
var pixelJob = ctx.buildJob("pixel", 0, 10, "over", settings, compInfo, rngJ5);
assert(pixelJob.type === "pixel", "buildJob pixel type is correct");
assert(typeof pixelJob.behavior === "string", "buildJob pixel has behavior");


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

// All element types disabled
var schedSettingsNone = ctx.defaultSettings();
schedSettingsNone.seed = 42;
schedSettingsNone.chaos = 50;
schedSettingsNone.mix = { dialog: 0, bsod: 0, text: 0, cursor: 0, pixel: 0 };
// This will still produce jobs (pickElementType falls back to "dialog")
// The generate() function checks for total mix = 0 before calling schedule

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
