# Windows Error FX — Visual Design Specification
### After Effects Plugin Reference Document

---

## Overview

This document catalogs every visual element type observed in the reference footage and defines how each should be built, layered, and interact with roto subjects. The overall aesthetic is **glitched Windows 9x/XP chaos** — a system collapsing in real time over live footage. The color world is cool, desaturated, blue-shifted. Everything feels digital, broken, and urgent.

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
Solid royal blue (`#0000AA` classic Windows BSOD) rectangles — some full-width strips across the frame, some partial corner/edge fragments. White monospace text (Courier or Fixedsys equivalent) printed on them.

**Text content style:**
- Error codes: `*** STOP: 0x000000000`
- Hex addresses: `0xGN0135540F80`
- Fragment sentences: `Technical Information:`, `select with R...`, `sppliting errors or team`
- Deliberately corrupted spelling: "sppliting", "sppjscting", "crshie" — intentional glitch text

**Size variants:**
- Full-width banner strip (sits at bottom or top edge, 80–120px tall)
- Corner fragment (cropped, as if the window is half off-screen)
- Mid-frame island (floating rectangle, rotated 0–3°)

**Roto interaction:**
- BSODs live **behind** the roto subject — subject cuts through them
- Partial BSODs can clip at the edge of the roto mask, creating a "system invading the person's space" feel
- At high chaos levels, small BSOD strips can appear briefly **in front** of the roto subject for 2–4 frames

---

### 2. Win9x Dialog Boxes (Error Windows)

**What it looks like:**
Classic Windows 98/XP style dialog boxes. Grey body (`#D4D0C8`), blue title bar (`#000080`), white title text, small icon in top-left (red ⓧ, warning triangle ⚠, or question mark). Body contains dummy text. Buttons at bottom: `OK`, `Cancel`, `Try Again`.

**Visual construction (drawn in AE, no bitmaps required):**
```
┌─────────────────────────────────┐  ← Title bar: #000080, height ~18px
│ ⓧ  System Error                 │  ← White 8px bold sans-serif text
├─────────────────────────────────┤  ← 1px dark border
│                                 │  ← Body: #D4D0C8
│  [icon]  Error message text     │
│          goes here in two lines │
│                                 │
│       [ OK ]  [ Cancel ]        │  ← Buttons: raised 3D style via borders
└─────────────────────────────────┘  ← Drop shadow: 2px black offset
```

**Size variants:**
- Full dialog (~280×140px at 1080p scale)  
- Partial/cropped dialog — title bar only, or just button row peeking in from edge
- Cascading stack — same dialog offset 8–12px diagonally, 3–6 deep (the "spam cascade")

**Roto interaction:**
- Primary interaction point: dialogs appear **both over AND under** the roto subject
- **Under:** Dialog is behind subject — subject's silhouette masks part of the window, subject appears to be standing in front of a crashing computer
- **Over:** Dialog floats in front of subject's face or body — feels invasive, system overtaking the person
- **Layered split:** A dialog can be behind the subject's body but the title bar pokes above their shoulder

---

### 3. Window Chrome Fragments

**What it looks like:**
Isolated pieces of window UI with no body — just a title bar, or just a row of minimize/maximize/close buttons (`—  □  ✕`), or just a scrollbar strip. These are the "debris" of a crashing system.

**Examples seen in reference:**
- Stacked rows of window title bars only, cascading down the left edge
- Single close button (red ⓧ) in a corner with no window attached
- Scrollbar slider appearing mid-frame

**Roto interaction:**
- These are almost always **over** the subject — they are small enough to feel like UI debris landing on the person
- Can briefly appear over a face for comedic/dramatic effect

---

### 4. Corrupted Text Overlays

**What it looks like:**
Lines of monospace text (Courier New or a pixel/bitmap font like Fixedsys, Perfect DOS VGA, or Press Start 2P) floating freely over the frame, NOT inside any window box. They appear as if dumped directly to the screen by a system process.

**Text types:**
- Code fragments: `for, unit_icon(?)make green)`, `r at manufacture.neomution`
- Hex strings: `roF00F00000, 0xGN0135540F80`
- Pseudo-error sentences: `windows can notify some your system`, `change for framswork, grove`
- Variable/code syntax: `is equal)`, `omFO_1-100`, `DE ENOL tronz)`

**Visual style:**
- White or light cyan text
- Semi-transparent: 60–80% opacity
- Occasional single characters appear corrupted or replaced with block characters
- Lines have varying opacity — some nearly ghosted, some solid
- Lines can be **cut off mid-word** as if the buffer was truncated

**Roto interaction:**
- Text overlays pass **over everything** — both background and roto subject
- Some lines can be masked to only appear in the background (behind subject) for a layered look
- Lines drift or jump slightly frame-to-frame (1–3px random offset) to feel unstable

---

### 5. Mouse Cursor Artifacts

**What it looks like:**
The classic Windows arrow cursor (white with black outline, angled top-left). Appears as multiples — ghost trails, clusters, echoes.

**Variants:**
- Single cursor in an unexpected location (mid-frame, over a face)
- Ghost trail: 3–5 cursors at decreasing opacity following a path
- Cursor cluster: 4–8 cursors overlapping in a loose group, all slightly different sizes
- Glitch cursor: cursor appears for 1–2 frames, disappears, reappears offset

**Roto interaction:**
- Cursors almost always appear **in front of** everything — they are the OS layer on top
- Exception: one cursor can be slipped behind the roto subject as if the subject has "stepped through" the screen

---

### 6. Pixel Corruption Blocks

**What it looks like:**
Small rectangular blocks of solid color — black, white, and the WinXP blue — that appear as if the video buffer has corrupted. Not full glitch lines, but compact rectangles 4–40px wide.

**Variants:**
- Single pixel row artifact: 1–2px high horizontal line spanning full width or partial width
- Block cluster: 3–8 small rectangles near each other, slightly offset
- Compression artifact: larger block (~40×30px) that looks like a JPEG artifact in solid color

**Roto interaction:**
- Can appear anywhere — over and under subject
- When they appear on the roto subject's face or hands it reads as the system "eating" the person's pixels

---

### 7. Scan Lines & Signal Noise

**What it looks like:**
- Horizontal dark bands, very thin, evenly spaced across the entire comp (CRT scan line effect)
- Occasional full-width bright horizontal slice (1–4px) that flickers — a "head scratch" read artifact
- Random grain/noise layer over everything

**Roto interaction:**
- These are **global** — they go on top of the entire comp including roto subject
- They are what make everything feel like it's being displayed on a monitor, not composited

---

## Chaos Level System

The plugin outputs within a defined intensity range. These map to the visual density of elements:

| Level | Name | What's Happening |
|---|---|---|
| 0–20% | **Calm** | 1–2 dialog boxes, barely visible scan lines, no text overlays |
| 20–40% | **Glitching** | 3–4 dialogs, some text overlays, one BSOD strip, occasional cursor |
| 40–60% | **Crashing** | Cascading dialogs, BSOD panels, active cursor clusters, text rain |
| 60–80% | **Meltdown** | Max dialogs, pixel corruption, heavy text, multiple BSOD strips |
| 80–100% | **Total Failure** | Screen-eating, dialogs over half the frame, image breaking apart |

---

## Roto Layer Interaction Matrix

| FX Element | Behind Subject | In Front of Subject | Notes |
|---|---|---|---|
| BSOD Panels | ✅ Primary | ✅ Brief flashes only | Split at subject edge for depth |
| Dialog Boxes | ✅ Primary | ✅ Allowed | Can straddle — half behind, half in front |
| Window Chrome Fragments | ❌ | ✅ Primary | Debris lands on top |
| Corrupted Text | ✅ Some lines | ✅ Most lines | Mix for layering effect |
| Mouse Cursors | ❌ Rare | ✅ Primary | Almost always top layer |
| Pixel Blocks | ✅ | ✅ | Equal split |
| Scan Lines / Noise | — | ✅ Global top layer | Always above everything |

---

## Dialog Window Content — Built-In Message Pool

All windows draw from a built-in pool of fake-but-plausible Windows error text. No external library needed — we generate these programmatically. Examples:

**Title bar strings:**
- `System Error` / `Fatal Error` / `Runtime Exception` / `License Wizard` / `System Restore`

**Body text strings:**
- `A problem has been detected and windows has been set to shut down to prevent damage.`
- `This application has performed an illegal operation and will be shut down.`
- `The procedure entry point could not be located in the dynamic link library.`
- `Insufficient system resources exist to complete the requested service.`
- `The instruction at 0x[HEX] referenced memory at 0x[HEX]. The memory could not be read.`

**Hex error codes** (randomly generated per seed):
- `STOP: 0x[8 random hex chars]`
- `Error code: 0x[8 random hex chars]`

**Button combinations:**
- `OK` only
- `OK` + `Cancel`
- `Retry` + `Cancel` + `Ignore`
- `Yes` + `No`

All text and positions are **seeded** — same seed = same output every render. Change the seed = new random layout.

---

## Layer Naming Convention for Roto Detection

The plugin detects roto layers by scanning comp layer names (case-insensitive) for:
- `roto`
- `rotoscope`
- `matte`
- `cutout`
- `subject`
- `fg` (foreground)

Any layer matching these patterns is treated as a roto holdout and used to drive the over/under compositing logic.

---

## Output Structure (Pre-Comp Approach)

When the script runs, it generates:

```
[Your Comp]
  └── WindowsErrorFX_v1 [PRE-COMP]
        ├── OVER_ROTO_GROUP  [shape layers — elements that go IN FRONT]
        ├── [Your Roto Layer] ← reference only, not moved
        ├── UNDER_ROTO_GROUP [shape layers — elements that go BEHIND]
        ├── SCANLINES        [full comp size, multiply mode]
        └── NOISE            [full comp size, overlay mode]
```

The editor can tweak, keyframe, or delete anything inside the pre-comp. All elements are native AE shape layers and text layers — no external assets required.

---

## Fonts Required

The plugin will check for and fall back gracefully:

1. **Fixedsys Excelsior** — closest to authentic Windows system font (free, widely available)
2. **Courier New** — universal fallback, present on all systems
3. **Arial** — used for dialog box body text and button labels

If Fixedsys is not installed, Courier New is used for all monospace/BSOD/code text.

---

*Document version 0.1 — generated alongside plugin development*
