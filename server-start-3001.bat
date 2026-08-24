@echo off
setlocal
cd /d "%~dp0"
title Arrange Engineer Server - Port 3001

echo.
echo ==========================================================
echo   Arrange Engineer local server
echo   URL: http://localhost:3001/
echo ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

where npm >nul 2>nul
if errorlevel 1 goto :nonpm

if not exist "node_modules" goto :install
goto :run

:install
echo Installing required packages. Please wait...
call npm install --no-audit --no-fund
if errorlevel 1 goto :installfail

:run
curl.exe --silent --fail --max-time 8 "http://localhost:3001/" >nul 2>nul
if not errorlevel 1 goto :alreadyrunning

echo Starting server on http://localhost:3001/
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev -- --open
if errorlevel 1 goto :runfail
echo.
echo Server stopped.
pause
exit /b 0

:alreadyrunning
echo Server is already running on port 3001.
echo Opening http://localhost:3001/ in your browser...
start "" "http://localhost:3001/"
timeout /t 2 >nul
exit /b 0

:nonode
echo [ERROR] Node.js is not installed.
echo Install the Node.js LTS version from https://nodejs.org/
pause
exit /b 1

:nonpm
echo [ERROR] npm is not available.
echo Reinstall the Node.js LTS version from https://nodejs.org/
pause
exit /b 1

:installfail
echo [ERROR] Package installation failed.
pause
exit /b 1

:runfail
echo.
echo [ERROR] The server could not start.
echo Port 3001 may be occupied by another program that is not this app.
echo Close the other program and run this file again.
pause
exit /b 1
