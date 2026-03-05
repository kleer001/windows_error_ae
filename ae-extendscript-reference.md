# AE ExtendScript Reference
### docs/ae-extendscript-reference.md

A working reference for writing After Effects ScriptUI panels in ExtendScript. This document covers the patterns, pitfalls, and API specifics relevant to the Windows Error FX plugin. Read this before writing any code.

---

## The Language: ExtendScript

ExtendScript is Adobe's JavaScript dialect. It is **ES3** — the 1999 standard. This is non-negotiable regardless of your AE version.

### What You Cannot Use

```javascript
// ✗ NO — ES5/6+ features
const x = 1;
let y = 2;
const fn = () => {};
`template ${literal}`;
[1,2,3].forEach(fn);
[1,2,3].map(fn);
[1,2,3].filter(fn);
Object.keys(obj);
Object.assign({}, a, b);
const {a, b} = obj;          // destructuring
const arr = [...other];      // spread
class Foo {}                 // classes
import / export              // modules
Promise                      // async
```

### What You Must Use Instead

```javascript
// ✓ YES — ES3 equivalents
var x = 1;
var y = 2;
function fn(arg) { return arg; }
"template " + variable;

// Instead of forEach:
for (var i = 0; i < arr.length; i++) { fn(arr[i]); }

// Instead of map (builds new array):
var result = [];
for (var i = 0; i < arr.length; i++) { result.push(transform(arr[i])); }

// Instead of Object.keys:
for (var key in obj) {
    if (obj.hasOwnProperty(key)) { /* use key */ }
}

// Instead of Object.assign:
function merge(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) target[key] = source[key];
    }
    return target;
}
```

### What Does Work (ES3 + Adobe extras)

```javascript
// Standard ES3
var, function, if/else, for, while, do/while, switch
try/catch/finally
typeof, instanceof, in, delete
Array, Object, String, Number, Boolean, RegExp, Date, Math
JSON.stringify / JSON.parse  // YES — Adobe added this

// Adobe-specific globals
$                            // ExtendScript host object
$.os                         // "Windows" or "Macintosh"
$.fileName                   // path to current script
$.sleep(ms)                  // blocking sleep — avoid in UI
alert(msg)                   // modal alert
confirm(msg)                 // modal yes/no → boolean
prompt(msg, default)         // modal text input → string
```

---

## Seeded Random Number Generator (PRNG)

The AE API's `Math.random()` is not seedable. Implement mulberry32 — it's short, fast, and ES3-compatible:

```javascript
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

// Math.imul polyfill for ES3:
if (!Math.imul) {
    Math.imul = function(a, b) {
        var ah = (a >>> 16) & 0xFFFF, al = a & 0xFFFF;
        var bh = (b >>> 16) & 0xFFFF, bl = b & 0xFFFF;
        return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
    };
}

// Usage:
var rng = createRNG(4827);
var val = rng();  // 0.0–1.0, deterministic
```

Helper functions to build on top of the RNG:

```javascript
function rngInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

function rngBool(rng, probability) {
    // probability: 0.0–1.0, chance of returning true
    return rng() < probability;
}
```

---

## The AE Object Model (Relevant Subset)

```
app
└── project                          (Project)
    ├── activeItem                   (CompItem | FootageItem | FolderItem | null)
    └── items                        (ItemCollection)
        └── [i]                      (CompItem | FootageItem | FolderItem)

CompItem
├── .name
├── .duration                        (seconds, float)
├── .frameRate                       (fps, float)
├── .width / .height                 (pixels, int)
├── .numLayers                       (int)
├── .layers                          (LayerCollection)
│   └── [i]                          (Layer — 1-indexed!)
│       ├── .name
│       ├── .inPoint / .outPoint     (seconds)
│       ├── .startTime               (seconds)
│       └── .property(name)          (Property | PropertyGroup)
└── .marker                          (MarkerValueCollection)

Layer types:
    AVLayer       — footage, solids, pre-comps
    TextLayer     — text
    ShapeLayer    — shapes
    NullLayer     — null objects
    LightLayer    — lights
    CameraLayer   — cameras
```

### Key Conversions

```javascript
// Frames to seconds (always needed)
var timeInSeconds = frameNumber / comp.frameRate;

// Seconds to frames
var frameNumber = Math.round(timeInSeconds * comp.frameRate);

// Current time
var now = comp.time; // seconds
```

---

## Creating Layers

### Solid Layer

```javascript
var solid = comp.layers.addSolid(
    [r, g, b],          // color, normalized 0–1
    "Layer Name",       // name
    comp.width,         // width px
    comp.height,        // height px
    1.0                 // pixel aspect ratio
);
solid.inPoint  = startSeconds;
solid.outPoint = endSeconds;
```

### Shape Layer

```javascript
var shapeLayer = comp.layers.addShape();
shapeLayer.name = "My Shape";
shapeLayer.inPoint  = startSeconds;
shapeLayer.outPoint = endSeconds;

// Access the root contents group
var contents = shapeLayer.property("Contents");

// Add a rectangle group
var rectGroup = contents.addProperty("ADBE Vector Group");
rectGroup.name = "Rect Group";
var rectContents = rectGroup.property("Contents");

// Add the actual rectangle shape
var rect = rectContents.addProperty("ADBE Vector Shape - Rect");
rect.property("Size").setValue([width, height]);
rect.property("Position").setValue([x, y]);
// Note: position is center of rect

// Add a fill
var fill = rectContents.addProperty("ADBE Vector Graphic - Fill");
fill.property("Color").setValue([r, g, b]);
fill.property("Opacity").setValue(100); // 0–100

// Add a stroke
var stroke = rectContents.addProperty("ADBE Vector Graphic - Stroke");
stroke.property("Color").setValue([r, g, b]);
stroke.property("Stroke Width").setValue(2);
stroke.property("Opacity").setValue(100);
```

### Text Layer

```javascript
var textLayer = comp.layers.addText("Hello World");
textLayer.name = "My Text";
textLayer.inPoint  = startSeconds;
textLayer.outPoint = endSeconds;

// Get the text document
var textProp = textLayer.property("Source Text");
var textDoc  = textProp.value;

textDoc.text      = "Hello World";
textDoc.font      = "CourierNewPSMT";  // Must use PostScript name, not display name
textDoc.fontSize  = 14;
textDoc.fillColor = [1, 1, 1];  // white
textDoc.applyFill = true;
textDoc.applyStroke = false;
textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;

// Write it back
textProp.setValue(textDoc);

// Position the layer
textLayer.property("Position").setValue([x, y]);
```

### Pre-Comp (Nest layers)

```javascript
// Select layers to pre-comp (must be an array of Layer objects)
var layersToNest = [layer1, layer2, layer3];

// comp.layers.precompose(layerIndices, name, moveAllAttributes)
// layerIndices is an array of 1-based integers
var indices = [];
for (var i = 0; i < layersToNest.length; i++) {
    indices.push(layersToNest[i].index);
}
var preCompLayer = comp.layers.precompose(indices, "My PreComp", true);
```

Or create a new empty comp and add it:

```javascript
var preComp = app.project.items.addComp(
    "WindowsErrorFX_" + seed,  // name
    comp.width,                 // width
    comp.height,                // height
    1.0,                        // pixel aspect
    comp.duration,              // duration seconds
    comp.frameRate              // fps
);
// Add preComp as a layer in parent comp:
var preCompLayer = comp.layers.add(preComp);
```

---

## Keyframes

```javascript
// Set a keyframe on a property
var prop = layer.property("Position");
prop.setValueAtTime(timeInSeconds, [x, y]);

// Multiple keyframes
prop.setValueAtTime(0,   [100, 200]);
prop.setValueAtTime(0.5, [300, 200]);
prop.setValueAtTime(1.0, [500, 200]);

// Set keyframe interpolation (linear = no easing)
// KeyframeInterpolationType: LINEAR, BEZIER, HOLD
var keyIndex = 1; // 1-based
prop.setInterpolationTypeAtKey(
    keyIndex,
    KeyframeInterpolationType.LINEAR,
    KeyframeInterpolationType.LINEAR
);

// Hold keyframe (instant cut — used for glitch jumps)
prop.setInterpolationTypeAtKey(
    keyIndex,
    KeyframeInterpolationType.HOLD,
    KeyframeInterpolationType.HOLD
);
```

---

## Layer Properties Reference (Common)

```javascript
layer.property("Position")          // [x, y] or [x, y, z]
layer.property("Scale")             // [sx, sy] — percentage, e.g. [100, 100]
layer.property("Rotation")          // degrees, float
layer.property("Opacity")           // 0–100
layer.property("Anchor Point")      // [x, y]

// Transform group shorthand
var xform = layer.property("Transform");
xform.property("Position").setValue([x, y]);
xform.property("Opacity").setValue(75);

// Blending mode
layer.blendingMode = BlendingMode.SCREEN;
layer.blendingMode = BlendingMode.ADD;
layer.blendingMode = BlendingMode.MULTIPLY;
layer.blendingMode = BlendingMode.NORMAL;

// Layer ordering (1 = top of stack)
layer.moveToBeginning();   // top
layer.moveToEnd();         // bottom
layer.moveBefore(other);   // just above 'other'
layer.moveAfter(other);    // just below 'other'
```

---

## Comp Markers (Stored State)

```javascript
// Write a marker with metadata
var markerValue = new MarkerValue("WEFX_SEED");
markerValue.comment = JSON.stringify({ seed: 4827, chaos: 70 });
comp.marker.setValueAtTime(0, markerValue);

// Read markers back
for (var i = 1; i <= comp.marker.numKeys; i++) {
    var mv = comp.marker.keyValue(i);
    if (mv.label === "WEFX_SEED" || mv.comment.indexOf("WEFX_SEED") !== -1) {
        // Note: MarkerValue doesn't have a .label property in all versions
        // Store identifying info in .comment as JSON instead
        var data = JSON.parse(mv.comment);
    }
}
```

**Safer pattern** — embed a type key in the JSON:

```javascript
// Write
var mv = new MarkerValue("");
mv.comment = JSON.stringify({ _type: "WEFX_SEED", seed: 4827 });
comp.marker.setValueAtTime(0, mv);

// Read
for (var i = 1; i <= comp.marker.numKeys; i++) {
    try {
        var data = JSON.parse(comp.marker.keyValue(i).comment);
        if (data._type === "WEFX_SEED") {
            // found it
        }
    } catch(e) { /* not our marker, skip */ }
}
```

---

## ScriptUI Panel Structure

```javascript
// The entry point — handles both docked panel and floating window
(function buildPanel(thisObj) {

    var panel = (thisObj instanceof Panel)
        ? thisObj                                       // docked
        : new Window("palette", "Windows Error FX");   // floating

    // ── Layout ──────────────────────────────────────
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.margins = 10;
    panel.spacing = 8;

    // ── Seed row ─────────────────────────────────────
    var seedRow = panel.add("group");
    seedRow.orientation = "row";
    seedRow.add("statictext", undefined, "SEED");
    var seedField = seedRow.add("edittext", undefined, "1984");
    seedField.preferredSize.width = 60;
    var randBtn = seedRow.add("button", undefined, "⟳");
    randBtn.preferredSize.width = 30;

    // ── Chaos slider ─────────────────────────────────
    var chaosRow = panel.add("group");
    chaosRow.orientation = "row";
    chaosRow.add("statictext", undefined, "CHAOS");
    var chaosSlider = chaosRow.add("slider", undefined, 50, 0, 100);
    chaosSlider.preferredSize.width = 120;
    var chaosLabel = chaosRow.add("statictext", undefined, "50%");
    chaosLabel.preferredSize.width = 35;

    // ── Generate button ───────────────────────────────
    var genBtn = panel.add("button", undefined, "GENERATE");

    // ── Events ───────────────────────────────────────
    randBtn.onClick = function() {
        seedField.text = String(Math.floor(Math.random() * 99999) + 1000);
    };

    chaosSlider.onChanging = function() {
        chaosLabel.text = Math.round(chaosSlider.value) + "%";
    };

    genBtn.onClick = function() {
        var seed  = parseInt(seedField.text, 10) || 1984;
        var chaos = Math.round(chaosSlider.value);
        generateEffect(seed, chaos);
    };

    // ── Show ─────────────────────────────────────────
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    } else {
        panel.layout.layout(true);
    }

}(this));
```

---

## Undo Groups

**Always wrap comp modifications.** Without this, the user gets one undo step per AE API call — potentially hundreds.

```javascript
app.beginUndoGroup("Windows Error FX — Generate");
try {
    // ... all your layer creation code ...
} catch(e) {
    alert("Windows Error FX error: " + e.toString());
} finally {
    app.endUndoGroup();
}
```

---

## Scripting Permissions

The user must have **Allow Scripts to Write Files and Access Network** enabled in AE Preferences → Scripting & Expressions. For comp modifications (which don't write files), this isn't strictly required, but comp marker writes may need it in some versions. Always document this requirement.

Check at runtime:

```javascript
if (!app.preferences.getPrefAsBool("Main Pref Section v2", "Pref_SCRIPTING_FILE_NETWORK_SECURITY")) {
    alert("Please enable 'Allow Scripts to Write Files and Access Network'\nin AE Preferences > Scripting & Expressions, then re-run.");
    return;
}
```

---

## Common Pitfalls

**1. Layer index shifts after deletion**
When you delete a layer, all indices above it shift down by 1. Never cache layer indices across deletions. Cache the layer *object* reference instead.

**2. `comp.activeItem` vs `app.project.activeItem`**
Use `app.project.activeItem`. The `comp` prefix form doesn't exist. Always null-check:
```javascript
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    alert("Please open a composition first.");
    return;
}
```

**3. Time precision**
AE stores time internally as an integer number of sub-frames. Setting a keyframe at a calculated `seconds` value can land on a sub-frame boundary and drift over long comps. Snap to frame:
```javascript
function snapToFrame(seconds, fps) {
    return Math.round(seconds * fps) / fps;
}
```

**4. Shape layer property paths**
Property names in shape layers use internal ADBE codes, not display names. Use the codes:
```
"ADBE Vector Group"           — group
"ADBE Vector Shape - Rect"    — rectangle
"ADBE Vector Shape - Ellipse" — ellipse
"ADBE Vector Shape - Star"    — polygon/star
"ADBE Vector Graphic - Fill"  — fill
"ADBE Vector Graphic - Stroke"— stroke
"ADBE Vector Transform Group" — transform within shape group
```

**5. Text layer position is anchor-point relative**
A text layer's Position refers to its anchor point, which defaults to the bottom-left of the first line of text. If you want top-left positioning, set anchor point to [0, -fontSize] approximately.

**6. `undefined` vs `null`**
ExtendScript uses `undefined` inconsistently. Defensive pattern:
```javascript
if (thing == null) { ... }  // catches both null AND undefined
```

**7. No console.log**
Use `$.writeln(msg)` for debug output to the ExtendScript Toolkit console, or `alert(msg)` for blocking alerts. Neither works well in production — use alert sparingly, remove before release.

---

## File Paths (If Ever Needed)

```javascript
// Cross-platform path separator
var sep = ($.os.indexOf("Windows") !== -1) ? "\\" : "/";

// Script's own location
var scriptDir = File($.fileName).parent.fsName;

// User's desktop
var desktop = Folder.desktop.fsName;
```

---

## Performance Notes

- Creating many keyframes is slow. For elements with more than ~20 keyframes, consider using expressions instead
- `comp.layers.precompose()` is slow on large layer counts
- All layer creation should happen inside a single `beginUndoGroup` block, not just for UX but for performance (AE batches the operations)
- Avoid reading `comp.numLayers` inside a loop — cache it: `var n = comp.numLayers; for (var i = 1; i <= n; i++)`

---

*This document covers the subset of the AE/ExtendScript API used by Windows Error FX. For the full API reference, see Adobe's ExtendScript Toolkit documentation and the After Effects Scripting Guide (PDF, available from Adobe).*
