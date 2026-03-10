"""WindowsErrorFX for Nuke — Windows 9x/XP error aesthetic VFX generator."""

__version__ = "0.1.0"

import os as _os

# Register bundled Liberation fonts with Nuke's font search path.
# Nuke reads NUKE_FONT_PATH at startup and when scanning for fonts.
_fonts_dir = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "fonts")
if _os.path.isdir(_fonts_dir):
    _existing = _os.environ.get("NUKE_FONT_PATH", "")
    if _fonts_dir not in _existing:
        _os.environ["NUKE_FONT_PATH"] = (
            _fonts_dir + _os.pathsep + _existing if _existing else _fonts_dir
        )
