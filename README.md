# Windows Error FX

A ScriptUI panel for Adobe After Effects that generates Windows 9x/XP error aesthetic effects over your footage. One file, no plugins, no assets.

![After Effects CC 2015+](https://img.shields.io/badge/After%20Effects-CC%202015%2B-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac-lightgrey)
![No Dependencies](https://img.shields.io/badge/dependencies-none-green)

---

## What It Does

Generates native AE shape layers and text layers that look like Windows error dialogs, BSOD panels, corrupted text, cursor artifacts, and pixel corruption. Everything composites over (and optionally behind) your footage using auto-detected roto layers.

- **Seeded randomness** — same seed always produces the same layout
- **Chaos slider** — controls density from subtle glitches to total system failure
- **Per-element control** — independent settings for each element type
- **Roto-aware** — automatically splits elements above and below your subject
- **Fully editable** — output is normal AE layers, not baked pixels

## Install

1. Copy `WindowsErrorFX.jsx` into your ScriptUI Panels folder:

   **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

   **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

2. Restart After Effects.

3. Open via **Window > Windows Error FX**.

> First time? Enable scripting: **Edit > Preferences > Scripting & Expressions** > check **Allow Scripts to Write Files and Access Network**.

## Quick Start

1. Open a comp with your footage.
2. Open the **Windows Error FX** panel.
3. Enter a **seed** (or hit **RANDOMIZE** for a full random setup).
4. Set **chaos** (start around 50-100).
5. Hit **GENERATE**.

A pre-comp with error windows, BSOD panels, cursors, and glitch text appears in your comp. Change the seed for a different look. Same seed = same result every time.

## Panel Layout

### Main Panel

<p align="center">
  <img src="docs/images/gui-main-panel.svg" alt="Main panel" width="320"/>
</p>

The main panel is always visible. Enter a seed, set your chaos level, and hit **GENERATE**. The **RANDOMIZE** button randomizes all settings at once — seed, chaos, per-element controls, overlays, style, and curve — for quick experimentation.

### Per-Element Tabs

<p align="center">
  <img src="docs/images/gui-element-tabs.svg" alt="Per-element tabbed controls" width="340"/>
</p>

Inside Advanced, a tabbed panel gives independent control over each of the 5 element types. Each tab has:

| Field | What it does |
|---|---|
| **Count** | Exact number to spawn (0 = auto from chaos level) |
| **Min / Max f** | Duration range in frames |
| **Scale %** | Size multiplier |
| **Spd %** | Animation speed multiplier |
| **Opac** | Opacity range (min - max) |
| **Entry / Exit** | Fade-in and fade-out frames |

Stack Depth and Offset (for dialog cascade stacking) remain global controls below the tabs.

### Overlays & Global Controls

<p align="center">
  <img src="docs/images/gui-advanced-panel.svg" alt="Advanced panel" width="340"/>
</p>

| Control | What it does |
|---|---|
| **Scanlines** | CRT scanline overlay with opacity, spacing, and jitter |
| **Noise** | Fractal noise grain overlay |
| **Head Scratch** | Horizontal line artifacts |
| **Trails** | Echo/ghost trail effect on random elements |
| **Style** | Animation personality: XP Classic, Glitch Heavy, Slow Burn, Chaos Maximum |
| **Roto** | How elements interact with roto layers (Split / All Over / All Under / Flat) |
| **Curve** | Time distribution: Flat, Build, Peak, Burst, Random |
| **Custom Messages** | Add your own error messages and window titles |
| **REGENERATE** | Replaces existing effect without confirmation |
| **CLEAR ALL** | Removes all generated elements |
| **Show Log** | View the generation log file for debugging |

## Roto Layers

Layers with names containing **roto**, **matte**, **cutout**, **subject**, or **fg** are auto-detected. In **Split** mode, elements appear both behind and in front of your subject. No roto layers? Everything composites flat.

## Logging

Each generate writes a log to `Documents/WindowsErrorFX/WindowsErrorFX.log`. The file is overwritten each run and is safe to delete. Use the **Show Log** button to view it, reveal it in Explorer/Finder, or delete it.

## Project Structure

```
WindowsErrorFX.jsx           <- The plugin (single deliverable file)
docs/images/                  <- GUI mockup SVGs
tests/
  run_tests.js               <- Test runner (node tests/run_tests.js)
  test_harness.js             <- Node.js VM sandbox with AE mocks
  test_prng.js                <- PRNG tests
  test_utilities.js           <- Utility function tests
  test_scheduler.js           <- Scheduler logic tests (heaviest)
```

## Testing

The PRNG, utilities, and scheduler are pure logic with no AE dependencies. Tests run in Node.js:

```bash
node tests/run_tests.js
```

856 tests covering determinism, distribution curves, element weighting, floor rules, per-element controls, settings migration, and edge cases.

## Requirements

- After Effects CC 2015 or newer
- Mac or Windows
- No plugins or fonts required (uses Courier New and Arial)

## License

MIT
