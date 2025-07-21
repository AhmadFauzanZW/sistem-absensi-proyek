@echo off
echo ======================================
echo   ABSEN PROYEK - STARTUP DIAGNOSTICS
echo ======================================
echo.

echo [1/4] Checking MySQL Service Status...
sc query mysql >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MySQL service is installed
    sc query mysql | find "RUNNING" >nul
    if %errorlevel% == 0 (
        echo ✅ MySQL service is running
    ) else (
        echo ⚠️  MySQL service is not running
        echo Starting MySQL service...
        net start mysql
        if %errorlevel% == 0 (
            echo ✅ MySQL service started successfully
        ) else (
            echo ❌ Failed to start MySQL service
            echo Please start MySQL manually or check installation
        )
    )
) else (
    echo ❌ MySQL service not found
    echo Please install MySQL or check service name
)

echo.
echo [2/4] Installing/Updating Dependencies...
call npm install
if %errorlevel% == 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Testing Database Connection...
node test-db-connection.js

echo.
echo [4/4] Starting Server...
echo Press Ctrl+C to stop the server
echo.
node server.js

pause
