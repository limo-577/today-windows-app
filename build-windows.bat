@echo off
setlocal
cd /d "%~dp0"
title Today - Windows Build Tool

echo ========================================
echo   Today - Windows Build Tool
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js LTS first, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo Please reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

echo Node version:
node -v
echo npm version:
npm -v
echo.

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Building app resources...
call npm run build:web
if errorlevel 1 goto :fail

echo.
echo [3/3] Building Windows Setup and Portable editions...
call npm run build:windows
if errorlevel 1 goto :fail

echo.
echo ========================================
echo Build completed successfully.
echo Opening the release folder...
echo.
echo Setup:    Today-Setup-*.exe
echo Portable: Today-Portable-*.exe
echo ========================================
if exist "%~dp0release" start "" "%~dp0release"
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed.
echo Please keep this window open and take a screenshot of the error.
pause
exit /b 1
