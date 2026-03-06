# Windows Error FX — Animation Specification
### After Effects Plugin Reference Document v0.3

---

## Global Animation Rules

### The Floor Rule
**No element has a lifespan shorter than 8 frames**, except pixel corruption blocks and freeze strips which have a **2-frame minimum**. This prevents subliminal flicker that reads as noise rather than intent.

| Parameter | Minimum | Default | Maximum |
|---|---|---|---|
| Element lifespan | 8 frames (2 for pixel/freeze) | Per-type | 96 frames |
| Entry animation | 1 frame | 3 frames | configurable |
| Exit animation | 0 frames | 2 frames | configurable |

### Frame Budget
Elements are staggered in time using a chaos curve distribution. They do **not** all appear at once unless chaos is very high.

### The Seed
All random timing, positioning, and sequencing derives from the user's seed value via a deterministic PRNG (mulberry32). Same seed = identical animation every render.

### Easing Vocabulary
The Windows error world uses **almost no easing**. Things pop in, cut off, and slam to a stop.

| Motion type | Easing | Notes |
|---|---|---|
| Pop in | Linear, 1–2 frames | Instant on |
| Slide | Linear only | No ease-in or ease-out |
| Exit/dismiss | Linear or cut | Never eases out gracefully |
| Glitch jump | Cut (0 frame) | Teleport, not tween |
| Shake | Alternating ±offset | No damping |

### Per-Element Controls
Every element instance has these properties resolved from per-type settings:
- **scale** — size multiplier (default 100%)
- **speedMult** — animation speed multiplier (default 100%)
- **opacity** — clamped between per-type opacityMin and opacityMax
- **entryFrames** — arrival animation duration (default 3f)
- **exitFrames** — exit animation duration (default 2f)

### Animation Style Presets
Applied as modifiers on top of per-element defaults:

| Style | Effect |
|---|---|
| **XP Classic** | Default. Snappy cuts, linear slides, instant pops. |
| **Glitch Heavy** | More stutter, more shake, higher corruption rate. Increases glitch behavior weights. |
| **Slow Burn** | Longer lifespans (min 16f), more static holds. Creeping dread. |
| **Chaos Maximum** | Shortest lifespans (max 36f), everything at once. |

---

## Element-by-Element Animation

---

### 1. BSOD Panels

BSODs are the heaviest, most stable elements. They anchor the chaos.

#### Behavior Types (weighted)

| Behavior | Weight (default) | Weight (slowBurn) | Weight (glitchHeavy) |
|----------|-----------------|-------------------|---------------------|
| **Static Hold** | 60% | 80% | — |
| **Horizontal Slide** | 15% | — | 25% |
| **Vertical Slide** | 10% | — | — |
| **Stutter Slide** | 10% | — | 20% |
| **Snap to Edge** | 5% | — | — |

**Static Hold:** Panel appears instantly and holds for its full lifespan with no movement.

**Horizontal/Vertical Slide:** Panel enters from one edge and slides across at constant speed (20–80px/frame). Does not stop.

**Stutter Slide:** Slides but freezes for 3–6 frames mid-travel, then continues. One freeze per traversal.

**Snap to Edge:** Panel appears already partially off-screen, anchored to an edge. Never moves.

#### BSOD Text Animation (weighted: 70/15/15)
- **Static:** Text appears with the panel, does not change
- **Typewriter:** Characters appear 1–2 per frame — only on Static Hold panels
- **Line Shuffle:** Every 8–16 frames, one line swaps with a different line from the pool

---

### 2. Win9x Dialog Boxes

Dialog boxes are the most character-rich elements. They have arrival, a life, and a death.

#### Arrival Behaviors (weighted: 60/20/20)

| Behavior | Description |
|----------|-------------|
| **Instant Pop** | Full size, full opacity, 1 frame. Default. |
| **Scale Pop** | 80% → 95% → 100% over 2 frames. |
| **Slide In** | Enters from nearest edge, 3–6 frames linear. |

#### Life Behaviors (weighted, style-dependent)

| Behavior | Default | Slow Burn | Glitch Heavy |
|----------|---------|-----------|--------------|
| **Static Hold** | 40% | 60% | — |
| **Drift** | 30% | 30% | — |
| **Shake** | 30% | — | 50% |

**Drift:** 0.5–2px/frame in a random direction. Barely perceptible.

**Shake:** Alternates ±3px horizontally every 2 frames for 8–16 frame bursts.

**Diagonal Stack Cascade:** When 2+ dialogs share the same title, each offsets by `stackOffset` px diagonally. Max depth controlled by `stackDepth` setting (default 8). Stack walks across the frame as oldest dialogs exit and new ones appear.

#### Exit Behaviors (weighted: 50/25/25)

| Behavior | Description |
|----------|-------------|
| **Instant Cut** | Gone in 1 frame. |
| **Collapse** | 100% → 50% → 20% → gone over 3 frames. |
| **Slide Off** | Moves to nearest edge at 2× entry speed. |

---

### 3. Window Chrome Fragments

These are debris — short lifespans, erratic behavior. Chrome fragments are a 25% sub-variant of the dialog type (share dialog's scheduler weight).

#### Behaviors
- **Static Flicker:** Holds for 8–24 frames, may blink off for 1–2 frames mid-hold.
- **Drift & Fade:** Slow linear drift with opacity reducing from 100% → 0%.
- **Jump Cut Position:** Teleports ±40–120px every 6–12 frames. No tween.

---

### 4. Corrupted Text Overlays

Text overlays are the most freeform element. They feel like a system log being dumped to the display buffer.

#### Line Behaviors (weighted: 30/25/25/20)

| Behavior | Description |
|----------|-------------|
| **Static Print** | Appears and holds. Most legible. |
| **Horizontal Scan** | Reveals left-to-right at 8–20 chars/frame. |
| **Vertical Scroll** | Lines push up from bottom, topmost fades to 0%. |
| **Ghost Drift** | 30–50% opacity, 0.3–1px/frame vertical drift. Video burn-in feel. |

#### Character Corruption (40% chance default, 60% in Glitch Heavy)
- **Swap:** Character replaced with different character every 8–16 frames
- **Block:** Character becomes █ for 2–4 frames
- **Dropout:** Character goes invisible for 2–3 frames

Applied via HOLD keyframes with pre-generated corrupted text variants.

---

### 5. Mouse Cursor Artifacts

The cursor has personality — it appears to be trying to do something, failing, or lost.

#### Cursor Behaviors (weighted, mutually exclusive per instance)

| Behavior | Weight | Description |
|----------|--------|-------------|
| **Frozen** | 25% | Motionless for 16–48 frames. Maximum unease. |
| **Circular Orbit** | 15% | Radius 40–120px, 4–12°/frame. Going nowhere. |
| **Corner Seek** | 15% | Straight line toward a frame corner at 6–18px/frame. |
| **Random Walk** | 15% | Teleports ±80px every 8–16 frames. |
| **Glitch Stutter** | 10% (20% glitchHeavy) | 2 frames forward, jumps back, repeat. Jittery. |
| **Ghost Trail** | 10% | 2–6 instances staggered by 3–6 frames, decreasing opacity. |
| **Cluster** | 10% | 4–8 cursors within 60px, each with independent behavior. |

---

### 6. Pixel Corruption Blocks

Five sub-variants. All are **static in space** — the corruption doesn't move, it just appears and disappears.

| Sub-variant | Weight | Timing | Description |
|-------------|--------|--------|-------------|
| **microScatter** | 30% | Hard in/out | 5–15 tiny colored clusters (1–3px), shape layers |
| **rowSmear** | 20% | Hard or short fade | Footage strip repeated vertically |
| **blockDisplace** | 20% | Hard or short fade | Footage chunk offset from original position |
| **scanlineShift** | 15% | Hard in/out | 1–4 horizontal bands shifted sideways |
| **hTear** | 15% | Hard in/out | Thin bright line, half to full comp width |

**Floor Rule Exception:** 2-frame minimum lifespan. These are system damage — felt, not read.

---

### 7. Freeze Strips

Frozen horizontal strips from source footage. Static hold — no position animation.

| Sub-variant | Weight | Description |
|-------------|--------|-------------|
| **single** | 60% | One strip, 1–64px tall, random Y |
| **cluster** | 40% | 2–5 strips within a 200px vertical band, 2–20px gaps |

**Timing:** Hard or short fade in/out. Same freeze frame for all strips in a cluster.

**Floor Rule:** 2-frame minimum (same as pixel blocks).

**Requires footage:** Skipped if no footage layer is available.

---

### 8. Scan Lines, Noise & Head Scratch

Global overlays — operate on the entire comp for the full duration.

**Scan Lines:** Static horizontal lines at fixed intervals. Optional jitter (1px shift for 1 frame).

**Noise:** Fractal noise, re-randomizes every frame. Low opacity (5–15%).

**Head Scratch:** Bright horizontal slice, 1–3px tall, appears for 2–4 frames at configurable intervals. Disabled by default.

---

## Animation Timing Summary Table

| Element | Min Life | Default Range | Max Life | Entry | Exit | Floor Rule |
|---|---|---|---|---|---|---|
| BSOD Panel | 8f | per settings | 96f | configurable | configurable | 8f |
| Dialog Box | 8f | per settings | 96f | configurable | configurable | 8f |
| Chrome Fragment | 8f | per settings | 96f | configurable | configurable | 8f |
| Text Overlay | 8f | per settings | 96f | configurable | configurable | 8f |
| Cursor | 8f | per settings | 96f | configurable | configurable | 8f |
| Pixel Block | **2f** | per settings | 96f | configurable | configurable | **2f** |
| Freeze Strip | **2f** | per settings | 96f | configurable | configurable | **2f** |
| Scan Lines | — | Comp duration | — | — | — | N/A |

Entry/exit frame counts are configurable per element type (defaults: 3f entry, 2f exit).

---

## Chaos Curves

Controls density distribution of elements across the timeline:

| Curve | Description |
|---|---|
| **Flat** | Uniform random distribution. Default. |
| **Build** | Right-skewed: `max(rng(), rng())`. More elements toward the end. |
| **Peak** | Bell curve: `(rng() + rng() + rng()) / 3`. Dense in the middle. |
| **Burst** | 2–3 clusters: elements concentrated around random center points (±10% spread). |
| **Random** | 4–8 weighted segments with heavy variation. Unpredictable density pockets. |

Per-element curve overrides: each element type can use a different curve. Types are grouped by their effective curve, and each group gets an independent `distributeTimes()` call.

---

## Trails (Echo Effect)

Probabilistic per-element. When triggered, adds an Echo effect to the element layer.

- **Chance:** default 20% per element
- **Echoes:** default 4 copies
- **Decay:** default 50% opacity reduction per echo
- Per-element trail settings override global settings
- Controlled independently for each element type via per-element UI tabs

---

*Document version 0.3 — updated to match implementation*
