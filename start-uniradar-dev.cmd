@echo off
setlocal
title UniRadar Dev Server

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:5173/"
set "API_URL=http://127.0.0.1:3001/api/health"

echo Starting UniRadar development server...
echo.
echo Project: %CD%
echo Command: npm run dev
echo App URL: %APP_URL%
echo API Health: %API_URL%
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Please install Node.js first.
  echo.
  pause
  exit /b 1
)

echo The browser will open automatically after both the frontend and API server are ready.
echo If it does not open, check this window for port or startup errors.
echo.
start "UniRadar Browser Launcher" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$appUrl = 'http://127.0.0.1:5173/'; $apiUrl = 'http://127.0.0.1:3001/api/health'; for ($i = 0; $i -lt 90; $i++) { $appReady = $false; $apiReady = $false; try { $appResponse = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 1; $appReady = $appResponse.StatusCode -ge 200 } catch { }; try { $apiResponse = Invoke-WebRequest -UseBasicParsing -Uri $apiUrl -TimeoutSec 1; $apiReady = $apiResponse.StatusCode -ge 200 } catch { }; if ($appReady -and $apiReady) { Start-Process $appUrl; exit 0 }; Start-Sleep -Seconds 1 }; Write-Host 'UniRadar did not open because the frontend or API server was not ready. Check the dev server window.'; Read-Host 'Press Enter to close'"

npm run dev

echo.
echo Dev server stopped.
pause