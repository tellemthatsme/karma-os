@echo off
REM ============================================
REM AI NEWS NARRATION GENERATOR
REM Uses edge-tts to generate voiceover for news videos
REM Voice: en-AU-WilliamNeural (Australian male, energetic)
REM
REM Usage: generate_narration.bat
REM Output: Videos\New folder\Media_Bank\audio\narration\
REM ============================================

echo ============================================
echo  AI NEWS NARRATION GENERATOR
echo  Voice: en-AU-WilliamNeural
echo ============================================
echo.

REM Check edge-tts is available
python -m edge_tts --help >nul 2>&1
if errorlevel 1 (
    echo ERROR: edge-tts not found. Install it with:
    echo   pip install edge-tts
    echo.
    pause
    exit /b 1
)

REM Set output directory
set "OUTDIR=%USERPROFILE%\Videos\New folder\Media_Bank\audio\narration"
if not exist "%OUTDIR%" mkdir "%OUTDIR%"

set "VOICE=en-AU-WilliamNeural"
set "RATE=+5%%"

echo Generating narration segments...
echo.

REM --- INTRO ---
echo [1/7] Generating INTRO...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "What's up everyone. This is your weekly AI breakdown. Five tools dropped this week that are going to change how you create content, write code, and honestly, how you live your life. I tested every single one so you don't have to waste your time. Let's get into it." --write-media "%OUTDIR%\01_intro.mp3" 2>nul
echo   Done: 01_intro.mp3

REM --- TOOL SEGMENT (Template - duplicate and edit for each tool) ---
echo [2/7] Generating TOOL 1 TEMPLATE...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "Number one. This is a brand new AI tool that just dropped and it is absolutely insane. Here's why it matters. I tested it myself and the results blew my mind. The free tier gives you plenty to work with. If you're a content creator, this changes everything." --write-media "%OUTDIR%\02_tool_template.mp3" 2>nul
echo   Done: 02_tool_template.mp3

echo [3/7] Generating TOOL 2 TEMPLATE...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "Number two. This one is next level. What makes it different from everything else is the speed and quality. I've been using it every single day and the results speak for themselves. The best part? It's completely free to get started." --write-media "%OUTDIR%\03_tool_template_2.mp3" 2>nul
echo   Done: 03_tool_template_2.mp3

echo [4/7] Generating TOOL 3 TEMPLATE...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "Number three. And this is the one I keep coming back to. The integration with existing workflows makes this incredibly powerful. If you're building anything with AI right now, you need to check this out. Let me show you exactly how it works." --write-media "%OUTDIR%\04_tool_template_3.mp3" 2>nul
echo   Done: 04_tool_template_3.mp3

echo [5/7] Generating TOOL 4 TEMPLATE...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "Number four. This one is for the developers out there. The API is clean, the documentation is solid, and the results are production-ready. I've integrated it into three projects this week alone. Here's how to get started in under five minutes." --write-media "%OUTDIR%\05_tool_template_4.mp3" 2>nul
echo   Done: 05_tool_template_4.mp3

echo [6/7] Generating TOOL 5 TEMPLATE...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "And number five. This is the one that made me say no way out loud. I have never seen anything like this before. Watch what happens when I feed it this input. The fact that this is free is absolutely game changing. This changes the entire landscape." --write-media "%OUTDIR%\06_tool_template_5.mp3" 2>nul
echo   Done: 06_tool_template_5.mp3

REM --- OUTRO ---
echo [7/7] Generating OUTRO...
python -m edge_tts --voice %VOICE% --rate=%RATE% --text "So those are the five AI tools that changed the game this week. Which one are you going to try first? Drop it in the comments. If this helped you out, smash that subscribe button. I break down the latest AI tools every single week so you never miss out. I'm also a music artist, check the links in the description for my latest tracks. Until next time, stay creative, stay curious, and I'll catch you in the next one. Peace." --write-media "%OUTDIR%\07_outro.mp3" 2>nul
echo   Done: 07_outro.mp3

echo.
echo ============================================
echo  ALL NARRATION GENERATED
echo  Output: %OUTDIR%
echo ============================================
echo.
echo Files:
dir /b "%OUTDIR%\*.mp3" 2>nul
echo.
echo Next steps:
echo   1. Edit text in this .bat file for your specific tools
echo   2. Re-run to regenerate
echo   3. Import all .mp3 files into DaVinci Resolve
echo   4. Layer with B-roll and background music
echo.
pause
