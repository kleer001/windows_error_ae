// WindowsErrorFX.jsx
// Windows Error FX — ScriptUI Panel for Adobe After Effects
// Generates Windows 9x/XP error aesthetic visual effects over footage.
// Single-file plugin. No external dependencies. ES3 compatible.

// Entire file wrapped in IIFE to avoid polluting the shared ExtendScript
// global namespace. Only one global is created: WEFX (for external access).
(function(thisObj) {

// ════════════════════════════════════════════════════════════════
// SECTION 0 — LOGGING
// ════════════════════════════════════════════════════════════════

// Log writes to a file next to this script: WindowsErrorFX.log
// The file is overwritten on each Generate run, so it only ever
// contains the most recent session. It is safe to delete at any time.

var _wefxLog = [];
var _wefxLogFile = null;
var _wefxLogPath = "";
var _wefxLogEnabled = true;

/**
 * Resolve the log file path.
 * Writes to Documents/WindowsErrorFX/WindowsErrorFX.log — creates the
 * folder if needed. Falls back to OS temp if Documents is unavailable.
 */
function _wefxGetLogPath() {
    var fname = "WindowsErrorFX.log";
    var dirName = "WindowsErrorFX";
    var candidates = [];
    try { candidates.push(Folder.myDocuments.fsName); } catch (e) {}
    try { candidates.push(Folder.temp.fsName); } catch (e) {}

    for (var i = 0; i < candidates.length; i++) {
        var sep = (candidates[i].indexOf("/") !== -1) ? "/" : "\\";
        var dirPath = candidates[i] + sep + dirName;
        var dir = new Folder(dirPath);
        try {
            if (!dir.exists) dir.create();
            if (!dir.exists) continue;
            var p = dirPath + sep + fname;
            var f = new File(p);
            f.encoding = "UTF-8";
            if (f.open("w")) {
                f.close();
                return p;
            }
        } catch (e) {}
    }
    return "";
}

/**
 * Open the log file for writing. Called at the start of each Generate/Clear.
 * Overwrites any previous log — one run per file, always fresh.
 */
function wlogOpen() {
    _wefxLog = [];
    _wefxLogPath = _wefxGetLogPath();
    if (!_wefxLogPath) return;
    try {
        _wefxLogFile = new File(_wefxLogPath);
        _wefxLogFile.encoding = "UTF-8";
        _wefxLogFile.open("w");
        _wefxLogFile.writeln("# WindowsErrorFX Log");
        _wefxLogFile.writeln("# " + new Date().toString());
        _wefxLogFile.writeln("# This file is overwritten on each run and is safe to delete.");
        _wefxLogFile.writeln("#");
    } catch (e) {
        _wefxLogFile = null;
    }
}

/** Close the log file. Called at the end of each Generate/Clear. */
function wlogClose() {
    if (_wefxLogFile) {
        try { _wefxLogFile.close(); } catch (e) {}
        _wefxLogFile = null;
    }
}

/** Append a message to in-memory buffer, disk file, and ESTK console. */
function wlog(msg) {
    if (!_wefxLogEnabled) return;
    var entry = "[WEFX] " + msg;
    _wefxLog.push(entry);
    // Write to disk immediately (crash-safe — partial log survives AE crash)
    if (_wefxLogFile) {
        try { _wefxLogFile.writeln(entry); } catch (e) {}
    }
    try { $.writeln(entry); } catch (e) {}
}

/** Log a warning (prefixed for easy scanning). */
function wwarn(msg) {
    wlog("WARN: " + msg);
}

/** Log an error (prefixed for easy scanning). */
function werr(msg) {
    wlog("ERROR: " + msg);
}

/** Return the full in-memory log as a single string. */
function getLog() {
    return _wefxLog.join("\n");
}

/** Return the path to the log file on disk. */
function getLogPath() {
    return _wefxLogPath;
}

/** Clear the in-memory log buffer (does not touch the file). */
function clearLog() {
    _wefxLog = [];
}

/** Log an object's key fields (shallow, one line). */
function wlogObj(label, obj, keys) {
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = obj[k];
        if (v != null && typeof v === "object" && v.length != null) {
            parts.push(k + "=[" + v.length + " items]");
        } else {
            parts.push(k + "=" + String(v));
        }
    }
    wlog(label + ": " + parts.join(", "));
}


// ════════════════════════════════════════════════════════════════
// SECTION 1 — CONSTANTS
// ════════════════════════════════════════════════════════════════

// ── Visual ───────────────────────────────────────────────────────
var C_BSOD_BG         = [0,     0,     0.667]; // #0000AA
var C_BSOD_TEXT       = [1,     1,     1    ]; // white
var C_DIALOG_BG       = [0.831, 0.816, 0.784]; // #D4D0C8
var C_DIALOG_TITLE_BG = [0,     0,     0.502]; // #000080
var C_DIALOG_TITLE_TX = [1,     1,     1    ]; // white
var C_DIALOG_BORDER_L = [1,     1,     1    ]; // light border (3D effect)
var C_DIALOG_BORDER_D = [0.4,   0.4,   0.4  ]; // dark border (3D effect)
var C_DIALOG_BTN_BG   = [0.831, 0.816, 0.784];
var C_TEXT_OVERLAY     = [1,     1,     1    ]; // white monospace text
var C_CURSOR_FILL     = [1,     1,     1    ]; // white
var C_CURSOR_STROKE   = [0,     0,     0    ]; // black outline
var C_ICON_ERROR      = [0.8,   0,     0    ]; // red
var C_ICON_WARNING    = [0.9,   0.8,   0    ]; // yellow
var C_ICON_QUESTION   = [0,     0,     0.6  ]; // blue
var C_PIXEL_COLORS    = [
    [0, 0, 0],          // black
    [1, 1, 1],          // white
    [0, 0, 0.667]       // BSOD blue
];

// ── Fonts ────────────────────────────────────────────────────────
var FONT_MONO = "Courier New";
var FONT_UI   = "Arial";

// ── Font sizes ───────────────────────────────────────────────────
var FSIZE_BSOD         = 13;
var FSIZE_DIALOG_BODY  = 11;
var FSIZE_DIALOG_TITLE = 11;
var FSIZE_TEXT_OVER    = 14;
var FSIZE_BUTTON       = 10;

// ── Timing ───────────────────────────────────────────────────────
var FLOOR_FRAMES      = 8;
var FLOOR_PIXEL_BLOCK = 2;
var MAX_FRAMES        = 96;

// ── Dialog geometry ──────────────────────────────────────────────
var DIALOG_WIDTH      = 280;
var DIALOG_HEIGHT     = 140;
var DIALOG_TITLE_H    = 18;
var DIALOG_BTN_W      = 60;
var DIALOG_BTN_H      = 20;
var STACK_OFFSET_X    = 10;
var STACK_OFFSET_Y    = 10;
var MAX_STACK_DEPTH   = 8;

// ── Overlay defaults ────────────────────────────────────────────
var DEFAULT_SCANLINE_OPACITY  = 20;   // percent
var DEFAULT_SCANLINE_SPACING  = 4;    // pixels between lines
var DEFAULT_NOISE_OPACITY     = 8;    // percent
var DEFAULT_NOISE_SCALE       = 100;  // fractal noise scale
var DEFAULT_NOISE_COMPLEXITY  = 5;    // fractal noise detail (1–20)
var DEFAULT_HEADSCRATCH_FREQ  = 20;   // frames between scratches
var DEFAULT_HEADSCRATCH_HEIGHT = 2;   // pixels tall

// ── Cursor ───────────────────────────────────────────────────────
var CURSOR_HEIGHT = 24;

// ── Element control defaults ────────────────────────────────────
var DEFAULT_ELEMENT_SCALE = 100;  // percent
var DEFAULT_SPEED_MULT    = 100;  // percent
var DEFAULT_OPACITY_MIN   = 50;   // minimum element opacity
var DEFAULT_OPACITY_MAX   = 100;  // maximum element opacity
var DEFAULT_ENTRY_FRAMES  = 3;    // frames for arrival animation
var DEFAULT_EXIT_FRAMES   = 2;    // frames for exit animation

// ── Roto detection keywords ─────────────────────────────────────
var ROTO_KEYWORDS = ["roto", "rotoscope", "matte", "cutout", "subject", "fg"];

// ── Message pools ────────────────────────────────────────────────
var ERROR_MESSAGES = [
    "A problem has been detected and Windows has been shut down to prevent damage to your computer.",
    "This application has performed an illegal operation and will be shut down.",
    "The procedure entry point could not be located in the dynamic link library.",
    "Insufficient system resources exist to complete the requested service.",
    "The instruction at %HEX% referenced memory at %HEX%. The memory could not be read.",
    "Windows has encountered a critical error and needs to restart.",
    "The system has recovered from a serious error.",
    "A fatal exception has occurred at %HEX%.",
    "The file or directory is corrupted and unreadable.",
    "Runtime Error! Program has generated errors and will be closed by Windows.",
    "Stack overflow.",
    "Not enough memory to complete this operation.",
    "An unexpected error has occurred.",
    "Access violation at address %HEX% in module kernel32.dll.",
    "Error loading operating system."
];

var WINDOW_TITLES = [
    "System Error",
    "Fatal Error",
    "Runtime Exception",
    "License Wizard",
    "System Restore",
    "Windows Protection Error",
    "Application Error",
    "Explorer.exe",
    "Not Responding",
    "Error",
    "Warning",
    "Microsoft Visual C++ Runtime"
];

var BUTTON_COMBOS = [
    ["OK"],
    ["OK", "Cancel"],
    ["Retry", "Cancel"],
    ["Yes", "No"],
    ["Abort", "Retry", "Ignore"],
    ["OK", "Help"]
];

var BSOD_LINES = [
    "*** STOP: %HEX% (%HEX%, %HEX%, %HEX%, %HEX%)",
    "DRIVER_IRQL_NOT_LESS_OR_EQUAL",
    "UNEXPECTED_KERNEL_MODE_TRAP",
    "PAGE_FAULT_IN_NONPAGED_AREA",
    "KERNEL_DATA_INPAGE_ERROR",
    "INACCESSIBLE_BOOT_DEVICE",
    "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED",
    "CRITICAL_PROCESS_DIED",
    "Technical Information:",
    "*** Address %HEX% base at %HEX%",
    "Beginning dump of physical memory",
    "Physical memory dump complete.",
    "Contact your system administrator or technical support group.",
    "If this is the first time you have seen this Stop error screen,",
    "restart your computer. If this screen appears again, follow these steps:"
];

var CORRUPT_TEXT_LINES = [
    "for, unit_icon(?)make green)",
    "r at manufacture.neomution",
    "windows can notify some your system",
    "change for framswork, grove",
    "is equal) omFO_1-100 DE ENOL",
    "sppliting errors or team crshie",
    "sppjscting kernel mode data",
    "select with R... press continue",
    "checking file system on C:",
    "recovering orphaned file chain",
    "*** dumping memory at physical addr",
    "mov eax, [ebp+8] ; load param",
    "NTFS_FILE_SYSTEM",
    "kernel32!RtlUnwind+0x2a",
    "0xDEADBEEF 0xCAFEBABE 0xFF00FF"
];


// ════════════════════════════════════════════════════════════════
// SECTION 2 — PRNG
// ════════════════════════════════════════════════════════════════

// Math.imul polyfill for ES3
if (!Math.imul) {
    Math.imul = function(a, b) {
        var ah = (a >>> 16) & 0xFFFF, al = a & 0xFFFF;
        var bh = (b >>> 16) & 0xFFFF, bl = b & 0xFFFF;
        return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
    };
}

/**
 * Creates a seeded deterministic PRNG (mulberry32).
 * @param  {number} seed  Integer seed value
 * @return {function}     Returns float 0.0–1.0 on each call
 */
function createRNG(seed) {
    var s = seed >>> 0;
    return function() {
        s += 0x6D2B79F5;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Random integer in [min, max] inclusive. */
function rngInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random item from an array. */
function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

/** Returns true with given probability (0.0–1.0). */
function rngBool(rng, probability) {
    return rng() < probability;
}

/** Random float in [min, max). */
function rngFloat(rng, min, max) {
    return rng() * (max - min) + min;
}


// ════════════════════════════════════════════════════════════════
// SECTION 3 — AE UTILITIES
// ════════════════════════════════════════════════════════════════

/** Snap a seconds value to the nearest frame boundary. */
function snapToFrame(seconds, fps) {
    return Math.round(seconds * fps) / fps;
}

/** Convert frame count to seconds. Accepts comp object or raw fps number. */
function framesToSeconds(frames, fpsOrComp) {
    var fps = (typeof fpsOrComp === "number") ? fpsOrComp : fpsOrComp.frameRate;
    return frames / fps;
}

/** Clamp val between min and max. */
function clamp(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

/** Linear interpolation. */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Add a filled rectangle group to a shape layer's Contents.
 * cx, cy is center in shape-layer coordinate space.
 * Returns the PropertyGroup.
 */
function addRect(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth) {
    var group = contents.addProperty("ADBE Vector Group");
    group.name = name;
    var gc = group.property("Contents");

    var rect = gc.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([w, h]);
    rect.property("Position").setValue([cx, cy]);

    var fill = gc.addProperty("ADBE Vector Graphic - Fill");
    fill.property("Color").setValue(fillColor);
    fill.property("Opacity").setValue(100);

    if (strokeColor) {
        var stroke = gc.addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("Color").setValue(strokeColor);
        stroke.property("Stroke Width").setValue(strokeWidth || 1);
    }

    return group;
}

/**
 * Add a path shape group. vertices is array of [x,y] pairs.
 * Returns the PropertyGroup.
 */
function addPath(contents, name, vertices, closed, fillColor, strokeColor, strokeWidth) {
    var group = contents.addProperty("ADBE Vector Group");
    group.name = name;
    var gc = group.property("Contents");

    var pathProp = gc.addProperty("ADBE Vector Shape - Group");
    var shape = new Shape();
    shape.vertices = vertices;
    shape.closed = (closed !== false);
    pathProp.property("Path").setValue(shape);

    if (fillColor) {
        var fill = gc.addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue(fillColor);
    }

    if (strokeColor) {
        var stroke = gc.addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("Color").setValue(strokeColor);
        stroke.property("Stroke Width").setValue(strokeWidth || 1);
    }

    return group;
}

/** Set a linear keyframe. */
function setLinearKey(prop, timeSeconds, value) {
    prop.setValueAtTime(timeSeconds, value);
    var idx = prop.nearestKeyIndex(timeSeconds);
    prop.setInterpolationTypeAtKey(idx,
        KeyframeInterpolationType.LINEAR,
        KeyframeInterpolationType.LINEAR);
}

/** Set a hold keyframe (instant cut). */
function setHoldKey(prop, timeSeconds, value) {
    prop.setValueAtTime(timeSeconds, value);
    var idx = prop.nearestKeyIndex(timeSeconds);
    prop.setInterpolationTypeAtKey(idx,
        KeyframeInterpolationType.HOLD,
        KeyframeInterpolationType.HOLD);
}

/** Set layer in/out points, clamped to comp duration. */
function setLayerTime(layer, inSec, outSec, comp) {
    layer.inPoint  = clamp(inSec, 0, comp.duration);
    layer.outPoint = clamp(outSec, 0, comp.duration);
}

/** Generate a fake hex error code string. */
function fakeHex(rng) {
    var hex = "0x";
    var chars = "0123456789ABCDEF";
    var len = rngInt(rng, 6, 10);
    for (var i = 0; i < len; i++) {
        hex += chars.charAt(rngInt(rng, 0, 15));
    }
    return hex;
}

/** Replace %HEX% placeholders in a string with fake hex values. */
function resolveHexPlaceholders(str, rng) {
    var result = str;
    while (result.indexOf("%HEX%") !== -1) {
        result = result.replace("%HEX%", fakeHex(rng));
    }
    return result;
}

/** Pick a random error message body from the pool + custom entries. */
function pickErrorMessage(rng, customPool) {
    var pool = [];
    var i;
    for (i = 0; i < ERROR_MESSAGES.length; i++) {
        pool.push(ERROR_MESSAGES[i]);
    }
    if (customPool) {
        for (i = 0; i < customPool.length; i++) {
            pool.push(customPool[i]);
        }
    }
    var msg = rngPick(rng, pool);
    return resolveHexPlaceholders(msg, rng);
}

/** Pick a random window title from the pool + custom entries. */
function pickWindowTitle(rng, customTitles) {
    var pool = [];
    var i;
    for (i = 0; i < WINDOW_TITLES.length; i++) {
        pool.push(WINDOW_TITLES[i]);
    }
    if (customTitles) {
        for (i = 0; i < customTitles.length; i++) {
            pool.push(customTitles[i]);
        }
    }
    return rngPick(rng, pool);
}

/** Pick N random BSOD text lines with hex placeholders resolved. */
function pickBSODLines(rng, count) {
    var lines = [];
    for (var i = 0; i < count; i++) {
        var line = rngPick(rng, BSOD_LINES);
        lines.push(resolveHexPlaceholders(line, rng));
    }
    return lines;
}

/** Pick N random corrupt text lines. */
function pickCorruptLines(rng, count) {
    var lines = [];
    for (var i = 0; i < count; i++) {
        lines.push(rngPick(rng, CORRUPT_TEXT_LINES));
    }
    return lines;
}

/**
 * Generate a corrupted version of a text string.
 * Randomly replaces some characters with block chars or swaps.
 */
function corruptString(str, rng, intensity) {
    var chars = str.split("");
    var blockChars = "#@$%&*!?~";
    var numCorrupt = Math.max(1, Math.round(chars.length * (intensity || 0.15)));
    for (var i = 0; i < numCorrupt; i++) {
        var idx = rngInt(rng, 0, chars.length - 1);
        if (rngBool(rng, 0.5)) {
            chars[idx] = blockChars.charAt(rngInt(rng, 0, blockChars.length - 1));
        } else {
            chars[idx] = " ";
        }
    }
    return chars.join("");
}

/** Create a text layer with standard properties. Returns the layer. */
function createTextLayer(comp, text, font, fontSize, color, x, y, justification) {
    var tl = comp.layers.addText(text);
    var tp = tl.property("Source Text");
    var td = tp.value;
    td.text = text;
    td.font = font || FONT_MONO;
    td.fontSize = fontSize || 14;
    td.fillColor = color || [1, 1, 1];
    td.applyFill = true;
    td.applyStroke = false;
    if (justification != null) {
        td.justification = justification;
    }
    tp.setValue(td);
    tl.property("Position").setValue([x || 0, y || 0]);
    return tl;
}


// ════════════════════════════════════════════════════════════════
// SECTION 4 — ELEMENT BUILDERS
// ════════════════════════════════════════════════════════════════

/**
 * Build a BSOD panel element.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           behavior, variant, textBehavior, slideDir, slideSpeed,
 *           stutterFrame, stutterDur, textLines, opacity }
 */
function buildBSOD(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var spd = params.speedMult || 1;

    // Determine panel dimensions based on variant
    var panelW, panelH, panelX, panelY;
    if (params.variant === "fullStrip") {
        panelW = params.compW;
        panelH = Math.round(rngInt(rng, 80, 120) * sc);
        panelX = params.compW / 2;
        panelY = params.y;
    } else if (params.variant === "corner") {
        panelW = Math.round(rngInt(rng, 200, 400) * sc);
        panelH = Math.round(rngInt(rng, 60, 120) * sc);
        panelX = params.x;
        panelY = params.y;
    } else { // island
        panelW = Math.round(rngInt(rng, 200, 500) * sc);
        panelH = Math.round(rngInt(rng, 60, 150) * sc);
        panelX = params.x;
        panelY = params.y;
    }

    // Create shape layer for blue panel
    var shapeLayer = targetComp.layers.addShape();
    shapeLayer.name = "WEFX_BSOD";
    var contents = shapeLayer.property("Contents");
    addRect(contents, "Panel", panelW, panelH, 0, 0, C_BSOD_BG, null, 0);
    shapeLayer.property("Anchor Point").setValue([0, 0]);
    shapeLayer.property("Opacity").setValue(params.opacity || 90);
    setLayerTime(shapeLayer, inSec, outSec, targetComp);

    // Position and animate based on behavior
    var posProp = shapeLayer.property("Position");
    if (params.behavior === "static") {
        posProp.setValue([panelX, panelY]);
    } else if (params.behavior === "slideH") {
        var startX = (params.slideDir === "right") ? -panelW / 2 : params.compW + panelW / 2;
        var endX = (params.slideDir === "right") ? params.compW + panelW / 2 : -panelW / 2;
        setLinearKey(posProp, inSec, [startX, panelY]);
        setLinearKey(posProp, outSec, [endX, panelY]);
    } else if (params.behavior === "slideV") {
        var startY = (params.slideDir === "down") ? -panelH / 2 : params.compH + panelH / 2;
        var endY = (params.slideDir === "down") ? params.compH + panelH / 2 : -panelH / 2;
        setLinearKey(posProp, inSec, [panelX, startY]);
        setLinearKey(posProp, outSec, [panelX, endY]);
    } else if (params.behavior === "stutter") {
        var sDir = params.slideDir || "right";
        var sStartX = (sDir === "right") ? -panelW / 2 : params.compW + panelW / 2;
        var sEndX = (sDir === "right") ? params.compW + panelW / 2 : -panelW / 2;
        var freezeTime = inSec + framesToSeconds(params.stutterFrame || 8, fps);
        var freezeEnd = freezeTime + framesToSeconds(params.stutterDur || 4, fps);
        var progress = (freezeTime - inSec) / dur;
        var freezeX = lerp(sStartX, sEndX, progress);
        setLinearKey(posProp, inSec, [sStartX, panelY]);
        setLinearKey(posProp, freezeTime, [freezeX, panelY]);
        setHoldKey(posProp, freezeTime + 1 / fps, [freezeX, panelY]);
        setLinearKey(posProp, freezeEnd, [freezeX, panelY]);
        setLinearKey(posProp, outSec, [sEndX, panelY]);
    } else if (params.behavior === "snapEdge") {
        posProp.setValue([panelX, panelY]);
    }

    layers.push(shapeLayer);

    // Create text layer
    var textLines = params.textLines || ["*** STOP: 0x0000000A"];
    var textContent = textLines.join("\n");
    var scaledBsodFont = Math.round(FSIZE_BSOD * sc);
    var textLayer = createTextLayer(targetComp, textContent,
        FONT_MONO, scaledBsodFont, C_BSOD_TEXT, panelX, panelY,
        ParagraphJustification.LEFT_JUSTIFY);
    textLayer.name = "WEFX_BSOD_Text";
    setLayerTime(textLayer, inSec, outSec, targetComp);
    textLayer.property("Opacity").setValue(params.opacity || 90);

    // If sliding, parent text to shape so it moves together
    if (params.behavior === "slideH" || params.behavior === "slideV" || params.behavior === "stutter") {
        textLayer.parent = shapeLayer;
        textLayer.property("Position").setValue([
            -(panelW / 2) + 10,
            -(panelH / 2) + FSIZE_BSOD + 4
        ]);
    }

    // Text behavior: typewriter or lineShuffle via hold keyframes
    if (params.textBehavior === "typewriter" && params.behavior === "static") {
        var srcText = textLayer.property("Source Text");
        var charsPerFrame = 2;
        var totalChars = textContent.length;
        var typeFrames = Math.ceil(totalChars / charsPerFrame);
        for (var ti = 0; ti <= typeFrames; ti++) {
            var charCount = Math.min(ti * charsPerFrame, totalChars);
            var partial = textContent.substring(0, charCount);
            var typeTime = snapToFrame(inSec + framesToSeconds(ti, fps), fps);
            if (typeTime < outSec) {
                var tdType = srcText.value;
                tdType.text = partial;
                setHoldKey(srcText, typeTime, tdType);
            }
        }
    } else if (params.textBehavior === "lineShuffle") {
        var srcTextS = textLayer.property("Source Text");
        var shuffleInterval = rngInt(rng, 8, 16);
        var totalFrameCount = Math.round(dur * fps);
        for (var si = shuffleInterval; si < totalFrameCount; si += shuffleInterval) {
            var shuffleTime = snapToFrame(inSec + framesToSeconds(si, fps), fps);
            if (shuffleTime < outSec) {
                var newLines = pickBSODLines(rng, textLines.length);
                var tdShuffle = srcTextS.value;
                tdShuffle.text = newLines.join("\n");
                setHoldKey(srcTextS, shuffleTime, tdShuffle);
            }
        }
    }

    layers.push(textLayer);
    return layers;
}


/**
 * Build a Win9x dialog box element.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           title, body, buttons, icon,
 *           arrivalBehavior, lifeBehavior, exitBehavior,
 *           driftDir, driftSpeed, shakeFrame, shakeDur,
 *           stackIndex, opacity }
 */
function buildDialogBox(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var spd = params.speedMult || 1;
    var W = Math.round(DIALOG_WIDTH * sc);
    var H = Math.round(DIALOG_HEIGHT * sc);
    var titleH = Math.round(DIALOG_TITLE_H * sc);
    var si = params.stackIndex || 0;
    var stackOff = params.stackOffset || STACK_OFFSET_X;

    // Dialog center position with stack cascade
    var cx = params.x + si * stackOff;
    var cy = params.y + si * stackOff;

    // 1. Null parent for animation control
    var nullLayer = targetComp.layers.addNull();
    nullLayer.name = "WEFX_Dialog_Null";
    setLayerTime(nullLayer, inSec, outSec, targetComp);
    nullLayer.property("Position").setValue([cx, cy]);
    nullLayer.property("Anchor Point").setValue([0, 0]);
    layers.push(nullLayer);

    // 2. Dialog chrome (single shape layer with all geometry)
    var chrome = targetComp.layers.addShape();
    chrome.name = "WEFX_Dialog_Chrome";
    chrome.parent = nullLayer;
    chrome.property("Position").setValue([0, 0]);
    chrome.property("Anchor Point").setValue([0, 0]);
    chrome.property("Opacity").setValue(params.opacity || 95);
    setLayerTime(chrome, inSec, outSec, targetComp);
    var contents = chrome.property("Contents");

    // Coordinates relative to null (dialog center)
    // Body background
    var bodyH = H - titleH;
    addRect(contents, "Body", W, bodyH, 0, titleH / 2, C_DIALOG_BG, null, 0);

    // Title bar
    addRect(contents, "TitleBar", W, titleH, 0, -(H / 2) + titleH / 2, C_DIALOG_TITLE_BG, null, 0);

    // Light border (3D raised effect — top + left)
    addRect(contents, "BorderOuter", W + 2, H + 2, 0, 0, C_DIALOG_BORDER_L, null, 0);

    // Dark border (3D shadow — bottom + right)
    addRect(contents, "BorderInner", W, H, 1, 1, C_DIALOG_BG, C_DIALOG_BORDER_D, 1);

    // Re-add body and title on top of borders
    addRect(contents, "BodyFill", W - 4, bodyH - 2, 0, titleH / 2, C_DIALOG_BG, null, 0);
    addRect(contents, "TitleFill", W - 4, titleH - 2, 0, -(H / 2) + titleH / 2, C_DIALOG_TITLE_BG, null, 0);

    // Icon indicator (small colored square)
    var iconSz = Math.round(14 * sc);
    var iconColor = C_ICON_ERROR;
    if (params.icon === "warning") iconColor = C_ICON_WARNING;
    else if (params.icon === "question") iconColor = C_ICON_QUESTION;
    if (params.icon !== "none") {
        addRect(contents, "Icon", iconSz, iconSz, -(W / 2) + Math.round(22 * sc), -5, iconColor, null, 0);
    }

    // Buttons
    var buttons = params.buttons || ["OK"];
    var btnW = Math.round(DIALOG_BTN_W * sc);
    var btnH = Math.round(DIALOG_BTN_H * sc);
    var btnSpacing = Math.round(10 * sc);
    var totalBtnW = buttons.length * btnW + (buttons.length - 1) * btnSpacing;
    var btnStartX = -(totalBtnW / 2) + btnW / 2;
    var btnY = H / 2 - Math.round(25 * sc);
    for (var bi = 0; bi < buttons.length; bi++) {
        var bx = btnStartX + bi * (btnW + btnSpacing);
        addRect(contents, "Btn_" + bi + "_Light", btnW, btnH, bx, btnY, C_DIALOG_BTN_BG, C_DIALOG_BORDER_D, 1);
    }

    layers.push(chrome);

    // 3. Title text
    var scaledTitleFont = Math.round(FSIZE_DIALOG_TITLE * sc);
    var titleTL = createTextLayer(targetComp, params.title || "Error",
        FONT_UI, scaledTitleFont, C_DIALOG_TITLE_TX,
        0, 0, ParagraphJustification.LEFT_JUSTIFY);
    titleTL.name = "WEFX_Dialog_Title";
    titleTL.parent = nullLayer;
    titleTL.property("Position").setValue([
        -(W / 2) + Math.round(22 * sc),
        -(H / 2) + titleH / 2 + scaledTitleFont / 3
    ]);
    setLayerTime(titleTL, inSec, outSec, targetComp);
    layers.push(titleTL);

    // 4. Body text
    var scaledBodyFont = Math.round(FSIZE_DIALOG_BODY * sc);
    var bodyTL = createTextLayer(targetComp, params.body || "An error has occurred.",
        FONT_UI, scaledBodyFont, [0, 0, 0],
        0, 0, ParagraphJustification.LEFT_JUSTIFY);
    bodyTL.name = "WEFX_Dialog_Body";
    bodyTL.parent = nullLayer;
    bodyTL.property("Position").setValue([
        -(W / 2) + Math.round(44 * sc),
        -10
    ]);
    setLayerTime(bodyTL, inSec, outSec, targetComp);
    layers.push(bodyTL);

    // 5. Button text layers
    var scaledBtnFont = Math.round(FSIZE_BUTTON * sc);
    for (var bti = 0; bti < buttons.length; bti++) {
        var btx = btnStartX + bti * (btnW + btnSpacing);
        var btnTL = createTextLayer(targetComp, buttons[bti],
            FONT_UI, scaledBtnFont, [0, 0, 0],
            0, 0, ParagraphJustification.CENTER_JUSTIFY);
        btnTL.name = "WEFX_Dialog_Btn_" + bti;
        btnTL.parent = nullLayer;
        btnTL.property("Position").setValue([btx, btnY + scaledBtnFont / 3]);
        setLayerTime(btnTL, inSec, outSec, targetComp);
        layers.push(btnTL);
    }

    // 6. Arrival animation
    var nullPos = nullLayer.property("Position");
    if (params.arrivalBehavior === "scalePop") {
        var scaleProp = nullLayer.property("Scale");
        setHoldKey(scaleProp, inSec, [80, 80]);
        setLinearKey(scaleProp, snapToFrame(inSec + 1 / fps, fps), [95, 95]);
        setLinearKey(scaleProp, snapToFrame(inSec + 2 / fps, fps), [100, 100]);
    } else if (params.arrivalBehavior === "slideIn") {
        var entryFrames = rngInt(rng, 3, 6);
        var edgeX = (cx < params.compW / 2) ? -W : params.compW + W;
        setLinearKey(nullPos, inSec, [edgeX, cy]);
        setLinearKey(nullPos, snapToFrame(inSec + framesToSeconds(entryFrames, fps), fps), [cx, cy]);
    }

    // 7. Life behavior
    if (params.lifeBehavior === "drift") {
        var driftAngle = (params.driftDir || rngFloat(rng, 0, 360)) * Math.PI / 180;
        var driftSpd = (params.driftSpeed || rngFloat(rng, 0.5, 2)) * spd;
        var totalDriftFrames = Math.round(dur * fps);
        var dx = Math.cos(driftAngle) * driftSpd * totalDriftFrames;
        var dy = Math.sin(driftAngle) * driftSpd * totalDriftFrames;
        // Only set drift keys if not already set by arrival
        if (params.arrivalBehavior !== "slideIn") {
            setLinearKey(nullPos, inSec, [cx, cy]);
        }
        setLinearKey(nullPos, outSec, [cx + dx, cy + dy]);
    } else if (params.lifeBehavior === "shake") {
        var shakeStart = inSec + framesToSeconds(params.shakeFrame || rngInt(rng, 4, 20), fps);
        var shakeFrameCount = params.shakeDur || rngInt(rng, 8, 16);
        for (var sk = 0; sk < shakeFrameCount; sk++) {
            var shakeTime = snapToFrame(shakeStart + framesToSeconds(sk, fps), fps);
            if (shakeTime < outSec) {
                var offsetX = (sk % 2 === 0) ? -3 : 3;
                setHoldKey(nullPos, shakeTime, [cx + offsetX, cy]);
            }
        }
        // Return to rest
        var shakeEnd = snapToFrame(shakeStart + framesToSeconds(shakeFrameCount, fps), fps);
        if (shakeEnd < outSec) {
            setHoldKey(nullPos, shakeEnd, [cx, cy]);
        }
    }

    // 8. Exit behavior
    if (params.exitBehavior === "collapse") {
        var scalePropExit = nullLayer.property("Scale");
        setLinearKey(scalePropExit, snapToFrame(outSec - 3 / fps, fps), [100, 100]);
        setLinearKey(scalePropExit, snapToFrame(outSec - 2 / fps, fps), [50, 50]);
        setLinearKey(scalePropExit, snapToFrame(outSec - 1 / fps, fps), [20, 20]);
    } else if (params.exitBehavior === "slideOff") {
        var exitEdgeX = (cx < params.compW / 2) ? -W : params.compW + W;
        var exitFrames = rngInt(rng, 2, 4);
        setLinearKey(nullPos, snapToFrame(outSec - framesToSeconds(exitFrames, fps), fps), [cx, cy]);
        setLinearKey(nullPos, outSec, [exitEdgeX, cy]);
    }

    return layers;
}


/**
 * Build a window chrome fragment (isolated UI debris).
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           fragmentType, behavior, title, driftDir, driftSpeed,
 *           jumpInterval, jumpRadius, stackCount, opacity }
 */
function buildChromeFragment(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var spd = params.speedMult || 1;

    var fragType = params.fragmentType || "titleBar";
    var x = params.x;
    var y = params.y;

    if (fragType === "titleBar" || fragType === "titleStack") {
        var barCount = (fragType === "titleStack") ? (params.stackCount || rngInt(rng, 3, 6)) : 1;
        for (var bi = 0; bi < barCount; bi++) {
            var barW = Math.round(rngInt(rng, 120, 260) * sc);
            var barH = Math.round(DIALOG_TITLE_H * sc);
            var barY = y + bi * (barH + 1);

            var barShape = targetComp.layers.addShape();
            barShape.name = "WEFX_Chrome_TitleBar";
            var barContents = barShape.property("Contents");
            addRect(barContents, "Bar", barW, barH, 0, 0, C_DIALOG_TITLE_BG, null, 0);
            barShape.property("Position").setValue([x, barY]);
            barShape.property("Opacity").setValue(params.opacity || 85);
            setLayerTime(barShape, inSec, outSec, targetComp);
            layers.push(barShape);

            var titleStr = params.title || pickWindowTitle(rng, []);
            var titleTL = createTextLayer(targetComp, titleStr,
                FONT_UI, FSIZE_DIALOG_TITLE, C_DIALOG_TITLE_TX,
                x - barW / 2 + 20, barY + FSIZE_DIALOG_TITLE / 3,
                ParagraphJustification.LEFT_JUSTIFY);
            titleTL.name = "WEFX_Chrome_Title";
            setLayerTime(titleTL, inSec, outSec, targetComp);
            layers.push(titleTL);
        }
    } else if (fragType === "buttonRow") {
        var rowShape = targetComp.layers.addShape();
        rowShape.name = "WEFX_Chrome_ButtonRow";
        var rowContents = rowShape.property("Contents");
        var btnCount = rngInt(rng, 2, 3);
        for (var ri = 0; ri < btnCount; ri++) {
            addRect(rowContents, "Btn_" + ri, DIALOG_BTN_W, DIALOG_BTN_H,
                ri * (DIALOG_BTN_W + 8) - (btnCount * DIALOG_BTN_W) / 2, 0,
                C_DIALOG_BTN_BG, C_DIALOG_BORDER_D, 1);
        }
        rowShape.property("Position").setValue([x, y]);
        rowShape.property("Opacity").setValue(params.opacity || 80);
        setLayerTime(rowShape, inSec, outSec, targetComp);
        layers.push(rowShape);
    } else if (fragType === "closeBtn") {
        var closeShape = targetComp.layers.addShape();
        closeShape.name = "WEFX_Chrome_CloseBtn";
        var closeContents = closeShape.property("Contents");
        addRect(closeContents, "Btn", 16, 14, 0, 0, C_DIALOG_BTN_BG, C_DIALOG_BORDER_D, 1);
        // X mark inside button (two crossed lines approximated with a rect)
        addRect(closeContents, "X", 8, 2, 0, 0, [0.5, 0, 0], null, 0);
        closeShape.property("Position").setValue([x, y]);
        closeShape.property("Opacity").setValue(params.opacity || 90);
        setLayerTime(closeShape, inSec, outSec, targetComp);
        layers.push(closeShape);
    } else if (fragType === "scrollbar") {
        var sbShape = targetComp.layers.addShape();
        sbShape.name = "WEFX_Chrome_Scrollbar";
        var sbContents = sbShape.property("Contents");
        var sbH = rngInt(rng, 60, 200);
        addRect(sbContents, "Track", 16, sbH, 0, 0, [0.9, 0.9, 0.9], C_DIALOG_BORDER_D, 1);
        addRect(sbContents, "Thumb", 14, rngInt(rng, 20, 40), 0, rngInt(rng, -sbH / 4, sbH / 4),
            C_DIALOG_BTN_BG, C_DIALOG_BORDER_D, 1);
        sbShape.property("Position").setValue([x, y]);
        sbShape.property("Opacity").setValue(params.opacity || 75);
        setLayerTime(sbShape, inSec, outSec, targetComp);
        layers.push(sbShape);
    }

    // Behavior animation
    if (params.behavior === "flicker" && layers.length > 0) {
        // Blink off for 1-2 frames mid-hold
        var blinkTime = snapToFrame(inSec + dur * rngFloat(rng, 0.3, 0.7), fps);
        var blinkDur = rngInt(rng, 1, 2);
        for (var fi = 0; fi < layers.length; fi++) {
            var opacProp = layers[fi].property("Opacity");
            setHoldKey(opacProp, blinkTime, 0);
            setHoldKey(opacProp, snapToFrame(blinkTime + framesToSeconds(blinkDur, fps), fps),
                params.opacity || 85);
        }
    } else if (params.behavior === "drift" && layers.length > 0) {
        var dAngle = (params.driftDir || rngFloat(rng, 0, 360)) * Math.PI / 180;
        var dSpd = (params.driftSpeed || rngFloat(rng, 0.5, 2)) * spd;
        var dFrames = Math.round(dur * fps);
        var ddx = Math.cos(dAngle) * dSpd * dFrames;
        var ddy = Math.sin(dAngle) * dSpd * dFrames;
        for (var di = 0; di < layers.length; di++) {
            var dPos = layers[di].property("Position");
            var curPos = dPos.value;
            setLinearKey(dPos, inSec, curPos);
            setLinearKey(dPos, outSec, [curPos[0] + ddx, curPos[1] + ddy]);
            // Fade opacity to 0
            var dOpac = layers[di].property("Opacity");
            setLinearKey(dOpac, inSec, params.opacity || 85);
            setLinearKey(dOpac, outSec, 0);
        }
    } else if (params.behavior === "jumpCut" && layers.length > 0) {
        var jumpInt = params.jumpInterval || rngInt(rng, 6, 12);
        var jumpRad = params.jumpRadius || rngInt(rng, 40, 120);
        var jFrames = Math.round(dur * fps);
        for (var ji = jumpInt; ji < jFrames; ji += jumpInt) {
            var jumpTime = snapToFrame(inSec + framesToSeconds(ji, fps), fps);
            if (jumpTime < outSec) {
                for (var jli = 0; jli < layers.length; jli++) {
                    var jPos = layers[jli].property("Position");
                    var basePos = jPos.value || [x, y];
                    setHoldKey(jPos, jumpTime, [
                        basePos[0] + rngInt(rng, -jumpRad, jumpRad),
                        basePos[1] + rngInt(rng, -jumpRad, jumpRad)
                    ]);
                }
            }
        }
    }

    return layers;
}


/**
 * Build a corrupted text overlay element.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           lines, behavior, driftDir, driftSpeed,
 *           corruption, corruptType, corruptRate,
 *           opacity, fontSize }
 */
function buildTextOverlay(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var spd = params.speedMult || 1;
    var fontSize = Math.round((params.fontSize || FSIZE_TEXT_OVER) * sc);
    var lineHeight = fontSize + 4;
    var lines = params.lines || ["ERROR"];

    if (params.behavior === "vScroll") {
        // Single text layer, lines push up from bottom
        var allText = lines.join("\n");
        var tl = createTextLayer(targetComp, allText,
            FONT_MONO, fontSize, C_TEXT_OVERLAY,
            params.x, params.y,
            ParagraphJustification.LEFT_JUSTIFY);
        tl.name = "WEFX_Text";
        tl.property("Opacity").setValue(params.opacity || 70);
        setLayerTime(tl, inSec, outSec, targetComp);

        // Scroll upward
        var scrollDist = lines.length * lineHeight + params.compH / 2;
        var posProp = tl.property("Position");
        setLinearKey(posProp, inSec, [params.x, params.y + scrollDist / 2]);
        setLinearKey(posProp, outSec, [params.x, params.y - scrollDist / 2]);

        layers.push(tl);
    } else {
        // One text layer per line
        for (var li = 0; li < lines.length; li++) {
            var lineY = params.y + li * lineHeight;
            var lineText = lines[li];
            var lineTL = createTextLayer(targetComp, lineText,
                FONT_MONO, fontSize, C_TEXT_OVERLAY,
                params.x, lineY,
                ParagraphJustification.LEFT_JUSTIFY);
            lineTL.name = "WEFX_Text_L" + li;
            lineTL.property("Opacity").setValue(params.opacity || rngInt(rng, 50, 90));
            setLayerTime(lineTL, inSec, outSec, targetComp);

            if (params.behavior === "hScan") {
                // Reveal left to right via position/opacity
                var scanSpeed = rngInt(rng, 8, 20); // chars per frame
                var revealFrames = Math.ceil(lineText.length / scanSpeed);
                var srcText = lineTL.property("Source Text");
                for (var si = 0; si <= revealFrames; si++) {
                    var charCount = Math.min(si * scanSpeed, lineText.length);
                    var scanTime = snapToFrame(inSec + framesToSeconds(si, fps), fps);
                    if (scanTime < outSec) {
                        var td = srcText.value;
                        td.text = lineText.substring(0, charCount);
                        setHoldKey(srcText, scanTime, td);
                    }
                }
            } else if (params.behavior === "ghostDrift") {
                var gDir = (params.driftDir === "up") ? -1 : 1;
                var gSpd = (params.driftSpeed || rngFloat(rng, 0.3, 1)) * spd;
                var gDist = gSpd * Math.round(dur * fps) * gDir;
                var gPos = lineTL.property("Position");
                setLinearKey(gPos, inSec, [params.x, lineY]);
                setLinearKey(gPos, outSec, [params.x, lineY + gDist]);
                lineTL.property("Opacity").setValue(rngInt(rng, 30, 50));
            }

            // Character corruption via hold keyframes
            if (params.corruption) {
                var cRate = params.corruptRate || rngInt(rng, 8, 16);
                var cFrames = Math.round(dur * fps);
                var cSrcText = lineTL.property("Source Text");
                for (var ci = cRate; ci < cFrames; ci += cRate) {
                    var cTime = snapToFrame(inSec + framesToSeconds(ci, fps), fps);
                    if (cTime < outSec) {
                        var cTd = cSrcText.value;
                        cTd.text = corruptString(lineText, rng, 0.2);
                        setHoldKey(cSrcText, cTime, cTd);
                    }
                }
            }

            layers.push(lineTL);
        }
    }

    return layers;
}


/**
 * Build a cursor artifact element.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           behavior, orbitRadius, orbitSpeed, orbitDir,
 *           targetCorner, seekSpeed, walkInterval, walkRadius,
 *           trailCount, trailOffset, clusterCount, clusterSpread,
 *           size, opacity }
 */
function buildCursor(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var spd = params.speedMult || 1;
    var cursorSize = Math.round((params.size || CURSOR_HEIGHT) * sc);

    // Windows arrow cursor polygon (scaled to cursorSize)
    var scale = cursorSize / 22;
    var cursorVerts = [
        [0 * scale, 0 * scale],
        [0 * scale, 18 * scale],
        [4.5 * scale, 14 * scale],
        [7 * scale, 20 * scale],
        [9 * scale, 19 * scale],
        [5.5 * scale, 13 * scale],
        [11 * scale, 13 * scale]
    ];

    function makeCursorLayer(cx, cy, opacity) {
        var cl = targetComp.layers.addShape();
        cl.name = "WEFX_Cursor";
        var cc = cl.property("Contents");
        addPath(cc, "Arrow", cursorVerts, true, C_CURSOR_FILL, C_CURSOR_STROKE, 1);
        cl.property("Position").setValue([cx, cy]);
        cl.property("Anchor Point").setValue([0, 0]);
        cl.property("Opacity").setValue(opacity || params.opacity || 100);
        setLayerTime(cl, inSec, outSec, targetComp);
        return cl;
    }

    if (params.behavior === "frozen") {
        var cl = makeCursorLayer(params.x, params.y, params.opacity);
        layers.push(cl);

    } else if (params.behavior === "orbit") {
        var orbitCl = makeCursorLayer(params.x, params.y, params.opacity);
        var orbitPos = orbitCl.property("Position");
        var oRadius = Math.round((params.orbitRadius || rngInt(rng, 40, 120)) * sc);
        var oSpeed = (params.orbitSpeed || rngFloat(rng, 4, 12)) * spd;
        var oDir = params.orbitDir || 1;
        var totalOrbitFrames = Math.round(dur * fps);
        for (var oi = 0; oi <= totalOrbitFrames; oi += 2) {
            var angle = (oi * oSpeed * oDir) * Math.PI / 180;
            var ox = params.x + oRadius * Math.cos(angle);
            var oy = params.y + oRadius * Math.sin(angle);
            var oTime = snapToFrame(inSec + framesToSeconds(oi, fps), fps);
            if (oTime <= outSec) {
                setLinearKey(orbitPos, oTime, [ox, oy]);
            }
        }
        layers.push(orbitCl);

    } else if (params.behavior === "cornerSeek") {
        var corner = params.targetCorner || rngPick(rng, ["TL", "TR", "BL", "BR"]);
        var targetX = (corner === "TL" || corner === "BL") ? 0 : params.compW;
        var targetY = (corner === "TL" || corner === "TR") ? 0 : params.compH;
        var seekCl = makeCursorLayer(params.x, params.y, params.opacity);
        var seekPos = seekCl.property("Position");
        setLinearKey(seekPos, inSec, [params.x, params.y]);
        setLinearKey(seekPos, outSec, [targetX, targetY]);
        layers.push(seekCl);

    } else if (params.behavior === "randomWalk") {
        var walkCl = makeCursorLayer(params.x, params.y, params.opacity);
        var walkPos = walkCl.property("Position");
        var wInterval = params.walkInterval || rngInt(rng, 8, 16);
        var wRadius = params.walkRadius || rngInt(rng, 40, 80);
        var wFrames = Math.round(dur * fps);
        var wx = params.x, wy = params.y;
        setHoldKey(walkPos, inSec, [wx, wy]);
        for (var wi = wInterval; wi < wFrames; wi += wInterval) {
            wx = clamp(wx + rngInt(rng, -wRadius, wRadius), 0, params.compW);
            wy = clamp(wy + rngInt(rng, -wRadius, wRadius), 0, params.compH);
            var wTime = snapToFrame(inSec + framesToSeconds(wi, fps), fps);
            if (wTime < outSec) {
                setHoldKey(walkPos, wTime, [wx, wy]);
            }
        }
        layers.push(walkCl);

    } else if (params.behavior === "glitchStutter") {
        var stutterCl = makeCursorLayer(params.x, params.y, params.opacity);
        var stutterPos = stutterCl.property("Position");
        var sFrames = Math.round(dur * fps);
        var sx = params.x, sy = params.y;
        var sStep = 8;
        for (var sti = 0; sti < sFrames; sti += 2) {
            var sTime = snapToFrame(inSec + framesToSeconds(sti, fps), fps);
            if (sTime < outSec) {
                if (sti % 4 < 2) {
                    sx += sStep;
                } else {
                    sx = params.x + (sti / sFrames) * sStep * 2;
                }
                setHoldKey(stutterPos, sTime, [sx, sy]);
            }
        }
        layers.push(stutterCl);

    } else if (params.behavior === "ghostTrail") {
        var trailN = params.trailCount || rngInt(rng, 2, 6);
        var trailOff = params.trailOffset || rngInt(rng, 3, 6);
        for (var gt = 0; gt < trailN; gt++) {
            var trailOpacity = Math.max(20, 100 - gt * (80 / trailN));
            var trailDelay = gt * framesToSeconds(trailOff, fps);
            var trailIn = snapToFrame(inSec + trailDelay, fps);
            if (trailIn >= outSec) break;
            var trailCl = targetComp.layers.addShape();
            trailCl.name = "WEFX_Cursor_Trail";
            var trailCC = trailCl.property("Contents");
            addPath(trailCC, "Arrow", cursorVerts, true, C_CURSOR_FILL, C_CURSOR_STROKE, 1);
            trailCl.property("Position").setValue([params.x, params.y]);
            trailCl.property("Anchor Point").setValue([0, 0]);
            trailCl.property("Opacity").setValue(trailOpacity);
            setLayerTime(trailCl, trailIn, outSec, targetComp);
            // Simple drift motion for each trail cursor
            var trailPos = trailCl.property("Position");
            var trailDx = rngFloat(rng, -2, 2);
            var trailDy = rngFloat(rng, -2, 2);
            var trailFrames = Math.round((outSec - trailIn) * fps);
            setLinearKey(trailPos, trailIn, [params.x, params.y]);
            setLinearKey(trailPos, outSec, [
                params.x + trailDx * trailFrames,
                params.y + trailDy * trailFrames
            ]);
            layers.push(trailCl);
        }

    } else if (params.behavior === "cluster") {
        var clusterN = params.clusterCount || rngInt(rng, 4, 8);
        var clusterSpread = params.clusterSpread || rngInt(rng, 30, 60);
        for (var ci = 0; ci < clusterN; ci++) {
            var clx = params.x + rngInt(rng, -clusterSpread, clusterSpread);
            var cly = params.y + rngInt(rng, -clusterSpread, clusterSpread);
            var clOpacity = rngInt(rng, 60, 100);
            var clCursor = makeCursorLayer(clx, cly, clOpacity);
            // Some cluster cursors orbit, some are frozen
            if (rngBool(rng, 0.4)) {
                var clPos = clCursor.property("Position");
                var clRad = rngInt(rng, 10, 30);
                var clSpd = rngFloat(rng, 2, 8);
                var clFrames = Math.round(dur * fps);
                for (var cfi = 0; cfi <= clFrames; cfi += 3) {
                    var cAngle = (cfi * clSpd) * Math.PI / 180;
                    var cfTime = snapToFrame(inSec + framesToSeconds(cfi, fps), fps);
                    if (cfTime <= outSec) {
                        setLinearKey(clPos, cfTime, [
                            clx + clRad * Math.cos(cAngle),
                            cly + clRad * Math.sin(cAngle)
                        ]);
                    }
                }
            }
            layers.push(clCursor);
        }
    }

    return layers;
}


/**
 * Build pixel corruption blocks.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           behavior, blockCount, crawlRadius, crawlInterval,
 *           tearY, colors, w, h, opacity }
 */
function buildPixelBlock(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var dur = outSec - inSec;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var blockW = Math.round((params.w || rngInt(rng, 4, 40)) * sc);
    var blockH = Math.round((params.h || rngInt(rng, 2, 20)) * sc);
    var colors = params.colors || C_PIXEL_COLORS;

    if (params.behavior === "flash") {
        var flashShape = targetComp.layers.addShape();
        flashShape.name = "WEFX_Pixel";
        var flashContents = flashShape.property("Contents");
        var flashColor = rngPick(rng, colors);
        addRect(flashContents, "Block", blockW, blockH, 0, 0, flashColor, null, 0);
        flashShape.property("Position").setValue([params.x, params.y]);
        flashShape.property("Opacity").setValue(params.opacity || 100);
        setLayerTime(flashShape, inSec, outSec, targetComp);
        layers.push(flashShape);

    } else if (params.behavior === "stutterHold") {
        var shShape = targetComp.layers.addShape();
        shShape.name = "WEFX_Pixel";
        var shContents = shShape.property("Contents");
        addRect(shContents, "Block", blockW, blockH, 0, 0, rngPick(rng, colors), null, 0);
        shShape.property("Position").setValue([params.x, params.y]);
        setLayerTime(shShape, inSec, outSec, targetComp);
        // Flicker: alternate visible/invisible every 2 frames
        var shOpac = shShape.property("Opacity");
        var shFrames = Math.round(dur * fps);
        for (var si = 0; si < shFrames; si += 2) {
            var sTime = snapToFrame(inSec + framesToSeconds(si, fps), fps);
            if (sTime < outSec) {
                setHoldKey(shOpac, sTime, (si % 4 < 2) ? (params.opacity || 100) : 0);
            }
        }
        layers.push(shShape);

    } else if (params.behavior === "hTear") {
        var tearShape = targetComp.layers.addShape();
        tearShape.name = "WEFX_Pixel_Tear";
        var tearContents = tearShape.property("Contents");
        var tearH = rngInt(rng, 1, 3);
        var tearW = rngInt(rng, params.compW / 2, params.compW);
        addRect(tearContents, "Tear", tearW, tearH, 0, 0,
            rngPick(rng, colors), null, 0);
        tearShape.property("Position").setValue([params.compW / 2, params.tearY || params.y]);
        tearShape.property("Opacity").setValue(params.opacity || 100);
        setLayerTime(tearShape, inSec, outSec, targetComp);
        layers.push(tearShape);

    } else if (params.behavior === "blockCrawl") {
        var bCount = params.blockCount || rngInt(rng, 3, 6);
        var bRadius = params.crawlRadius || rngInt(rng, 30, 80);
        var bInterval = params.crawlInterval || rngInt(rng, 4, 8);
        for (var bi = 0; bi < bCount; bi++) {
            var bx = params.x + rngInt(rng, -bRadius, bRadius);
            var by = params.y + rngInt(rng, -bRadius, bRadius);
            var bw = rngInt(rng, 4, 20);
            var bh = rngInt(rng, 2, 12);
            var bShape = targetComp.layers.addShape();
            bShape.name = "WEFX_Pixel_Crawl";
            var bContents = bShape.property("Contents");
            addRect(bContents, "Block", bw, bh, 0, 0, rngPick(rng, colors), null, 0);
            bShape.property("Position").setValue([bx, by]);
            bShape.property("Opacity").setValue(params.opacity || 90);
            setLayerTime(bShape, inSec, outSec, targetComp);
            // Jump to nearby positions
            var bPos = bShape.property("Position");
            var crawlFrames = Math.round(dur * fps);
            for (var cfi = bInterval; cfi < crawlFrames; cfi += bInterval) {
                var cTime = snapToFrame(inSec + framesToSeconds(cfi, fps), fps);
                if (cTime < outSec) {
                    bx = clamp(bx + rngInt(rng, -20, 20), params.x - bRadius, params.x + bRadius);
                    by = clamp(by + rngInt(rng, -20, 20), params.y - bRadius, params.y + bRadius);
                    setHoldKey(bPos, cTime, [bx, by]);
                }
            }
            layers.push(bShape);
        }
    }

    return layers;
}


// ════════════════════════════════════════════════════════════════
// SECTION 5 — GLOBAL OVERLAYS
// ════════════════════════════════════════════════════════════════

/**
 * Build full-comp scan lines overlay.
 * Uses a single rectangle + Repeater for performance.
 * opts: { opacity, spacing, jitter }
 */
function buildScanLines(comp, opts) {
    var opacity = (opts && opts.opacity != null) ? opts.opacity : DEFAULT_SCANLINE_OPACITY;
    var spacing = (opts && opts.spacing != null) ? opts.spacing : DEFAULT_SCANLINE_SPACING;
    var jitter = (opts && opts.jitter);
    if (spacing < 1) spacing = 1;

    var sl = comp.layers.addShape();
    sl.name = "WEFX_ScanLines";
    sl.property("Opacity").setValue(opacity);
    sl.blendingMode = BlendingMode.MULTIPLY;
    sl.inPoint = 0;
    sl.outPoint = comp.duration;

    var contents = sl.property("Contents");

    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Line";
    var gc = group.property("Contents");
    var rect = gc.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([comp.width, 1]);
    rect.property("Position").setValue([0, -(comp.height / 2)]);
    var fill = gc.addProperty("ADBE Vector Graphic - Fill");
    fill.property("Color").setValue([0, 0, 0]);

    var lineCount = Math.ceil(comp.height / spacing);
    var repeater = contents.addProperty("ADBE Vector Filter - Repeater");
    repeater.property("ADBE Vector Repeater Copies").setValue(lineCount);
    var repTransform = repeater.property("ADBE Vector Repeater Transform");
    repTransform.property("ADBE Vector Repeater Position").setValue([0, spacing]);

    sl.property("Position").setValue([comp.width / 2, comp.height / 2]);

    // Jitter: periodic 1px vertical shift via hold keyframes
    if (jitter) {
        var posProp = sl.property("Position");
        var basePos = [comp.width / 2, comp.height / 2];
        var jitterInterval = 30; // frames between jitters
        var totalFrames = Math.round(comp.duration * comp.frameRate);
        for (var ji = 0; ji < totalFrames; ji += jitterInterval) {
            var jTime = ji / comp.frameRate;
            setHoldKey(posProp, jTime, basePos);
            var jShiftTime = jTime + 1 / comp.frameRate;
            if (jShiftTime < comp.duration) {
                setHoldKey(posProp, jShiftTime, [basePos[0], basePos[1] + 1]);
                var jReturnTime = jShiftTime + 1 / comp.frameRate;
                if (jReturnTime < comp.duration) {
                    setHoldKey(posProp, jReturnTime, basePos);
                }
            }
        }
    }

    return sl;
}

/**
 * Build noise overlay. Tries Fractal Noise for better quality/control,
 * falls back to Noise HLS Auto if unavailable.
 * opts: { opacity, scale, complexity }
 */
function buildNoise(comp, opts) {
    var opacity = (opts && opts.opacity != null) ? opts.opacity : DEFAULT_NOISE_OPACITY;
    var scale = (opts && opts.scale != null) ? opts.scale : DEFAULT_NOISE_SCALE;
    var complexity = (opts && opts.complexity != null) ? opts.complexity : DEFAULT_NOISE_COMPLEXITY;

    var solid = comp.layers.addSolid(
        [0.5, 0.5, 0.5], "WEFX_Noise",
        comp.width, comp.height, 1.0
    );
    solid.blendingMode = BlendingMode.OVERLAY;
    solid.property("Opacity").setValue(opacity);
    solid.inPoint = 0;
    solid.outPoint = comp.duration;

    var usedFractal = false;

    // Try Fractal Noise first (better control, animated grain)
    try {
        var fractalEffect = solid.property("Effects").addProperty("ADBE Fractal Noise");
        if (fractalEffect) {
            fractalEffect.property("Contrast").setValue(120);
            fractalEffect.property("Brightness").setValue(-20);
            fractalEffect.property("Complexity").setValue(complexity);
            // Scale controls grain size: smaller = finer static
            try { fractalEffect.property("Scale").setValue(scale); } catch (e2) {}
            // Animate evolution so noise changes each frame
            try {
                var evo = fractalEffect.property("Evolution");
                evo.expression = "time * 360 * 5";
            } catch (e3) {}
            usedFractal = true;
        }
    } catch (e) {
        // Fractal Noise not available
    }

    // Fallback to Noise HLS Auto
    if (!usedFractal) {
        try {
            var noiseEffect = solid.property("Effects").addProperty("ADBE Noise HLS Auto");
            if (noiseEffect) {
                noiseEffect.property("Noise").setValue(30);
            }
        } catch (e) {}
    }

    return solid;
}

/**
 * Build head scratch overlay — bright horizontal flash lines that appear
 * periodically across the comp, simulating VHS/CRT signal distortion.
 * opts: { freq, height }
 */
function buildHeadScratch(comp, opts) {
    var freq = (opts && opts.freq != null) ? opts.freq : DEFAULT_HEADSCRATCH_FREQ;
    var scratchH = (opts && opts.height != null) ? opts.height : DEFAULT_HEADSCRATCH_HEIGHT;
    if (freq < 2) freq = 2;

    var sl = comp.layers.addShape();
    sl.name = "WEFX_HeadScratch";
    sl.blendingMode = BlendingMode.ADD;
    sl.inPoint = 0;
    sl.outPoint = comp.duration;

    var contents = sl.property("Contents");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = "Scratch";
    var gc = group.property("Contents");
    var rect = gc.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([comp.width, scratchH]);
    var scratchFill = gc.addProperty("ADBE Vector Graphic - Fill");
    scratchFill.property("Color").setValue([0.9, 1, 1]); // slight cyan tint

    sl.property("Position").setValue([comp.width / 2, comp.height / 2]);

    // Flash on/off via opacity hold keyframes
    var opacProp = sl.property("Opacity");
    var posProp = sl.property("Position");
    var fps = comp.frameRate;
    var totalFrames = Math.round(comp.duration * fps);
    var rng = createRNG(42); // deterministic for head scratch

    opacProp.setValue(0); // default off
    for (var fi = freq; fi < totalFrames; fi += freq) {
        var scratchTime = fi / fps;
        var scratchDur = rngInt(rng, 2, 4); // 2-4 frames visible
        var scratchY = rngInt(rng, 0, comp.height);

        setHoldKey(opacProp, scratchTime, 60);
        setHoldKey(posProp, scratchTime, [comp.width / 2, scratchY]);

        var offTime = (fi + scratchDur) / fps;
        if (offTime < comp.duration) {
            setHoldKey(opacProp, offTime, 0);
        }
    }

    return sl;
}


// ════════════════════════════════════════════════════════════════
// SECTION 6 — SCHEDULER
// ════════════════════════════════════════════════════════════════

/**
 * Calculate total element count from chaos and comp duration.
 * Returns 0 for chaos 0.
 */
function calcElementCount(chaos, totalFrames) {
    if (chaos <= 0) return 0;
    var normalized = chaos / 100;
    // Power curve: gentle at low chaos, steep at high
    var count = Math.pow(normalized, 1.5) * 50 * (totalFrames / 240);
    return Math.max(1, Math.round(count));
}

/**
 * Distribute spawn times across the comp using a chaos curve.
 * Returns sorted array of integer frame numbers.
 */
function distributeTimes(count, totalFrames, curve, rng) {
    var times = [];
    var i;
    var maxFrame = totalFrames - 1;
    if (maxFrame < 0) maxFrame = 0;

    // Pre-compute burst centers if needed
    var burstCenters;
    if (curve === "burst") {
        var numBursts = 2 + (rng() < 0.4 ? 1 : 0);
        burstCenters = [];
        for (var bc = 0; bc < numBursts; bc++) {
            burstCenters.push(rng() * 0.7 + 0.15);
        }
    }
    // Pre-compute random segment weights if needed
    var segWeights, segCumulative;
    if (curve === "random") {
        var numSegs = rngInt(rng, 4, 8);
        segWeights = [];
        segCumulative = [];
        var segTotal = 0;
        for (var sw = 0; sw < numSegs; sw++) {
            var w = rng() * rng() * 3 + 0.1; // heavy variation
            segWeights.push(w);
            segTotal += w;
        }
        var cum = 0;
        for (var sw = 0; sw < numSegs; sw++) {
            cum += segWeights[sw] / segTotal;
            segCumulative.push(cum);
        }
    }

    for (i = 0; i < count; i++) {
        var t;
        if (curve === "build") {
            // Right-skewed: more elements toward the end
            t = Math.max(rng(), rng());
        } else if (curve === "peak") {
            // Bell curve centered at 0.5
            t = (rng() + rng() + rng()) / 3;
        } else if (curve === "burst") {
            // Cluster around pre-computed burst centers
            var burstIdx = i % burstCenters.length;
            var center = burstCenters[burstIdx];
            t = center + (rng() - 0.5) * 0.2;
            t = clamp(t, 0, 1);
        } else if (curve === "random") {
            // Weighted segments: pick a segment based on weights, then uniform within it
            var roll = rng();
            var seg = 0;
            for (var si = 0; si < segCumulative.length; si++) {
                if (roll < segCumulative[si]) { seg = si; break; }
                seg = si;
            }
            var segStart = (seg === 0) ? 0 : segCumulative[seg - 1];
            var segEnd = segCumulative[seg];
            // Map to timeline position: segment covers (seg/numSegs) to ((seg+1)/numSegs) of timeline
            var tStart = seg / segCumulative.length;
            var tEnd = (seg + 1) / segCumulative.length;
            t = tStart + rng() * (tEnd - tStart);
            t = clamp(t, 0, 1);
        } else {
            // "flat" — uniform
            t = rng();
        }

        times.push(Math.round(t * maxFrame));
    }

    // Sort ascending
    times.sort(function(a, b) { return a - b; });
    return times;
}

/**
 * Pick an element type weighted by mix values.
 * mix: { dialog, bsod, text, cursor, pixel } each 0–100
 * Returns type string.
 */
function pickElementType(mix, rng) {
    var types = [
        { name: "dialog", weight: mix.dialog || 0 },
        { name: "bsod",   weight: mix.bsod   || 0 },
        { name: "text",   weight: mix.text   || 0 },
        { name: "cursor", weight: mix.cursor || 0 },
        { name: "pixel",  weight: mix.pixel  || 0 }
    ];

    var totalWeight = 0;
    var i;
    for (i = 0; i < types.length; i++) {
        totalWeight += types[i].weight;
    }

    if (totalWeight <= 0) return "dialog"; // fallback

    var roll = rng() * totalWeight;
    var cumulative = 0;
    for (i = 0; i < types.length; i++) {
        cumulative += types[i].weight;
        if (roll < cumulative) {
            return types[i].name;
        }
    }

    return types[types.length - 1].name;
}

/**
 * Pick element duration in frames, respecting floor rules.
 */
function pickDuration(type, minFrames, maxFrames, rng) {
    var floor = (type === "pixel") ? FLOOR_PIXEL_BLOCK : FLOOR_FRAMES;
    var effectiveMin = Math.max(floor, minFrames || floor);
    var effectiveMax = Math.max(effectiveMin, maxFrames || MAX_FRAMES);
    return rngInt(rng, effectiveMin, effectiveMax);
}

/**
 * Assign "over" or "under" layer based on type and roto mode.
 * Roto interaction matrix from spec.
 */
function assignLayer(type, rotoMode, rng) {
    if (rotoMode === "flat" || rotoMode === "allOver") return "over";
    if (rotoMode === "allUnder") return "under";

    // Split mode: weighted by type
    if (type === "bsod")   return rngBool(rng, 0.80) ? "under" : "over";
    if (type === "dialog") return rngBool(rng, 0.50) ? "over"  : "under";
    if (type === "chrome") return "over";
    if (type === "text")   return rngBool(rng, 0.70) ? "over"  : "under";
    if (type === "cursor") return rngBool(rng, 0.90) ? "over"  : "under";
    if (type === "pixel")  return rngBool(rng, 0.50) ? "over"  : "under";

    return "over";
}

/**
 * Pick a weighted random item from a list of {value, weight} pairs.
 */
function weightedPick(items, rng) {
    var total = 0;
    var i;
    for (i = 0; i < items.length; i++) total += items[i].weight;
    if (total <= 0) return items[0].value;
    var roll = rng() * total;
    var cum = 0;
    for (i = 0; i < items.length; i++) {
        cum += items[i].weight;
        if (roll < cum) return items[i].value;
    }
    return items[items.length - 1].value;
}

/**
 * Build a full ElementJob for a given element type.
 * This is the core job-creation function that picks all behaviors and parameters.
 */
function buildJob(type, inFrame, outFrame, layer, settings, compInfo, rng) {
    var job = {
        type: type,
        layer: layer,
        inFrame: inFrame,
        outFrame: outFrame,
        inPoint: inFrame / compInfo.frameRate,
        outPoint: outFrame / compInfo.frameRate,
        compW: compInfo.width,
        compH: compInfo.height,
        opacity: 100
    };

    var style = settings.animStyle || "xpClassic";
    var margin = 40; // margin from edges for spawning

    // Chrome fragments are a sub-type of dialog
    if (type === "dialog" && rngBool(rng, 0.25)) {
        type = "chrome";
        job.type = "chrome";
    }

    if (type === "bsod") {
        job.variant = weightedPick([
            { value: "fullStrip", weight: 40 },
            { value: "corner",    weight: 30 },
            { value: "island",    weight: 30 }
        ], rng);

        job.behavior = weightedPick([
            { value: "static",   weight: (style === "slowBurn") ? 80 : 60 },
            { value: "slideH",   weight: (style === "glitchHeavy") ? 25 : 15 },
            { value: "slideV",   weight: 10 },
            { value: "stutter",  weight: (style === "glitchHeavy") ? 20 : 10 },
            { value: "snapEdge", weight: 5 }
        ], rng);

        job.textBehavior = weightedPick([
            { value: "static",      weight: 70 },
            { value: "typewriter",  weight: 15 },
            { value: "lineShuffle", weight: 15 }
        ], rng);

        job.slideDir = rngPick(rng, ["left", "right", "up", "down"]);
        job.slideSpeed = rngInt(rng, 20, 80);
        job.stutterFrame = rngInt(rng, 4, Math.max(5, Math.round((outFrame - inFrame) / 2)));
        job.stutterDur = rngInt(rng, 3, 6);
        job.textLines = pickBSODLines(rng, rngInt(rng, 3, 8));
        job.opacity = rngInt(rng, 80, 95);

        // Position based on variant
        if (job.variant === "fullStrip") {
            job.x = compInfo.width / 2;
            job.y = rngBool(rng, 0.5) ? rngInt(rng, 0, 100) : rngInt(rng, compInfo.height - 120, compInfo.height);
        } else if (job.variant === "corner") {
            var corner = rngPick(rng, ["TL", "TR", "BL", "BR"]);
            job.x = (corner === "TL" || corner === "BL") ? rngInt(rng, -50, 100) : rngInt(rng, compInfo.width - 200, compInfo.width + 50);
            job.y = (corner === "TL" || corner === "TR") ? rngInt(rng, -20, 80) : rngInt(rng, compInfo.height - 120, compInfo.height + 20);
        } else {
            job.x = rngInt(rng, margin, compInfo.width - margin);
            job.y = rngInt(rng, margin, compInfo.height - margin);
        }

    } else if (type === "dialog") {
        job.title = pickWindowTitle(rng, settings.customTitles || []);
        job.body = pickErrorMessage(rng, settings.customMessages || []);
        job.buttons = rngPick(rng, BUTTON_COMBOS);
        job.icon = weightedPick([
            { value: "error",    weight: 40 },
            { value: "warning",  weight: 30 },
            { value: "question", weight: 20 },
            { value: "none",     weight: 10 }
        ], rng);

        job.arrivalBehavior = weightedPick([
            { value: "pop",      weight: 60 },
            { value: "scalePop", weight: 20 },
            { value: "slideIn",  weight: 20 }
        ], rng);

        job.lifeBehavior = weightedPick([
            { value: "static", weight: (style === "slowBurn") ? 60 : 40 },
            { value: "drift",  weight: (style === "slowBurn") ? 30 : 30 },
            { value: "shake",  weight: (style === "glitchHeavy") ? 50 : 30 }
        ], rng);

        job.exitBehavior = weightedPick([
            { value: "cut",      weight: 50 },
            { value: "collapse", weight: 25 },
            { value: "slideOff", weight: 25 }
        ], rng);

        job.driftDir = rngFloat(rng, 0, 360);
        job.driftSpeed = rngFloat(rng, 0.5, 2);
        job.shakeFrame = rngInt(rng, 4, Math.max(5, outFrame - inFrame - 20));
        job.shakeDur = rngInt(rng, 8, 16);
        job.stackIndex = 0; // assigned later by assignDialogStacks
        job.opacity = rngInt(rng, 85, 98);

        job.x = rngInt(rng, margin, compInfo.width - DIALOG_WIDTH - margin) + DIALOG_WIDTH / 2;
        job.y = rngInt(rng, margin, compInfo.height - DIALOG_HEIGHT - margin) + DIALOG_HEIGHT / 2;

    } else if (type === "chrome") {
        job.fragmentType = weightedPick([
            { value: "titleBar",   weight: 30 },
            { value: "buttonRow",  weight: 20 },
            { value: "closeBtn",   weight: 20 },
            { value: "scrollbar",  weight: 15 },
            { value: "titleStack", weight: 15 }
        ], rng);

        job.behavior = weightedPick([
            { value: "flicker", weight: 40 },
            { value: "drift",   weight: 35 },
            { value: "jumpCut", weight: (style === "glitchHeavy") ? 50 : 25 }
        ], rng);

        job.title = pickWindowTitle(rng, settings.customTitles || []);
        job.driftDir = rngFloat(rng, 0, 360);
        job.driftSpeed = rngFloat(rng, 0.5, 2);
        job.jumpInterval = rngInt(rng, 6, 12);
        job.jumpRadius = rngInt(rng, 40, 120);
        job.stackCount = rngInt(rng, 3, 6);
        job.opacity = rngInt(rng, 70, 90);

        job.x = rngInt(rng, 0, compInfo.width);
        job.y = rngInt(rng, 0, compInfo.height);

    } else if (type === "text") {
        var lineCount = rngInt(rng, 1, 6);
        job.lines = pickCorruptLines(rng, lineCount);
        job.behavior = weightedPick([
            { value: "static",     weight: 30 },
            { value: "hScan",      weight: 25 },
            { value: "vScroll",    weight: 25 },
            { value: "ghostDrift", weight: 20 }
        ], rng);

        job.driftDir = rngPick(rng, ["up", "down"]);
        job.driftSpeed = rngFloat(rng, 0.3, 1);
        job.corruption = rngBool(rng, (style === "glitchHeavy") ? 0.6 : 0.4);
        job.corruptType = rngPick(rng, ["swap", "block", "dropout"]);
        job.corruptRate = rngInt(rng, 8, 16);
        job.opacity = rngInt(rng, 50, 85);
        job.fontSize = FSIZE_TEXT_OVER;

        job.x = rngInt(rng, margin, compInfo.width - margin);
        job.y = rngInt(rng, margin, compInfo.height - margin);

    } else if (type === "cursor") {
        job.behavior = weightedPick([
            { value: "frozen",       weight: 25 },
            { value: "orbit",        weight: 15 },
            { value: "cornerSeek",   weight: 15 },
            { value: "randomWalk",   weight: 15 },
            { value: "glitchStutter",weight: (style === "glitchHeavy") ? 20 : 10 },
            { value: "ghostTrail",   weight: 10 },
            { value: "cluster",      weight: 10 }
        ], rng);

        job.orbitRadius = rngInt(rng, 40, 120);
        job.orbitSpeed = rngFloat(rng, 4, 12);
        job.orbitDir = rngPick(rng, [1, -1]);
        job.targetCorner = rngPick(rng, ["TL", "TR", "BL", "BR"]);
        job.seekSpeed = rngInt(rng, 6, 18);
        job.walkInterval = rngInt(rng, 8, 16);
        job.walkRadius = rngInt(rng, 40, 80);
        job.trailCount = rngInt(rng, 2, 6);
        job.trailOffset = rngInt(rng, 3, 6);
        job.clusterCount = rngInt(rng, 4, 8);
        job.clusterSpread = rngInt(rng, 30, 60);
        job.size = CURSOR_HEIGHT;
        job.opacity = rngInt(rng, 80, 100);

        job.x = rngInt(rng, margin, compInfo.width - margin);
        job.y = rngInt(rng, margin, compInfo.height - margin);

    } else if (type === "pixel") {
        job.behavior = weightedPick([
            { value: "flash",       weight: 40 },
            { value: "stutterHold", weight: 25 },
            { value: "hTear",       weight: 20 },
            { value: "blockCrawl",  weight: 15 }
        ], rng);

        job.blockCount = rngInt(rng, 3, 6);
        job.crawlRadius = rngInt(rng, 30, 80);
        job.crawlInterval = rngInt(rng, 4, 8);
        job.tearY = rngInt(rng, 0, compInfo.height);
        job.colors = C_PIXEL_COLORS;
        job.w = rngInt(rng, 4, 40);
        job.h = rngInt(rng, 2, 20);
        job.opacity = rngInt(rng, 80, 100);

        job.x = rngInt(rng, 0, compInfo.width);
        job.y = rngInt(rng, 0, compInfo.height);
    }

    return job;
}

/**
 * Find dialogs with the same title and assign stackIndex for cascade effect.
 * Mutates jobs in place.
 */
function assignDialogStacks(jobs, rng, maxDepth) {
    var stackMax = maxDepth || MAX_STACK_DEPTH;
    // Group dialogs by title
    var groups = {};
    var i;
    for (i = 0; i < jobs.length; i++) {
        if (jobs[i].type === "dialog" && jobs[i].title) {
            var title = jobs[i].title;
            if (!groups[title]) groups[title] = [];
            groups[title].push(i);
        }
    }

    // For groups with 2+ dialogs, assign stack indices
    for (var key in groups) {
        if (groups.hasOwnProperty(key)) {
            var indices = groups[key];
            if (indices.length < 2) continue;
            indices.sort(function(a, b) {
                return jobs[a].inFrame - jobs[b].inFrame;
            });
            var depth = Math.min(indices.length, stackMax);
            for (var si = 0; si < depth; si++) {
                jobs[indices[si]].stackIndex = si;
            }
        }
    }
}

/**
 * Master scheduler. Given user settings and comp info, returns array of ElementJobs.
 * Pure function — no AE API calls.
 */
function schedule(settings, compInfo) {
    var rng = createRNG(settings.seed);
    var chaos = (settings.chaos != null) ? settings.chaos : 100;
    var totalFrames = compInfo.totalFrames;
    var curve = settings.chaosCurve || "flat";
    var counts = settings.counts || { dialog: 0, bsod: 0, text: 0, cursor: 0, pixel: 0 };
    var rotoMode = settings.rotoMode || "flat";

    // Apply animation style duration modifiers
    var style = settings.animStyle || "xpClassic";
    var minF = settings.minFrames || FLOOR_FRAMES;
    var maxF = settings.maxFrames || MAX_FRAMES;

    if (style === "slowBurn") {
        minF = Math.max(minF, 16);
        maxF = Math.max(maxF, MAX_FRAMES);
    } else if (style === "chaosMax") {
        maxF = Math.min(maxF, 36);
    }

    // Determine element types to spawn
    var typeList = [];  // pre-determined type strings
    var typeNames = ["dialog", "bsod", "text", "cursor", "pixel"];
    var totalCounts = 0;
    var ti;
    for (ti = 0; ti < typeNames.length; ti++) {
        totalCounts += (counts[typeNames[ti]] || 0);
    }

    if (totalCounts > 0) {
        // Exact counts mode: build specified number of each type
        for (ti = 0; ti < typeNames.length; ti++) {
            var n = counts[typeNames[ti]] || 0;
            for (var ci = 0; ci < n; ci++) {
                typeList.push(typeNames[ti]);
            }
        }
        // Shuffle so types are distributed across time (Fisher-Yates)
        for (var si = typeList.length - 1; si > 0; si--) {
            var j = rngInt(rng, 0, si);
            var tmp = typeList[si];
            typeList[si] = typeList[j];
            typeList[j] = tmp;
        }
    } else {
        // Auto mode: chaos determines total count, equal type weights
        var autoMix = { dialog: 75, bsod: 50, text: 75, cursor: 50, pixel: 25 };
        var count = calcElementCount(chaos, totalFrames);
        if (count === 0) return [];
        for (var ai = 0; ai < count; ai++) {
            typeList.push(pickElementType(autoMix, rng));
        }
    }

    if (typeList.length === 0) return [];

    // Distribute spawn times
    var spawnTimes = distributeTimes(typeList.length, totalFrames, curve, rng);

    // User-specified element controls
    var scaleFactor = (settings.elementScale || 100) / 100;
    var speedFactor = (settings.speedMult || 100) / 100;
    var opMin = (settings.opacityMin != null) ? settings.opacityMin : 50;
    var opMax = (settings.opacityMax != null) ? settings.opacityMax : 100;
    var stackDepth = settings.stackDepth || MAX_STACK_DEPTH;
    var stackOff = settings.stackOffset || STACK_OFFSET_X;

    // Build jobs
    var jobs = [];
    for (var i = 0; i < spawnTimes.length; i++) {
        var inFrame = spawnTimes[i];
        var type = typeList[i];
        var duration = pickDuration(type, minF, maxF, rng);
        var outFrame = Math.min(inFrame + duration, totalFrames);

        // Enforce minimum duration after clamping
        var actualDur = outFrame - inFrame;
        var floor = (type === "pixel") ? FLOOR_PIXEL_BLOCK : FLOOR_FRAMES;
        if (actualDur < floor) {
            inFrame = Math.max(0, outFrame - floor);
            if (outFrame - inFrame < floor) {
                outFrame = Math.min(inFrame + floor, totalFrames);
            }
        }

        var layerAssign = assignLayer(type, rotoMode, rng);
        var job = buildJob(type, inFrame, outFrame, layerAssign, settings, compInfo, rng);
        // buildJob may convert dialog→chrome; chrome is always over
        if (job.type === "chrome") {
            job.layer = "over";
        }

        // Apply element controls
        job.scale = scaleFactor;
        job.speedMult = speedFactor;
        job.opacity = clamp(job.opacity, opMin, opMax);
        job.entryFrames = settings.entryFrames || DEFAULT_ENTRY_FRAMES;
        job.exitFrames = settings.exitFrames || DEFAULT_EXIT_FRAMES;
        job.stackOffset = stackOff;

        jobs.push(job);
    }

    // Assign dialog stacks (with user-controlled depth)
    assignDialogStacks(jobs, rng, stackDepth);

    return jobs;
}


// ════════════════════════════════════════════════════════════════
// SECTION 7 — ROTO DETECTOR
// ════════════════════════════════════════════════════════════════

/**
 * Returns true if layerName contains any of the keywords (case-insensitive).
 */
function nameMatchesKeyword(name, keywords) {
    var lower = name.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
        if (lower.indexOf(keywords[i].toLowerCase()) !== -1) {
            return true;
        }
    }
    return false;
}

/**
 * Scans a comp for layers matching roto keywords.
 * Returns array of Layer objects.
 */
function detectRotoLayers(comp, keywords, extraKeywords) {
    var allKeywords = [];
    var i;
    for (i = 0; i < keywords.length; i++) {
        allKeywords.push(keywords[i]);
    }
    if (extraKeywords) {
        for (i = 0; i < extraKeywords.length; i++) {
            allKeywords.push(extraKeywords[i]);
        }
    }

    var result = [];
    var numLayers = comp.numLayers;
    for (i = 1; i <= numLayers; i++) {
        var layer = comp.layers[i];
        if (nameMatchesKeyword(layer.name, allKeywords)) {
            result.push(layer);
        }
    }
    return result;
}


// ════════════════════════════════════════════════════════════════
// SECTION 8 — COMPOSITOR
// ════════════════════════════════════════════════════════════════

/**
 * Check if a WindowsErrorFX effect already exists in the comp.
 * Returns the first matching layer, or null.
 */
function findExistingEffect(comp) {
    var n = comp.numLayers;
    for (var i = 1; i <= n; i++) {
        var layer = comp.layers[i];
        if (layer.name.indexOf("WEFX_") === 0 || layer.name.indexOf("WindowsErrorFX") === 0) {
            return layer;
        }
    }
    return null;
}

/**
 * Remove all WindowsErrorFX layers and pre-comps from the comp.
 */
function clearEffect(comp) {
    wlog("clearEffect: scanning " + comp.numLayers + " layers in \"" + comp.name + "\"");
    var toRemove = [];
    var preCompSources = [];
    var n = comp.numLayers;
    var i;
    for (i = 1; i <= n; i++) {
        var layer = comp.layers[i];
        if (layer.name.indexOf("WEFX_") === 0 || layer.name.indexOf("WindowsErrorFX") === 0) {
            toRemove.push(i);
            wlog("  marked for removal: \"" + layer.name + "\" (index " + i + ")");
            if (layer.source && layer.source instanceof CompItem) {
                preCompSources.push(layer.source);
            }
        }
    }

    wlog("clearEffect: removing " + toRemove.length + " layers, " + preCompSources.length + " pre-comp sources");
    for (i = toRemove.length - 1; i >= 0; i--) {
        try {
            comp.layers[toRemove[i]].remove();
        } catch (e) {
            werr("clearEffect: failed to remove layer index " + toRemove[i] + ": " + e.toString());
        }
    }

    for (i = 0; i < preCompSources.length; i++) {
        try {
            wlog("  removing pre-comp source: \"" + preCompSources[i].name + "\"");
            preCompSources[i].remove();
        } catch (e) {
            wwarn("clearEffect: pre-comp source already removed or error: " + e.toString());
        }
    }
    wlog("clearEffect: done");
}

/**
 * Create the pre-comp structure for the effect.
 * In split mode: creates OVER and UNDER comps + scanlines/noise in parent.
 * In flat mode: creates single effect comp.
 */
function createPreCompStructure(parentComp, seed, rotoMode, rotoLayers, settings) {
    wlog("createPreCompStructure: seed=" + seed + " rotoMode=" + rotoMode +
         " rotoLayers=" + (rotoLayers ? rotoLayers.length : 0));
    var isSplit = (rotoMode === "split") && rotoLayers && rotoLayers.length > 0;

    var structure = {
        overComp: null,
        underComp: null,
        flatComp: null,
        overLayer: null,
        underLayer: null,
        flatLayer: null,
        scanLineLayer: null,
        noiseLayer: null,
        headScratchLayer: null
    };

    if (isSplit) {
        structure.overComp = app.project.items.addComp(
            "WindowsErrorFX_OVER_" + seed,
            parentComp.width, parentComp.height,
            1.0, parentComp.duration, parentComp.frameRate
        );
        structure.underComp = app.project.items.addComp(
            "WindowsErrorFX_UNDER_" + seed,
            parentComp.width, parentComp.height,
            1.0, parentComp.duration, parentComp.frameRate
        );

        var rotoTopLayer = rotoLayers[0];
        var rotoBotLayer = rotoLayers[0];
        for (var ri = 1; ri < rotoLayers.length; ri++) {
            if (rotoLayers[ri].index < rotoTopLayer.index) rotoTopLayer = rotoLayers[ri];
            if (rotoLayers[ri].index > rotoBotLayer.index) rotoBotLayer = rotoLayers[ri];
        }

        structure.overLayer = parentComp.layers.add(structure.overComp);
        structure.overLayer.name = "WEFX_OVER";
        structure.overLayer.moveBefore(rotoTopLayer);

        structure.underLayer = parentComp.layers.add(structure.underComp);
        structure.underLayer.name = "WEFX_UNDER";
        structure.underLayer.moveAfter(rotoBotLayer);
    } else {
        structure.flatComp = app.project.items.addComp(
            "WindowsErrorFX_" + seed,
            parentComp.width, parentComp.height,
            1.0, parentComp.duration, parentComp.frameRate
        );
        structure.flatLayer = parentComp.layers.add(structure.flatComp);
        structure.flatLayer.name = "WEFX_Effect";
        structure.flatLayer.moveToBeginning();

        structure.overComp = structure.flatComp;
        structure.underComp = structure.flatComp;
    }

    // Overlays — conditionally built from settings
    var slOpts = settings.scanlines || {};
    var noOpts = settings.noise || {};
    var hsOpts = settings.headScratch || {};

    // Scanlines
    if (slOpts.enabled !== false) {
        wlog("Building scanlines: opacity=" + (slOpts.opacity || DEFAULT_SCANLINE_OPACITY) +
             " spacing=" + (slOpts.spacing || DEFAULT_SCANLINE_SPACING) +
             " jitter=" + (slOpts.jitter || false));
        structure.scanLineLayer = buildScanLines(parentComp, slOpts);
        structure.scanLineLayer.moveToBeginning();
    }

    // Noise
    if (noOpts.enabled !== false) {
        wlog("Building noise: opacity=" + (noOpts.opacity || DEFAULT_NOISE_OPACITY) +
             " scale=" + (noOpts.scale || DEFAULT_NOISE_SCALE) +
             " complexity=" + (noOpts.complexity || DEFAULT_NOISE_COMPLEXITY));
        structure.noiseLayer = buildNoise(parentComp, noOpts);
        structure.noiseLayer.moveToBeginning();
    }

    // Head scratch
    if (hsOpts.enabled) {
        wlog("Building head scratch: freq=" + (hsOpts.freq || DEFAULT_HEADSCRATCH_FREQ) +
             " height=" + (hsOpts.height || DEFAULT_HEADSCRATCH_HEIGHT));
        structure.headScratchLayer = buildHeadScratch(parentComp, hsOpts);
        structure.headScratchLayer.moveToBeginning();
    }

    return structure;
}


// ════════════════════════════════════════════════════════════════
// SECTION 9 — STATE MANAGER
// ════════════════════════════════════════════════════════════════

/** Returns a fresh settings object with all defaults. */
function defaultSettings() {
    return {
        seed: 1984,
        chaos: 100,
        rotoMode: "split",
        chaosCurve: "flat",
        animStyle: "xpClassic",
        minFrames: FLOOR_FRAMES,
        maxFrames: MAX_FRAMES,
        // Per-type element counts (0 = auto from chaos with equal weights)
        counts: {
            dialog: 0,
            bsod: 0,
            text: 0,
            cursor: 0,
            pixel: 0
        },
        // Overlay settings
        scanlines: {
            enabled: true,
            opacity: DEFAULT_SCANLINE_OPACITY,
            spacing: DEFAULT_SCANLINE_SPACING,
            jitter: false
        },
        noise: {
            enabled: true,
            opacity: DEFAULT_NOISE_OPACITY,
            scale: DEFAULT_NOISE_SCALE,
            complexity: DEFAULT_NOISE_COMPLEXITY
        },
        headScratch: {
            enabled: false,
            freq: DEFAULT_HEADSCRATCH_FREQ,
            height: DEFAULT_HEADSCRATCH_HEIGHT
        },
        // Element controls
        elementScale: DEFAULT_ELEMENT_SCALE,
        speedMult: DEFAULT_SPEED_MULT,
        opacityMin: DEFAULT_OPACITY_MIN,
        opacityMax: DEFAULT_OPACITY_MAX,
        stackDepth: MAX_STACK_DEPTH,
        stackOffset: STACK_OFFSET_X,
        entryFrames: DEFAULT_ENTRY_FRAMES,
        exitFrames: DEFAULT_EXIT_FRAMES,
        // Custom content
        customMessages: [],
        customTitles: [],
        rotoKeywords: [],
        rotoLayerNames: []
    };
}

/** Read settings from comp markers. Returns defaults merged with stored values. */
function loadSettings(comp) {
    var settings = defaultSettings();

    // Known nested-object keys that should be merged, not replaced
    var nestedKeys = ["counts", "scanlines", "noise", "headScratch"];

    // Scan markers for our data
    for (var i = 1; i <= comp.markerProperty.numKeys; i++) {
        try {
            var data = JSON.parse(comp.markerProperty.keyValue(i).comment);
            if (data._type === "WEFX_SETTINGS") {
                for (var key in data) {
                    if (!data.hasOwnProperty(key) || key === "_type") continue;
                    // Skip deprecated 'mix' field from old saves
                    if (key === "mix") continue;
                    // Merge nested objects field-by-field
                    var isNested = false;
                    for (var ni = 0; ni < nestedKeys.length; ni++) {
                        if (key === nestedKeys[ni]) { isNested = true; break; }
                    }
                    if (isNested && typeof data[key] === "object" && settings[key]) {
                        for (var nk in data[key]) {
                            if (data[key].hasOwnProperty(nk)) {
                                settings[key][nk] = data[key][nk];
                            }
                        }
                    } else {
                        settings[key] = data[key];
                    }
                }
            }
        } catch (e) {
            // Not our marker, skip
        }
    }

    return settings;
}

/** Write settings to comp markers as JSON. Overwrites existing WEFX markers. */
function saveSettings(comp, settings) {
    // Remove existing WEFX markers
    var toRemove = [];
    var i;
    for (i = 1; i <= comp.markerProperty.numKeys; i++) {
        try {
            var data = JSON.parse(comp.markerProperty.keyValue(i).comment);
            if (data._type && data._type.indexOf("WEFX_") === 0) {
                toRemove.push(i);
            }
        } catch (e) {
            // skip
        }
    }
    // Remove in reverse order
    for (i = toRemove.length - 1; i >= 0; i--) {
        comp.markerProperty.removeKey(toRemove[i]);
    }

    // Write new marker
    var markerData = {};
    for (var key in settings) {
        if (settings.hasOwnProperty(key)) {
            markerData[key] = settings[key];
        }
    }
    markerData._type = "WEFX_SETTINGS";

    var mv = new MarkerValue("");
    mv.comment = JSON.stringify(markerData);
    comp.markerProperty.setValueAtTime(0, mv);
}

/** Read UI state into a WEFXSettings object. */
function settingsFromUI(ui) {
    var rotoMap  = ["split", "allOver", "allUnder", "flat"];
    var curveMap = ["flat", "build", "peak", "burst", "random"];
    var styleMap = ["xpClassic", "glitchHeavy", "slowBurn", "chaosMax"];

    var rotoIdx  = ui.rotoModeDropdown.selection  ? ui.rotoModeDropdown.selection.index  : 0;
    var curveIdx = ui.chaosCurveDropdown.selection ? ui.chaosCurveDropdown.selection.index : 0;
    var styleIdx = ui.animStyleDropdown.selection  ? ui.animStyleDropdown.selection.index  : 0;

    return {
        seed: parseInt(ui.seedField.text, 10) || 1984,
        chaos: parseInt(ui.chaosField.text, 10) || 0,
        rotoMode: rotoMap[rotoIdx] || "split",
        chaosCurve: curveMap[curveIdx] || "flat",
        animStyle: styleMap[styleIdx] || "xpClassic",
        minFrames: parseInt(ui.minFramesField.text, 10) || FLOOR_FRAMES,
        maxFrames: parseInt(ui.maxFramesField.text, 10) || MAX_FRAMES,
        counts: {
            dialog: parseInt(ui.countDialog.text, 10) || 0,
            bsod:   parseInt(ui.countBsod.text, 10) || 0,
            text:   parseInt(ui.countText.text, 10) || 0,
            cursor: parseInt(ui.countCursor.text, 10) || 0,
            pixel:  parseInt(ui.countPixel.text, 10) || 0
        },
        scanlines: {
            enabled: ui.slEnabled.value,
            opacity: parseInt(ui.slOpacity.text, 10) || DEFAULT_SCANLINE_OPACITY,
            spacing: parseInt(ui.slSpacing.text, 10) || DEFAULT_SCANLINE_SPACING,
            jitter: ui.slJitter.value
        },
        noise: {
            enabled: ui.noEnabled.value,
            opacity: parseInt(ui.noOpacity.text, 10) || DEFAULT_NOISE_OPACITY,
            scale: parseInt(ui.noScale.text, 10) || DEFAULT_NOISE_SCALE,
            complexity: parseInt(ui.noComplexity.text, 10) || DEFAULT_NOISE_COMPLEXITY
        },
        headScratch: {
            enabled: ui.hsEnabled.value,
            freq: parseInt(ui.hsFreq.text, 10) || DEFAULT_HEADSCRATCH_FREQ,
            height: parseInt(ui.hsHeight.text, 10) || DEFAULT_HEADSCRATCH_HEIGHT
        },
        elementScale: parseInt(ui.scaleField.text, 10) || DEFAULT_ELEMENT_SCALE,
        speedMult: parseInt(ui.speedField.text, 10) || DEFAULT_SPEED_MULT,
        opacityMin: parseInt(ui.opacMinField.text, 10) || DEFAULT_OPACITY_MIN,
        opacityMax: parseInt(ui.opacMaxField.text, 10) || DEFAULT_OPACITY_MAX,
        stackDepth: parseInt(ui.stackDepthField.text, 10) || MAX_STACK_DEPTH,
        stackOffset: parseInt(ui.stackOffsetField.text, 10) || STACK_OFFSET_X,
        entryFrames: parseInt(ui.entryFramesField.text, 10) || DEFAULT_ENTRY_FRAMES,
        exitFrames: parseInt(ui.exitFramesField.text, 10) || DEFAULT_EXIT_FRAMES,
        customMessages: ui._customMessages || [],
        customTitles: ui._customTitles || [],
        rotoKeywords: ui._rotoKeywords || [],
        rotoLayerNames: ui._rotoLayerNames || []
    };
}

/** Populate UI controls from settings. */
function applySettingsToUI(ui, settings) {
    ui.seedField.text = String(settings.seed);
    ui.chaosField.text = String(settings.chaos);
    ui.minFramesField.text = String(settings.minFrames);
    ui.maxFramesField.text = String(settings.maxFrames);

    // Element counts
    var cts = settings.counts || {};
    ui.countDialog.text = String(cts.dialog || 0);
    ui.countBsod.text   = String(cts.bsod || 0);
    ui.countText.text   = String(cts.text || 0);
    ui.countCursor.text = String(cts.cursor || 0);
    ui.countPixel.text  = String(cts.pixel || 0);

    // Overlay settings
    var sl = settings.scanlines || {};
    ui.slEnabled.value  = (sl.enabled !== false);
    ui.slOpacity.text   = String(sl.opacity != null ? sl.opacity : DEFAULT_SCANLINE_OPACITY);
    ui.slSpacing.text   = String(sl.spacing != null ? sl.spacing : DEFAULT_SCANLINE_SPACING);
    ui.slJitter.value   = (sl.jitter === true);

    var no = settings.noise || {};
    ui.noEnabled.value    = (no.enabled !== false);
    ui.noOpacity.text     = String(no.opacity != null ? no.opacity : DEFAULT_NOISE_OPACITY);
    ui.noScale.text       = String(no.scale != null ? no.scale : DEFAULT_NOISE_SCALE);
    ui.noComplexity.text  = String(no.complexity != null ? no.complexity : DEFAULT_NOISE_COMPLEXITY);

    var hs = settings.headScratch || {};
    ui.hsEnabled.value  = (hs.enabled === true);
    ui.hsFreq.text      = String(hs.freq != null ? hs.freq : DEFAULT_HEADSCRATCH_FREQ);
    ui.hsHeight.text    = String(hs.height != null ? hs.height : DEFAULT_HEADSCRATCH_HEIGHT);

    // Element controls
    ui.scaleField.text       = String(settings.elementScale || DEFAULT_ELEMENT_SCALE);
    ui.speedField.text       = String(settings.speedMult || DEFAULT_SPEED_MULT);
    ui.opacMinField.text     = String(settings.opacityMin != null ? settings.opacityMin : DEFAULT_OPACITY_MIN);
    ui.opacMaxField.text     = String(settings.opacityMax != null ? settings.opacityMax : DEFAULT_OPACITY_MAX);
    ui.stackDepthField.text  = String(settings.stackDepth || MAX_STACK_DEPTH);
    ui.stackOffsetField.text = String(settings.stackOffset || STACK_OFFSET_X);
    ui.entryFramesField.text = String(settings.entryFrames || DEFAULT_ENTRY_FRAMES);
    ui.exitFramesField.text  = String(settings.exitFrames || DEFAULT_EXIT_FRAMES);

    // Custom content
    ui._customMessages = settings.customMessages || [];
    ui._customTitles = settings.customTitles || [];
    ui._rotoKeywords = settings.rotoKeywords || [];
    ui._rotoLayerNames = settings.rotoLayerNames || [];

    // Dropdowns
    var rotoMap  = ["split", "allOver", "allUnder", "flat"];
    var curveMap = ["flat", "build", "peak", "burst", "random"];
    var styleMap = ["xpClassic", "glitchHeavy", "slowBurn", "chaosMax"];

    for (var ri = 0; ri < rotoMap.length; ri++) {
        if (rotoMap[ri] === settings.rotoMode) { ui.rotoModeDropdown.selection = ri; break; }
    }
    for (var ci = 0; ci < curveMap.length; ci++) {
        if (curveMap[ci] === settings.chaosCurve) { ui.chaosCurveDropdown.selection = ci; break; }
    }
    for (var si = 0; si < styleMap.length; si++) {
        if (styleMap[si] === settings.animStyle) { ui.animStyleDropdown.selection = si; break; }
    }
}


// ════════════════════════════════════════════════════════════════
// SECTION 10 — MAIN GENERATOR
// ════════════════════════════════════════════════════════════════

/**
 * Main entry point for effect generation.
 * @param {object}  settings     WEFXSettings
 * @param {boolean} forceReplace Skip the "replace?" prompt
 */
function generate(settings, forceReplace) {
    wlogOpen();
    wlog("=== GENERATE START ===");
    wlogObj("Settings", settings, ["seed", "chaos", "rotoMode", "chaosCurve", "animStyle", "minFrames", "maxFrames"]);
    wlogObj("Counts", settings.counts, ["dialog", "bsod", "text", "cursor", "pixel"]);

    // 1. Validate active comp
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        werr("No active composition. app.project.activeItem=" + String(comp));
        alert("Windows Error FX: Please open a composition first.");
        wlogClose();
        return;
    }
    wlog("Comp: \"" + comp.name + "\" " + comp.width + "x" + comp.height +
         " @ " + comp.frameRate + "fps, " + comp.duration.toFixed(2) + "s (" +
         Math.round(comp.duration * comp.frameRate) + " frames), " +
         comp.numLayers + " layers");

    // 2. Check for existing effect
    var existing = findExistingEffect(comp);
    if (existing) {
        wlog("Found existing effect layer: \"" + existing.name + "\" (index " + existing.index + ")");
        if (!forceReplace) {
            var ok = confirm("Replace existing Windows Error FX effect?");
            if (!ok) { wlog("User cancelled replace."); wlogClose(); return; }
        }
        wlog("Clearing existing effect...");
        clearEffect(comp);
        wlog("Cleared.");
    } else {
        wlog("No existing effect found.");
    }

    // 3. Detect roto layers
    var rotoLayers = detectRotoLayers(comp, ROTO_KEYWORDS, settings.rotoKeywords || []);
    var rotoMode = settings.rotoMode || "split";
    wlog("Roto detection: found " + rotoLayers.length + " layer(s)");
    for (var ri = 0; ri < rotoLayers.length; ri++) {
        wlog("  roto[" + ri + "]: \"" + rotoLayers[ri].name + "\" (index " + rotoLayers[ri].index + ")");
    }
    if (rotoLayers.length === 0 && rotoMode === "split") {
        rotoMode = "flat";
        wlog("No roto layers found, switched rotoMode to 'flat'");
    }
    wlog("Effective rotoMode: " + rotoMode);

    // 4. Build compInfo
    var compInfo = {
        duration: comp.duration,
        frameRate: comp.frameRate,
        width: comp.width,
        height: comp.height,
        totalFrames: Math.round(comp.duration * comp.frameRate)
    };

    // 5. Check for content — skip if all counts are 0 AND chaos is 0
    var cts = settings.counts || {};
    var totalCounts = (cts.dialog || 0) + (cts.bsod || 0) +
                      (cts.text || 0) + (cts.cursor || 0) + (cts.pixel || 0);
    if (totalCounts <= 0 && (settings.chaos || 0) <= 0) {
        werr("All element counts are 0 and chaos is 0 — nothing to generate");
        alert("Windows Error FX: Set element counts or chaos level above 0.");
        wlogClose();
        return;
    }

    // 6. Schedule elements
    wlog("Scheduling elements...");
    var jobs = schedule(settings, compInfo);
    wlog("Scheduled " + jobs.length + " elements");

    if (jobs.length === 0) {
        wwarn("No elements scheduled. Chaos=" + settings.chaos);
        alert("Windows Error FX: No elements scheduled. Try increasing chaos level.");
        wlogClose();
        return;
    }

    // Log schedule summary
    var typeSummary = {};
    var layerSummary = { over: 0, under: 0 };
    for (var si = 0; si < jobs.length; si++) {
        typeSummary[jobs[si].type] = (typeSummary[jobs[si].type] || 0) + 1;
        layerSummary[jobs[si].layer] = (layerSummary[jobs[si].layer] || 0) + 1;
    }
    var summaryParts = [];
    for (var tk in typeSummary) {
        if (typeSummary.hasOwnProperty(tk)) summaryParts.push(tk + ":" + typeSummary[tk]);
    }
    wlog("  Types: " + summaryParts.join(", "));
    wlog("  Layers: over=" + layerSummary.over + ", under=" + layerSummary.under);
    wlog("  Frame range: " + jobs[0].inFrame + " to " + jobs[jobs.length - 1].outFrame);

    // 7. Build everything inside an undo group
    var builtCount = 0;
    var errorCount = 0;
    app.beginUndoGroup("Windows Error FX \u2014 Generate");
    try {
        wlog("Creating pre-comp structure (rotoMode=" + rotoMode + ")...");
        var structure = createPreCompStructure(comp, settings.seed, rotoMode, rotoLayers, settings);
        wlog("Pre-comp structure created.");
        if (structure.overComp) wlog("  overComp: \"" + structure.overComp.name + "\"");
        if (structure.underComp && structure.underComp !== structure.overComp) {
            wlog("  underComp: \"" + structure.underComp.name + "\"");
        }
        if (structure.flatComp) wlog("  flatComp: \"" + structure.flatComp.name + "\"");

        // 8. Build each element
        wlog("Building " + jobs.length + " elements...");
        for (var i = 0; i < jobs.length; i++) {
            var job = jobs[i];
            job.rng = createRNG(settings.seed + i + 1);

            var targetComp;
            if (job.layer === "over") {
                targetComp = structure.overComp;
            } else if (job.layer === "under") {
                targetComp = structure.underComp;
            } else {
                targetComp = structure.overComp;
            }

            var jobDesc = "[" + (i + 1) + "/" + jobs.length + "] " + job.type +
                " (" + job.layer + ") f" + job.inFrame + "-" + job.outFrame;

            // Add type-specific detail to the log line
            if (job.type === "dialog")      jobDesc += " title=\"" + (job.title || "") + "\" arrival=" + (job.arrivalBehavior || "?") + " life=" + (job.lifeBehavior || "?") + " exit=" + (job.exitBehavior || "?") + " stack=" + (job.stackIndex || 0);
            else if (job.type === "bsod")   jobDesc += " variant=" + (job.variant || "?") + " behavior=" + (job.behavior || "?") + " textBehavior=" + (job.textBehavior || "?");
            else if (job.type === "chrome") jobDesc += " frag=" + (job.fragmentType || "?") + " behavior=" + (job.behavior || "?");
            else if (job.type === "text")   jobDesc += " behavior=" + (job.behavior || "?") + " lines=" + ((job.lines && job.lines.length) || 0) + " corrupt=" + (job.corruption || false);
            else if (job.type === "cursor") jobDesc += " behavior=" + (job.behavior || "?");
            else if (job.type === "pixel")  jobDesc += " behavior=" + (job.behavior || "?") + " " + (job.w || "?") + "x" + (job.h || "?");

            jobDesc += " @(" + Math.round(job.x) + "," + Math.round(job.y) + ")";
            wlog(jobDesc);

            try {
                if      (job.type === "bsod")   buildBSOD(job, targetComp);
                else if (job.type === "dialog") buildDialogBox(job, targetComp);
                else if (job.type === "chrome") buildChromeFragment(job, targetComp);
                else if (job.type === "text")   buildTextOverlay(job, targetComp);
                else if (job.type === "cursor") buildCursor(job, targetComp);
                else if (job.type === "pixel")  buildPixelBlock(job, targetComp);
                else    { wwarn("Unknown element type: " + job.type); continue; }
                builtCount++;
            } catch (buildErr) {
                errorCount++;
                werr("Builder FAILED for job " + (i + 1) + " (" + job.type + "): " +
                     buildErr.toString() + " [line " + (buildErr.line || "?") + "]");
                // Continue to next element — don't let one failure kill the whole run
            }
        }

        wlog("Built " + builtCount + "/" + jobs.length + " elements (" + errorCount + " errors)");

        // 9. Save settings
        wlog("Saving settings to comp markers...");
        saveSettings(comp, settings);
        wlog("Settings saved.");

    } catch (e) {
        werr("FATAL: " + e.toString() + " [line " + (e.line || "?") + "]");
        werr("Stack: " + (e.stack || "unavailable"));
        alert("Windows Error FX error:\n" + e.toString() + "\nLine: " + e.line +
              "\n\nUse the 'Show Log' button for details.");
    } finally {
        app.endUndoGroup();
    }

    wlog("=== GENERATE COMPLETE: " + builtCount + " built, " + errorCount + " errors ===");
    wlog("Log file: " + getLogPath());
    wlogClose();
    return jobs.length;
}


// ════════════════════════════════════════════════════════════════
// SECTION 11 — UI
// ════════════════════════════════════════════════════════════════

(function buildPanel(panelObj) {
    // Guard: skip UI construction when running outside AE (e.g., Node.js tests)
    if (typeof Panel === "undefined") return;

    var panel = (panelObj instanceof Panel)
        ? panelObj
        : new Window("palette", "Windows Error FX", undefined, { resizeable: true });

    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.margins = 10;
    panel.spacing = 6;

    // ── Header ───────────────────────────────────
    var header = panel.add("statictext", undefined, "WINDOWS ERROR FX");
    header.alignment = ["center", "top"];

    // ── Seed row ──────────────────────────────────
    var seedRow = panel.add("group");
    seedRow.orientation = "row";
    seedRow.add("statictext", undefined, "SEED");
    var seedField = seedRow.add("edittext", undefined, "1984");
    seedField.preferredSize.width = 70;
    var randBtn = seedRow.add("button", undefined, "Random");
    randBtn.preferredSize.width = 60;

    // ── Chaos (number field, uncapped) ────────────
    var chaosRow = panel.add("group");
    chaosRow.orientation = "row";
    chaosRow.add("statictext", undefined, "CHAOS");
    var chaosField = chaosRow.add("edittext", undefined, "100");
    chaosField.preferredSize.width = 50;
    chaosRow.add("statictext", undefined, "(0 = off, 100 = normal, 500+ = insane)");

    // ── Roto status ───────────────────────────────
    var rotoStatus = panel.add("statictext", undefined, "Roto: checking...");

    // ── Generate button ───────────────────────────
    var genBtn = panel.add("button", undefined, "GENERATE");

    // ── Advanced section (collapsible) ────────────
    var advPanel = panel.add("panel", undefined, "ADVANCED");
    advPanel.orientation = "column";
    advPanel.alignChildren = ["fill", "top"];
    advPanel.margins = 8;
    advPanel.spacing = 4;
    advPanel.visible = false;

    var advToggle = panel.add("button", undefined, "Show Advanced");
    advToggle.preferredSize.height = 22;

    // ── Element Counts ────────────────────────────
    var countGroup = advPanel.add("panel", undefined, "Element Counts (0 = auto)");
    countGroup.orientation = "column";
    countGroup.alignChildren = ["fill", "top"];

    function addCountField(parent, label, defaultVal) {
        var row = parent.add("group");
        row.orientation = "row";
        row.add("statictext", undefined, label).preferredSize.width = 55;
        var field = row.add("edittext", undefined, String(defaultVal));
        field.preferredSize.width = 40;
        return field;
    }

    var countDialog = addCountField(countGroup, "Dialog", 0);
    var countBsod   = addCountField(countGroup, "BSOD", 0);
    var countText   = addCountField(countGroup, "Text", 0);
    var countCursor = addCountField(countGroup, "Cursor", 0);
    var countPixel  = addCountField(countGroup, "Pixel", 0);

    // ── Overlays ──────────────────────────────────
    var overlayGroup = advPanel.add("panel", undefined, "Overlays");
    overlayGroup.orientation = "column";
    overlayGroup.alignChildren = ["fill", "top"];

    // Scanlines
    var slRow1 = overlayGroup.add("group");
    slRow1.orientation = "row";
    var slEnabled = slRow1.add("checkbox", undefined, "Scanlines");
    slEnabled.value = true;
    slRow1.add("statictext", undefined, "Opacity").preferredSize.width = 45;
    var slOpacity = slRow1.add("edittext", undefined, String(DEFAULT_SCANLINE_OPACITY));
    slOpacity.preferredSize.width = 35;
    slRow1.add("statictext", undefined, "Spacing").preferredSize.width = 45;
    var slSpacing = slRow1.add("edittext", undefined, String(DEFAULT_SCANLINE_SPACING));
    slSpacing.preferredSize.width = 35;

    var slRow2 = overlayGroup.add("group");
    slRow2.orientation = "row";
    var slJitter = slRow2.add("checkbox", undefined, "Scanline Jitter");
    slJitter.value = false;

    // Noise
    var noRow = overlayGroup.add("group");
    noRow.orientation = "row";
    var noEnabled = noRow.add("checkbox", undefined, "Noise");
    noEnabled.value = true;
    noRow.add("statictext", undefined, "Opacity").preferredSize.width = 45;
    var noOpacity = noRow.add("edittext", undefined, String(DEFAULT_NOISE_OPACITY));
    noOpacity.preferredSize.width = 35;
    noRow.add("statictext", undefined, "Scale").preferredSize.width = 35;
    var noScale = noRow.add("edittext", undefined, String(DEFAULT_NOISE_SCALE));
    noScale.preferredSize.width = 40;

    var noRow2 = overlayGroup.add("group");
    noRow2.orientation = "row";
    noRow2.add("statictext", undefined, "Complexity").preferredSize.width = 65;
    var noComplexity = noRow2.add("edittext", undefined, String(DEFAULT_NOISE_COMPLEXITY));
    noComplexity.preferredSize.width = 35;

    // Head Scratch
    var hsRow = overlayGroup.add("group");
    hsRow.orientation = "row";
    var hsEnabled = hsRow.add("checkbox", undefined, "Head Scratch");
    hsEnabled.value = false;
    hsRow.add("statictext", undefined, "Freq").preferredSize.width = 30;
    var hsFreq = hsRow.add("edittext", undefined, String(DEFAULT_HEADSCRATCH_FREQ));
    hsFreq.preferredSize.width = 35;
    hsRow.add("statictext", undefined, "Height").preferredSize.width = 40;
    var hsHeight = hsRow.add("edittext", undefined, String(DEFAULT_HEADSCRATCH_HEIGHT));
    hsHeight.preferredSize.width = 35;

    // ── Element Controls ──────────────────────────
    var elemGroup = advPanel.add("panel", undefined, "Element Controls");
    elemGroup.orientation = "column";
    elemGroup.alignChildren = ["fill", "top"];

    var scaleRow = elemGroup.add("group");
    scaleRow.orientation = "row";
    scaleRow.add("statictext", undefined, "Scale %").preferredSize.width = 55;
    var scaleField = scaleRow.add("edittext", undefined, String(DEFAULT_ELEMENT_SCALE));
    scaleField.preferredSize.width = 40;
    scaleRow.add("statictext", undefined, "Speed %").preferredSize.width = 55;
    var speedField = scaleRow.add("edittext", undefined, String(DEFAULT_SPEED_MULT));
    speedField.preferredSize.width = 40;

    var opacRow = elemGroup.add("group");
    opacRow.orientation = "row";
    opacRow.add("statictext", undefined, "Opacity").preferredSize.width = 55;
    var opacMinField = opacRow.add("edittext", undefined, String(DEFAULT_OPACITY_MIN));
    opacMinField.preferredSize.width = 35;
    opacRow.add("statictext", undefined, "-");
    var opacMaxField = opacRow.add("edittext", undefined, String(DEFAULT_OPACITY_MAX));
    opacMaxField.preferredSize.width = 35;

    var stackRow = elemGroup.add("group");
    stackRow.orientation = "row";
    stackRow.add("statictext", undefined, "Stack").preferredSize.width = 35;
    var stackDepthField = stackRow.add("edittext", undefined, String(MAX_STACK_DEPTH));
    stackDepthField.preferredSize.width = 30;
    stackRow.add("statictext", undefined, "Offset").preferredSize.width = 35;
    var stackOffsetField = stackRow.add("edittext", undefined, String(STACK_OFFSET_X));
    stackOffsetField.preferredSize.width = 30;

    var entryRow = elemGroup.add("group");
    entryRow.orientation = "row";
    entryRow.add("statictext", undefined, "Entry f").preferredSize.width = 45;
    var entryFramesField = entryRow.add("edittext", undefined, String(DEFAULT_ENTRY_FRAMES));
    entryFramesField.preferredSize.width = 30;
    entryRow.add("statictext", undefined, "Exit f").preferredSize.width = 40;
    var exitFramesField = entryRow.add("edittext", undefined, String(DEFAULT_EXIT_FRAMES));
    exitFramesField.preferredSize.width = 30;

    // ── Style / Timing / Roto ─────────────────────
    var styleRow = advPanel.add("group");
    styleRow.orientation = "row";
    styleRow.add("statictext", undefined, "Style");
    var animStyleDropdown = styleRow.add("dropdownlist", undefined,
        ["XP Classic", "Glitch Heavy", "Slow Burn", "Chaos Maximum"]);
    animStyleDropdown.selection = 0;

    var frameRow = advPanel.add("group");
    frameRow.orientation = "row";
    frameRow.add("statictext", undefined, "Min");
    var minFramesField = frameRow.add("edittext", undefined, "8");
    minFramesField.preferredSize.width = 40;
    frameRow.add("statictext", undefined, "Max");
    var maxFramesField = frameRow.add("edittext", undefined, "96");
    maxFramesField.preferredSize.width = 40;

    var rotoRow = advPanel.add("group");
    rotoRow.orientation = "row";
    rotoRow.add("statictext", undefined, "Roto");
    var rotoModeDropdown = rotoRow.add("dropdownlist", undefined,
        ["Split", "All Over", "All Under", "Flat"]);
    rotoModeDropdown.selection = 0;

    var curveRow = advPanel.add("group");
    curveRow.orientation = "row";
    curveRow.add("statictext", undefined, "Curve");
    var chaosCurveDropdown = curveRow.add("dropdownlist", undefined,
        ["Flat", "Build", "Peak", "Burst", "Random"]);
    chaosCurveDropdown.selection = 0;

    // Custom messages button
    var customBtn = advPanel.add("button", undefined, "Custom Messages...");

    // Regenerate, Clear, and Log buttons
    var actionRow = advPanel.add("group");
    actionRow.orientation = "row";
    var regenBtn = actionRow.add("button", undefined, "REGENERATE");
    var clearBtn = actionRow.add("button", undefined, "CLEAR ALL");

    var logBtn = advPanel.add("button", undefined, "Show Log");

    // ── Assemble UI references ────────────────────
    var ui = {
        seedField: seedField,
        chaosField: chaosField,
        rotoStatus: rotoStatus,
        // Element counts
        countDialog: countDialog,
        countBsod: countBsod,
        countText: countText,
        countCursor: countCursor,
        countPixel: countPixel,
        // Overlays
        slEnabled: slEnabled, slOpacity: slOpacity,
        slSpacing: slSpacing, slJitter: slJitter,
        noEnabled: noEnabled, noOpacity: noOpacity,
        noScale: noScale, noComplexity: noComplexity,
        hsEnabled: hsEnabled, hsFreq: hsFreq, hsHeight: hsHeight,
        // Element controls
        scaleField: scaleField, speedField: speedField,
        opacMinField: opacMinField, opacMaxField: opacMaxField,
        stackDepthField: stackDepthField, stackOffsetField: stackOffsetField,
        entryFramesField: entryFramesField, exitFramesField: exitFramesField,
        // Dropdowns
        animStyleDropdown: animStyleDropdown,
        minFramesField: minFramesField,
        maxFramesField: maxFramesField,
        rotoModeDropdown: rotoModeDropdown,
        chaosCurveDropdown: chaosCurveDropdown,
        // Custom content
        _customMessages: [],
        _customTitles: [],
        _rotoKeywords: [],
        _rotoLayerNames: []
    };

    // ── Event handlers ────────────────────────────

    randBtn.onClick = function() {
        seedField.text = String(Math.floor(Math.random() * 89999) + 10000);
    };

    advToggle.onClick = function() {
        advPanel.visible = !advPanel.visible;
        advToggle.text = advPanel.visible ? "Hide Advanced" : "Show Advanced";
        panel.layout.layout(true);
    };

    genBtn.onClick = function() {
        var settings = settingsFromUI(ui);
        var count = generate(settings, false);
        if (count != null) {
            rotoStatus.text = "Generated " + count + " elements.";
        }
    };

    regenBtn.onClick = function() {
        var settings = settingsFromUI(ui);
        var count = generate(settings, true);
        if (count != null) {
            rotoStatus.text = "Regenerated " + count + " elements.";
        }
    };

    clearBtn.onClick = function() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("No active composition.");
            return;
        }
        var ok = confirm("Remove all Windows Error FX elements?");
        if (!ok) return;
        wlogOpen();
        wlog("=== CLEAR ALL ===");
        app.beginUndoGroup("Windows Error FX \u2014 Clear");
        try {
            clearEffect(comp);
            rotoStatus.text = "Cleared.";
            wlog("=== CLEAR COMPLETE ===");
        } catch (e) {
            werr("Clear failed: " + e.toString() + " [line " + (e.line || "?") + "]");
            alert("Error clearing: " + e.toString() + "\n\nUse 'Show Log' for details.");
        } finally {
            app.endUndoGroup();
            wlogClose();
        }
    };

    logBtn.onClick = function() {
        var logText = getLog();
        var logPath = getLogPath();
        if (!logText || logText.length === 0) {
            logText = "(No log entries yet. Generate an effect first.)";
        }
        var logDlg = new Window("dialog", "Windows Error FX \u2014 Log");
        logDlg.orientation = "column";
        logDlg.alignChildren = ["fill", "top"];
        logDlg.margins = 10;

        // Show where the log file lives
        if (logPath) {
            var pathLabel = logDlg.add("statictext", undefined,
                "Log file: " + logPath, { truncate: "middle" });
            pathLabel.helpTip = logPath;
        }

        var logArea = logDlg.add("edittext", undefined, logText,
            { multiline: true, scrolling: true, readonly: true });
        logArea.preferredSize = [550, 400];

        var logBtnRow = logDlg.add("group");
        logBtnRow.orientation = "row";
        logBtnRow.add("button", undefined, "Close", { name: "ok" });
        var revealBtn = logBtnRow.add("button", undefined, "Show in Explorer/Finder");
        var deleteBtn = logBtnRow.add("button", undefined, "Delete Log File");

        revealBtn.onClick = function() {
            if (!logPath) { alert("No log file path available."); return; }
            try {
                var f = new File(logPath);
                if (f.exists) {
                    f.parent.execute(); // Opens the containing folder
                } else {
                    alert("Log file not found.\nIt is created when you Generate or Clear.");
                }
            } catch (e) {
                alert("Could not open folder: " + e.toString());
            }
        };

        deleteBtn.onClick = function() {
            if (!logPath) return;
            try {
                var f = new File(logPath);
                if (f.exists) {
                    f.remove();
                    logArea.text = "(Log file deleted.)";
                    clearLog();
                } else {
                    logArea.text = "(No log file on disk.)";
                }
            } catch (e) {
                alert("Could not delete: " + e.toString());
            }
        };

        logDlg.show();
    };

    customBtn.onClick = function() {
        var dlg = new Window("dialog", "Custom Messages");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 10;

        dlg.add("statictext", undefined, "Custom Error Messages (one per line):");
        var msgArea = dlg.add("edittext", undefined, ui._customMessages.join("\n"),
            { multiline: true, scrolling: true });
        msgArea.preferredSize = [300, 100];

        dlg.add("statictext", undefined, "Custom Window Titles (one per line):");
        var titleArea = dlg.add("edittext", undefined, ui._customTitles.join("\n"),
            { multiline: true, scrolling: true });
        titleArea.preferredSize = [300, 60];

        var btnRow = dlg.add("group");
        btnRow.orientation = "row";
        var okBtn = btnRow.add("button", undefined, "Save", { name: "ok" });
        var cancelBtn = btnRow.add("button", undefined, "Cancel", { name: "cancel" });
        var resetBtn = btnRow.add("button", undefined, "Reset");

        resetBtn.onClick = function() {
            msgArea.text = "";
            titleArea.text = "";
        };

        if (dlg.show() === 1) {
            ui._customMessages = msgArea.text.split("\n");
            ui._customTitles = titleArea.text.split("\n");
            // Filter out empty lines
            var i;
            var filtered = [];
            for (i = 0; i < ui._customMessages.length; i++) {
                if (ui._customMessages[i].replace(/^\s+|\s+$/g, "") !== "") {
                    filtered.push(ui._customMessages[i]);
                }
            }
            ui._customMessages = filtered;
            filtered = [];
            for (i = 0; i < ui._customTitles.length; i++) {
                if (ui._customTitles[i].replace(/^\s+|\s+$/g, "") !== "") {
                    filtered.push(ui._customTitles[i]);
                }
            }
            ui._customTitles = filtered;
        }
    };

    // ── Load existing settings if available ───────
    wlog("Panel init: loading settings...");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            wlog("Panel init: active comp \"" + comp.name + "\" " + comp.width + "x" + comp.height);
            var saved = loadSettings(comp);
            applySettingsToUI(ui, saved);
            wlog("Panel init: settings loaded (seed=" + saved.seed + " chaos=" + saved.chaos + ")");
            var roto = detectRotoLayers(comp, ROTO_KEYWORDS, []);
            rotoStatus.text = "Roto layers: " + roto.length + " detected";
            wlog("Panel init: " + roto.length + " roto layers detected");
        } else {
            rotoStatus.text = "No active composition.";
            wlog("Panel init: no active comp");
        }
    } catch (e) {
        rotoStatus.text = "Ready.";
        werr("Panel init failed: " + e.toString());
    }
    wlog("Panel init complete.");

    // ── Show ──────────────────────────────────────
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    } else {
        panel.layout.layout(true);
    }

})(thisObj);

// ── Export namespace for external access and testing ──
thisObj.WEFX = {
    // PRNG
    createRNG: createRNG, rngInt: rngInt, rngPick: rngPick,
    rngBool: rngBool, rngFloat: rngFloat,
    // Utilities
    snapToFrame: snapToFrame, framesToSeconds: framesToSeconds,
    clamp: clamp, lerp: lerp, fakeHex: fakeHex,
    resolveHexPlaceholders: resolveHexPlaceholders,
    pickErrorMessage: pickErrorMessage, pickWindowTitle: pickWindowTitle,
    pickBSODLines: pickBSODLines, pickCorruptLines: pickCorruptLines,
    corruptString: corruptString,
    // Scheduler
    calcElementCount: calcElementCount, distributeTimes: distributeTimes,
    pickElementType: pickElementType, pickDuration: pickDuration,
    assignLayer: assignLayer, weightedPick: weightedPick,
    buildJob: buildJob, assignDialogStacks: assignDialogStacks,
    schedule: schedule,
    // Roto
    nameMatchesKeyword: nameMatchesKeyword,
    // State
    defaultSettings: defaultSettings
};

})(this);
