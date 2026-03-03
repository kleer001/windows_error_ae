# Windows Error FX — User Configuration Specification
### After Effects Plugin ScriptUI Panel Reference v0.1

---

## Design Philosophy

The panel is a **single dockable ScriptUI panel** in After Effects. It follows three principles:

1. **Minimal input, maximum output.** The user should be able to get a great result in under 30 seconds with only a seed and a chaos level.
2. **Transparent but not overwhelming.** Advanced controls are present but grouped below the fold — the user can ignore them entirely.
3. **Deterministic.** Same settings + same seed = identical output. Changing the seed is the fastest creative iteration tool.

---

## Panel Layout

```
┌──────────────────────────────────────┐
│  💀  WINDOWS ERROR FX                │  ← Panel title bar
├──────────────────────────────────────┤
│                                      │
│  SEED  [ 4 8 2 7 ]  [Randomize]      │  ← Seed row
│                                      │
│  CHAOS  ████████░░░░  70%            │  ← Chaos slider
│                                      │
│  ROTO LAYERS  (auto-detected: 2)     │  ← Roto status
│  ☑ treat_roto [layer name]           │
│  ☑ treat_roto [layer name]           │
│                                      │
│  [ GENERATE ]                        │  ← Primary action
│                                      │
├── ADVANCED ──────────────────────────┤  ← Collapsible section
│  Element Mix      Animation Mix      │
│  Dialog   [███░] 75%  Style [XP ▾]  │
│  BSOD     [██░░] 50%  Min  [8f  ]   │
│  Text     [███░] 75%  Max  [96f ]   │
│  Cursors  [██░░] 50%                 │
│  Blocks   [█░░░] 25%                 │
│                                      │
│  Roto Mode  [ Split ▾ ]             │
│  Chaos Curve [ Build ▾ ]            │
│                                      │
│  Custom Messages  [ Edit... ]        │
│                                      │
│  [ REGENERATE ]  [ CLEAR ALL ]       │
└──────────────────────────────────────┘
```

---

## Section 1 — Core Controls (Always Visible)

### Seed
- **Type:** Integer input field (4–8 digit number)
- **Default:** `1984`
- **Randomize button:** Generates a new random seed and populates the field. Does not regenerate the effect — the user must press Generate.
- **Behavior:** All randomness in the script derives from this seed. Changing by 1 produces a completely different layout. This is the primary creative iteration tool.
- **Display:** Shows current seed. If the comp already has a generated effect from a different seed, the field shows that previous seed (read from a comp marker comment).

---

### Chaos
- **Type:** Horizontal slider + numeric readout
- **Range:** 0–100 (integer)
- **Default:** 50
- **Display:** Shows percentage. Slider has 5 labeled stops: Calm · Glitching · Crashing · Meltdown · Failure
- **What it controls:**
  - Total number of elements spawned across the comp duration
  - Maximum simultaneous on-screen elements at peak density
  - Dialog cascade depth
  - Pixel corruption block frequency
  - Head scratch frequency
  - Whether extreme behaviors (full-screen BSOD, cursor clusters) are enabled

| Chaos % | Max Simultaneous Elements | Dialog Cascade Depth |
|---|---|---|
| 0–20 | 2 | 1 |
| 21–40 | 4 | 2 |
| 41–60 | 6 | 4 |
| 61–80 | 10 | 6 |
| 81–100 | 16+ | 8 |

---

### Roto Layers
- **Type:** Auto-detected checklist
- **Behavior:** On panel open, the script scans the active comp for layers whose names contain: `roto`, `rotoscope`, `matte`, `cutout`, `subject`, `fg` (case-insensitive)
- **Display:** Shows count of detected layers. Lists each with a checkbox. User can deselect any layer to exclude it from roto logic.
- **If none detected:** Shows `No roto layers found — all elements will be composited flat` with a note that the user can rename layers and re-open the panel.
- **Manual override:** User can type a custom layer name keyword to add to the detection list (single text field below the checklist).

---

### GENERATE Button
- Primary action. Reads all current settings and builds the pre-comp in the active comp.
- If a previous `WindowsErrorFX` pre-comp exists in this comp, prompts: `Replace existing effect? [Yes] [Cancel]`
- After generation, shows a brief status: `Generated 14 elements across 240 frames.`

---

## Section 2 — Advanced Controls (Collapsible)

Collapsed by default. Expanded state persists within the session.

---

### Element Mix

Five sliders — one per major element type. Each controls the **relative probability** that the chaos budget will spawn that type of element. They are not absolute counts; they weight the random selection.

| Element | Slider Range | Default |
|---|---|---|
| Dialog Boxes | 0–100% | 75% |
| BSOD Panels | 0–100% | 50% |
| Text Overlays | 0–100% | 75% |
| Cursors | 0–100% | 50% |
| Pixel Blocks | 0–100% | 25% |

Setting a slider to 0% completely disables that element type. Setting to 100% makes it the dominant type.

---

### Animation Mix — Style

**Type:** Dropdown  
**Options:**

| Option | Description |
|---|---|
| **XP Classic** | Default. Snappy cuts, linear slides, instant pops. No easing. |
| **Glitch Heavy** | More position jumps, more stutter, higher character corruption rate. |
| **Slow Burn** | Longer lifespans, more static holds, fewer fast events. Creeping dread. |
| **Chaos Maximum** | Shortest lifespans, maximum spawn rate, everything at once. |

These are multiplier presets applied on top of the per-element defaults. They do not override Min/Max frame settings.

---

### Animation Mix — Min/Max Frame Duration

- **Min Life:** Integer field, minimum `2` (pixel blocks) or `8` (all others). Default `8`.
- **Max Life:** Integer field, maximum `96`. Default `96`.
- These set the **global** floor and ceiling for element lifespan. Individual element types still respect their own defaults within this range.

---

### Roto Mode

**Type:** Dropdown  
**Options:**

| Option | Description |
|---|---|
| **Split** | Default. Elements are split between OVER and UNDER roto layers according to the interaction matrix. |
| **All Over** | All elements composite on top of everything, roto ignored. |
| **All Under** | All elements go behind roto subject. Subject is always clean. |
| **Flat** | Roto layers are ignored entirely. Effect is single-layer, no depth. |

---

### Chaos Curve

Controls the **density distribution** of elements across the comp timeline.

**Type:** Dropdown  
**Options:**

| Option | Description |
|---|---|
| **Flat** | Default. Uniform density throughout. Elements are evenly distributed. |
| **Build** | Starts sparse, ramps up to peak density at the end. |
| **Peak** | Sparse at start and end, maximum density in the middle. |
| **Burst** | Two or three concentrated bursts of high density with quiet gaps. |
| **Random** | No pattern. Seeded random distribution. Each region has different density. |

---

### Custom Messages

**Type:** Button → Opens a separate floating dialog  

The Custom Messages dialog contains:

- A scrollable text area showing the current message pool (title bar strings + body text strings separated)
- **[Add Line]** — appends a user-typed line to the body text pool
- **[Add Title]** — appends a user-typed string to the title bar pool
- **[Reset to Defaults]** — restores the built-in pool, removes all custom additions
- **[Clear All & Use Custom Only]** — empties the built-in pool, leaving only user entries

Custom messages are stored as a JSON string in a comp marker on frame 0, so they persist with the project file. Re-opening the panel restores them automatically.

---

### REGENERATE Button
Re-runs generation with current settings. Equivalent to pressing Generate after a settings change. Skips the "replace?" prompt.

### CLEAR ALL Button
Removes the `WindowsErrorFX` pre-comp and its contents from the active comp. Prompts: `Remove all Windows Error FX elements? [Yes] [Cancel]`

---

## Section 3 — Implicit / Non-UI Configuration

These values are not exposed in the panel UI but are defined as editable constants at the top of the `.jsx` file, documented for power users who want to open the script and tweak:

```javascript
// ─── ADVANCED CONSTANTS (edit these if you know what you're doing) ───────────

var FONT_MONOSPACE   = "Courier New";    // swap to "Fixedsys Excelsior" if installed
var FONT_DIALOG_BODY = "Arial";
var FONT_SIZE_BSOD   = 13;              // px, monospace text on BSOD panels
var FONT_SIZE_DIALOG = 11;              // px, dialog body text

var COLOR_BSOD_BG    = [0, 0, 0.667];  // #0000AA  (AE normalized RGB)
var COLOR_BSOD_TEXT  = [1, 1, 1];      // white
var COLOR_DIALOG_BG  = [0.831, 0.816, 0.784]; // #D4D0C8  Win98 grey
var COLOR_TITLE_BAR  = [0, 0, 0.502];  // #000080  deep blue

var SCANLINE_OPACITY = 0.20;           // 0.0–1.0
var NOISE_OPACITY    = 0.08;           // 0.0–1.0
var SCANLINE_SPACING = 4;              // px between scan lines

var DIALOG_STACK_OFFSET_X = 10;        // px diagonal stack X offset
var DIALOG_STACK_OFFSET_Y = 10;        // px diagonal stack Y offset
var DIALOG_MAX_STACK_DEPTH = 8;        // max cascading copies

var CURSOR_SIZE      = 24;             // px, rendered cursor height
var MIN_ELEMENT_LIFE = 8;              // frames — global floor
var PIXEL_BLOCK_MIN  = 2;             // frames — exception to floor rule
```

---

## Stored State & Persistence

| Data | Where Stored | Persists? |
|---|---|---|
| Seed value | Comp marker, frame 0, label `WEFX_SEED` | Yes, with project |
| Custom messages | Comp marker, frame 0, label `WEFX_MESSAGES` | Yes, with project |
| Panel UI state (sliders, dropdowns) | AE preferences file | Per machine |
| Generated layers | Pre-comp `WindowsErrorFX_[seed]` | Yes, until Cleared |

When the user opens the panel on a comp that already has a `WEFX_SEED` marker, the panel populates the seed field and all controls from the stored state automatically.

---

## Error States & Warnings

| Situation | Panel Response |
|---|---|
| No active comp | `Open a composition to begin.` |
| Active comp under 24 frames | `Comp is very short. Results may be sparse.` |
| No roto layers detected | `No roto layers found — running in Flat mode.` |
| All element sliders at 0% | `Nothing to generate. Enable at least one element type.` |
| Custom message pool empty and built-in cleared | `No messages in pool. Reset to defaults or add custom messages.` |
| Pre-comp generation fails | `Something went wrong. Check AE scripting permissions in Preferences > Scripting & Expressions.` |

---

*Document version 0.1 — companion to windows-error-fx-spec.md and windows-error-fx-animation-spec.md*
