@echo off
title Atif ^& Abdullah Foods - Neon Cloud Database Setup
color 0B
cls

echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - 1-CLICK NEON POSTGRESQL DATABASE SETUP
echo ===============================================================================
echo.
echo [*] This script will:
echo     1. Connect to your free Neon PostgreSQL database
echo     2. Create all 23 relational database tables automatically
echo     3. Apply database indexes and column migrations
echo     4. Seed initial clean restaurant data (10 tables, admin, menu, categories)
echo.
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check Python virtual environment
if not exist "%ROOT_DIR%backend\.venv\Scripts\python.exe" (
    echo [X] Error: backend virtual environment not found at backend\.venv\
    pause
    exit /b 1
)

:: Run the setup script using the project's python
"%ROOT_DIR%backend\.venv\Scripts\python.exe" "%ROOT_DIR%backend\setup_neon_database.py"

echo.
echo Press any key to exit...
pause >nul
