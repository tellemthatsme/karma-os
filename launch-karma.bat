@echo off
chcp 65001 >nul 2>&1
color 0A
title=KARMA OS Launcher

setlocal enabledelayedexpansion

:: KARMA OS - Interactive Dashboard Launcher
:: ==========================================

echo.
echo  ██████╗ ██╗   ██╗███╗  ██╗ ██████╗ ███████╗███████╗
echo  ██╔══██╗██║   ██║████╗ ██║██╔════╝ ██╔════╝██╔════╝
echo  ██████╔╝██║   ██║██╔██╗██║██║  ███╗█████╗  ███████╗
echo  ██╔══██╗██║   ██║██║╚████║██║   ██║██╔══╝  ╚════██║
echo  ██████╔╝╚██████╔╝██║ ╚███║╚██████╔╝███████╗███████║
echo  ╚═════╝  ╚═════╝ ╚═╝  ╚══╝ ╚═════╝ ╚══════╝╚══════╝
echo  ██╗    ██╗ ██████╗ ██████╗ ██████╗
echo  ██║    ██║██╔═══██╗██╔══██╗██╔══██╗
echo  ██║ █╗ ██║██║   ██║██████╔╝██║  ██║
echo  ██║███╗██║██║   ██║██╔══██╗██║  ██║
echo  ╚███╔███╔╝╚██████╔╝██║  ██║██████╔╝
echo   ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝
echo.
echo  Interactive Dashboard Launcher
timeout /t 1 >nul 2>&1
cls

:menu
color 0A
cls
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       KARMA OS - SELECT A DASHBOARD           ║
echo  ╠══════════════════════════════════════════════╣
echo  ║  1.  karma-os-ultimate.html  [MAIN OS]        ║
echo  ║  2.  karma-widget.html       [FLOATING WIDGET]║
echo  ║  3.  live-desktop.html       [FULL DASHBOARD] ║
echo  ║  4.  karma-hud.html           [ALWAYS-ON-TOP HUD]║
echo  ║  5.  karma-os-v6.html         [LEGACY v6]      ║
echo  ║  6.  ALL DASHBOARDS (Chrome, New Windows)     ║
echo  ║  7.  RUN PLAYWRIGHT TESTS                    ║
echo  ║  8.  RUN HEADLESS VALIDATION                 ║
echo  ║  9.  VIEW KARMA-DASHBOARDS.txt               ║
echo  ║  0.  EXIT                                    ║
echo  ║  T.  TOGGLE ALWAYS-ON-TOP (for HUD)          ║
echo  ╚══════════════════════════════════════════════╝
echo.
set /p CHOICE="Select option (0-9): "

if "%CHOICE%"=="1" goto :open_ultimate
if "%CHOICE%"=="2" goto :open_widget
if "%CHOICE%"=="3" goto :open_desktop
if "%CHOICE%"=="4" goto :open_hud
if "%CHOICE%"=="5" goto :open_legacy
if "%CHOICE%"=="6" goto :open_all
if "%CHOICE%"=="7" goto :run_tests
if "%CHOICE%"=="8" goto :run_validate
if "%CHOICE%"=="9" goto :view_doc
if "%CHOICE%"=="0" goto :exit
if /i "%CHOICE%"=="T" goto :toggle_top

echo Invalid option. Press any key to continue...
pause >nul
goto :menu

:open_ultimate
echo.
echo  Launching KARMA OS Ultimate...
start chrome "C:\karma\karma-os-ultimate.html"
echo  Done! Opening in Chrome.
echo.
pause
goto :menu

:open_widget
echo.
echo  Launching KARMA Widget...
start chrome "C:\karma\karma-widget.html"
echo  Done! Opening in Chrome.
echo.
pause
goto :menu

:open_desktop
echo.
echo  Launching Live Desktop Dashboard...
start chrome "C:\karma\live-desktop.html"
echo  Done! Opening in Chrome.
echo.
pause
goto :menu

:open_hud
echo.
echo  Launching KARMA HUD in always-on-top mode...
echo  (Pin icon inside HUD toggles always-on-top)
start chrome --app="C:\karma\karma-hud.html" --window-size=320,520 --window-position=980,40
echo  Done! HUD launched top-right.
echo.
pause
goto :menu

:open_legacy
echo.
echo  Launching KARMA OS v6 (Legacy)...
start chrome "C:\karma\karma-os-v6.html"
echo  Done! Opening in Chrome.
echo.
pause
goto :menu

:open_all
echo.
echo  Opening ALL dashboards in separate Chrome windows...
start chrome "C:\karma\karma-os-ultimate.html"
timeout /t 1 >nul 2>&1
start chrome "C:\karma\karma-widget.html"
timeout /t 1 >nul 2>&1
start chrome "C:\karma\live-desktop.html"
timeout /t 1 >nul 2>&1
start chrome --app="C:\karma\karma-hud.html" --window-size=320,520 --window-position=980,40
echo  All 4 dashboards opening! (HUD top-right)
echo.
pause
goto :menu

:run_tests
echo.
color 0B
echo  Running Playwright test suite...
echo.
cd C:\karma
call npx playwright test --project=chromium --reporter=list --workers=1
if errorlevel 1 (
  echo.
  echo  Some tests may have failed. Check output above.
) else (
  echo.
  echo  All tests passed!
)
echo.
pause
goto :menu

:run_validate
echo.
color 0B
echo  Running headless validation...
echo.
cd C:\karma
node validate-karma.js
echo.
pause
goto :menu

:toggle_top
echo.
echo  Toggling always-on-top for KARMA HUD...
powershell -ExecutionPolicy Bypass -File "C:\karma\karma-top.ps1"
echo.
pause
goto :menu

:view_doc
echo.
color 0E
if exist "C:\karma\KARMA-DASHBOARDS.txt" (
  type "C:\karma\KARMA-DASHBOARDS.txt"
) else (
  echo  File not found: KARMA-DASHBOARDS.txt
)
echo.
pause
goto :menu

:exit
color 07
echo.
echo  Closing KARMA OS Launcher...
echo  Goodbye!
timeout /t 1 >nul 2>&1
exit
