# Windows Error FX — Animation Specification
### After Effects Plugin Reference Document v0.1

---

## Global Animation Rules

### The Floor Rule
**No element has a lifespan shorter than 8 frames.** This is a hard minimum. Even the most chaotic, twitchy glitch element must be visible for at least 8 frames before disappearing. This prevents subliminal flicker that reads as noise rather than intent.

| Parameter | Minimum | Default | Maximum |
|---|---|---|---|
| Element lifespan | 8 frames | 24 frames | 96 frames |
| Entry animation | 1 frame | 2 frames | 8 frames |
| Exit animation | 0 frames | 1 frame | 6 frames |

**Why:** Sub-8-frame elements feel like compression artifacts. 8+ frames feel like *events* — the eye registers them as intentional intrusions.

### Frame Budget
At any given frame, the total number of *active* elements is governed by the Chaos Level (see spec v0.1). Elements are staggered in time — they do **not** all appear at once unless Chaos is at 80–100%.

### The Seed
All random timing, positioning, and sequencing derives from the user's seed value. Same seed = identical animation every render. The seed is used to generate deterministic random offsets for each element instance.

### Easing Vocabulary
The Windows error world uses **almost no easing**. Things pop in, cut off, and slam to a stop. The OS doesn't care about motion principles.

| Motion type | Easing | Notes |
|---|---|---|
| Pop in | Linear, 1–2 frames | Instant on |
| Slide | Linear only | No ease-in or ease-out |
| Exit/dismiss | Linear or cut | Never eases out gracefully |
| Glitch jump | Cut (0 frame) | Teleport, not tween |
| Shake | Alternating ±offset | No damping |

---

## Element-by-Element Animation

---

### 1. BSOD Panels

BSODs are the heaviest, most stable elements. They anchor the chaos.

#### Behavior Types

**A — Static Hold**
The panel appears instantly (1 frame) and holds for its full lifespan with no movement. Text is legible and still. This is the baseline.

```
Frame 0:     [APPEAR — cut in, full opacity]
Frame 1–N:   [HOLD — no movement]
Frame N+1:   [DISAPPEAR — cut out, 0 frames]
```

**B — Horizontal Slide**
The panel enters from the left or right edge and slides across the frame at a constant linear speed. It does not stop — it traverses and exits the opposite side. Speed range: 20–80px per frame.

```
Frame 0:     [Off screen left/right]
Frame 1–N:   [Linear slide, constant velocity]
Frame N+1:   [Off screen opposite side — element ends]
```

**C — Vertical Slide**
Same as horizontal but top-to-bottom or bottom-to-top. Used for the narrow full-width strip variants. Feels like a system readout scrolling.

**D — Stutter Slide**
Slides in one direction but freezes for 3–6 frames mid-travel, then continues. Exactly one freeze per traversal. Feels like the render thread hitching.

```
Frame 0–8:   [Sliding]
Frame 9–14:  [FREEZE — position locked]
Frame 15–N:  [Sliding continues, same velocity]
```

**E — Snap to Edge**
The BSOD appears already partially off-screen — anchored to an edge — and never moves. A fragment, not a full panel. Most common for corner BSODs.

#### BSOD Text Animation
Text within a BSOD panel can optionally animate independently:

- **Static:** Text appears with the panel, does not change
- **Typewriter:** Characters appear one at a time, 1–2 chars per frame — only on Static Hold panels
- **Line shuffle:** Every 8–16 frames, one line of text is replaced by a different line from the pool (a quick cut swap, not a crossfade)

---

### 2. Win9x Dialog Boxes

Dialog boxes are the most character-rich elements. They have arrival, a life, and a death.

#### Arrival Behaviors

**A — Instant Pop**
The dialog box appears at full size, full opacity, in a single frame. Classic Windows behavior. Default.

**B — Scale Pop**
Scales from ~80% to 100% over 2 frames. Very fast. Feels like the OS is rendering it into existence. Not a smooth scale — 3 steps max (80% → 95% → 100%).

**C — Slide In from Edge**
Enters from the nearest edge of frame, slides to its resting position linearly in 3–6 frames, then snaps to a hard stop.

#### Life Behaviors

**A — Static Hold**
The dialog sits at its spawn position for its full lifespan. Clean, readable, purposeful.

**B — Drift**
Very slow linear movement in a random direction — 0.5–2px per frame. Barely perceptible. Makes the window feel unmoored, like the OS has lost track of where it put it.

**C — Diagonal Stack Cascade**
This is the signature dialog behavior. When 2 or more dialogs of the same type (same title) are active simultaneously, each new one spawns offset from the previous by `(+10px X, +10px Y)`. This creates the iconic cascading stack.

```
Dialog 1:  Position (200, 300)
Dialog 2:  Position (210, 310)  — spawns 8–16 frames after Dialog 1
Dialog 3:  Position (220, 320)  — spawns 8–16 frames after Dialog 2
Dialog 4:  Position (230, 330)  — etc.
```

Maximum stack depth: 8 dialogs. After 8, the oldest one is cut out as a new one appears — the stack maintains its depth, walking across the frame.

**D — Shake (Panic)**
The dialog shakes horizontally — rapidly alternates between `(X-3)` and `(X+3)` every 2 frames, for a burst of 8–16 frames. Triggered randomly during its lifespan, not continuously. Feels like the OS is trying to get your attention.

```
Frames 1–2:   X - 3px
Frames 3–4:   X + 3px
Frames 5–6:   X - 3px
...
(burst of 8–16 frames, then returns to base position)
```

#### Exit Behaviors

**A — Instant Cut**
Gone in one frame. The OS killed it.

**B — Collapse**
Scales from 100% to 0% over 3 frames (100% → 50% → 20% → gone). Fast. Feels like the window being dismissed by force.

**C — Slide Off Edge**
Moves to the nearest frame edge at 2x its entry speed and disappears off-screen.

---

### 3. Window Chrome Fragments

These are debris — they have no gravity or purpose. Short lifespans, erratic behavior.

#### Behaviors

**A — Static Flicker**
Appears, holds for 8–24 frames, disappears. May briefly blink off for 1–2 frames mid-hold (opacity: 0 for 1–2 frames, then back).

**B — Drift & Fade**
Slow linear drift in a random direction, with opacity gradually reducing from 100% to 0% over its lifespan. The only element that fades rather than cutting.

**C — Jump Cut Position**
Every 6–12 frames, the fragment teleports to a new position (±40–120px from current). Does not animate between positions — it's a cut. Feels like a UI element the OS can't decide where to place.

#### Title Bar Only Strips
When the fragment is just a title bar row (no body), it can appear as part of a vertical stack — 3–6 title bars stacked flush with the left edge of frame, each with a different title text. This stack is static.

---

### 4. Corrupted Text Overlays

Text overlays are the most freeform element. They feel like a system log being dumped to the display buffer.

#### Line Behaviors

**A — Static Print**
A line appears (1 frame) and holds for its duration. No movement. The most legible variant.

**B — Horizontal Scan**
The line appears at the left edge and reveals letter-by-letter moving right — not a typewriter effect, but more like a scan beam exposing the text at 8–20 characters per frame.

**C — Vertical Scroll (Log Dump)**
Multiple lines appear in a column, new lines pushing up from the bottom — like a terminal output streaming. Each line enters from the bottom of the column and pushes previous lines up. The topmost lines fade to 0% opacity as they reach the column ceiling.

**D — Ghost Drift**
Text is at 30–50% opacity and moves very slowly upward or downward (0.3–1px per frame) for its entire lifespan. Feels like video burn-in.

#### Character Corruption
Independently of line behavior, individual characters within a text line can corrupt:

- **Swap:** A character randomly replaces with a different character from the same line's pool. Happens once per 8–16 frames per line.
- **Block:** A character becomes a solid rectangle (█) for 2–4 frames, then returns to normal.
- **Dropout:** A character goes invisible for 2–3 frames.

These are applied per-character via expression-driven random selection, seeded per line.

---

### 5. Mouse Cursor Artifacts

The cursor has personality. It is the only element with *intentionality* — it appears to be trying to do something, failing, or lost.

#### Cursor Behaviors (Mutually Exclusive Per Instance)

**A — Frozen**
The cursor appears and does not move for its entire lifespan. It's just... there. Staring. Duration: 16–48 frames. Maximum unease.

**B — Circular Orbit**
The cursor moves in a perfect circle (or slightly elliptical) around a center point. Radius: 40–120px. Speed: 4–12° per frame. It is going nowhere, doing nothing. 

```
X = centerX + radius * cos(angle)
Y = centerY + radius * sin(angle)
angle += speed_per_frame
```

Completes 0.5–2 full orbits before disappearing.

**C — Corner Seek**
The cursor moves in a straight line toward one of the four frame corners. Linear, constant speed (6–18px/frame). When it reaches the corner (or exits frame), it disappears. Feels purposeful but wrong — like the OS is trying to escape.

**D — Random Walk (Lost)**
Every 8–16 frames, the cursor jumps to a new position within ±80px of its current position. No path between positions — just teleports. Then freezes for its jump interval, then teleports again.

**E — Glitch Stutter**
The cursor attempts to move in a direction but stutters — takes 2 frames forward, then jumps back to near-origin, then forward again. Net displacement is slow but the motion is jittery and anxious.

```
Frames 1–2:   Move +8px toward target
Frames 3–4:   Jump back to (origin + 2px)
Frames 5–6:   Move +8px toward target
...
```

**F — Ghost Trail (Multiple Cursors)**
2–6 cursor instances spawn at the same position but are staggered in time by 3–6 frames each. Each follows the same motion path as the lead cursor but lags behind, creating a motion trail effect. Each trail cursor is at progressively lower opacity (80%, 60%, 40%, 20%).

#### Cursor Cluster
A group of 4–8 cursors spawned simultaneously at nearby positions (within 60px of each other), each with independently randomized Frozen or Circular Orbit behavior. They do not interact with each other. The cluster reads as a cursor infestation.

---

### 6. Pixel Corruption Blocks

These are the fastest, most violent elements. They are system damage.

#### Behaviors

**A — Instant Flash**
Appears for exactly 1–4 frames. Never longer. This is below the Floor Rule — pixel blocks are the only exception because they are not meant to be read, only felt.

> **Floor Rule Exception:** Pixel corruption blocks may be as short as **2 frames** minimum. They are the only exception.

**B — Stutter Hold**
Appears for 8–12 frames but flickers — alternates between visible and invisible every 2 frames.

**C — Horizontal Tear**
A full-width 1–2px line that appears and holds for 8–16 frames. It is at a fixed vertical position. One of the most readable glitch artifacts.

**D — Block Crawl**
A cluster of 3–6 small blocks that each independently jump to new nearby positions every 4–8 frames. The cluster stays loosely cohesive (within 80px of a center point) but appears unstable.

---

### 7. Scan Lines & Signal Noise

These are global overlays. They do not have individual animation — they operate on the entire comp.

#### Scan Line Behavior
- Static horizontal lines at fixed vertical intervals (every 4–8px)
- Opacity: 15–25%, blending mode: Multiply
- Optionally: every 24–48 frames, scan lines shift by 1px vertically for a single frame (rolling sync artifact)

#### Signal Noise
- Gaussian noise layer, low amplitude
- Re-randomizes every frame (or every 2 frames for a coarser look)
- Opacity: 5–15%

#### Head Scratch (Bright Horizontal Slice)
- A 1–3px bright white/cyan horizontal line that appears for 2–4 frames at a random vertical position
- Occurs every 12–30 frames (seeded interval)
- This is the only scan-line animation event

---

## Animation Timing Summary Table

| Element | Min Life | Default Life | Max Life | Entry | Exit | Can Loop? |
|---|---|---|---|---|---|---|
| BSOD Panel | 8f | 36f | 96f | 1f cut | 1f cut | Yes (slide) |
| Dialog Box | 8f | 24f | 72f | 1–6f | 1–3f | No |
| Chrome Fragment | 8f | 16f | 48f | 1f cut | 1f cut/fade | No |
| Text Overlay | 8f | 20f | 60f | 1f / scan | 1f cut | Yes (scroll) |
| Cursor | 8f | 32f | 96f | 1f cut | 1f cut | Yes (orbit) |
| Pixel Block | **2f** | 4f | 16f | 1f | 1f | No |
| Scan Lines | — | Comp duration | — | — | — | Always on |

---

## Inter-Element Timing

Elements are not all active at once. They are scheduled across the comp duration using the seed to create a staggered, organic feel.

**Spawn spacing:** Minimum 4 frames between any two new element spawns (at default chaos). At max chaos, this drops to 1–2 frames.

**Density curve:** The plugin can optionally apply a density curve across the comp — starting sparse, building to a peak, then optionally resolving. This maps to a simple easing ramp on the spawn rate, user-adjustable.

**Element overlap:** Elements can coexist freely. No collision detection. Overlap is intentional and desirable — it adds to the sense of system overload.

---

*Document version 0.1 — companion to windows-error-fx-spec.md*
