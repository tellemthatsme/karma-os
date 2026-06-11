@echo off
REM ============================================
REM START BROWSER BRIDGE
REM Starts the bridge server for MCP/browser automation
REM
REM Usage: Double-click this file or run from terminal
REM ============================================

echo ============================================
echo  AI Browser Bridge Server
echo  URL: http://127.0.0.1:9876
echo ============================================
echo.
echo Starting bridge server...
echo Keep this window open while using the bridge.
echo Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
python bridge_server.py

pause
