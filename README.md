# Windows Error FX

Generate Windows 9x/XP error aesthetic effects over your footage. Available for **After Effects** and **Nuke**.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey)
![No Dependencies](https://img.shields.io/badge/dependencies-none-green)

---

## What It Does

Generates Windows error dialogs, BSOD panels, corrupted text, cursor artifacts, pixel corruption, and freeze strips over your footage. Everything composites over (and optionally behind) your roto subject. Seeded randomness means the same seed always produces the same layout.

- **Seeded randomness** — same seed always produces the same layout
- **Chaos slider** — controls density from subtle glitches to total system failure
- **Per-element control** — independent settings for each element type
- **Roto-aware** — elements go behind and in front of your subject
- **Fully editable** — output is normal layers/nodes, not baked pixels

---

# After Effects

![After Effects CC 2015+](https://img.shields.io/badge/After%20Effects-CC%202015%2B-blue)

One `.jsx` file, no plugins, no external assets. Dialogs use pre-rendered PNGs embedded in the script for pixel-perfect title bar gradients.

## AE Install

1. Copy `WindowsErrorFX.jsx` into your ScriptUI Panels folder:

   **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

   **Mac:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

2. Restart After Effects.

3. Open via **Window > Windows Error FX**.

> First time? Enable scripting: **Edit > Preferences > Scripting & Expressions** > check **Allow Scripts to Write Files and Access Network**.

## AE Quick Start

1. Open a comp with your footage.
2. Open the **Windows Error FX** panel.
3. Enter a **seed** (or click the dice button for a quick re-roll, or **RANDOMIZE** for a full random setup).
4. Set **chaos** (start around 50–100 — the gradient bar shows intensity from green to red).
5. Hit **REGENERATE**.

A pre-comp with error windows, BSOD panels, cursors, glitch text, pixel corruption, and freeze strips appears in your comp. Change the seed for a different look. Same seed = same result every time.

## AE Panel Layout

<p align="center">
  <img src="docs/images/ui-mockup.png" alt="Windows Error FX panel" width="380"/>
</p>

### Top Controls

| Control | What it does |
|---|---|
| **SEED** | Integer seed for deterministic output. The dice button picks a random seed without touching other settings. |
| **CHAOS** | Element count multiplier. The gradient bar shows intensity: green (off) through yellow (normal) to red (insane). |
| **Resolution** | Simulated screen resolution for element sizing |
| **Roto** | Select a roto layer explicitly, or leave on **Auto-detect** |

### Global Settings

| Control | What it does |
|---|---|
| **Layering** | How elements interact with roto layers (Split / All Over / All Under / Flat) |
| **Behind %** | Probability of elements going behind the roto subject (0 = all over, 100 = all under) |
| **Style** | Animation personality: XP Classic, Glitch Heavy, Slow Burn, Chaos Maximum |
| **Animation Curves** | Time distribution: Flat, Build, Peak, Burst, Random |

### Per-Element Tabs

Five custom tab buttons with colored dots give independent control over each element type (Dialog, BSOD, Cursor, Pixel, Freeze). The active tab lights up robin-egg blue; inactive tabs show a neutral beige dot. Each tab has:

| Field | What it does |
|---|---|
| **Count** | Exact number to spawn (0 = auto from chaos level) |
| **Duration** | Frame range (e.g. 8 – 96 frames) |
| **Scale** | Size multiplier |
| **Speed** | Animation speed multiplier |
| **Jitter** | Position jitter intensity (0 = off, higher = more wiggle) |
| **Opacity** | Opacity range (min – max %) |
| **Fade In / Fade Out** | Entry and exit duration in frames |
| **Per-Element Overrides** | Collapsible section with per-type Trails, Roto, Curve, and Custom Messages overrides |

Stack Depth and Offset (for dialog cascade stacking) remain global controls below the tabs.

### Overlays

| Control | What it does |
|---|---|
| **Scanlines** | CRT scanline overlay with opacity, spacing, and jitter |
| **Noise** | Fractal noise grain overlay (opacity, scale, complexity — single row) |
| **Head Scratch** | Horizontal line artifacts |
| **Trails** | Echo/ghost trail effect on random elements |

### Actions

| Control | What it does |
|---|---|
| **Custom Msgs / Export Assets / Show Log** | Utility row — custom messages, asset export, and log viewer |
| **RANDOMIZE** | Randomizes all settings at once — seed, chaos, per-element controls, overlays, style, and curves |
| **REGENERATE** | Generates (or replaces) the effect in the active comp (green button) |
| **CLEAR ALL** | Removes all generated elements with confirmation (red button) |

A **status bar** at the bottom shows the current state (Ready, Generated N elements, Cleared, etc.).

## AE Roto Layers

Use the **Roto** dropdown in the main panel to explicitly select a roto layer, or leave it on **Auto-detect** to find layers by name. Auto-detect looks for names containing **roto**, **matte**, **cutout**, **subject**, or **fg**. The **Element Layering** control determines how elements interact with roto layers — in **Split** mode, the **Behind %** slider controls how often elements go behind vs. in front of your subject. No roto layers? Set Element Layering to **Flat**.

## AE Logging

Each generate writes a log to `Documents/WindowsErrorFX/WindowsErrorFX.log`. The file is overwritten each run and is safe to delete. Use the **Show Log** button to view it, reveal it in Explorer/Finder, or delete it.

## AE Requirements

- After Effects CC 2015 or newer
- Mac or Windows
- No plugins or fonts required (uses Courier New and Arial)

---

# Nuke

![Nuke 13+](https://img.shields.io/badge/Nuke-13%2B-orange)
![Python 3.7+](https://img.shields.io/badge/Python-3.7%2B-blue)

Python module that creates a Group node with custom knobs. All settings persist with the `.nk` file automatically. Same seeded scheduler as the AE version — identical element layout for a given seed.

### Differences from the AE version

| Feature | AE | Nuke |
|---|---|---|
| Scanlines | Built-in overlay | Dropped (make your own) |
| BSOD typewriter | Animated text reveal | Static text only |
| Text corruption | Per-frame char swaps | Static text only |
| UI | ScriptUI panel | Knobs on Group node |
| Output | Pre-comp with layers | Merge chain inside Group |

## Nuke Install

1. Copy the `WindowsErrorFX_Nuke/` folder to `~/.nuke/` (or anywhere on your `NUKE_PATH`).

2. Add this line to your `~/.nuke/menu.py`:

   ```python
   import WindowsErrorFX_Nuke.menu
   ```

3. Restart Nuke. A **WindowsErrorFX** menu appears in the toolbar.

## Nuke Quick Start

1. Select your footage node in the DAG.
2. Go to **Nodes > WindowsErrorFX > Create WindowsErrorFX**.
3. Connect your footage to **Input 1 (Footage)**. Optionally connect a roto matte to **Input 2 (Roto)**.
4. In the Group's properties, set **Seed** and **Chaos**.
5. Click **Generate**.

> **How it works — Generate, not live.**
> Unlike standard Nuke nodes, changing knobs on the Group does **not** update the output in real time. The knobs are settings for the *next* generate. When you click **Generate**, the plugin deletes all internal nodes and rebuilds the entire element network from scratch based on the current knob values. This is a deliberate design choice — the plugin creates dozens of interconnected Read, Transform, and Merge nodes driven by a seeded random schedule, which cannot be meaningfully "tweaked" in place.
>
> **Typical workflow:** adjust knobs → Generate → review in viewer → tweak knobs → Generate again. **Clear** removes all generated nodes, keeping the Group shell ready for the next generate.

## Nuke Controls

All controls live as knobs on the Group node. Tabs organize them:

### WindowsErrorFX Tab (main)
| Knob | What it does |
|---|---|
| **Seed** | Integer seed for deterministic generation |
| **Chaos** | Element count multiplier (0 = nothing, 100 = standard, 200+ = heavy) |
| **Resolution** | Virtual resolution for element sizing (640x480 through Native) |
| **Roto Mode** | Split / All Over / All Under / Flat |
| **Behind %** | Probability of elements going behind the roto subject |
| **Anim Style** | XP Classic / Glitch Heavy / Slow Burn / Chaos Maximum |
| **Chaos Curve** | Time distribution: Flat / Build / Peak / Burst / Random |
| **Stack Depth / Offset** | Dialog cascade stacking controls |
| **Generate** | Build the effect network |
| **Clear** | Remove all generated nodes |
| **Randomize** | Randomize all settings |

### Per-Element Tabs (Dialog, BSOD, Cursor, Pixel, Freeze)
Each tab has: Count, Min/Max Frames, Scale %, Speed %, Opacity Min/Max, Entry/Exit Frames, Jitter.

### Overlays Tab
Noise (enable, opacity, scale, complexity) and Head Scratch (enable, frequency, height).

### Trails Tab
Enable, Chance %, Echoes, Decay %.

## Nuke Architecture

The Group node is a **generator, not a processor**. Its knobs store settings; its internal network is rebuilt on each Generate. After generation, the internal nodes are standard Nuke nodes (Read, Transform, Merge2, etc.) that you can inspect, tweak by hand, or even break out of the Group if you want manual control.

```
[Footage] ──► ┌─────────────────────────────────┐
              │  WindowsErrorFX (Group)          │
[Roto]   ──► │                                   │ ──► [Output]
              │  Knobs = settings for generation  │
              │  Generate → rebuild all WEFX_*    │
              │  Clear → delete WEFX_* nodes      │
              └─────────────────────────────────┘
```

**Flat mode:** `Footage → Merge(elem1) → Merge(elem2) → ... → Merge(overlays) → Output`

**Split mode (with roto):** `Footage → UNDER merges → Roto over → OVER merges → Overlays → Output`

Element lifespan is handled by mix keyframes on each element's Merge node — ramping in over the entry frames, holding during the element's life, and ramping out over exit frames.

## Nuke Requirements

- Nuke 13 or newer (Python 3.7+)
- Mac, Windows, or Linux
- No external dependencies

## Running Tests (No Nuke Required)

The pure-logic core (PRNG, scheduler, settings, constants) runs without Nuke installed:

```bash
cd windows_error_ae
python3 -m unittest discover -s WindowsErrorFX_Nuke/tests -v
```

147 tests covering PRNG determinism, scheduler behavior, settings migration, and cross-language compatibility.

---

<details>
<summary><strong>Seed &amp; Determinism</strong></summary>

Every generated layout is driven by a single integer **seed**. The same seed with the same settings always produces the exact same arrangement of error windows, BSOD panels, text, cursors, pixel blocks, and freeze strips.

- Change the seed to get a completely different layout
- Write down a seed you like — you can recreate it any time
- **RANDOMIZE** picks a new seed *and* randomizes all settings at once
- The PRNG is bit-identical between the AE and Nuke versions — same seed produces the same scheduler output in both

</details>

<details>
<summary><strong>Chaos Level</strong></summary>

Chaos controls how many elements are generated (when per-element counts are set to 0/auto).

| Range | Feel |
|---|---|
| 0 | Nothing generated |
| 1–50 | Subtle — a few scattered elements |
| 50–150 | Normal — a healthy amount of error chaos |
| 150–300 | Heavy — screen fills up fast |
| 300+ | Insane — hundreds of overlapping elements |

The formula is non-linear (power curve), so low values stay subtle and high values escalate dramatically.

</details>

<details>
<summary><strong>Per-Element Controls</strong></summary>

Five element types (Dialog, BSOD, Cursor, Pixel, Freeze) have independent controls. Text elements use global settings.

- **Count** — Exact number to spawn. Set to `0` for auto (chaos-based). Example: set Dialog to 5, Cursor to 0, and everything else to 0 to get only 5 error windows.
- **Duration** — Frame range (min – max). Elements will last between these values.
- **Scale** — Size multiplier. 100 = normal, 200 = double size.
- **Speed** — Animation speed. 100 = normal, 50 = half speed, 200 = double speed.
- **Jitter** — Position jitter. 0 = off, higher = more movement.
- **Opacity** — Opacity range (min – max %). Elements get a random opacity between the two values.
- **Fade In / Fade Out** — Entry and exit duration in frames.

Each tab also has a collapsible **Per-Element Overrides** section for per-type Trails, Roto layer assignment, Curve, and Custom Messages.

</details>

<details>
<summary><strong>Animation Style</strong></summary>

The Style control changes the personality of element animations:

- **XP Classic** — Balanced mix of behaviors, moderate timing
- **Glitch Heavy** — More shaking, jump-cuts, and erratic movement
- **Slow Burn** — Longer durations, more static/drifting, gradual buildup
- **Chaos Maximum** — Short durations, rapid-fire, maximum visual noise

</details>

<details>
<summary><strong>Animation Curves</strong></summary>

Controls *when* elements appear across your timeline:

- **Flat** — Evenly distributed throughout the comp
- **Build** — Sparse at the start, dense toward the end (ramps up)
- **Peak** — Clustered in the middle, sparse at edges (bell curve)
- **Burst** — Random clusters of activity with gaps between
- **Random** — Weighted random segments of varying density

Per-element curve overrides let different types follow different distributions (e.g., dialogs build up while BSOD panels appear flat).

</details>

<details>
<summary><strong>Roto / Element Layering</strong></summary>

Controls how elements interact with your roto subject:

- **Split** — Elements randomly appear above and below the subject. The **Behind %** slider controls the probability (0% = all in front, 50% = even split, 100% = all behind)
- **All Over** — Everything composites in front of the subject
- **All Under** — Everything composites behind the subject
- **Flat** — No roto splitting; everything in one layer (use when you have no roto)

Per-element roto overrides let you force specific types over or under regardless of the global mode.

</details>

<details>
<summary><strong>Overlays</strong></summary>

- **Scanlines** (AE only) — CRT-style horizontal line overlay. Adjust opacity, line spacing, and enable jitter for randomized line positions.
- **Noise** — Fractal noise grain overlay. Control opacity, scale (grain size), and complexity (detail level).
- **Head Scratch** — Horizontal line artifacts that appear at random positions, like a damaged VHS tape.

</details>

<details>
<summary><strong>Trails</strong></summary>

Trails add an echo/ghost effect to random elements.

- **Chance %** — Probability that any given element gets trails (e.g., 20 = 1 in 5 elements)
- **Echoes** — Number of trailing copies
- **Decay %** — How quickly each echo fades (higher = faster fade)

Per-element trail overrides let you give specific types their own trail settings.

</details>

<details>
<summary><strong>Custom Messages</strong></summary>

Add your own error messages to the random pool for BSOD and text elements — the more you add, the more often they appear.

- **Global custom messages** apply to BSOD and text elements
- **Per-element custom messages** (BSOD tab override) apply only to BSOD

Dialog text in AE is pre-rendered into embedded PNGs and cannot be customized via text. In Nuke, dialog text is rendered by Text2 nodes and uses the built-in message pool.

</details>

<details>
<summary><strong>Custom Assets (AE only)</strong></summary>

You can replace or supplement the built-in dialog and cursor images with your own PNGs.

1. Click **Export Assets...** to decode all 38 built-in PNGs (36 dialogs + 2 cursors) into a `WindowsErrorFX_Custom` folder in your AE project bin
2. The PNGs are also written to `Documents/WindowsErrorFX/custom/` on disk — edit them in any image editor
3. Re-import your modified PNGs into the `WindowsErrorFX_Custom` folder, or add entirely new ones
4. On the next **REGENERATE**, custom dialog PNGs are randomly mixed in alongside the built-in set (50/50 chance per dialog)

The custom folder is never deleted by **CLEAR ALL** — it's yours to manage. Delete `WindowsErrorFX_Custom` from the project bin to go back to built-in assets only.

</details>

## License

MIT
