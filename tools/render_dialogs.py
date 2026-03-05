#!/usr/bin/env python3
"""
render_dialogs.py — Render pre-baked dialog PNGs + encode cursors to base64.

Reads render_dialogs_catalog.json, renders each dialog as a pixel-perfect PNG
matching the Windows 95/98/XP aesthetic, and outputs:
  1. Individual PNGs in tools/rendered/
  2. A JS constants file (tools/rendered/dialog_constants.js) ready for embedding

Requirements: pip install Pillow
"""

import json
import os
import sys
import base64
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CATALOG_PATH = SCRIPT_DIR / "render_dialogs_catalog.json"
OUTPUT_DIR = SCRIPT_DIR / "rendered"
CURSOR_DIR = SCRIPT_DIR.parent / "docs" / "images"
JS_OUTPUT = OUTPUT_DIR / "dialog_constants.js"

# ── Dialog variant palettes ──────────────────────────────────────────
VARIANTS = {
    "A": {  # Win95/98 Classic
        "body":       (0xC0, 0xC0, 0xC0),
        "titleStart": (0x00, 0x00, 0x80),
        "titleEnd":   (0x10, 0x84, 0xD0),
        "borderL":    (0xFF, 0xFF, 0xFF),
        "borderMid":  (0xDF, 0xDF, 0xDF),
        "borderD":    (0x80, 0x80, 0x80),
        "borderOuter":(0x00, 0x00, 0x00),
        "btnBg":      (0xC0, 0xC0, 0xC0),
        "btnBorderL": (0xFF, 0xFF, 0xFF),
        "btnBorderD": (0x80, 0x80, 0x80),
        "btnOuter":   (0x00, 0x00, 0x00),
        "closeBtn":   None,
        "cornerRadius": 0,
        "titleH": 18,
        "ctrlBtnStyle": "classic",
    },
    "B": {  # Win98/2000 Standard (PRIMARY)
        "body":       (0xD4, 0xD0, 0xC8),
        "titleStart": (0x0A, 0x24, 0x6A),
        "titleEnd":   (0xA6, 0xCA, 0xF0),
        "borderL":    (0xFF, 0xFF, 0xFF),
        "borderMid":  (0xD4, 0xD0, 0xC8),
        "borderD":    (0x80, 0x80, 0x80),
        "borderOuter":(0x40, 0x40, 0x40),
        "btnBg":      (0xD4, 0xD0, 0xC8),
        "btnBorderL": (0xFF, 0xFF, 0xFF),
        "btnBorderD": (0x80, 0x80, 0x80),
        "btnOuter":   (0x40, 0x40, 0x40),
        "closeBtn":   None,
        "cornerRadius": 0,
        "titleH": 18,
        "ctrlBtnStyle": "classic",
    },
    "C": {  # Win XP Luna
        "body":       (0xEC, 0xE9, 0xD8),
        "titleStart": (0x00, 0x54, 0xE3),
        "titleEnd":   (0x3D, 0x95, 0xFF),
        "borderL":    (0xFF, 0xFF, 0xFF),
        "borderMid":  (0xEC, 0xE9, 0xD8),
        "borderD":    (0xAC, 0xA8, 0x99),
        "borderOuter":(0x00, 0x00, 0x00),
        "btnBg":      (0xEC, 0xE9, 0xD8),
        "btnBorderL": (0xFF, 0xFF, 0xFF),
        "btnBorderD": (0xAC, 0xA8, 0x99),
        "btnOuter":   (0x00, 0x00, 0x00),
        "closeBtn":   (0xC7, 0x50, 0x50),
        "cornerRadius": 4,
        "titleH": 25,
        "ctrlBtnStyle": "xp",
    },
}

# ── Icon colors ──────────────────────────────────────────────────────
ICON_COLORS = {
    "error":    {"bg": (0xCC, 0x00, 0x00), "symbol": (0xFF, 0xFF, 0xFF), "outline": (0x00, 0x00, 0x00)},
    "warning":  {"bg": (0xFF, 0xCC, 0x00), "symbol": (0x00, 0x00, 0x00), "outline": (0x00, 0x00, 0x00)},
    "question": {"bg": (0x00, 0x00, 0xCC), "symbol": (0xFF, 0xFF, 0xFF), "outline": (0x00, 0x00, 0x00)},
}

# ── Geometry ─────────────────────────────────────────────────────────
DIALOG_WIDTH = 280
DIALOG_HEIGHT_AB = 140
ICON_SIZE = 32
BTN_W = 60
BTN_H = 20
BTN_GAP = 8
PADDING = 8
CTRL_BTN_W = 16
CTRL_BTN_H = 14


def lerp_color(c1, c2, t):
    """Linear interpolate between two RGB tuples."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def try_load_font(name, size):
    """Try to load a TrueType font, fall back to default."""
    candidates = [
        name,
        f"/usr/share/fonts/truetype/msttcorefonts/{name}.ttf",
        f"/usr/share/fonts/truetype/liberation/Liberation{name}.ttf",
        f"/usr/share/fonts/TTF/{name}.ttf",
        f"C:\\Windows\\Fonts\\{name}.ttf",
        f"/System/Library/Fonts/{name}.ttf",
        f"/Library/Fonts/{name}.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (OSError, IOError):
            continue
    # Fall back to default
    try:
        return ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def draw_3d_button(draw, x, y, w, h, v, label, font):
    """Draw a classic Win9x raised 3D button with label."""
    # Outer shadow
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=v["btnOuter"])
    # Light edge (top-left)
    draw.rectangle([x, y, x + w - 2, y + h - 2], fill=v["btnBorderL"])
    # Dark edge (bottom-right inner)
    draw.rectangle([x + 1, y + 1, x + w - 1, y + h - 1], fill=v["btnBorderD"])
    # Face
    draw.rectangle([x + 2, y + 2, x + w - 3, y + h - 3], fill=v["btnBg"])
    # Label centered
    bbox = font.getbbox(label)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x + (w - tw) // 2
    ty = y + (h - th) // 2 - 1
    draw.text((tx, ty), label, fill=(0, 0, 0), font=font)


def draw_icon(draw, icon_type, cx, cy, size):
    """Draw a dialog icon at center (cx, cy) with given size."""
    if icon_type == "none" or icon_type not in ICON_COLORS:
        return

    colors = ICON_COLORS[icon_type]
    r = size // 2

    if icon_type == "error":
        # Red circle with black outline
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colors["bg"], outline=colors["outline"])
        # White X
        arm = int(r * 0.55)
        lw = max(2, size // 8)
        for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
            # Draw thick diagonal lines
            for offset in range(-lw // 2, lw // 2 + 1):
                draw.line([cx - arm * dx + offset, cy - arm * dy, cx + arm * dx + offset, cy + arm * dy],
                          fill=colors["symbol"], width=1)
        # Simpler approach: two thick lines
        draw.line([cx - arm, cy - arm, cx + arm, cy + arm], fill=colors["symbol"], width=lw)
        draw.line([cx - arm, cy + arm, cx + arm, cy - arm], fill=colors["symbol"], width=lw)

    elif icon_type == "warning":
        # Yellow triangle pointing up
        pts = [
            (cx, cy - r),           # top
            (cx - r, cy + r - 2),   # bottom-left
            (cx + r, cy + r - 2),   # bottom-right
        ]
        draw.polygon(pts, fill=colors["bg"], outline=colors["outline"])
        # Black exclamation mark
        font = try_load_font("Arial Bold", size - 6)
        bbox = font.getbbox("!")
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, cy - r // 2 - 1), "!", fill=colors["symbol"], font=font)

    elif icon_type == "question":
        # Blue circle with black outline
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colors["bg"], outline=colors["outline"])
        # White question mark
        font = try_load_font("Arial Bold", size - 4)
        bbox = font.getbbox("?")
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((cx - tw // 2, cy - th // 2 - 2), "?", fill=colors["symbol"], font=font)


def draw_title_gradient(draw, x, y, w, h, c_start, c_end):
    """Draw horizontal linear gradient for title bar."""
    for col in range(w):
        t = col / max(1, w - 1)
        color = lerp_color(c_start, c_end, t)
        draw.line([(x + col, y), (x + col, y + h - 1)], fill=color)


def draw_ctrl_buttons(draw, v, x, y, h):
    """Draw minimize/maximize/close buttons on title bar."""
    btn_w = CTRL_BTN_W
    btn_h = CTRL_BTN_H
    btn_y = y + (h - btn_h) // 2

    if v["ctrlBtnStyle"] == "xp":
        # XP: grey min/max + red close oval
        # Close button (red pill)
        close_x = x
        if v["closeBtn"]:
            pill_w = 21
            pill_h = btn_h
            # Red oval
            draw.rounded_rectangle([close_x, btn_y, close_x + pill_w, btn_y + pill_h],
                                   radius=pill_h // 2, fill=v["closeBtn"])
            # White X
            cx_btn = close_x + pill_w // 2
            cy_btn = btn_y + pill_h // 2
            arm = 3
            draw.line([cx_btn - arm, cy_btn - arm, cx_btn + arm, cy_btn + arm],
                      fill=(0xFF, 0xFF, 0xFF), width=2)
            draw.line([cx_btn - arm, cy_btn + arm, cx_btn + arm, cy_btn - arm],
                      fill=(0xFF, 0xFF, 0xFF), width=2)
    else:
        # Classic: three grey 3D buttons
        for i, symbol in enumerate(["_", "□", "×"]):
            bx = x + i * (btn_w + 1)
            # 3D raised button
            draw.rectangle([bx, btn_y, bx + btn_w - 1, btn_y + btn_h - 1],
                           fill=v["borderOuter"])
            draw.rectangle([bx, btn_y, bx + btn_w - 2, btn_y + btn_h - 2],
                           fill=v["btnBorderL"])
            draw.rectangle([bx + 1, btn_y + 1, bx + btn_w - 1, btn_y + btn_h - 1],
                           fill=v["btnBorderD"])
            draw.rectangle([bx + 2, btn_y + 2, bx + btn_w - 3, btn_y + btn_h - 3],
                           fill=v["body"])
            # Symbol
            font = try_load_font("Arial", 9)
            if symbol == "×":
                sym_font = try_load_font("Arial Bold", 10)
                bbox = sym_font.getbbox("×")
                sw = bbox[2] - bbox[0]
                draw.text((bx + (btn_w - sw) // 2, btn_y + 1), "×",
                          fill=(0, 0, 0), font=sym_font)
            elif symbol == "□":
                # Small hollow rectangle
                rx = bx + 4
                ry = btn_y + 3
                draw.rectangle([rx, ry, rx + 7, ry + 6], outline=(0, 0, 0))
                draw.line([rx, ry, rx + 7, ry], fill=(0, 0, 0), width=2)
            elif symbol == "_":
                # Short horizontal bar
                draw.line([bx + 4, btn_y + btn_h - 5, bx + btn_w - 6, btn_y + btn_h - 5],
                          fill=(0, 0, 0), width=1)


def render_dialog(entry, v):
    """Render a single dialog PNG."""
    title_h = v["titleH"]
    W = DIALOG_WIDTH
    H = DIALOG_HEIGHT_AB + (title_h - 18)  # Adjust for taller XP title
    corner_r = v["cornerRadius"]

    # Create RGBA canvas
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Outer border
    if corner_r > 0:
        draw.rounded_rectangle([0, 0, W - 1, H - 1], radius=corner_r,
                               fill=v["borderOuter"])
    else:
        draw.rectangle([0, 0, W - 1, H - 1], fill=v["borderOuter"])

    # 2. Light highlight border (top-left 3D)
    if corner_r > 0:
        draw.rounded_rectangle([1, 1, W - 2, H - 2], radius=max(0, corner_r - 1),
                               fill=v["borderL"])
    else:
        draw.rectangle([1, 1, W - 2, H - 2], fill=v["borderL"])

    # 3. Dark shadow border (bottom-right 3D)
    draw.rectangle([2, 2, W - 2, H - 2], fill=v["borderD"])

    # 4. Body fill
    body_y = 1 + title_h
    if corner_r > 0:
        draw.rounded_rectangle([2, body_y, W - 3, H - 3],
                               radius=max(0, corner_r - 2), fill=v["body"])
    else:
        draw.rectangle([2, body_y, W - 3, H - 3], fill=v["body"])

    # 5. Title bar with horizontal gradient
    draw_title_gradient(draw, 2, 2, W - 4, title_h - 1, v["titleStart"], v["titleEnd"])

    # 6. Title bar text
    title_font = try_load_font("Arial Bold", 11)
    draw.text((22, 3 + (title_h - 14) // 2), entry["title"],
              fill=(0xFF, 0xFF, 0xFF), font=title_font)

    # 7. Control buttons (on title bar right)
    ctrl_area_w = 3 * (CTRL_BTN_W + 1) + 4
    ctrl_x = W - ctrl_area_w - 4
    draw_ctrl_buttons(draw, v, ctrl_x, 2, title_h - 1)

    # 8. Icon
    icon_type = entry["icon"]
    icon_cx = 2 + PADDING + ICON_SIZE // 2 + 4
    icon_cy = body_y + (H - body_y - BTN_H - PADDING * 2) // 2
    draw_icon(draw, icon_type, icon_cx, icon_cy, ICON_SIZE)

    # 9. Body text
    body_font = try_load_font("Arial", 11)
    text_x = 2 + PADDING + (ICON_SIZE + PADDING if icon_type != "none" else 0) + 4
    text_y = body_y + PADDING + 2
    text_max_w = W - text_x - PADDING - 4

    # Simple word wrap
    words = entry["body"].split()
    lines = []
    current_line = ""
    for word in words:
        test = (current_line + " " + word).strip()
        bbox = body_font.getbbox(test)
        if bbox[2] - bbox[0] > text_max_w and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test
    if current_line:
        lines.append(current_line)

    for i, line in enumerate(lines):
        draw.text((text_x, text_y + i * 14), line, fill=(0, 0, 0), font=body_font)

    # 10. Buttons
    buttons = entry["buttons"]
    total_btn_w = len(buttons) * BTN_W + (len(buttons) - 1) * BTN_GAP
    btn_start_x = (W - total_btn_w) // 2
    btn_y = H - BTN_H - PADDING - 2

    btn_font = try_load_font("Arial", 10)
    for i, label in enumerate(buttons):
        bx = btn_start_x + i * (BTN_W + BTN_GAP)
        draw_3d_button(draw, bx, btn_y, BTN_W, BTN_H, v, label, btn_font)

    return img


def encode_png_to_b64(img):
    """Encode a PIL Image to base64 PNG string."""
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def encode_file_to_b64(path):
    """Encode a file to base64."""
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def main():
    # Load catalog
    with open(CATALOG_PATH) as f:
        catalog = json.load(f)

    print(f"Loaded {len(catalog)} catalog entries")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Render all dialogs
    png_data = {}
    catalog_entries = []
    for entry in catalog:
        v = VARIANTS[entry["variant"]]
        img = render_dialog(entry, v)

        # Save PNG
        out_path = OUTPUT_DIR / f"{entry['id']}.png"
        img.save(str(out_path), "PNG", optimize=True)

        # Encode
        b64 = encode_png_to_b64(img)
        png_data[entry["id"]] = b64

        title_h = v["titleH"]
        W = DIALOG_WIDTH
        H = DIALOG_HEIGHT_AB + (title_h - 18)
        catalog_entries.append({
            "id": entry["id"],
            "variant": entry["variant"],
            "icon": entry["icon"],
            "w": W,
            "h": H,
        })

        file_size = os.path.getsize(out_path)
        print(f"  {entry['id']}: {W}x{H}px, {file_size} bytes, b64={len(b64)} chars")

    # Encode cursor PNGs
    arrow_path = CURSOR_DIR / "windows_arrow.png"
    hand_path = CURSOR_DIR / "windows_hand.png"
    cursor_arrow_b64 = ""
    cursor_hand_b64 = ""
    if arrow_path.exists():
        cursor_arrow_b64 = encode_file_to_b64(arrow_path)
        print(f"  cursor_arrow: {len(cursor_arrow_b64)} chars b64")
    else:
        print(f"  WARNING: {arrow_path} not found")
    if hand_path.exists():
        cursor_hand_b64 = encode_file_to_b64(hand_path)
        print(f"  cursor_hand: {len(cursor_hand_b64)} chars b64")
    else:
        print(f"  WARNING: {hand_path} not found")

    # Generate JS constants file
    js_lines = []
    js_lines.append("// Auto-generated by tools/render_dialogs.py — DO NOT EDIT")
    js_lines.append("// " + str(len(catalog_entries)) + " pre-rendered dialog PNGs + 2 cursor PNGs")
    js_lines.append("")

    # Catalog array
    js_lines.append("var DIALOG_CATALOG = [")
    for i, e in enumerate(catalog_entries):
        comma = "," if i < len(catalog_entries) - 1 else ""
        js_lines.append(f'    {{ id: "{e["id"]}", variant: "{e["variant"]}", icon: "{e["icon"]}", w: {e["w"]}, h: {e["h"]} }}{comma}')
    js_lines.append("];")
    js_lines.append("")

    # PNG data object
    js_lines.append("var DIALOG_PNG_DATA = {")
    ids = list(png_data.keys())
    for i, cid in enumerate(ids):
        comma = "," if i < len(ids) - 1 else ""
        # Split long b64 strings into concatenated chunks for readability
        b64 = png_data[cid]
        js_lines.append(f'    "{cid}": "{b64}"{comma}')
    js_lines.append("};")
    js_lines.append("")

    # Cursor data
    js_lines.append(f'var CURSOR_ARROW_B64 = "{cursor_arrow_b64}";')
    js_lines.append(f'var CURSOR_HAND_B64 = "{cursor_hand_b64}";')
    js_lines.append("")

    js_content = "\n".join(js_lines)
    with open(JS_OUTPUT, "w") as f:
        f.write(js_content)

    total_b64_size = sum(len(v) for v in png_data.values())
    print(f"\nSummary:")
    print(f"  {len(catalog_entries)} dialog PNGs rendered to {OUTPUT_DIR}/")
    print(f"  Total dialog b64: {total_b64_size:,} chars ({total_b64_size / 1024:.1f} KB)")
    print(f"  Cursor b64: {len(cursor_arrow_b64) + len(cursor_hand_b64):,} chars")
    print(f"  JS constants: {JS_OUTPUT} ({len(js_content):,} chars)")


if __name__ == "__main__":
    main()
