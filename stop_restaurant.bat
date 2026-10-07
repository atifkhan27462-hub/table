@echo off
title Atif ^& Abdullah Foods - Stop Restaurant Servers
color 0C
cls

echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - STOPPING ALL RESTAURANT SERVERS
echo ===============================================================================
echo.

:: Kill processes on port 8080 (FastAPI Backend)
echo [*] Stopping Backend (Port 8080)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill processes on port 3000 (Admin Dashboard)
echo [*] Stopping Admin Dashboard (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill processes on port 3001 (Customer App)
echo [*] Stopping Customer Dining App (Port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill processes on port 3002 (Kitchen KDS)
echo [*] Stopping Kitchen Display (Port 3002)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Kill any stray cloudflared tunnel processes
taskkill /f /im cloudflared.exe >nul 2>&1

echo.
echo [OK] All restaurant services and ports have been cleanly stopped.
echo.
timeout /t 3 /nobreak >nul
