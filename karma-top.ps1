<#
.SYNOPSIS
  KARMA Top — Toggle always-on-top for a window by title
.DESCRIPTION
  Finds a window matching the given title pattern and toggles its
  always-on-top (TOPMOST) state using the Win32 SetWindowPos API.
.PARAMETER Title
  Substring to match the window title (default: "Karma OS")
.PARAMETER Widget
  Switch to target the KARMA Widget window (matches "Karma OS")
  Note: both HUD & Widget contain "Karma OS" in title, so -Widget
  controls display messages only. Close the other Karma window if you
  need to target one specifically.
.PARAMETER Off
  Switch to force always-on-top OFF instead of toggling
.EXAMPLE
  .\karma-top.ps1
  Toggles always-on-top for the KARMA window (HUD preferred)
.EXAMPLE
  .\karma-top.ps1 -Widget
  Toggles always-on-top targeting the Widget specifically
.EXAMPLE
  .\karma-top.ps1 -Title "Notepad"
  Toggles always-on-top for a Notepad window
.EXAMPLE
  .\karma-top.ps1 -Off
  Forces always-on-top OFF for the KARMA HUD
.EXAMPLE
  .\karma-top.ps1 -Widget -Off
  Forces always-on-top OFF for the KARMA Widget
#>

param(
  [string]$Title = "Karma OS",
  [switch]$Widget,
  [switch]$Off
)

# Both HUD & Widget page titles start with "Karma OS", so substring match works
# for both. The -Widget flag exists for display/future differentiation.
$targetName = if ($Widget) { "KARMA Widget" } else { "KARMA HUD" }

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
  public const int GWL_EXSTYLE = -20;
  public const int WS_EX_TOPMOST = 0x00000008;
  public const uint SWP_NOSIZE = 0x0001;
  public const uint SWP_NOMOVE = 0x0002;
  public const uint SWP_SHOWWINDOW = 0x0040;
}
"@

# Find all windows with matching title (Chrome window titles include page title)
$windows = @()
$procs = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
foreach ($proc in $procs) {
  if ($proc.MainWindowTitle -match [regex]::Escape($Title)) {
    $windows += $proc.MainWindowHandle
  }
}

if ($windows.Count -eq 0) {
  Write-Host "KARMA Top: No window found matching '$Title'" -ForegroundColor Yellow
  Write-Host "Make sure the $targetName is open in Chrome." -ForegroundColor Gray
  Write-Host "Tip: Use --app flag for frameless window (launch-karma.bat)" -ForegroundColor Gray
  exit 1
}

foreach ($hwnd in $windows) {
  $exStyle = [Win32]::GetWindowLong($hwnd, [Win32]::GWL_EXSTYLE)
  $isTopmost = ($exStyle -band [Win32]::WS_EX_TOPMOST) -ne 0

  if ($Off -or $isTopmost) {
    [Win32]::SetWindowPos($hwnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0,
      [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW)
    Write-Host "KARMA Top: Always-on-top OFF  ↓  ($targetName)" -ForegroundColor Cyan
  } else {
    [Win32]::SetWindowPos($hwnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0,
      [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW)
    Write-Host "KARMA Top: Always-on-top ON  ↑  ($targetName pinned above all)" -ForegroundColor Green
  }
}

if ($windows.Count -gt 1) {
  Write-Host "Note: $($windows.Count) KARMA windows toggled (both HUD & Widget open)." -ForegroundColor Yellow
  Write-Host "Close one to target individual windows." -ForegroundColor Gray
}
Write-Host "Run again to toggle." -ForegroundColor Gray
