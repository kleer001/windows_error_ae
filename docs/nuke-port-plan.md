# Windows Error FX — Nuke Port Plan

## Overview

Port of WindowsErrorFX from After Effects (ExtendScript) to Nuke (Python 3).
Same visual output, different compositing paradigm.

---

## Architecture

### High-Level Flow

```
[Footage] ──► ┌─────────────────────────────┐
               │  WindowsErrorFX (Group)      │
[Roto]   ──► │                               │ ──► [Output]
               │  Control Node (NoOp)         │
               │  Element nodes + animations  │
               │  Merge chain → output        │
               └─────────────────────────────┘
```

### Inputs

1. **Input 1 — Footage:** User selects/connects their main footage node first.
2. **Input 2 — Roto (optional):** User connects roto matte node(s) after.
   If no roto connected, runs in flat mode (all elements composited over).

### Control Node

A NoOp node at the top of the Group with custom knobs for all settings:
- Seed, Chaos, Virtual Resolution
- Per-element tabs/sections (count, timing, scale, speed, opacity, overrides)
- Overlay controls (scanlines, noise, head scratch)
- Trails controls
- Global controls (animation style, chaos curve, stack depth/offset)
- **Generate button** — rebuilds the entire internal network
- **Clear button** — removes all generated nodes, keeps the Group shell

Settings persist automatically with the `.nk` file (knob values are saved natively).

### Generated Network (inside the Group)

The Generate button:
1. Deletes all previously generated internal nodes (everything except the control NoOp and Input/Output nodes)
2. Runs the scheduler (pure logic — same PRNG + scheduler code as AE version)
3. Creates element nodes for each scheduled job (BSODs, dialogs, cursors, pixels, freeze strips, text overlays)
4. Wires element nodes into merge chains
5. Adds global overlays (scanlines, noise, head scratch)
6. Connects final merge to the Group's Output node

### Merge Chain Topology

**Flat mode (no roto):**
```
Footage → Merge(elem1) → Merge(elem2) → ... → Merge(overlays) → Output
```

**Split mode (with roto):**
```
Footage → Merge(UNDER elems) → Merge(roto_matte, stencil) → Merge(OVER elems) → Merge(overlays) → Output
```

Each element's Merge node gets:
- `operation` set to the element's blend mode (over, plus, screen, overlay, etc.)
- `mix` used for element opacity
- Element lifespan handled by [TBD: TimeClip vs FrameRange vs mix keyframes — see open questions]

### Output

A single output node at the bottom. The artist takes this and does whatever they want with it downstream.

---

## File Structure

```
WindowsErrorFX_Nuke/
├── __init__.py                ← Package init, version
├── core/
│   ├── __init__.py
│   ├── prng.py                ← Mulberry32 PRNG + helpers
│   ├── constants.py           ← Colors, fonts, timing, message pools, blend weights
│   ├── scheduler.py           ← Pure logic scheduler (no Nuke API)
│   └── settings.py            ← Settings helpers, defaults, migration
├── builders/
│   ├── __init__.py
│   ├── bsod.py
│   ├── dialog.py
│   ├── chrome.py
│   ├── text_overlay.py
│   ├── cursor.py
│   ├── pixel.py
│   ├── freeze.py
│   └── overlays.py            ← Noise, head scratch (scanlines dropped)
├── compositor.py              ← Merge chain wiring, roto split, rebuild
├── control.py                 ← Control NoOp knob creation, Generate/Clear callbacks
├── assets.py                  ← Base64 embedded PNGs, decode, cache management
├── menu.py                    ← Nuke menu/toolbar registration
└── tests/
    ├── test_prng.py
    ├── test_utilities.py
    └── test_scheduler.py
```

Installation: copy `WindowsErrorFX_Nuke/` folder to `~/.nuke/` or add to `NUKE_PATH`.

---

## What Ports Directly (pure logic, ES3 → Python 3)

These sections are mechanical syntax conversion with no Nuke API involvement:

- PRNG (mulberry32 + helpers)
- Scheduler (calcElementCount, distributeTimes, pickElementType, pickDuration, assignLayer, buildJob, assignDialogStacks, schedule)
- Settings helpers (defaultElementSettings, getElementSettings, migrateSettings, randomizeSettings, defaultSettings)
- Message pools and constants (colors, fonts, timing, geometry, blend weights, all text pools)
- Roto detection logic (name matching — adapted to scan node names/labels instead of layer names)

Estimated ~40% of total codebase. All testable without Nuke installed.

---

## Decisions (resolved)

### D1. UI Approach — Knobs only
All settings as knobs on the control NoOp. No PySide2 panel. Nuke users can handle a big knob list.

### D2. Element Lifespan — Mix keyframes
Keyframe `mix` on each element's Merge node: 0 outside the element's life, 1 during.
No extra nodes per element. Just two keyframes each.

### D3. Rebuild Cleanup — Name prefix
All generated nodes get `WEFX_` prefix. On rebuild, delete everything inside the Group
matching `WEFX_*`. Control NoOp and Input/Output nodes are never prefixed.

### D4. File Structure — Module folder
Not a single file. Python module with subdirectories (see File Structure above).

### D5. Feature Cuts
- **Scanlines dropped.** Nuke users can make their own.
- **BSOD typewriter dropped.** Eliminates the text-keyframing risk entirely.
- **BSOD line shuffle dropped.** Same reason.
- **Text corruption (char swap/block/dropout) dropped.** Same reason.
  Text overlays still appear — they just show static text, no per-frame content changes.

### D6. Roto Split Wiring — Stencil pattern
Research confirms the standard Nuke pattern for elements behind/in front of a roto subject:

```
                    ┌─── UNDER element merges ◄── (elements that go behind subject)
                    │
Footage ──► Merge(stencil, roto_matte) ──► Merge(over) ──► OVER element merges ──► Output
                                              ▲
                                              │
                                    Footage (clean, for subject)
```

More precisely:
1. Branch footage into two pipes
2. Pipe A: Merge UNDER elements over footage (operation: over/plus/screen/etc per element)
3. Pipe B: footage with roto alpha (the subject cutout)
4. Merge B over A (operation: over) — subject sits on top of UNDER elements
5. Merge OVER elements on top of that result
6. Add overlays (noise, head scratch) last

Key Nuke API: `merge['operation'].setValue('stencil')` or `'over'`, inputs via
`node.setInput(0, B_node)` (B pipe) and `node.setInput(1, A_node)` (A/foreground).

---

## Resolved Questions (researched)

### R1. Blend Mode String Mapping — RESOLVED

AE blend modes → Nuke Merge2 `operation` knob exact string values:

| AE BlendingMode | Nuke operation string |
|---|---|
| NORMAL | `over` |
| ADD | `plus` |
| SCREEN | `screen` |
| OVERLAY | `overlay` |
| HARD_LIGHT | `hard-light` |
| DIFFERENCE | `difference` |
| MULTIPLY | `multiply` |

Full list of all 30 Nuke Merge operations (for reference):
`atop`, `average`, `color-burn`, `color-dodge`, `conjoint-over`, `copy`,
`difference`, `disjoint-over`, `divide`, `exclusion`, `from`, `geometric`,
`hard-light`, `hypot`, `in`, `mask`, `matte`, `max`, `min`, `minus`,
`multiply`, `out`, `over`, `overlay`, `plus`, `screen`, `soft-light`,
`stencil`, `under`, `xor`

Python usage: `merge['operation'].setValue('screen')`

Source: [Merge Operations — Foundry](https://learn.foundry.com/nuke/content/comp_environment/merging/merge_operations.html)

### R2. Noise Node Knob Mapping — RESOLVED

| AE Fractal Noise | Nuke Noise knob | Default |
|---|---|---|
| Scale | `size` | 350 |
| Complexity | `octaves` | 10 |
| Evolution expr | `zoffset` (animate: `zoffset.setExpression('frame*100')`) | 0 |
| — | `lacunarity` | 2 |
| — | `gain` | 0.5 |
| — | `gamma` | 0.5 |
| Noise type | `type` (values: `fBm`, `turbulence`) | fBm |
| — | `opacity` | 1 |
| — | `color` | 1 (white) |
| — | `translate` | [0, 0] |

For our use: create Noise node, set `size` small (e.g. 50-100), animate
`zoffset` with expression `frame * 100` for per-frame variation, merge
with `overlay` operation at low `mix`.

Source: [Noise Node — Foundry](https://learn.foundry.com/nuke/content/reference_guide/draw_nodes/noise.html)

### R3. Crop Box Knob Format — RESOLVED

Crop node `box` knob takes 4 values: `[x, y, r, t]` (left, bottom, right, top).

```python
crop = nuke.nodes.Crop()
crop['box'].setValue([0, 100, 1920, 200])  # horizontal strip at y=100-200
```

Individual values: `crop['box'].setValue(100, 1)` sets index 1 (y/bottom).

Source: [BBox_Knob — Foundry](https://learn.foundry.com/nuke/developers/14.0/pythonreference/_autosummary/nuke.BBox_Knob.html)

### R4. Group Node API — RESOLVED

```python
# Create group
g = nuke.createNode('Group')
g.begin()

# Add internal nodes (created inside the group context)
inp = nuke.createNode('Input')      # Group input 1
inp2 = nuke.createNode('Input')     # Group input 2 (for roto)
# ... create element nodes, merges, etc ...
out = nuke.createNode('Output')

g.end()
```

Multiple inputs: each `Input` node gets an auto-incrementing `number` knob
(0, 1, 2...) corresponding to the input pipe on the Group node.

Rebuild cleanup: iterate `g.nodes()` inside `g.begin()`/`g.end()`,
delete anything with `WEFX_` prefix.

Source: [Add Nodes Inside A Group — Conrad Olson](https://conradolson.com/add-nodes-inside-a-group-with-python)

### R5. Transform Filter for Pixel Art — RESOLVED

`filter` knob value for nearest-neighbor: **`Impulse`**

```python
transform = nuke.nodes.Transform()
transform['filter'].setValue('Impulse')
```

All filter options: `Impulse` (nearest-neighbor), `Cubic` (default), `Keys`,
`Simon`, `Rifman`, `Mitchell`, `Parzen`, `Notch`.

Source: [Filtering Algorithm — Foundry](https://learn.foundry.com/nuke/content/comp_environment/transforming_elements/filtering_algorithm_2d.html)

### R6. Nuke Version Compatibility — RESOLVED

| Nuke Version | Python Version | PySide |
|---|---|---|
| 13.x | 3.7 | PySide2 |
| 14.x | 3.9 | PySide2 |
| 15.x | 3.10 | PySide2 |
| 16.x | 3.11 | PySide6 |

**Decision: Target Nuke 13+ (Python 3.7+).** No f-strings with `=` (3.8+),
no walrus operator. Keep it simple. Knobs-only UI avoids the PySide2/6 split.

Source: [Updating Scripts for Nuke 13 — Erwan Leroy](https://erwanleroy.com/updating-your-python-scripts-for-nuke-13/)

---

## Remaining Items (low risk, design during implementation)

### Node Graph Auto-Layout
Options: `node.autoplace()` vs manual grid positioning.
Will decide during Phase 6.

### Custom Asset Pipeline
Custom assets = files on disk at `~/.nuke/WindowsErrorFX/custom/`.
Scan directory at generate time, 50/50 random selection.
Straightforward, implement during Phase 6.

---

## Build Order (phased)

### Phase 1 — Pure Logic Port
Port PRNG, scheduler, settings, constants to Python 3. Port all 2170 tests.
Runs without Nuke. Module structure: `core/` directory.

### Phase 2 — Nuke Primitives Research
All major API questions resolved via documentation (see Resolved Questions above).
Hands-on verification deferred to integration testing.
Requires Nuke (30-day trial) for live testing only.

### Phase 3 — Element Builders
Rewrite each builder (BSOD, dialog, chrome, text, cursor, pixel, freeze)
using Nuke nodes. Module structure: `builders/` directory.
Text features are static-only (no keyframed content changes).

### Phase 4 — Compositor / Merge Wiring
Build merge chain constructor, roto split (stencil pattern), overlay integration.
Module: `compositor.py`.

### Phase 5 — Control Node
Build the NoOp with custom knobs, Generate/Clear button callbacks,
settings persistence. Module: `control.py`.

### Phase 6 — Integration + Polish
End-to-end testing, auto-layout, asset pipeline, menu registration, docs.

---

*Document version 0.1*
