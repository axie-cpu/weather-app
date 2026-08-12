@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org then run this again.
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing the desktop widget...
  call npm install
)
npm start
