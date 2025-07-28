@echo off
echo Starting Absensi Cron Service...
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    pause
    exit /b 1
)

REM Load environment variables
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set "%%a=%%b"
)

echo Configuration loaded from .env
echo Database Host: %DB_HOST%
echo Database Name: %DB_NAME%
echo Cron Port: %CRON_PORT%
echo.

REM Build and start the containers
echo Building and starting containers...
docker-compose up --build -d

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)

echo.
echo ✅ Cron service started successfully!
echo.
echo Available endpoints:
echo - Health Check: http://localhost:%CRON_PORT%/health
echo - Status: http://localhost:%CRON_PORT%/status
echo - Manual Trigger: POST http://localhost:%CRON_PORT%/trigger
echo.
echo To view logs: docker-compose logs -f cron-service
echo To stop service: docker-compose down
echo.

REM Wait a moment for services to start
timeout /t 5 /nobreak >nul

REM Check service health
echo Checking service health...
curl -s http://localhost:%CRON_PORT%/health
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Service is healthy and responding!
) else (
    echo.
    echo ⚠️ Service may still be starting up...
    echo Check logs with: docker-compose logs cron-service
)

echo.
pause
