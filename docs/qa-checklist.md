# Windows Error FX — QA Checklist
### test/qa-checklist.md v0.1

Manual testing checklist for verifying `WindowsErrorFX.jsx` in After Effects. Run through this in order when AE access is available. Check off each item. Note failures with the AE version, OS, and any error text from the Info panel.

---

## Test Environment

Before starting, record:

- [ ] AE Version: _______________
- [ ] OS: _______________
- [ ] Script location: `Scripts/ScriptUI Panels/` or run via `File > Scripts`?
- [ ] "Allow Scripts to Write Files" enabled in Preferences? Yes / No

---

## 1. Installation & Panel Load

- [ ] Script file copied to `Scripts/ScriptUI Panels/`
- [ ] AE restarted after install
- [ ] Panel appears in `Window` menu as `WindowsErrorFX`
- [ ] Panel opens without error alert
- [ ] Panel is dockable (can be dragged into the workspace)
- [ ] Panel resizes gracefully when docked and resized
- [ ] All UI controls are visible and legible (not clipped or truncated)
- [ ] Advanced section is collapsed by default
- [ ] Advanced section expands and collapses on click
- [ ] Panel reopens in same state after closing and reopening AE (session persistence)

**Notes:** _______________

---

## 2. Core Controls — Seed

- [ ] Seed field shows default value `1984` on fresh install
- [ ] Seed field accepts numeric input
- [ ] Seed field rejects or silently ignores non-numeric input (no crash)
- [ ] Randomize button populates seed field with a new number
- [ ] Randomize button does NOT trigger generation (must press Generate manually)
- [ ] Seed field value persists after navigating away and back to the comp

**Notes:** _______________

---

## 3. Core Controls — Chaos Slider

- [ ] Chaos slider moves smoothly 0–100
- [ ] Percentage label updates in real time as slider moves
- [ ] Slider snaps to integer values (no decimals shown)
- [ ] Default value is 50

**Notes:** _______________

---

## 4. Roto Detection

### 4a. No roto layers

Setup: Open a comp with no layers named with roto keywords.

- [ ] Panel shows "No roto layers found" message
- [ ] Generate still works (runs in flat mode, no crash)
- [ ] Generated effect has no OVER/UNDER split (all elements in single group)

### 4b. One roto layer

Setup: Add a layer named "roto_subject" to the comp.

- [ ] Panel auto-detects and lists the layer by name
- [ ] Checkbox next to layer is checked by default
- [ ] Generate creates OVER and UNDER groups in the pre-comp

### 4c. Multiple roto layers

Setup: Add layers named "ROTO_A", "matte_fg", "subject_clean".

- [ ] All three are detected (case-insensitive matching confirmed)
- [ ] All three shown in checklist with checkboxes

### 4d. Deselect a roto layer

- [ ] Unchecking a layer from the list removes it from roto logic
- [ ] Unchecked layer does not affect OVER/UNDER compositing
- [ ] Re-checking the layer restores it

### 4e. Custom keyword

Setup: Add a layer named "cutout_v2_final". Enter "v2" in the custom keyword field.

- [ ] Layer is detected via custom keyword
- [ ] Layer appears in checklist

**Notes:** _______________

---

## 5. Generation — Basic

Setup: Open a standard 1080p, 10-second, 24fps comp. No roto layers. Default settings (seed 1984, chaos 50).

- [ ] Generate button responds (no hang longer than 5 seconds)
- [ ] Success message appears with element count
- [ ] A pre-comp named `WindowsErrorFX_1984` appears in the Project panel
- [ ] The pre-comp layer is visible in the timeline
- [ ] Pre-comp contains layers (not empty)
- [ ] Scan line layer exists at the top of the pre-comp stack
- [ ] Noise layer exists in the pre-comp
- [ ] RAM preview plays without crash
- [ ] Visible elements appear on frame scrub (elements exist on the timeline)
- [ ] AE Info panel shows no errors after generation

**Notes:** _______________

---

## 6. Generation — Element Types

Setup: Same 10-second comp. Set Chaos to 80. Use default seed. Scrub through the full duration.

- [ ] At least one BSOD panel visible (blue solid with white text)
- [ ] At least one dialog box visible (grey body, blue title bar, buttons)
- [ ] At least one text overlay visible (floating monospace text)
- [ ] At least one cursor visible (white arrow shape)
- [ ] At least one pixel corruption block visible
- [ ] Scan lines visible across entire comp
- [ ] Elements appear at different times (not all on frame 0)
- [ ] Some elements disappear before end of comp (they have finite lifespans)

**Notes:** _______________

---

## 7. Seed Determinism

- [ ] Generate with seed `1984`, chaos `50`. Note approximate positions of first 3 elements.
- [ ] Clear All. Generate again with same seed and chaos.
- [ ] Element positions and timing are identical to first run ✓ / ✗
- [ ] Generate with seed `1985`, same chaos. Layout is visibly different ✓ / ✗
- [ ] Generate with seed `1984` again. Matches original run ✓ / ✗

**Notes:** _______________

---

## 8. Chaos Level Scaling

- [ ] Chaos `10`: very few elements (2–4 total), sparse
- [ ] Chaos `50`: moderate density, mix of types
- [ ] Chaos `90`: many simultaneous elements, dialogs cascading, heavy text

At Chaos 90:
- [ ] Dialog cascade stack visible (multiple dialogs offset diagonally)
- [ ] Multiple cursors or cursor cluster visible
- [ ] BSOD panels and text overlays coexist simultaneously
- [ ] No crash, no AE errors

**Notes:** _______________

---

## 9. Animation Behaviors — Spot Check

Scrub frame by frame through the generated comp (Chaos 80, longer comp if possible).

**BSOD:**
- [ ] At least one static BSOD observed (holds position)
- [ ] At least one sliding BSOD observed (moves linearly)
- [ ] BSOD text is legible (readable, correct color)

**Dialog:**
- [ ] Dialog appears in a single frame (pop behavior) or slides in from edge
- [ ] Dialog disappears abruptly or collapses (does not fade out)
- [ ] Cascading stack: two or more dialogs offset diagonally ✓ / ✗ / Not observed

**Cursor:**
- [ ] Cursor is visible as an arrow shape (not a point or rectangle)
- [ ] Cursor moves or holds (not frozen at origin)
- [ ] Multiple cursors visible simultaneously in at least one frame ✓ / ✗ / Not observed

**Text Overlay:**
- [ ] Text is monospace font
- [ ] Lines appear and disappear at different times (not all simultaneously)

**Pixel Blocks:**
- [ ] Blocks appear briefly (short lifespan)
- [ ] Blocks are small rectangles of solid color

**Floor Rule:**
- [ ] No element (except pixel blocks) appears for fewer than 8 frames
  Verify by finding the shortest-lived non-pixel element in the timeline _____ frames

**Notes:** _______________

---

## 10. Roto Compositing — Split Mode

Setup: Comp with a solid "roto_subject" layer. Generate with Roto Mode: Split.

- [ ] Pre-comp contains an OVER_GROUP sub-comp
- [ ] Pre-comp contains an UNDER_GROUP sub-comp
- [ ] OVER_GROUP contains at least some elements
- [ ] UNDER_GROUP contains at least some elements
- [ ] Elements are not identical in both groups (they are different elements)

**Notes:** _______________

---

## 11. Roto Mode Variants

- [ ] **All Over**: All elements in OVER group, UNDER group is empty
- [ ] **All Under**: All elements in UNDER group, OVER group is empty
- [ ] **Flat**: Single group, no OVER/UNDER split, roto layers ignored

**Notes:** _______________

---

## 12. Stored State Persistence

- [ ] Generate with seed `7777`, chaos `65`, change one Advanced setting
- [ ] Save the AE project
- [ ] Close AE completely
- [ ] Reopen AE and the project
- [ ] Open the panel
- [ ] Panel shows seed `7777` ✓ / ✗
- [ ] Panel shows chaos `65` ✓ / ✗
- [ ] Advanced setting is restored ✓ / ✗

**Notes:** _______________

---

## 13. Custom Messages

- [ ] Open Custom Messages dialog
- [ ] Add a custom body message: `WEFX TEST MESSAGE CONFIRMED`
- [ ] Add a custom title: `WEFX TITLE TEST`
- [ ] Close dialog and Generate
- [ ] Scrub timeline — custom message appears on a dialog or text overlay ✓ / ✗ / Hard to verify
- [ ] Open Custom Messages dialog again — custom entries are still present ✓ / ✗
- [ ] Reset to Defaults — custom entries are removed ✓ / ✗
- [ ] Clear All & Use Custom Only — only custom entries remain ✓ / ✗

**Notes:** _______________

---

## 14. Regenerate

- [ ] Generate once (seed A)
- [ ] Change seed to B
- [ ] Click Regenerate — existing effect is replaced without a prompt
- [ ] New effect matches seed B (different layout from seed A)
- [ ] Old pre-comp is no longer in the project panel

**Notes:** _______________

---

## 15. Clear All

- [ ] Generate an effect
- [ ] Click Clear All
- [ ] Confirm prompt appears ✓ / ✗
- [ ] After confirmation, pre-comp layer is removed from the comp
- [ ] Pre-comp is removed from the Project panel (no orphaned item)
- [ ] Original comp layers are untouched

**Notes:** _______________

---

## 16. Error States

### 16a. No active comp

- [ ] Close all comps. Open panel.
- [ ] Panel shows "Open a composition to begin" or equivalent
- [ ] Generate button does not crash, shows an alert

### 16b. Very short comp

- [ ] Create a 1-second comp (24 frames)
- [ ] Generate — shows "Comp is very short" warning ✓ / ✗
- [ ] Still generates without crash

### 16c. All element sliders at 0%

- [ ] Set all element mix sliders to 0
- [ ] Generate — shows warning, does not proceed ✓ / ✗

**Notes:** _______________

---

## 17. Cross-Platform (if testable)

- [ ] Tested on Mac ✓ / ✗ / N/A
- [ ] Tested on Windows ✓ / ✗ / N/A
- [ ] Panel appearance is acceptable on both platforms ✓ / ✗ / N/A

**Notes:** _______________

---

## 18. AE Version Compatibility (if testable)

| AE Version | Opens | Generates | No Errors | Notes |
|---|---|---|---|---|
| CC 2015 | | | | |
| CC 2017 | | | | |
| CC 2019 | | | | |
| CC 2020 | | | | |
| CC 2022 | | | | |
| CC 2024 | | | | |
| Current | | | | |

---

## 19. Performance

On a standard 10-second 1080p comp, Chaos 80:

- [ ] Generation completes in under 15 seconds
- [ ] RAM preview renders at real-time or near real-time
- [ ] AE does not become unresponsive during generation
- [ ] No "low memory" warnings appear

Note generation time: _______ seconds

---

## 20. Undo

- [ ] Generate an effect
- [ ] Press Ctrl/Cmd+Z once
- [ ] The entire effect is undone in a single undo step (not 50 steps)
- [ ] Re-applying undo (Ctrl+Shift+Z / Cmd+Shift+Z) restores the effect

**Notes:** _______________

---

## Summary

Total checks: _____ / _____  
Blocking failures: _____  
Non-blocking issues: _____  
Tester: _______________  
Date: _______________  
AE Version: _______________  

---

*This checklist covers v1 feature scope. Additional test cases should be added for any features introduced in future versions.*
