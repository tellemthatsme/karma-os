; ═══════════════════════════════════════════════════════════════════════════
;  KARMA Top — AutoHotkey Global Toggle
;  Ctrl+Shift+T toggles always-on-top for the KARMA HUD window
; ═══════════════════════════════════════════════════════════════════════════
;
;  USAGE:
;    1. Install AutoHotkey v2 from https://www.autohotkey.com/
;    2. Double-click this file (or run: autohotkey.exe karma-top.ahk)
;    3. Press Ctrl+Shift+T anytime to toggle always-on-top for KARMA HUD
;    4. The script runs silently in the system tray
;
;  Future extensions:
;    Add ^+w:: and ^+h:: hotkeys for Widget/HUD-specific targeting
;
;  Right-click the tray icon to pause or exit.
; ═══════════════════════════════════════════════════════════════════════════

#Requires AutoHotkey v2.0
#SingleInstance Force

; ── Win32 API constants ────────────────────────────────────────────────────
WS_EX_TOPMOST := 0x8
GWL_EXSTYLE   := -20
SWP_NOMOVE    := 0x2
SWP_NOSIZE    := 0x1
SWP_SHOWWINDOW:= 0x40

; ── Helper: toggle always-on-top for a window by title pattern ────────────
ToggleTopmost(titlePattern) {
  hwnd := WinExist(titlePattern)
  if !hwnd {
    ToolTip("KARMA Top: No window found matching '" titlePattern "'")
    SetTimer () => ToolTip(), -2000
    return
  }
  exStyle := DllCall("GetWindowLong", "Ptr", hwnd, "Int", GWL_EXSTYLE)
  isTopmost := (exStyle & WS_EX_TOPMOST) != 0

  if isTopmost {
    DllCall("SetWindowPos", "Ptr", hwnd, "Ptr", -2,  ; HWND_NOTOPMOST
      "Int", 0, "Int", 0, "Int", 0, "Int", 0,
      "UInt", SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)
    ToolTip("KARMA: OFF ↓")
  } else {
    DllCall("SetWindowPos", "Ptr", hwnd, "Ptr", -1,  ; HWND_TOPMOST
      "Int", 0, "Int", 0, "Int", 0, "Int", 0,
      "UInt", SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)
    ToolTip("KARMA: PINNED ↑")
  }
  SetTimer () => ToolTip(), -1200
}

; ── Global hotkeys ────────────────────────────────────────────────────────

; Ctrl+Shift+T — Toggle HUD always-on-top
^+t::ToggleTopmost("Karma OS")

; ── System tray info ──────────────────────────────────────────────────────
A_IconTip := "KARMA Top · Ctrl+Shift+T to toggle"
TraySetIcon("shell32.dll", 44)  ; Shield icon

; Show startup notification
ToolTip("KARMA Top ready`nCtrl+Shift+T: Toggle always-on-top")
SetTimer () => ToolTip(), -3000
