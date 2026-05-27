@echo off
cd /d "%~dp0\.."

REM Build first to ensure dist/ is up to date
echo.
echo ==========================================
echo   GlobalPulse News Briefing
echo ==========================================
echo.
echo Building site...
call npm run build
if errorlevel 1 (
  echo Build failed. Please check errors above.
  pause
  exit /b 1
)

echo.
echo Starting local server...
echo Open http://localhost:8080 in your browser
echo Press Ctrl+C to stop
echo.
node serve.cjs
