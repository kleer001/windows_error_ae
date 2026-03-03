// test_harness.js — Loads WindowsErrorFX.jsx into a Node.js VM sandbox
// Provides minimal AE global mocks so sections 1-10 can execute.
// Section 11 (UI) is guarded by `typeof Panel === "undefined"` and skips.

var fs = require("fs");
var vm = require("vm");
var path = require("path");

var jsxPath = path.join(__dirname, "..", "WindowsErrorFX.jsx");
var jsxCode = fs.readFileSync(jsxPath, "utf8");

// Create sandbox with standard globals + AE mocks
var sandbox = {
    // Standard JS
    Math: Math,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    RegExp: RegExp,
    Error: Error,
    Date: Date,
    undefined: undefined,
    NaN: NaN,
    Infinity: Infinity,

    // AE-like globals that are referenced but not needed for pure logic
    alert: function(msg) { /* no-op in tests */ },
    confirm: function() { return true; },
    $: { os: "Macintosh", writeln: function() {}, fileName: "" },

    // AE enums (stubs — builders reference these but won't run in tests)
    ParagraphJustification: {
        LEFT_JUSTIFY: 0,
        CENTER_JUSTIFY: 1,
        RIGHT_JUSTIFY: 2
    },
    KeyframeInterpolationType: {
        LINEAR: 1,
        BEZIER: 2,
        HOLD: 3
    },
    BlendingMode: {
        NORMAL: 1,
        MULTIPLY: 2,
        SCREEN: 3,
        ADD: 4,
        OVERLAY: 5
    },
    CompItem: function CompItem() {},
    MarkerValue: function MarkerValue(label) { this.label = label; this.comment = ""; },
    Shape: function Shape() { this.vertices = []; this.closed = true; },

    // Console for debug
    console: console
};

// Run the JSX code in the sandbox
vm.createContext(sandbox);
try {
    vm.runInContext(jsxCode, sandbox);
} catch (e) {
    console.error("HARNESS ERROR: Failed to eval WindowsErrorFX.jsx");
    console.error(e.message);
    console.error(e.stack);
    process.exit(1);
}

// Unwrap WEFX namespace into sandbox so test files can use ctx.funcName directly
if (sandbox.WEFX) {
    var keys = Object.keys(sandbox.WEFX);
    for (var i = 0; i < keys.length; i++) {
        sandbox[keys[i]] = sandbox.WEFX[keys[i]];
    }
}

// Export the sandbox so tests can access all functions
module.exports = sandbox;
