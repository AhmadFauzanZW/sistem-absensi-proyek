@echo off
echo Simple dlib + face_recognition Installer
echo =====================================
echo.

REM Run the Python info script first
python find_wheel.py

echo.
echo Choose an installation method:
echo 1. Use pre-compiled wheel for Python 3.10
echo 2. Use pre-compiled wheel for Python 3.9
echo 3. Use pre-compiled wheel for Python 3.8
echo 4. Try install from source (requires Visual Studio Build Tools)
echo 5. Exit

choice /c 12345 /n /m "Enter your choice (1-5): "

if errorlevel 5 (
    exit /b 0
) else if errorlevel 4 (
    echo Installing from source...
    pip install cmake
    pip install dlib
    pip install face_recognition
) else if errorlevel 3 (
    echo Installing Python 3.8 wheel...
    pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp38-cp38-win_amd64.whl
    pip install face_recognition
) else if errorlevel 2 (
    echo Installing Python 3.9 wheel...
    pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp39-cp39-win_amd64.whl
    pip install face_recognition
) else if errorlevel 1 (
    echo Installing Python 3.10 wheel...
    pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp310-cp310-win_amd64.whl
    pip install face_recognition
)

if errorlevel 1 (
    echo.
    echo Installation failed.
    echo.
    echo Try the following:
    echo 1. Install Visual Studio Build Tools
    echo 2. Make sure you have a compatible Python version (3.8-3.10)
    echo 3. Check the error message above for details
    pause
    exit /b 1
) else (
    echo.
    echo Testing installation...
    python -c "import face_recognition; print('face_recognition installed successfully!')"
    
    if errorlevel 1 (
        echo.
        echo Test failed. Installation may not be complete.
    ) else (
        echo.
        echo Installation successful! Now installing remaining dependencies...
        pip install -r requirements.txt
    )
)

pause
