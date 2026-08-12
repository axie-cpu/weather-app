@echo off
title Pin Atmosphere
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org then run this again.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Setting up Atmosphere...
  call npm install
)
echo Pinning Atmosphere to your screen...
call npm run pin-atmosphere
