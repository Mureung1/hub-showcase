@echo off
title GNU Course AI Navigator Launcher
echo ===================================================
echo   GNU Course AI Navigator - Local Server Starter
echo ===================================================
echo.

:: 1. Start Express Backend
echo [1/3] Starting Backend Server (Port 5000)...
start "GNU AI Navigator Backend" cmd /c "npm.cmd start"

:: 2. Start React Frontend
echo [2/3] Starting Frontend Server (Port 3000)...
start "GNU AI Navigator Frontend" cmd /c "npm.cmd run dev"

:: 3. Wait for initialization
echo [3/3] Waiting for servers to bind to ports...
timeout /t 3 /nobreak > nul

:: 4. Open web browser
echo Opening default web browser to http://localhost:3000...
start http://localhost:3000

echo.
echo ===================================================
echo   Application started successfully! 
echo   Keep the separate command windows open to run.
echo ===================================================
echo.
pause
