@echo off
setlocal EnableExtensions
title UniRadar Dev Server

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:5173/"
set "API_URL=http://127.0.0.1:3001/api/health"
set "RUN_COMMAND=npm run dev"

echo Starting UniRadar development environment...
echo.
echo Project: %CD%
echo App URL: %APP_URL%
echo API Health: %API_URL%
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
  echo [INFO] Dependencies are missing. Running npm install...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Check the message above.
    pause
    exit /b 1
  )
  echo.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.Content -match '<title>Opportunity Agent</title>') { exit 0 } } catch { }; exit 1"
set "APP_READY=%ERRORLEVEL%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; try { $response = Invoke-RestMethod -Uri '%API_URL%' -TimeoutSec 2; if ($response.ok -eq $true) { exit 0 } } catch { }; exit 1"
set "API_READY=%ERRORLEVEL%"

if "%APP_READY%"=="0" if "%API_READY%"=="0" (
  echo [OK] UniRadar is already running. Opening the app...
  start "" "%APP_URL%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

if "%APP_READY%"=="0" (
  set "RUN_COMMAND=npm run server:dev"
  echo [INFO] Frontend is already running. Starting the API server only.
) else if "%API_READY%"=="0" (
  set "RUN_COMMAND=npm run client:dev"
  echo [INFO] API server is already running. Starting the frontend only.
) else (
  echo [INFO] Starting the frontend and API server together.
)

echo Command: %RUN_COMMAND%
echo.
echo The browser will open when both servers are ready.
echo Keep this window open while using UniRadar.
echo.

start "UniRadar Browser Launcher" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$appUrl = '%APP_URL%'; $apiUrl = '%API_URL%'; for ($i = 0; $i -lt 120; $i++) { $appReady = $false; $apiReady = $false; try { $appResponse = Invoke-WebRequest -UseBasicParsing -Uri $appUrl -TimeoutSec 1; $appReady = $appResponse.StatusCode -ge 200 -and $appResponse.Content -match '<title>Opportunity Agent</title>' } catch { }; try { $apiResponse = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 1; $apiReady = $apiResponse.ok -eq $true } catch { }; if ($appReady -and $apiReady) { Start-Process $appUrl; exit 0 }; Start-Sleep -Seconds 1 }; Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('UniRadar could not start within two minutes. Check the development server window for an error.', 'UniRadar startup error') | Out-Null"

call %RUN_COMMAND%
set "DEV_EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%DEV_EXIT_CODE%"=="0" (
  echo [ERROR] The development server stopped with exit code %DEV_EXIT_CODE%.
) else (
  echo Development server stopped.
)
pause
exit /b %DEV_EXIT_CODE%
