@echo off
title Atif ^& Abdullah Foods - 1-Click Push to GitHub
color 0A
cls

echo ===============================================================================
echo       ATIF ^& ABDULLAH FOODS - 1-CLICK GITHUB UPLOAD TOOL
echo ===============================================================================
echo.
echo [*] Web browser mein "Drag and Drop" karne se 25MB ka error aata hai
echo     kyunke browser cloudflared.exe (55MB) ko upload karne lagta hai.
echo.
echo [*] Yeh script GIT CLI ke zariye upload karegi, jisme:
echo     - .gitignore khud ba khud bari files (55MB) ko chhor dega
echo     - Sirf clean code upload hoga bina kisi 25MB error ke!
echo.
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Error: Git is not installed on your system.
    echo     Please install Git from: https://git-scm.com/downloads
    pause
    exit /b 1
)

echo [*] Enter your GitHub repository link below:
echo     (Example: https://github.com/your-username/smart-restaurant-app.git)
echo.
set /p REPO_URL="GitHub Repository URL: "

if "%REPO_URL%"=="" (
    echo.
    echo [X] Error: No repository URL entered. Aborting.
    pause
    exit /b 1
)

echo.
echo [*] Staging all project files (ignoring 55MB files automatically)...
git add .

echo [*] Creating commit...
git commit -m "Complete Smart Restaurant System Ready For Deployment"

echo [*] Setting branch to main...
git branch -M main

echo [*] Connecting to your GitHub repository...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [*] Uploading code to GitHub...
echo     (Agar pehli dafa hai to browser mein GitHub login ka popup aayega)
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo   [✓] SUCCESS: AAPKA CODE GITHUB PAR KAMYABI SE UPLOAD HO GAYA HAI!
    echo ===============================================================================
    echo.
    echo Ab aap Render.com aur Vercel.com par ja kar 1-click deploy kar sakte hain!
) else (
    echo.
    echo [!] Agar push reject hua ho, to 'git push -u origin main --force' try kar sakte hain.
)

echo.
echo Press any key to exit...
pause >nul
