"""Logging for WindowsErrorFX Nuke.

Mirrors the AE plugin's logging system: file-based, overwritten each run.
Log file lives in the WindowsErrorFX_Nuke package directory.
"""

import os
import datetime

_log_buffer = []
_log_file = None
_log_path = ""
_log_enabled = True


def _get_log_path():
    """Resolve log file path inside the package directory."""
    pkg_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(pkg_dir, "WindowsErrorFX.log")


def wlog_open():
    """Open the log file for writing. Called at the start of each Generate/Clear.

    Overwrites any previous log -- one run per file, always fresh.
    """
    global _log_buffer, _log_file, _log_path
    _log_buffer = []
    _log_path = _get_log_path()
    try:
        _log_file = open(_log_path, "w")
        _log_file.write("# WindowsErrorFX Log (Nuke)\n")
        _log_file.write("# %s\n" % datetime.datetime.now())
        _log_file.write("# This file is overwritten on each run and is safe to delete.\n")
        _log_file.write("#\n")
    except Exception:
        _log_file = None


def wlog_close():
    """Close the log file. Called at the end of each Generate/Clear."""
    global _log_file
    if _log_file:
        try:
            _log_file.close()
        except Exception:
            pass
        _log_file = None


def wlog(msg):
    """Append a message to in-memory buffer, disk file, and stdout."""
    if not _log_enabled:
        return
    entry = "[WEFX] %s" % msg
    _log_buffer.append(entry)
    if _log_file:
        try:
            _log_file.write(entry + "\n")
            _log_file.flush()
        except Exception:
            pass


def wwarn(msg):
    """Log a warning (prefixed for easy scanning)."""
    wlog("WARN: %s" % msg)


def werr(msg):
    """Log an error (prefixed for easy scanning)."""
    wlog("ERROR: %s" % msg)


def wlog_obj(label, obj, keys):
    """Log an object's key fields (shallow, one line)."""
    parts = []
    for k in keys:
        v = obj.get(k)
        if v is not None and isinstance(v, (list, tuple)):
            parts.append("%s=[%d items]" % (k, len(v)))
        else:
            parts.append("%s=%s" % (k, v))
    wlog("%s: %s" % (label, ", ".join(parts)))


def get_log():
    """Return the full in-memory log as a single string."""
    return "\n".join(_log_buffer)


def get_log_path():
    """Return the path to the log file on disk."""
    return _log_path
