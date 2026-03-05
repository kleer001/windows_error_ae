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
assert(ds.chaos === 100, "defaultSettings chaos = 100");
assert(ds.rotoMode === "split", "defaultSettings rotoMode = split");
assert(ds.chaosCurve === "flat", "defaultSettings chaosCurve = flat");
assert(ds.animStyle === "xpClassic", "defaultSettings animStyle = xpClassic");
// Per-element settings (new structure)
assert(ds.elements != null, "defaultSettings has elements object");
assert(ds.elements.dialog.count === 0, "defaultSettings elements.dialog.count = 0");
assert(ds.elements.bsod.count === 0, "defaultSettings elements.bsod.count = 0");

assert(ds.elements.cursor.count === 0, "defaultSettings elements.cursor.count = 0");
assert(ds.elements.pixel.count === 0, "defaultSettings elements.pixel.count = 0");
assert(ds.elements.dialog.minFrames === 8, "defaultSettings elements.dialog.minFrames = 8");
assert(ds.elements.dialog.maxFrames === 96, "defaultSettings elements.dialog.maxFrames = 96");
assert(ds.elements.dialog.scale === 100, "defaultSettings elements.dialog.scale = 100");
assert(ds.elements.dialog.speed === 100, "defaultSettings elements.dialog.speed = 100");
assert(ds.elements.dialog.opacityMin === 50, "defaultSettings elements.dialog.opacityMin = 50");
assert(ds.elements.dialog.opacityMax === 100, "defaultSettings elements.dialog.opacityMax = 100");
assert(ds.elements.dialog.entryFrames === 3, "defaultSettings elements.dialog.entryFrames = 3");
assert(ds.elements.dialog.exitFrames === 2, "defaultSettings elements.dialog.exitFrames = 2");
// Overlay settings
assert(ds.scanlines.enabled === true, "defaultSettings scanlines.enabled = true");
assert(ds.scanlines.opacity === 20, "defaultSettings scanlines.opacity = 20");
assert(ds.scanlines.spacing === 4, "defaultSettings scanlines.spacing = 4");
assert(ds.noise.enabled === true, "defaultSettings noise.enabled = true");
assert(ds.headScratch.enabled === false, "defaultSettings headScratch.enabled = false");
// Global stack controls
assert(ds.stackDepth === 8, "defaultSettings stackDepth = 8");
assert(Array.isArray(ds.customMessages) && ds.customMessages.length === 0,
    "defaultSettings customMessages is empty array");
assert(Array.isArray(ds.customTitles) && ds.customTitles.length === 0,
    "defaultSettings customTitles is empty array");

// --- trails defaults ---
assert(ds.trails != null, "defaultSettings has trails object");
assert(ds.trails.enabled === true, "defaultSettings trails.enabled = true");
assert(ds.trails.chance === 20, "defaultSettings trails.chance = 20");
assert(ds.trails.echoes === 4, "defaultSettings trails.echoes = 4");
assert(ds.trails.decay === 50, "defaultSettings trails.decay = 50");

// --- defaultElementSettings ---
var des = ctx.defaultElementSettings();
assert(des.count === 0, "defaultElementSettings count = 0");
assert(des.minFrames === 8, "defaultElementSettings minFrames = 8");
assert(des.maxFrames === 96, "defaultElementSettings maxFrames = 96");
assert(des.scale === 100, "defaultElementSettings scale = 100");
assert(des.speed === 100, "defaultElementSettings speed = 100");
assert(des.opacityMin === 50, "defaultElementSettings opacityMin = 50");
assert(des.opacityMax === 100, "defaultElementSettings opacityMax = 100");
assert(des.entryFrames === 3, "defaultElementSettings entryFrames = 3");
assert(des.exitFrames === 2, "defaultElementSettings exitFrames = 2");
// Override fields default to null
assert(des.trails === null, "defaultElementSettings trails = null");
assert(des.rotoForce === null, "defaultElementSettings rotoForce = null");
assert(des.curve === null, "defaultElementSettings curve = null");
assert(des.customMessages === null, "defaultElementSettings customMessages = null");
assert(des.customTitles === null, "defaultElementSettings customTitles = null");

// --- getElementSettings ---
// Full settings with elements
var fullSettings = ctx.defaultSettings();
fullSettings.elements.dialog.scale = 200;
fullSettings.elements.dialog.speed = 150;
var ges = ctx.getElementSettings(fullSettings, "dialog");
assert(ges.scale === 200, "getElementSettings dialog scale override = 200");
assert(ges.speed === 150, "getElementSettings dialog speed override = 150");
assert(ges.count === 0, "getElementSettings dialog count default = 0");

// Missing elements key
var noElements = { seed: 42 };
var gesNone = ctx.getElementSettings(noElements, "dialog");
assert(gesNone.scale === 100, "getElementSettings missing elements returns default scale");
assert(gesNone.minFrames === 8, "getElementSettings missing elements returns default minFrames");

// Missing type key
var partialElements = { elements: { bsod: { count: 5 } } };
var gesPartial = ctx.getElementSettings(partialElements, "dialog");
assert(gesPartial.count === 0, "getElementSettings missing type returns default count");
assert(gesPartial.scale === 100, "getElementSettings missing type returns default scale");

// Partial override within type
var gesBsod = ctx.getElementSettings(partialElements, "bsod");
assert(gesBsod.count === 5, "getElementSettings partial override count = 5");
assert(gesBsod.scale === 100, "getElementSettings partial override falls back for scale");

// Null settings
var gesNull = ctx.getElementSettings(null, "dialog");
assert(gesNull.count === 0, "getElementSettings null settings returns defaults");

// Override fields resolution
var overrideSettings = ctx.defaultSettings();
overrideSettings.elements.dialog.trails = { enabled: true, chance: 50, echoes: 6, decay: 30 };
overrideSettings.elements.dialog.rotoForce = "over";
overrideSettings.elements.dialog.curve = "peak";
overrideSettings.elements.dialog.customMessages = ["Custom error"];
overrideSettings.elements.dialog.customTitles = ["Custom title"];
var gesOv = ctx.getElementSettings(overrideSettings, "dialog");
assert(gesOv.trails != null && gesOv.trails.chance === 50, "getElementSettings trails override resolves");
assert(gesOv.rotoForce === "over", "getElementSettings rotoForce override resolves");
assert(gesOv.curve === "peak", "getElementSettings curve override resolves");
assert(gesOv.customMessages != null && gesOv.customMessages[0] === "Custom error",
    "getElementSettings customMessages override resolves");
assert(gesOv.customTitles != null && gesOv.customTitles[0] === "Custom title",
    "getElementSettings customTitles override resolves");

// Override fields null when not set
var gesNoOv = ctx.getElementSettings(overrideSettings, "bsod");
assert(gesNoOv.trails === null, "getElementSettings bsod trails null when not set");
assert(gesNoOv.rotoForce === null, "getElementSettings bsod rotoForce null when not set");
assert(gesNoOv.curve === null, "getElementSettings bsod curve null when not set");
assert(gesNoOv.customMessages === null, "getElementSettings bsod customMessages null when not set");
assert(gesNoOv.customTitles === null, "getElementSettings bsod customTitles null when not set");

// --- migrateSettings ---
// Old format → new
var oldFmt = {
    seed: 42, chaos: 80,
    counts: { dialog: 5, bsod: 3, cursor: 0, pixel: 0 },
    minFrames: 10, maxFrames: 80,
    elementScale: 120, speedMult: 90,
    opacityMin: 60, opacityMax: 95,
    entryFrames: 5, exitFrames: 3
};
var migrated = ctx.migrateSettings(oldFmt);
assert(migrated.elements != null, "migrateSettings creates elements object");
assert(migrated.elements.dialog.count === 5, "migrateSettings dialog count = 5");
assert(migrated.elements.bsod.count === 3, "migrateSettings bsod count = 3");
assert(migrated.elements.dialog.minFrames === 10, "migrateSettings dialog minFrames = 10");
assert(migrated.elements.dialog.maxFrames === 80, "migrateSettings dialog maxFrames = 80");
assert(migrated.elements.dialog.scale === 120, "migrateSettings dialog scale = 120");
assert(migrated.elements.dialog.speed === 90, "migrateSettings dialog speed = 90");
assert(migrated.elements.dialog.opacityMin === 60, "migrateSettings dialog opacityMin = 60");
assert(migrated.elements.dialog.opacityMax === 95, "migrateSettings dialog opacityMax = 95");
assert(migrated.elements.dialog.entryFrames === 5, "migrateSettings dialog entryFrames = 5");
assert(migrated.elements.dialog.exitFrames === 3, "migrateSettings dialog exitFrames = 3");
assert(migrated.counts == null, "migrateSettings removes counts");
assert(migrated.minFrames == null, "migrateSettings removes minFrames");
assert(migrated.elementScale == null, "migrateSettings removes elementScale");
assert(migrated.seed === 42, "migrateSettings preserves seed");

// New format passthrough
var newFmt = ctx.defaultSettings();
var passthrough = ctx.migrateSettings(newFmt);
assert(passthrough.elements != null, "migrateSettings passthrough preserves elements");
assert(passthrough.elements.dialog.count === 0, "migrateSettings passthrough preserves count");

// Null passthrough
assert(ctx.migrateSettings(null) === null, "migrateSettings null returns null");

// migrateSettings: new format with missing override fields still works
var newFmtNoOverrides = ctx.defaultSettings();
delete newFmtNoOverrides.elements.dialog.trails;
delete newFmtNoOverrides.elements.dialog.rotoForce;
var migratedNew = ctx.migrateSettings(newFmtNoOverrides);
assert(migratedNew.elements != null, "migrateSettings new format without overrides passes through");
var gesAfterMigrate = ctx.getElementSettings(migratedNew, "dialog");
assert(gesAfterMigrate.trails === null, "getElementSettings after migrate: missing trails = null");
assert(gesAfterMigrate.rotoForce === null, "getElementSettings after migrate: missing rotoForce = null");

// --- randomizeSettings ---
var rs = ctx.randomizeSettings();
assert(rs.seed >= 10000 && rs.seed <= 99999, "randomizeSettings seed in range");
assert(rs.chaos >= 20 && rs.chaos <= 200, "randomizeSettings chaos in range");
assert(rs.elements != null, "randomizeSettings has elements");
assert(rs.elements.dialog != null, "randomizeSettings has dialog element");
assert(rs.elements.bsod != null, "randomizeSettings has bsod element");
assert(rs.elements.dialog.count >= 0 && rs.elements.dialog.count < 30,
    "randomizeSettings dialog count in range");
assert(rs.elements.dialog.scale >= 50 && rs.elements.dialog.scale < 200,
    "randomizeSettings dialog scale in range");
assert(rs.scanlines != null, "randomizeSettings has scanlines");
assert(rs.noise != null, "randomizeSettings has noise");
assert(rs.trails != null, "randomizeSettings has trails");
assert(rs.stackDepth >= 3, "randomizeSettings stackDepth >= 3");

// Override fields exist on each element (null or valid object/string)
var rsTypes = ["dialog", "bsod", "cursor", "pixel"];
for (var rti = 0; rti < rsTypes.length; rti++) {
    var rt = rsTypes[rti];
    var rel = rs.elements[rt];
    // trails: null or object with enabled/chance/echoes/decay
    assert(rel.trails === null || (typeof rel.trails === "object" && rel.trails.chance != null),
        "randomizeSettings " + rt + " trails is null or valid object");
    // rotoForce: null, "over", or "under"
    assert(rel.rotoForce === null || rel.rotoForce === "over" || rel.rotoForce === "under",
        "randomizeSettings " + rt + " rotoForce is null/over/under");
    // curve: null or valid curve name
    var validCurves = ["flat", "build", "peak", "burst", "random"];
    assert(rel.curve === null || validCurves.indexOf(rel.curve) !== -1,
        "randomizeSettings " + rt + " curve is null or valid name");
    // customMessages and customTitles always null (not randomized)
    assert(rel.customMessages === null, "randomizeSettings " + rt + " customMessages = null");
    assert(rel.customTitles === null, "randomizeSettings " + rt + " customTitles = null");
}

// Run randomize 20 times to verify at least one override appears
var anyTrails = false, anyRoto = false, anyCurve = false;
for (var rri = 0; rri < 20; rri++) {
    var rr = ctx.randomizeSettings();
    for (var rrj = 0; rrj < rsTypes.length; rrj++) {
        var rrel = rr.elements[rsTypes[rrj]];
        if (rrel.trails != null) anyTrails = true;
        if (rrel.rotoForce != null) anyRoto = true;
        if (rrel.curve != null) anyCurve = true;
    }
}
assert(anyTrails, "randomizeSettings produces at least one trails override in 20 runs");
assert(anyRoto, "randomizeSettings produces at least one rotoForce override in 20 runs");
assert(anyCurve, "randomizeSettings produces at least one curve override in 20 runs");

// --- Freeze element in settings ---

// defaultSettings includes freeze
var dsFrz = ctx.defaultSettings();
assert(dsFrz.elements.freeze != null, "defaultSettings includes freeze element");
assert(dsFrz.elements.freeze.count === 0, "defaultSettings freeze count = 0");
assert(dsFrz.elements.freeze.minFrames > 0, "defaultSettings freeze minFrames > 0");
assert(dsFrz.elements.freeze.maxFrames > 0, "defaultSettings freeze maxFrames > 0");

// getElementSettings works for freeze
var gesFrz = ctx.getElementSettings(dsFrz, "freeze");
assert(gesFrz.count === 0, "getElementSettings freeze default count = 0");
assert(gesFrz.scale === ctx.defaultElementSettings().scale, "getElementSettings freeze default scale");
assert(gesFrz.trails === null, "getElementSettings freeze default trails = null");
assert(gesFrz.rotoForce === null, "getElementSettings freeze default rotoForce = null");
assert(gesFrz.curve === null, "getElementSettings freeze default curve = null");

// getElementSettings with freeze overrides
var frzOverride = ctx.defaultSettings();
frzOverride.elements.freeze.count = 10;
frzOverride.elements.freeze.rotoForce = "under";
frzOverride.elements.freeze.curve = "burst";
var gesFrzOv = ctx.getElementSettings(frzOverride, "freeze");
assert(gesFrzOv.count === 10, "getElementSettings freeze override count = 10");
assert(gesFrzOv.rotoForce === "under", "getElementSettings freeze override rotoForce = under");
assert(gesFrzOv.curve === "burst", "getElementSettings freeze override curve = burst");

// migrateSettings: old format gets freeze added
var oldFmtFrz = {
    seed: 99, chaos: 50,
    counts: { dialog: 2 },
    minFrames: 12, maxFrames: 60
};
var migratedFrz = ctx.migrateSettings(oldFmtFrz);
assert(migratedFrz.elements.freeze != null, "migrateSettings old format adds freeze");
assert(migratedFrz.elements.freeze.count === 0, "migrateSettings old format freeze count = 0");

// migrateSettings: new format without freeze key gets it backfilled
var newNoFreeze = ctx.defaultSettings();
delete newNoFreeze.elements.freeze;
var migratedNoFrz = ctx.migrateSettings(newNoFreeze);
assert(migratedNoFrz.elements.freeze != null, "migrateSettings backfills missing freeze");
assert(migratedNoFrz.elements.freeze.count === 0, "migrateSettings backfill freeze count = 0");

// randomizeSettings includes freeze
var rsFrz = ctx.randomizeSettings();
assert(rsFrz.elements.freeze != null, "randomizeSettings has freeze element");
assert(rsFrz.elements.freeze.count >= 0, "randomizeSettings freeze count >= 0");
assert(rsFrz.elements.freeze.minFrames > 0, "randomizeSettings freeze minFrames > 0");
assert(rsFrz.elements.freeze.scale >= 50, "randomizeSettings freeze scale >= 50");

// Freeze constants exported
assert(ctx.C_FREEZE_MIN_HEIGHT === 1, "C_FREEZE_MIN_HEIGHT = 1");
assert(ctx.C_FREEZE_MAX_HEIGHT === 64, "C_FREEZE_MAX_HEIGHT = 64");
assert(ctx.C_FREEZE_CLUSTER_MIN === 2, "C_FREEZE_CLUSTER_MIN = 2");
assert(ctx.C_FREEZE_CLUSTER_MAX === 5, "C_FREEZE_CLUSTER_MAX = 5");
assert(ctx.C_FREEZE_CLUSTER_BAND === 200, "C_FREEZE_CLUSTER_BAND = 200");
assert(ctx.C_FREEZE_CLUSTER_GAP_MIN === 2, "C_FREEZE_CLUSTER_GAP_MIN = 2");
assert(ctx.C_FREEZE_CLUSTER_GAP_MAX === 20, "C_FREEZE_CLUSTER_GAP_MAX = 20");
assert(ctx.FLOOR_FREEZE_STRIP === 2, "FLOOR_FREEZE_STRIP = 2");

// ── Virtual Resolution ──────────────────────────────

// --- VIRTUAL_RESOLUTIONS constant exported ---
assert(ctx.VIRTUAL_RESOLUTIONS != null, "VIRTUAL_RESOLUTIONS exported");
assert(ctx.VIRTUAL_RESOLUTIONS.length === 5, "VIRTUAL_RESOLUTIONS has 5 presets");
assert(ctx.VIRTUAL_RESOLUTIONS[0].w === 640, "VIRTUAL_RESOLUTIONS[0] = 640x480");
assert(ctx.VIRTUAL_RESOLUTIONS[0].h === 480, "VIRTUAL_RESOLUTIONS[0] h = 480");
assert(ctx.VIRTUAL_RESOLUTIONS[1].w === 800, "VIRTUAL_RESOLUTIONS[1] = 800x600");
assert(ctx.VIRTUAL_RESOLUTIONS[4].w === 0, "VIRTUAL_RESOLUTIONS[4] (Native) w = 0");
assert(ctx.VIRTUAL_RESOLUTIONS[4].h === 0, "VIRTUAL_RESOLUTIONS[4] (Native) h = 0");
assert(ctx.DEFAULT_VIRTUAL_RES_INDEX === 2, "DEFAULT_VIRTUAL_RES_INDEX = 2 (1024x768)");

// --- calcCompScale ---
// 1920px comp
assert(ctx.calcCompScale(1920, 0) === 3.0, "calcCompScale(1920, 0) = 3.0 (640x480)");
assert(ctx.calcCompScale(1920, 1) === 2.4, "calcCompScale(1920, 1) = 2.4 (800x600)");
assert(ctx.calcCompScale(1920, 2) === 1920 / 1024, "calcCompScale(1920, 2) = 1.875 (1024x768)");
assert(ctx.calcCompScale(1920, 3) === 1.5, "calcCompScale(1920, 3) = 1.5 (1280x1024)");
assert(ctx.calcCompScale(1920, 4) === 1.0, "calcCompScale(1920, 4) = 1.0 (native)");

// 4K comp
assert(ctx.calcCompScale(3840, 0) === 6.0, "calcCompScale(3840, 0) = 6.0 (640x480 @ 4K)");
assert(ctx.calcCompScale(3840, 1) === 4.8, "calcCompScale(3840, 1) = 4.8 (800x600 @ 4K)");

// Edge cases
assert(ctx.calcCompScale(1920, undefined) === 1.0, "calcCompScale with undefined index returns 1.0");
assert(ctx.calcCompScale(1920, null) === 1.0, "calcCompScale with null index returns 1.0");
assert(ctx.calcCompScale(1920, 99) === 1.0, "calcCompScale with out-of-range index returns 1.0");
assert(ctx.calcCompScale(640, 0) === 1.0, "calcCompScale(640, 0) = 1.0 (comp matches virtual)");
assert(ctx.calcCompScale(1280, 0) === 2.0, "calcCompScale(1280, 0) = 2.0 (1280/640)");

// --- defaultSettings includes virtualRes ---
var dsVR = ctx.defaultSettings();
assert(dsVR.virtualRes === 2, "defaultSettings virtualRes = 2 (1024x768)");

// --- migrateSettings backfills virtualRes ---
var oldNoVR = { elements: { dialog: {}, bsod: {}, cursor: {}, pixel: {}, freeze: {} } };
var migratedVR = ctx.migrateSettings(oldNoVR);
assert(migratedVR.virtualRes === 2, "migrateSettings backfills virtualRes = 2");

// migrateSettings preserves existing virtualRes
var hasVR = { virtualRes: 3, elements: { dialog: {}, bsod: {}, cursor: {}, pixel: {}, freeze: {} } };
var migratedKeep = ctx.migrateSettings(hasVR);
assert(migratedKeep.virtualRes === 3, "migrateSettings preserves existing virtualRes = 3");

// migrateSettings handles virtualRes=0 correctly (not treated as falsy)
var vrZero = { virtualRes: 0, elements: { dialog: {}, bsod: {}, cursor: {}, pixel: {}, freeze: {} } };
var migratedZero = ctx.migrateSettings(vrZero);
assert(migratedZero.virtualRes === 0, "migrateSettings preserves virtualRes = 0 (not treated as falsy)");

// --- randomizeSettings includes virtualRes ---
var rsVR = ctx.randomizeSettings();
assert(rsVR.virtualRes != null, "randomizeSettings includes virtualRes");
assert(rsVR.virtualRes >= 0 && rsVR.virtualRes < 5, "randomizeSettings virtualRes in valid range 0-4");

console.log("Utilities: " + passed + " passed, " + failed + " failed");
module.exports = { passed: passed, failed: failed };
