"""Nuke menu/toolbar registration for WindowsErrorFX.

Add this to your ~/.nuke/menu.py:
    import WindowsErrorFX_Nuke.menu
"""

import nuke


def add_wefx_menu():
    """Register WindowsErrorFX in the Nuke toolbar."""
    toolbar = nuke.toolbar("Nodes")
    wefx_menu = toolbar.addMenu("WindowsErrorFX", icon="")

    wefx_menu.addCommand(
        "Create WindowsErrorFX",
        "import WindowsErrorFX_Nuke.control as ctrl; ctrl.create_wefx_group()",
    )


# Auto-register when imported
add_wefx_menu()
