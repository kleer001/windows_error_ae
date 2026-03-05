# CLAUDE.md — Windows Error FX

This is the project root context file for AI-assisted development of **Windows Error FX**, a ScriptUI panel for Adobe After Effects that generates Windows 9x/XP error aesthetic visual effects over footage.

---

## What This Project Is

A single-file `.jsx` ScriptUI panel script that:
- Generates Windows error-style visual elements (BSOD panels, dialog boxes, corrupted text, cursor artifacts, pixel corruption) as native AE shape layers and text layers
- Composites elements above and below roto subjects using auto-detected roto layers
- Is driven by a seed value for deterministic, repeatable output
- Targets After Effects CC 2015 and newer, Mac and Windows

**No external assets. No installers. No bitmaps. One `.jsx` file.**

---

## Repository Structure

```
windows-error-fx/
├── CLAUDE.md                              ← You are here
├── WindowsErrorFX.jsx                     ← The plugin (single deliverable file)
├── ae-extendscript-reference.md           ← ExtendScript/AE API knowledge base ⭐
├── windows-error-fx-spec.md               ← Element visual design reference
├── windows-error-fx-animation-spec.md     ← Element animation behaviors reference
├── windows-error-fx-config-spec.md        ← UI panel + user config reference
├── code-architecture-spec.md              ← Code structure + function signatures reference
├── qa-checklist.md                        ← Manual QA checklist for AE testing
├── docs/images/fidelity-reference.md      ← Pixel-perfect visual specs for dialogs, BSODs, cursors
├── tests/run_tests.js                     ← Test runner (node tests/run_tests.js)
├── tests/test_harness.js                  ← Node.js VM sandbox that evals the JSX
├── tests/test_prng.js                     ← PRNG tests
├── tests/test_utilities.js                ← Utility/settings/message pool tests
├── tests/test_scheduler.js                ← Scheduler tests (largest suite)
└── README.md                              ← User-facing install + usage guide
```

> ⭐ **Before writing any AE scripting code, read `ae-extendscript-reference.md`.** ExtendScript is ES3 with a large proprietary API — it has many non-obvious constraints and patterns that differ from modern JS.

---

## The Spec Documents (Reference, Not Source of Truth)

The spec documents are **informed suggestions** — they provide design direction and reference material but may be incorrect in places. Use them as a starting point, not a contract. When the code and a spec disagree, fix whichever is actually wrong.

| Doc | Purpose |
|---|---|
| `windows-error-fx-spec.md` | What each element looks like — colors, geometry, fonts, roto interaction rules |
| `windows-error-fx-animation-spec.md` | How each element moves — behaviors, timing, the Floor Rule, easing vocabulary |
| `windows-error-fx-config-spec.md` | The ScriptUI panel layout, all user controls, stored state, error handling |
| `code-architecture-spec.md` | Code structure, function signatures, data flow |

---

## Key Architecture Decisions

**Single file.** Everything lives in `WindowsErrorFX.jsx`. No includes, no external dependencies. This is a deliberate portability decision — the user drops one file into their Scripts folder.

**Pre-comp output.** Generated elements land in a pre-comp named `WindowsErrorFX_[seed]`. The pre-comp contains an OVER group, an UNDER group, scan lines, and noise. The user's original layers are never touched.

**Seeded randomness.** All randomness derives from a single integer seed using a deterministic PRNG (mulberry32 or equivalent implementable in ES3). Same seed = same output every run.

**No pixel manipulation.** Everything is drawn as native AE shape layers and text layers. No `ImageData`, no canvas, no pixel pushing. This keeps it compatible across AE versions and avoids render pipeline complexity.

**Roto by naming convention.** Roto layers are identified by scanning comp layer names for keywords: `roto`, `rotoscope`, `matte`, `cutout`, `subject`, `fg`. Case-insensitive. User can override.

**Stored state in comp markers.** Seed, settings, and custom messages are stored as JSON in comp markers on frame 0 (labels `WEFX_SEED`, `WEFX_SETTINGS`, `WEFX_MESSAGES`). This means settings travel with the `.aep` file with no sidecar.

---

## Code Organization (WindowsErrorFX.jsx)

The file is structured in this order — do not reorganize:

```
 0. LOGGING           — wlog(), wwarn(), werr(), file-based logging
 1. CONSTANTS         — colors, fonts, defaults, message pools, dialog variants, blend weights
 2. PRNG              — mulberry32 seeded RNG + helpers
 3. AE UTILITIES      — calcCompScale, shape helpers, keyframe helpers, icon builders,
                         message pickers, per-element settings helpers (defaultElementSettings,
                         getElementSettings, migrateSettings, randomizeSettings)
 4. ELEMENT BUILDERS  — one function per element type
    - buildBSOD()
    - buildDialogBox()
    - buildChromeFragment()
    - buildTextOverlay()
    - buildCursor()
    - buildPixelBlock()
    - buildFreezeStrip()
 5. GLOBAL OVERLAYS   — buildScanLines(), buildNoise(), buildHeadScratch()
 6. SCHEDULER         — pure logic (no AE API), calcElementCount, distributeTimes,
                         pickElementType, pickDuration, assignLayer, buildJob,
                         assignDialogStacks, schedule
 7. ROTO DETECTOR     — nameMatchesKeyword(), detectRotoLayers()
 8. COMPOSITOR        — createPreCompStructure(), findExistingEffect(), clearEffect()
 9. STATE MANAGER     — defaultSettings(), loadSettings(), saveSettings(),
                         settingsFromUI(), applySettingsToUI()
10. MAIN GENERATOR    — generate() orchestrator
11. UI                — ScriptUI panel (IIFE, guarded by typeof Panel check)
```

Each builder function signature follows this pattern:
```javascript
function buildBSOD(params, targetComp) {
    // params: ElementJob from scheduler
    // returns: array of created layers
}
```

---

## ExtendScript Constraints Summary

> Full details in `docs/ae-extendscript-reference.md`

- **ES3 only.** No `let`, `const`, arrow functions, template literals, destructuring, `Array.forEach`, `Array.map`, `Object.keys`, spread, or any ES5+.
- **Use `var` everywhere.** Function-scoped only.
- **Use `for` loops, not iterators.**
- **String concatenation only** — no template literals.
- **`$.sleep(ms)`** exists but blocks the UI thread — avoid in panel context.
- **Always `app.beginUndoGroup()` / `app.endUndoGroup()`** around any comp modifications.
- **`app.project.activeItem`** may be null — always check before using.
- **Layer indices are 1-based**, not 0-based.
- **Time is in seconds** in the AE API, not frames. Convert: `frame / comp.frameRate`.

---

## Working Without After Effects

This project was designed with a no-AE-feedback constraint in mind. Mitigations:

- Spec docs are written before code as reference, so logic can be reviewed in isolation
- The `ae-extendscript-reference.md` file contains AE API patterns (verify before trusting)
- The `qa-checklist.md` defines what to verify when AE access is available
- The PRNG and scheduler logic can be unit-tested in a browser console (pure JS, no AE API)
- Shape/color math can be visually prototyped in a browser canvas before porting to ExtendScript

When writing code, prefer **explicit over clever** — verbose, readable ExtendScript is easier to debug without a live environment than compact code.

---

## Definition of Done

The plugin is complete when:
- [ ] Panel opens without errors in AE CC 2015 through current
- [ ] Generate runs on a comp with no roto layers (flat mode)
- [ ] Generate runs on a comp with one roto layer (split mode)
- [ ] All 5 element types appear at Chaos 50 with default seed
- [ ] Changing seed changes layout; same seed reproduces identically
- [ ] Pre-comp structure matches the spec (OVER/UNDER groups, scan lines, noise)
- [ ] Stored state round-trips (close AE, reopen project, panel restores settings)
- [ ] CLEAR ALL removes the pre-comp cleanly with no orphaned layers
- [ ] No errors in the AE Info panel during or after generation
- [ ] Script runs on both Mac and Windows paths

---

## Out of Scope (v1)

- Audio reactivity
- Tracking/motion-linking error windows to roto subject movement
- Custom user-supplied bitmap assets
- Export/render automation
- UXP or CEP panel versions
- Any AE version below CC 2015
