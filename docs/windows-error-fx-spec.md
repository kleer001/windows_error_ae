# Windows Error FX — Visual Design Specification
### After Effects Plugin Reference Document v0.3

---

## Overview

This document catalogs every visual element type and defines how each is built, layered, and interacts with roto subjects. The overall aesthetic is **glitched Windows 9x/XP chaos** — a system collapsing in real time over live footage. The color world is cool, desaturated, blue-shifted. Everything feels digital, broken, and urgent.

---

## Color World

Before any FX elements are added, the base footage lives in a specific color space that makes everything feel cohesive:

- **Base grade:** Strong blue-indigo tint, desaturated (~30–50%), slight overexposure on highlights
- **Contrast:** Crushed blacks, pushed midtones — feels like footage being broadcast off a CRT monitor
- **The effect elements inherit this world** — they are NOT clean white-background windows. They are blended into the blue haze, often at 70–90% opacity with `Screen` or `Add` blending modes on their lighter parts
- **Scan lines:** A subtle horizontal line texture runs over the entire comp, suggesting a monitor refresh — thin 1–2px dark lines at ~20% opacity, evenly spaced

---

## Effect Element Types

### 1. BSOD Panels (Blue Screen of Death)

**What it looks like:**
Two visual eras are supported, selected per-instance via weighted random (60% XP, 40% 9x):

- **XP BSOD:** Solid navy blue background, Lucida Console font, hard left-aligned text block. No cursor. Text is the full XP crash dump (multi-paragraph).
- **Win9x BSOD:** Solid royal blue (`#0000AA`) background, Courier New font, centered text with a grey header bar. Blinking cursor at end. Shorter text block.

**Text content style:**
- Error codes: `*** STOP: 0x000000000`
- BSOD codes: `DRIVER_IRQL_NOT_LESS_OR_EQUAL`, `PAGE_FAULT_IN_NONPAGED_AREA`, etc.
- Hex addresses: `0xGN0135540F80`
- Era-specific text arrays (`BSOD_LINES_XP`, `BSOD_LINES_9X`) plus per-element custom messages

**Size variants (weighted):**
- Full-width banner strip (40%) — sits at top or bottom edge
- Corner fragment (30%) — cropped, as if the window is half off-screen
- Mid-frame island (30%) — floating rectangle

**Roto interaction:**
- BSODs live primarily **behind** the roto subject (80% under, 20% over in split mode)
- Partial BSODs can clip at the edge of the roto mask

---

### 2. Win9x Dialog Boxes (Error Windows)

**What it looks like:**
Three dialog variants, weighted by probability:

| Variant | Style | Weight | Body Color | Title Bar |
|---------|-------|--------|------------|-----------|
| A | Win95/98 Classic | 25% | `#C0C0C0` silver | `#000080` → `#1084D0` gradient |
| B | Win98/2000 Standard | 50% | `#D4D0C8` warm grey | `#0A246A` → `#A6CAF0` gradient |
| C | XP Luna | 25% | `#ECE9D8` cream | `#0054E3` → `#3D95FF` gradient |

Each variant defines its own border colors (light/dark/outer), button styles, and title bar height. Variant C has rounded corners (4px radius) and a red oval close button.

**Visual construction (drawn in AE as shape layers, no bitmaps):**
```
┌─────────────────────────────────┐  ← Title bar: gradient, height 18–25px
│ ⓧ  System Error                 │  ← White bold text
├─────────────────────────────────┤  ← 3D border effect (light top-left, dark bottom-right)
│                                 │  ← Body: variant-specific color
│  [icon]  Error message text     │  ← Icon: error (red), warning (gold), question (blue), or none
│          goes here in two lines │
│                                 │
│       [ OK ]  [ Cancel ]        │  ← Buttons: raised 3D style via overlapping borders
└─────────────────────────────────┘  ← Drop shadow: 2px black offset
```

**Icons (shape layer approximations):**
- Error: red circle with white X — `#CC0000`
- Warning: yellow triangle with black ! — `#FFCC00`
- Question: blue circle with white ? — `#0000CC`
- Info: blue circle with white i — `#0000CC`

**Size:** ~280×140px at 1080p scale (adjusted by virtual resolution setting)

**Roto interaction:**
- Dialogs appear **both over AND under** the roto subject (50/50 split in split mode)
- Cascading stacks: same dialog offset by `stackOffset` px diagonally, up to `stackDepth` deep

---

### 3. Window Chrome Fragments

Chrome fragments are a **25% sub-variant of the dialog type** in the scheduler — they share the dialog weight budget, not a separate category.

**What it looks like:**
Isolated pieces of window UI with no body — just a title bar, or button row, or close button.

**Fragment types:** `titleBar`, `buttonRow`, `closeBtn`, `scrollbar`, `titleStack`

**Roto interaction:**
- Chrome fragments are almost always **over** the subject — they are small UI debris
- When the parent dialog type has a per-element `rotoForce`, chrome fragments respect it

---

### 4. Corrupted Text Overlays

**What it looks like:**
Lines of monospace text (Courier New) floating freely over the frame, NOT inside any window box. They appear as if dumped directly to the screen by a system process.

**Text pool (`CORRUPT_TEXT_LINES`):**
- Code fragments: `for, unit_icon(?)make green)`, `r at manufacture.neomution`
- Hex strings: `0xDEADBEEF 0xCAFEBABE 0xFF00FF`
- Pseudo-error sentences: `windows can notify some your system`
- System output: `checking file system on C:`, `NTFS_FILE_SYSTEM`

**Visual style:**
- White text, semi-transparent: 50–85% opacity
- Lines can be cut off mid-word
- Character-level corruption: swap, block (█), or dropout — applied via HOLD keyframes

**Roto interaction:**
- Text overlays have no dedicated scheduler slot; they are generated as part of the text element type
- In split mode: assigned over or under based on global roto matrix

---

### 5. Mouse Cursor Artifacts

**What it looks like:**
The classic Windows arrow cursor drawn as a shape layer polygon (7-point path including inner notch). White fill with 1px black stroke. No bitmap dependency.

**Variants:**
- Single cursor in an unexpected location
- Ghost trail: 2–6 cursors at decreasing opacity following a lagged path
- Cursor cluster: 4–8 cursors overlapping in a loose group
- Various motion behaviors (see animation spec)

**Roto interaction:**
- Cursors almost always appear **in front of** everything (90% over in split mode)

---

### 6. Pixel Corruption Blocks

Five sub-variants, designed to look like broken video data rather than confetti:

| Sub-variant | Weight | Description |
|-------------|--------|-------------|
| `microScatter` | 30% | 5–15 tiny (1–3px) colored clusters, static in space |
| `rowSmear` | 20% | Footage strip repeated vertically (1–5px tall, 3–20 repetitions) |
| `blockDisplace` | 20% | Footage chunk offset from its original position (20–80px wide) |
| `scanlineShift` | 15% | 1–4 horizontal bands shifted sideways by 5–30px |
| `hTear` | 15% | Thin bright horizontal line (1–2px), half to full comp width |

**Color palette (7 colors):**
Black, white, BSOD blue (`#0000AA`), magenta, cyan, red, green

**Timing:** Hard entry/exit, no position animation. Static in space — the corruption doesn't move.

**Floor rule exception:** Pixel blocks have a 2-frame minimum lifespan (vs 8 frames for all other types).

**Roto interaction:**
- Can appear anywhere — 50/50 over/under in split mode

---

### 7. Freeze Strips

Horizontal strips frozen from a single frame of the source footage. Creates a "broken video buffer" effect.

**Sub-variants:**
| Sub-variant | Weight | Description |
|-------------|--------|-------------|
| `single` | 60% | One horizontal strip (1–64px tall) at a random Y position |
| `cluster` | 40% | 2–5 strips at nearby Y positions within a 200px vertical band |

**Construction:** Duplicates footage layer, time-remaps to a random freeze frame, masks to strip dimensions.

**Floor rule:** 2-frame minimum (same as pixel blocks).

**Skipped** if no footage layer is available in the comp.

**Roto interaction:**
- 50/50 over/under in split mode

---

### 8. Scan Lines, Noise & Head Scratch

These are **global overlays** — they go on top of the entire comp including roto subject.

**Scan Lines:**
- Horizontal dark bands at fixed vertical intervals (default 4px spacing)
- Opacity: default 20%, Multiply blend mode
- Optional jitter: scan lines shift by 1px vertically for a single frame

**Signal Noise:**
- Fractal noise effect on a solid layer
- Opacity: default 8%, configurable scale (default 100) and complexity (default 5)
- Re-randomizes every frame

**Head Scratch:**
- A 1–3px bright white/cyan horizontal line that appears for 2–4 frames at a random vertical position
- Frequency: every ~20 frames (configurable)
- Optional — disabled by default

---

## Chaos Level System

The chaos slider (0–100+) governs total element count via a power curve:

```
count = pow(chaos/100, 1.5) × 50 × (totalFrames/240)
```

When per-element counts are set to 0 (auto mode), chaos determines density using weighted type probabilities:

| Type | Auto-mode Weight |
|------|-----------------|
| Dialog | 75 |
| BSOD | 50 |
| Cursor | 50 |
| Pixel | 25 |
| Freeze | 15 |

When any per-element count is > 0, the scheduler uses exact counts instead of chaos-driven auto mode.

---

## Blend Mode System

Each element type has a weighted blend mode distribution:

| Type | Normal | Add | Screen | Overlay | Hard Light | Difference |
|------|--------|-----|--------|---------|------------|------------|
| BSOD | 40% | 18% | 18% | 10% | 10% | 4% |
| Pixel | 40% | 18% | 18% | 10% | 10% | 4% |
| Dialog | 60% | 12% | 12% | 6% | 6% | 4% |
| Cursor | 80% | 6% | 6% | 3% | 3% | 2% |
| Freeze | 90% | 3% | 3% | 2% | 1% | 1% |

---

## Trails (Echo Effect)

Any element can probabilistically receive an Echo effect:
- **Chance:** default 20% per element (configurable globally and per-element)
- **Echoes:** default 4 copies
- **Decay:** default 50% opacity reduction per echo
- Per-element trail overrides take priority over global settings

---

## Roto Layer Interaction Matrix

| FX Element | Behind Subject | In Front of Subject | Split Mode Weight |
|---|---|---|---|
| BSOD Panels | ✅ Primary | ✅ Some | 80% under, 20% over |
| Dialog Boxes | ✅ | ✅ | 50/50 |
| Chrome Fragments | ❌ Rare | ✅ Primary | Inherits dialog rotoForce |
| Corrupted Text | ✅ Some | ✅ Most | Standard assignment |
| Mouse Cursors | ❌ Rare | ✅ Primary | 90% over, 10% under |
| Pixel Blocks | ✅ | ✅ | 50/50 |
| Freeze Strips | ✅ | ✅ | 50/50 |
| Scan Lines / Noise | — | ✅ Global top layer | Always above everything |

Per-element `rotoForce` override can force any type to always go "over" or "under".

---

## Dialog Window Content — Built-In Message Pools

### Title bar strings (`WINDOW_TITLES`):
`System Error`, `Fatal Error`, `Runtime Exception`, `License Wizard`, `System Restore`, `Windows Protection Error`, `Application Error`, `Explorer.exe`, `Not Responding`, `Error`, `Warning`, `Microsoft Visual C++ Runtime`

### Body text strings (`ERROR_MESSAGES`):
15 built-in messages including hex placeholder substitution (`%HEX%` → random hex codes).

### Button combinations (`BUTTON_COMBOS`):
`[OK]`, `[OK, Cancel]`, `[Retry, Cancel]`, `[Yes, No]`, `[Abort, Retry, Ignore]`, `[OK, Help]`

### BSOD lines:
Era-specific arrays (`BSOD_LINES_XP`, `BSOD_LINES_9X`) with hex and code placeholders.

All text and positions are **seeded** — same seed = same output every render.

Custom messages can be added globally or per-element type (dialog gets messages + titles, BSOD gets messages only).

---

## Layer Naming Convention for Roto Detection

The plugin detects roto layers by scanning comp layer names (case-insensitive) for:
`roto`, `rotoscope`, `matte`, `cutout`, `subject`, `fg`

Users can add extra keywords via the UI.

---

## Output Structure (Pre-Comp Approach)

When the script runs, it generates:

```
[Your Comp]
  └── WindowsErrorFX_[seed] [PRE-COMP]
        ├── OVER group   [elements in front of roto subject]
        ├── UNDER group  [elements behind roto subject]
        ├── SCANLINES    [full comp size, multiply mode]
        ├── NOISE        [full comp size, overlay mode]
        └── HEAD SCRATCH [optional, full comp size]
```

In flat mode (no roto), all elements go into a single comp. All elements are native AE shape layers and text layers — no external assets.

---

## Virtual Resolution

Elements can be scaled to a virtual resolution for authentic period-correct sizing:

| Preset | Resolution |
|--------|-----------|
| 640×480 | VGA |
| 800×600 | SVGA |
| 1024×768 | XGA (default) |
| 1280×1024 | SXGA |
| Native | No scaling |

Scale factor = `compWidth / virtualResolutionWidth`. Applied to dialog dimensions, font sizes, cursors, pixel blocks, and freeze strip heights.

---

## Fonts

1. **Lucida Console** — BSOD text (XP era)
2. **Courier New** — BSOD text (9x era), text overlays, monospace fallback
3. **Arial** — dialog box body text and button labels

---

*Document version 0.3 — updated to match implementation*
