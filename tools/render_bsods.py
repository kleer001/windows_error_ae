#!/usr/bin/env python3
"""
render_bsods.py — Render pre-baked BSOD PNGs and encode to base64.

Reads render_bsod_catalog.json, renders each BSOD as a pixel-perfect PNG
matching the Windows XP / 9x blue screen aesthetic, and outputs:
  1. Individual PNGs in tools/rendered/
  2. A JS constants file (tools/rendered/bsod_constants.js) ready for embedding

Requirements: pip install Pillow
"""

import json
import os
import random
import sys
import base64
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CATALOG_PATH = SCRIPT_DIR / "render_bsod_catalog.json"
OUTPUT_DIR = SCRIPT_DIR / "rendered"
JS_OUTPUT = OUTPUT_DIR / "bsod_constants.js"

# ── Dimensions ────────────────────────────────────────────
# Render at a reference size large enough for any variant.
# The AE builder will scale/mask to fullStrip, corner, or island.
BSOD_W = 640
BSOD_H_XP = 260
BSOD_H_9X = 180

# ── Colors ────────────────────────────────────────────────
BLUE_XP = (0x00, 0x00, 0xAA)      # #0000AA — matches C_BSOD_BG in JSX
BLUE_9X = (0x00, 0x00, 0xAA)      # same blue for 9x
WHITE = (0xFF, 0xFF, 0xFF)
GREY_9X = (0xAA, 0xAA, 0xAA)      # highlight bar color

# ── Font ──────────────────────────────────────────────────
FONT_SIZE = 13  # matches FSIZE_BSOD in JSX
LINE_HEIGHT = FONT_SIZE + 3


def get_mono_font(size):
    """Try to find a monospace font, fall back gracefully."""
    candidates = [
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
        "C:/Windows/Fonts/cour.ttf",
        "C:/Windows/Fonts/lucon.ttf",
        "/System/Library/Fonts/Courier.dfont",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    print("WARNING: No monospace TTF found, using default font")
    return ImageFont.load_default()


def fake_hex(rnd, digits=8):
    """Generate a fake hex string like 0x0A3F28C1."""
    return "0x" + "".join(rnd.choice("0123456789ABCDEF") for _ in range(digits))


# ── XP BSOD Template ─────────────────────────────────────
def xp_lines(code, rnd):
    """Generate XP-era BSOD text lines."""
    return [
        "A problem has been detected and Windows has been shut down to prevent damage",
        "to your computer.",
        "",
        code,
        "",
        "If this is the first time you've seen this Stop error screen,",
        "restart your computer. If this screen appears again, follow",
        "these steps:",
        "",
        "Check to make sure any new hardware or software is properly installed.",
        "If this is a new installation, ask your hardware or software manufacturer",
        "for any Windows updates you might need.",
        "",
        "If problems continue, disable or remove any newly installed hardware",
        "or software. Disable BIOS memory options such as caching or shadowing.",
        "If you need to use Safe Mode to remove or disable components, restart",
        "your computer, press F8 to select Advanced Startup Options, and then",
        "select Safe Mode.",
        "",
        "Technical information:",
        "",
        f"*** STOP: {fake_hex(rnd)} ({fake_hex(rnd)}, {fake_hex(rnd)}, {fake_hex(rnd)}, {fake_hex(rnd)})",
    ]


# ── 9x BSOD Template ─────────────────────────────────────
def nine_x_lines(exception, rnd):
    """Generate 9x-era BSOD text lines."""
    return [
        f"A fatal exception {exception} has occurred at {fake_hex(rnd, 4)}:{fake_hex(rnd)} in VXD VMM(01) +",
        f"{fake_hex(rnd)}. The current application will be terminated.",
        "",
        "*  Press any key to terminate the current application.",
        "*  Press CTRL+ALT+DELETE again to restart your computer. You will",
        "   lose any unsaved information in all applications.",
        "",
        "",
        "Press any key to continue _",
    ]


def render_xp(entry, font, rnd):
    """Render an XP-era BSOD PNG."""
    w, h = BSOD_W, BSOD_H_XP
    img = Image.new("RGB", (w, h), BLUE_XP)
    d = ImageDraw.Draw(img)

    lines = xp_lines(entry["code"], rnd)
    x_margin = 10
    y = 8
    for line in lines:
        if y + LINE_HEIGHT > h:
            break
        d.text((x_margin, y), line, fill=WHITE, font=font)
        y += LINE_HEIGHT

    return img


def render_9x(entry, font, rnd):
    """Render a 9x-era BSOD PNG with grey highlight bar."""
    w, h = BSOD_W, BSOD_H_9X
    img = Image.new("RGB", (w, h), BLUE_9X)
    d = ImageDraw.Draw(img)

    lines = nine_x_lines(entry["code"], rnd)
    x_margin = 10
    y_start = 8

    # Grey highlight bar for the header line
    bar_h = FONT_SIZE + 4
    d.rectangle([0, y_start - 2, w, y_start + bar_h - 2], fill=GREY_9X)

    # Header text (blue on grey — inverted)
    header = "A Fatal Exception Has Occurred"
    d.text((x_margin, y_start), header, fill=BLUE_9X, font=font)

    # Body text (white on blue)
    y = y_start + bar_h + 6
    for line in lines:
        if y + LINE_HEIGHT > h:
            break
        d.text((x_margin, y), line, fill=WHITE, font=font)
        y += LINE_HEIGHT

    # Blinking block cursor at the end (rendered in "on" state)
    cursor_w = 9
    cursor_h = FONT_SIZE
    cursor_x = x_margin + len("Press any key to continue _") * 8  # approximate
    cursor_y = y - LINE_HEIGHT  # last line
    # Position after the underscore
    last_line = lines[-1] if lines else ""
    try:
        text_w = font.getlength(last_line)
    except AttributeError:
        text_w = len(last_line) * 8
    cursor_x = x_margin + int(text_w) + 2
    cursor_y = y - LINE_HEIGHT
    d.rectangle([cursor_x, cursor_y, cursor_x + cursor_w, cursor_y + cursor_h], fill=WHITE)

    return img


def encode_png_to_b64(img):
    """Encode a PIL Image to PNG base64 string. Convert to palette mode for smaller PNGs."""
    # BSODs have very few colors (blue, white, grey) — palette mode compresses much better
    palettized = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    buf = BytesIO()
    palettized.save(buf, "PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main():
    with open(CATALOG_PATH) as f:
        catalog = json.load(f)

    print(f"Loaded {len(catalog)} BSOD catalog entries")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    font = get_mono_font(FONT_SIZE)

    png_data = {}
    catalog_entries = []

    for i, entry in enumerate(catalog):
        # Seed RNG per entry for reproducible hex values
        rnd = random.Random(42 + i)

        era = entry["era"]
        if era == "xp":
            img = render_xp(entry, font, rnd)
        else:
            img = render_9x(entry, font, rnd)

        # Save PNG
        out_path = OUTPUT_DIR / f"bsod_{entry['id']}.png"
        img.save(str(out_path), "PNG", optimize=True)

        # Encode
        b64 = encode_png_to_b64(img)
        png_data[entry["id"]] = b64

        w, h = img.size
        catalog_entries.append({
            "id": entry["id"],
            "era": era,
            "w": w,
            "h": h,
        })

        file_size = os.path.getsize(out_path)
        print(f"  {entry['id']}: {w}x{h}px, {file_size} bytes, b64={len(b64)} chars")

    # Generate JS constants file
    js_lines = []
    js_lines.append("// Auto-generated by tools/render_bsods.py — DO NOT EDIT")
    js_lines.append(f"// {len(catalog_entries)} pre-rendered BSOD PNGs")
    js_lines.append("")

    # Catalog array
    js_lines.append("var BSOD_CATALOG = [")
    for i, e in enumerate(catalog_entries):
        comma = "," if i < len(catalog_entries) - 1 else ""
        js_lines.append(
            f'    {{ id: "{e["id"]}", era: "{e["era"]}", w: {e["w"]}, h: {e["h"]} }}{comma}'
        )
    js_lines.append("];")
    js_lines.append("")

    # PNG data object
    js_lines.append("var BSOD_PNG_DATA = {")
    ids = list(png_data.keys())
    for i, cid in enumerate(ids):
        comma = "," if i < len(ids) - 1 else ""
        js_lines.append(f'    "{cid}": "{png_data[cid]}"{comma}')
    js_lines.append("};")
    js_lines.append("")

    js_content = "\n".join(js_lines)
    with open(JS_OUTPUT, "w") as f:
        f.write(js_content)

    total_b64_size = sum(len(v) for v in png_data.values())
    print(f"\nSummary:")
    print(f"  {len(catalog_entries)} BSOD PNGs rendered to {OUTPUT_DIR}/")
    print(f"  Total b64: {total_b64_size:,} chars ({total_b64_size / 1024:.1f} KB)")
    print(f"  JS constants: {JS_OUTPUT} ({len(js_content):,} chars)")


if __name__ == "__main__":
    main()
