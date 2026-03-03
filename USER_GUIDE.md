# Windows Error FX — User Guide

A ScriptUI panel for After Effects that generates Windows 9x/XP error aesthetic effects over your footage. One file, no plugins, no assets.

---

## Installation

1. Copy `WindowsErrorFX.jsx` to your ScriptUI Panels folder:

   **Windows:**
   ```
   C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\
   ```

   **Mac:**
   ```
   /Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/
   ```

2. Restart After Effects (or close and reopen it).

3. Find the panel under **Window → Windows Error FX**.

> **First time?** You may need to enable scripting: go to **Edit → Preferences → Scripting & Expressions** and check **Allow Scripts to Write Files and Access Network**.

---

## Quick Start

1. Open a composition with your footage.
2. Open the **Windows Error FX** panel.
3. Pick a **seed** number (or hit **Random**).
4. Set **chaos** level (start around 50%).
5. Hit **GENERATE**.

That's it. A pre-comp with error windows, BSOD panels, cursors, and glitch text will appear in your comp. Everything is native shape layers and text — fully editable.

**Want a different look?** Change the seed and generate again. Same seed always gives the same result.

---

## Controls

| Control | What it does |
|---|---|
| **Seed** | The magic number. Same seed = same layout every time. Change it to get a totally different arrangement. |
| **Chaos** | How broken everything looks. 0% = almost nothing. 100% = total system failure. |
| **Generate** | Builds the effect in your active comp. |

### Advanced (click "Show Advanced")

| Control | What it does |
|---|---|
| **Element Mix** | Sliders for each element type — Dialog, BSOD, Text, Cursor, Pixel. Set to 0% to disable a type entirely. |
| **Style** | Animation personality. *XP Classic* is snappy and authentic. *Glitch Heavy* is jittery. *Slow Burn* is creeping dread. *Chaos Maximum* is everything at once. |
| **Min / Max** | Frame duration limits for elements. |
| **Roto** | How elements interact with roto layers. *Split* puts some behind and some in front of your subject. *Flat* ignores roto entirely. |
| **Curve** | How elements are distributed over time. *Build* ramps up. *Peak* concentrates in the middle. *Burst* creates clusters. |
| **Custom Messages** | Add your own error messages and window titles to the pool. |
| **Regenerate** | Same as Generate but skips the "replace?" prompt. |
| **Clear All** | Removes the effect completely. |

---

## Roto Layers

If your comp has layers with names containing **roto**, **matte**, **cutout**, **subject**, or **fg**, the panel auto-detects them. In **Split** mode, some elements appear behind your subject and some in front — giving that "trapped in a crashing computer" look.

No roto layers? No problem. Everything composites flat.

---

## Tips

- **Iterate fast:** Change the seed, regenerate, repeat. Each seed is a completely different layout.
- **Low chaos first:** Start at 30–40% to see individual elements clearly, then crank it up.
- **Everything is editable:** The generated layers are normal AE shape layers and text. Move them, retime them, delete the ones you don't want.
- **Settings persist:** Your seed and settings are saved in the project file. Reopen the project and the panel restores them.
- **Undo works:** Generation is wrapped in a single undo group. Ctrl+Z takes it all back.

---

## Requirements

- After Effects CC 2015 or newer
- Mac or Windows
- No plugins or fonts required (uses Courier New and Arial)
