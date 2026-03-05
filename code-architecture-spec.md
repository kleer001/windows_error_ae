# Windows Error FX — Code Architecture Specification
### code-architecture-spec.md v0.3

This document defines the structure of `WindowsErrorFX.jsx` — all sections, function signatures, data structures, and call relationships.

---

## File Structure (Ordered)

```
WindowsErrorFX.jsx  (wrapped in IIFE)
│
├── ── SECTION 0: LOGGING ─────────────────────────────────────────
│   ├── wlogOpen(), wlogClose(), wlog(), wwarn(), werr()
│   ├── wlogObj(), getLog(), getLogPath(), clearLog()
│
├── ── SECTION 1: CONSTANTS ───────────────────────────────────────
│   ├── Visual colors (C_BSOD_BG, C_DIALOG_*, C_PIXEL_COLORS, C_CURSOR_*, C_ICON_*)
│   ├── Dialog variant palettes (DIALOG_VARIANTS A/B/C)
│   ├── Fonts (FONT_MONO, FONT_UI, FONT_BSOD, FONT_BSOD_9X)
│   ├── Font sizes (FSIZE_BSOD, FSIZE_DIALOG_*, FSIZE_TEXT_OVER, FSIZE_BUTTON)
│   ├── Timing (FLOOR_FRAMES=8, FLOOR_PIXEL_BLOCK=2, FLOOR_FREEZE_STRIP=2, MAX_FRAMES=96)
│   ├── Blend mode weights (BLEND_WEIGHTS per type, BLEND_MODE_MAP)
│   ├── Dialog geometry (DIALOG_WIDTH/HEIGHT, STACK_OFFSET_*, MAX_STACK_DEPTH)
│   ├── Overlay defaults (scanline, noise, head scratch)
│   ├── Element control defaults (scale, speed, opacity, entry/exit)
│   ├── Virtual resolution presets (VIRTUAL_RESOLUTIONS, DEFAULT_VIRTUAL_RES_INDEX)
│   ├── Roto keywords (ROTO_KEYWORDS)
│   ├── Message pools (ERROR_MESSAGES, WINDOW_TITLES, BUTTON_COMBOS, BSOD_LINES)
│   ├── BSOD era text (BSOD_LINES_XP, BSOD_LINES_9X, BSOD_CODES, BSOD_EXCEPTIONS)
│   ├── Trails defaults (DEFAULT_TRAILS_*)
│   ├── Freeze strip constants (C_FREEZE_*)
│   └── Corrupt text lines (CORRUPT_TEXT_LINES)
│
├── ── SECTION 2: PRNG ────────────────────────────────────────────
│   ├── Math.imul polyfill
│   ├── createRNG(seed)
│   ├── rngInt(rng, min, max)
│   ├── rngPick(rng, arr)
│   ├── rngBool(rng, probability)
│   └── rngFloat(rng, min, max)
│
├── ── SECTION 3: AE UTILITIES ────────────────────────────────────
│   ├── calcCompScale(compW, virtualResIndex)
│   ├── snapToFrame(seconds, fps)
│   ├── framesToSeconds(frames, comp)
│   ├── clamp(val, min, max)
│   ├── addRect(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth)
│   ├── setLinearKey(prop, timeSeconds, value)
│   ├── setHoldKey(prop, timeSeconds, value)
│   ├── setLayerTime(layer, inSeconds, outSeconds, comp)
│   ├── fakeHex(rng)
│   ├── buildIconError/Warning/Question/Info(contents, size, cx, cy)
│   ├── pickErrorMessage(rng, customPool)
│   ├── pickWindowTitle(rng, customTitles)
│   ├── pickBSODLines(rng, count)
│   ├── pickCorruptLines(rng, count)
│   ├── defaultElementSettings()
│   ├── getElementSettings(settings, type)
│   ├── migrateSettings(raw)
│   └── randomizeSettings()
│
├── ── SECTION 4: ELEMENT BUILDERS ────────────────────────────────
│   ├── buildBSOD(params, targetComp)
│   ├── buildDialogBox(params, targetComp)
│   ├── buildChromeFragment(params, targetComp)
│   ├── buildTextOverlay(params, targetComp)
│   ├── buildCursor(params, targetComp)
│   ├── buildPixelBlock(params, targetComp)
│   └── buildFreezeStrip(job, targetComp)
│
├── ── SECTION 5: GLOBAL OVERLAYS ─────────────────────────────────
│   ├── buildScanLines(comp, opts)
│   ├── buildNoise(comp, opts)
│   └── buildHeadScratch(comp, opts)
│
├── ── SECTION 6: SCHEDULER ───────────────────────────────────────
│   ├── calcElementCount(chaos, totalFrames)
│   ├── distributeTimes(count, totalFrames, curve, rng)
│   ├── pickElementType(mix, rng)
│   ├── pickDuration(type, minFrames, maxFrames, rng)
│   ├── assignLayer(type, rotoMode, rng, forceLayer)
│   ├── weightedPick(items, rng)
│   ├── buildJob(type, inFrame, outFrame, layer, settings, compInfo, rng)
│   ├── assignDialogStacks(jobs, rng, maxDepth)
│   └── schedule(settings, compInfo)
│
├── ── SECTION 7: ROTO DETECTOR ───────────────────────────────────
│   ├── nameMatchesKeyword(name, keywords)
│   └── detectRotoLayers(comp, keywords, extraKeywords)
│
├── ── SECTION 8: COMPOSITOR ──────────────────────────────────────
│   ├── createPreCompStructure(parentComp, seed)
│   ├── findExistingEffect(comp)
│   └── clearEffect(comp)
│
├── ── SECTION 9: STATE MANAGER ───────────────────────────────────
│   ├── defaultSettings()
│   ├── loadSettings(comp)
│   ├── saveSettings(comp, settings)
│   ├── settingsFromUI(ui)
│   └── applySettingsToUI(ui, settings)
│
├── ── SECTION 10: MAIN GENERATOR ─────────────────────────────────
│   └── generate(settings, forceReplace)
│
└── ── SECTION 11: UI ─────────────────────────────────────────────
    └── (buildPanel IIFE, guarded by typeof Panel check)
```

---

## Section 1: Constants

All user-tweakable values at the top of the file. Key additions since v0.1:

```javascript
// ── Pixel corruption palette (7 colors) ────────────────────────
var C_PIXEL_COLORS = [
    [0, 0, 0],          // black
    [1, 1, 1],          // white
    [0, 0, 0.667],      // BSOD blue
    [1, 0, 1],          // magenta
    [0, 1, 1],          // cyan
    [1, 0, 0],          // red
    [0, 1, 0]           // green
];

// ── Dialog variant palettes ────────────────────────────────────
var DIALOG_VARIANTS = {
    A: { body, titleStart, titleEnd, borderL/Mid/D/Outer, btnBg/BorderL/D, closeBtn, cornerRadius, titleH },
    B: { ... },  // Win98/2000 — PRIMARY variant (50% weight)
    C: { ... }   // XP Luna — rounded corners, red close button
};

// ── Blend mode weights per element type ────────────────────────
var BLEND_WEIGHTS = {
    bsod:   [{ value: "normal", weight: 40 }, ...],
    pixel:  [{ value: "normal", weight: 40 }, ...],
    dialog: [{ value: "normal", weight: 60 }, ...],
    cursor: [{ value: "normal", weight: 80 }, ...],
    freeze: [{ value: "normal", weight: 90 }, ...]
};

// ── Virtual resolution ─────────────────────────────────────────
var VIRTUAL_RESOLUTIONS = [
    { label: "640 x 480",   w: 640  },
    { label: "800 x 600",   w: 800  },
    { label: "1024 x 768",  w: 1024 },
    { label: "1280 x 1024", w: 1280 },
    { label: "Native",      w: 0    }
];
var DEFAULT_VIRTUAL_RES_INDEX = 2;  // 1024x768

// ── Freeze strip ───────────────────────────────────────────────
var FLOOR_FREEZE_STRIP       = 2;
var C_FREEZE_MIN_HEIGHT      = 1;
var C_FREEZE_MAX_HEIGHT      = 64;
var C_FREEZE_CLUSTER_MIN     = 2;
var C_FREEZE_CLUSTER_MAX     = 5;
var C_FREEZE_CLUSTER_BAND    = 200;
var C_FREEZE_CLUSTER_GAP_MIN = 2;
var C_FREEZE_CLUSTER_GAP_MAX = 20;
```

---

## Section 2: PRNG

Unchanged from v0.1. Mulberry32 with Math.imul polyfill.

```javascript
function createRNG(seed)              // → RNG function returning float 0.0–1.0
function rngInt(rng, min, max)        // → random integer [min, max] inclusive
function rngPick(rng, arr)            // → random array element
function rngBool(rng, probability)    // → true with given probability
function rngFloat(rng, min, max)      // → random float [min, max]
```

---

## Section 3: AE Utilities

Expanded from v0.1 with per-element settings helpers, icon builders, and virtual resolution.

```javascript
function calcCompScale(compW, virtualResIndex) // → scale factor for virtual resolution
function snapToFrame(seconds, fps)
function framesToSeconds(frames, comp)
function clamp(val, min, max)
function addRect(contents, name, w, h, cx, cy, fillColor, strokeColor, strokeWidth)
function setLinearKey(prop, timeSeconds, value)
function setHoldKey(prop, timeSeconds, value)
function setLayerTime(layer, inSeconds, outSeconds, comp)
function fakeHex(rng)                          // → "0x00000F4A8C2B"

// Icon builders (shape layer approximations)
function buildIconError(contents, size, cx, cy)
function buildIconWarning(contents, size, cx, cy)
function buildIconQuestion(contents, size, cx, cy)
function buildIconInfo(contents, size, cx, cy)

// Message pickers
function pickErrorMessage(rng, customPool)     // merges built-in + custom
function pickWindowTitle(rng, customTitles)
function pickBSODLines(rng, count)             // era-specific BSOD text
function pickCorruptLines(rng, count)          // from CORRUPT_TEXT_LINES pool

// Per-element settings helpers
function defaultElementSettings()              // → { count, minFrames, maxFrames, scale, speed, opacityMin, opacityMax, entryFrames, exitFrames, trails, rotoForce, curve, customMessages, customTitles }
function getElementSettings(settings, type)    // → resolved settings with null-safe defaults
function migrateSettings(raw)                  // converts old flat format to new elements format, backfills freeze
function randomizeSettings()                   // → fully randomized settings (uses Math.random, not PRNG)
```

### defaultElementSettings() Return Shape

```javascript
{
    count: 0,
    minFrames: 8,        // FLOOR_FRAMES
    maxFrames: 96,       // MAX_FRAMES
    scale: 100,
    speed: 100,
    opacityMin: 50,
    opacityMax: 100,
    entryFrames: 3,
    exitFrames: 2,
    // Per-element overrides (null = inherit global)
    trails: null,
    rotoForce: null,     // "over" | "under" | null
    curve: null,         // "flat" | "build" | "peak" | "burst" | "random" | null
    customMessages: null,
    customTitles: null
}
```

---

## Section 4: Element Builders

All builders follow this contract:
- Accept a `params` object (the ElementJob from the scheduler)
- Accept `targetComp` as the comp to build into
- Return an array of Layer objects created
- Never move layers between comps (Compositor handles placement)
- Respect `params.inPoint` and `params.outPoint`

### ElementJob (shared base fields)

```javascript
{
    type:       string,   // "bsod" | "dialog" | "chrome" | "text" | "cursor" | "pixel" | "freeze"
    layer:      string,   // "over" | "under"
    inFrame:    number,
    outFrame:   number,
    inPoint:    number,   // seconds
    outPoint:   number,   // seconds
    compW:      number,
    compH:      number,
    opacity:    number,
    scale:      number,   // multiplier (1.0 = 100%)
    speedMult:  number,   // multiplier (1.0 = 100%)
    entryFrames:number,
    exitFrames: number,
    stackOffset:number,
    trails:     boolean,
    trailEchoes:number,
    trailDecay: number,
    blendMode:  string    // "normal" | "add" | "screen" | "overlay" | "hardLight" | "difference"
}
```

### Builder Functions

```javascript
function buildBSOD(params, targetComp)
// params: bsodEra, variant, behavior, textBehavior, slideDir, slideSpeed,
//         stutterFrame, stutterDur, textLines, x, y

function buildDialogBox(params, targetComp)
// params: dialogVariant (A/B/C), title, body, buttons, icon, arrivalBehavior,
//         lifeBehavior, exitBehavior, driftDir, driftSpeed, shakeFrame, shakeDur,
//         stackIndex, x, y

function buildChromeFragment(params, targetComp)
// params: fragmentType, behavior, title, driftDir, driftSpeed, jumpInterval,
//         jumpRadius, stackCount, x, y

function buildTextOverlay(params, targetComp)
// params: lines, behavior, driftDir, driftSpeed, corruption, corruptType,
//         corruptRate, fontSize, x, y

function buildCursor(params, targetComp)
// params: behavior, orbitRadius, orbitSpeed, orbitDir, targetCorner, seekSpeed,
//         walkInterval, walkRadius, trailCount, trailOffset, clusterCount,
//         clusterSpread, size, x, y

function buildPixelBlock(params, targetComp)
// params: behavior (microScatter|rowSmear|blockDisplace|scanlineShift|hTear),
//         clusterSize, stripHeight, smearRows, blockW, blockH, offsetX, offsetY,
//         bandHeight, shiftPx, bandCount, tearH, tearW, tearColor, x, y

function buildFreezeStrip(job, targetComp)
// params: behavior (single|cluster), freezeFrame, stripHeight, stripY (single),
//         strips (cluster: array of {height, y}), x, y
```

---

## Section 5: Global Overlays

```javascript
function buildScanLines(comp, opts)
// opts: { enabled, opacity, spacing, jitter }

function buildNoise(comp, opts)
// opts: { enabled, opacity, scale, complexity }

function buildHeadScratch(comp, opts)
// opts: { enabled, freq, height }
```

---

## Section 6: Scheduler

The Scheduler is pure logic — no AE API calls. Fully testable in Node.js.

### Key Functions

```javascript
function calcElementCount(chaos, totalFrames)
// Formula: pow(chaos/100, 1.5) * 50 * (totalFrames/240)
// Returns 0 for chaos <= 0, minimum 1 otherwise

function distributeTimes(count, totalFrames, curve, rng)
// Curves: flat (uniform), build (right-skewed), peak (bell),
//         burst (2-3 clusters), random (weighted segments)
// Returns sorted array of integer frame numbers

function pickElementType(mix, rng)
// mix: { dialog, bsod, cursor, pixel, freeze } — weights 0–100
// Returns type string

function pickDuration(type, minFrames, maxFrames, rng)
// Respects per-type floor rules: pixel→2f, freeze→2f, others→8f

function assignLayer(type, rotoMode, rng, forceLayer)
// forceLayer: optional "over"|"under" from per-element rotoForce
// Split mode weights: bsod 80% under, dialog 50/50, cursor 90% over, pixel/freeze 50/50

function weightedPick(items, rng)
// items: [{value, weight}, ...] — generic weighted random selection

function buildJob(type, inFrame, outFrame, layer, settings, compInfo, rng)
// Core job-creation function. Picks all behaviors, positions, sub-variants.
// Handles per-element custom messages (dialog, bsod).
// Assigns blend mode via weightedPick from BLEND_WEIGHTS.
// Assigns trails via per-element override or global settings.
// Returns complete ElementJob object.

function assignDialogStacks(jobs, rng, maxDepth)
// Groups dialogs by title, assigns stackIndex for cascade effect.
// Mutates jobs in place.

function schedule(settings, compInfo)
// Master scheduler. Two modes:
//   - Auto mode (all counts=0): chaos → calcElementCount → pickElementType
//   - Exact mode (any count>0): sum per-type counts, Fisher-Yates shuffle
// Groups types by effective curve (per-element curve overrides).
// Each curve group gets independent distributeTimes() call.
// Applies per-type element controls (scale, speed, opacity, entry/exit).
// Returns Array of ElementJob objects.
```

### Schedule Flow

```
settings + compInfo
    │
    ├─ Auto mode: calcElementCount → pickElementType × N
    │  OR
    ├─ Exact mode: sum per-type counts, shuffle
    │
    ├─ Group by effective curve
    ├─ distributeTimes per group
    │
    └─ For each element:
       ├─ getElementSettings(type) → per-type controls
       ├─ pickDuration(type, min, max)
       ├─ assignLayer(type, rotoMode, rng, forceLayer)
       ├─ buildJob(type, ...) → full ElementJob
       └─ Apply scale, speed, opacity, entry/exit from per-type settings
```

---

## Section 7: Roto Detector

```javascript
function nameMatchesKeyword(name, keywords)  // case-insensitive keyword scan
function detectRotoLayers(comp, keywords, extraKeywords)  // returns Array of Layer objects
```

---

## Section 8: Compositor

```javascript
function createPreCompStructure(parentComp, seed)
// Returns: { preComp, preCompLayer, overGroup, underGroup, rotoLayers }
// In split mode: creates OVER and UNDER sub-comps
// In flat mode: single comp, overGroup/underGroup are null

function findExistingEffect(comp)
// Scans for WindowsErrorFX pre-comp layer. Returns layer or null.

function clearEffect(comp)
// Removes WindowsErrorFX pre-comp and sub-comps from project.
```

---

## Section 9: State Manager

### WEFXSettings Object (Full Shape)

```javascript
{
    seed: 1984,
    chaos: 100,
    rotoMode: "split",
    chaosCurve: "flat",
    animStyle: "xpClassic",
    virtualRes: 2,               // index into VIRTUAL_RESOLUTIONS
    elements: {
        dialog: { count, minFrames, maxFrames, scale, speed, opacityMin, opacityMax,
                  entryFrames, exitFrames, trails, rotoForce, curve, customMessages, customTitles },
        bsod:   { ... },
        cursor: { ... },
        pixel:  { ... },
        freeze: { ... }
    },
    scanlines: { enabled, opacity, spacing, jitter },
    noise:     { enabled, opacity, scale, complexity },
    headScratch: { enabled, freq, height },
    trails:    { enabled, chance, echoes, decay },
    stackDepth: 8,
    stackOffset: 10,
    customMessages: [],
    customTitles: [],
    rotoKeywords: [],
    rotoLayerNames: []
}
```

### Functions

```javascript
function defaultSettings()                    // → WEFXSettings with all defaults
function loadSettings(comp)                   // reads comp markers, calls migrateSettings(), merges
function saveSettings(comp, settings)         // writes JSON to comp marker at frame 0
function settingsFromUI(ui)                   // reads all UI controls into WEFXSettings
function applySettingsToUI(ui, settings)      // populates UI controls from WEFXSettings
```

---

## Section 10: Main Generator

```javascript
function generate(settings, forceReplace)
```

Orchestration flow:
1. Open log file
2. Validate active comp
3. Check for existing effect → prompt or auto-replace
4. Detect roto layers
5. Build compInfo: `{ duration, frameRate, width, height, totalFrames }`
6. Schedule all elements (`schedule()` + `assignDialogStacks()`)
7. `app.beginUndoGroup("Windows Error FX — Generate")`
8. Create pre-comp structure
9. Loop over jobs → dispatch to builder by type → build in target comp
10. Add global overlays (scanlines, noise, head scratch)
11. Save settings to comp markers
12. `app.endUndoGroup()`
13. Close log file

---

## Section 11: UI

The UI section is an IIFE guarded by `typeof Panel === "undefined"` check. Contains:
- `buildPanel(thisObj)` — creates the ScriptUI panel
- All `ui` control references assembled into a single `ui` object
- Event handlers that call into Sections 9 and 10
- Tabbed panel with 5 element tabs (Dialog, BSOD, Cursor, Pixel, Freeze)
- Overlay/trails/custom messages sections
- Checkbox-reveals-controls pattern using IIFE closures for ES3 for-loop variable capture

---

## Call Graph Summary

```
[User clicks Generate]
        │
        ▼
  generate(settings, forceReplace)
    ├── wlogOpen()
    ├── app.project.activeItem
    ├── findExistingEffect(comp)
    ├── clearEffect(comp)                   — if replacing
    ├── detectRotoLayers(comp, ...)
    ├── schedule(settings, compInfo)
    │     ├── createRNG(seed)
    │     ├── getElementSettings() × N
    │     ├── calcElementCount()            — auto mode
    │     ├── pickElementType() × N         — auto mode
    │     ├── distributeTimes() × curve groups
    │     ├── pickDuration() × N
    │     ├── assignLayer() × N
    │     └── buildJob() × N
    │           ├── weightedPick()
    │           ├── pickErrorMessage() / pickWindowTitle()
    │           ├── pickBSODLines() / pickCorruptLines()
    │           └── getElementSettings() for trails/messages
    ├── assignDialogStacks(jobs, rng, stackDepth)
    ├── createPreCompStructure(comp, seed)
    ├── [loop over jobs]
    │     └── buildBSOD / buildDialogBox / buildChromeFragment /
    │         buildTextOverlay / buildCursor / buildPixelBlock /
    │         buildFreezeStrip
    │               └── addRect / setLinearKey / setHoldKey / setLayerTime
    │                   buildIconError/Warning/Question/Info
    ├── buildScanLines(preComp, opts)
    ├── buildNoise(preComp, opts)
    ├── buildHeadScratch(preComp, opts)
    ├── saveSettings(comp, settings)
    └── wlogClose()
```

---

## Data Flow

```
User Input (UI)
      │
      ▼
settingsFromUI(ui) → WEFXSettings object
      │
      ├──► saveSettings() → Comp Markers (persisted as JSON)
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
Layers in pre-comp structure (OVER/UNDER groups)
      │
      ▼
Finished effect in user's comp
```

The hard separation between the **Scheduler** (pure calculation, no AE API) and the **Builders** (AE API only) means the scheduling logic can be tested in Node.js independently of After Effects. All 1298+ scheduler/utility tests run in Node.js via `tests/run_tests.js`.

---

*Document version 0.3 — updated to match implementation*
