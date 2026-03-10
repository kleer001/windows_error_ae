"""Constants — colors, fonts, timing, message pools, blend weights."""

# Visual
C_BSOD_BG = [0, 0, 0.667]
C_BSOD_TEXT = [1, 1, 1]
C_DIALOG_BG = [0.831, 0.816, 0.784]
C_DIALOG_TITLE_BG = [0, 0, 0.502]
C_DIALOG_TITLE_TX = [1, 1, 1]
C_DIALOG_BORDER_L = [1, 1, 1]
C_DIALOG_BORDER_D = [0.4, 0.4, 0.4]
C_DIALOG_BTN_BG = [0.831, 0.816, 0.784]
C_TEXT_OVERLAY = [1, 1, 1]
C_CURSOR_FILL = [1, 1, 1]
C_CURSOR_STROKE = [0, 0, 0]
C_ICON_ERROR = [0.8, 0, 0]
C_ICON_WARNING = [1, 0.800, 0]
C_ICON_QUESTION = [0, 0, 0.800]
C_ICON_INFO = [0, 0, 0.800]
C_PIXEL_COLORS = [
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0.667],
    [1, 0, 1],
    [0, 1, 1],
    [1, 0, 0],
    [0, 1, 0],
]

# Fonts — primary + fallbacks per role (Nuke font names vary by OS/install)
FONT_MONO_CANDIDATES = ["Courier New", "Consolas", "Lucida Console", "monospace"]
FONT_UI_CANDIDATES = ["Arial", "Tahoma", "Segoe UI", "Microsoft Sans Serif", "Helvetica", "sans"]
FONT_STYLES = ["Regular", "Bold", "Medium", "Book", "Normal"]

# Legacy names (used in constants references — prefer set_font() helper)
FONT_MONO = "Courier New"
FONT_UI = "Arial"
FONT_BSOD = "Courier New"


def set_font(knob, candidates, preferred_style="Regular"):
    """Set font on a Text2 font knob, trying candidates and styles until one works.

    Args:
        knob: The nuke knob (e.g. text_node["font"])
        candidates: List of font family names to try in order
        preferred_style: Style to try first ("Regular", "Bold", etc.)
    """
    styles = [preferred_style] + [s for s in FONT_STYLES if s != preferred_style]
    for font_name in candidates:
        for style in styles:
            try:
                knob.setValue(font_name, style)
                return
            except (ValueError, RuntimeError):
                continue
    # All candidates failed — leave Nuke's default font

# Font sizes
FSIZE_BSOD = 13
FSIZE_DIALOG_BODY = 11
FSIZE_DIALOG_TITLE = 11
FSIZE_TEXT_OVER = 14
FSIZE_BUTTON = 10

# Timing
FLOOR_FRAMES = 8
FLOOR_PIXEL_BLOCK = 2
FLOOR_FREEZE_STRIP = 2
MAX_FRAMES = 96

# Blend mode weights per element type
BLEND_WEIGHTS = {
    "bsod": [
        {"value": "normal", "weight": 40}, {"value": "add", "weight": 18},
        {"value": "screen", "weight": 18}, {"value": "overlay", "weight": 10},
        {"value": "hardLight", "weight": 10}, {"value": "difference", "weight": 4},
    ],
    "pixel": [
        {"value": "normal", "weight": 40}, {"value": "add", "weight": 18},
        {"value": "screen", "weight": 18}, {"value": "overlay", "weight": 10},
        {"value": "hardLight", "weight": 10}, {"value": "difference", "weight": 4},
    ],
    "dialog": [
        {"value": "normal", "weight": 60}, {"value": "add", "weight": 12},
        {"value": "screen", "weight": 12}, {"value": "overlay", "weight": 6},
        {"value": "hardLight", "weight": 6}, {"value": "difference", "weight": 4},
    ],
    "cursor": [
        {"value": "normal", "weight": 80}, {"value": "add", "weight": 6},
        {"value": "screen", "weight": 6}, {"value": "overlay", "weight": 3},
        {"value": "hardLight", "weight": 3}, {"value": "difference", "weight": 2},
    ],
    "freeze": [
        {"value": "normal", "weight": 90}, {"value": "add", "weight": 3},
        {"value": "screen", "weight": 3}, {"value": "overlay", "weight": 2},
        {"value": "hardLight", "weight": 1}, {"value": "difference", "weight": 1},
    ],
}

# Map blend mode names to Nuke Merge2 operation strings
BLEND_MODE_MAP = {
    "normal": "over",
    "add": "plus",
    "screen": "screen",
    "overlay": "overlay",
    "hardLight": "hard-light",
    "difference": "difference",
}

# Dialog geometry
DIALOG_WIDTH = 280
DIALOG_HEIGHT = 140
DIALOG_TITLE_H = 18
DIALOG_BTN_W = 60
DIALOG_BTN_H = 20
STACK_OFFSET_X = 10
STACK_OFFSET_Y = 10
MAX_STACK_DEPTH = 8

# Overlay defaults
DEFAULT_SCANLINE_OPACITY = 20
DEFAULT_SCANLINE_SPACING = 4
DEFAULT_NOISE_OPACITY = 8
DEFAULT_NOISE_SCALE = 100
DEFAULT_NOISE_COMPLEXITY = 5
DEFAULT_HEADSCRATCH_FREQ = 20
DEFAULT_HEADSCRATCH_HEIGHT = 2

# Cursor
CURSOR_HEIGHT = 24

# Element control defaults
DEFAULT_ELEMENT_SCALE = 100
DEFAULT_SPEED_MULT = 100
DEFAULT_OPACITY_MIN = 50
DEFAULT_OPACITY_MAX = 100
DEFAULT_ENTRY_FRAMES = 3
DEFAULT_EXIT_FRAMES = 2

# Roto detection keywords
ROTO_KEYWORDS = ["roto", "rotoscope", "matte", "cutout", "subject", "fg"]

# Trails defaults
DEFAULT_TRAILS_CHANCE = 20
DEFAULT_TRAILS_ECHOES = 4
DEFAULT_TRAILS_DECAY = 50

# Freeze strip
C_FREEZE_MIN_HEIGHT = 1
C_FREEZE_MAX_HEIGHT = 64
C_FREEZE_CLUSTER_MIN = 2
C_FREEZE_CLUSTER_MAX = 5
C_FREEZE_CLUSTER_BAND = 200
C_FREEZE_CLUSTER_GAP_MIN = 2
C_FREEZE_CLUSTER_GAP_MAX = 20

# Geometry extras
GEO_ICON_SIZE = 32

# Virtual resolution presets
VIRTUAL_RESOLUTIONS = [
    {"label": "640 x 480", "w": 640, "h": 480},
    {"label": "800 x 600", "w": 800, "h": 600},
    {"label": "1024 x 768", "w": 1024, "h": 768},
    {"label": "1280 x 1024", "w": 1280, "h": 1024},
    {"label": "Native", "w": 0, "h": 0},
]
DEFAULT_VIRTUAL_RES_INDEX = 2

# Message pools
ERROR_MESSAGES = [
    "A problem has been detected and Windows has been shut down to prevent damage to your computer.",
    "This application has performed an illegal operation and will be shut down.",
    "The procedure entry point could not be located in the dynamic link library.",
    "Insufficient system resources exist to complete the requested service.",
    "The instruction at %HEX% referenced memory at %HEX%. The memory could not be read.",
    "Windows has encountered a critical error and needs to restart.",
    "The system has recovered from a serious error.",
    "A fatal exception has occurred at %HEX%.",
    "The file or directory is corrupted and unreadable.",
    "Runtime Error! Program has generated errors and will be closed by Windows.",
    "Stack overflow.",
    "Not enough memory to complete this operation.",
    "An unexpected error has occurred.",
    "Access violation at address %HEX% in module kernel32.dll.",
    "Error loading operating system.",
]

WINDOW_TITLES = [
    "System Error",
    "Fatal Error",
    "Runtime Exception",
    "License Wizard",
    "System Restore",
    "Windows Protection Error",
    "Application Error",
    "Explorer.exe",
    "Not Responding",
    "Error",
    "Warning",
    "Microsoft Visual C++ Runtime",
]

BUTTON_COMBOS = [
    ["OK"],
    ["OK", "Cancel"],
    ["Retry", "Cancel"],
    ["Yes", "No"],
    ["Abort", "Retry", "Ignore"],
    ["OK", "Help"],
]

BSOD_LINES = [
    "*** STOP: %HEX% (%HEX%, %HEX%, %HEX%, %HEX%)",
    "DRIVER_IRQL_NOT_LESS_OR_EQUAL",
    "UNEXPECTED_KERNEL_MODE_TRAP",
    "PAGE_FAULT_IN_NONPAGED_AREA",
    "KERNEL_DATA_INPAGE_ERROR",
    "INACCESSIBLE_BOOT_DEVICE",
    "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED",
    "CRITICAL_PROCESS_DIED",
    "Technical Information:",
    "*** Address %HEX% base at %HEX%",
    "Beginning dump of physical memory",
    "Physical memory dump complete.",
    "Contact your system administrator or technical support group.",
    "If this is the first time you have seen this Stop error screen,",
    "restart your computer. If this screen appears again, follow these steps:",
]

BSOD_LINES_XP = [
    "A problem has been detected and Windows has been shut down to prevent damage",
    "to your computer.",
    "",
    "%BSOD_CODE%",
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
    "*** STOP: %HEX% (%HEX%, %HEX%, %HEX%, %HEX%)",
]

BSOD_LINES_9X = [
    "A fatal exception %BSOD_EXCEPTION% has occurred at %HEX%:%HEX% in VXD VMM(01) +",
    "%HEX%. The current application will be terminated.",
    "",
    "*  Press any key to terminate the current application.",
    "*  Press CTRL+ALT+DELETE again to restart your computer. You will",
    "   lose any unsaved information in all applications.",
    "",
    "",
    "Press any key to continue _",
]

BSOD_CODES = [
    "DRIVER_IRQL_NOT_LESS_OR_EQUAL",
    "UNEXPECTED_KERNEL_MODE_TRAP",
    "PAGE_FAULT_IN_NONPAGED_AREA",
    "KERNEL_DATA_INPAGE_ERROR",
    "INACCESSIBLE_BOOT_DEVICE",
    "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED",
    "CRITICAL_PROCESS_DIED",
]

BSOD_EXCEPTIONS = ["0E", "0D", "06", "0C", "00"]

CORRUPT_TEXT_LINES = [
    "for, unit_icon(?)make green)",
    "r at manufacture.neomution",
    "windows can notify some your system",
    "change for framswork, grove",
    "is equal) omFO_1-100 DE ENOL",
    "sppliting errors or team crshie",
    "sppjscting kernel mode data",
    "select with R... press continue",
    "checking file system on C:",
    "recovering orphaned file chain",
    "*** dumping memory at physical addr",
    "mov eax, [ebp+8] ; load param",
    "NTFS_FILE_SYSTEM",
    "kernel32!RtlUnwind+0x2a",
    "0xDEADBEEF 0xCAFEBABE 0xFF00FF",
]

# Dialog variant palettes
DIALOG_VARIANTS = {
    "A": {
        "body": [0.753, 0.753, 0.753],
        "titleStart": [0, 0, 0.502],
        "titleEnd": [0.063, 0.518, 0.816],
        "borderL": [1, 1, 1],
        "borderMid": [0.875, 0.875, 0.875],
        "borderD": [0.502, 0.502, 0.502],
        "borderOuter": [0, 0, 0],
        "btnBg": [0.753, 0.753, 0.753],
        "btnBorderL": [1, 1, 1],
        "btnBorderD": [0.502, 0.502, 0.502],
        "closeBtn": None,
        "cornerRadius": 0,
        "titleH": 18,
    },
    "B": {
        "body": [0.831, 0.816, 0.784],
        "titleStart": [0.039, 0.141, 0.416],
        "titleEnd": [0.651, 0.792, 0.941],
        "borderL": [1, 1, 1],
        "borderMid": [0.831, 0.816, 0.784],
        "borderD": [0.502, 0.502, 0.502],
        "borderOuter": [0.251, 0.251, 0.251],
        "btnBg": [0.831, 0.816, 0.784],
        "btnBorderL": [1, 1, 1],
        "btnBorderD": [0.502, 0.502, 0.502],
        "closeBtn": None,
        "cornerRadius": 0,
        "titleH": 18,
    },
    "C": {
        "body": [0.925, 0.914, 0.847],
        "titleStart": [0, 0.329, 0.890],
        "titleEnd": [0.239, 0.584, 1.0],
        "borderL": [1, 1, 1],
        "borderMid": [0.925, 0.914, 0.847],
        "borderD": [0.675, 0.659, 0.600],
        "borderOuter": [0, 0, 0],
        "btnBg": [0.925, 0.914, 0.847],
        "btnBorderL": [1, 1, 1],
        "btnBorderD": [0.675, 0.659, 0.600],
        "closeBtn": [0.780, 0.314, 0.314],
        "cornerRadius": 4,
        "titleH": 25,
    },
}

# Dialog catalog (pre-rendered PNGs)
DIALOG_CATALOG = [
    {"id": "A_error_0", "variant": "A", "icon": "error", "w": 280, "h": 140},
    {"id": "A_error_1", "variant": "A", "icon": "error", "w": 280, "h": 140},
    {"id": "A_error_2", "variant": "A", "icon": "error", "w": 280, "h": 140},
    {"id": "A_warning_0", "variant": "A", "icon": "warning", "w": 280, "h": 140},
    {"id": "A_warning_1", "variant": "A", "icon": "warning", "w": 280, "h": 140},
    {"id": "A_warning_2", "variant": "A", "icon": "warning", "w": 280, "h": 140},
    {"id": "A_question_0", "variant": "A", "icon": "question", "w": 280, "h": 140},
    {"id": "A_question_1", "variant": "A", "icon": "question", "w": 280, "h": 140},
    {"id": "A_question_2", "variant": "A", "icon": "question", "w": 280, "h": 140},
    {"id": "A_none_0", "variant": "A", "icon": "none", "w": 280, "h": 140},
    {"id": "A_none_1", "variant": "A", "icon": "none", "w": 280, "h": 140},
    {"id": "A_none_2", "variant": "A", "icon": "none", "w": 280, "h": 140},
    {"id": "B_error_0", "variant": "B", "icon": "error", "w": 280, "h": 140},
    {"id": "B_error_1", "variant": "B", "icon": "error", "w": 280, "h": 140},
    {"id": "B_error_2", "variant": "B", "icon": "error", "w": 280, "h": 140},
    {"id": "B_warning_0", "variant": "B", "icon": "warning", "w": 280, "h": 140},
    {"id": "B_warning_1", "variant": "B", "icon": "warning", "w": 280, "h": 140},
    {"id": "B_warning_2", "variant": "B", "icon": "warning", "w": 280, "h": 140},
    {"id": "B_question_0", "variant": "B", "icon": "question", "w": 280, "h": 140},
    {"id": "B_question_1", "variant": "B", "icon": "question", "w": 280, "h": 140},
    {"id": "B_question_2", "variant": "B", "icon": "question", "w": 280, "h": 140},
    {"id": "B_none_0", "variant": "B", "icon": "none", "w": 280, "h": 140},
    {"id": "B_none_1", "variant": "B", "icon": "none", "w": 280, "h": 140},
    {"id": "B_none_2", "variant": "B", "icon": "none", "w": 280, "h": 140},
    {"id": "C_error_0", "variant": "C", "icon": "error", "w": 280, "h": 147},
    {"id": "C_error_1", "variant": "C", "icon": "error", "w": 280, "h": 147},
    {"id": "C_error_2", "variant": "C", "icon": "error", "w": 280, "h": 147},
    {"id": "C_warning_0", "variant": "C", "icon": "warning", "w": 280, "h": 147},
    {"id": "C_warning_1", "variant": "C", "icon": "warning", "w": 280, "h": 147},
    {"id": "C_warning_2", "variant": "C", "icon": "warning", "w": 280, "h": 147},
    {"id": "C_question_0", "variant": "C", "icon": "question", "w": 280, "h": 147},
    {"id": "C_question_1", "variant": "C", "icon": "question", "w": 280, "h": 147},
    {"id": "C_question_2", "variant": "C", "icon": "question", "w": 280, "h": 147},
    {"id": "C_none_0", "variant": "C", "icon": "none", "w": 280, "h": 147},
    {"id": "C_none_1", "variant": "C", "icon": "none", "w": 280, "h": 147},
    {"id": "C_none_2", "variant": "C", "icon": "none", "w": 280, "h": 147},
]
