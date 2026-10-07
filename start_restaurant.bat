@echo off
title Atif ^& Abdullah Foods - Smart Restaurant Suite Launcher
color 0B
cls

echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - SMART RESTAURANT POS ^& DINING SUITE
echo ===============================================================================
echo.
echo [*] Initializing restaurant services...
echo.

:: Detect current project directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check for Python virtual environment, auto-create if missing
if not exist "%ROOT_DIR%backend\.venv\Scripts\python.exe" (
    echo [*] First-time setup: Creating Python virtual environment...
    python -m venv "%ROOT_DIR%backend\.venv" >nul 2>&1
    if errorlevel 1 (
        py -3 -m venv "%ROOT_DIR%backend\.venv" >nul 2>&1
    )
    if exist "%ROOT_DIR%backend\.venv\Scripts\python.exe" (
        echo [*] Installing Python backend packages (one-time setup)...
        "%ROOT_DIR%backend\.venv\Scripts\python.exe" -m pip install -r "%ROOT_DIR%backend\requirements.txt"
    ) else (
        echo [ERROR] Python is not installed or not in PATH.
        echo Please download and install Python from https://python.org (make sure to check "Add Python to PATH").
        pause
        exit /b 1
    )
)

:: Check for node_modules
if not exist "%ROOT_DIR%node_modules" (
    echo [ERROR] Root node_modules not found. Running npm install...
    call npm install
)

:: Find Local Wi-Fi / LAN IP Address
set "LOCAL_IP=127.0.0.1"
for /f "tokens=4" %%a in ('route print ^| findstr " 0.0.0.0.*0.0.0.0"') do (
    if not "%%a"=="" set "LOCAL_IP=%%a"
)

echo [OK] Project Directory: %ROOT_DIR%
echo [OK] Local LAN IP:      %LOCAL_IP%
echo.

:: 1. Launch FastAPI Backend (Port 8080)
echo [*] Starting FastAPI Backend on 0.0.0.0:8080...
start "SmartTable - Backend API (Port 8080)" cmd /k "cd /d %ROOT_DIR%backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload"

:: 2. Launch Admin Dashboard (Port 3000)
echo [*] Starting Admin Dashboard on 0.0.0.0:3000...
start "SmartTable - Admin POS (Port 3000)" cmd /k "cd /d %ROOT_DIR%apps\admin-dashboard && npx next dev -H 0.0.0.0 -p 3000"

:: 3. Launch Customer Dining App (Port 3001)
echo [*] Starting Customer Dining App on 0.0.0.0:3001...
start "SmartTable - Customer Kiosk (Port 3001)" cmd /k "cd /d %ROOT_DIR%apps\customer-app && npx next dev -H 0.0.0.0 -p 3001"

:: 4. Launch Kitchen Display System (Port 3002)
echo [*] Starting Kitchen Display Screen on 0.0.0.0:3002...
start "SmartTable - Kitchen KDS (Port 3002)" cmd /k "cd /d %ROOT_DIR%apps\kds-app && npx next dev -H 0.0.0.0 -p 3002"

echo.
echo [!] Waiting 5 seconds for dev servers to initialize...
timeout /t 5 /nobreak >nul

cls
echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - ALL SYSTEMS RUNNING SUCCESSFULLY!
echo ===============================================================================
echo.
echo  PC / LOCAL ACCESS LINKS:
echo  -----------------------------------------------------------------------------
echo  [1] Admin Dashboard:       http://localhost:3000
echo  [2] Customer Table 01:     http://localhost:3001/?table=1
echo  [3] Kitchen Screen (KDS):  http://localhost:3002
echo  [4] Backend API Docs:      http://localhost:8080/api/v1/docs
echo.
echo  MOBILE / TABLET ON WI-FI (Same Network):
echo  -----------------------------------------------------------------------------
echo  [!] Make sure your Wi-Fi is set to "Private Network" in Windows Settings.
echo.
echo  - Table 01 on Tablet:      http://%LOCAL_IP%:3001/?table=1
echo  - Table 02 on Tablet:      http://%LOCAL_IP%:3001/?table=2
echo  - Kitchen Display on Tab:   http://%LOCAL_IP%:3002
echo  - Admin Dashboard on Tab:  http://%LOCAL_IP%:3000
echo.
echo ===============================================================================
echo  To STOP all servers, double-click: stop_restaurant.bat
echo ===============================================================================
echo.

:: Automatically open Admin Dashboard in default browser
start http://localhost:3000

pause
