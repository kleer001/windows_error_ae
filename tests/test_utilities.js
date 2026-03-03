// test_utilities.js — Tests for AE Utilities (Section 3) and Roto Detector (Section 7)

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

console.log("=== Utility Tests ===");

// --- snapToFrame ---
assert(ctx.snapToFrame(0.5, 24) === Math.round(0.5 * 24) / 24,
    "snapToFrame(0.5, 24) snaps correctly");
assert(ctx.snapToFrame(0, 30) === 0, "snapToFrame(0, 30) = 0");
assert(ctx.snapToFrame(1.0, 24) === 1.0, "snapToFrame(1.0, 24) = 1.0");
// Verify sub-frame snapping
var snapped = ctx.snapToFrame(0.041, 24); // 0.041 * 24 = 0.984 → round to 1 → 1/24
assert(Math.abs(snapped - 1 / 24) < 0.0001, "snapToFrame(0.041, 24) snaps to 1/24");

// --- framesToSeconds ---
assert(ctx.framesToSeconds(24, 24) === 1.0, "framesToSeconds(24, 24fps) = 1.0");
assert(ctx.framesToSeconds(0, 30) === 0, "framesToSeconds(0, 30fps) = 0");
assert(ctx.framesToSeconds(15, 30) === 0.5, "framesToSeconds(15, 30fps) = 0.5");
// With comp-like object
assert(ctx.framesToSeconds(48, { frameRate: 24 }) === 2.0,
    "framesToSeconds(48, {frameRate:24}) = 2.0");

// --- clamp ---
assert(ctx.clamp(5, 0, 10) === 5, "clamp(5, 0, 10) = 5");
assert(ctx.clamp(-5, 0, 10) === 0, "clamp(-5, 0, 10) = 0");
assert(ctx.clamp(15, 0, 10) === 10, "clamp(15, 0, 10) = 10");
assert(ctx.clamp(0, 0, 0) === 0, "clamp(0, 0, 0) = 0");

// --- lerp ---
assert(ctx.lerp(0, 100, 0.5) === 50, "lerp(0, 100, 0.5) = 50");
assert(ctx.lerp(10, 20, 0) === 10, "lerp(10, 20, 0) = 10");
assert(ctx.lerp(10, 20, 1) === 20, "lerp(10, 20, 1) = 20");

// --- fakeHex ---
var rngHex = ctx.createRNG(42);
var hex = ctx.fakeHex(rngHex);
assert(hex.indexOf("0x") === 0, "fakeHex starts with 0x");
assert(hex.length >= 8, "fakeHex is at least 8 chars (0x + 6 digits)");
assert(/^0x[0-9A-F]+$/.test(hex), "fakeHex contains only hex characters");

// Test determinism
var rngH1 = ctx.createRNG(100);
var rngH2 = ctx.createRNG(100);
assert(ctx.fakeHex(rngH1) === ctx.fakeHex(rngH2), "fakeHex is deterministic");

// --- resolveHexPlaceholders ---
var rngR = ctx.createRNG(42);
var resolved = ctx.resolveHexPlaceholders("addr %HEX% base %HEX%", rngR);
assert(resolved.indexOf("%HEX%") === -1, "resolveHexPlaceholders replaces all placeholders");
assert(resolved.indexOf("0x") !== -1, "resolveHexPlaceholders inserts hex values");

// No placeholders = no change
assert(ctx.resolveHexPlaceholders("no hex here", rngR) === "no hex here",
    "resolveHexPlaceholders with no placeholders returns original");

// --- pickErrorMessage ---
var rngE = ctx.createRNG(42);
var msg = ctx.pickErrorMessage(rngE, []);
assert(typeof msg === "string" && msg.length > 0, "pickErrorMessage returns a non-empty string");
assert(msg.indexOf("%HEX%") === -1, "pickErrorMessage resolves hex placeholders");

// With custom pool
var rngE2 = ctx.createRNG(42);
var customMsgs = [];
for (var i = 0; i < 100; i++) customMsgs.push("CUSTOM_MSG");
var customMsg = ctx.pickErrorMessage(rngE2, customMsgs);
// Should eventually pick custom with enough entries (statistical, not guaranteed per seed)
assert(typeof customMsg === "string", "pickErrorMessage with custom pool returns string");

// --- pickWindowTitle ---
var rngT = ctx.createRNG(42);
var title = ctx.pickWindowTitle(rngT, []);
assert(typeof title === "string" && title.length > 0, "pickWindowTitle returns a non-empty string");

// Determinism
var rngT1 = ctx.createRNG(999);
var rngT2 = ctx.createRNG(999);
assert(ctx.pickWindowTitle(rngT1, []) === ctx.pickWindowTitle(rngT2, []),
    "pickWindowTitle is deterministic");

// --- pickBSODLines ---
var rngB = ctx.createRNG(42);
var bsodLines = ctx.pickBSODLines(rngB, 5);
assert(bsodLines.length === 5, "pickBSODLines returns requested count");
for (var i = 0; i < bsodLines.length; i++) {
    assert(typeof bsodLines[i] === "string", "pickBSODLines[" + i + "] is a string");
    assert(bsodLines[i].indexOf("%HEX%") === -1, "pickBSODLines[" + i + "] has no unresolved %HEX%");
}

// --- pickCorruptLines ---
var rngC = ctx.createRNG(42);
var corruptLines = ctx.pickCorruptLines(rngC, 3);
assert(corruptLines.length === 3, "pickCorruptLines returns requested count");

// --- corruptString ---
var rngCS = ctx.createRNG(42);
var corrupted = ctx.corruptString("Hello World", rngCS, 0.3);
assert(corrupted.length === "Hello World".length, "corruptString preserves string length");
assert(corrupted !== "Hello World", "corruptString modifies the string");

// --- nameMatchesKeyword ---
assert(ctx.nameMatchesKeyword("My Roto Layer", ["roto"]) === true,
    "nameMatchesKeyword: 'My Roto Layer' matches 'roto'");
assert(ctx.nameMatchesKeyword("subject_main", ["subject"]) === true,
    "nameMatchesKeyword: 'subject_main' matches 'subject'");
assert(ctx.nameMatchesKeyword("Background", ["roto", "matte"]) === false,
    "nameMatchesKeyword: 'Background' does not match roto keywords");
assert(ctx.nameMatchesKeyword("FG_MATTE", ["matte"]) === true,
    "nameMatchesKeyword: case-insensitive match");
assert(ctx.nameMatchesKeyword("", ["roto"]) === false,
    "nameMatchesKeyword: empty string returns false");
assert(ctx.nameMatchesKeyword("my_fg_layer", ["fg"]) === true,
    "nameMatchesKeyword: partial match works for 'fg'");

// --- defaultSettings ---
var ds = ctx.defaultSettings();
assert(ds.seed === 1984, "defaultSettings seed = 1984");
assert(ds.chaos === 50, "defaultSettings chaos = 50");
assert(ds.rotoMode === "split", "defaultSettings rotoMode = split");
assert(ds.chaosCurve === "flat", "defaultSettings chaosCurve = flat");
assert(ds.animStyle === "xpClassic", "defaultSettings animStyle = xpClassic");
assert(ds.minFrames === 8, "defaultSettings minFrames = 8");
assert(ds.maxFrames === 96, "defaultSettings maxFrames = 96");
assert(ds.mix.dialog === 75, "defaultSettings mix.dialog = 75");
assert(ds.mix.bsod === 50, "defaultSettings mix.bsod = 50");
assert(ds.mix.text === 75, "defaultSettings mix.text = 75");
assert(ds.mix.cursor === 50, "defaultSettings mix.cursor = 50");
assert(ds.mix.pixel === 25, "defaultSettings mix.pixel = 25");
assert(Array.isArray(ds.customMessages) && ds.customMessages.length === 0,
    "defaultSettings customMessages is empty array");
assert(Array.isArray(ds.customTitles) && ds.customTitles.length === 0,
    "defaultSettings customTitles is empty array");

console.log("Utilities: " + passed + " passed, " + failed + " failed");
module.exports = { passed: passed, failed: failed };
