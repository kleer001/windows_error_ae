# Windows Error FX — User Configuration Specification
### After Effects Plugin ScriptUI Panel Reference v0.3

---

## Design Philosophy

The panel is a **single dockable ScriptUI panel** in After Effects. It follows three principles:

1. **Minimal input, maximum output.** A seed and chaos level produce a great result in under 30 seconds.
2. **Transparent but not overwhelming.** Advanced controls are grouped below the fold — ignore them entirely or dial in every detail.
3. **Deterministic.** Same settings + same seed = identical output. Changing the seed is the fastest creative iteration tool.

---

## Panel Layout

```
┌──────────────────────────────────────┐
│  WINDOWS ERROR FX                    │  ← Panel title bar
├──────────────────────────────────────┤
│                                      │
│  SEED  [ 4 8 2 7 ]  [Randomize]     │  ← Seed + randomize all settings
│                                      │
│  CHAOS  [ 70 ]                       │  ← Chaos level (integer)
│                                      │
│  RESOLUTION  [ 1024 x 768 ▾ ]       │  ← Virtual resolution dropdown
│                                      │
│  ROTO LAYERS  (auto-detected: 2)     │  ← Roto status
│                                      │
│  [ GENERATE ]                        │  ← Primary action
│                                      │
├── ELEMENT TABS ─────────────────────┤
│  [Dialog] [BSOD] [Cursor] [Pixel]   │
│  [Freeze]                            │
│  ┌────────────────────────────────┐  │
│  │ Count [0]  Min f [8]  Max f [96]│ │
│  │ Scale% [100]  Speed% [100]     │  │
│  │ OpacMin [50]  OpacMax [100]    │  │
│  │ Entry f [3]  Exit f [2]       │  │
│  │                                │  │
│  │ ☐ Override Trails              │  │
│  │   Chance [20] Echoes [4]       │  │
│  │   Decay [50]                   │  │
│  │ ☐ Override Roto  [Over ▾]     │  │
│  │ ☐ Override Curve [Flat ▾]     │  │
│  │ ☐ Override Messages [Edit...]  │  │ ← Dialog/BSOD only
│  └────────────────────────────────┘  │
│                                      │
├── GLOBAL CONTROLS ──────────────────┤
│  Animation Style  [ XP Classic ▾ ]   │
│  Roto Mode        [ Split ▾ ]        │
│  Chaos Curve      [ Flat ▾ ]         │
│  Stack Depth [8]  Stack Offset [10]  │
│                                      │
├── OVERLAYS ─────────────────────────┤
│  ☑ Scanlines  Opacity [20] Spacing [4] ☐ Jitter │
│  ☑ Noise      Opacity [8]  Scale [100] Complex [5] │
│  ☐ Head Scratch  Freq [20]  Height [2] │
│                                      │
├── TRAILS ───────────────────────────┤
│  ☑ Enabled  Chance [20]  Echoes [4] │
│  Decay [50]                          │
│                                      │
├── CUSTOM MESSAGES ──────────────────┤
│  [ Edit Messages... ]                │
│                                      │
│  [ REGENERATE ]  [ CLEAR ALL ]       │
└──────────────────────────────────────┘
```

---

## Section 1 — Core Controls (Always Visible)

### Seed
- **Type:** Integer input field
- **Default:** `1984`
- **Randomize button:** Generates a new random seed AND randomizes ALL settings (per-element counts, chaos, curve, style, overlays, trails). This is a full "surprise me" button, not just a seed change.
- **Behavior:** All randomness derives from this seed via deterministic PRNG.

### Chaos
- **Type:** Integer field
- **Range:** 0–100+ (supports values above 100 for extreme density)
- **Default:** `100`
- **What it controls:** Total element count in auto mode (when all per-element counts are 0). Formula: `pow(chaos/100, 1.5) × 50 × (totalFrames/240)`

### Virtual Resolution
- **Type:** Dropdown
- **Options:** 640×480, 800×600, 1024×768 (default), 1280×1024, Native
- **What it controls:** Scale factor applied to all element geometry. `compWidth / virtualResWidth`

### Roto Layers
- **Type:** Auto-detected status display
- **Behavior:** Scans active comp for layer names containing: `roto`, `rotoscope`, `matte`, `cutout`, `subject`, `fg` (case-insensitive)
- **If none detected:** Runs in Flat mode automatically.

### GENERATE Button
- Primary action. Reads all settings and builds the pre-comp.
- If a previous `WindowsErrorFX` pre-comp exists, prompts for replacement.

---

## Section 2 — Per-Element Tabs

Five tabs in a `tabbedpanel` — one per element type: **Dialog**, **BSOD**, **Cursor**, **Pixel**, **Freeze**.

Each tab contains identical control layouts:

### Core Controls (all tabs)

| Control | Type | Default | Description |
|---------|------|---------|-------------|
| Count | Integer | 0 | Exact number to generate (0 = auto from chaos) |
| Min Frames | Integer | 8 | Minimum element lifespan |
| Max Frames | Integer | 96 | Maximum element lifespan |
| Scale % | Integer | 100 | Size multiplier |
| Speed % | Integer | 100 | Animation speed multiplier |
| Opacity Min | Integer | 50 | Minimum opacity (0–100) |
| Opacity Max | Integer | 100 | Maximum opacity (0–100) |
| Entry Frames | Integer | 3 | Arrival animation duration |
| Exit Frames | Integer | 2 | Exit animation duration |

### Per-Element Overrides (checkbox-reveals-controls pattern)

Each override is a checkbox. When checked, its controls become visible. When unchecked, the element inherits the global setting. Uses IIFE closures for ES3 for-loop variable capture.

| Override | Controls | Available On |
|----------|----------|-------------|
| **Trails** | Chance %, Echoes count, Decay % | All tabs |
| **Roto** | Dropdown: Over / Under | All tabs |
| **Curve** | Dropdown: Flat / Build / Peak / Burst / Random | All tabs |
| **Messages** | Edit button → floating dialog | Dialog, BSOD only |

**Custom Messages per tab:**
- Dialog tab: messages + titles fields
- BSOD tab: messages only
- Cursor, Pixel, Freeze tabs: no messages row

### Count Behavior
When **all** per-element counts are 0, the scheduler uses auto mode: chaos determines total count, and types are distributed by weighted probability (dialog:75, bsod:50, cursor:50, pixel:25, freeze:15).

When **any** count is > 0, the scheduler uses exact counts mode: generates exactly the specified number of each type, shuffled for temporal distribution.

---

## Section 3 — Global Controls

### Animation Style
**Type:** Dropdown

| Option | Effect |
|---|---|
| **XP Classic** | Default. Standard behavior weights. |
| **Glitch Heavy** | More stutter/shake, higher corruption rate. |
| **Slow Burn** | Longer lifespans (min 16f), more static holds. |
| **Chaos Maximum** | Short lifespans (max 36f), maximum density. |

### Roto Mode
**Type:** Dropdown

| Option | Description |
|---|---|
| **Split** | Default. Elements distributed between OVER and UNDER per interaction matrix. |
| **All Over** | All elements composite on top. |
| **All Under** | All elements go behind roto subject. |
| **Flat** | Roto ignored entirely. Single layer, no depth. |

### Chaos Curve
**Type:** Dropdown. Controls density distribution across timeline.

| Option | Description |
|---|---|
| **Flat** | Uniform density. Default. |
| **Build** | Sparse → dense. |
| **Peak** | Bell curve — dense in middle. |
| **Burst** | 2–3 concentrated clusters with gaps. |
| **Random** | Seeded random segments with varying density. |

### Dialog Stack Controls
- **Stack Depth:** Max cascade copies (default 8)
- **Stack Offset:** Diagonal offset in px per cascade step (default 10)

---

## Section 4 — Overlay Controls

### Scanlines
- **Enabled:** Checkbox (default on)
- **Opacity:** 0–100 (default 20)
- **Spacing:** Pixels between lines (default 4)
- **Jitter:** Checkbox — enables occasional 1px vertical shift

### Noise
- **Enabled:** Checkbox (default on)
- **Opacity:** 0–100 (default 8)
- **Scale:** Fractal noise scale (default 100)
- **Complexity:** Fractal noise detail 1–20 (default 5)

### Head Scratch
- **Enabled:** Checkbox (default off)
- **Frequency:** Frames between scratches (default 20)
- **Height:** Pixels tall (default 2)

---

## Section 5 — Trails (Global)

- **Enabled:** Checkbox (default on)
- **Chance:** Percent probability per element (default 20)
- **Echoes:** Number of echo copies (default 4)
- **Decay:** Percent opacity reduction per echo (default 50)

Per-element trail overrides (in element tabs) take priority over these global settings.

---

## Section 6 — Custom Messages & Actions

### Custom Messages
**Type:** Button → opens a separate floating dialog with text areas for message and title pools. Custom messages are stored globally and can be overridden per-element.

### REGENERATE Button
Re-runs generation with current settings. Skips the "replace?" prompt.

### CLEAR ALL Button
Removes the `WindowsErrorFX` pre-comp and its contents from the active comp. Prompts for confirmation.

---

## Constants (Power User Editable)

These values are defined at the top of the `.jsx` file, documented inline for power users:

```javascript
// ── Visual ──────────────────────────────────────────────
var C_BSOD_BG         = [0, 0, 0.667];       // #0000AA
var C_DIALOG_BG       = [0.831, 0.816, 0.784]; // #D4D0C8
var C_DIALOG_TITLE_BG = [0, 0, 0.502];        // #000080
var C_PIXEL_COLORS    = [...];                 // 7 colors: black, white, BSOD blue, magenta, cyan, red, green

// ── Fonts ───────────────────────────────────────────────
var FONT_MONO = "Courier New";
var FONT_UI   = "Arial";
var FONT_BSOD = "Lucida Console";

// ── Timing ──────────────────────────────────────────────
var FLOOR_FRAMES      = 8;
var FLOOR_PIXEL_BLOCK = 2;
var FLOOR_FREEZE_STRIP = 2;
var MAX_FRAMES        = 96;

// ── Dialog geometry ─────────────────────────────────────
var DIALOG_WIDTH  = 280;
var DIALOG_HEIGHT = 140;
var STACK_OFFSET_X = 10;
var MAX_STACK_DEPTH = 8;

// ── Freeze strip ────────────────────────────────────────
var C_FREEZE_MIN_HEIGHT  = 1;
var C_FREEZE_MAX_HEIGHT  = 64;
var C_FREEZE_CLUSTER_MIN = 2;
var C_FREEZE_CLUSTER_MAX = 5;
var C_FREEZE_CLUSTER_BAND = 200;

// ── Element defaults ────────────────────────────────────
var DEFAULT_ELEMENT_SCALE = 100;
var DEFAULT_SPEED_MULT    = 100;
var DEFAULT_OPACITY_MIN   = 50;
var DEFAULT_OPACITY_MAX   = 100;
var DEFAULT_ENTRY_FRAMES  = 3;
var DEFAULT_EXIT_FRAMES   = 2;

// ── Overlay defaults ────────────────────────────────────
var DEFAULT_SCANLINE_OPACITY = 20;
var DEFAULT_NOISE_OPACITY    = 8;
var DEFAULT_TRAILS_CHANCE    = 20;
var DEFAULT_TRAILS_ECHOES    = 4;
var DEFAULT_TRAILS_DECAY     = 50;
```

---

## Stored State & Persistence

| Data | Where Stored | Persists? |
|---|---|---|
| All settings (seed, chaos, elements, overlays, trails, custom messages) | Comp marker at frame 0, JSON with `_type: "WEFX_SETTINGS"` | Yes, with project |
| Generated layers | Pre-comp `WindowsErrorFX_[seed]` | Yes, until Cleared |

Settings are stored as a single JSON blob in a comp marker comment. When the panel opens on a comp with an existing marker, all controls are restored automatically.

Old-format settings (flat fields like `counts`, `minFrames`, `elementScale`) are auto-migrated to the new per-element format via `migrateSettings()`.

---

## Error States & Warnings

| Situation | Panel Response |
|---|---|
| No active comp | `Please open a composition first.` |
| No roto layers detected | Runs in Flat mode automatically |
| All element counts at 0 and chaos at 0 | Generates nothing (count formula returns 0) |
| Pre-comp generation fails | Error logged to `WindowsErrorFX.log` in Documents folder |

---

*Document version 0.3 — updated to match implementation*
