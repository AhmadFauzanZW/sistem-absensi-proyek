@echo off
echo Installing Python Face Recognition Service...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Python found. Checking Python version...
for /f "tokens=2" %%I in ('python --version 2^>^&1') do set PYVER=%%I
echo Python version: %PYVER%

echo Installing dependencies...
echo.

REM Install cmake which is needed for dlib
pip install cmake

REM Try to install dlib from pre-compiled wheels first
echo Attempting to install dlib from pre-compiled wheel...
pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp310-cp310-win_amd64.whl

REM If that fails, run helper script to find appropriate wheel
if errorlevel 1 (
    echo Wheel installation failed. Running helper script to find appropriate wheel...
    python find_wheel.py
    
    echo.
    echo Trying standard installation...
    
    REM Check if Visual Studio Build Tools are installed
    echo Checking for Visual Studio Build Tools...
    where cl >nul 2>&1
    if errorlevel 1 (
        echo WARNING: Visual Studio Build Tools not found
        echo To install dlib properly, you need Visual Studio Build Tools
        echo Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo.
        echo Select "Desktop Development with C++" during installation
        echo After installing, restart this script
        echo.
        echo Would you like to:
        echo 1. Open the Visual Studio Build Tools download page
        echo 2. Try to continue installation anyway
        echo 3. Exit
        choice /c 123 /n /m "Enter your choice (1-3): "
        
        if errorlevel 3 (
            exit /b 1
        ) else if errorlevel 2 (
            echo Continuing installation... (this may fail)
        ) else if errorlevel 1 (
            start https://visualstudio.microsoft.com/visual-cpp-build-tools/
            exit /b 1
        )
    )

    REM Try to install dlib
    pip install dlib
)

REM Install remaining dependencies
pip install -r requirements.txt

REM Test the installation
echo.
echo Testing installation...
python test_installation.py

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo.
    echo Trying alternative installation...
    echo.
    
    REM Try installing dependencies one by one
    pip install opencv-python
    pip install face-recognition
    pip install flask flask-cors
    pip install pillow numpy
    
    if errorlevel 1 (
        echo.
        echo ERROR: Installation failed. 
        echo Please check your Python/pip installation
        pause
        exit /b 1
    )
)

echo.
echo ✅ Installation completed successfully!
echo.
echo To start the service, run: python face_recognition_server.py
echo Service will be available at: http://localhost:5000
echo.
pause
