"""Asset management — base64 PNG decode and custom asset pipeline.

Handles embedded dialog/cursor PNGs and custom user assets.
"""

import os
import base64


CUSTOM_ASSET_DIR = os.path.expanduser("~/.nuke/WindowsErrorFX/custom/")


def ensure_custom_dir():
    """Create the custom asset directory if it doesn't exist."""
    if not os.path.exists(CUSTOM_ASSET_DIR):
        os.makedirs(CUSTOM_ASSET_DIR)


def decode_and_save_png(b64_data, filename):
    """Decode base64 PNG data and save to the custom asset directory.

    Returns the full path to the saved file.
    """
    ensure_custom_dir()
    filepath = os.path.join(CUSTOM_ASSET_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(b64_data))
    return filepath


def list_custom_assets():
    """List all PNG files in the custom asset directory."""
    ensure_custom_dir()
    return [f for f in os.listdir(CUSTOM_ASSET_DIR) if f.lower().endswith(".png")]


def get_asset_path(filename):
    """Get the full path for a custom asset file."""
    return os.path.join(CUSTOM_ASSET_DIR, filename)
