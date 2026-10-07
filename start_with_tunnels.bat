@echo off
title Atif ^& Abdullah Foods - Smart Restaurant Suite with Remote Cloud Tunnels
color 0A
cls

echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - SMART RESTAURANT SUITE (WITH CLOUD TUNNELS)
echo ===============================================================================
echo.
echo [*] Starting all restaurant local servers and cloud tunnels for mobile/tablet...
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

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

:: 5. Launch Cloud Tunnels for Remote Mobile & Tablet Access
echo [*] Launching Cloudflare Tunnels for Mobile / Tablet access...
start "Cloudflare Tunnel - Customer Dining App (3001)" cmd /k "cd /d %ROOT_DIR% && cloudflared.exe tunnel --url http://localhost:3001"
start "Cloudflare Tunnel - Kitchen Display (3002)" cmd /k "cd /d %ROOT_DIR% && cloudflared.exe tunnel --url http://localhost:3002"
start "Cloudflare Tunnel - Admin Dashboard (3000)" cmd /k "cd /d %ROOT_DIR% && cloudflared.exe tunnel --url http://localhost:3000"

echo.
echo [!] Waiting 6 seconds for tunnels and servers to connect...
timeout /t 6 /nobreak >nul

cls
echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - ALL SYSTEMS AND CLOUD TUNNELS ARE LIVE!
echo ===============================================================================
echo.
echo  PC LOCAL LINKS:
echo  -----------------------------------------------------------------------------
echo  Admin Dashboard:       http://localhost:3000
echo  Customer Table 01:     http://localhost:3001/?table=1
echo  Kitchen Screen (KDS):  http://localhost:3002
echo.
echo  REMOTE MOBILE / TABLET LINKS:
echo  -----------------------------------------------------------------------------
echo  Each Cloudflare window will display a generated *.trycloudflare.com link.
echo  You can copy and open those links on any phone, tablet or iPad anywhere!
echo.
echo ===============================================================================
echo  To STOP everything cleanly, double-click: stop_restaurant.bat
echo ===============================================================================
echo.

start http://localhost:3000
pause
