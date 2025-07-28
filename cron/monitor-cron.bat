@echo off
setlocal enabledelayedexpansion

REM Load environment variables
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set "%%a=%%b"
    )
) else (
    set "CRON_PORT=3002"
)

:MENU
cls
echo ================================================
echo         ABSENSI CRON SERVICE MONITOR
echo ================================================
echo.
echo 1. Check Service Status
echo 2. View Logs (Real-time)
echo 3. View Recent Logs
echo 4. Manual Trigger Test
echo 5. Container Status
echo 6. Stop Service
echo 7. Restart Service
echo 8. Exit
echo.
set /p choice=Select option (1-8): 

if "%choice%"=="1" goto STATUS
if "%choice%"=="2" goto LOGS_LIVE
if "%choice%"=="3" goto LOGS_RECENT
if "%choice%"=="4" goto TRIGGER
if "%choice%"=="5" goto CONTAINERS
if "%choice%"=="6" goto STOP
if "%choice%"=="7" goto RESTART
if "%choice%"=="8" goto EXIT

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto MENU

:STATUS
echo.
echo Checking service status...
echo.
curl -s http://localhost:%CRON_PORT%/status | jq .
if %ERRORLEVEL% NEQ 0 (
    echo Failed to get status. Service may be down.
    docker-compose ps
)
echo.
pause
goto MENU

:LOGS_LIVE
echo.
echo Showing real-time logs (Press Ctrl+C to stop)...
echo.
docker-compose logs -f cron-service
goto MENU

:LOGS_RECENT
echo.
echo Showing recent logs...
echo.
docker-compose logs --tail=50 cron-service
echo.
pause
goto MENU

:TRIGGER
echo.
echo Triggering manual cron job...
echo.
curl -X POST http://localhost:%CRON_PORT%/trigger
echo.
echo.
echo Checking logs after trigger...
timeout /t 3 /nobreak >nul
curl -s http://localhost:%CRON_PORT%/logs | jq .
echo.
pause
goto MENU

:CONTAINERS
echo.
echo Container status:
echo.
docker-compose ps
echo.
echo Resource usage:
docker stats --no-stream absensi-cron-service
echo.
pause
goto MENU

:STOP
echo.
echo Stopping cron service...
docker-compose down
echo Service stopped.
echo.
pause
goto MENU

:RESTART
echo.
echo Restarting cron service...
docker-compose restart cron-service
echo Service restarted.
echo.
pause
goto MENU

:EXIT
echo.
echo Goodbye!
timeout /t 1 /nobreak >nul
exit /b 0
