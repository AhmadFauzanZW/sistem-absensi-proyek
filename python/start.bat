@echo off
echo Starting Face Recognition Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please run install.bat first
    pause
    exit /b 1
)

REM Check if requirements are installed
python -c "import face_recognition, flask, cv2" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Dependencies not installed
    echo Please run install.bat first
    pause
    exit /b 1
)

echo Starting server on http://localhost:5000...
echo Press Ctrl+C to stop the service
echo.

python face_recognition_server.py

pause
