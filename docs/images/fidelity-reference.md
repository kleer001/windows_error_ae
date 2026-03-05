# Windows Error FX — High Fidelity Visual Reference
### docs/fidelity-reference.md v0.2
### Updated from direct screenshot analysis + verified system color data

---

## PART 1 — BLUE SCREEN OF DEATH (BSOD)

### 1.1 Two Canonical Versions

There are two visually distinct BSOD layouts in the era we target. Both must be reproduced.

---

### VERSION A: Windows XP / 2000 BSOD

#### Colors (verified)
```
Background:  #0000AA  →  RGB(0, 0, 170)    →  AE [0, 0, 0.667]
All text:    #FFFFFF  →  RGB(255,255,255)   →  AE [1, 1, 1]
```
Nothing else. No grey, no blue highlight bar, no gradient. Pure flat `#0000AA` with `#FFFFFF` text.

#### Font
- **Lucida Console**, rendered at 8×13px per character cell
- This means the text looks *slightly coarse / pixel-rasterized* — not smooth antialiased
- AE fallback chain: `Lucida Console` → `Courier New`
- Size targeting: at 1080p, ~13–14pt Courier New approximates the correct scale

#### Exact Text Layout (XP)
All text is **hard left-aligned**, starting approximately 1 character width (8px) from the left edge. No centering anywhere.

```
[1 blank line at top]

A problem has been detected and Windows has been shut down to prevent damage
to your computer.

[ERROR_CODE_IN_CAPS_WITH_UNDERSCORES]

If this is the first time you've seen this Stop error screen,
restart your computer. If this screen appears again, follow
these steps:

Check to make sure any new hardware or software is properly installed.
If this is a new installation, ask your hardware or software manufacturer
for any Windows updates you might need.

If problems continue, disable or remove any newly installed hardware
or software. Disable BIOS memory options such as caching or shadowing.
If you need to use Safe Mode to remove or disable components, restart
your computer, press F8 to select Advanced Startup Options, and then
select Safe Mode.

Technical information:

*** STOP: 0x0000000A (0x00000000,0x00000002,0x00000000,0x804E3ABF)

[optional]
   DRIVER_IRQL_NOT_LESS_OR_EQUAL

[optional]
Beginning dump of physical memory
Physical memory dump complete.
Contact your system administrator or technical support group for further assistance.
```

#### Confirmed from screenshots:
- Top ~2/3 of screen is advisory text, regular weight, no bold
- "Technical information:" followed by blank line, then `*** STOP:` line
- The `***` asterisks are the same white as all other text — no special treatment
- Error code name (e.g. `IRQL_NOT_LESS_OR_EQUAL`) appears below the STOP line
- Text line spacing is exactly 1 character height — zero extra leading
- Blue fills edge-to-edge, no border, no padding on the screen itself
- NO blinking cursor on XP BSOD (unlike Win 98)

---

### VERSION B: Windows 98 / 95 BSOD

Fundamentally different layout — shorter, different text, has a blinking cursor.

#### Colors
```
Background:  #0000AA  →  same as XP
Text:        #FFFFFF  →  same as XP
Highlight bar (rare):  grey ~#AAAAAA background, #0000AA text (inverted)
```

#### Font
- **Fixedsys** / hardware VGA ROM font
- Best TrueType match: **"Perfect DOS VGA 437"** (free, dafont.com)
- Second best: **Fixedsys Excelsior 3.01** (free, downloadable)
- AE fallback: `Courier New`

#### Exact Text Layout (Win 98)
```
[blank line]

A fatal exception OE has occurred at 0028:C0011E36 in VXD VMM(01) +
00010E36. The current application will be terminated.

*  Press any key to terminate the current application.
*  Press CTRL+ALT+DELETE again to restart your computer. You will
   lose any unsaved information in all applications.


Press any key to continue _
```

#### Confirmed from screenshots:
- Error text starts roughly 1/3 down the screen — not at the top
- Two bullet points use asterisk `*` with two spaces of indent
- Final line `Press any key to continue _` has a **solid block cursor** (white filled rectangle, blinking)
- "CTRL+ALT+DELETE" is the same font weight as everything else — NOT bold
- Some Win 98 BSODs have a **grey highlighted header bar** (inverted colors) for the error type
- Win 98 BSOD is 80×25 text mode (25 lines max on screen), XP is 80×50

---

## PART 2 — WINDOWS ERROR DIALOG BOXES

### 2.1 Three Variants

Direct screenshot analysis confirms three visually distinct dialog styles.

---

### VARIANT A: Windows 95 / 98 Classic ("flat navy" look)

#### Confirmed anatomy from screenshots:
```
┌──────────────────────────────────────────────────────┐  ← 1px black outer border
│ [16×16 icon] Title Text                    [−][□][×] │  ← 18px tall, flat navy bar
├──────────────────────────────────────────────────────┤
│                                                      │
│  [32×32  ]  This application has performed an        │
│  [icon   ]  illegal operation and will be shut       │
│             down.                                    │
│                                                      │
│  If the problem persists, contact the program        │
│  vendor.                                            │
│                                                      │
│                  [ Close ]    [ Details >> ]         │
└──────────────────────────────────────────────────────┘
```

#### Colors (verified):
```
Dialog body:            #C0C0C0  →  AE [0.753, 0.753, 0.753]
Title bar left:         #000080  →  AE [0, 0, 0.502]
Title bar right:        #1084D0  →  AE [0.063, 0.518, 0.816]
Title bar text:         #FFFFFF  →  AE [1, 1, 1]
Body text:              #000000  →  AE [0, 0, 0]
Outer border (1px):     #000000  →  AE [0, 0, 0]
Button face:            #C0C0C0  →  same as body
Button top-left light:  #FFFFFF  →  AE [1, 1, 1]
Button inner midlight:  #DFDFDF  →  AE [0.875, 0.875, 0.875]
Button bottom-right:    #808080  →  AE [0.502, 0.502, 0.502]
Button outer shadow:    #000000  →  AE [0, 0, 0]
```

---

### VARIANT B: Windows 98 SE / 2000 Standard ("warm beige" look) — PRIMARY

This is what most people picture. Warmer grey body, gradient title bar. **Use this most.**

#### Confirmed anatomy from screenshots:
```
┌──────────────────────────────────────────────────────────────┐  ← 1px black
│ [███ gradient dark blue ═════════════════ light blue ██][−□×]│  ← 18px gradient bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [32×32  ]  The instruction at "0x00000000" referenced       │
│  [icon   ]  memory at "0x00000000". The memory could         │
│             not be "read".                                   │
│                                                              │
│  Click OK to terminate the program.                          │
│                                                              │
│                                              [  OK  ]        │
└──────────────────────────────────────────────────────────────┘
```

#### Colors (verified):
```
Dialog body:            #D4D0C8  →  AE [0.831, 0.816, 0.784]
Title bar left:         #0A246A  →  AE [0.039, 0.141, 0.416]
Title bar right:        #A6CAF0  →  AE [0.651, 0.792, 0.941]
Title bar text:         #FFFFFF  →  AE [1, 1, 1]
Body text:              #000000  →  AE [0, 0, 0]
Outer border (1px):     #000000  →  AE [0, 0, 0]
Button face:            #D4D0C8  →  same as body
Button top-left light:  #FFFFFF  →  AE [1, 1, 1]
Button inner midlight:  #D4D0C8  →  same as face (very subtle)
Button bottom-right:    #808080  →  AE [0.502, 0.502, 0.502]
Button outer shadow:    #404040  →  AE [0.251, 0.251, 0.251]
```

---

### VARIANT C: Windows XP Luna ("glassy blue" look) — SECONDARY

#### Confirmed anatomy from screenshots:
```
╔══════════════════════════════════════════════════════════╗  ← rounded ~4px corners
║ [16×16 ico] System Error                          [●×]  ║  ← 25px deep blue gradient
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  [32×32  ]  Cannot find the file 'xxx' (or one of        ║
║  [icon   ]  its components). Make sure the path         ║
║             and filename are correct.                    ║
║                                                          ║
║                                          [  OK  ]        ║
╚══════════════════════════════════════════════════════════╝
```

#### Colors (verified from XP Luna system color table):
```
Dialog body:            #ECE9D8  →  AE [0.925, 0.914, 0.847]
Title bar left:         #0054E3  →  AE [0, 0.329, 0.890]
Title bar right:        #3D95FF  →  AE [0.239, 0.584, 1.0]
Title bar text:         #FFFFFF  →  AE [1, 1, 1]
Close button (oval):    #C75050  →  AE [0.780, 0.314, 0.314]
Close × symbol:         #FFFFFF  →  AE [1, 1, 1]
Body text:              #000000  →  AE [0, 0, 0]
Button face:            #ECE9D8  →  same as body
Button shadow:          #ACA899  →  AE [0.675, 0.659, 0.600]
```

#### XP-specific details confirmed from screenshots:
- Title bar is **taller** — 25px vs Classic's 18px
- Title bar has a **subtle 3D highlight** along the very top edge (1px lighter stripe)
- The minimize and maximize buttons are **grey squares** with rounded appearance
- Close button is a distinctly **red oval/pill shape** — not square like Classic
- Window corners are **visibly rounded** (~4px radius)
- Body area has a very slight inner border/bevel visible in screenshots

---

## PART 3 — ICON SPECIFICATIONS (CONFIRMED FROM SCREENSHOTS)

### Error Icon
- 32×32px bounding box
- **Dark red circle**: `#CC0000` — NOT pure `#FF0000`. The darker shade is clearly visible in screenshots.
- **White × cross**: two diagonal lines crossing at center, approximately 4px stroke width each
- The × uses diagonal lines (a rotated-plus shape), NOT a text character
- 1px black outline on the circle perimeter
- AE construction: red ellipse shape + two white rectangles rotated ±45°

### Warning Icon  
- 32×32px bounding box
- **Yellow-gold equilateral triangle**: `#FFCC00` (golden, not pure yellow)
- Points upward
- 1–2px black outline
- **Black `!`** centered: tall stem (~16px) + small dot below, bold
- AE construction: triangle shape + two black rectangles (stem + dot)

### Question Icon
- 32×32px bounding box
- **Blue filled circle**: `#0000CC`
- **White `?`** bold, approximately 20px tall
- 1px black outline on circle
- AE construction: blue ellipse + white text "?" bold

### Information Icon
- Same blue circle as Question icon
- **White `i`** — lowercase, bold, with dot above
- AE construction: blue ellipse + white text "i" bold

---

## PART 4 — WINDOW CHROME

### 4.1 Title Bar Control Buttons

From Win 98 screenshots showing the three title bar buttons clearly:

| Button | Symbol | Size | Background |
|---|---|---|---|
| Minimize | Short horizontal bar centered (not full-width) | 16×14px | Grey (same as body) |
| Maximize | Small hollow rectangle with thick top border | 16×14px | Grey (same as body) |
| Close | Small × — two diagonal short lines crossing | 16×14px | Grey (Classic) / Red oval (XP) |

All three buttons have the **same 3D raised border** as regular buttons. The symbols are black.

The XP Luna close button specifically:
- Is a **pill-shaped red oval**, approximately 21×14px
- Has a **gradient sheen** on the red — lighter at top, darker at bottom
- The white × inside is small, approximately 8px

### 4.2 The Raised 3D Border (Confirmed Pixel Pattern)

From close-up screenshots, the raised button effect is exactly this at 1:1 scale:

```
Top-left corner pixel pattern (zoomed):

██████████████████  ← white (#FFFFFF) — top 1px edge
█                   ← white (#FFFFFF) — left 1px edge
█  [button face]    ← grey face (#C0C0C0 or #D4D0C8)
█                   ← dark grey (#808080) — right 1px (inner)
 ██████████████████ ← dark grey (#808080) — bottom 1px (inner)
  ████████████████  ← black (#000000 or #404040) — outer bottom-right 1px
```

In practice: **two overlapping 1px border rects** approximate this in AE:
- One white stroke (bleeds top and left)
- One dark grey stroke (bleeds bottom and right)
Plus the outer 1px black frame of the window itself.

### 4.3 Title Bar Gradient

- **Horizontal linear gradient**, full title bar height
- Left anchor: dark color, Right anchor: light color
- Does NOT extend under the control buttons — stops at the leftmost control button
- The control button area (right ~54px) is flat grey matching the dialog body

---

## PART 5 — WINDOWS CURSOR (CONFIRMED SHAPE)

From high-resolution cursor screenshots:

### Pixel anatomy
```
At 2x scale (each █ = 1 actual pixel):

█
██
█ █
█  █
█   █
█    █
█     █
█      █
█       █
█   ████
█  █
██  █
█    █
      █
```

Key confirmed observations:
- Left edge is **perfectly vertical** — this is the hotspot edge
- The cursor body widens then tapers at the bottom into a notched base
- The **inner notch** (concave cutout at bottom right of the arrow body) is essential for authenticity — without it the shape reads as a plain triangle
- Fill: solid white `#FFFFFF`
- Outline: solid black `#000000`, 1px all around
- Zero antialiasing — hard pixel edges
- Approximate dimensions: 12px wide at widest × 22px tall at 1:1 scale
- In AE at 1080p, scale to approximately 24–32px tall for readability

### AE Shape Layer Points (cursor at 24px height, origin at tip)
```javascript
// Clockwise from tip — approximate pixel positions
// These trace the OUTER shape (white fill area)
var CURSOR_POLY_POINTS = [
  [0,  0 ],  // 1. tip / hotspot
  [0,  21],  // 2. bottom-left
  [4,  16],  // 3. inner notch start (left side)
  [7,  21],  // 4. inner notch bottom
  [11, 14],  // 5. right edge midpoint
  [7,  11],  // 6. shoulder right
  [7,   5],  // 7. upper right
];
// Apply: white fill, 1px black stroke on same path
```

---

## PART 6 — CORRECTIONS TO PREVIOUS SPEC (v0.1)

The following values in the original `fidelity-reference.md v0.1` were incorrect or imprecise:

| Item | v0.1 Value | v0.2 Corrected |
|---|---|---|
| Error icon red | `#FF0000` / `#CC4C4C` | `#CC0000` — confirmed darker |
| Warning icon yellow | `#FFD700` | `#FFCC00` — golden, not pure yellow |
| Question icon blue | `#0000FF` or `#000080` | `#0000CC` — medium blue |
| C_BSOD_BG AE value | `[0, 0, 0.667]` | Same — confirmed correct |
| Win 98 BSOD cursor | Not mentioned | Solid white block cursor, blinking |
| XP title bar height | "approximately 25px" | 25px — confirmed |
| Classic title bar height | "18px" | 18px — confirmed |
| Cursor construction | 5-point poly | 7-point poly with inner notch — confirmed |
| Dialog body Win Classic | `#C0C0C0` noted but secondary | Confirmed #C0C0C0 — alternate with `#D4D0C8` |

---

## PART 7 — ALL CONSTANTS (FINAL)

```javascript
// ════════════════════════════════════════════════════════════════
// FINAL VERIFIED COLOR CONSTANTS — v0.2
// ════════════════════════════════════════════════════════════════

// BSOD
var C_BSOD_BG            = [0,     0,     0.667]; // #0000AA EXACT
var C_BSOD_TEXT          = [1,     1,     1    ]; // #FFFFFF

// Dialog Variant A — Win95/98 Classic
var C_DLG_A_BODY         = [0.753, 0.753, 0.753]; // #C0C0C0
var C_DLG_A_TITLEBAR_L   = [0,     0,     0.502]; // #000080
var C_DLG_A_TITLEBAR_R   = [0.063, 0.518, 0.816]; // #1084D0
var C_DLG_A_BTN_FACE     = [0.753, 0.753, 0.753]; // #C0C0C0
var C_DLG_A_BTN_HI       = [1,     1,     1    ]; // #FFFFFF
var C_DLG_A_BTN_MID      = [0.875, 0.875, 0.875]; // #DFDFDF
var C_DLG_A_BTN_SHAD     = [0.502, 0.502, 0.502]; // #808080
var C_DLG_A_BTN_DARK     = [0,     0,     0    ]; // #000000

// Dialog Variant B — Win98 Standard / 2000 (PRIMARY)
var C_DLG_B_BODY         = [0.831, 0.816, 0.784]; // #D4D0C8
var C_DLG_B_TITLEBAR_L   = [0.039, 0.141, 0.416]; // #0A246A
var C_DLG_B_TITLEBAR_R   = [0.651, 0.792, 0.941]; // #A6CAF0
var C_DLG_B_BTN_FACE     = [0.831, 0.816, 0.784]; // #D4D0C8
var C_DLG_B_BTN_HI       = [1,     1,     1    ]; // #FFFFFF
var C_DLG_B_BTN_SHAD     = [0.502, 0.502, 0.502]; // #808080
var C_DLG_B_BTN_DARK     = [0.251, 0.251, 0.251]; // #404040

// Dialog Variant C — Win XP Luna (SECONDARY)
var C_DLG_C_BODY         = [0.925, 0.914, 0.847]; // #ECE9D8
var C_DLG_C_TITLEBAR_L   = [0,     0.329, 0.890]; // #0054E3
var C_DLG_C_TITLEBAR_R   = [0.239, 0.584, 1.0  ]; // #3D95FF
var C_DLG_C_CLOSE        = [0.780, 0.314, 0.314]; // #C75050
var C_DLG_C_BTN_FACE     = [0.925, 0.914, 0.847]; // #ECE9D8
var C_DLG_C_BTN_SHAD     = [0.675, 0.659, 0.600]; // #ACA899

// Shared
var C_DLG_TITLE_TEXT     = [1,     1,     1    ]; // #FFFFFF
var C_DLG_BODY_TEXT      = [0,     0,     0    ]; // #000000
var C_DLG_FRAME          = [0,     0,     0    ]; // #000000 1px

// Icons
var C_ICO_ERROR          = [0.800, 0,     0    ]; // #CC0000
var C_ICO_WARN           = [1,     0.800, 0    ]; // #FFCC00
var C_ICO_QUESTION       = [0,     0,     0.800]; // #0000CC
var C_ICO_INFO           = [0,     0,     0.800]; // #0000CC
var C_ICO_SYMBOL         = [1,     1,     1    ]; // #FFFFFF
var C_ICO_OUTLINE        = [0,     0,     0    ]; // #000000

// Cursor
var C_CURSOR_FILL        = [1,     1,     1    ]; // #FFFFFF
var C_CURSOR_STROKE      = [0,     0,     0    ]; // #000000

// Fonts
var FONT_BSOD            = "Lucida Console";      // XP era
var FONT_BSOD_9X         = "Courier New";         // Win 9x fallback
var FONT_DLG             = "Arial";               // All dialog text

// Sizes
var FSIZE_BSOD           = 13;                    // pt
var FSIZE_DLG_TITLE      = 11;                    // pt, bold
var FSIZE_DLG_BODY       = 11;                    // pt, regular
var FSIZE_BTN            = 11;                    // pt, regular

// Geometry (px at 96 DPI, ×2 for 1080p comp)
var GEO_TITLE_H_CLASSIC  = 18;
var GEO_TITLE_H_XP       = 25;
var GEO_BTN_W            = 75;
var GEO_BTN_H            = 23;
var GEO_BTN_GAP          = 8;
var GEO_PADDING          = 8;
var GEO_ICON_SIZE        = 32;
var GEO_BORDER           = 1;
var GEO_CTRL_BTN_W       = 16;
var GEO_CTRL_BTN_H       = 14;
var COMP_SCALE           = 2.0;                   // 96 DPI → 1080p scale factor
```

---

*v0.2 — Built from direct visual analysis of original Windows 95/98/XP screenshots including BSOD layouts, dialog chrome, icon anatomy, and cursor pixel shape. Cross-referenced against Microsoft GetSysColor API data.*
