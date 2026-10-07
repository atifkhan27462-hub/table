from typing import List
from pydantic import BaseModel, Field


class KioskSecurityPolicy(BaseModel):
    """
    Security directives sent to table hardware clients to prevent customers
    from escaping into the underlying OS or manipulating browser windows.
    """
    kiosk_enabled: bool = True
    block_context_menu: bool = True
    block_keyboard_shortcuts: List[str] = Field(default_factory=lambda: [
        "F11", "F12",
        "Control+Shift+I", "Control+Shift+J", "Control+Shift+C",
        "Control+U", "Control+R", "Control+N", "Control+T", "Control+W",
        "Alt+Tab", "Alt+F4", "Escape",
    ])
    block_text_selection: bool = True
    block_pinch_zoom: bool = True
    enforce_fullscreen: bool = True
    inactivity_timeout_seconds: int = 300
    emergency_unlock_pin: str = "7788"
    allowed_navigation_domains: List[str] = Field(default_factory=lambda: [
        "localhost",
        "127.0.0.1",
        "smarttable.local",
    ])
