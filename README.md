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
3. Pick a **seed** (or hit **Random**).
4. Set **chaos** (start around 50%).
5. Hit **GENERATE**.

A pre-comp with error windows, BSOD panels, cursors, and glitch text appears in your comp. Change the seed for a different look. Same seed = same result every time.

## Controls

| Control | What it does |
|---|---|
| **Seed** | Determines the layout. Same seed = identical output. |
| **Chaos** | Density of elements. 0% = nothing. 100% = total failure. |
| **Generate** | Builds the effect in your active comp. |

### Advanced

| Control | What it does |
|---|---|
| **Element Mix** | Per-type sliders (Dialog, BSOD, Text, Cursor, Pixel). Set to 0% to disable. |
| **Style** | Animation personality: XP Classic, Glitch Heavy, Slow Burn, Chaos Maximum. |
| **Min / Max** | Frame duration limits for elements. |
| **Roto** | How elements interact with roto layers (Split / All Over / All Under / Flat). |
| **Curve** | Time distribution: Flat, Build, Peak, Burst, Random. |
| **Custom Messages** | Add your own error messages and window titles. |
| **Show Log** | View the generation log file for debugging. |

## Roto Layers

Layers with names containing **roto**, **matte**, **cutout**, **subject**, or **fg** are auto-detected. In **Split** mode, elements appear both behind and in front of your subject. No roto layers? Everything composites flat.

## Logging

Each generate writes a log to `Documents/WindowsErrorFX/WindowsErrorFX.log`. The file is overwritten each run and is safe to delete. Use the **Show Log** button to view it, reveal it in Explorer/Finder, or delete it.

## Project Structure

```
WindowsErrorFX.jsx           <- The plugin (single deliverable file)
USER_GUIDE.md                <- Friendly user guide
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

733 tests covering determinism, distribution curves, element weighting, floor rules, and edge cases.

## Requirements

- After Effects CC 2015 or newer
- Mac or Windows
- No plugins or fonts required (uses Courier New and Arial)

## License

MIT
