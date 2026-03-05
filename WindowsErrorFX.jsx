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
var C_ICON_WARNING    = [1,     0.800, 0    ]; // #FFCC00
var C_ICON_QUESTION   = [0,     0,     0.800]; // #0000CC
var C_ICON_INFO       = [0,     0,     0.800]; // #0000CC (same as question)
var C_PIXEL_COLORS    = [
    [0, 0, 0],          // black
    [1, 1, 1],          // white
    [0, 0, 0.667],      // BSOD blue
    [1, 0, 1],          // magenta (classic corruption color)
    [0, 1, 1],          // cyan
    [1, 0, 0],          // red
    [0, 1, 0]           // green
];

// ── Fonts ────────────────────────────────────────────────────────
var FONT_MONO = "CourierNewPSMT";
var FONT_UI   = "ArialMT";

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

// ── Blend mode weights per element type ──────────────────────────
// Three tiers: heavy (40% Normal), medium (60%), light (80%)
// Remaining weight distributed: Add 30%, Screen 30%, Overlay 16%, Hard Light 16%, Difference 8%
var BLEND_WEIGHTS = {
    bsod:   [{ value: "normal", weight: 40 }, { value: "add", weight: 18 }, { value: "screen", weight: 18 }, { value: "overlay", weight: 10 }, { value: "hardLight", weight: 10 }, { value: "difference", weight: 4 }],
    pixel:  [{ value: "normal", weight: 40 }, { value: "add", weight: 18 }, { value: "screen", weight: 18 }, { value: "overlay", weight: 10 }, { value: "hardLight", weight: 10 }, { value: "difference", weight: 4 }],
    dialog: [{ value: "normal", weight: 60 }, { value: "add", weight: 12 }, { value: "screen", weight: 12 }, { value: "overlay", weight: 6 }, { value: "hardLight", weight: 6 }, { value: "difference", weight: 4 }],
    cursor: [{ value: "normal", weight: 80 }, { value: "add", weight: 6 }, { value: "screen", weight: 6 }, { value: "overlay", weight: 3 }, { value: "hardLight", weight: 3 }, { value: "difference", weight: 2 }],
    freeze: [{ value: "normal", weight: 90 }, { value: "add", weight: 3 }, { value: "screen", weight: 3 }, { value: "overlay", weight: 2 }, { value: "hardLight", weight: 1 }, { value: "difference", weight: 1 }]
};

// Map blend mode names to AE BlendingMode enum values
var BLEND_MODE_MAP = {
    normal: "NORMAL",
    add: "ADD",
    screen: "SCREEN",
    overlay: "OVERLAY",
    hardLight: "HARD_LIGHT",
    difference: "DIFFERENCE"
};

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

// ── Dialog variant palettes ─────────────────────────────────
var DIALOG_VARIANTS = {
    A: { // Win95/98 Classic
        body:       [0.753, 0.753, 0.753], // #C0C0C0
        titleStart: [0,     0,     0.502], // #000080
        titleEnd:   [0.063, 0.518, 0.816], // #1084D0
        borderL:    [1,     1,     1    ], // white highlight
        borderMid:  [0.875, 0.875, 0.875], // #DFDFDF
        borderD:    [0.502, 0.502, 0.502], // #808080
        borderOuter:[0,     0,     0    ], // #000000
        btnBg:      [0.753, 0.753, 0.753], // #C0C0C0
        btnBorderL: [1,     1,     1    ], // #FFFFFF
        btnBorderD: [0.502, 0.502, 0.502], // #808080
        closeBtn:   null,                   // grey same as body
        cornerRadius: 0,
        titleH: 18
    },
    B: { // Win98/2000 Standard (PRIMARY)
        body:       [0.831, 0.816, 0.784], // #D4D0C8
        titleStart: [0.039, 0.141, 0.416], // #0A246A
        titleEnd:   [0.651, 0.792, 0.941], // #A6CAF0
        borderL:    [1,     1,     1    ], // white highlight
        borderMid:  [0.831, 0.816, 0.784], // same as body
        borderD:    [0.502, 0.502, 0.502], // #808080
        borderOuter:[0.251, 0.251, 0.251], // #404040
        btnBg:      [0.831, 0.816, 0.784], // #D4D0C8
        btnBorderL: [1,     1,     1    ], // #FFFFFF
        btnBorderD: [0.502, 0.502, 0.502], // #808080
        closeBtn:   null,                   // grey same as body
        cornerRadius: 0,
        titleH: 18
    },
    C: { // Win XP Luna
        body:       [0.925, 0.914, 0.847], // #ECE9D8
        titleStart: [0,     0.329, 0.890], // #0054E3
        titleEnd:   [0.239, 0.584, 1.0  ], // #3D95FF
        borderL:    [1,     1,     1    ], // white highlight
        borderMid:  [0.925, 0.914, 0.847], // same as body
        borderD:    [0.675, 0.659, 0.600], // #ACA899
        borderOuter:[0,     0,     0    ], // #000000
        btnBg:      [0.925, 0.914, 0.847], // #ECE9D8
        btnBorderL: [1,     1,     1    ], // #FFFFFF
        btnBorderD: [0.675, 0.659, 0.600], // #ACA899
        closeBtn:   [0.780, 0.314, 0.314], // #C75050 red oval
        cornerRadius: 4,
        titleH: 25
    }
};

// ── BSOD fonts ──────────────────────────────────────────────
var FONT_BSOD      = "CourierNewPSMT";      // XP era (PostScript name; Lucida Console is Windows-only)
var FONT_BSOD_9X   = "CourierNewPSMT";     // Win 9x (PostScript name)

// ── Geometry extras ─────────────────────────────────────────
var GEO_ICON_SIZE  = 32;
// ── Virtual resolution presets ──────────────────────────────
var VIRTUAL_RESOLUTIONS = [
    { label: "640 x 480",   w: 640,  h: 480  },
    { label: "800 x 600",   w: 800,  h: 600  },
    { label: "1024 x 768",  w: 1024, h: 768  },
    { label: "1280 x 1024", w: 1280, h: 1024 },
    { label: "Native",      w: 0,    h: 0    }
];
var DEFAULT_VIRTUAL_RES_INDEX = 2;  // 1024x768

// ── BSOD era text arrays ────────────────────────────────────
var BSOD_LINES_XP = [
    "A problem has been detected and Windows has been shut down to prevent damage",
    "to your computer.",
    "",
    "%BSOD_CODE%",
    "",
    "If this is the first time you've seen this Stop error screen,",
    "restart your computer. If this screen appears again, follow",
    "these steps:",
    "",
    "Check to make sure any new hardware or software is properly installed.",
    "If this is a new installation, ask your hardware or software manufacturer",
    "for any Windows updates you might need.",
    "",
    "If problems continue, disable or remove any newly installed hardware",
    "or software. Disable BIOS memory options such as caching or shadowing.",
    "If you need to use Safe Mode to remove or disable components, restart",
    "your computer, press F8 to select Advanced Startup Options, and then",
    "select Safe Mode.",
    "",
    "Technical information:",
    "",
    "*** STOP: %HEX% (%HEX%, %HEX%, %HEX%, %HEX%)"
];

var BSOD_LINES_9X = [
    "A fatal exception %BSOD_EXCEPTION% has occurred at %HEX%:%HEX% in VXD VMM(01) +",
    "%HEX%. The current application will be terminated.",
    "",
    "*  Press any key to terminate the current application.",
    "*  Press CTRL+ALT+DELETE again to restart your computer. You will",
    "   lose any unsaved information in all applications.",
    "",
    "",
    "Press any key to continue _"
];

var BSOD_CODES = [
    "DRIVER_IRQL_NOT_LESS_OR_EQUAL",
    "UNEXPECTED_KERNEL_MODE_TRAP",
    "PAGE_FAULT_IN_NONPAGED_AREA",
    "KERNEL_DATA_INPAGE_ERROR",
    "INACCESSIBLE_BOOT_DEVICE",
    "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED",
    "CRITICAL_PROCESS_DIED"
];

var BSOD_EXCEPTIONS = ["0E", "0D", "06", "0C", "00"];

// ── Trails defaults ─────────────────────────────────────────
var DEFAULT_TRAILS_CHANCE = 20;   // percent probability per element
var DEFAULT_TRAILS_ECHOES = 4;    // number of echo copies
var DEFAULT_TRAILS_DECAY  = 50;   // percent opacity decay

// ── Freeze strip ────────────────────────────────────────────
var FLOOR_FREEZE_STRIP       = 2;    // floor rule: min Y gap between strips
var C_FREEZE_MIN_HEIGHT      = 1;    // min strip height in px
var C_FREEZE_MAX_HEIGHT      = 64;   // max strip height in px
var C_FREEZE_CLUSTER_MIN     = 2;    // min strips per cluster
var C_FREEZE_CLUSTER_MAX     = 5;    // max strips per cluster
var C_FREEZE_CLUSTER_BAND    = 200;  // max vertical spread of a cluster (px)
var C_FREEZE_CLUSTER_GAP_MIN = 2;    // min gap between cluster strips (px)
var C_FREEZE_CLUSTER_GAP_MAX = 20;   // max gap between cluster strips (px)

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

// ── Pre-rendered dialog catalog (auto-generated) ───────────────
// Auto-generated by tools/render_dialogs.py — DO NOT EDIT
// 36 pre-rendered dialog PNGs + 2 cursor PNGs

var DIALOG_CATALOG = [
    { id: "A_error_0", variant: "A", icon: "error", w: 280, h: 140 },
    { id: "A_error_1", variant: "A", icon: "error", w: 280, h: 140 },
    { id: "A_error_2", variant: "A", icon: "error", w: 280, h: 140 },
    { id: "A_warning_0", variant: "A", icon: "warning", w: 280, h: 140 },
    { id: "A_warning_1", variant: "A", icon: "warning", w: 280, h: 140 },
    { id: "A_warning_2", variant: "A", icon: "warning", w: 280, h: 140 },
    { id: "A_question_0", variant: "A", icon: "question", w: 280, h: 140 },
    { id: "A_question_1", variant: "A", icon: "question", w: 280, h: 140 },
    { id: "A_question_2", variant: "A", icon: "question", w: 280, h: 140 },
    { id: "A_none_0", variant: "A", icon: "none", w: 280, h: 140 },
    { id: "A_none_1", variant: "A", icon: "none", w: 280, h: 140 },
    { id: "A_none_2", variant: "A", icon: "none", w: 280, h: 140 },
    { id: "B_error_0", variant: "B", icon: "error", w: 280, h: 140 },
    { id: "B_error_1", variant: "B", icon: "error", w: 280, h: 140 },
    { id: "B_error_2", variant: "B", icon: "error", w: 280, h: 140 },
    { id: "B_warning_0", variant: "B", icon: "warning", w: 280, h: 140 },
    { id: "B_warning_1", variant: "B", icon: "warning", w: 280, h: 140 },
    { id: "B_warning_2", variant: "B", icon: "warning", w: 280, h: 140 },
    { id: "B_question_0", variant: "B", icon: "question", w: 280, h: 140 },
    { id: "B_question_1", variant: "B", icon: "question", w: 280, h: 140 },
    { id: "B_question_2", variant: "B", icon: "question", w: 280, h: 140 },
    { id: "B_none_0", variant: "B", icon: "none", w: 280, h: 140 },
    { id: "B_none_1", variant: "B", icon: "none", w: 280, h: 140 },
    { id: "B_none_2", variant: "B", icon: "none", w: 280, h: 140 },
    { id: "C_error_0", variant: "C", icon: "error", w: 280, h: 147 },
    { id: "C_error_1", variant: "C", icon: "error", w: 280, h: 147 },
    { id: "C_error_2", variant: "C", icon: "error", w: 280, h: 147 },
    { id: "C_warning_0", variant: "C", icon: "warning", w: 280, h: 147 },
    { id: "C_warning_1", variant: "C", icon: "warning", w: 280, h: 147 },
    { id: "C_warning_2", variant: "C", icon: "warning", w: 280, h: 147 },
    { id: "C_question_0", variant: "C", icon: "question", w: 280, h: 147 },
    { id: "C_question_1", variant: "C", icon: "question", w: 280, h: 147 },
    { id: "C_question_2", variant: "C", icon: "question", w: 280, h: 147 },
    { id: "C_none_0", variant: "C", icon: "none", w: 280, h: 147 },
    { id: "C_none_1", variant: "C", icon: "none", w: 280, h: 147 },
    { id: "C_none_2", variant: "C", icon: "none", w: 280, h: 147 }
];

var DIALOG_PNG_DATA = {
    "A_error_0": "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",
    "A_error_1": "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",
    "A_error_2": "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",
    "A_warning_0": "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",
    "A_warning_1": "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",
    "A_warning_2": "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",
    "A_question_0": "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",
    "A_question_1": "iVBORw0KGgoAAAANSUhEUgAAARgAAACMCAYAAACnDrZtAAAUdUlEQVR42u3dfVxUdb4H8M9hZMCg68OruKXR4qJyuRpJPrBeHBycQA3zASuu3s20BxQph4xVgUq4saZA9BpYwCxXc4HY1hR1CZNqRwEVH26y3FBzu9fU9VqhrAKCzNP9gzjOwAwzwEDM8Hn/4cuZOed3zvmecz7zO2fmNwgADCAi6gNDAMBgYMYQkX0JgtAWMG0PUoxe+ekfQXzR6PmOj42nAwRb5rNHG2bmM35slzaszWdDm0IPl21aq662x4Y2zK6L0XQ9ronty+5ZTSxPJ5hbtj1rYvOx29OadHHMd6eu1mrSzWNX6OGyO+7fOG3x3R4MEfWfhlx5r3oF98ZV4FZmcK/a+KcNVbi5aVqv2hiW8l+2XSIRUf9KSUnp0XzJycl45x+9byOzpfdtvGvrPRgi6n9yefd6Mmq1esC2wYAhGsRh1Z1QsKc+DZimut/gxKmr4s2fA5/+DZnZJ7rVxo3/fQUjx2TzCCLqp6AKDg6GRCKBTqdDZWVlr8KpTwOmVaND6JwC83fiiciuLAVBdy6B/P39ERQUhPnz56OkpAT19fW9WieX/i7CJ4WRWDhvPADgvaw5ePbfJwAA6i8pkfaWHEdKl0L96RKM+cUwk/ke8PJASdFiqA9EoaQoEg94ebT1cC7E4veq2XjlxUCMGOaOP+TMRdnHi6EufhpTAx8Q579+bhW2Z4bhlecnic+NGOaGXapwHCpcCPWfFmPqo/8MANi99QksCP8lAGDrplD8epEfRgxzw4fvPI7Pds3HXz5ahKkBXjyiyencf//9kEqlqK2txf3334/77rvPsQJG+ZsyvJkQjKmPPQjvh+7FH4q+BgC4SSU4/dU1hMwtxPs7q/FOaqjJfBlvyfHRnrOQP/lHfLTnHNKTZ7bN5yZBUfF5ZH/wFdI2yvC77V8h7JlPsCz2IN5LV4jzu0mH4I/7vkH278+Iz21JmoHf7fwrwpcWY5nyEN7bPAsAEJd8BG8qp2FKgBceetAT+XvPY8uGf0POrhrMXrYfz71Whq2/lfNoJKcUFhaGgoICTJs2rddt9eklktRVgr8c/A/xEilx42EcO/F35Bd9jeKiSMwIyxenNQDY++cLbT2IfeeRnmp6As8M9sYLrxwEAPyp+DzefkMGANDpDPj88HcAgPBQH/iOGd52NQbgnntcIZEI0OkBnU6Pz8svmbQZPvMXGOszXHx8z9C26a9ca0T+3nPYsy0CIU9/0lb0kIfhazStx9AhP7XNb0GTcyktLcWcOXNw9OjRgR0wlu7BeHq4QqvVw9NTKk6r1xug0+nFx3fu6EzaEizcv9Fq9dDrDYAADJEIeGLJXrTc0ULi4oLgoFHQ6QyAIECr+2k6440f4oInnt2HllYdXFwEBE9tnx7wvMcVWp0enve4tk0rcUHEigNouaODi0RA8OS70xL1Rlf3SLpzg7W7Hzeb8+OPP+LOnTuQyWQoLi5GXV3dwA0Yc8aPHQlFqA+efGY3sjPCEBpRCIOh7QR+IswXBz77G55a4Ad1h96GuuISFs8fj8JPzmHx/PE4XHm5U9tHT1zFwid8UbT3PObM8kHs84+i/PjfO03n6eGKxiYNjp68ioVzfFG0/xvMkf8CscsDUH7iKsaPGQ7FDG8seOHPyEoJgWLpXhw9/X9YGP5LFB24gDkhD2P1s4+g/ORVnh3Ua/b4CNleH0OfPXsWI0eORHV1NXQ6HWprax3nEunYiasImvIgEt5U46///SO+PluHF5Y9ig8+/Cta7mgRuWA84pXTcPPmHby4pu1y6ML/1GNDXBDWbTyMD1SzEb38Udy+rcULyoOdlrf2zcN4753HsXLZo9Bp9Vj5m8/Nrtfu9yMwZ2kxXvvPcmzdPAsrfz0RWp0BKzd8CQDI/a0cCVuOoebcddReuIEVz/wr4lMrkLcpFNFLJ0CrNWBlkppnBjHsrBAAGAwGw88+2LH+shIjHlZxsCMHOzr9YMeGPHmPv6IPAO/843Hceje4V21ktszFzben9aqNd4X5Fo+ROG0xkpOT+/9TJKLBTrDD98EGShsO04PhzzWwB8Ofa+hcK0f+uQb2YIioTw25e3NHzmoQ/WwMFv7vmNrvFbMHQ0R9hgFDRAwYImLAEBExYIiIAUNEDBgiIgYMETFgiIgBQ0TEgLGfS5cuobCwEE1NTSwG0WANmPLyciiVSiiVSsyaNUv8/+HDhxEREdHjdl9//XW4ubnhypUr2Ldvn/h8b9q0VfsyLl68aLLs3igsLLRLO/Zcp77S3W219z7tj2NkoHHav+wok8kgk8nEHatSqcTX0tLSetzujRs3sHjxYgCAn5/fz7JtPj4+8PHxsUtbBQUFWLp06YBap75ir20lBoxVH3zwAWpqanDr1i08//zzkMlkaGhoQFZWFq5fvw6tVouYmBj4+/uL8+zbtw+3b9+GUqnE5s2b8dRTT6GkpMSkXWtt3LhxA1u2bEFzczOGDh2K9evXY+TIkYiIiIBMJsO4cePEAKuvr0d6ejoaGhowevToTu+G7cs2njc8PNzs8m/evImMjAzcunULrq6uSEpKQnFxMZqbmxEfH4/ExESr61VaWoqUlBSMHj0aTU1NiI6ORn5+vvh7KO3rtGfPHnz66acQBAHR0dGYOnUqAJhdB4PBYFM9zD02rn3HesybNw+1tbUQBAEJCQk4ePCguK0bN240W6Ou6t3eS8vIyEBjYyMiIiLw9NNPi8tbtGgRampq0NjYiOXLl0Mmk1ltjwHjpDQaDYYNGwaVSoXLly/jtddeg0wmw9atWxEZGQl/f398//33SExMxPbt28X5FixYgG3btpn0hjqy1kZubi4UCgXCw8Nx6NAh5OXlISkpCRqNBgqFQjwZ26cNDQ1FWFgYKioq8MUXX1jcnvZ509PTzS4/NzcXcrkcCoUCpaWl2LFjB9auXYvdu3cjIyMDqampVtertbUVFRUViIqKQlVVFUJCQsz+KtquXbtQWFiIuro65Ofni9tkbh1u375tUz3M1aer/evn54eYmBiUlZUhJycHqamp4rZ2VaOu6r1nzx5ER0fDx8cHK1asEANGq9WKx9PVq1cRFxcHmUxm8/5jwDgZg8GAuXPnAgC8vb3FG7YnTpzAlStXxOlaWlqg1+vh4mL7rSprbZw5cwbr168HAISGhmLbtm1tN8NcXDB58mSTts6cOYN169YBAKZPnw6JRGL+RprRvJaWf/r0acTHxwMAZs+ejZCQkE7LsrZeCoUCqampiIqKQmVlJZYsWWJ2fX71q19h06ZNWLhwIRITE8Xnza3Dc889Z1M9zNWn4z5tJwiCeHksl8uRm5tr0z6yVu9Vq1bhyy+/xLFjx0xu8uv1evF4GjVqlPiarfuPAeNkXF1d4enp2el5nU6H9PR0SKVS6PV61NTUdCtcbGnD+EQwJpFIOi1Lq9WaHMS2zGtp+Xq93uRk9fDwsHiCWmrby8sLgiCgrq4O165dw9ixY83Os2HDBlRXV2P37t34/PPPsWHDBnEbOq6DrfXo+Nh4vsbGRmg0GpOAMT6ZpVKpTfvIWr03btyImTNnIjIy0uSGtqXjydb958wG5cfUln7seOLEiSgvLxff5QoKCrrdtrU2AgMDxT8NoVarMWnSJIttTZgwARUVFQDaPhWz5QC1tHx/f3+xrZKSErGnYDAYoNfrbV6vWbNmIScnB0FBQWZfb2pqglKpxIQJE5CUlISqqirxNXPr0J16GPPw8MDFixcBAGVlZSb7VKfT4fjx42KbgYGBJttqqUbW6n3+/HmEhoaitbW1U6DZa/+xB+PEXn75ZWRkZGD//v2QSCRid94WDz30EAoKCqy2sWrVKqSlpeHAgQNwd3cXLw/MiY2Nxdtvv429e/di4sSJcHV17fE2xMbGYsuWLSguLoaHh4d46RIQEIDExETEx8fbtF5yuRzZ2dl48cUXLZ7406dPx+rVq6HX67Fs2TKT7em4Di0tLTbXw9iaNWuQnJyM4cOHw9/f36Q2UqkUR44cQVFRETw9PcXLlPZtXbt2rcUadVXvhQsXIjY2Fr6+vvD09IRGo+lyn/Rk/zndmzl++qsChw8fZsKQVT/88AM2b96MzMzMAbuOHT9hov6nVquRnJzMHgzZrrKyEjt27LC5l0HEgCGbBQcHIzg4eMCvJ3svAwfHIhERA4aIGDBERKJ+vQcjl8stvtb+XQhnYu3TDEuv81MQYsD0KFROdTHdFKcOGyIGTJ8Eyykb5zjVKWx6GzTWRtyaGwHb/pq10cnmRtZaGj1raRQuAOTl5ZmM+n3wwQfF16yNzCYa6Fz6LlxOdSNczIXNqS4vqXrLeATsW2+9hezsbPG19pG7ixcvFkdHZ2ZmIikpCRkZGQDujqzNyspCUVERgLujn7OzszFjxgy0trZanLZ9OX5+fsjOzsaTTz6JnJwck3W0tGyiQdmD6X6vxXrQ2Ks3A5gOkLM0AhawbXSyuZG1lkbPWhqF29NRv90dgEnk8AFzt9dib6fEy6buhkxXI24tjYAFbBudbG5kraXRs5ZG4fZ01C/RoL5EGii6GnFraQRsR5ZG3pobWWtp9KylUbiWRv1aW3ZzczOPXBo8PZi+6710vlzqTi+mqxG3trI0OtncyFpLo2ctjcK1NOrX2sjsN954g/djyCH0ejR1/4SLsSn8GJtogGsfTc0LeiLqM70KmP7vvbRfKsm554icPWCIiAZUwMyY4Ynjx/8Fp0/7Y968YdwDRAwY+10eZWV5Y9myi5g372/IzPTmZRKRE+v3X7TLyvoB33zTAqlUwL338gqNiD0YO9q58zoAICBgKE6evM09QMSAsb8FC4YjL+9H7gEiBoz9jRvnjoMHb3IPEDFg7C8u7jIG4R+6I2LA9Iddu3xYfSIGjHlt44Gm9HjB4eEXerHaHI9ExB4METFgiIgGXMD09jKJl0dEDBgiop8nYPq3F8PeC9Gg68H0T8gwXIh4iUREZO+AuduLsXdPZgp7L0QOyq4/19AeAm1/LM0eP6XJYCFiD8buvRn2WojYg7G5N9PulJVQMZ2XiBgwNgVN57CxPB0RMWB6FTZE5Pz4MTURMWCIiAFDRMSAISIGDBExYIiIGDBExIAhIgYMEREDhogYMETEgCEiYsAQEQOGiBgwREQMGCJiwBARA4aIiAFDRAwYImLAEBExYIiIAUNEDBgiIgYMETFgiIgBQ0TEgCEiBgwREQOGiBgwROSAhjjKis6cOXPQ7BRBEKBWq1kP1qPH9WDA9EBKSsqgOICSk5NZD9aj1/VgwPSAXC536oOnu+9MrAfrMZDxHgwRMWCIiAFDRMSAoTazZ8+GUqmEUqnESy+9hOrq6i6nLywsdLoaRERE8EBgwNhXSUkJwsLCUF9fb5cDzVFPvCFDhkClUkGlUiEhIQEqlarL6QsKCnjWkO3H12Dd8KNHjyIyMhLHjx/H3Llze91eQUEBli5d6tA1GTNmDOrq6tDQ0ICsrCxcv34dWq0WMTEx8Pf3x44dO9Dc3Iz4+HhkZGQgIiICMpkM48aNQ2lpKVJSUjB69Gg0NTUhOjoa+fn5EATBYba/vr4e6enpaGhowAMPPICqqirs379ffPNZtGgRampq0NjYiOXLl0Mmk+HGjRvYsmULmpubMXToUKxfvx4jR440qU14eLjZejJgnFRLSwuam5sxb948vP/++yYBk5eXh9raWgiCgISEBLi5uVk9gG7dumVy4jmqU6dOITAwEFu3bkVkZCT8/f3x/fffIzExEdu3b8eKFSuwe/ducRs1Gg0UCgWmTp2K1tZWVFRUICoqClVVVQgJCXGocAGA3NxchIaGIiwsDBUVFSYfCWu1WgwbNgwqlQpXr15FXFwcZDIZcnNzoVAoEB4ejkOHDiEvLw9JSUkmtUlPTzdbTwaMkzp58iSCgoLg7e2Na9euQaPRwNXVFRqNBn5+foiJiUFZWRlycnLg7u5u9QACYHLiORKtVgulUgmdTodLly5h586dWLlyJa5cuWISyHq9Hi4uplfULi4umDx5MgBAoVAgNTUVUVFRqKysxJIlSxyuFmfOnMG6desAANOnT4dEIhFf0+v14hvRqFGj0NTUJM6zfv16AEBoaCi2bdvWqTYnTpywqZ4MGCdRWVmJCxcuQK1Wo66uDtXV1ZgyZQoEQYBMJgPQ9oWt3NxcSCQSqweQQx8AP92DAYCPPvoIBw8ehE6nQ3p6OqRSKfR6PWpqasyeDBKJRHzey8sLgiCgrq4O165dw9ixYx0ybI0DxWAwiI9dXV3h6enZaR7jaSzVxtZ6OqNBd5NXr9fj8uXL2L59O/Ly8pCQkIBjx44BaBvjYfyuJZVKbTqAnMWUKVNw9uxZTJw4EeXl5eK7r/GNXYPBAL1eb3b+WbNmIScnB0FBQQ65/RMmTEBFRQUAoLy83GTfW7rcCwwMFC+l1Go1Jk2a1GmarurJgHEyNTU18PX1FR8/8sgjOHnypPhOc/z4cfFgCQwMtOkAsnbiOQpvb298++23iI2NxWeffQalUomPP/4YcXFx4jQBAQFITEw0O79cLkd5eTkUCoVDbn9sbCz27t2LNWvW4MKFC3B3d7c6z6pVq1BWVoY1a9agrKwMMTExnaZ5+eWXLdaTl0hOeHn02GOPiY/d3d0xYsQIfPfdd5BKpThy5AiKiorg6emJdevWQavVIi0tDQcOHIC7u7t4udRR+4m3efNmh6pHSUmJSS3aP25PS0szO73x9hnPCwB37txBQEAARo8e7ZA1+PDDD6FUKuHr64tz587h66+/trit7Y/vu+8+s7Uynt7Ly8tiPRkwTmb16tWdnmu/B9HxIGpn7QDqeOIN1vtaO3bssBjAjiAyMhIqlQpubm7QaDR49dVXQQwYGgCCg4MRHBzs0Nswfvx4ZGVlcWfyHgwRsQfTBxzt9zBYD9aDPRgH4GjfCmU9WA9yoB4M35lYD9aDPRgiIgYMETFgiIgBQ0TEgCEiBgwRMWCIiLogfg+G3yMgInsTABhYBiLqC/8PryYL63vpbowAAAAASUVORK5CYII=",
    "A_question_2": "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",
    "A_none_0": "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",
    "A_none_1": "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",
    "A_none_2": "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",
    "B_error_0": "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",
    "B_error_1": "iVBORw0KGgoAAAANSUhEUgAAARgAAACMCAYAAACnDrZtAAAYR0lEQVR42u3deVxU1f/H8dcMWxpUrvVrcc0oAdM0JSMbENxS01QUcaHQ3FFxR1EWt75mmVmaimnmjqJpoqWAqIjiEm5ZLrlVmqAkKMvAzO8PZGRgBgYGDPXzfDx84Jy599x7ztx5c+5lzh2FSqXSIoQQ5cASIDo6WnpCCFGmXF1dcwMG4MkGwwBQKAAUuT8VChTc/6lQKEABCgr8LLAcCoVePfmXA/2fetsrdruFt2FoX3R1G9gXvTqNtMnQPhTfpnzPGWinXt2l6F/z2lQ+r525bbq3Wpm+dmV7PJrezgd/PBbfzvI8HovsX4WC37fPuz+CEUI8OJN6Opg1Knh/9FJGdapvVh29pnzPx62fN6uOj2ZuNO0USQjxYAUHB5dqPZVKVeHqkIARogLq3qVdiZYP37yjwtYhASPEI8yxsXORz5/8Jf4/2a9yDxjvri34ZGJX3ugwg6Rbd0pVx/EdATRqP5MGdWvSvHEdVm9OKNH6A3u1ZMnaA7xcuwbNGtVi3bajZrVp39oRnDp7LfeBQsHehAusMbNOISpKULmpWmFhaUF2djbRMXvNCqdyD5i2rV5jyZp9tHZ5lXVbj5hV19k//uHsxRsoSrjegJ65AXPu0g3OXU4q8foFqbNzGBwYbuCvSEL8d4wFQXGjm/ycHBvi4vIWnt27siniB27evFVxRzCVnrCiciVrVm0+RMDw9rqAORMdxKrNh2jqWAstMDp4A1f+vsXpXYGs3pLAG4610KLFP3QTV//Wb2Bi5CQat59FlacrM3NcJ555qjJqdQ5jZ0RQtUplQv07Ymf7BBsjf2HFxoOM6N+KypWsWTrbi4GT1hC/0Z+3un1G9SpPEur/HpWfsOZuRhbT5kWSlHKHfev8WPfjMZo4vIjdkzYsWnOAmPizJrV314rB7Dl0nt8v3mBDZCI7l31MbMJ5zl5MYvfBcwR83JrKlay4m6Hmk8XR3Lydzo/ffMTeI39w9lISET+fkneJ+E8999yzWFtbk3j8JDVr1qRmzRpm1acsz511bWlPVNxvnL94g1rPV8HKygIAG2tLEk9fpevH37Bq8yGmjnoPAGtrS46f+ZNuQ5awevNhAv3aG6178rC2RMacxnvkcrZGncDvQxV9ujZn7tIovEetwLfnWwB8uSKWu+lZDJi4Rm/9cQNbsz3mND7jVxG55zT+vq4AWFlZkHI7Hd9Ja/GfuZnxA11Nbq+1lQU/7/+dDZGJuse74s6yYcdxRni/za4DZxkeEsHuuLMM7d1St73d8efZ9NNJObpFhdDpvXYsXbYCl7edza6rXAOmvcqB7h3eYPt3w3m2xlO0fKMeAFqtlsiY3N/W23afoKlTLV35jj2nAfgx6iRNHV8yWnfLpnXZEZu77OadiXy6eBf/++Zn6tWqzsdeLbGtbFPkvjVrVIudsb8CsHPvGZq/XuveqY6CLbtOAPDntX8N1mNlacGi0O4sCunOwpDuOL3yfwDkaDQkHL+sW06j0ZBw/AoATRq+QFT8OQCiDp6nScPn7y2j5cjJq3JUiwojYss2unR+j5g9+8yuq9xOkSyUSurXroFbr89RoMC15Su4v/Maew6eRaPRosm5PwUqKytb92bTK1fnGE9GpZJ7nyMkR6Ml9U4mYf/z5qe9Z1gZkYBXp2ZF7p+xaybq7BxS72TqFtCiNfkaTE6OFo1WqyvLzvdYYWSDOTma3GXkuH5sFXWNpCQXWEtyrcWYa9euk5mRSWs3FWvXb+Sff25UzIBp3rgOp37/S/c4/tgfhI59P3ejFkrc3rZn174zdGztRNyRC7nllkpcW77Crv2/8Z6bI3FHLxitP/HXP3F3sScy+jSe771Breer4mT/PKNDN1L1mSextrbIF0YKlAqFXlgkJF7Gw+VVtsecxsPFXjfy0GrKZ+7n0VNXcW1en5/jfkfVvB6//PqXvLNEiUOkPOsAOHHyNNWrV+Pw0WNkZ2eTePxkxQyYdioH9h46p3ucnqEm6WYaDerWJCMrm/fcHBna711up6YzdsYmADIzs+ng6sDgPu9wOzWD8bM2A3DxajJD+7Zi4cpYXX0zFuzkk4md6dulOal3Mhk/azPZOTms/fJDzpy/zu20DKytLMjK1nDkxGW+CunB0KnrdevPDYsieFQHPDs0IT0zi6nzTP/wUN4pUt7Q5cRvf7Nw9f4i1/lqdRyTPnbjfXcH0jPUfLJEJpiKRzPs9M4UVCqVNjo6+oFOdvwtJphXXYMKTS47vWsqDh6hMtlRJjs+0pMdA3o5lPoj+gBPN+nDqM71zarjOZcBDGr9gll11GszosjJjjExMeV7kVcIUZirq+sjU0eFHMHI7RpkBCO3a3j0b9cgIxghRLnSXeQ9FN5PekMIAL2PJsgdZUvj93s/ZQQjhCg3EjBCCAkYIYQEjBBCSMAIISRghBASMEIIIQEjhJCAEUJIwAghhASMEOK/8Mh/8drGTT8wfdYcdu3YQrVqVf/TfTl3/gJHjvxCT88PjC7j7OJO/L5dRp9fuuw7BnzUz6S6SitvGyVhbL+La09ppaWlETAlhFspKVR55hlmTp+Kra2twWXHTphCUlIyAGp1NpcuXWbfnp1GywGatngXJ8eGujpcVa14pUF9gkJn83/PPQvAG01ex2/4YAAiNm8lYss27ty5y5jRw2n5Vguj9fTv60Vqaiqz/zeP3VExxO/frXveWD2mHj8SMA9YTOxevHt7Ersvjq7vd/xP9+Xl+vV4uX69Mnnzl0VdZRkwD9o3S5bTtGkT+vf1Yvl3q1kStoLRI4cZXPbTT6br/cL5+9q1IssBrKysWB62UK+erdsi8fXpg2cP/Tf4rVspbNm6neVhC7l06Qp+/uPZGrHOaD0Aw/zG0raNO7uj95hUT1kdP3KKVIYyMjJIT8+ge9fO7InNvUP6rZQURvpPxMd3CAMH+3Hz5i2DZbdvpzIxYBoDBo2g/0eDOXEy9xsMVq3ZQPee/ejRqx9xBw4Wepynm2df3Q2Ts7LUvNe5BxqNBmcXdwCSkpIZMnw0/T8azJDho3W/SfP/turr8zFduvXmu+9zv3Llq4VLuHv3LgMH++lGB0XV5ezizhcLFuHjO4QPPPuwOyqmxNswtlxy8k2GjxxLvw8HMTkwVLessfK8/ZkyNZRVq9eb3b9798XRvp0HAB3aeRC7Nw6Akf4TdW/aoJBZbN0WqVtHq9WyZl04vXv10NsvY+UF3UhKonqN6oXKU1L+xatXd5RKJc89V5OUlH+LPTY/mzMTb68eJa4n7zU35fWVEUw52x8Xj0tLZ+rUqc1ff/2NWq1mztz5tPVwo0P7NkRs2caChUvIyMgoVJadnU1vL08aOTnw97VrDPcbx8b1K1m0OIwd2zbxzz83WBy2nH37D+g9zhvStvFwIzpmLz09P+BQwhFc3nZGqbyf53PmzqdDuzZ06tierdsi+fSz+cyeef/2havXhjPKbygv169Hl2696dfHi2FDBrJy1TqWLJqv105jdanVaqo88zTLwxZy9eqf+AwYSms3VYm3YWi5OZ/Np11bDzp2aMvu6D1E7vwpd1+MlOeehmTRvp0Hb7d0ZmrwTLP6Nzn5JtXvnfJWr16NpOTcUA2Y4M8wv7E8W7MG165fp1PH+9+tFbNnH44Or1G1ahX9Ua6R8kIBcyOZy5ev8u3y73n66aeYMHY0L730AnXr1qZu3doA/LQrCtW77xR7bFavXq1QWUnrKe71lRFMOYuK3svWH3fQu68v/9xI4vCRY8QfTMDDPfdWge936oD/yKEGy/bHxfPZvAX4+A5h0uRg0tPT0Wg0tHJ5m4ApwVy7fp1Z06cVepynrYcbUTGx9w7gvbRt4663bwmHj+jK2rZx51CC/tfqjhk1nD8uXiLs25Wk3Sn6O72N1aXVanSnhS+++AJpqWml2oah5RIOH6WNuxsAqlYuKJUWRZYDKJUWvOXcXBf+5vSvMc8+W5NOHdszYuR4AgPG6z23YuVqfPr1LrSOoXK1Wo2P7xDdv4sXL6FQKLC3b8DK5Yvp0rkj00Jm6q1z5cqffLt8Ff75TtUM1VMcQ/UYUtzrKyOYcqTRaLh46TIb16/UHdAxsfvQaDRotXkHvBJbW1uDZTk5OXzz9RfY2Fij0Wg4eiwRpVLJjNBADh85xspV6/hx+85Cj6eHBAJQp05tUlL+Je3OHX498zuTJ40tcHAUvf/+4wLwcHfF26sH6zZsLOZAM1xuZWWFnZ3d/YIC381k6jYMLadWq/X6WntvJ4yVA1hYWOhGceb2b7VqVUlKvknNGtVJSkqmerX7I4K7d+9iYWnB3bvpurLjJ05hZ2dLnTq19dpmrNzQtRPv3p66C7xurq0IDp2db5vpjJkwmZCgyVSp8kyR9RTFWD2leX1lBFOOjh5LxN6+ge5x0zcaE3fgIE6ODYm+N7LYuOkH5s3/2mBZk8aNdOe0+/YfYOmyFaSlpeHjO4TGrzsxe8Y09uzdr/c4dl+c3j64ubYibNl3ODk1LPTFa83fbMpPu6J0w+E3mzXVe/7UqV9p16Y1mVlZZGWp9X5raTQak+pSKIp+eU3dhqHlmrzeSNdnu6P2kHfnN2PlBZnbv++4tCRyx88AbN/xM++45H4V78VLl4k/mMDX8+cyY/anuoBbtnwl/fsWHr0YKzfk8y++IubetbzjJ07RoEF93TWcgMBgfPr2ppGTQ6mP2ZLWU9zrKyOYchQdE0uL5vfftE888QTVqlbFq2d3Fi9dzpp14djaPsms6dNISblNYNB0vbI7d+4SFDqL9eERWFhYEDx1Era2trzb6m169/VFo9EyZJAvmZmZuseDP/5Ibx/aerjRtUcfvl36deHTDv8RTA2azobwCCpVeoLQ4CkA1K71EkvCVtCrZze8+w3E3r4Bdna2ZGWpsba2ommTxgwfOY6vv5xbbF3FMXUbhpYbP3YkAYEhrF67gcavO2FlZQ1gtLygCWNHmdW/gwb6EDAlhF27o3V/pgYImf4Jo0cO45VXXqZ+/bpsitjKm2++wY0bSTRr2kRvHy5fuWqw3JgRwwYxZWoo361cg42NDcFTAwDY/MOP7I87SErKv6wPj6By5cp6r4+pyqqeikT3rQKnEg8ihBBlIXzzDvlWASGEXIMRQkjACCGEBIwQQgJGCCEBUwKOjZ2N/quo8s/9KIvlSrpsWbcjIyODMeMn4+M7BE+v/sTu3a9bJmLzVvp9OIhunn315v0U1wZj/xfC8kGESp7DJi538pd4eWXKyeq1G3ByaIhPf29uJCXh3XcAP0W+XexMXiEqVMDkBcZhE5c/bGBdc4PG2cUdj9YqEo4c46P+3hw9lsixxBN4e/WgXx8vkpKSCQyazt276VSuXInQoCkoFAqmhczk9u1UXnrxxUL15b+3iaF7ndy+ncrM2Z+SlHwTtVrNWH8/vfuB5Hfz5i18Bw1nzuxQataoYXQ9Zxd33N3e5bVX7fHu7Ymziztevbpz7Fgit1NTGTZ4AK3dVCZtu/sHXahU6QkAzp3/A0vL3EOguJm8yck3jfaLEA80YBwbO5scLEWFjWNjZ7NCJisrkx7duzJ0yADatO/K6pVh+I0YgnffAbkzgg3MQkahMDob2BSffv6lwVnCBanVasZOmMLEcaN5uX49o7OLc5e9Pws5b11Ds2hN2fZTT+XOXZk4OYhdu2NY8MUcoPiZvEXNkhbigQRMSUctpgSNOaMZhUKJo8NrKJVKrKwscWj4KkqlkvSMDCB3FnLex+rbtnHn8y++QqFUEjJtMlB4NnBBWq2mUNn+uHguX76ie5w3Szj/rRoAps+aQ8cObWnRvFmx6+WfhZy3XUOzaE3dNsDsGUFEecSyZet2nFu8qSvPm8lbcHpDwuGjJveLEGUeMOaOWspjNGNlZaV7c1lb2xR6oxmahVzUbOD8gZKamqq3bB5js4T1t5HFuXMXAPiga+di18s/CzmvXYZm0Zqy7Zmz5zJh3CgsLCxQtXIhcNr9u7oVNZO3qH4RwpjH+s/UhmYhFzUb2NbWlnPnc4Nh2/adhWZIg+FZwoWDz5qVyxfz159/E75pi8nr5R+ZGWJKHalpaffaBcd+OU6d2rXvhafhmbx5tzwwdZZ0wfWEjGDKbfTSVKvlSCnuUWFovcNlcE2mIEOzkLMys4zOBg6Y4M+YcZOpWrUKTo4Oes/lzYI2NEvYYLIrlfxvdihefX2xf6WByesVpag68vbPb/ggAqbkts/K0pLp904Rjc3kHek/gSWL5hc5Szqv7oG+/XX/P5RwpNCd98Tjx+zZ1AXDpamBoXNJQqa49Zshf8YWoqIrt9nUhsKkqYnn6+aGkxDiEboGY+zUqDQhY2q45P/LkhDiEQ6YshrJyMhFCAmYcgkZCRchJGBMPj0qSciUNlzkNEkIGcGU+HRJRi5CSMCUWchIuAghAVPuISPhIoQEjNlK8lckIYQEjNnhIiEjhARMmYeLOZ/4FUI84gFz8pd4mpkZLqUNGZmPJISMYEwauchIRggJmHI7LZKQEUICpkSnSaX5EJ2pISOnR0I8xiMYcz6hKyMZISRgihzFHFEodP9KEi4FQ6ZgPTJ6EeIxHcEYO1Uq7Sd0Da0n4SKEnCIJIUTZB0zeKKZZGe9gMxm9CPHQKtMvXssLgbL6jiQJFiFkBFPmoxkZtQghIxiTRzN5DhcTKgXXFUJIwJgUNAXDpqjlhBASMGaFjRDi0Sd/phZCSMAIISRghBBCAkYIIQEjhJCAEUIICRghhASMEEICRgghJGCEEBIwQggJGCGEkIARQkjACCEkYIQQQgJGCCEBI4SQgBFCCAkYIYQEjBBCAkYIISRghBASMEIICRghhJCAEUJIwAghJGCEEEICRgghASOEEBIwQggJGCHEQ8hSuqBkHF5v8di01dXVlQXzZkt/lKA/hASM2YKDgx+LdqpUKumPUvSHkIAxW/cu7R7p9oVv3iH9YUZ/iFxyDUYIIQEjhJCAEUIICRghhATMYydiyzY8vfrj3W8Anl792bL1R91zzi7uuv9fu3ad7j37kZSU/FC2M3zTFnr06oeP7xCGDvfn2rXrD2S7+ftQlD/5K1IFsj8unk0RPxC2eAF2dnakpqYydMQYatasyVst3tQtl5mZxbiJgQROHk/16tUeunYeiD/E9sif+H7FEmxsbNi77wCTp4YStniBHAQSMKK8fLtiFWP9R2BnZweAnZ0dY0aP4KuvF+sFTMj0T+jSuSOvN3J8aNs5csQQbGxsAHjH5S12R8WQnZ3NxUuXCQ6dTWpqGh907US/Pl66kYdXr+4cO5bI7dRUhg0eQGs3FbdSUggKmc2///6LlZUVn8wMxtLSkpmzPyUp+SZqtZqx/n44OTaUA0wC5vF24cIfvGpvr1f22qv2nL/wh+7xqtXrsbGxptsHnR/adp47f4HXXtVvZ9DUSQCsXhvOKL+hvFy/Hl269dYFjFqtpsozT7M8bCFXr/6Jz4ChtHZTMWfufNp6uNGhfRsitmxjwcIlZGdn09vLk0ZODvx97RrD/caxcf1KOcAkYERhWlAodG+yNevCqVe3zkPdIo1GY/S5MaOGE7nzZ/bE7iftzp37vaDV0PX9jgC8+OILpKWmARB/MIHge+H0fqcOeLRW8X633ly+fEW3bnp6OhqNBqVSLjk+aNLjFUj9enX59cxvemWnf/2Nl+vXA8DCQsna1d+Snp7O+g2bHtp21qldizO//Z4vPLQEBIYA4D8uAABvrx4olQrdMlZWVrpTR0AXuhqNBq323sGsVGJra0tOTg7ffP0Fy8MWsmzJV4QETZZwkYARH/r0Ye7nX5KWlvvbOTU1lc/mLeAjnz733kAW2D75JNNDAlm0eBkX/rj4ULazl2c3vlywiKwsNQCRO34mKysLgFOnfqVdm9ZkZmXpns/NE8OHqpNjQ6JjYgHYuOkH5s3/miaNG7E7KgaAffsPsHTZCjm45BRJtHyrBdev/8OHA4ZibW2NWq2mt5cnzvku8AI8+2xNxvr7MW5CIGu+X4a1tdVD1c52bd25dPkKnl79qVLlGapWrcKUgHG54dOzG979BmJv3wA7O1uystRFtm/8mFEEBk1nzbpwbG2fZNb0ady5c5eg0FmsD4/AwsJCdwoFULvWSywJW8FA3/5ywD0ACpVKpY2OjuZU4kHpDRM4vN6C4ODgx2ZyX3HtlP4QxvorJiZGTpGEEOVHAkYIUW7kGoyZQ2Yh/SFkBFNmXF1dpROkP4SMYMqH3JNV+kPICEYIIQEjhJCAEUIICRghhASMEEICRgghJGCEEBWS7nMw8klMIURZU6hUKq10gxCiPPw/LPP2Az8DYekAAAAASUVORK5CYII=",
    "B_error_2": "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",
    "B_warning_0": "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",
    "B_warning_1": "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",
    "B_warning_2": "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",
    "B_question_0": "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",
    "B_question_1": "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",
    "B_question_2": "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",
    "B_none_0": "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",
    "B_none_1": "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",
    "B_none_2": "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",
    "C_error_0": "iVBORw0KGgoAAAANSUhEUgAAARgAAACTCAYAAABVjgYjAAATyklEQVR42u3deVxU5f4H8M+ZgRlcGNzQm5Z1s9Jflqio9XPfKBcQIVxCcctdXLJcyq6aa2jmgiLgRlmuuJSKGSpqlvt6vYVrmmYXG01BUQaZc/9Axhk4Z+bMpiyf9+vFS2bmzPOc88yZD885Z76jAEsiiIicI+T/RQQAUWS+EJGT6SI8zpfHARN2VWLBgrkkQMh3u2BuCfluyC/zuJMCkVfgPkF+GYvb+TssuB2KlinYMATZ8ZHfVkHiCdaXkd5W6W0XrIyXlWVsbKv8MmavruS+kW+UbS0jsT9JbYeyZQp2IMjuT4L1ZWxsqyDxIgqCk+8dR95fAiT3J7veX4LFnuKa95cgYGTFeIR1HySocicunLkQkcuJKo4BEbkLA4aIGDBEVPR4cAiInr6Yg93sWn54k/UMGCJybbDkif6pS27QNC3cQcNDJKIiFi4WQbO/S8mdwdT7pydmvKuDpxp4aAQGxN3GtVs5ip47JqgsPt9y12XrciO2Mo79lv3oloCkk1lY+EMm93J6Kha7IFzyLNjfBSMK6UzGrTOYpYPKYUDcbQRMu4n4nfcwq4dO8XM/DCzr0nXJzgHaR/2N9lF/o0PU3wwXKrTe3LTJ6u2ixK0B4+ujgtYz92N+W49lIeaHezgywxc1quROnHSlBPwyxxfD3i6DQ9Mr4eC0Smj7uhb/CvVGWS8BW8dVQLkyKqwYXA5J4yogeUIFNHjR09T+f2OrILa/D87M9kX/VqWxfJAPzsyuhMi3Sitex2sLfbG4nw6D25QCAFyN9kVM39zbVXxUWD/SB9vHlsP6ET6orMsdrivzK2FRH28Mal2K7wayf/ZyqJvNcJH719ospsQFzCdrMrBnUiXEDyyHJjU12J9qwNqf7yO4gRcA4G0/L2w+8gAfBZdF26k30TvmNsKblMLUjRm4+0BEYNQtzHzXGzHJ99Ah6hb6xd7Bon4+pva1nsCylEy0/+wW5vXSISY5Ex0++xuj2pdRvI4aDyDx8APE7rpvur3h0e1pXcpiw+EstJ91GxsOZ2Fal9xZldYD2HgkC3G77/PdQi51MCREcuZifn9R4tZzMF/tzcSWYw8Q3MALc3rpsPnIA6zYm4mvhpXH3G13EeTvhTnb7qGyjxrLhpRDXHIm+sXetmgj4HWtacYDAKW1AtQqIMcIGI3A8d+ykSMChhwRx3/LhigKKK0tUOUBTzWwfVx50zmYyRvu4vDFbBiNQMp/DKbljEYg5Zfc281qeiIyIQMAsOloFiaH5gZXjtkyRO4ImeIQLm4NGF+dCi/9wwMHzhvw5d5MJJ14gONRlTF1YwaMRqBqeTWe91Xj1JVs9I+7jWa1NBjergy6NymFAfGPQ8ZDLaDT7Ft4kA2oBaDxKxrkGB+fV8kxAhCArGzAKEoUkOU7B5MbL48Lth4aHz1P6rZMY/mfQ+TuczBFNWTcdogkisDqkeXxXEU1AKBCWRWu6nOvIK0/eB+ze+qw41QWfEoL2PlJRRw6b0C/xbfRzk+bu2IqQCUAB84Z0OnRIdVbflqMCSrzxAbnx9RsBPtrAADB/hrsP5fNvZ+eWLjIHS5xBgNAn2HEkCV3sGZkedw3iMgxAgPic2cQGw7dxxe9dJi47i/cyRSRdOIB9n1aCSoBmLE599L0T2cNSBxdASMScs+7DGhdGg9zgGHL7zi0PvkPkQ5fzMbkDdYvg/8r8S4W9vZG3xalcM8gmg6XiJwx5I21kid6pcLF/HDJ2kymsF6mFvDo6xqELtcKPuim74N5tqIaywaVQ7sZN/l9MPw+GJn9B8X6+2DkriTJhYitwyRTwBSu74N58p/kDazvhU0fVMD4Ven8U0Yldxbz5lrJ++VCRFG4lKRzMHK2Hn+Ahh//hZOXeT6DSrahMiFjj8Jei8RiR6JCEDIOVVMXgauYDBiiwhI0dp3jLBpYTU1EDBgiYsAQEZmYzsEkhiWhZasWHBEicsqelL0FZzAMFyJyBfMs4SESEbkNA4aIGDBExIAhImLAEBEDhogYMEREDBgiYsAQEQOG7HL+/CUsiF6C9PQMrhu3iQFT1K38eh1atQ1FUOcIdO8xCH9c//OJ9T1/QXyB+3r1jYSXlxcuXbqCFQmr7W7zxZcbWu1H6nGl5NbNmTaftrxt8vDILblLPXvBYtukXqPi6mltq+lLv2/eOFusBnTP3p8xb34c1qyKg5eXF3bu2odFMcuxaUPCE+n/xZcb4tL5Ixb31XilES6eO+zSNs3vk3pcKbl1c6bNp83WeBflbXPFvuPW91/K3qfzpd9PyqKYZfhkwmh4eeX+n0pt2zTHCy9UR3b2Q6SevYCOQeFo2jwQi+MSLF6E6TPmIqhzBFq0Csa2pGSbj924oUf38IEIDO6J7uEDceOGHlGzonHvXibCuvYzPX9FwmrcvXsPnUIicO9epsXMQK7tv/66iR4RQxDYqQciR4wvsI1S/eS106xFkKmd27fTMXjoGISG9UVgcE8cP3Haoh1r65bHVhtS45C3bcNHfoT4JSsVLSs1Do70nX+b8s/IzMduydKv0bJNCFq1DUXKnp9My9689Td69x2OTiERCOvaD3r9TavrPmLUx/BvFICEL9dg8NAx8G/YtsD+NenTWQjs1AOBwT1x5fdrLh0Lueco2VbOYOz0et0WOHY4GRqNpsBjH46djLDQQNSs9TKaNg/Ef07/CAB49vm6mPDxKAwZ1AdXrlxFp869cOpEitXHBg35EG1aN0PXLsFYt/5b7E7Zj9iY2XbNNuTaHjJsLNq0boawd4KQtH0n+g8cjetXT8u2Wa26Hz6Z8D6GDOqDixcvIzSsL06dSMGo9z9BREQX+Nf3w7U//kSPiCHYu3uzonXL+91WG3LjUK26H1Z+uQitWzW1uazcODjat9LXoOarjXHscDL+/DMNc+fHIWZhFABg2PDxaNO6GUJDOmLV6o04fuI0MjLuSvZV9bk62PLtSlSpUhn1/Ftjx/a18PWthHYdupn2r2rV/bAweiZCgjtgfeJ32LL1B5Qq5eWysbC2/9raVnfNYIrtd/Lm5OTIPjZ54hhs2rwNO5L3ICPj8X++ZjQaEd49FADw/PPPIT0jw+ZjP/18GNHzZwAAOge3x5Rpc+xeV2ttz587DQDwVkArqNXWJ5yiKJraqVHjBVM7u/fsx6XLV0zLZWZmIicnB2q1WvE62mpDbhzUahVatmhs0ZbcsnLj4GjfSgW0bY6hkePQr2+4xRtu348HMPeLqQCAbl2DEdgxAI2bdZTsS6VSoa7fa1Cr1fD09ERdv9egUqlw//6Dx3/NBQEdOwQAAII7tcPEyVFQq9UuGwtr+6+tbXWXYhswNWr8E/8+8yv86/uZ3nyRIz7CoujP0K//SAQFvoUB7/W0OOmn0XjCx0dnsUPYekwURafXVa5tg+Hxf+1iFI2w1ZVcOw8fPsT6NUuh1WphNBpx6NAxu8JFSRty4+Dh4QGVSlUgCF25/s6+BgsXfIYDB44gNv4rbNi4BdHzZz7+I/WobbVaDZ3O2+q6562Tl5e2wDbnhpAAtdn9Wo0G2Q8fumwsrO2/trbVXYrtOZh+fd/FjJnzYTAYAACbNifBkJX7+8mTZxDcqT2ysgym+/L+CskOlMxjTZu8ge+27AAAfLdlB5o0bmT6C2Q0GpW9CDJtN2pYD0nbdwEAtiUlS+7c5v3ItfNGo/rYlrQTALBr1z7Mc+CKgq025MbBnjFzdP3t6Tv/2N2+nY6gzhFo0KAeFi+aheSd+0yP169XxzT+K79Zj6nTv3C4r9xwyMHOXbntf/vd92ja9A2XjoW1/VduW83PT3EGY4eQ4A64dOkKWrcNRcWKFeDrWxFRn018FD7haN/xXdSuXRM6Hx0MBoPkuRolPp00FiPfn4CEr9aiTOlSWDAvd7r75psN0KPXUKz+OtbhbZg6ZTyGDR+Ppcu/QaOG9aDVFlxHJf1Mm/oRRn8wESu+XAMPtRrzHk37FV19ePF5zJsfb7MNuXGwZ8wcXX972zMfuyGRY/F2QEu83aErjEYRH44e+rjfKeMx4v0JWLZiFXTeZRGzMAr37z9wqK+8mc2WrTsQvWgZfHTeWDBvOrKzH7p0LOzd1t59I5G4bjlP8hIVdSXpsnixv0xNRE8fA4boCSkpsxcGDBExYIiIAUPkFqyGZsDYpVKVWrI/7lCtuh/eGzDK4r7BQ8egWnU/q88rjBXErqqaLqx9SrVfHCu8CyN3VlqrnmSoHAVkf9wRNlqtBhcu/GYqGxBFEZcv/y75eZJCvxNELykRfZq7cUOPgQMiULfua+jb510mQRF8nVXuDhbzELFGKmxcoU6dV3Hi5BkAwJkzv+LVV2uaHpOrqs6j199E85adkHr2gs2KXqkq1fx/afNXUOdVGdtq21VV03n95q/olRoHpX3aGktHK8WdrfCW69faelqrhrY1ttbaVfo621u9bV6lrqQfqfalXmdXE0VRFPVpqS77ASAedcEPAKfWQ6fzFpfEzRHHjokU9Wmp4r8mjBYTlkeLOp23qE9LFfv07i5u/fZr8fzZQ2KVKr4Wz7t+7d9i0yZviJs2JIj6tFSxZ3iYuGP7WlGfliqePJ4i1q5dy6KvihUriJcvHhMP7E8Su3YJNrWTf33yftdqteK6NUsVtS313KlTxov6tFTx0M/fi9WqPqO4Ha1WKy6J/0LUp6WKixfNEju0b2t1HGz1mfcj14aXl5fpeccOJ5ue1yWskxgbM1vUp6WKXyUsFDUajdVtlvrd2vbK9Su3nhqNRtyxfa148niKKAiC+MP368QTx3ablrE1tnLt2vM6d+vaWYyPnSPq01LFBfNmiH16dxffCQ0UYxZGifq0VDFmYZQY9k5QgXaV9iPVvtR+6oqfxDVxIgDRw9WzFiiYrSh11KxNfVqqQ220bNkUy5avwtgPI/Hj/oPo1zfc9JhcVTUAjBs3BWFhQWjW9E0Atit6lVSpmtcmmVcZ21vt7EzVtFRF75GDP8iOg60+bY2lqyrFpThSWSy3nraqoW2NrVy79rzO9lRv569SV9KPVPvu5uHKcDnqhhU8ata+IyFTvpwPBJXK9HWZ3t5lTY/JVVVnZRnwa+o5AEDP8DAAtit6papUzQPlzp10i+po8ypje6udnamalqrolRsHJX3aGktXVYpLcaSy2Np6WquGtjW2cu3a8zrbU72dv0pdST9S7Rerq0hPS5tWzTB9xjy0aG75vSRyVdVarQZJW1fj96t/YOXX6wBYr2JNT8+QrMjV6byRevYCACBxwxbJ8nlbbZvPBFxRNS1V0Ss3Dkr6tDWWzlSK2+JIZbHcejrTl9J2bbXhquptuX6k2jd/nd1RWe2SGYzc7MVfFHFM5k1ljdTzjjoxiwkIaIHpM+di357vLP/qWqmqVqlUiI/9HG+174batWtZrWLV6bwlK3JnTp+A9/qPQqVKFVC/fh3Zq1dKKmRdVTUtVdH7bLWqkuNgT0W4vRXqSirF5Sit8HbFeiodWyXt2mrDVdXbcv1ItW++b2UbDC6vrHa6mjp/uPhL/CWyJ2RsPb+BE+djqGRV9NLT47Zqaqkw8Vc4/XU2nIiocHEqYOQOjRwJGaXhYn5liezH2QsVmYBx1UyGMxciBoxbQobhQsSAUXx4ZE/IOBouPEwi4gzG7sMlzlyIGDAuCxmGCxEDxu0hw3AhYsA4zZ6rSETEgHE6XBgyRAwYl4eLM5/4JaJiHjD6tFQ0cDJcHA0Z1iMRcQajaObCmQwRA8Zth0UMGSIGjF2HSY58iE5pyPDwiKgEz2Cc+YQuZzJExYvT32inT0u1qEsyDwlHvtHumCDIPo+zF6ISOIORO1Ry9BO6DBciBgwRkXsPkfIfKgFw6X9f0sCsfSIqoQFjHgKu+j+SeFhExIBx+WyGsxYiBozi2UyeowpChcFCxICxO2jyh4215YiIAeNU2BBR8cfL1ETEgCEiBgwREQOGiBgwRMSAISJiwBARA4aIGDBERAwYImLAEBEDhoiIAUNEDBgiYsAQETFgiIgBQ0QMGCIiBgwRMWCIiAFDRMSAISIGDBExYIiIGDBExIAhIgYMEREDhogYMEREDBgiYsAQURHkwSEomipWrllitlUQBOjTUvmiM2DoSdqwNr5EbGfimji+2AwYehpatmpRrLdvT8pevshFGM/BEBEDhogYMEREDBgiYsDQU7Jq9Ua0DghFuw7d0DogFGvWbjY99uLLDU2//3H9T7RsE4IbN/QcNCqAV5GogN0p+/HNqkRsSkyAj48Od+6kI7znYDzzTGW0aN7YtFxWVhYGDvoAn8+ajMqVK3HgiDMYsm3homWYPGksfHx0AAAfHx0mTRyDBdFLLZb7YMwkdO8eggb+fhw0YsCQMufOX0Sd1//P4j6/Oq/i7LkLptvxS1ZCq9UiokcXDhgxYMg5oihCEAQAgMGQjWUrvuF5F2LAkP1qvvISTp3+xeK+U6d/Qa2aLwEA1GoVdu5IRGbmfSR8uYYDRgwYUi5y2Hv4dMpspKdnAADu3EnHlKmfY3hk/0cBo4a3d1lEz5+Bz7+IwbnzFzloJIlXkaiAVi2b4Pr1/yI4tDe0Gk8YsrMx4L0ING/2/xbLVa36D0yZPA4DBn2A5O/XQaPRcPCIAUO29Qh/Bz3C35F87NL5I6bfQ0M6IjSkIweMeIhERAwYIuIhEhUG/L4U4gyGXC7vMylEnMGQy/E7aokzGCJiwBARMWCIiAFDRMSAISIGDBEV3YARBEHgB7aIyCXMskTwkHmAiMhp+T8OKnJIiMhVufI/TZqB6HCy8gIAAAAASUVORK5CYII=",
    "C_error_1": "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",
    "C_error_2": "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",
    "C_warning_0": "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",
    "C_warning_1": "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",
    "C_warning_2": "iVBORw0KGgoAAAANSUhEUgAAARgAAACTCAYAAABVjgYjAAAYI0lEQVR42u2de1hU1frHv3sGZrjIkFrHTuecLMNb+dO8oOT9rskd8YqUkl0ksdRMzdS8JmYqoqaoqWmKioISoOEtL5mm5snqgLfUMsIwlZvMMDP798fAyFz2zKCgIN/P8/A8s2fWXmu9717ry7vWnnePAFNEEELI/SGYvxABQBSpL4SQ+1QX4a6+3BWY0N+sFLTUJQGC2bGlbglmB9Jl7jZiIXkW7wnSZUyOzRu0tMOhMpYVQ5D0j7StgpUTbJexbqt12wUb/rJRxo6t0mXKXF2rY8PMy/bKWBlP1uxwrIxlA4LkeBJsl7Fjq2DlIgrCfc6de5lfAqyOp3LNL8FkpFTM/BIEvFM3DqGD3xRkhsCFkQshpMIRZfQBIaSyoMAQQigwhJDqhxNdQMjDZ/l3g8pVPqrDNgoMIaRihaWU2KMDDELTsWoLDZdIhFQzcTERmiMDaqbArBn1GEJ9XI3Hp+Y9gQXhnsbjT8M9EdLWFc//2wlv9nQrd/1/rqhXKf3+c/kTSJlQG1+99xh2T3wMrZ5xPMh7t6/rPbU5prfhvMb/lGN4J5f7tuHSJ49h+2gPbB/tgYTRtfBGVyVncxXjswoQl1KWVGGRqTSBOXZOgzYNnAEAHi4CtDqgrZez8XNvL2ccyVTjl9+1WLm3sMo4pFgH+H5yE34LbmHcxnx8GubhuMD0cbsvgcnM0mHd4aL7tkGjA/ovzUP/pXkIXZqPuINqzuhqhE9ios3j6oRTZQrMoJcME6ddQwXSzhTBr5ULlM4C9HrATSHg+m09IAi4Hvck6r3xJwAge+WTWLG3AB0aKeDpLmD2jnzsOlWEf3jK8FmEJx5zF3Dpus7YTj1PGVaM9IS7i4CCIhGj1uRiz+Q6CFhwE1dv6LBzfG2c+1OL9zfloVMTBSK6uOL4xWKEd3SFCGB6Qj72/6yxasMv17So/7hBg6/GPI6vflDjx6taJJ5UY9lwD7grBRSoRYxen4+ILi5wVwrY/o4nXluVi3mDa6GeSgaFEzBtewFOX9aibi0BC4fWQm13ARotMGpdPl4rOW9blAoDYnNx4ZM68JpwE/9QybB4mLuxjbFfFuB6rh7nomtj7eEitHvOGSpXAQvS7iDtx2KHrknGx55I+7EYP13T4fPDavxvrifSzhbj52s6JJ8pxqeD3eCuAAo0wHtbCvFXnoifZ6uw+2wxfv5Dh7VHNJz9FRG9HB9kV1x8EhPxXXCwxbGtKGZMFdyPqbQI5pfftXi2nhMEAXipkQJHMzU4/WsxXqzvjBb1nXDykvVJoXACbuTp0XPODQxafBOfDlMBAOYN8UDC8SL0nP03kk+roSwJhuYNUWHrd0XoPfdvbP2uCHMHeyD9rBodGjtDJgAyGdD8aYOOdmjkjPSzakz0d0ff6Jt4Le42Br8kvSTp0lSBs79pjf3a8b0aK/ffwZyBtZBwQg3fBbew/Xs1ZoW6Y15yIQrUIvrH3MaM/u5YdeAOgmNu4621eVgUVgsAMLO/O3ae1iBwUS52nFRjop8rolMM5w2IzTVpe0aIGxJPahC4OBeJpzSYHuxm7MffBSKCYnIRsSofs/s7HjUpnICdP2jw+WG1xfG0AFfsPK1B/2UF2Hlagw/9XUvKCNh1ppji8oAoKyJlIxdb4lIj92BEEcj8Q4uGTzqhzXPO+O6cBsfOadDOyxltvRQ4kmF9wMpkwBeH7gAAfr2ug8rN0MXOTRRIPGFYPqSdKYJObyjfqakCO0re33GiCJ2bKpD+kwYdGivw/L+d8N8rxSgqBmq5COjQSIG9P2nw9Y8axI1U4V+15XhjtenEdpYDKRNqI3VCbYzq4Yqo9fkAAL0eOPCLoc8dGzkj6aRhkiadVKNTY2eTOro/r8D0YHfsGueJ5cM94KYUIJcBnRs746szhvO2HldjVpL00rB9QyfsPG0ou/O0Gh0aGkRSJgiI/87w/pUbeni4CJZCIofJHkzrkn0knR44nKk1lit7/JKXHMn/NYj+V/8tRnsveUkZEYfPaTnzH5LIVGdxqdQlUukyqa2XM1wVAvKKRBw7r8HU/h4o1gIzEnKt7x9ogVuFehOhKv1PahQh4W5ilmCljsMZGswIrQUfL2ccO28QmE5NFFA6C7ieq8dba3LRobEzInu5YaCPC0Z9nmuxB2OeAKjVA/qSvgiCHafKgQGxuVBrRcgFoJ2XM3R6QC4rrVOETg/k3hGtGwDJt6HRibh9R7Twj7U9GEM9d5PTdKU2mB0L5kl2ZShbhjy8PRhGMBICE97JDT+XLDMy/9DC60knPFVHhst/6ayeo9dLqPp5DfxaG+6GBLRWGgf8of9pEORtWOYEebvgcIYGdzQism/rEdDaBcfOF+PYeQ2iervhSKYGKlcBaZNq48TFYry+Ohe9/09RbrsOZxYjoLWipC8KHDlXXCJ8hr/jF4vh96Lh8x4vKPBuH8Ny4/RlLfq1MEQ7wzoo8WGgm8l5ZTl6Xgv/loY6/F9U4NvzWpv+uV++vaCFb3ND33ybO+PYRR1n+kMWF6nlEgWmhOPnNejcVImjmRrjf9usmzr8eav8s+T9TXl4q6cb0qfUQYv6ztCURO0fxOdiSHsXfP1BHQxp74IP4g3/udPPqvFUbRn+ztfjxMVitG+kQPpZNXLviNh9Ro39U+rg60m1EZ1cUO6+TE3IxyAfF6S89xgGtnPB1ARDHccuFOPLSBWmbC3AIB8lksd5IrKnK96PN3z+4fZCRHR2wa5xKvRtrkDs14al4HcXi7HhLdO7VTMSCxHqrcTOd1UI9VZiRqLjd9rMl0iT/ezf+p6dXISQ1gpsf9sdwa0VmJ18h7O9khjVbovD4uKoyIypol+4E1DyuAZhwO+WH/J5MNK2gs+DgS07+DwYm3NH6k6S1HLI3jLJKDBV63kw/CYvIQ8livGxHsVIiYhD4lLTlkiEEGkiJUSmPFT1XCQmOxJSBUTmnrKpq8GdPQoMIVVFaMq1x1k94BKJEEKBIYRQYAghxIhxDyYhNBVdu3WhRwgh98XBA99YRjAUF0JIRVBWS7hEIoRUGhQYQggFhhBCgSGEEAoMIYQCQwihwBBCCAWGEEKBIYRQYGog589fwpLYVcjNzTN5TQipYQLToKF3hdf5yojRcHFxgZOTk/H1pUtXsHbdZslzMjIv2PzcEWKWxFVI/yuqnpqEvetnzadVyc+OzIPK6q/xod83rmc+kgJz6fz3FVrnc43a4uK5Exavq4stleGTmo41n1YlPzvSl4ru78ED39Ssh343aOiNOXMXwT8oHF26BSIlNR0AsGr1RnTtEYxuPUNw4OBRq4pferx23Wbk5xcgIDgcK+LWG18XFBQay9z4+yZeHRGFgOBwhA6MQE7ODZM6bt3KxVuRExASOgJ+gcNw+ocf7fYxen4sCgoKETowwljWvN9dewTj11+vAgDy8vLh7dMbcas2mJQpW4+9fox59wO0btsL69bH463ICWjt3ROfrVxn1a9R70xG3KoNknWa9/X69RwMHvoG/AKHYfDQN3D9eo5Nv5u3Y83HjrZdilT5V0dEITVtLwBg7Php2Lptp0lfzOuzdm3Kvidlq9RYseUbe9ekQUNvTJ8xH34BYfALHIYrV01/KUTKZkfHxb0iiqIo5mRnPHJ/KpWH8bWLi4s4a+YkMSc7Qzx1Il3811P/FHOyM8S6deuIly+eEo8dSRUHDgi0OM/82N7rQQODxLgVn4o52RniksVzxeGvDjb5fNjQUHFP2hYxJztDPHP6gPjCC03s9tFan8z7PX3qe+KM6e+LOdkZ4qq4hWLU6JE2bbPVD4VCIe5J2yKeOX1AFARB/Hr3VvGHU/vFevWesPCxUqkUt8avtlmneT/6h/iJy5dGiznZGeLypdFiaH9/u34v2441Hzvadml9UuV//OGg2KxZUzF9zzaxR/dOFn1xZLyUfU/KVik7pMo7ck2USqW4Km6hmJOdIX62bL7Y7+WeDl9zR8qU5y8hfqUIQKwxz+TV6/UYOjgEAFC//n+Qm2fYmO3VszMiR09ExIihWL40WvJcRzl0+BgWLZwFABg0MBB+vr1MPt9/8AguXb5iPC4sLIROp4NcLpfsozXM+33tjyy8OWoC3o6MQFraPowZPRJ//ZUjaZutfshkMrzYohnkcjmcnZ3xYotmkMlkuHOnyKIfcrkMXbu0t1mneV+bteiM2Ji5AICgwJcxc/andv1eth1rPu7Yxd+htu3Z/9RTT2LggAAMeyUSqV9ttut3exz99oSkrdbsaN/J12p5R66JIAjw7WcYb4EBfTHtI8eveXnKlIcaIzAKhTM8PVUmFwMAli6Zh2PHvseKuC+wfUcyYmM+NhnYt2/nQqMpdrgdnU5n/MFouVwOlcr0Fxu1Wi22xa+GUqmEXq/H8eOnjBdPqo/WsNZvmUxAVlY2fvvtGpo1a2q1jKP9KH3t4qKETCa9knZycjJ+LlWneT9Eaz+obSYo5n4v2441HzvadqkPbNlfUFAIJ7kTCgoKHfK7neVBucaKVHlHrolMJkBe5n2lQuHw2CtPGd5FsmaolQuSm5sH/6BwtGnTEp8tm4/0vYcAACqVBzIyLwAAErYn25zo5rRq2RypafsAABu+3IZZcxaafN6ubSukpBrW+Pv2HcLiMrv3tiayXq83TkCpfgcH9sPU6fPQo0dnyTKl9djqx71irU5r/ejYoR12Je8BAOxK3oMO7duWy+/WfOxo2/auw8WLl/HNoWPY9OUKTJw8y2TC2/OpteslZauUHbbK20Or1WHvPkOfdu7ajY4d2zk89iprXNTony1RqTzQp1dX9Ok3EHq9iPfGRQIAPp4zBa+NfBePP14HrVo1h1KpcLjO2TMnYczYKVizdhNUHrUswujZsyZj3PhpWLs+Hk5yORaXhMj28PFpg7BXIrF54wrJfgcE9MUHH87BlMljJcuU1rNg/vR76odN263YZq0ffr698M7YKVj3xRa4u7liyeK55fK7NR/nFxQ41La96zB+wnRM+3A8Xni+MZo09sLGTQkIDxtgc7yUvTbm12vRgplWbZWy486dIsny9nBxUSL5qz2IXbYGnioPLFk8x7D526A+FsfE2Rx7lTUuHunb1DWNa39kIWrMB9iRsJbO4O3yh0qNu039qLN7z36EhUdixvQJdAapMvCXHR8R+vbpjr59utMRNZiq+AVKRjCEEAoMIYQCQwghD19gHq/XpNLbKJshWhmZ1Q+S8ma7Vqa9FZEdTigwlSou4snKF5mY2FWPzIWqSrY0aeyFEcOHcPaQmrtEspblWpqp3KmLvzFT2ZHsUUcyhv/66wbCwkfBLyAMo8dMssgEthZdOJoB7Ei2q3n75pjXaS+butTeLt2DkJWVDQDQaDRo+1If6PV6m9njlZGRS6onD/w2dWn0AgDiSUCo1wQ52RkV3s7E96OwctUXSNj6OQBArdagTt3aSE7agIsXLyMkdAR8+/XCRzPm4/WRw9C6VQv8fi0LYeGj8M3+JJO61GoNgoN80b1bR7w79kOr5ad9FI3goH4I7e+P1LS92JGYarePUm0vWLgcp06kIysrG4tiVmL50mijLffavnmdO3emSdpd1t68/Hzs3rMfI4YPweEjx9GjeyeTlIZp06MRGNAXIcG+2LR5B+bNj4W2WGvXp4QC80ghiqIxU/m5554xZio7kj3qSMbw0W9PIGbRbABA717dIJfbziuyVZetjN17bd+8zuYtu0raXdbeQH9D+sGI4UOw5+sDCAn2Nam3PJnN95M0Rygw5YpejBO/EqOYskhlKjuSPepIxnDZzF+9qEfZpFipLOHyZgDfa/uAZRawLbvL2uvl9Sz+vnkLeXn5OHv2F0R/PNWk3vJkNhPuwTxSlM1ylcpULm/2qFT5tt4tjZmxKanpJlm4UlnC5ckAtpftaqt9a3WWx+6X+/ZATGwcWrVsbpHh7GhmMwCrjz8gjzYPLNnRWvRi0pE2qPAoZnDYmxAEAZs3rrBIBCs9vvZHFsaNn4bCO0XG7NH69f9jsSlbeq5U+StXf8fbUZOMk33d+njjOSmp6Zj7cYwxS3j9F1tstr102RrsSEqBXi9i2NBQjHwtzGhLabZredoHYFHnyy93l7Tb3FcXLvyKzl0DkJT4Bdp6tzQpc/nyVYwZOwWiCIvMZvO6QwdGGPfEyKNNabLjIy0wDxM+XJtQYB5QNrU1cXmsq+VezIP48h0hhHsw1R5GL4Q8AIGxtzRiFEMIBYYQQqqWwJQnemEUQwgFhhBCHr7A2IterqUxiiGEAlNJS6P+73OpRAgFppLYHUvnE0KBqYToxVEYxRBCgSGEkMoXmIqMXhjFEEKBIYSQyheYyoheGMUQQoEhhJDKE5jKjF4YxRDCCIYQQipeYB5E9MIohhBGMIQQUnEC8yCjF0YxhDCCIYQQI/f8w2ulUYTQ5uF0/PEH8GNthJCHJDCc3IQQLpEIIRQYQggFhhBCKDCEEAoMIYQCQwghFBhCCAWGEEKBIYQQCgwhhAJDCKHAEEIIBYYQQoEhhFBgCCGEAkMIocAQQigwhBBCgSGEUGAIIYQCQwihwBBCKDCEEEKBIYRQYAghFBhCCKHAEEIoMIQQCgwhhFBgCCEUGEIIBYYQQigwhJAqgBNdUD7q/qNxjbFVEATkZGfQH+XwB6HA3Dfbt8TVCDsT4lfSH/fgD0KBuW+6duvySNt38MA39Md9+IMY4B4MIYQCQwihwBBCCAXmYfPv+i8iIDgc/kHh6NYzBN9++73N8jFL4ug0QoEhjqFQOGNX4gYkJ23Asth5mPTBLNsCE7vqkbJ/w8at6NYzBP5B4Rgc9iau/ZH1QNpt0NCbg48CU7No2qQhsrKycetWLt6KnICQ0BHwCxyG0z/8CACInh+LgoJChA6MME6SqHcmI27VBnTtEYxff70KAMjLy4e3T2+Iolil7T34zbfYviMFaV9tQnLSBoyMCMPoqMkcCBQYUhkcOHgUnTr54KMZ8/H6yGHYkbAWK5Z/grHjpwEAJr4fBXd3NyRs/RwAoFZrEBzkizdeD0f/YF+kpu0FAOzdfwh+vr0hCEKVtnfZ8jX4cMo4uLi4AAB69uiMZ555GsXFWmRkXoCv/1B07OyHz1auM4k85sxdBP+gcHTpFoiU1HQAwI2/b+LVEVEICA5H6MAI5OTckBRq8uDh92AeEhpNMQKCw6Et1uL8+Us4ejgFPfuE4tLlK8YyhYWF0Ol0kMvlJufK5TJ07dIeABAS4os3R03A25ERSEvbhzGjR1Z52zMyL6D5/zU1eW/RpzMBAKvXbMTUKePQuElDdOzsh1FvDjf6q07d2khO2oArV35DQNAr8O3XC9OmRyMwoC9Cgn2xafMOzJsfC22xFq+PHIbWrVrg92tZCAsfhW/2J3HQUWBq3h4MAMQuXY3N8Tug1WqxLX41lEol9Ho9jh8/ZSEuAODk5ASZzBB8/uupf0ImE5CVlY3ffruGZs2aVnnbdTqd5GcfTZuAxKQU7Ek/iLy8fOP7er0eQweHAADq1/8PcvPyAACHDh/DooWG/atBAwPh59sLHbv4OyTUhEukGkHXLu1x+oezaNe2FVJSDcudffsOYXGZO0d6vR56vd7q+cGB/TB1+jz06NG5Wtj73HPP4uxP/zMei6KIt6MmAQAiRr4DAHj9tWFGES0VZE9PlfG4dBmo0+mAkj0nuVwOlcrDKNS7Ejcgaft6LFk0h+JCgam5eHk1wM+/ZGLmjEnYsjUJ/kHhWL5iHebPm2Ys4+PTBmGvRFo9PyCgL1JS09E/2K9a2BsxYgjmfhwDjUYDAEhMSoVGbXh95sxPCAx4GWq1xvgeABOxKUurls2RmrYPALDhy22YNWehTaEmXCLVCC6dv/u9F1dXF5w8/jUAYMtm67ej479cafVcACgqKsJLPt549tmnq4XtwYH9cOnSFXTvGYK6devgiSfqIrpETCNGDMXLvkPwwguNofJUQaPRQKFQSNY1e+YkjBk7BWvWboLKoxaWL41GfkEBxo2fhrXr4+Ekl2PxwrtfAWjQoD4Wx8Th3Xfe4CCkwBB77N6zH/PmxyJ28Zxq1e/xY0dh/NhRFu9PmjgGkyaOsSnIZY+feeZp415WKZ6eKkmh3rsngYOGAkMcpW+f7ujbpzsdQaok3IMhhDCCqWrw+SD0B2EEU+FU9W/J0h+EEUw1hs9kpT8IIxhCCAWGEEKBIYQQCgwhhAJDCKHAEELI/QqMIAgCvyhFCKkQymiJ4CTxASGE3DfmX8MU6RJCSEXpyv8D0D6qY5NJlX0AAAAASUVORK5CYII=",
    "C_question_0": "iVBORw0KGgoAAAANSUhEUgAAARgAAACTCAYAAABVjgYjAAAPIklEQVR42u3deVxVZeLH8c8BBNzQlNKymWrca6xfRu47LikoQi5E2oy5TJFm7mu4mziOGRoYajrqlCbqiLuIWyIiar1m+k2apk1OmYSTioJevZf549oV5F52ZPu+/5F77nO25zzn6/Occ++5BpmlIyJSMMb9f6QDpKcrX0SkgOli3MuXewHT54KdgllzycC473XW3DLue+G4zL2VZIm8LNMMx2Uyvb5/hVn3I1dlsi4Yw2H9ON5Xw84M2Zexv6/2993Ipr6yKZPDvjouk+Ho2m0b99VyTmXstCd7+5G7MllXYDhsT0b2ZXLYV8POQTSMAp47+Tm/DOy2pzydX0amllI455dhMLJmJH0C/2Q4WTsu6rmISKFLd1IdiEhRUcCIiAJGREofF1WBSPELP9o/T+VHtN6ggBGRwg2WXy2O62sNmjYlO2hKzRCp4aMujPGtjEclQ61SynW4ZAqaw33Lb8AM7lSJxLkPExviyZbxNXi8pnO+l7X+neqkmdKpV8uFoZ0qqXVKqRZRCOHyq7ASHDJFFjCdm7gR2Koi7aYn4z0zmYg9N1jxRvV8L692NSfC96Ry8vxtlu1LVQuVMqvF5s3Zvi5NiixgRvtWYer6FNJM1g/x7fryFucumangbFC7uhPR42sSG+JJ9Lga1Kpm3YxLkbWZ0bcqe6fUJHGuJ7283AEY5l2JKu5O7J5cgyruBj8trWVbz8WltfhoSDWCu1h7NT9GPELEYA/+Od+TIR0rsmJYNb6a78nwrur1SAnpvST0zzFcHP1b2noxRRYwTz/uwpff3c407c3lV7htTmf+q9VYfyQV75nJrI9PIzTIAwBXF7icYqHznMv0W/QLfxlgnR4Zm8r1m+l0m/tfrt/M/KljVxfYkHCT8Bhrr8atAny8P40eob/w/kAPIvam0iP0F0Z2r6yWLSXeUX9/uz2XjNPVgwGcnRxfjG3f2JWohJsARCXcpMPTrtaNMWD1oTQAzieZ8aiU8+aZLbDvq1u21xYLnPzuNhcumzGZ0zl5/jbfXzZTyVUXh6X0hUxpDpciDZgzF+/w3BMVbK8NAz5+8+41GAfnuskMV1Ittte5+YqU2QKWDOVum63TAG7dzvyeiK7BlJGAWRpzg5n9quJWwZom/VpWxM3F+vfBf5kIaGa9vhLQzJ2DX5tsvQ8RhUv2wyUFDPBZfBqHvjZxbM7DxEytiZ+XOyNXXQVgwifXCGpdidgQT4JaV2TCJ9fUsqTceLP5+lyHS25D5u0S+oE7g7uPazD6/ifrm3oejON9Rc+DIbv90PNgsj13HN1JarF5s91rLo6mZwmYkvU8GH3ZUaRYejEt7PdiHIVIrsKlPA2RRCR7wQ5CJi9K+neR9GVHkRIQMvn6NnUp+OSFAkakpARNnq5xlg4aIomIAkZEFDAiIja2azBRfXbQoWN71YiIFMiB/Qez9mAULiJSGDJmiYZIIlJkFDAiooAREQWMiIgCRkQUMCKigBERUcCIiAJGRBQwIiLlOWDW/G0Djz3ehJ9/vqyjXYw+CIvM1bSiXv+p02dZuerTIlnH0YQTdOven05dAtgTc0AHnQwP/b6cdLpM7uCA14KpW/dJGjaoR9ArATrixeR39V/k3JnEHKc9yPUXto6dA1j+0UKqVKlMz94DOBa/u9we7wP7D5b9h36npd0kNTWNga/2ZU/M/kyNbcTISUQuW8OVK9d4I3gcAX0G4es3gJNf/CPTMjp4+3P+/PcApKRc58UWXbl06WcCg4bh6zeAwKBhJCUl25Z7f6POaNnytXTw9qdj5wD2H4jLcZ7i2s7mrV7iwn9+BKBv/8FMnjoHgLgjxxj6pzGcOn0Wn55BtGnnS8RHqzItZ87c9+nZeyDtO/qxfUcMAKHzF3PjRip9+r1uK5txWlJSst3tBLj831/4w6AR9PIfSJ9+r5OcfNlh+dyu//46tjdPdvXk6FgMGzKQunWf5KEa1bl+/Yb+VynrQ6R9+z/Hu1Nb6tV7iu8v/IDptvW3sm/dMuHf24dhQwcyfcZ8hg4ZwKaolSwN/zOjxoRkWsbL/j7s2LkXgL37DuHr05WQ6aEE+PuwbctaAvx9CJkemqvtWbAwnG1b1hIZsYANUdE5li+u7fTu1Jb4+EQsFgsWSzr//OoUAEfiE+ns3ZblK9by7pTRbI3+G0s+XGGbz2S6TY2aD7H172tYvWoJk6fMBWDC+BFUrlyJqM8+tpXNOO3dafMcbmfItFD8er1E9OY1BPj7Mm/+Yofl87L+nLY5O46OxSuB1if//+v/T/P8/zVRupT1gNm5K5bPoqLp1r0/P/2UxJEj1i6ys7MTHdq3sobQgcPMmLWAXv4DCR4+ntTUVMxms20ZAQE+7Ny9z7q8nbG87O9D3JFj9PbrDkBvv+4cjkuwu37LfT9V2aVzO4KHT+CHH38ifElojvMU13Z26tiW+PjjfH3qDE2aNMbdzZXr128QH3+cTh3bMj1kHGfOniNs8TJSUq5nWk5QoHUY+sQTv+FaSkqujlN223no83h8fbsC0L+fHyFTxzgsn5/152WeX+spp2Oxc1csg/74itKFMvzQb7PZzLfffsfBfX+/25s5zJ6Y/XRo3woXFxecnKzZeufOHTasW46bmxsWi4WEhBM4OzvbllPnsUdxcjK4ePESFy78wO9/35h0Bz+anfFEvXr1GibT7UzvLwmbR3x8IksjV7Nx01YWf/BetvMU13a2ad2MWXMWkpj4BS2av0BFd3fijhzDZDLx8MM16Rc4hJ6+XRk6eECmC6aurhWoVs3j3gU+I3ePp07P5kfIzWaz7UfKnZ2d8fCo6rB8ftaf3TyO6imnY3Hu3L+ZOOFtpUtZ7sEcO3aSZ55pZHvdsoWX7bpHpusNzZqyfYd1aBEbe4hFdu5s+Pv14N1p8/D2bnf3BGxO9FbrBbzorbtp3aoZAB4eVTl1+iwAURu3Zmqs166l0LP3QLy8nifiw/nE7D2U4zzFsZ0A7u7u1HrEk23b99CsWVOaN3+B8IiVtGppvQbx5Zdf4derO7dumTDdMt1rTE5O2f7vf39P6ddpjrYToOnzz7JjZyxgvSM4a85Ch+Xzuv6c5nFUTzkdizmzJ+c6XNWDKbXDo320bdPC9rpiRXc8PWvyzZlvM5WbPWsSo8eEsPKv63BxdmbRwllZltWr10tMnjqHKZNGATBj2nhGjprCqtXrqVypImGLrOP29+ZMYfCQd/D0rEHTps/i5uaaqbF269KBbj36YbGkM3Z0cI7zFMd22oZJndqyZs0GajxUHa8XnuNowgkmTRwJwOuDguju8wrPPNMQj2oemEwmXF1dsz0eLVp48eprwXy6dmmWae8vmGl3OwFmz5zI26OmsGLlJ3hUrUL4klDS0m46LJ+X9efEUT3ldCyCh4+3e72nPCrzt6kLww8/XmTE25PZFLVS2ymSC+XiNnVh2LV7H68ODGbGtHHaThH1YEREPRgRKfMUMCKigBGR0ueB3qb2rNXI4XvJl07paIgoYAoSKsdzVU5hI6KAyWWwHM/lHMezzKugEVHAOAiX4wVYwnHbchQyIgqYfPZacg4a9WZEFDCF0GtRb0akrNFtahEp2QFTdL0X+8MlESknAfNgwkUhI6IhkohIYQXMg+29qBcjoh6MiEhxBUybNlU4erQRJ040xte3mo6ASBmW78/B5Hd4FBb2GwIDz5OSYubgwYZs23Y138MkfS5GpIwGTH6FhSXxzTc3cXU1qFpVIzQRDZEK0apV1h+hf/bZiiQmpuoIiChgCp+fX3UiIn7WERBRwBS++vXd2bXrqo6AiAKm8L3zzgWy+cVQEVHA5N/q1U+q9kUUMPZZbxF75XvFXbueKcBme+kWtYh6MCKigBERKWkBU9BhkoZHIgoYEZHiCZgH24tR70Wk3PVgHkzIKFxENEQSEbmr0L5NnXzpVBH8LhK2npF6LyLlOGAyhkDhPUpTwyIRBUyh92bUaxFRwOS6N0MuwsYry7wiooDJVdBkDRvH5UREAVOgsBGRsk+3qUVEASMiChgREQWMiChgREQBIyKigBERBYyIKGBERBQwIqKAEREFjIiIAkZEFDAiooAREVHAiIgCRkQUMCIiChgRUcCIiAJGREQBIyIKGBFRwIiIKGBERAEjIgoYEREFjIgoYEREFDAiooARkVLIRVWQNzUfaVhu9tUwDJIvnVJ95KE+RAFTYBvXR5aL/Yxa95HqIx/1IQqYAuvQsX2Z3r8D+w+qPgpQH2KlazAiooAREQWMiIgCRkQUMOXG6W/O0rZ9TywWi22ad9eX+frUmXJdL3V++xx+/q9lmva7+i+qwShgJC8aNqhHo0YN2BK9E4CYmAM89eRvadyofrmuFzc3V8xmM3FHjqmRKGCkIMaNDWbh+0uxWCwsCotk3Ni3uHLlGm8EjyOgzyB8/QZw8ot/ALBs+Vo6ePvTsXMA+w/Elel6mTB+BPPmL84yPSkpmcCgYfj6DSAwaBhJSclqRAoYcaRB/bo8/XRDxoydRp06j9KwQT2mz5jP0CED2BS1kqXhf2bUmBAAFiwMZ9uWtURGLGBDVHSZrpe2bVoAcDguIdP0d6fNI8Dfh21b1hLg70PI9FA1ohJGH7Qrab2YMW/Rqq0PRz7fDsC+A4c5992/be+npqZiNpvp0rkdwcMn8PqgIMKXlP0Ta+L4EbwXGsa2Lc1t0+KOHGPxB3MB6O3XnZmz/6IGpICR7NSr9xRVqlSmXr2nALhz5w4b1i3Hzc0Ni8VCQsIJnJ2dWRI2j/j4RJZGrmbjpq0s/uC9Ml0vrVs1w9nJic8PH7VNS09PV4PREEkKonmzpmzfsReA2NhDLAqL5Nq1FHr2HoiX1/NEfDifmL2HykVdTBw/gtAM12LatG5O9NbdAERv3U3rVs3UYNSDkbyYPWsSo8eEsPKv63BxdmbRwll4eFSlW5cOdOvRD4slnbGjg8tFXbRs+SIVKlTg1i0TADOmjWfkqCmsWr2eypUqErZorhqMAkZycu5Mou3vOo89yvpPl2UpM/ytwQx/a3C5qguAzRtX2f6uXfsRu3UjGiKJiAJGRERDpAdOzwdRfYh6MIXOMAxVgupD1IMpGnomq+pD1IMREQWMiChgREQUMCKigBERBYyISEEDxjAMQx+UEpFCkSFLDBcHb4iIFNj9H8PUE3xEpNBy5X/VRVD06a8fzAAAAABJRU5ErkJggg==",
    "C_question_1": "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",
    "C_question_2": "iVBORw0KGgoAAAANSUhEUgAAARgAAACTCAYAAABVjgYjAAAVgElEQVR42u3deXhTVcLH8W+WpgtQUBgXHHVAGVAYQCyLgAKySktLKyoDVGVVUMBl2F9aVm1xAVpERFCG5RUEBVoWKzsKyiaO+DooigsqWmDGFiht0iTvH6UhbZM0QIGm/D7Pw/OQ5NzlnNz7yzn39iQGinIiInJxDMX/4wRwOpUvInKR6WI4ly/nAqbHEQ8FS+aSAUOxxyVzy1Dsgfcy5zZSIvJKPGfwXqbI4+IbLFkPv8qUXDEGr+3jva4GDwv4LuO5rp7rbvDRXj7KlFJX72Xc3l2Px0axVi6tjIfjyVM9/CtTcgMGr8eTwXeZUupq8PAmGgwXee5cyPllwOPxdF7nl6HIkVI255fBwPDqc+nR8wmDsaDjop6LiJQ5p1FtICKXigJGRBQwIhJ4zGoCkStv9qePnFf5oa2WK2BEpGyDpVDqjocKgqZ1+Q4aDZFEAixcigTNxw9dvQFzfP4NJZ67889mnuhQ6YpWek7/cGIjgl2Pd068lhcfqex6nNSzMjF3B1Ovppn+bUPLfPvfvXKtzq6r3OtlEC6FUspxyFz2HsxXP+fzxsbTV7TSu7610aRWEACVQwzY7RBRO8j1ekTtID45ZOPgr/nM33pGZ4NcVi1WrvT5OJBckWswx968gesG/kaNKkZmD6jGNZWM2OxOHp/9B/kOePXRcG6oasRiNjD6nWz2HrYB8Nuc65mzMYeWdYOoFmZkyspTpO/LZXCHMB69LxSnExKWn2LfD/m80rsK11c1YjHD2GWn2Pe9rUjAPNi8oAfTtHYQGQfy6NoomGCzAYfTSZjFQGa2AzDwU0oNbhl2HIBXelem7o1mzEa4u3YQ1w0+Rr2aZqb3qUzVUCOLduQyZ1NBIH0/vTprP8/jwBE7K/flMaN3ZapWMvLDMbvOoKu997LrkVLDpcXKlXwaG1visa9ezLByeD3mil7kTe4dznu7cln2yRkeuy+MhAerEGSG2R+eZs93Nm6pbmLFc9fQ/H8KTvAgM5w45aDTC/+h1p9MZIy9lvR9uYyOqUz9EceoeY2Jkd0qE9fMyZyNOew5bOPm6ibeHV6NloknXNv996/51PqTCYMBWtwexM5vbNxYzUTDW8zYHRQJI3fPLzkFwD8iw9h2sKDMwHYhTFqZw8Ff89mZeI0rYILN8P5eK1u+svJ63yqs3JfHij1WujayEBdh0VkmHhUPFffn1YM5T/c3CGbw/GwAlnycw+q9Bj5L+hO3XX9utyoFGzAZwe4AoxEWbj/bQzhmJzy0YISX8a885g2qytxNOQycm8XX02tw2/Umj+sAcDrhm6N2br/exN21gkj9MIebq5toelsQ+XYnOw/ZvO7znTeZeaBRMF2S/wtA4nuniWsaQue/WagScm5Sht0BW/9tBaBVnSCGLyoIpw8PWF37IVJayARyuFzxgDEZzk0SszsgK8eJ2WSg27T/kGtzYjJAy7oW1wlpzYesHEeJyVaD5mXRuq6FpzqF8cg9TsxGA91f+YNcmxOjAVr+1VLipN71nY27awURYoFTuU52fWtjdHQYNjtMXeX5GpHZCDMfrcwzi05isxdM8lowKJy0/VbmbjlDvzYhrrL5DnA4C3bV4tbKRqOHiXAipVyDCdSQuaK3qfccttKtScG1kL5tw5j8SBV2fmMlJqLgRO3cKJgR3c7d3XF6+OQPDzWQMeZadn1rZcDcLDo3DObTQzbXejs1DOb5yJJ3rXZ9a6NXqxD+/UvBNZFvfsvntuvM1Kxm5Mfjnq+TPPtAGJu+tHHgSL7rucZ/MbNqbx4hQQYsZs/JsftwPl0bFQyLIhtZUL6IP+HiHiqBeqH3kvZgLGYD2ybUcD3e+bWVsUuzXY9HLM7mjYHVeLJjJbJzHPSfk0XlMAOz+1Vl4P1h5DtgyPw/fG4j+4yT9Z/nsTWhOkYDJKWdZu3+PFIfD2dAu1DyHfD0guySJ/13NlrXtbBgW5Zr2PRbloPsM97HLyOiKrH/Bxut61YD4KGULOZvzSVjVDW+/DmfrDMOgs0G8vKLzk4fv+I0rz1WmQFtQ9h9OJ+8fJ1IV7PBzZd5vNDrKVz8vdA7rJz+wZ2Bs1/XYHjo55Iv6vtgvNcVfR8Mvuqh74Pxee54u5PkLURKGya5AqZ8fR+M/pJX5Ir0Ylos8/i8txDxK1x0DUZECg3xEjLno7zPRdJkR5FyEDIXNJs6AO4WKGBEykvQnNc1zsCgIZKIKGBERAEjIuLiugazosc62rZroxYRkYuydcu2kj0YhYuIlAX3LNEQSUQuGQWMiChgREQBIyKigBERBYyIKGBERBQwIqKAEREFjIjI1RowN93SiJjYR4s8V7tOU5/LzEyZW67qUNr+BoLy1Kb+tOf57K97WW/rPvj1t7y94B0FTEUTHGzBbrezY+du/w+Y1Df1sVPWARNgbXo+++tP2Xp1b6fv439XwFREo0YOJWlaaonnMzOP07PXIKJi+tCz1yAyM4+TPC2V06dz6PFwP1e5P/7I5skhI4jr0ZeomD58tv+LIp9YU1+YTrfu8bRpF8PadRu8rtvTJ1zh42PHTtA7fjBR0b0Z/NRI/lqvRZFyhdu4t0031zaKr2fYM2O5u1lHFvxzKU8OGcHdTTvw+hsL/KqDr2V91WXo8DHMfXMRbdvH8v33PwFw8uQpmrbohNNZ8NMt7m3qbV0AJ/7zXx7rO5To2Hh6PNyP48dP+Ny2r30uLJM4cRpR0b2JiunDjz8V/dUMb23ivr++2q142dLeq8L3+s15i2nbPpZ2HeLYsnWHAibQ3du64GT9eMeuIs+PT0wiLjaSNasXExcbScKEZEaNHEqlSmGsePctV7kJE6cxcEAf3l/xNnNmv8Szzye4XrNabVxb/RrSVy1i4YJZjB33gtd1+5IwIZnY7l1Zk7aEblGdOHU6x/VaXp7VtY0Fb6W6tuEuNzePxx59hNUrFzJi1EQGDYxn1cqFzHptfql1KG1Zb3XJy7MS2z2SQQPjeTA2knXrNwKwcfN2oiI7YTj7WxbubeqrXRISk4mJ7kLaykXExUaRNC3Va/nS9rlw/xo3bsCatCU8Fv8w4xOSirSZtzZx319f7Va8rL/v1cuvzmbN6sXMff1llq9Iq/ABc1V8J+/okUN5MTmFNaubu57bsXM3qTMLDoDuMQ8wacorHpfdvPVjDv/wo+txTk4Odrsdk8mEw+GgV884AG699WayT548r3U7HA5X+ZnTpwDQqWM7TKZzue90Ol3buO22v7i2UeRTwmikcaMGmEwmgoKCaNyoAUajkTNnckutQ2nLequLyWSkbZuWAMTFRfLE4BE8NaQf69dvYtjTAzzW11e7bP/oE6a/OhmARx6OISqyIy3vjfRYvrR9hoLf5ons2hGAmOguJULeV5ucTxl3/rxXHTvcx5CnR9Gvby9mz0pWwFQErVo2w2Q08tHHnxY5GPyRn5/P8qXzCA4OxuFwsGvXPtcBZrEEUbVqeJGD2te6CwMFICsrG6vV5uoJuco4Hbgv7m0b7iyWINc+hYQEYzQaz6sOvpb1Vhez2ewqe1PNGzEaDRw9+jtHjvxCgwZ3eD0BvbHb7RRW3GQyER5exWv50va5IIQMmNyeD7ZY/G6T8ylTfL9Ke69mpSTxySd7mDN3Ie+9n07qzBc1RKoovZhkt2sxrVs1Jy09A4C09AxatWzmCgH3IGjerAlr1xV0/zdt2s4Mt7sGng5sX+sOD6/Cwa+/BWDFe+muA7BZ07tYt34TAGvXbShyYnnbxvnwVYfSeKtLcbExXRmfmET79vd5DFaHw+FzXU3uauhqg0VLljN56qt+b9vzB4OdjZu2A7A67QNat27ud5sU7q8/7eZ+vJT2XmVnn6Rb93giIu7i9demsWHjdvVgKop77mlKUFAQeXlWACYmjmT4s+NYsHAZlcJCSZlR0BVv0SKC3o8O4Z3FcwCYMnkMzz2fwNv/XIrZZGLG2W68L97W/eLUcfQf8Aw1alxLkyYNCQ4u+FSdPGk0Tw0dzby3ltA0ojGVwkLLtO4XUofS6lJcdHQXxv7PVMaNebbEa4VtOv3lSV7XNWXSaIY9O475b/8v4VUqM3tWMmfO5Pq1bU9CQoJJX5NB6mvzqRpehZQZUwsutta+lRkz5/psk8L9fXlaYqntVvx48SU8vAqdO7alc9eHcTic/OO5IRX+vHP9NvWJzK+RK+PpYaMZ/GRf6t9Zl/2fH2B8YjJrVi8OqDr88utRhg4by/sr3i4X+1O7TlMOH9qjg+sK2bplGz16PqEfXisPBvaPZ9SYyYSGBGO12ngpOTGg9v+DjM0kTUsl9WwvQUQ9GBG55D0YzUUSkUtGASMiChgRUcD4VOP6el7/BbLCGbVX86xZEU8u+UXeouGx10fJCNf/jv9+MKAaUbdERYq65LepzwXLXj+X2Fti2YsJmszM4wx7ZiynTudQuVIYKTNe4LrralC7TlPi+zzEvn3/AoOB11KTqBoezuixk8nMPI7VZmPShJE0uauhKzwiu3bgbw3u5L777uH5fySQlZVN7949GPzE40Vm1K549y1X2Pjafv++vfh092dkZ2UzcsTTrjkzIhoi+R0ue88jXDyFzd6LGjr5mgVcfJatr1mz7rOG581fzPhxz5GetsQ1c9fTDGxf2/c2A1ukIjKXfbBwEcFSMmgutDfjbeaup1m2QUFBXmfNus8anpAwgpWr1pKxYSsnT566oO17m4EtooDxq9dS1va61n8+IeNtJq6nWbZWm83rrFn3WcP9BgynW1QnBvbvU+rFXF8zgUubcSuiIVI5520mrqdZtv7ONv788y+JiX6AvDwr1rOTJgt7Je4zsH1t39uM29NuXzIloh7MZem9lBwu+duL8TYL2NMs29y8PL9mG/fr24sHIv9O/fp1Ca8ajtVqxWKxeJxR6+8s5EKP9X26xHUckUB30bepL0+4uIu4qLtLuqUsculpLpKIXHIXFTCXv/dybqh0odR7EQmQgBERKVcB07p1ZT79tB779t1BVFRVvQMiFdgF30W60OFRSsrN9Oz5PSdP2tm2rS5r1mRd8DAp0OYsiShgLrGUlEy++SYXi8VAlSoaoYloiFSGFiw4AUDDhqHs2aM/LhNRwFwCMTHVeP31Y3oHRBQwZa9OnRA++CBL74CIAqbsPfPMEfz89VYRUcCcn4UL/6LWF1HAeFZwizjigjfcqdOhi9jtCN2iFlEPRkQUMCIi5S1gLnaYpOGRiAJGROTKBMzl7cWo9yJy1fVgLk/IKFxENEQSETmrzGZTH//94CX4XSRcPSP1XkSu4oBxD4Gy+ypNDYtEFDBl3ptRr0VEAeN3bwY/wiaixLIiooDxK2hKho33ciKigLmosBGRik+3qUVEASMiChgREQWMiChgREQBIyKigBERBYyIKGBERBQwIqKAEREFjIiIAkZEFDAiooAREVHAiIgCRkQUMCIiChgRUcCIiAJGREQBIyIKGBFRwIiIKGBERAEjIgoYEREFjIgoYEREFDAiooARkQBkDpQdrX5d3avmTTEYDBz//aDaQ+1xwe2hgLkA7y2be1UcQCuWvqH2UHtcdHsoYC5A23ZtKvTBs3XLNrWH2qPM2uNK0zUYEVHAiIgCRkREASMF/nxrY6Jj4+nWPZ52HeLYuXOPz/IzUyrehdTadZrqQFDAlK1FS5ZT889/49ixE2VyoAXqiWexBJG2chHpqxbxWmoSo8dO9l3P1Dd11ogCpjQZGVsYODCeDRvL5qp8RTjx7qhXh6NHf+ePP7J5csgI4nr0JSqmD5/t/wKA5GmpnD6dQ4+H+7kCeejwMcx9cxFt28fy/fc/AXDy5CmatuiE0+kMqPofO3aC3vGDiYruzeCnRvLXei2KfPhMfWE63brH06ZdDGvXbQAgM/M4PXsNIiqmDz17DSIz83iJtvHWngqYCurMmVxycs4Q3/shPtywpchriROnERXdm6iYPvz4089+HUDFT7xAtWXrDu69twUTJk5j4IA+vL/ibebMfolnn08AYNTIoVSqFMaKd98CIC/PSmz3SAYNjOfB2EjWrd8IwMbN24mK7ITBYAio+idMSCa2e1fWpC2hW1QnTp3Ocb1mtdq4tvo1pK9axMIFsxg77gUAxicmERcbyZrVi4mLjSRhQnKJtvHWnlcD89UYMJu3fET7++/l9ttr8dORX7DabFiCgsjLs9K4cQMmJo5k+Yo0xickERoaQlxsJA8/FMO7y1eTMCGZObNfch1A97drDcAbby50nXiBxGq1ER0bT74tn0OHDrPjo7V06NyDwz/86CqTk5OD3W7HZDIVWdZkMtK2TUsA4uIieWLwCJ4a0o/16zcx7OkBAdcWO3buZub0KQB06tgOk+nc56/D4aBXzzgAbr31ZrJPnnQtkzqzIGy6xzzApCmvlGibzVs/9qs9FTAVxPoPNnHgy4OkpWfw22+Z7Ny5h7ZtWmIwGIjs2hGAmOguJExIxmQylXoABbLCazAAqbPm8c7S98nPz2f50nkEBwfjcDjYtWufx5PBbDZjNBachDfVvBGj0cDRo79z5MgvNGhwR0CGrStQnA7cR3gWSxBVq4a7Hhf2zrwNA93bxt/21BCpArDb7Xz33Q9s27yKjPXLmJWS5BomGY0GTMZzTRJssfh1AFUUbdu05LP9B2jerAlr1xUMdzZt2s4MtwvYDocDh8PhcfnYmK6MT0yiffv7ArL+zZrexbr1mwBYu25Dkffe23vdulVz0tIzAEhLz6BVy2YlyvhqTwVMBbN792fUr1/P9fieFhFs2brj7CeNnY2btgOwOu0DWrdu7tcBVNqJFyhuv702//fV10yaOJpl766iW/d4Zs9ZwLSkc9cMWrSIoPejQzwuHx3dhbXrNvBgbFRA1n/ypNHMe2sJUTF9+OKLr6gUFlrqMoXD6aiYPixfkcakCaNKlJkyeYzX9tQQqcINjzZzb+tzdwdCQ0OoUaM63xz6jpCQYNLXZJD62nyqhlchZcZUbLZ8hj87jgULl1EpLJSUGS94XG/hiffO4jkB1R6HD+0p0hZ7d30IwLJ3PN8VW7rkDY/LAuTm5nJPi6bUqnVLQLbBSy/PIvnF8dS/sy77Pz/Anr2fe61r4eMbbrjOY1u5l7+p5o1e21MBU8FMmljyEyZ91SKPB1Gh0g6g4ife1eiDjM0kTUsldcbUgK3DwP7xjBozmdCQYKxWGy8lJyIKGCkHunS+ny6d7w/oOjRqVJ81qxfrzdQ1GBFRD+YSCLTvw1B7qD3UgwkAgfZXoWoPtYcEUA8mUL6DVO2h9pAA7MGIiAJGREQBIyIKGBFRwIiIKGBE5DIHjMFgMOgPlESkTLhlicHs5QURkYtW/M8fnWoSESmrXPl/konGmuCu1EQAAAAASUVORK5CYII=",
    "C_none_0": "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",
    "C_none_1": "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",
    "C_none_2": "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"
};

var CURSOR_ARROW_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAwAAAATCAYAAACk9eypAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kb9Lw0AcxV/TSkUqDi0o0iFDdbKLijjWKhShQqgVWnUwufQXNGlIUlwcBdeCgz8Wqw4uzro6uAqC4A8Q/wBxUnSREr+XFFrEenDch3f3HnfvAKFZZZoVSACabpuZVFLM5VfF4Cv8CCCMYURlZhlzkpRGz/F1Dx9f7+I8q/e5P8egWrAY4BOJE8wwbeIN4plN2+C8TxxhZVklPieeMOmCxI9cVzx+41xyWeCZETObmSeOEIulLla6mJVNjXiaOKZqOuULOY9VzluctWqdte/JXxgq6CvLXKcZRQqLWIIEEQrqqKAKG3FadVIsZGg/2cM/6volcinkqoCRYwE1aJBdP/gf/O7WKk5NekmhJND34jgfY0BwF2g1HOf72HFaJ4D/GbjSO/5aE5j9JL3R0WJHwNA2cHHd0ZQ94HIHGHkyZFN2JT9NoVgE3s/om/JA+BYYWPN6a+/j9AHIUlfpG+DgEBgvUfZ6j3f3d/f275l2fz9i/HKgr+CAVAAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAEbgAABG4B0KOyaAAAAAd0SU1FB+oDBBMbJDicTaEAAABqSURBVCjPlZHRCkAhCEPd6P9/efflClKmJkQkOyuXmZnsofjvegIkjSG/YQwxHiYQ90YHMWtWEG9ON4jVezOIXSo7xEn2EeL0hx1alQhAn1IiQlxMxHCoTMnF3SwIDjjn1GG2Jq4vpX2GD5WTNQwxBFPfAAAAAElFTkSuQmCC";
var CURSOR_HAND_B64 = "iVBORw0KGgoAAAANSUhEUgAAABEAAAAWCAYAAAAmaHdCAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kb9Lw0AcxV/TSkUqDi0o0iFDdbKLijjWKhShQqgVWnUwufQXNGlIUlwcBdeCgz8Wqw4uzro6uAqC4A8Q/wBxUnSREr+XFFrEenDch3f3HnfvAKFZZZoVSACabpuZVFLM5VfF4Cv8CCCMYURlZhlzkpRGz/F1Dx9f7+I8q/e5P8egWrAY4BOJE8wwbeIN4plN2+C8TxxhZVklPieeMOmCxI9cVzx+41xyWeCZETObmSeOEIulLla6mJVNjXiaOKZqOuULOY9VzluctWqdte/JXxgq6CvLXKcZRQqLWIIEEQrqqKAKG3FadVIsZGg/2cM/6volcinkqoCRYwE1aJBdP/gf/O7WKk5NekmhJND34jgfY0BwF2g1HOf72HFaJ4D/GbjSO/5aE5j9JL3R0WJHwNA2cHHd0ZQ94HIHGHkyZFN2JT9NoVgE3s/om/JA+BYYWPN6a+/j9AHIUlfpG+DgEBgvUfZ6j3f3d/f275l2fz9i/HKgr+CAVAAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAEbgAABG4B0KOyaAAAAAd0SU1FB+oDBBMcN/NjmrgAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAfElEQVQ4y9VUWw6AMAijZPe/cv1w073YS43aZMlCoCmFTaQO+jME1AjIvR6AlZNA5Qb8i6RrsusynCbTGshUOyQDaaJu2ZOITDRi5SqRVmQWfuT35nRaia085Ks+CwCHEvh38o2NXVZzSUn4KrSM4x1PYK8Ch1p5XslM/QaJpTsOGx/5vgAAAABJRU5ErkJggg==";



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

/**
 * Compute the global scale factor from comp width and virtual resolution preset.
 * @param {number} compW        Comp width in pixels
 * @param {number} virtualResIndex  Index into VIRTUAL_RESOLUTIONS (0-4)
 * @returns {number} Scale multiplier (e.g. 2.4 for 1920px comp at 800x600)
 */
function calcCompScale(compW, virtualResIndex) {
    var res = VIRTUAL_RESOLUTIONS[virtualResIndex];
    if (!res || res.w === 0) return 1.0;
    return compW / res.w;
}

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

/**
 * Add a rounded rectangle group. Like addRect but sets Roundness for XP Luna corners.
 */
function addRoundedRect(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth, roundness) {
    var group = contents.addProperty("ADBE Vector Group");
    group.name = name;
    var gc = group.property("Contents");

    var rect = gc.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([w, h]);
    rect.property("Position").setValue([cx, cy]);
    rect.property("Roundness").setValue(roundness || 0);

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
 * Add an ellipse shape group. Used for icons and XP close button.
 */
function addEllipse(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth) {
    var group = contents.addProperty("ADBE Vector Group");
    group.name = name;
    var gc = group.property("Contents");

    var ellipse = gc.addProperty("ADBE Vector Shape - Ellipse");
    ellipse.property("Size").setValue([w, h]);
    ellipse.property("Position").setValue([cx, cy]);

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

// ── Pre-rendered PNG import utilities ───────────────────────────

/**
 * Base64 decode for ES3 — converts a base64 string to a binary string.
 * Compatible with ExtendScript's File.write() in BINARY encoding.
 */
function b64decode(str) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var i = 0;
    // Strip non-base64 chars
    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < str.length) {
        var enc1 = chars.indexOf(str.charAt(i++));
        var enc2 = chars.indexOf(str.charAt(i++));
        var enc3 = chars.indexOf(str.charAt(i++));
        var enc4 = chars.indexOf(str.charAt(i++));
        var chr1 = (enc1 << 2) | (enc2 >> 4);
        var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        var chr3 = ((enc3 & 3) << 6) | enc4;
        output += String.fromCharCode(chr1);
        if (enc3 !== 64) output += String.fromCharCode(chr2);
        if (enc4 !== 64) output += String.fromCharCode(chr3);
    }
    return output;
}

/**
 * Write base64-encoded PNG data to disk and import as AE footage.
 * Uses Documents/WindowsErrorFX/assets/ as stable cache dir.
 * @param {string} b64String  Base64-encoded PNG data
 * @param {string} filename   Filename without extension
 * @returns {FootageItem|null} Imported footage item, or null on failure
 */
function importEmbeddedPNG(b64String, filename) {
    if (!b64String) { wwarn("importEmbeddedPNG: empty data for " + filename); return null; }

    // Resolve cache directory
    var dirName = "WindowsErrorFX";
    var subDir = "assets";
    var sep = (Folder.myDocuments.fsName.indexOf("/") !== -1) ? "/" : "\\";
    var dirPath = Folder.myDocuments.fsName + sep + dirName + sep + subDir;
    var dir = new Folder(dirPath);
    if (!dir.exists) dir.create();
    if (!dir.exists) {
        werr("importEmbeddedPNG: cannot create dir: " + dirPath);
        return null;
    }

    var filePath = dirPath + sep + filename + ".png";
    var f = new File(filePath);

    // Only write if file doesn't already exist (cache hit)
    if (!f.exists) {
        var binary = b64decode(b64String);
        f.encoding = "BINARY";
        if (!f.open("w")) {
            werr("importEmbeddedPNG: cannot open for write: " + filePath);
            return null;
        }
        f.write(binary);
        f.close();
    }

    // Import into AE project
    try {
        var io = new ImportOptions(f);
        io.importAs = ImportAsType.FOOTAGE;
        io.sequence = false;
        var item = app.project.importFile(io);
        item.name = "WEFX_" + filename;
        return item;
    } catch (e) {
        werr("importEmbeddedPNG: import failed for " + filename + ": " + e.toString());
        return null;
    }
}

/**
 * Get or create the WindowsErrorFX_Assets folder in the AE project bin.
 * Keeps imported footage items organized.
 * @returns {FolderItem}
 */
function getOrCreateAssetFolder() {
    var folderName = "WindowsErrorFX_Assets";
    // Search existing project items
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === folderName) {
            return item;
        }
    }
    // Create new folder
    return app.project.items.addFolder(folderName);
}

/**
 * Get or create the WindowsErrorFX_Custom folder in the AE project bin.
 * This is the user-controlled folder for custom assets.
 * @returns {FolderItem}
 */
function getOrCreateCustomFolder() {
    var folderName = "WindowsErrorFX_Custom";
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === folderName) {
            return item;
        }
    }
    return app.project.items.addFolder(folderName);
}

/**
 * Find the WindowsErrorFX_Custom folder if it exists (does not create).
 * @returns {FolderItem|null}
 */
function findCustomFolder() {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof FolderItem && item.name === "WindowsErrorFX_Custom") {
            return item;
        }
    }
    return null;
}

/**
 * Export all built-in dialog + cursor PNGs to disk and import into
 * the WindowsErrorFX_Custom folder, giving users a starting point
 * to customize/replace/add assets.
 * @returns {number} Count of exported assets
 */
function exportBuiltInAssets() {
    var customFolder = getOrCreateCustomFolder();
    var sep = (Folder.myDocuments.fsName.indexOf("/") !== -1) ? "/" : "\\";
    var dirPath = Folder.myDocuments.fsName + sep + "WindowsErrorFX" + sep + "custom";
    var dir = new Folder(dirPath);
    if (!dir.exists) dir.create();
    if (!dir.exists) {
        werr("exportBuiltInAssets: cannot create dir: " + dirPath);
        return 0;
    }

    var count = 0;

    // Export dialog PNGs
    for (var i = 0; i < DIALOG_CATALOG.length; i++) {
        var entry = DIALOG_CATALOG[i];
        var b64 = DIALOG_PNG_DATA[entry.id];
        if (!b64) continue;
        var filename = "dialog_" + entry.id;
        var filePath = dirPath + sep + filename + ".png";
        var f = new File(filePath);
        if (!f.exists) {
            var binary = b64decode(b64);
            f.encoding = "BINARY";
            if (f.open("w")) {
                f.write(binary);
                f.close();
            }
        }
        try {
            var io = new ImportOptions(f);
            io.importAs = ImportAsType.FOOTAGE;
            io.sequence = false;
            var item = app.project.importFile(io);
            item.name = filename;
            item.parentFolder = customFolder;
            count++;
        } catch (e) {
            wwarn("exportBuiltInAssets: import failed for " + filename + ": " + e.toString());
        }
    }

    // Export cursor PNGs
    var cursorPairs = [
        { name: "cursor_arrow", b64: CURSOR_ARROW_B64 },
        { name: "cursor_hand", b64: CURSOR_HAND_B64 }
    ];
    for (var ci = 0; ci < cursorPairs.length; ci++) {
        var cp = cursorPairs[ci];
        if (!cp.b64) continue;
        var cPath = dirPath + sep + cp.name + ".png";
        var cf = new File(cPath);
        if (!cf.exists) {
            var cBin = b64decode(cp.b64);
            cf.encoding = "BINARY";
            if (cf.open("w")) {
                cf.write(cBin);
                cf.close();
            }
        }
        try {
            var cio = new ImportOptions(cf);
            cio.importAs = ImportAsType.FOOTAGE;
            cio.sequence = false;
            var cItem = app.project.importFile(cio);
            cItem.name = cp.name;
            cItem.parentFolder = customFolder;
            count++;
        } catch (e) {
            wwarn("exportBuiltInAssets: cursor import failed: " + e.toString());
        }
    }

    wlog("exportBuiltInAssets: exported " + count + " assets");
    return count;
}

/**
 * Apply position jitter (wiggle expression) to a layer.
 * @param {Layer} layer    Target AE layer
 * @param {number} jitterPct  Jitter intensity (0-200, 0=off)
 * @param {number} compScale  Virtual resolution multiplier
 */
function applyJitter(layer, jitterPct, compScale) {
    if (!jitterPct || jitterPct <= 0) return;
    var freq = 4 + (jitterPct / 100) * 8;    // 4-12 Hz
    var amp = (jitterPct / 100) * 30 * (compScale || 1);  // 0-30px scaled
    try {
        layer.property("Position").expression =
            "wiggle(" + freq.toFixed(1) + "," + amp.toFixed(1) + ")";
    } catch (e) {
        wwarn("applyJitter failed: " + e.toString());
    }
}

/**
 * Build an Error icon: red circle + white X (two rotated rects).
 * contents: shape layer Contents; size: icon bounding box; cx,cy: center.
 */
function buildIconError(contents, size, cx, cy) {
    var r = size / 2;
    addEllipse(contents, "IconCircle", size, size, cx, cy,
        C_ICON_ERROR, [0, 0, 0], 1);
    // Two crossed rectangles for the X
    var crossLen = size * 0.44;
    var crossW = size * 0.12;
    var group1 = addRect(contents, "IconX1", crossLen, crossW, cx, cy, [1, 1, 1], null, 0);
    try { group1.property("Transform").property("Rotation").setValue(45); } catch (e) {}
    var group2 = addRect(contents, "IconX2", crossLen, crossW, cx, cy, [1, 1, 1], null, 0);
    try { group2.property("Transform").property("Rotation").setValue(-45); } catch (e) {}
}

/**
 * Build a Warning icon: yellow triangle + black exclamation.
 */
function buildIconWarning(contents, size, cx, cy) {
    var half = size / 2;
    // Triangle pointing up
    var triVerts = [
        [cx, cy - half],          // top
        [cx - half, cy + half],   // bottom-left
        [cx + half, cy + half]    // bottom-right
    ];
    addPath(contents, "IconTriangle", triVerts, true, C_ICON_WARNING, [0, 0, 0], 1);
    // Exclamation stem
    var stemH = size * 0.38;
    var stemW = size * 0.12;
    addRect(contents, "IconStem", stemW, stemH, cx, cy - stemH * 0.1, [0, 0, 0], null, 0);
    // Exclamation dot
    addRect(contents, "IconDot", stemW, stemW, cx, cy + half - stemW * 1.5, [0, 0, 0], null, 0);
}

/**
 * Build a Question icon: blue circle + white ? (via small rects).
 */
function buildIconQuestion(contents, size, cx, cy) {
    addEllipse(contents, "IconCircle", size, size, cx, cy,
        C_ICON_QUESTION, [0, 0, 0], 1);
    // Question mark approximation with rects
    var unit = size * 0.08;
    // Arc top
    addRect(contents, "IconQ1", unit * 4, unit * 1.5, cx, cy - size * 0.25, [1, 1, 1], null, 0);
    // Right side
    addRect(contents, "IconQ2", unit * 1.5, unit * 2, cx + unit * 1.5, cy - size * 0.12, [1, 1, 1], null, 0);
    // Diagonal center
    addRect(contents, "IconQ3", unit * 1.5, unit * 2, cx, cy + unit, [1, 1, 1], null, 0);
    // Dot
    addRect(contents, "IconQ4", unit * 1.5, unit * 1.5, cx, cy + size * 0.3, [1, 1, 1], null, 0);
}

/**
 * Build an Info icon: blue circle + white i (via small rects).
 */
function buildIconInfo(contents, size, cx, cy) {
    addEllipse(contents, "IconCircle", size, size, cx, cy,
        C_ICON_INFO, [0, 0, 0], 1);
    // Dot of the i
    var unit = size * 0.08;
    addRect(contents, "IconIDot", unit * 1.5, unit * 1.5, cx, cy - size * 0.22, [1, 1, 1], null, 0);
    // Stem of the i
    addRect(contents, "IconIStem", unit * 1.5, size * 0.35, cx, cy + size * 0.08, [1, 1, 1], null, 0);
}

/**
 * Apply AE Echo effect (trails) to a layer. Fully try/catch wrapped.
 * params: { echoes, decay, fps }
 */
function applyTrailsEffect(layer, params) {
    try {
        var echoes = params.echoes || DEFAULT_TRAILS_ECHOES;
        var decay = (params.decay != null) ? params.decay : DEFAULT_TRAILS_DECAY;
        var fps = params.fps || 24;
        var echoTime = -2 / fps; // negative = trailing behind

        var effects = layer.property("Effects");
        var echo = null;
        // Try display name first
        try {
            echo = effects.addProperty("Echo");
        } catch (e1) {
            // Try ADBE match name
            try {
                echo = effects.addProperty("ADBE Echo");
            } catch (e2) {
                wlog("applyTrailsEffect: Echo effect not available");
                return;
            }
        }
        if (!echo) return;

        // Set properties — try display names first, ADBE fallback
        try { echo.property("Echo Time (seconds)").setValue(echoTime); } catch (e) {
            try { echo.property(1).setValue(echoTime); } catch (e2) {}
        }
        try { echo.property("Number Of Echoes").setValue(echoes); } catch (e) {
            try { echo.property(2).setValue(echoes); } catch (e2) {}
        }
        // Starting Intensity: 1.0 (full)
        try { echo.property("Starting Intensity").setValue(1.0); } catch (e) {
            try { echo.property(3).setValue(1.0); } catch (e2) {}
        }
        // Decay: convert percent to 0-1
        var decayVal = 1.0 - (decay / 100);
        try { echo.property("Decay").setValue(decayVal); } catch (e) {
            try { echo.property(4).setValue(decayVal); } catch (e2) {}
        }
        // Echo Operator: Composite In Front
        try { echo.property("Echo Operator").setValue(4); } catch (e) {
            try { echo.property(5).setValue(4); } catch (e2) {}
        }

        wlog("applyTrailsEffect: applied Echo (echoes=" + echoes + " decay=" + decay + "% time=" + echoTime.toFixed(4) + ")");
    } catch (e) {
        wwarn("applyTrailsEffect: failed: " + e.toString());
    }
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

// ── Per-element settings helpers ─────────────────────────────

/** Returns a fresh per-element settings object with all defaults. */
function defaultElementSettings() {
    return {
        count: 0,
        minFrames: FLOOR_FRAMES,
        maxFrames: MAX_FRAMES,
        scale: DEFAULT_ELEMENT_SCALE,
        speed: DEFAULT_SPEED_MULT,
        opacityMin: DEFAULT_OPACITY_MIN,
        opacityMax: DEFAULT_OPACITY_MAX,
        entryFrames: DEFAULT_ENTRY_FRAMES,
        exitFrames: DEFAULT_EXIT_FRAMES,
        // Per-element overrides (null = inherit global)
        trails: null,
        rotoForce: null,
        curve: null,
        customMessages: null,
        customTitles: null,
        jitter: 0
    };
}

/**
 * Resolve per-element settings with null-safe defaults.
 * Returns filled object even if settings.elements or the type key is missing.
 */
function getElementSettings(settings, type) {
    var defaults = defaultElementSettings();
    if (!settings || !settings.elements || !settings.elements[type]) {
        return defaults;
    }
    var src = settings.elements[type];
    return {
        count: (src.count != null) ? src.count : defaults.count,
        minFrames: (src.minFrames != null) ? src.minFrames : defaults.minFrames,
        maxFrames: (src.maxFrames != null) ? src.maxFrames : defaults.maxFrames,
        scale: (src.scale != null) ? src.scale : defaults.scale,
        speed: (src.speed != null) ? src.speed : defaults.speed,
        opacityMin: (src.opacityMin != null) ? src.opacityMin : defaults.opacityMin,
        opacityMax: (src.opacityMax != null) ? src.opacityMax : defaults.opacityMax,
        entryFrames: (src.entryFrames != null) ? src.entryFrames : defaults.entryFrames,
        exitFrames: (src.exitFrames != null) ? src.exitFrames : defaults.exitFrames,
        trails: src.trails || null,
        rotoForce: src.rotoForce || null,
        curve: src.curve || null,
        customMessages: src.customMessages || null,
        customTitles: src.customTitles || null,
        jitter: (src.jitter != null) ? src.jitter : defaults.jitter
    };
}

/**
 * Detect old-format settings and convert to new per-element format.
 * Old format had flat fields: counts, minFrames, maxFrames, elementScale, etc.
 * New format nests these under settings.elements.{type}.
 * Returns raw unchanged if elements already exists.
 */
function migrateSettings(raw) {
    if (!raw) return raw;
    // Backfill virtualRes if missing (any format)
    if (raw.virtualRes == null) raw.virtualRes = DEFAULT_VIRTUAL_RES_INDEX;
    // Backfill rotoBehindPct if missing (any format)
    if (raw.rotoBehindPct == null) raw.rotoBehindPct = 50;
    // Already new format — but backfill freeze and jitter if missing
    if (raw.elements) {
        if (!raw.elements.freeze) raw.elements.freeze = defaultElementSettings();
        // Backfill jitter on all element types
        var _jitterTypes = ["dialog", "bsod", "cursor", "pixel", "freeze"];
        for (var ji = 0; ji < _jitterTypes.length; ji++) {
            if (raw.elements[_jitterTypes[ji]] && raw.elements[_jitterTypes[ji]].jitter == null) {
                raw.elements[_jitterTypes[ji]].jitter = 0;
            }
        }
        return raw;
    }
    // Detect old format: has counts or flat minFrames
    if (!raw.counts && raw.minFrames == null && raw.elementScale == null) return raw;

    var typeNames = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    var oldCounts = raw.counts || {};
    var baseElem = {
        minFrames: (raw.minFrames != null) ? raw.minFrames : FLOOR_FRAMES,
        maxFrames: (raw.maxFrames != null) ? raw.maxFrames : MAX_FRAMES,
        scale: (raw.elementScale != null) ? raw.elementScale : DEFAULT_ELEMENT_SCALE,
        speed: (raw.speedMult != null) ? raw.speedMult : DEFAULT_SPEED_MULT,
        opacityMin: (raw.opacityMin != null) ? raw.opacityMin : DEFAULT_OPACITY_MIN,
        opacityMax: (raw.opacityMax != null) ? raw.opacityMax : DEFAULT_OPACITY_MAX,
        entryFrames: (raw.entryFrames != null) ? raw.entryFrames : DEFAULT_ENTRY_FRAMES,
        exitFrames: (raw.exitFrames != null) ? raw.exitFrames : DEFAULT_EXIT_FRAMES
    };

    raw.elements = {};
    for (var i = 0; i < typeNames.length; i++) {
        var t = typeNames[i];
        raw.elements[t] = {
            count: (oldCounts[t] != null) ? oldCounts[t] : 0,
            minFrames: baseElem.minFrames,
            maxFrames: baseElem.maxFrames,
            scale: baseElem.scale,
            speed: baseElem.speed,
            opacityMin: baseElem.opacityMin,
            opacityMax: baseElem.opacityMax,
            entryFrames: baseElem.entryFrames,
            exitFrames: baseElem.exitFrames
        };
    }

    // Remove deprecated flat keys
    delete raw.counts;
    delete raw.minFrames;
    delete raw.maxFrames;
    delete raw.elementScale;
    delete raw.speedMult;
    delete raw.opacityMin;
    delete raw.opacityMax;
    delete raw.entryFrames;
    delete raw.exitFrames;

    return raw;
}

/**
 * Returns a fully randomized settings object.
 * Uses Math.random() (not PRNG — this is a UI action, not deterministic generation).
 */
function randomizeSettings() {
    var typeNames = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    var curves = ["flat", "build", "peak", "burst", "random"];
    var styles = ["xpClassic", "glitchHeavy", "slowBurn", "chaosMax"];
    var rotoModes = ["split", "allOver", "allUnder", "flat"];

    var elements = {};
    for (var i = 0; i < typeNames.length; i++) {
        var t = typeNames[i];
        var minF = Math.floor(Math.random() * 40) + 4;  // 4-43
        var maxF = minF + Math.floor(Math.random() * 80) + 10; // minF+10 to minF+89
        var el = {
            count: Math.floor(Math.random() * 30),
            minFrames: minF,
            maxFrames: maxF,
            scale: Math.floor(Math.random() * 150) + 50,  // 50-199
            speed: Math.floor(Math.random() * 150) + 50,   // 50-199
            opacityMin: Math.floor(Math.random() * 50) + 20, // 20-69
            opacityMax: Math.floor(Math.random() * 30) + 70, // 70-99
            entryFrames: Math.floor(Math.random() * 8) + 1,  // 1-8
            exitFrames: Math.floor(Math.random() * 6) + 1,   // 1-6
            // Per-element overrides (~30% chance each)
            trails: (Math.random() < 0.3) ? {
                enabled: Math.random() > 0.2,
                chance: Math.floor(Math.random() * 80) + 5,
                echoes: Math.floor(Math.random() * 8) + 2,
                decay: Math.floor(Math.random() * 70) + 20
            } : null,
            rotoForce: (Math.random() < 0.3) ? ((Math.random() < 0.5) ? "over" : "under") : null,
            curve: (Math.random() < 0.3) ? curves[Math.floor(Math.random() * curves.length)] : null,
            customMessages: null,
            customTitles: null,
            jitter: Math.floor(Math.random() * 100)
        };
        elements[t] = el;
    }

    return {
        seed: Math.floor(Math.random() * 89999) + 10000,
        chaos: Math.floor(Math.random() * 181) + 20,  // 20-200
        rotoMode: rotoModes[Math.floor(Math.random() * rotoModes.length)],
        chaosCurve: curves[Math.floor(Math.random() * curves.length)],
        animStyle: styles[Math.floor(Math.random() * styles.length)],
        virtualRes: Math.floor(Math.random() * VIRTUAL_RESOLUTIONS.length),
        elements: elements,
        scanlines: {
            enabled: Math.random() > 0.3,
            opacity: Math.floor(Math.random() * 40) + 5,
            spacing: Math.floor(Math.random() * 8) + 2,
            jitter: Math.random() > 0.5
        },
        noise: {
            enabled: Math.random() > 0.3,
            opacity: Math.floor(Math.random() * 20) + 2,
            scale: Math.floor(Math.random() * 150) + 50,
            complexity: Math.floor(Math.random() * 15) + 1
        },
        headScratch: {
            enabled: Math.random() > 0.5,
            freq: Math.floor(Math.random() * 30) + 5,
            height: Math.floor(Math.random() * 4) + 1
        },
        trails: {
            enabled: Math.random() > 0.3,
            chance: Math.floor(Math.random() * 80) + 5,
            echoes: Math.floor(Math.random() * 8) + 2,
            decay: Math.floor(Math.random() * 70) + 20
        },
        stackDepth: Math.floor(Math.random() * 12) + 3,
        stackOffset: Math.floor(Math.random() * 20) + 5,
        rotoBehindPct: Math.floor(Math.random() * 101),
        customMessages: [],
        customTitles: [],
        rotoKeywords: [],
        rotoLayerNames: []
    };
}


// ════════════════════════════════════════════════════════════════
// SECTION 4 — ELEMENT BUILDERS
// ════════════════════════════════════════════════════════════════

/**
 * Build a BSOD panel element with era variant support.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           behavior, variant, bsodEra, textBehavior, slideDir, slideSpeed,
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
    var era = params.bsodEra || "xp";

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

    // Era-specific font and text
    var bsodFont = (era === "9x") ? FONT_BSOD_9X : FONT_BSOD;
    var textLines = params.textLines || ["*** STOP: 0x0000000A"];
    var textContent = textLines.join("\n");
    var scaledBsodFont = Math.round(FSIZE_BSOD * sc);

    // 9x era: add grey highlight bar above text
    if (era === "9x") {
        var highlightH = Math.round(scaledBsodFont + 4);
        var highlightY = panelY - panelH / 3;
        var hlShape = targetComp.layers.addShape();
        hlShape.name = "WEFX_BSOD_Highlight";
        var hlContents = hlShape.property("Contents");
        addRect(hlContents, "Bar", panelW, highlightH, 0, 0,
            [0.667, 0.667, 0.667], null, 0); // #AAAAAA grey
        hlShape.property("Position").setValue([panelX, highlightY]);
        hlShape.property("Opacity").setValue(params.opacity || 90);
        setLayerTime(hlShape, inSec, outSec, targetComp);
        if (params.behavior === "slideH" || params.behavior === "slideV" || params.behavior === "stutter") {
            hlShape.parent = shapeLayer;
            hlShape.property("Position").setValue([0, -(panelH / 3)]);
        }
        layers.push(hlShape);

        // Highlight text (inverted colors: blue on grey)
        var hlTextLayer = createTextLayer(targetComp, "A Fatal Exception Has Occurred",
            bsodFont, scaledBsodFont, C_BSOD_BG, panelX, highlightY,
            ParagraphJustification.LEFT_JUSTIFY);
        hlTextLayer.name = "WEFX_BSOD_HighlightText";
        setLayerTime(hlTextLayer, inSec, outSec, targetComp);
        hlTextLayer.property("Opacity").setValue(params.opacity || 90);
        if (params.behavior === "slideH" || params.behavior === "slideV" || params.behavior === "stutter") {
            hlTextLayer.parent = shapeLayer;
            hlTextLayer.property("Position").setValue([
                -(panelW / 2) + 10,
                -(panelH / 3) + scaledBsodFont / 3
            ]);
        }
        layers.push(hlTextLayer);
    }

    var textLayer = createTextLayer(targetComp, textContent,
        bsodFont, scaledBsodFont, C_BSOD_TEXT, panelX, panelY,
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

    // 9x era: blinking white block cursor at end of text
    if (era === "9x") {
        var cursorW = Math.round(9 * sc);
        var cursorH = Math.round(scaledBsodFont);
        var blockCursor = targetComp.layers.addShape();
        blockCursor.name = "WEFX_BSOD_BlockCursor";
        var bcContents = blockCursor.property("Contents");
        addRect(bcContents, "Block", cursorW, cursorH, 0, 0, C_BSOD_TEXT, null, 0);
        blockCursor.property("Position").setValue([
            panelX + textLines.length * 3, // approximate cursor position
            panelY + (textLines.length - 1) * (scaledBsodFont + 2)
        ]);
        setLayerTime(blockCursor, inSec, outSec, targetComp);
        if (params.behavior === "slideH" || params.behavior === "slideV" || params.behavior === "stutter") {
            blockCursor.parent = shapeLayer;
        }
        // Blink: toggle opacity every 15 frames
        var blinkOpac = blockCursor.property("Opacity");
        var totalBlinkFrames = Math.round(dur * fps);
        for (var bfi = 0; bfi < totalBlinkFrames; bfi += 15) {
            var bfTime = snapToFrame(inSec + framesToSeconds(bfi, fps), fps);
            if (bfTime < outSec) {
                setHoldKey(blinkOpac, bfTime, (bfi % 30 < 15) ? 100 : 0);
            }
        }
        layers.push(blockCursor);
    }

    layers.push(textLayer);
    return layers;
}


/**
 * Build a Win9x/2000/XP dialog box element using pre-rendered PNG.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           catalogId, dialogVariant,
 *           arrivalBehavior, lifeBehavior, exitBehavior,
 *           driftDir, driftSpeed, shakeFrame, shakeDur,
 *           stackIndex, opacity, _wefxGetFootage }
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
    var si = params.stackIndex || 0;
    var stackOff = params.stackOffset || STACK_OFFSET_X;

    // Resolve dialog dimensions from catalog entry
    var vKey = params.dialogVariant || "B";
    var v = DIALOG_VARIANTS[vKey] || DIALOG_VARIANTS.B;
    var W = Math.round(DIALOG_WIDTH * sc);
    var titleH = Math.round(v.titleH * sc);
    var H = Math.round(DIALOG_HEIGHT * sc) + (titleH - Math.round(18 * sc));

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

    // 2. Pre-rendered dialog PNG (replaces shape layer + all text layers)
    var useCustom = params._customAssets && params._customAssets.length > 0
        && rngBool(rng, 0.5);
    var footage;
    if (useCustom) {
        footage = rngPick(rng, params._customAssets);
    } else {
        footage = params._wefxGetFootage ? params._wefxGetFootage(params.catalogId) : null;
    }
    if (footage) {
        var chrome = targetComp.layers.add(footage);
        chrome.name = "WEFX_Dialog";
        chrome.parent = nullLayer;
        chrome.quality = LayerQuality.DRAFT;  // nearest-neighbor for pixel-art look
        chrome.property("Scale").setValue([sc * 100, sc * 100]);
        chrome.property("Anchor Point").setValue([footage.width / 2, footage.height / 2]);
        chrome.property("Position").setValue([0, 0]);
        chrome.property("Opacity").setValue(params.opacity || 95);
        setLayerTime(chrome, inSec, outSec, targetComp);
        layers.push(chrome);
    }

    // 3. Arrival animation
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

    // 4. Life behavior
    if (params.lifeBehavior === "drift") {
        var driftAngle = (params.driftDir || rngFloat(rng, 0, 360)) * Math.PI / 180;
        var driftSpd = (params.driftSpeed || rngFloat(rng, 0.5, 2)) * spd;
        var totalDriftFrames = Math.round(dur * fps);
        var dx = Math.cos(driftAngle) * driftSpd * totalDriftFrames;
        var dy = Math.sin(driftAngle) * driftSpd * totalDriftFrames;
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
        var shakeEnd = snapToFrame(shakeStart + framesToSeconds(shakeFrameCount, fps), fps);
        if (shakeEnd < outSec) {
            setHoldKey(nullPos, shakeEnd, [cx, cy]);
        }
    }

    // 5. Exit behavior
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
 * Build a window chrome fragment (isolated UI debris) with variant colors.
 * params: { inPoint, outPoint, x, y, compW, compH, rng,
 *           fragmentType, behavior, title, dialogVariant, driftDir, driftSpeed,
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

    // Resolve variant palette for colors
    var vKey = params.dialogVariant || "B";
    var v = DIALOG_VARIANTS[vKey] || DIALOG_VARIANTS.B;

    var fragType = params.fragmentType || "titleBar";
    var x = params.x;
    var y = params.y;

    if (fragType === "titleBar" || fragType === "titleStack") {
        var barCount = (fragType === "titleStack") ? (params.stackCount || rngInt(rng, 3, 6)) : 1;
        for (var bi = 0; bi < barCount; bi++) {
            var barW = Math.round(rngInt(rng, 120, 260) * sc);
            var barH = Math.round(v.titleH * sc);
            var barY = y + bi * (barH + 1);

            var barShape = targetComp.layers.addShape();
            barShape.name = "WEFX_Chrome_TitleBar";
            var barContents = barShape.property("Contents");
            addRect(barContents, "Bar", barW, barH, 0, 0, v.titleStart, null, 0);
            barShape.property("Position").setValue([x, barY]);
            barShape.property("Opacity").setValue(params.opacity || 85);
            setLayerTime(barShape, inSec, outSec, targetComp);
            layers.push(barShape);

            var titleStr = params.title || pickWindowTitle(rng, []);
            var titleTL = createTextLayer(targetComp, titleStr,
                FONT_UI, FSIZE_DIALOG_TITLE, [1, 1, 1],
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
                v.btnBg, v.btnBorderD, 1);
        }
        rowShape.property("Position").setValue([x, y]);
        rowShape.property("Opacity").setValue(params.opacity || 80);
        setLayerTime(rowShape, inSec, outSec, targetComp);
        layers.push(rowShape);
    } else if (fragType === "closeBtn") {
        var closeShape = targetComp.layers.addShape();
        closeShape.name = "WEFX_Chrome_CloseBtn";
        var closeContents = closeShape.property("Contents");
        if (v.closeBtn) {
            // XP Luna: red oval close button
            addEllipse(closeContents, "Btn", 21, 14, 0, 0, v.closeBtn, null, 0);
            var cx1 = addRect(closeContents, "X1", 8, 2, 0, 0, [1, 1, 1], null, 0);
            try { cx1.property("Transform").property("Rotation").setValue(45); } catch (e) {}
            var cx2 = addRect(closeContents, "X2", 8, 2, 0, 0, [1, 1, 1], null, 0);
            try { cx2.property("Transform").property("Rotation").setValue(-45); } catch (e) {}
        } else {
            addRect(closeContents, "Btn", 16, 14, 0, 0, v.btnBg, v.btnBorderD, 1);
            addRect(closeContents, "X", 8, 2, 0, 0, [0, 0, 0], null, 0);
        }
        closeShape.property("Position").setValue([x, y]);
        closeShape.property("Opacity").setValue(params.opacity || 90);
        setLayerTime(closeShape, inSec, outSec, targetComp);
        layers.push(closeShape);
    } else if (fragType === "scrollbar") {
        var sbShape = targetComp.layers.addShape();
        sbShape.name = "WEFX_Chrome_Scrollbar";
        var sbContents = sbShape.property("Contents");
        var sbH = rngInt(rng, 60, 200);
        addRect(sbContents, "Track", 16, sbH, 0, 0, [0.9, 0.9, 0.9], v.btnBorderD, 1);
        addRect(sbContents, "Thumb", 14, rngInt(rng, 20, 40), 0, rngInt(rng, -sbH / 4, sbH / 4),
            v.btnBg, v.btnBorderD, 1);
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

    // Pre-rendered cursor footage (arrow or hand)
    var cursorFootage = (params.cursorVariant === "hand")
        ? params._wefxHandFootage : params._wefxArrowFootage;

    function makeCursorLayer(cx, cy, opacity) {
        var cl;
        if (cursorFootage) {
            cl = targetComp.layers.add(cursorFootage);
            cl.name = "WEFX_Cursor";
            cl.quality = LayerQuality.DRAFT;  // nearest-neighbor for pixel art
            cl.property("Scale").setValue([sc * 100, sc * 100]);
        } else {
            // Fallback: polygon shape (if footage import failed)
            var polyScale = cursorSize / 21;
            var cursorVerts = [
                [0, 0], [0, 21 * polyScale],
                [4 * polyScale, 16 * polyScale], [7 * polyScale, 21 * polyScale],
                [11 * polyScale, 14 * polyScale], [7 * polyScale, 11 * polyScale],
                [7 * polyScale, 5 * polyScale]
            ];
            cl = targetComp.layers.addShape();
            cl.name = "WEFX_Cursor";
            var cc = cl.property("Contents");
            addPath(cc, "Arrow", cursorVerts, true, C_CURSOR_FILL, C_CURSOR_STROKE, 1);
        }
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
            var trailCl;
            if (cursorFootage) {
                trailCl = targetComp.layers.add(cursorFootage);
                trailCl.name = "WEFX_Cursor_Trail";
                trailCl.quality = LayerQuality.DRAFT;
                trailCl.property("Scale").setValue([sc * 100, sc * 100]);
            } else {
                var tPolyScale = cursorSize / 21;
                var tVerts = [
                    [0, 0], [0, 21 * tPolyScale],
                    [4 * tPolyScale, 16 * tPolyScale], [7 * tPolyScale, 21 * tPolyScale],
                    [11 * tPolyScale, 14 * tPolyScale], [7 * tPolyScale, 11 * tPolyScale],
                    [7 * tPolyScale, 5 * tPolyScale]
                ];
                trailCl = targetComp.layers.addShape();
                trailCl.name = "WEFX_Cursor_Trail";
                var trailCC = trailCl.property("Contents");
                addPath(trailCC, "Arrow", tVerts, true, C_CURSOR_FILL, C_CURSOR_STROKE, 1);
            }
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
 * Build pixel corruption effect.
 * Behaviors: microScatter, rowSmear, blockDisplace, scanlineShift, hTear
 * params: { inPoint, outPoint, x, y, compW, compH, rng, behavior, opacity,
 *           scale, entryFrames, exitFrames, footageLayer,
 *           clusterSize, stripHeight, smearRows, blockW, blockH,
 *           offsetX, offsetY, bandHeight, shiftPx, bandCount,
 *           tearH, tearW, tearColor }
 */
function buildPixelBlock(params, targetComp) {
    var layers = [];
    var rng = params.rng;
    var inSec = params.inPoint;
    var outSec = params.outPoint;
    var fps = targetComp.frameRate;
    var sc = params.scale || 1;
    var opacity = params.opacity || 100;
    var entryF = params.entryFrames || 1;
    var exitF = params.exitFrames || 1;

    // Helper: apply entry/exit opacity fade (or hard cut if 1 frame)
    function applyOpacityEnvelope(layer) {
        var opac = layer.property("Opacity");
        if (entryF > 1 || exitF > 1) {
            // Entry
            var entryEnd = snapToFrame(inSec + framesToSeconds(entryF, fps), fps);
            if (entryF > 1) {
                setLinearKey(opac, inSec, 0);
                setLinearKey(opac, Math.min(entryEnd, outSec), opacity);
            } else {
                opac.setValue(opacity);
            }
            // Exit
            var exitStart = snapToFrame(outSec - framesToSeconds(exitF, fps), fps);
            if (exitF > 1) {
                setLinearKey(opac, Math.max(exitStart, inSec), opacity);
                setLinearKey(opac, outSec, 0);
            }
        } else {
            opac.setValue(opacity);
        }
    }

    if (params.behavior === "microScatter") {
        // Dead/stuck pixel cluster: single shape layer with multiple tiny rects
        var scatterShape = targetComp.layers.addShape();
        scatterShape.name = "WEFX_Pixel_Scatter";
        var scatterContents = scatterShape.property("Contents");
        var clusterRadius = rngInt(rng, 10, 30);
        var clusterSize = params.clusterSize || rngInt(rng, 5, 15);
        for (var ci = 0; ci < clusterSize; ci++) {
            var pixSize = rngInt(rng, 1, 3);
            var px = rngInt(rng, -clusterRadius, clusterRadius);
            var py = rngInt(rng, -clusterRadius, clusterRadius);
            var pixColor = rngPick(rng, C_PIXEL_COLORS);
            addRect(scatterContents, "Px" + ci, pixSize, pixSize, px, py, pixColor, null, 0);
        }
        scatterShape.property("Position").setValue([params.x, params.y]);
        setLayerTime(scatterShape, inSec, outSec, targetComp);
        applyOpacityEnvelope(scatterShape);
        layers.push(scatterShape);

    } else if (params.behavior === "rowSmear") {
        // Horizontal footage strip duplicated and stretched vertically
        if (!params.footageLayer) {
            // Fallback to hTear when no footage available
            params.behavior = "hTear";
            params.tearH = params.tearH || rngInt(rng, 1, 2);
            params.tearW = params.tearW || rngInt(rng, Math.round(params.compW / 2), params.compW);
            params.tearColor = params.tearColor || rngPick(rng, C_PIXEL_COLORS);
            return buildPixelBlock(params, targetComp);
        }
        var stripH = params.stripHeight || rngInt(rng, 1, 5);
        var smearH = params.smearRows || rngInt(rng, 3, 20);
        var dup = targetComp.layers.add(params.footageLayer.source);
        dup.name = "WEFX_Pixel_RowSmear";
        // Rectangular mask: full comp width × stripH at source Y
        var maskGroup = dup.property("Masks").addProperty("Mask");
        var maskShape = new Shape();
        var srcY = params.y;
        maskShape.vertices = [
            [0, srcY - stripH / 2],
            [params.compW, srcY - stripH / 2],
            [params.compW, srcY + stripH / 2],
            [0, srcY + stripH / 2]
        ];
        maskShape.closed = true;
        maskGroup.property("Mask Path").setValue(maskShape);
        // Stretch vertically to create smear
        var yScale = (smearH / stripH) * 100;
        dup.property("Scale").setValue([100, yScale]);
        // Offset from source row
        var yOff = rngInt(rng, -50, 50);
        dup.property("Position").setValue([params.compW / 2, srcY + yOff]);
        setLayerTime(dup, inSec, outSec, targetComp);
        applyOpacityEnvelope(dup);
        layers.push(dup);

    } else if (params.behavior === "blockDisplace") {
        // Rectangular footage chunk copied and offset
        if (!params.footageLayer) {
            // Fallback to microScatter when no footage available
            params.behavior = "microScatter";
            params.clusterSize = params.clusterSize || rngInt(rng, 5, 15);
            return buildPixelBlock(params, targetComp);
        }
        var bw = params.blockW || rngInt(rng, 20, 80);
        var bh = params.blockH || rngInt(rng, 10, 60);
        var offX = params.offsetX || rngInt(rng, -100, 100);
        var offY = params.offsetY || rngInt(rng, -100, 100);
        var bDup = targetComp.layers.add(params.footageLayer.source);
        bDup.name = "WEFX_Pixel_BlockDisplace";
        // Rectangular mask at source position
        var bMaskGroup = bDup.property("Masks").addProperty("Mask");
        var bMaskShape = new Shape();
        bMaskShape.vertices = [
            [params.x - bw / 2, params.y - bh / 2],
            [params.x + bw / 2, params.y - bh / 2],
            [params.x + bw / 2, params.y + bh / 2],
            [params.x - bw / 2, params.y + bh / 2]
        ];
        bMaskShape.closed = true;
        bMaskGroup.property("Mask Path").setValue(bMaskShape);
        // Offset from source
        bDup.property("Position").setValue([params.x + offX, params.y + offY]);
        setLayerTime(bDup, inSec, outSec, targetComp);
        applyOpacityEnvelope(bDup);
        layers.push(bDup);

    } else if (params.behavior === "scanlineShift") {
        // Horizontal footage bands shifted sideways
        if (!params.footageLayer) {
            // Fallback to hTear when no footage available
            params.behavior = "hTear";
            params.tearH = params.tearH || rngInt(rng, 1, 2);
            params.tearW = params.tearW || rngInt(rng, Math.round(params.compW / 2), params.compW);
            params.tearColor = params.tearColor || rngPick(rng, C_PIXEL_COLORS);
            return buildPixelBlock(params, targetComp);
        }
        var bandH = params.bandHeight || rngInt(rng, 3, 15);
        var shiftPx = params.shiftPx || rngInt(rng, 5, 30);
        var bandCount = params.bandCount || rngInt(rng, 1, 4);
        for (var bi = 0; bi < bandCount; bi++) {
            var sDup = targetComp.layers.add(params.footageLayer.source);
            sDup.name = "WEFX_Pixel_ScanShift";
            var sMaskGroup = sDup.property("Masks").addProperty("Mask");
            var sMaskShape = new Shape();
            var bandY = params.y + (bi * bandH);
            sMaskShape.vertices = [
                [0, bandY],
                [params.compW, bandY],
                [params.compW, bandY + bandH],
                [0, bandY + bandH]
            ];
            sMaskShape.closed = true;
            sMaskGroup.property("Mask Path").setValue(sMaskShape);
            // Shift horizontally
            sDup.property("Position").setValue([params.compW / 2 + shiftPx, params.compH / 2]);
            setLayerTime(sDup, inSec, outSec, targetComp);
            applyOpacityEnvelope(sDup);
            layers.push(sDup);
        }

    } else if (params.behavior === "hTear") {
        // Thin bright horizontal line — revised: static, no animation during hold
        var tearShape = targetComp.layers.addShape();
        tearShape.name = "WEFX_Pixel_Tear";
        var tearContents = tearShape.property("Contents");
        var tH = params.tearH || rngInt(rng, 1, 2);
        var tW = params.tearW || rngInt(rng, Math.round(params.compW / 2), params.compW);
        var tColor = params.tearColor || rngPick(rng, C_PIXEL_COLORS);
        addRect(tearContents, "Tear", tW, tH, 0, 0, tColor, null, 0);
        tearShape.property("Position").setValue([params.compW / 2, params.y]);
        setLayerTime(tearShape, inSec, outSec, targetComp);
        applyOpacityEnvelope(tearShape);
        layers.push(tearShape);
    }

    return layers;
}

/**
 * Build freeze strip(s) — frozen horizontal band(s) of footage.
 * Single: one strip. Cluster: 2–5 strips sharing timing.
 * @param {object} job - ElementJob from scheduler
 * @param {CompItem} targetComp - the OVER or UNDER comp to add layers to
 * @returns {Array} created layers
 */
function buildFreezeStrip(job, targetComp) {
    var layers = [];
    if (!job.footageLayer || !job.footageLayer.source) return layers;

    var frameRate = targetComp.frameRate;
    var freezeTimeSec = job.freezeFrame / frameRate;

    function makeStrip(stripY, stripH, layerName) {
        var dup = targetComp.layers.add(job.footageLayer.source);
        dup.name = layerName;

        // Enable time remapping and freeze on a single frame
        dup.timeRemapEnabled = true;
        var tr = dup.property("ADBE Time Remapping");
        // Set all existing keyframes to the freeze time (don't remove them —
        // removing all keyframes hides the property and breaks setValue)
        for (var ki = tr.numKeys; ki >= 1; ki--) {
            tr.setValueAtTime(tr.keyTime(ki), freezeTimeSec);
        }

        // Apply rectangular mask for the strip
        var mask = dup.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        mask.property("ADBE Mask Mode").setValue(1); // Add mode
        var shape = new Shape();
        shape.vertices = [[0, stripY], [job.compW, stripY], [job.compW, stripY + stripH], [0, stripY + stripH]];
        shape.closed = true;
        mask.property("ADBE Mask Shape").setValue(shape);

        // Set in/out points
        dup.inPoint = job.inPoint;
        dup.outPoint = job.outPoint;

        // Opacity envelope
        var opac = dup.property("ADBE Transform Group").property("ADBE Opacity");
        var entryF = job.entryFrames || 1;
        var exitF = job.exitFrames || 1;
        var baseOpacity = job.opacity || 100;

        if (entryF > 1 || exitF > 1) {
            opac.setValueAtTime(job.inPoint, (entryF > 1) ? 0 : baseOpacity);
            if (entryF > 1) {
                opac.setValueAtTime(job.inPoint + entryF / frameRate, baseOpacity);
            }
            if (exitF > 1) {
                opac.setValueAtTime(job.outPoint - exitF / frameRate, baseOpacity);
            }
            opac.setValueAtTime(job.outPoint, (exitF > 1) ? 0 : baseOpacity);
        } else {
            opac.setValue(baseOpacity);
        }

        layers.push(dup);
        return dup;
    }

    if (job.behavior === "single") {
        makeStrip(job.stripY, job.stripHeight, "WEFX_Freeze_Single");
    } else if (job.behavior === "cluster") {
        var strips = job.strips || [];
        for (var ci = 0; ci < strips.length; ci++) {
            makeStrip(strips[ci].y, strips[ci].height, "WEFX_Freeze_Cluster_" + (ci + 1));
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
        { name: "cursor", weight: mix.cursor || 0 },
        { name: "pixel",  weight: mix.pixel  || 0 },
        { name: "freeze", weight: mix.freeze || 0 }
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
    var floor = (type === "pixel") ? FLOOR_PIXEL_BLOCK : (type === "freeze") ? FLOOR_FREEZE_STRIP : FLOOR_FRAMES;
    var effectiveMin = Math.max(floor, minFrames || floor);
    var effectiveMax = Math.max(effectiveMin, maxFrames || MAX_FRAMES);
    return rngInt(rng, effectiveMin, effectiveMax);
}

/**
 * Assign "over" or "under" layer based on type and roto mode.
 * Roto interaction matrix from spec.
 */
function assignLayer(type, rotoMode, rng, forceLayer, behindPct) {
    if (forceLayer === "over") return "over";
    if (forceLayer === "under") return "under";
    if (rotoMode === "flat" || rotoMode === "allOver") return "over";
    if (rotoMode === "allUnder") return "under";

    // Split mode: use global behind percentage
    var pct = (behindPct != null) ? behindPct : 50;
    return rngBool(rng, pct / 100) ? "under" : "over";
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

    if (type === "bsod") {
        job.bsodEra = weightedPick([
            { value: "xp", weight: 60 },
            { value: "9x", weight: 40 }
        ], rng);

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
        // Mix in per-element custom messages for BSOD
        var esBsod = getElementSettings(settings, "bsod");
        if (esBsod.customMessages && esBsod.customMessages.length > 0) {
            for (var bci = 0; bci < esBsod.customMessages.length && bci < 3; bci++) {
                job.textLines.push(esBsod.customMessages[bci]);
            }
        }
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
        var esDialog = getElementSettings(settings, "dialog");
        job.dialogVariant = weightedPick([
            { value: "A", weight: 25 },
            { value: "B", weight: 50 },
            { value: "C", weight: 25 }
        ], rng);

        var dlgTitles = (esDialog.customTitles && esDialog.customTitles.length > 0) ? esDialog.customTitles : (settings.customTitles || []);
        var dlgMsgs = (esDialog.customMessages && esDialog.customMessages.length > 0) ? esDialog.customMessages : (settings.customMessages || []);
        job.title = pickWindowTitle(rng, dlgTitles);
        job.body = pickErrorMessage(rng, dlgMsgs);
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

        // Pre-rendered dialog catalog ID — maps to a baked PNG
        var catalogIcon = (job.icon === "info") ? "question" : (job.icon || "none");
        var catalogIndex = rngInt(rng, 0, 2);
        job.catalogId = job.dialogVariant + "_" + catalogIcon + "_" + catalogIndex;

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

        // Cursor variant: arrow (70%) or hand (30%)
        job.cursorVariant = rngBool(rng, 0.7) ? "arrow" : "hand";

    } else if (type === "pixel") {
        job.behavior = weightedPick([
            { value: "microScatter",   weight: 30 },
            { value: "rowSmear",       weight: 20 },
            { value: "blockDisplace",  weight: 20 },
            { value: "scanlineShift",  weight: 15 },
            { value: "hTear",          weight: 15 }
        ], rng);

        job.opacity = rngInt(rng, 80, 100);
        job.x = rngInt(rng, 0, compInfo.width);
        job.y = rngInt(rng, 0, compInfo.height);

        if (job.behavior === "microScatter") {
            job.clusterSize = rngInt(rng, 5, 15);
        } else if (job.behavior === "rowSmear") {
            job.stripHeight = rngInt(rng, 1, 5);
            job.smearRows = rngInt(rng, 3, 20);
        } else if (job.behavior === "blockDisplace") {
            job.blockW = rngInt(rng, 20, 80);
            job.blockH = rngInt(rng, 10, 60);
            job.offsetX = rngInt(rng, -100, 100);
            job.offsetY = rngInt(rng, -100, 100);
        } else if (job.behavior === "scanlineShift") {
            job.bandHeight = rngInt(rng, 3, 15);
            job.shiftPx = rngBool(rng, 0.5) ? rngInt(rng, 5, 30) : rngInt(rng, -30, -5);
            job.bandCount = rngInt(rng, 1, 4);
        } else if (job.behavior === "hTear") {
            job.tearH = rngInt(rng, 1, 2);
            job.tearW = rngInt(rng, Math.round(compInfo.width / 2), compInfo.width);
            job.tearColor = rngPick(rng, C_PIXEL_COLORS);
        }

    } else if (type === "freeze") {
        job.behavior = weightedPick([
            { value: "single",  weight: 60 },
            { value: "cluster", weight: 40 }
        ], rng);

        job.opacity = rngInt(rng, 85, 100);
        job.freezeFrame = rngInt(rng, 0, compInfo.totalFrames - 1);

        if (job.behavior === "single") {
            job.stripHeight = rngInt(rng, C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT);
            job.stripY = rngInt(rng, 0, compInfo.height - job.stripHeight);

        } else if (job.behavior === "cluster") {
            var clusterCount = rngInt(rng, C_FREEZE_CLUSTER_MIN, C_FREEZE_CLUSTER_MAX);
            var bandStart = rngInt(rng, 0, Math.max(0, compInfo.height - C_FREEZE_CLUSTER_BAND));
            var currentY = bandStart;
            job.strips = [];
            for (var ci = 0; ci < clusterCount; ci++) {
                var h = rngInt(rng, C_FREEZE_MIN_HEIGHT, C_FREEZE_MAX_HEIGHT);
                if (currentY + h > compInfo.height) break;
                job.strips.push({ height: h, y: currentY });
                currentY += h + rngInt(rng, C_FREEZE_CLUSTER_GAP_MIN, C_FREEZE_CLUSTER_GAP_MAX);
            }
        }
    }

    // Trails: probabilistic Echo effect on any element
    // Per-element override wins over global trails settings
    var esTrails = getElementSettings(settings, type).trails;
    var trailSettings = (esTrails != null) ? esTrails : (settings.trails || {});
    var trailChance = (trailSettings.chance != null) ? trailSettings.chance : DEFAULT_TRAILS_CHANCE;
    if (trailSettings.enabled !== false && rngBool(rng, trailChance / 100)) {
        job.trails = true;
        job.trailEchoes = trailSettings.echoes || DEFAULT_TRAILS_ECHOES;
        job.trailDecay = (trailSettings.decay != null) ? trailSettings.decay : DEFAULT_TRAILS_DECAY;
    } else {
        job.trails = false;
    }

    // Blend mode — per-element stochastic assignment
    var blendWeights = BLEND_WEIGHTS[type] || BLEND_WEIGHTS.dialog;
    job.blendMode = weightedPick(blendWeights, rng);

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
    var rotoMode = settings.rotoMode || "flat";
    var style = settings.animStyle || "xpClassic";

    // Determine element types to spawn
    var typeList = [];  // pre-determined type strings
    var typeNames = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    var totalCounts = 0;
    var ti;
    for (ti = 0; ti < typeNames.length; ti++) {
        totalCounts += getElementSettings(settings, typeNames[ti]).count;
    }

    if (totalCounts > 0) {
        // Exact counts mode: build specified number of each type
        for (ti = 0; ti < typeNames.length; ti++) {
            var n = getElementSettings(settings, typeNames[ti]).count;
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
        var autoMix = { dialog: 75, bsod: 50, cursor: 50, pixel: 25, freeze: 15 };
        var count = calcElementCount(chaos, totalFrames);
        if (count === 0) return [];
        for (var ai = 0; ai < count; ai++) {
            typeList.push(pickElementType(autoMix, rng));
        }
    }

    if (typeList.length === 0) return [];

    // Distribute spawn times — group by effective curve for per-element overrides
    var curveGroups = {};  // curveName → [indices]
    for (var cgi = 0; cgi < typeList.length; cgi++) {
        var esCurve = getElementSettings(settings, typeList[cgi]).curve || curve;
        if (!curveGroups[esCurve]) curveGroups[esCurve] = [];
        curveGroups[esCurve].push(cgi);
    }
    var curveKeys = [];
    for (var ck in curveGroups) {
        if (curveGroups.hasOwnProperty(ck)) curveKeys.push(ck);
    }
    curveKeys.sort();  // stable ordering for determinism

    var spawnTimes = [];
    for (var sti = 0; sti < typeList.length; sti++) spawnTimes.push(0);

    for (var gi = 0; gi < curveKeys.length; gi++) {
        var groupIndices = curveGroups[curveKeys[gi]];
        var groupTimes = distributeTimes(groupIndices.length, totalFrames, curveKeys[gi], rng);
        for (var gj = 0; gj < groupIndices.length; gj++) {
            spawnTimes[groupIndices[gj]] = groupTimes[gj];
        }
    }

    // Global stack controls
    var stackDepth = settings.stackDepth || MAX_STACK_DEPTH;
    var stackOff = settings.stackOffset || STACK_OFFSET_X;

    // Build jobs
    var jobs = [];
    for (var i = 0; i < spawnTimes.length; i++) {
        var inFrame = spawnTimes[i];
        var type = typeList[i];

        // Per-type settings (chrome inherits from dialog since type starts as "dialog")
        var es = getElementSettings(settings, type);
        var typeMinF = es.minFrames;
        var typeMaxF = es.maxFrames;

        // Apply animation style duration modifiers per-type
        if (style === "slowBurn") {
            typeMinF = Math.max(typeMinF, 16);
            typeMaxF = Math.max(typeMaxF, MAX_FRAMES);
        } else if (style === "chaosMax") {
            typeMaxF = Math.min(typeMaxF, 36);
        }

        var duration = pickDuration(type, typeMinF, typeMaxF, rng);
        var outFrame = Math.min(inFrame + duration, totalFrames);

        // Enforce minimum duration after clamping
        var actualDur = outFrame - inFrame;
        var floor = (type === "pixel") ? FLOOR_PIXEL_BLOCK : (type === "freeze") ? FLOOR_FREEZE_STRIP : FLOOR_FRAMES;
        if (actualDur < floor) {
            inFrame = Math.max(0, outFrame - floor);
            if (outFrame - inFrame < floor) {
                outFrame = Math.min(inFrame + floor, totalFrames);
            }
        }

        var rotoForce = es.rotoForce || null;
        var behindPct = (settings.rotoBehindPct != null) ? settings.rotoBehindPct : 50;
        var layerAssign = assignLayer(type, rotoMode, rng, rotoForce, behindPct);
        var job = buildJob(type, inFrame, outFrame, layerAssign, settings, compInfo, rng);


        // Apply per-type element controls
        job.scale = es.scale / 100;
        job.speedMult = es.speed / 100;
        job.opacity = clamp(job.opacity, es.opacityMin, es.opacityMax);
        job.entryFrames = es.entryFrames;
        job.exitFrames = es.exitFrames;
        job.stackOffset = stackOff;
        job.jitter = es.jitter || 0;

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

    // Remove imported WEFX footage items from project bin
    var footageRemoved = 0;
    for (i = app.project.numItems; i >= 1; i--) {
        var item = app.project.item(i);
        if (item instanceof FootageItem && item.name.indexOf("WEFX_") === 0) {
            try {
                wlog("  removing footage: \"" + item.name + "\"");
                item.remove();
                footageRemoved++;
            } catch (e) {
                wwarn("clearEffect: footage removal failed: " + e.toString());
            }
        }
    }
    if (footageRemoved > 0) {
        wlog("clearEffect: removed " + footageRemoved + " footage items");
    }

    // Remove the WindowsErrorFX_Assets folder if empty
    for (i = app.project.numItems; i >= 1; i--) {
        var fi = app.project.item(i);
        if (fi instanceof FolderItem && fi.name === "WindowsErrorFX_Assets") {
            if (fi.numItems === 0) {
                try { fi.remove(); wlog("clearEffect: removed empty assets folder"); } catch (e) {}
            }
            break;
        }
    }

    // Clean up cached PNG files from disk
    try {
        var sep = (Folder.myDocuments.fsName.indexOf("/") !== -1) ? "/" : "\\";
        var assetsDir = new Folder(Folder.myDocuments.fsName + sep + "WindowsErrorFX" + sep + "assets");
        if (assetsDir.exists) {
            var files = assetsDir.getFiles("*.png");
            for (i = 0; i < files.length; i++) {
                if (files[i].name.indexOf("WEFX_") === 0 ||
                    files[i].name.indexOf("dlg_") === 0 ||
                    files[i].name.indexOf("cursor_") === 0) {
                    try { files[i].remove(); } catch (e) {}
                }
            }
            wlog("clearEffect: cleaned " + files.length + " cached PNG files");
        }
    } catch (e) {
        wwarn("clearEffect: disk cleanup error: " + e.toString());
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
        structure.overLayer.collapseTransformation = true;
        structure.overLayer.moveBefore(rotoTopLayer);

        structure.underLayer = parentComp.layers.add(structure.underComp);
        structure.underLayer.name = "WEFX_UNDER";
        structure.underLayer.collapseTransformation = true;
        structure.underLayer.moveAfter(rotoBotLayer);
    } else {
        structure.flatComp = app.project.items.addComp(
            "WindowsErrorFX_" + seed,
            parentComp.width, parentComp.height,
            1.0, parentComp.duration, parentComp.frameRate
        );
        structure.flatLayer = parentComp.layers.add(structure.flatComp);
        structure.flatLayer.name = "WEFX_Effect";
        structure.flatLayer.collapseTransformation = true;
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
        // Per-element settings (count 0 = auto from chaos with equal weights)
        elements: {
            dialog: defaultElementSettings(),
            bsod: defaultElementSettings(),
            cursor: defaultElementSettings(),
            pixel: defaultElementSettings(),
            freeze: defaultElementSettings()
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
        // Trails (Echo effect)
        trails: {
            enabled: true,
            chance: DEFAULT_TRAILS_CHANCE,
            echoes: DEFAULT_TRAILS_ECHOES,
            decay: DEFAULT_TRAILS_DECAY
        },
        // Global stack controls
        stackDepth: MAX_STACK_DEPTH,
        stackOffset: STACK_OFFSET_X,
        // Virtual resolution
        virtualRes: DEFAULT_VIRTUAL_RES_INDEX,
        // Roto behind percentage (0 = all over, 100 = all under)
        rotoBehindPct: 50,
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
    var nestedKeys = ["scanlines", "noise", "headScratch", "trails", "elements"];

    // Scan markers for our data
    for (var i = 1; i <= comp.markerProperty.numKeys; i++) {
        try {
            var data = JSON.parse(comp.markerProperty.keyValue(i).comment);
            if (data._type === "WEFX_SETTINGS") {
                // Migrate old format (counts, flat fields) to new (elements)
                migrateSettings(data);
                for (var key in data) {
                    if (!data.hasOwnProperty(key) || key === "_type") continue;
                    // Skip deprecated fields from old saves
                    if (key === "mix" || key === "counts") continue;
                    // Merge nested objects field-by-field
                    var isNested = false;
                    for (var ni = 0; ni < nestedKeys.length; ni++) {
                        if (key === nestedKeys[ni]) { isNested = true; break; }
                    }
                    if (isNested && typeof data[key] === "object" && settings[key]) {
                        if (key === "elements") {
                            // Two-level nested merge: elements.{type}.{field}
                            for (var typeKey in data[key]) {
                                if (data[key].hasOwnProperty(typeKey)) {
                                    if (!settings[key][typeKey]) {
                                        settings[key][typeKey] = defaultElementSettings();
                                    }
                                    if (typeof data[key][typeKey] === "object") {
                                        for (var fk in data[key][typeKey]) {
                                            if (data[key][typeKey].hasOwnProperty(fk)) {
                                                settings[key][typeKey][fk] = data[key][typeKey][fk];
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            for (var nk in data[key]) {
                                if (data[key].hasOwnProperty(nk)) {
                                    settings[key][nk] = data[key][nk];
                                }
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

    // Build per-element settings from tabbed UI
    var typeKeys = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    var elements = {};
    for (var i = 0; i < typeKeys.length; i++) {
        var t = typeKeys[i];
        var tab = ui.elemTabs[t];
        var curveMapLocal = ["flat", "build", "peak", "burst", "random"];
        elements[t] = {
            count: parseInt(tab.count.text, 10) || 0,
            minFrames: parseInt(tab.minFrames.text, 10) || FLOOR_FRAMES,
            maxFrames: parseInt(tab.maxFrames.text, 10) || MAX_FRAMES,
            scale: parseInt(tab.scale.text, 10) || DEFAULT_ELEMENT_SCALE,
            speed: parseInt(tab.speed.text, 10) || DEFAULT_SPEED_MULT,
            opacityMin: parseInt(tab.opacMin.text, 10) || DEFAULT_OPACITY_MIN,
            opacityMax: parseInt(tab.opacMax.text, 10) || DEFAULT_OPACITY_MAX,
            entryFrames: parseInt(tab.entryFrames.text, 10) || DEFAULT_ENTRY_FRAMES,
            exitFrames: parseInt(tab.exitFrames.text, 10) || DEFAULT_EXIT_FRAMES,
            jitter: parseInt(tab.jitter.text, 10) || 0,
            // Per-element overrides (null = inherit global)
            trails: (tab.trailsOverride && tab.trailsOverride.value) ? {
                enabled: true,
                chance: parseInt(tab.trailsChance.text, 10) || DEFAULT_TRAILS_CHANCE,
                echoes: parseInt(tab.trailsEchoes.text, 10) || DEFAULT_TRAILS_ECHOES,
                decay: parseInt(tab.trailsDecay.text, 10) || DEFAULT_TRAILS_DECAY
            } : null,
            rotoForce: (tab.rotoOverride && tab.rotoOverride.value) ?
                ((tab.rotoForceDropdown.selection && tab.rotoForceDropdown.selection.index === 0) ? "over" : "under") : null,
            curve: (tab.curveOverride && tab.curveOverride.value) ?
                (curveMapLocal[tab.curveDropdown.selection ? tab.curveDropdown.selection.index : 0]) : null,
            customMessages: (tab.msgsOverride && tab.msgsOverride.value) ? (tab._customMessages || []) : null,
            customTitles: (tab.msgsOverride && tab.msgsOverride.value) ? (tab._customTitles || []) : null
        };
    }

    return {
        seed: parseInt(ui.seedField.text, 10) || 1984,
        chaos: parseInt(ui.chaosField.text, 10) || 0,
        rotoMode: rotoMap[rotoIdx] || "split",
        chaosCurve: curveMap[curveIdx] || "flat",
        animStyle: styleMap[styleIdx] || "xpClassic",
        virtualRes: ui.resDrop.selection ? ui.resDrop.selection.index : DEFAULT_VIRTUAL_RES_INDEX,
        elements: elements,
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
        trails: {
            enabled: ui.trEnabled.value,
            chance: parseInt(ui.trChance.text, 10) || DEFAULT_TRAILS_CHANCE,
            echoes: parseInt(ui.trEchoes.text, 10) || DEFAULT_TRAILS_ECHOES,
            decay: parseInt(ui.trDecay.text, 10) || DEFAULT_TRAILS_DECAY
        },
        stackDepth: parseInt(ui.stackDepthField.text, 10) || MAX_STACK_DEPTH,
        stackOffset: parseInt(ui.stackOffsetField.text, 10) || STACK_OFFSET_X,
        rotoBehindPct: parseInt(ui.rotoBehindField.text, 10) || 0,
        customMessages: ui._customMessages || [],
        customTitles: ui._customTitles || [],
        rotoKeywords: ui._rotoKeywords || [],
        rotoLayerNames: (ui.rotoPickDropdown && ui.rotoPickDropdown.selection && ui.rotoPickDropdown.selection.index > 0)
            ? [ui.rotoPickDropdown.selection.text] : []
    };
}

/** Populate UI controls from settings. */
function applySettingsToUI(ui, settings) {
    ui.seedField.text = String(settings.seed);
    ui.chaosField.text = String(settings.chaos);
    var vri = (settings.virtualRes != null) ? settings.virtualRes : DEFAULT_VIRTUAL_RES_INDEX;
    if (vri >= 0 && vri < VIRTUAL_RESOLUTIONS.length) {
        ui.resDrop.selection = vri;
    }

    // Per-element tab settings
    var typeKeys = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    for (var i = 0; i < typeKeys.length; i++) {
        var t = typeKeys[i];
        var es = getElementSettings(settings, t);
        var tab = ui.elemTabs[t];
        tab.count.text      = String(es.count);
        tab.minFrames.text  = String(es.minFrames);
        tab.maxFrames.text  = String(es.maxFrames);
        tab.scale.text      = String(es.scale);
        tab.speed.text      = String(es.speed);
        tab.opacMin.text    = String(es.opacityMin);
        tab.opacMax.text    = String(es.opacityMax);
        tab.entryFrames.text = String(es.entryFrames);
        tab.exitFrames.text = String(es.exitFrames);
        tab.jitter.text     = String(es.jitter);

        // Per-element overrides
        if (tab.trailsOverride) {
            var hasTrails = (es.trails != null);
            tab.trailsOverride.value = hasTrails;
            if (hasTrails) {
                tab.trailsChance.text = String(es.trails.chance != null ? es.trails.chance : DEFAULT_TRAILS_CHANCE);
                tab.trailsEchoes.text = String(es.trails.echoes != null ? es.trails.echoes : DEFAULT_TRAILS_ECHOES);
                tab.trailsDecay.text  = String(es.trails.decay != null ? es.trails.decay : DEFAULT_TRAILS_DECAY);
            }
            if (tab.trailsGroup) tab.trailsGroup.visible = hasTrails;
        }
        if (tab.rotoOverride) {
            var hasRoto = (es.rotoForce != null);
            tab.rotoOverride.value = hasRoto;
            if (hasRoto && tab.rotoForceDropdown) {
                tab.rotoForceDropdown.selection = (es.rotoForce === "over") ? 0 : 1;
            }
            if (tab.rotoGroup) tab.rotoGroup.visible = hasRoto;
        }
        if (tab.curveOverride) {
            var hasCurve = (es.curve != null);
            tab.curveOverride.value = hasCurve;
            if (hasCurve && tab.curveDropdown) {
                var curveNames = ["flat", "build", "peak", "burst", "random"];
                for (var cmi = 0; cmi < curveNames.length; cmi++) {
                    if (curveNames[cmi] === es.curve) { tab.curveDropdown.selection = cmi; break; }
                }
            }
            if (tab.curveGroup) tab.curveGroup.visible = hasCurve;
        }
        if (tab.msgsOverride) {
            var hasMsgs = (es.customMessages != null || es.customTitles != null);
            tab.msgsOverride.value = hasMsgs;
            tab._customMessages = es.customMessages || [];
            tab._customTitles = es.customTitles || [];
            if (tab.msgsGroup) tab.msgsGroup.visible = hasMsgs;
        }
    }

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

    var tr = settings.trails || {};
    ui.trEnabled.value  = (tr.enabled !== false);
    ui.trChance.text    = String(tr.chance != null ? tr.chance : DEFAULT_TRAILS_CHANCE);
    ui.trEchoes.text    = String(tr.echoes != null ? tr.echoes : DEFAULT_TRAILS_ECHOES);
    ui.trDecay.text     = String(tr.decay != null ? tr.decay : DEFAULT_TRAILS_DECAY);

    // Global stack controls
    ui.stackDepthField.text  = String(settings.stackDepth || MAX_STACK_DEPTH);
    ui.stackOffsetField.text = String(settings.stackOffset || STACK_OFFSET_X);

    // Behind percentage
    ui.rotoBehindField.text = String((settings.rotoBehindPct != null) ? settings.rotoBehindPct : 50);

    // Roto layer picker
    if (ui.rotoPickDropdown && settings.rotoLayerNames && settings.rotoLayerNames.length > 0) {
        var rotoName = settings.rotoLayerNames[0];
        var found = false;
        for (var rpi = 0; rpi < ui.rotoPickDropdown.items.length; rpi++) {
            if (ui.rotoPickDropdown.items[rpi].text === rotoName) {
                ui.rotoPickDropdown.selection = rpi;
                found = true;
                break;
            }
        }
        if (!found) ui.rotoPickDropdown.selection = 0;
    } else if (ui.rotoPickDropdown) {
        ui.rotoPickDropdown.selection = 0;
    }

    // Custom content
    ui._customMessages = settings.customMessages || [];
    ui._customTitles = settings.customTitles || [];
    ui._rotoKeywords = settings.rotoKeywords || [];

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
    wlogObj("Settings", settings, ["seed", "chaos", "rotoMode", "chaosCurve", "animStyle"]);
    var _elCounts = {};
    var _typeNames = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    for (var _ti = 0; _ti < _typeNames.length; _ti++) {
        _elCounts[_typeNames[_ti]] = getElementSettings(settings, _typeNames[_ti]).count;
    }
    wlogObj("Counts", _elCounts, _typeNames);

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
    var rotoLayers;
    if (settings.rotoLayerNames && settings.rotoLayerNames.length > 0) {
        rotoLayers = [];
        for (var rni = 0; rni < settings.rotoLayerNames.length; rni++) {
            for (var rli = 1; rli <= comp.numLayers; rli++) {
                if (comp.layers[rli].name === settings.rotoLayerNames[rni]) {
                    rotoLayers.push(comp.layers[rli]);
                }
            }
        }
        wlog("Roto: " + rotoLayers.length + " layer(s) from explicit selection");
    } else {
        rotoLayers = detectRotoLayers(comp, ROTO_KEYWORDS, settings.rotoKeywords || []);
    }
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

    // 3.5. Find primary footage layer for pixel corruption variants
    // Skip roto layers — they're alpha mattes, not source footage
    var footageLayer = null;
    for (var fi = 1; fi <= comp.numLayers; fi++) {
        var fl = comp.layers[fi];
        var isRoto = false;
        for (var rli = 0; rli < rotoLayers.length; rli++) {
            if (rotoLayers[rli].index === fl.index) { isRoto = true; break; }
        }
        if (!isRoto &&
            fl.name.indexOf("WEFX_") !== 0 &&
            !(fl instanceof ShapeLayer) &&
            fl.adjustmentLayer !== true &&
            fl.nullLayer !== true) {
            footageLayer = fl;
            break;
        }
    }
    wlog("Footage layer for pixel/freeze: " + (footageLayer ? ("\"" + footageLayer.name + "\"") : "none"));

    // 4. Build compInfo
    var compInfo = {
        duration: comp.duration,
        frameRate: comp.frameRate,
        width: comp.width,
        height: comp.height,
        totalFrames: Math.round(comp.duration * comp.frameRate)
    };

    // 5. Check for content — skip if all counts are 0 AND chaos is 0
    var _chkTypes = ["dialog", "bsod", "cursor", "pixel", "freeze"];
    var totalCounts = 0;
    for (var _ci = 0; _ci < _chkTypes.length; _ci++) {
        totalCounts += getElementSettings(settings, _chkTypes[_ci]).count;
    }
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

    // 6.5. Apply virtual resolution scale to each job
    var compScale = calcCompScale(comp.width, settings.virtualRes);
    wlog("Virtual resolution: index=" + (settings.virtualRes != null ? settings.virtualRes : "null") +
         " compScale=" + compScale.toFixed(3));
    for (var sci = 0; sci < jobs.length; sci++) {
        jobs[sci].scale = (jobs[sci].scale || 1) * compScale;
    }

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

        // 7.5. Import cursor assets once (shared by all cursor jobs)
        wlog("Importing pre-rendered assets...");
        var _wefxArrowFootage = importEmbeddedPNG(CURSOR_ARROW_B64, "cursor_arrow");
        var _wefxHandFootage = importEmbeddedPNG(CURSOR_HAND_B64, "cursor_hand");
        if (_wefxArrowFootage) _wefxArrowFootage.parentFolder = getOrCreateAssetFolder();
        if (_wefxHandFootage) _wefxHandFootage.parentFolder = getOrCreateAssetFolder();

        // Dialog footage cache — import on first use, reuse same-ID dialogs
        var _wefxDialogCache = {};
        function _wefxGetFootage(catalogId) {
            if (_wefxDialogCache[catalogId]) return _wefxDialogCache[catalogId];
            var b64 = DIALOG_PNG_DATA[catalogId];
            if (!b64) { wwarn("Missing catalog: " + catalogId); return null; }
            var item = importEmbeddedPNG(b64, "dlg_" + catalogId);
            if (item) {
                item.parentFolder = getOrCreateAssetFolder();
                _wefxDialogCache[catalogId] = item;
            }
            return item;
        }
        wlog("Assets ready (arrow=" + !!_wefxArrowFootage + ", hand=" + !!_wefxHandFootage + ")");

        // 7.6. Scan for custom asset folder
        var customAssets = [];
        var customFolder = findCustomFolder();
        if (customFolder) {
            for (var cai = 1; cai <= customFolder.numItems; cai++) {
                if (customFolder.item(cai) instanceof FootageItem) {
                    customAssets.push(customFolder.item(cai));
                }
            }
            wlog("Custom assets found: " + customAssets.length);
        }

        // 8. Build each element
        wlog("Building " + jobs.length + " elements...");
        for (var i = 0; i < jobs.length; i++) {
            var job = jobs[i];
            job.rng = createRNG(settings.seed + i + 1);

            // Pass footage references to dialog and cursor jobs
            if (job.type === "dialog") {
                job._wefxGetFootage = _wefxGetFootage;
                job._customAssets = customAssets;
            } else if (job.type === "cursor") {
                job._wefxArrowFootage = _wefxArrowFootage;
                job._wefxHandFootage = _wefxHandFootage;
            }

            // Pass footage layer reference for pixel corruption and freeze builders
            if (job.type === "pixel" || job.type === "freeze") {
                job.footageLayer = footageLayer;
            }

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
            if (job.type === "dialog")      jobDesc += " catalog=" + (job.catalogId || "?") + " arrival=" + (job.arrivalBehavior || "?") + " life=" + (job.lifeBehavior || "?") + " exit=" + (job.exitBehavior || "?") + " stack=" + (job.stackIndex || 0);
            else if (job.type === "bsod")   jobDesc += " variant=" + (job.variant || "?") + " behavior=" + (job.behavior || "?") + " textBehavior=" + (job.textBehavior || "?");


            else if (job.type === "cursor") jobDesc += " behavior=" + (job.behavior || "?");
            else if (job.type === "pixel")  jobDesc += " behavior=" + (job.behavior || "?");
            else if (job.type === "freeze") jobDesc += " behavior=" + (job.behavior || "?") + " freezeF=" + (job.freezeFrame || 0);

            if (job.type !== "freeze") {
                jobDesc += " @(" + Math.round(job.x) + "," + Math.round(job.y) + ")";
            }
            wlog(jobDesc);

            // Track layer count before building so we can clean up on failure
            var layersBefore = targetComp.numLayers;

            try {
                var builtLayers = null;
                if      (job.type === "bsod")   builtLayers = buildBSOD(job, targetComp);
                else if (job.type === "dialog") builtLayers = buildDialogBox(job, targetComp);
                else if (job.type === "cursor") builtLayers = buildCursor(job, targetComp);
                else if (job.type === "pixel")  builtLayers = buildPixelBlock(job, targetComp);
                else if (job.type === "freeze") {
                    if (job.footageLayer) {
                        builtLayers = buildFreezeStrip(job, targetComp);
                    } else {
                        wlog("  Skipping freeze (no footage layer)");
                        continue;
                    }
                }
                else    { wwarn("Unknown element type: " + job.type); continue; }

                // Apply blend mode if non-normal
                if (job.blendMode && job.blendMode !== "normal" && builtLayers && builtLayers.length > 0) {
                    var aeBlend = BLEND_MODE_MAP[job.blendMode];
                    if (aeBlend && BlendingMode[aeBlend]) {
                        for (var bli = 0; bli < builtLayers.length; bli++) {
                            if (builtLayers[bli] != null) {
                                builtLayers[bli].blendingMode = BlendingMode[aeBlend];
                            }
                        }
                    }
                }

                // Apply trails (Echo effect) if flagged
                if (job.trails && builtLayers && builtLayers.length > 0) {
                    // Apply to the first non-null layer (the primary visual)
                    var trailTarget = builtLayers[0];
                    for (var tli = 0; tli < builtLayers.length; tli++) {
                        if (builtLayers[tli] != null) {
                            trailTarget = builtLayers[tli];
                            break;
                        }
                    }
                    applyTrailsEffect(trailTarget, {
                        echoes: job.trailEchoes,
                        decay: job.trailDecay,
                        fps: targetComp.frameRate
                    });
                }

                // Apply jitter expression if enabled for this element type
                if (job.jitter > 0 && builtLayers && builtLayers.length > 0) {
                    applyJitter(builtLayers[0], job.jitter, compScale);
                }

                builtCount++;
            } catch (buildErr) {
                errorCount++;
                werr("Builder FAILED for job " + (i + 1) + " (" + job.type + "): " +
                     buildErr.toString() + " [line " + (buildErr.line || "?") + "]");
                // Remove any orphaned layers created before the error
                var orphanCount = targetComp.numLayers - layersBefore;
                for (var oi = 0; oi < orphanCount; oi++) {
                    try { targetComp.layer(1).remove(); } catch (e) {}
                }
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

    // ── Chaos (number field, uncapped) ────────────
    var chaosRow = panel.add("group");
    chaosRow.orientation = "row";
    chaosRow.add("statictext", undefined, "CHAOS");
    var chaosField = chaosRow.add("edittext", undefined, "100");
    chaosField.preferredSize.width = 50;
    chaosRow.add("statictext", undefined, "(0 = off, 100 = normal, 500+ = insane)");

    // ── Virtual resolution dropdown ─────────────────
    var resRow = panel.add("group");
    resRow.orientation = "row";
    resRow.add("statictext", undefined, "Resolution:");
    var resDrop = resRow.add("dropdownlist", undefined, []);
    for (var ri = 0; ri < VIRTUAL_RESOLUTIONS.length; ri++) {
        resDrop.add("item", VIRTUAL_RESOLUTIONS[ri].label);
    }
    resDrop.selection = DEFAULT_VIRTUAL_RES_INDEX;

    // ── Roto layer picker ────────────────────────────
    var rotoPickRow = panel.add("group");
    rotoPickRow.orientation = "row";
    rotoPickRow.add("statictext", undefined, "Roto:");
    var rotoPickDropdown = rotoPickRow.add("dropdownlist", undefined, ["Auto-detect"]);
    rotoPickDropdown.selection = 0;
    rotoPickDropdown.preferredSize.width = 160;
    var rotoStatus = rotoPickRow.add("statictext", undefined, "");
    rotoStatus.preferredSize.width = 80;

    // ── Generate + Randomize buttons ─────────────
    var btnRow = panel.add("group");
    btnRow.orientation = "row";
    var genBtn = btnRow.add("button", undefined, "GENERATE");
    var randomizeBtn = btnRow.add("button", undefined, "RANDOMIZE");
    randomizeBtn.preferredSize.width = 85;

    // ── Controls panel ────────────────────────────
    var advPanel = panel.add("panel", undefined, "");
    advPanel.orientation = "column";
    advPanel.alignChildren = ["fill", "top"];
    advPanel.margins = 8;
    advPanel.spacing = 4;

    // ── Per-Element Tabbed Controls ──────────────
    var elemTabs = advPanel.add("tabbedpanel");
    var tabUI = {};
    var tabLabels = { dialog: "Dialog", bsod: "BSOD", cursor: "Cursor", pixel: "Pixel", freeze: "Freeze" };
    var tabKeys = ["dialog", "bsod", "cursor", "pixel", "freeze"];

    for (var ti = 0; ti < tabKeys.length; ti++) {
        var tkey = tabKeys[ti];
        var tab = elemTabs.add("tab", undefined, tabLabels[tkey]);
        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 4;
        tab.spacing = 2;

        // Row 1: Count
        var r1 = tab.add("group");
        r1.orientation = "row";
        r1.add("statictext", undefined, "Count").preferredSize.width = 40;
        var countF = r1.add("edittext", undefined, "0");
        countF.preferredSize.width = 35;
        r1.add("statictext", undefined, "(0 = auto)");

        // Row 2: Min/Max frames
        var r2 = tab.add("group");
        r2.orientation = "row";
        r2.add("statictext", undefined, "Min f").preferredSize.width = 35;
        var minF = r2.add("edittext", undefined, String(FLOOR_FRAMES));
        minF.preferredSize.width = 35;
        r2.add("statictext", undefined, "Max f").preferredSize.width = 35;
        var maxF = r2.add("edittext", undefined, String(MAX_FRAMES));
        maxF.preferredSize.width = 35;

        // Row 3: Scale / Speed / Jitter
        var r3 = tab.add("group");
        r3.orientation = "row";
        r3.add("statictext", undefined, "Scale%").preferredSize.width = 42;
        var scaleF = r3.add("edittext", undefined, String(DEFAULT_ELEMENT_SCALE));
        scaleF.preferredSize.width = 35;
        r3.add("statictext", undefined, "Spd%").preferredSize.width = 32;
        var speedF = r3.add("edittext", undefined, String(DEFAULT_SPEED_MULT));
        speedF.preferredSize.width = 35;
        r3.add("statictext", undefined, "Jit").preferredSize.width = 20;
        var jitterF = r3.add("edittext", undefined, "0");
        jitterF.preferredSize.width = 30;

        // Row 4: Opacity min-max
        var r4 = tab.add("group");
        r4.orientation = "row";
        r4.add("statictext", undefined, "Opac").preferredSize.width = 35;
        var opMinF = r4.add("edittext", undefined, String(DEFAULT_OPACITY_MIN));
        opMinF.preferredSize.width = 30;
        r4.add("statictext", undefined, "-");
        var opMaxF = r4.add("edittext", undefined, String(DEFAULT_OPACITY_MAX));
        opMaxF.preferredSize.width = 30;

        // Row 5: Entry / Exit frames
        var r5 = tab.add("group");
        r5.orientation = "row";
        r5.add("statictext", undefined, "Entry").preferredSize.width = 35;
        var entryF = r5.add("edittext", undefined, String(DEFAULT_ENTRY_FRAMES));
        entryF.preferredSize.width = 25;
        r5.add("statictext", undefined, "Exit").preferredSize.width = 28;
        var exitF = r5.add("edittext", undefined, String(DEFAULT_EXIT_FRAMES));
        exitF.preferredSize.width = 25;

        // ── Override: Trails ──────────────────────────
        var trailsRow = tab.add("group");
        trailsRow.orientation = "row";
        var trailsCb = trailsRow.add("checkbox", undefined, "Override Trails");
        trailsCb.value = false;
        var trailsGroup = trailsRow.add("group");
        trailsGroup.orientation = "row";
        trailsGroup.visible = false;
        trailsGroup.add("statictext", undefined, "Ch%").preferredSize.width = 25;
        var trChanceF = trailsGroup.add("edittext", undefined, String(DEFAULT_TRAILS_CHANCE));
        trChanceF.preferredSize.width = 30;
        trailsGroup.add("statictext", undefined, "Ech").preferredSize.width = 24;
        var trEchoesF = trailsGroup.add("edittext", undefined, String(DEFAULT_TRAILS_ECHOES));
        trEchoesF.preferredSize.width = 25;
        trailsGroup.add("statictext", undefined, "Dc%").preferredSize.width = 25;
        var trDecayF = trailsGroup.add("edittext", undefined, String(DEFAULT_TRAILS_DECAY));
        trDecayF.preferredSize.width = 30;

        // ── Override: Roto ────────────────────────────
        var rotoOvRow = tab.add("group");
        rotoOvRow.orientation = "row";
        var rotoCb = rotoOvRow.add("checkbox", undefined, "Override Roto");
        rotoCb.value = false;
        var rotoGroup = rotoOvRow.add("group");
        rotoGroup.orientation = "row";
        rotoGroup.visible = false;
        var rotoDD = rotoGroup.add("dropdownlist", undefined, ["Over", "Under"]);
        rotoDD.selection = 0;

        // ── Override: Curve ───────────────────────────
        var curveOvRow = tab.add("group");
        curveOvRow.orientation = "row";
        var curveCb = curveOvRow.add("checkbox", undefined, "Override Curve");
        curveCb.value = false;
        var curveGroup = curveOvRow.add("group");
        curveGroup.orientation = "row";
        curveGroup.visible = false;
        var curveDD = curveGroup.add("dropdownlist", undefined, ["Flat", "Build", "Peak", "Burst", "Random"]);
        curveDD.selection = 0;

        // ── Override: Custom Messages (dialog + bsod only) ──
        var msgsCb = null;
        var msgsGroup = null;
        var msgsBtn = null;
        var tabCustomMessages = [];
        var tabCustomTitles = [];
        if (tkey === "bsod") {
            var msgsRow = tab.add("group");
            msgsRow.orientation = "row";
            msgsCb = msgsRow.add("checkbox", undefined, "Custom Messages");
            msgsCb.value = false;
            msgsGroup = msgsRow.add("group");
            msgsGroup.orientation = "row";
            msgsGroup.visible = false;
            msgsBtn = msgsGroup.add("button", undefined, "Edit\u2026");
            msgsBtn.preferredSize.width = 55;
        }

        // Checkbox onClick handlers (IIFE to capture closure vars in ES3 for-loop)
        (function(trCb, trGrp, rCb, rGrp, cCb, cGrp, mCb, mGrp, pnl) {
            trCb.onClick = function() {
                trGrp.visible = trCb.value;
                pnl.layout.layout(true);
            };
            rCb.onClick = function() {
                rGrp.visible = rCb.value;
                pnl.layout.layout(true);
            };
            cCb.onClick = function() {
                cGrp.visible = cCb.value;
                pnl.layout.layout(true);
            };
            if (mCb && mGrp) {
                mCb.onClick = function() {
                    mGrp.visible = mCb.value;
                    pnl.layout.layout(true);
                };
            }
        })(trailsCb, trailsGroup, rotoCb, rotoGroup, curveCb, curveGroup, msgsCb, msgsGroup, panel);

        tabUI[tkey] = {
            count: countF,
            minFrames: minF,
            maxFrames: maxF,
            scale: scaleF,
            speed: speedF,
            jitter: jitterF,
            opacMin: opMinF,
            opacMax: opMaxF,
            entryFrames: entryF,
            exitFrames: exitF,
            // Override controls
            trailsOverride: trailsCb, trailsChance: trChanceF,
            trailsEchoes: trEchoesF, trailsDecay: trDecayF, trailsGroup: trailsGroup,
            rotoOverride: rotoCb, rotoForceDropdown: rotoDD, rotoGroup: rotoGroup,
            curveOverride: curveCb, curveDropdown: curveDD, curveGroup: curveGroup,
            msgsOverride: msgsCb, msgsGroup: msgsGroup,
            _customMessages: [], _customTitles: []
        };

        // Custom Messages Edit button handler (IIFE for closure, after tabUI[tkey] exists)
        if (msgsBtn) {
            (function(btn, tk, tabMap, labels) {
                btn.onClick = function() {
                    var entry = tabMap[tk];
                    var dlg = new Window("dialog", "Custom Messages \u2014 " + labels[tk]);
                    dlg.orientation = "column";
                    dlg.alignChildren = ["fill", "top"];
                    dlg.margins = 10;

                    dlg.add("statictext", undefined, "Custom Error Messages (one per line):");
                    var msgArea = dlg.add("edittext", undefined,
                        (entry._customMessages || []).join("\n"),
                        { multiline: true, scrolling: true });
                    msgArea.preferredSize = [300, 80];

                    var titleArea = null;
                    if (tk === "dialog") {
                        dlg.add("statictext", undefined, "Custom Window Titles (one per line):");
                        titleArea = dlg.add("edittext", undefined,
                            (entry._customTitles || []).join("\n"),
                            { multiline: true, scrolling: true });
                        titleArea.preferredSize = [300, 60];
                    }

                    var dBtnRow = dlg.add("group");
                    dBtnRow.orientation = "row";
                    dBtnRow.add("button", undefined, "Save", { name: "ok" });
                    dBtnRow.add("button", undefined, "Cancel", { name: "cancel" });

                    if (dlg.show() === 1) {
                        var lines = msgArea.text.split("\n");
                        var filtered = [];
                        for (var fi = 0; fi < lines.length; fi++) {
                            if (lines[fi].replace(/^\s+|\s+$/g, "") !== "") filtered.push(lines[fi]);
                        }
                        entry._customMessages = filtered;
                        if (tk === "dialog" && titleArea) {
                            var tLines = titleArea.text.split("\n");
                            var tFiltered = [];
                            for (var fj = 0; fj < tLines.length; fj++) {
                                if (tLines[fj].replace(/^\s+|\s+$/g, "") !== "") tFiltered.push(tLines[fj]);
                            }
                            entry._customTitles = tFiltered;
                        }
                    }
                };
            })(msgsBtn, tkey, tabUI, tabLabels);
        }
    }

    // ── Global Stack Controls ────────────────────
    var stackRow = advPanel.add("group");
    stackRow.orientation = "row";
    stackRow.add("statictext", undefined, "Stack").preferredSize.width = 35;
    var stackDepthField = stackRow.add("edittext", undefined, String(MAX_STACK_DEPTH));
    stackDepthField.preferredSize.width = 30;
    stackRow.add("statictext", undefined, "Offset").preferredSize.width = 35;
    var stackOffsetField = stackRow.add("edittext", undefined, String(STACK_OFFSET_X));
    stackOffsetField.preferredSize.width = 30;

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

    // Trails (Echo effect)
    var trRow = overlayGroup.add("group");
    trRow.orientation = "row";
    var trEnabled = trRow.add("checkbox", undefined, "Trails");
    trEnabled.value = true;
    trRow.add("statictext", undefined, "Chance%").preferredSize.width = 50;
    var trChance = trRow.add("edittext", undefined, String(DEFAULT_TRAILS_CHANCE));
    trChance.preferredSize.width = 35;
    trRow.add("statictext", undefined, "Echoes").preferredSize.width = 42;
    var trEchoes = trRow.add("edittext", undefined, String(DEFAULT_TRAILS_ECHOES));
    trEchoes.preferredSize.width = 30;
    trRow.add("statictext", undefined, "Decay%").preferredSize.width = 45;
    var trDecay = trRow.add("edittext", undefined, String(DEFAULT_TRAILS_DECAY));
    trDecay.preferredSize.width = 35;

    // ── Style / Roto / Curve ─────────────────────
    var styleRow = advPanel.add("group");
    styleRow.orientation = "row";
    styleRow.add("statictext", undefined, "Style");
    var animStyleDropdown = styleRow.add("dropdownlist", undefined,
        ["XP Classic", "Glitch Heavy", "Slow Burn", "Chaos Maximum"]);
    animStyleDropdown.selection = 0;

    var rotoRow = advPanel.add("group");
    rotoRow.orientation = "row";
    rotoRow.add("statictext", undefined, "Roto");
    var rotoModeDropdown = rotoRow.add("dropdownlist", undefined,
        ["Split", "All Over", "All Under", "Flat"]);
    rotoModeDropdown.selection = 0;
    rotoRow.add("statictext", undefined, "Behind%");
    var rotoBehindField = rotoRow.add("edittext", undefined, "50");
    rotoBehindField.preferredSize.width = 30;

    var curveRow = advPanel.add("group");
    curveRow.orientation = "row";
    curveRow.add("statictext", undefined, "Curve");
    var chaosCurveDropdown = curveRow.add("dropdownlist", undefined,
        ["Flat", "Build", "Peak", "Burst", "Random"]);
    chaosCurveDropdown.selection = 0;

    // Custom messages button
    var customBtn = advPanel.add("button", undefined, "Custom Messages...");

    // Export built-in assets button
    var exportBtn = advPanel.add("button", undefined, "Export Assets...");

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
        rotoPickDropdown: rotoPickDropdown,
        rotoBehindField: rotoBehindField,
        // Per-element tabbed controls
        elemTabs: tabUI,
        // Overlays
        slEnabled: slEnabled, slOpacity: slOpacity,
        slSpacing: slSpacing, slJitter: slJitter,
        noEnabled: noEnabled, noOpacity: noOpacity,
        noScale: noScale, noComplexity: noComplexity,
        hsEnabled: hsEnabled, hsFreq: hsFreq, hsHeight: hsHeight,
        trEnabled: trEnabled, trChance: trChance, trEchoes: trEchoes, trDecay: trDecay,
        // Global stack controls
        stackDepthField: stackDepthField, stackOffsetField: stackOffsetField,
        // Dropdowns
        animStyleDropdown: animStyleDropdown,
        rotoModeDropdown: rotoModeDropdown,
        chaosCurveDropdown: chaosCurveDropdown,
        resDrop: resDrop,
        // Custom content
        _customMessages: [],
        _customTitles: [],
        _rotoKeywords: [],
        _rotoLayerNames: []
    };

    // ── Helper: refresh roto layer dropdown ─────────
    function refreshRotoDropdown(ui) {
        var dd = ui.rotoPickDropdown;
        var prevSelection = (dd.selection) ? dd.selection.text : null;
        dd.removeAll();
        dd.add("item", "Auto-detect");
        var comp = null;
        try { comp = app.project.activeItem; } catch (e) {}
        if (comp && comp instanceof CompItem) {
            for (var li = 1; li <= comp.numLayers; li++) {
                dd.add("item", comp.layers[li].name);
            }
        }
        // Restore previous selection if still valid
        if (prevSelection && prevSelection !== "Auto-detect") {
            for (var ri = 1; ri < dd.items.length; ri++) {
                if (dd.items[ri].text === prevSelection) {
                    dd.selection = ri;
                    return;
                }
            }
        }
        dd.selection = 0;
    }

    // ── Event handlers ────────────────────────────

    randomizeBtn.onClick = function() {
        var rs = randomizeSettings();
        applySettingsToUI(ui, rs);
    };

    genBtn.onClick = function() {
        refreshRotoDropdown(ui);
        var settings = settingsFromUI(ui);
        var count = generate(settings, false);
        if (count != null) {
            rotoStatus.text = count + " elems";
        }
    };

    regenBtn.onClick = function() {
        refreshRotoDropdown(ui);
        var settings = settingsFromUI(ui);
        var count = generate(settings, true);
        if (count != null) {
            rotoStatus.text = count + " elems";
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
        }
    };

    exportBtn.onClick = function() {
        try {
            var exported = exportBuiltInAssets();
            alert("Exported " + exported + " assets to WindowsErrorFX_Custom folder.");
        } catch (e) {
            alert("Export failed: " + e.toString());
        }
    };

    // ── Load existing settings if available ───────
    wlog("Panel init: loading settings...");
    try {
        var comp = app.project.activeItem;
        if (comp && comp instanceof CompItem) {
            wlog("Panel init: active comp \"" + comp.name + "\" " + comp.width + "x" + comp.height);
            refreshRotoDropdown(ui);
            var saved = loadSettings(comp);
            applySettingsToUI(ui, saved);
            wlog("Panel init: settings loaded (seed=" + saved.seed + " chaos=" + saved.chaos + ")");
            var roto = detectRotoLayers(comp, ROTO_KEYWORDS, []);
            rotoStatus.text = roto.length + " roto";
            wlog("Panel init: " + roto.length + " roto layers detected");
        } else {
            rotoStatus.text = "No comp";
            wlog("Panel init: no active comp");
        }
    } catch (e) {
        rotoStatus.text = "Ready";
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
    calcCompScale: calcCompScale,
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
    defaultSettings: defaultSettings,
    defaultElementSettings: defaultElementSettings,
    getElementSettings: getElementSettings,
    migrateSettings: migrateSettings,
    randomizeSettings: randomizeSettings,
    // Constants (for testing)
    DIALOG_VARIANTS: DIALOG_VARIANTS,
    BSOD_LINES_XP: BSOD_LINES_XP,
    BSOD_LINES_9X: BSOD_LINES_9X,
    BSOD_CODES: BSOD_CODES,
    BSOD_EXCEPTIONS: BSOD_EXCEPTIONS,
    C_PIXEL_COLORS: C_PIXEL_COLORS,
    C_FREEZE_MIN_HEIGHT: C_FREEZE_MIN_HEIGHT,
    C_FREEZE_MAX_HEIGHT: C_FREEZE_MAX_HEIGHT,
    C_FREEZE_CLUSTER_MIN: C_FREEZE_CLUSTER_MIN,
    C_FREEZE_CLUSTER_MAX: C_FREEZE_CLUSTER_MAX,
    C_FREEZE_CLUSTER_BAND: C_FREEZE_CLUSTER_BAND,
    C_FREEZE_CLUSTER_GAP_MIN: C_FREEZE_CLUSTER_GAP_MIN,
    C_FREEZE_CLUSTER_GAP_MAX: C_FREEZE_CLUSTER_GAP_MAX,
    FLOOR_FREEZE_STRIP: FLOOR_FREEZE_STRIP,
    VIRTUAL_RESOLUTIONS: VIRTUAL_RESOLUTIONS,
    DEFAULT_VIRTUAL_RES_INDEX: DEFAULT_VIRTUAL_RES_INDEX,
    DIALOG_CATALOG: DIALOG_CATALOG
};

})(this);
