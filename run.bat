@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  pause
  exit /b 1
)

echo [START] Starting V9 Bot...
node index.js
set EXITCODE=%errorlevel%
echo [STOP] Bot stopped with exit code %EXITCODE%.
pause
endlocal
