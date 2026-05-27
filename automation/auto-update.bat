@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo [%date% %time%] Starting auto-update... >> automation\auto-update.log

call npm run update-news
if errorlevel 1 (
    echo [%date% %time%] ERROR: update-news failed >> automation\auto-update.log
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo [%date% %time%] ERROR: build failed >> automation\auto-update.log
    exit /b 1
)

echo [%date% %time%] Auto-update completed successfully >> automation\auto-update.log
