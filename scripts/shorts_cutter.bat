@echo off
REM YouTube Shorts Clip Cutter
REM Cuts 30-60 second clips from full tracks for YouTube Shorts, TikTok, Reels
REM Requires: ffmpeg (https://ffmpeg.org/download.html)
REM Usage: shorts_cutter.bat

REM Check if ffmpeg is installed
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo ERROR: ffmpeg not found!
    echo.
    echo Install it from: https://ffmpeg.org/download.html
    echo Or via winget: winget install ffmpeg
    echo Or via chocolatey: choco install ffmpeg
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   YouTube Shorts Clip Cutter
echo   TellLemThatsMe - 16 Tracks
echo ============================================
echo.

set INPUT_DIR=C:\Users\karma\Videos\New folder\Media_Bank\youtubevids
set OUTPUT_DIR=C:\Users\karma\Videos\New folder\Media_Bank\shorts

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Track 1: EVERY MORNING WHEN I WAKE UP - Cut the hook (first 45 seconds)
echo [1/16] Cutting: EVERY MORNING WHEN I WAKE UP
ffmpeg -y -i "%INPUT_DIR%\Every morning when I wake up.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_01_every_morning_hook.mp4" 2>nul
echo   Done: short_01_every_morning_hook.mp4

REM Track 2: DONT RUSH ME
echo [2/16] Cutting: DONT RUSH ME
ffmpeg -y -i "%INPUT_DIR%\dont rush me.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_02_dont_rush_me_hook.mp4" 2>nul
echo   Done: short_02_dont_rush_me_hook.mp4

REM Track 3: I LIVE FOR YOU
echo [3/16] Cutting: I LIVE FOR YOU
ffmpeg -y -i "%INPUT_DIR%\i live for you.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_03_i_live_for_you_hook.mp4" 2>nul
echo   Done: short_03_i_live_for_you_hook.mp4

REM Track 4: LIKE I MEANT TO DO
echo [4/16] Cutting: LIKE I MEANT TO DO
ffmpeg -y -i "%INPUT_DIR%\LIKE I MEANT TO DO.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_04_like_i_meant_to_do_hook.mp4" 2>nul
echo   Done: short_04_like_i_meant_to_do_hook.mp4

REM Track 5: MY CHILDREN
echo [5/16] Cutting: MY CHILDREN
ffmpeg -y -i "%INPUT_DIR%\my children.mp4" -ss 0 -t 55 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_05_my_children_hook.mp4" 2>nul
echo   Done: short_05_my_children_hook.mp4

REM Track 6: WEATHER YOU CAN DO
echo [6/16] Cutting: WEATHER YOU CAN DO
ffmpeg -y -i "%INPUT_DIR%\weather you can do.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_06_weather_you_can_do_hook.mp4" 2>nul
echo   Done: short_06_weather_you_can_do_hook.mp4

REM Track 7: I CANT BE HIM
echo [7/16] Cutting: I CANT BE HIM
ffmpeg -y -i "%INPUT_DIR%\i cant be him.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_07_i_cant_be_him_hook.mp4" 2>nul
echo   Done: short_07_i_cant_be_him_hook.mp4

REM Track 8: TELLEMTHATSME
echo [8/16] Cutting: TELLEMTHATSME
ffmpeg -y -i "%INPUT_DIR%\tellemtrhatsme.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_08_tellemthatsme_hook.mp4" 2>nul
echo   Done: short_08_tellemthatsme_hook.mp4

REM Track 9: EVIL PAST
echo [9/16] Cutting: EVIL PAST
ffmpeg -y -i "%INPUT_DIR%\evil past.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_09_evil_past_hook.mp4" 2>nul
echo   Done: short_09_evil_past_hook.mp4

REM Track 10: JUST DRILL ME
echo [10/16] Cutting: JUST DRILL ME
ffmpeg -y -i "%INPUT_DIR%\just drill me.mp4" -ss 0 -t 40 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_10_just_drill_me_hook.mp4" 2>nul
echo   Done: short_10_just_drill_me_hook.mp4

REM Track 11: WOODS
echo [11/16] Cutting: WOODS
ffmpeg -y -i "%INPUT_DIR%\woods.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_11_woods_hook.mp4" 2>nul
echo   Done: short_11_woods_hook.mp4

REM Track 12: NO CHEATS
echo [12/16] Cutting: NO CHEATS
ffmpeg -y -i "%INPUT_DIR%\no cheats.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_12_no_cheats_hook.mp4" 2>nul
echo   Done: short_12_no_cheats_hook.mp4

REM Track 13: TILL I'M DONE
echo [13/16] Cutting: TILL I'M DONE
ffmpeg -y -i "%INPUT_DIR%\till im done.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_13_till_im_done_hook.mp4" 2>nul
echo   Done: short_13_till_im_done_hook.mp4

REM Track 14: AI FIVE
echo [14/16] Cutting: AI FIVE
ffmpeg -y -i "%INPUT_DIR%\ai five.mp4" -ss 0 -t 45 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_14_ai_five_hook.mp4" 2>nul
echo   Done: short_14_ai_five_hook.mp4

REM Track 15: SINCE I WAS YOUNG
echo [15/16] Cutting: SINCE I WAS YOUNG
ffmpeg -y -i "%INPUT_DIR%\since i was young.mp4" -ss 0 -t 50 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_15_since_i_was_young_hook.mp4" 2>nul
echo   Done: short_15_since_i_was_young_hook.mp4

REM Track 16: EVERY MORNING (MV)
echo [16/16] Cutting: EVERY MORNING (MV)
ffmpeg -y -i "%INPUT_DIR%\Every morning when I wake up.mp4" -ss 0 -t 55 -c:v libx264 -c:a aac -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "%OUTPUT_DIR%\short_16_every_morning_mv_hook.mp4" 2>nul
echo   Done: short_16_every_morning_mv_hook.mp4

echo.
echo ============================================
echo   ALL 16 SHORTS CLIPS CUT!
echo   Output: %OUTPUT_DIR%
echo ============================================
echo.
echo Next steps:
echo   1. Review clips in output folder
echo   2. Upload each to YouTube Shorts
echo   3. Post to TikTok and Instagram Reels
echo.
pause
