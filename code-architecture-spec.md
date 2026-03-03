# Windows Error FX — Code Architecture Specification
### docs/code-architecture-spec.md v0.1

This document defines the complete structure of `WindowsErrorFX.jsx` before a single line of production code is written. All function signatures, data structures, and call relationships are locked here. When in doubt, the specs (visual, animation, config) take precedence over this document — but this document is the bridge between those specs and the actual code.

---

## File Structure (Ordered)

```
WindowsErrorFX.jsx
│
├── ── SECTION 1: HEADER & CONSTANTS ────────────────────────────
├── ── SECTION 2: PRNG ──────────────────────────────────────────
├── ── SECTION 3: AE UTILITIES ──────────────────────────────────
├── ── SECTION 4: ELEMENT BUILDERS ──────────────────────────────
│   ├── buildBSOD()
│   ├── buildDialogBox()
│   ├── buildChromeFragment()
│   ├── buildTextOverlay()
│   ├── buildCursor()
│   └── buildPixelBlock()
├── ── SECTION 5: GLOBAL OVERLAYS ───────────────────────────────
│   ├── buildScanLines()
│   └── buildNoise()
├── ── SECTION 6: SCHEDULER ─────────────────────────────────────
├── ── SECTION 7: ROTO DETECTOR ─────────────────────────────────
├── ── SECTION 8: COMPOSITOR ────────────────────────────────────
├── ── SECTION 9: STATE MANAGER ─────────────────────────────────
├── ── SECTION 10: MAIN GENERATOR ───────────────────────────────
└── ── SECTION 11: UI ───────────────────────────────────────────
```

Each section is separated in the file by a banner comment:

```javascript
// ════════════════════════════════════════════════════════════════
// SECTION 4 — ELEMENT BUILDERS
// ════════════════════════════════════════════════════════════════
```

---

## Section 1: Constants

All user-tweakable values at the top of the file. Documented inline.

```javascript
// ── Visual ───────────────────────────────────────────────────────
var C_BSOD_BG         = [0,     0,     0.667]; // #0000AA
var C_BSOD_TEXT       = [1,     1,     1    ]; // white
var C_DIALOG_BG       = [0.831, 0.816, 0.784]; // #D4D0C8
var C_DIALOG_TITLE_BG = [0,     0,     0.502]; // #000080
var C_DIALOG_TITLE_FX = [1,     1,     1    ]; // white
var C_DIALOG_BORDER_D = [0.4,   0.4,   0.4  ]; // dark border (3D effect)
var C_DIALOG_BORDER_L = [1,     1,     1    ]; // light border (3D effect)
var C_DIALOG_BTN_BG   = [0.831, 0.816, 0.784];
var C_TEXT_OVERLAY    = [1,     1,     1    ]; // white monospace text
var C_CURSOR          = [1,     1,     1    ]; // white with black outline

// ── Fonts ────────────────────────────────────────────────────────
var FONT_MONO         = "Courier New";   // fallback; swap to Fixedsys if installed
var FONT_UI           = "Arial";

// ── Font sizes ───────────────────────────────────────────────────
var FSIZE_BSOD        = 13;
var FSIZE_DIALOG_BODY = 11;
var FSIZE_DIALOG_TITLE= 11;
var FSIZE_TEXT_OVER   = 14;
var FSIZE_BUTTON      = 10;

// ── Timing ───────────────────────────────────────────────────────
var FLOOR_FRAMES      = 8;   // minimum element lifespan (all except pixel blocks)
var FLOOR_PIXEL_BLOCK = 2;   // minimum lifespan exception for pixel blocks
var MAX_FRAMES        = 96;  // maximum element lifespan

// ── Dialog geometry ──────────────────────────────────────────────
var DIALOG_WIDTH      = 280; // px at 1080p
var DIALOG_HEIGHT     = 140;
var DIALOG_TITLE_H    = 18;
var DIALOG_BTN_W      = 60;
var DIALOG_BTN_H      = 20;
var STACK_OFFSET_X    = 10;  // diagonal cascade offset
var STACK_OFFSET_Y    = 10;
var MAX_STACK_DEPTH   = 8;

// ── Scan lines ───────────────────────────────────────────────────
var SCANLINE_OPACITY  = 0.20;
var SCANLINE_SPACING  = 4;   // px between lines
var NOISE_OPACITY     = 0.08;

// ── Cursor ───────────────────────────────────────────────────────
var CURSOR_HEIGHT     = 24;  // px

// ── Roto detection keywords ──────────────────────────────────────
var ROTO_KEYWORDS     = ["roto", "rotoscope", "matte", "cutout", "subject", "fg"];
```

---

## Section 2: PRNG

```javascript
/**
 * Creates a seeded deterministic random number generator (mulberry32).
 * @param  {number} seed  Integer seed value
 * @return {function}     RNG function that returns float 0.0–1.0
 */
function createRNG(seed) { ... }

// Math.imul polyfill (required for mulberry32 in ES3)
if (!Math.imul) { Math.imul = function(a, b) { ... }; }

/**
 * Returns a random integer between min and max inclusive.
 * @param  {function} rng  RNG from createRNG()
 * @param  {number}   min
 * @param  {number}   max
 * @return {number}
 */
function rngInt(rng, min, max) { ... }

/**
 * Returns a random item from an array.
 * @param  {function} rng
 * @param  {Array}    arr
 * @return {*}
 */
function rngPick(rng, arr) { ... }

/**
 * Returns true with the given probability (0.0–1.0).
 * @param  {function} rng
 * @param  {number}   probability
 * @return {boolean}
 */
function rngBool(rng, probability) { ... }

/**
 * Returns a float between min and max.
 * @param  {function} rng
 * @param  {number}   min
 * @param  {number}   max
 * @return {number}
 */
function rngFloat(rng, min, max) { ... }
```

---

## Section 3: AE Utilities

Small helpers to reduce boilerplate everywhere else. These functions never call each other — they are pure utilities.

```javascript
/**
 * Snaps a seconds value to the nearest frame boundary.
 * Prevents keyframe drift over long comps.
 * @param  {number} seconds
 * @param  {number} fps
 * @return {number}
 */
function snapToFrame(seconds, fps) { ... }

/**
 * Converts a frame count to seconds for a given comp.
 * @param  {number}   frames
 * @param  {CompItem} comp
 * @return {number}
 */
function framesToSeconds(frames, comp) { ... }

/**
 * Clamps a value between min and max.
 * @param  {number} val
 * @param  {number} min
 * @param  {number} max
 * @return {number}
 */
function clamp(val, min, max) { ... }

/**
 * Adds a shape group (rectangle) to a shape layer's contents.
 * Returns the group PropertyGroup for further modification.
 * @param  {PropertyGroup} contents   The shape layer's Contents group
 * @param  {string}        name
 * @param  {number}        w          Width in px
 * @param  {number}        h          Height in px
 * @param  {number}        cx         Center X in comp space
 * @param  {number}        cy         Center Y in comp space
 * @param  {Array}         fillColor  [r, g, b] normalized
 * @param  {Array|null}    strokeColor  [r, g, b] or null for no stroke
 * @param  {number}        strokeWidth
 * @return {PropertyGroup}
 */
function addRect(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth) { ... }

/**
 * Sets a linear keyframe on a property at the given time.
 * @param  {Property} prop
 * @param  {number}   timeSeconds
 * @param  {*}        value
 */
function setLinearKey(prop, timeSeconds, value) { ... }

/**
 * Sets a HOLD keyframe (instant cut) on a property at the given time.
 * @param  {Property} prop
 * @param  {number}   timeSeconds
 * @param  {*}        value
 */
function setHoldKey(prop, timeSeconds, value) { ... }

/**
 * Sets layer in/out points, clamped to comp duration.
 * @param  {Layer}    layer
 * @param  {number}   inSeconds
 * @param  {number}   outSeconds
 * @param  {CompItem} comp
 */
function setLayerTime(layer, inSeconds, outSeconds, comp) { ... }

/**
 * Generates a plausible fake hex error code string.
 * e.g. "0x00000F4A8C2B"
 * @param  {function} rng
 * @return {string}
 */
function fakeHex(rng) { ... }

/**
 * Returns a random error message body string from the pool.
 * Merges built-in pool with any custom messages.
 * @param  {function} rng
 * @param  {Array}    customPool  Array of strings (may be empty)
 * @return {string}
 */
function pickErrorMessage(rng, customPool) { ... }

/**
 * Returns a random window title string from the pool.
 * @param  {function} rng
 * @param  {Array}    customTitles  Array of strings (may be empty)
 * @return {string}
 */
function pickWindowTitle(rng, customTitles) { ... }
```

---

## Section 4: Element Builders

Each builder creates one logical element as one or more layers inside `targetComp`. Builders do not know about roto, chaos level, or timing — those concerns belong to the Scheduler and Compositor.

All builders follow this contract:
- Accept a `params` object (see each builder below)
- Accept `targetComp` as the comp to build into
- Return an array of the Layer objects created (`[]` if nothing was created)
- Never move layers (Compositor handles stacking order)
- Always respect `params.inPoint` and `params.outPoint`

---

### ElementParams (shared base)

```javascript
// All builders receive a params object extending this base:
{
    inPoint:  number,   // seconds — when element becomes visible
    outPoint: number,   // seconds — when element disappears
    x:        number,   // comp-space X position (left edge or center, see per-element)
    y:        number,   // comp-space Y position (top edge or center, see per-element)
    rng:      function, // the RNG instance (pre-seeded, pre-advanced to this element's slot)
    compW:    number,   // comp width px
    compH:    number    // comp height px
}
```

---

### buildBSOD(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   behavior:    string,  // "static" | "slideH" | "slideV" | "stutter" | "snapEdge"
 *   variant:     string,  // "fullStrip" | "corner" | "island"
 *   textBehavior:string,  // "static" | "typewriter" | "lineShuffle"
 *   slideDir:    string,  // "left" | "right" | "up" | "down" (for slide behaviors)
 *   slideSpeed:  number,  // px per frame
 *   stutterFrame:number,  // frame within lifespan where stutter occurs (for "stutter")
 *   stutterDur:  number,  // frames to freeze during stutter
 *   textLines:   Array,   // array of strings to display (pre-picked by scheduler)
 *   opacity:     number   // 0–100, default 90
 * }
 *
 * returns: Array of Layer objects [solidLayer, textLayer]
 *
 * Construction:
 *   - One solid layer (BSOD_BG color) for the panel body
 *   - One text layer per line (or a single multi-line text layer)
 *   - Keyframes on Position for slide/stutter behaviors
 *   - No keyframes for "static" behavior
 */
function buildBSOD(params, targetComp) { ... }
```

---

### buildDialogBox(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   title:        string,  // window title bar text
 *   body:         string,  // main message body text
 *   buttons:      Array,   // e.g. ["OK", "Cancel"] — max 3
 *   icon:         string,  // "error" | "warning" | "question" | "none"
 *   arrivalBehavior: string, // "pop" | "scalePop" | "slideIn"
 *   lifeBehavior:    string, // "static" | "drift" | "shake"
 *   exitBehavior:    string, // "cut" | "collapse" | "slideOff"
 *   driftDir:     number,  // angle in degrees (for "drift")
 *   driftSpeed:   number,  // px per frame (for "drift")
 *   shakeFrame:   number,  // frame within lifespan when shake burst starts
 *   shakeDur:     number,  // frames of shake burst
 *   stackIndex:   number,  // 0 = primary, 1–7 = cascade offset multiples
 *   opacity:      number   // 0–100, default 95
 * }
 *
 * returns: Array of Layer objects (multiple shape layers composing the dialog chrome)
 *
 * Construction (all shape layers within a single ShapeLayer, or separate layers):
 *   Approach: multiple shape layers grouped, parented to a Null
 *   - Null layer (anchor/position control, invisible)
 *     ├── Title bar solid rect
 *     ├── Title bar text
 *     ├── Body rect (dialog background)
 *     ├── Body text
 *     ├── Icon indicator (small colored rect — red/yellow/blue square as proxy for icon)
 *     ├── Button rect(s) with 3D border effect (two overlapping rects, light + dark)
 *     └── Button text layer(s)
 *   - All layers parented to the Null
 *   - Keyframes applied to Null layer's Position/Scale for arrival/exit behaviors
 *   - Shake keyframes on Null Position X
 */
function buildDialogBox(params, targetComp) { ... }
```

---

### buildChromeFragment(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   fragmentType: string,  // "titleBar" | "buttonRow" | "closeBtn" | "scrollbar" | "titleStack"
 *   behavior:     string,  // "flicker" | "drift" | "jumpCut"
 *   title:        string,  // used if fragmentType is "titleBar" or "titleStack"
 *   driftDir:     number,  // angle in degrees (for "drift")
 *   driftSpeed:   number,
 *   jumpInterval: number,  // frames between jumps (for "jumpCut")
 *   jumpRadius:   number,  // max px from origin for each jump
 *   stackCount:   number,  // number of bars in a titleStack (3–6)
 *   opacity:      number
 * }
 *
 * returns: Array of Layer objects
 */
function buildChromeFragment(params, targetComp) { ... }
```

---

### buildTextOverlay(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   lines:        Array,   // array of strings — pre-selected by scheduler
 *   behavior:     string,  // "static" | "hScan" | "vScroll" | "ghostDrift"
 *   driftDir:     string,  // "up" | "down" (for "ghostDrift")
 *   driftSpeed:   number,  // px per frame
 *   corruption:   boolean, // whether to apply per-character corruption animation
 *   corruptType:  string,  // "swap" | "block" | "dropout" (if corruption true)
 *   corruptRate:  number,  // frames between corruption events
 *   opacity:      number,  // 0–100
 *   fontSize:     number   // override FSIZE_TEXT_OVER if needed
 * }
 *
 * returns: Array of Layer objects (one text layer per line, or single for vScroll)
 *
 * Note on corruption:
 *   Character-level corruption is approximated in ExtendScript by swapping the
 *   full text layer's content at keyframe intervals — true per-character animation
 *   is not feasible without expressions. The scheduler pre-generates the corrupted
 *   text variants and the builder sets HOLD keyframes between them.
 */
function buildTextOverlay(params, targetComp) { ... }
```

---

### buildCursor(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   behavior:     string,  // "frozen" | "orbit" | "cornerSeek" | "randomWalk"
 *                          // "glitchStutter" | "ghostTrail" | "cluster"
 *   orbitRadius:  number,  // px (for "orbit")
 *   orbitSpeed:   number,  // degrees per frame
 *   orbitDir:     number,  // 1 = clockwise, -1 = counterclockwise
 *   targetCorner: string,  // "TL" | "TR" | "BL" | "BR" (for "cornerSeek")
 *   seekSpeed:    number,  // px per frame (for "cornerSeek")
 *   walkInterval: number,  // frames between jumps (for "randomWalk")
 *   walkRadius:   number,  // max jump distance px
 *   trailCount:   number,  // 2–6 (for "ghostTrail")
 *   trailOffset:  number,  // frames of delay between trail cursors
 *   clusterCount: number,  // 4–8 (for "cluster")
 *   clusterSpread:number,  // max px spread of cluster
 *   size:         number,  // px height override (default CURSOR_HEIGHT)
 *   opacity:      number
 * }
 *
 * returns: Array of Layer objects
 *
 * Cursor construction:
 *   The Windows arrow cursor is drawn as a ShapeLayer polygon approximation:
 *   A narrow vertical parallelogram with a diagonal cut — 5-point polygon.
 *   White fill, 1px black stroke. This avoids any bitmap dependency.
 *   For "ghostTrail" and "cluster", multiple cursor layers are created.
 */
function buildCursor(params, targetComp) { ... }
```

---

### buildPixelBlock(params, targetComp)

```javascript
/*
 * params extends base with:
 * {
 *   behavior:     string,  // "flash" | "stutterHold" | "hTear" | "blockCrawl"
 *   blockCount:   number,  // number of blocks in cluster (for "blockCrawl")
 *   crawlRadius:  number,  // max spread px (for "blockCrawl")
 *   crawlInterval:number,  // frames between jumps
 *   tearY:        number,  // Y position for "hTear" variant
 *   colors:       Array,   // array of [r,g,b] to pick from (black, white, BSOD blue)
 *   w:            number,  // block width px
 *   h:            number,  // block height px
 *   opacity:      number
 * }
 *
 * returns: Array of Layer objects
 */
function buildPixelBlock(params, targetComp) { ... }
```

---

### buildScanLines(comp)

```javascript
/*
 * Builds a full-comp-size scan line overlay.
 * Solid layer with a repeating horizontal stripe expression, Multiply blend mode.
 * Covers the entire comp duration.
 *
 * @param  {CompItem} comp
 * @return {Layer}    The scan line layer
 */
function buildScanLines(comp) { ... }
```

---

### buildNoise(comp)

```javascript
/*
 * Builds a noise layer using the Noise effect on a solid.
 * Overlay blend mode, low opacity.
 *
 * @param  {CompItem} comp
 * @return {Layer}    The noise layer
 */
function buildNoise(comp) { ... }
```

---

## Section 6: Scheduler

The Scheduler is the brain of the operation. It takes the user's settings and produces a flat list of `ElementJob` objects — one per element to be created — with all timing and behavior decisions pre-made. The builders then execute these jobs.

### ElementJob Object

```javascript
// An ElementJob is a plain object passed to a builder.
// It contains the full params for that element.
{
    type:      string,   // "bsod" | "dialog" | "chrome" | "text" | "cursor" | "pixel"
    layer:     string,   // "over" | "under" — which roto group it belongs to
    inFrame:   number,   // integer frame number
    outFrame:  number,   // integer frame number
    // ... all other params for the relevant builder
}
```

### Scheduler Functions

```javascript
/**
 * Master scheduler. Given user settings, returns an array of ElementJobs.
 * This is a pure function — no AE API calls, only calculations.
 *
 * @param  {object} settings  User settings object (see Section 9)
 * @param  {object} compInfo  { duration, frameRate, width, height, totalFrames }
 * @return {Array}            Array of ElementJob objects
 */
function schedule(settings, compInfo) { ... }

/**
 * Determines total element count from chaos level and comp duration.
 * @param  {number} chaos        0–100
 * @param  {number} totalFrames
 * @return {number}              Total elements to spawn
 */
function calcElementCount(chaos, totalFrames) { ... }

/**
 * Applies the chaos curve to distribute spawn times across the comp.
 * Returns an array of frame numbers (spawn times).
 * @param  {number}   count       Total elements to schedule
 * @param  {number}   totalFrames
 * @param  {string}   curve       "flat" | "build" | "peak" | "burst" | "random"
 * @param  {function} rng
 * @return {Array}                Array of integer frame numbers
 */
function distributeTimes(count, totalFrames, curve, rng) { ... }

/**
 * Picks element type for one job, weighted by element mix settings.
 * @param  {object}   mix  { dialog, bsod, text, cursor, pixel } — each 0–100
 * @param  {function} rng
 * @return {string}   Element type string
 */
function pickElementType(mix, rng) { ... }

/**
 * Determines element lifespan in frames.
 * Respects FLOOR_FRAMES, MAX_FRAMES, and per-type floor exceptions.
 * @param  {string}   type
 * @param  {number}   minFrames  User-set global min
 * @param  {number}   maxFrames  User-set global max
 * @param  {function} rng
 * @return {number}              Duration in frames
 */
function pickDuration(type, minFrames, maxFrames, rng) { ... }

/**
 * Assigns "over" or "under" to an element based on type and roto mode.
 * @param  {string} type
 * @param  {string} rotoMode  "split" | "allOver" | "allUnder" | "flat"
 * @param  {function} rng
 * @return {string}  "over" | "under"
 */
function assignLayer(type, rotoMode, rng) { ... }

/**
 * Builds the full ElementJob params for a specific element type.
 * Called once per element after type/timing/layer are determined.
 * @param  {string}   type
 * @param  {number}   inFrame
 * @param  {number}   outFrame
 * @param  {string}   layer        "over" | "under"
 * @param  {object}   settings
 * @param  {object}   compInfo
 * @param  {function} rng
 * @return {ElementJob}
 */
function buildJob(type, inFrame, outFrame, layer, settings, compInfo, rng) { ... }

/**
 * Detects and manages dialog cascade groups.
 * Scans the job list for dialogs with the same title and assigns stackIndex values.
 * Mutates the job list in place.
 * @param  {Array}    jobs  Array of ElementJob objects
 * @param  {function} rng
 */
function assignDialogStacks(jobs, rng) { ... }
```

---

## Section 7: Roto Detector

```javascript
/**
 * Scans a comp for roto layers by keyword matching.
 * @param  {CompItem} comp
 * @param  {Array}    keywords      Array of strings (case-insensitive)
 * @param  {Array}    extraKeywords User-added keywords (may be empty)
 * @return {Array}                  Array of Layer objects matching any keyword
 */
function detectRotoLayers(comp, keywords, extraKeywords) { ... }

/**
 * Returns true if a layer name contains any of the given keywords.
 * Case-insensitive.
 * @param  {string} name
 * @param  {Array}  keywords
 * @return {boolean}
 */
function nameMatchesKeyword(name, keywords) { ... }
```

---

## Section 8: Compositor

The Compositor creates the pre-comp structure and places finished layers into the right groups.

```javascript
/**
 * Creates the WindowsErrorFX pre-comp inside the target comp.
 * Returns an object with references to the created groups.
 *
 * @param  {CompItem} parentComp   The user's active comp
 * @param  {number}   seed
 * @return {object}   {
 *     preComp:       CompItem,    — the new pre-comp
 *     preCompLayer:  AVLayer,     — the pre-comp layer sitting in parentComp
 *     overGroup:     CompItem,    — sub-comp for OVER elements (or null if flat mode)
 *     underGroup:    CompItem,    — sub-comp for UNDER elements (or null if flat mode)
 *     rotoLayers:    Array        — detected roto layers in parentComp
 * }
 */
function createPreCompStructure(parentComp, seed) { ... }

/**
 * Places a set of layers (from a builder) into the correct target comp
 * based on the ElementJob's "layer" value ("over" | "under").
 *
 * @param  {Array}    layers     Array of Layer objects returned by a builder
 * @param  {string}   placement  "over" | "under"
 * @param  {object}   structure  Return value of createPreCompStructure()
 */
function placeLayers(layers, placement, structure) { ... }

/**
 * Checks if a WindowsErrorFX pre-comp already exists in the comp.
 * Returns the pre-comp layer if found, null if not.
 * @param  {CompItem} comp
 * @return {AVLayer|null}
 */
function findExistingEffect(comp) { ... }

/**
 * Removes the WindowsErrorFX pre-comp and all its contents.
 * @param  {CompItem} comp
 */
function clearEffect(comp) { ... }
```

---

## Section 9: State Manager

Handles reading and writing settings to comp markers.

```javascript
/**
 * The canonical settings object. Default values defined here.
 * @typedef {object} WEFXSettings
 * {
 *   seed:          number,   // integer, default 1984
 *   chaos:         number,   // 0–100, default 50
 *   rotoMode:      string,   // "split" | "allOver" | "allUnder" | "flat"
 *   chaosCurve:    string,   // "flat" | "build" | "peak" | "burst" | "random"
 *   animStyle:     string,   // "xpClassic" | "glitchHeavy" | "slowBurn" | "chaosMax"
 *   minFrames:     number,   // 8
 *   maxFrames:     number,   // 96
 *   mix: {
 *     dialog:      number,   // 0–100, default 75
 *     bsod:        number,   // 0–100, default 50
 *     text:        number,   // 0–100, default 75
 *     cursor:      number,   // 0–100, default 50
 *     pixel:       number    // 0–100, default 25
 *   },
 *   customMessages:Array,    // strings added by user
 *   customTitles:  Array,    // title strings added by user
 *   rotoKeywords:  Array,    // extra keywords from user
 *   rotoLayerNames:Array     // names of layers user explicitly checked/unchecked
 * }
 */

/**
 * Returns a settings object with all default values.
 * @return {WEFXSettings}
 */
function defaultSettings() { ... }

/**
 * Reads stored settings from comp markers.
 * Returns default settings merged with any stored values.
 * @param  {CompItem} comp
 * @return {WEFXSettings}
 */
function loadSettings(comp) { ... }

/**
 * Writes settings to comp markers as JSON.
 * Overwrites any existing WEFX markers.
 * @param  {CompItem}     comp
 * @param  {WEFXSettings} settings
 */
function saveSettings(comp, settings) { ... }

/**
 * Reads the current UI state and returns a WEFXSettings object.
 * @param  {object} ui  References to all UI controls (see Section 11)
 * @return {WEFXSettings}
 */
function settingsFromUI(ui) { ... }

/**
 * Populates the UI controls from a WEFXSettings object.
 * @param  {object}       ui
 * @param  {WEFXSettings} settings
 */
function applySettingsToUI(ui, settings) { ... }
```

---

## Section 10: Main Generator

The orchestrator. Called when the user clicks Generate or Regenerate.

```javascript
/**
 * Main entry point for effect generation.
 * Orchestrates: validate → load settings → schedule → build → composite → save.
 *
 * @param  {WEFXSettings} settings
 * @param  {boolean}      forceReplace  If true, skip the "replace?" prompt
 */
function generate(settings, forceReplace) {

    // 1. Validate active comp
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) { alert(...); return; }

    // 2. Check for existing effect
    var existing = findExistingEffect(comp);
    if (existing && !forceReplace) {
        var ok = confirm("Replace existing effect?");
        if (!ok) return;
        clearEffect(comp);
    } else if (existing) {
        clearEffect(comp);
    }

    // 3. Detect roto layers
    var rotoLayers = detectRotoLayers(comp, ROTO_KEYWORDS, settings.rotoKeywords);

    // 4. Build compInfo
    var compInfo = {
        duration:    comp.duration,
        frameRate:   comp.frameRate,
        width:       comp.width,
        height:      comp.height,
        totalFrames: Math.round(comp.duration * comp.frameRate)
    };

    // 5. Create RNG
    var rng = createRNG(settings.seed);

    // 6. Schedule all elements
    var jobs = schedule(settings, compInfo);
    assignDialogStacks(jobs, rng);

    // 7. Create pre-comp structure
    app.beginUndoGroup("Windows Error FX — Generate");
    try {
        var structure = createPreCompStructure(comp, settings.seed);

        // 8. Build each element and place it
        for (var i = 0; i < jobs.length; i++) {
            var job = jobs[i];
            var targetComp = (job.layer === "over") ? structure.overGroup
                           : (job.layer === "under") ? structure.underGroup
                           : structure.preComp;
            var layers = [];

            if      (job.type === "bsod")   layers = buildBSOD(job, targetComp);
            else if (job.type === "dialog") layers = buildDialogBox(job, targetComp);
            else if (job.type === "chrome") layers = buildChromeFragment(job, targetComp);
            else if (job.type === "text")   layers = buildTextOverlay(job, targetComp);
            else if (job.type === "cursor") layers = buildCursor(job, targetComp);
            else if (job.type === "pixel")  layers = buildPixelBlock(job, targetComp);
        }

        // 9. Add global overlays
        buildScanLines(structure.preComp);
        buildNoise(structure.preComp);

        // 10. Save settings to markers
        saveSettings(comp, settings);

    } catch(e) {
        alert("Windows Error FX error:\n" + e.toString() + "\nLine: " + e.line);
    } finally {
        app.endUndoGroup();
    }
}
```

---

## Section 11: UI

See `docs/fx-config-spec.md` for full layout spec. The UI section contains only:
- The `buildPanel(thisObj)` function
- All `ui` control references assembled into a single `ui` object
- Event handlers that call into Sections 9 and 10
- The Advanced panel collapse/expand logic
- The Custom Messages floating dialog

The UI section never contains logic — it only calls named functions from other sections.

---

## Call Graph Summary

```
[User clicks Generate]
        │
        ▼
  generate(settings, forceReplace)
    ├── app.project.activeItem          — AE API
    ├── findExistingEffect(comp)
    │     └── [scans comp layers]
    ├── clearEffect(comp)               — if replacing
    ├── detectRotoLayers(comp, ...)
    ├── createRNG(seed)
    ├── schedule(settings, compInfo)
    │     ├── calcElementCount()
    │     ├── distributeTimes()
    │     ├── pickElementType()         — called N times
    │     ├── pickDuration()            — called N times
    │     ├── assignLayer()             — called N times
    │     └── buildJob()               — called N times
    │           ├── pickErrorMessage()
    │           ├── pickWindowTitle()
    │           └── fakeHex()
    ├── assignDialogStacks(jobs, rng)
    ├── createPreCompStructure(comp, seed)
    ├── [loop over jobs]
    │     └── buildBSOD / buildDialogBox / buildChromeFragment /
    │         buildTextOverlay / buildCursor / buildPixelBlock
    │               └── addRect / setLinearKey / setHoldKey / setLayerTime
    ├── buildScanLines(preComp)
    ├── buildNoise(preComp)
    └── saveSettings(comp, settings)
```

---

## Data Flow

```
User Input (UI)
      │
      ▼
WEFXSettings object
      │
      ├──► saveSettings() → Comp Markers (persisted)
      │
      ▼
schedule(settings, compInfo)
      │
      ▼
Array of ElementJob objects  ←── pure data, no AE API
      │
      ▼
[loop: buildXxx(job, targetComp)]
      │
      ▼
Layers in pre-comp structure
      │
      ▼
Finished effect in user's comp
```

The hard separation between the **Scheduler** (pure calculation, no AE API) and the **Builders** (AE API only) means the scheduling logic can be tested in a browser console independently of After Effects.

---

*Document version 0.1 — companion to fx-visual-spec.md, fx-animation-spec.md, fx-config-spec.md*
