import platform
import sys

def get_python_info():
    """Get Python version and platform info to help find correct wheel"""
    py_version = platform.python_version()
    py_version_short = f"cp{sys.version_info.major}{sys.version_info.minor}"
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    if system == "windows":
        os_name = "win"
        if machine == "amd64" or machine == "x86_64":
            arch = "amd64"
        else:
            arch = "32"
    elif system == "linux":
        os_name = "linux"
        if machine == "x86_64":
            arch = "x86_64"
        elif "arm" in machine:
            arch = "arm64" if "64" in machine else "arm"
        else:
            arch = machine
    elif system == "darwin":
        os_name = "macosx"
        arch = "x86_64" if machine == "x86_64" else "arm64"
    else:
        os_name = system
        arch = machine
        
    print("\nPython Environment Information")
    print("=" * 30)
    print(f"Python version: {py_version}")
    print(f"Python tag: {py_version_short}")
    print(f"Operating system: {system}")
    print(f"Architecture: {machine}")
    print(f"Likely wheel format: dlib-19.xx.x-{py_version_short}-{py_version_short}-{os_name}_{arch}.whl")
    
    # Recommend wheels
    if system == "windows":
        print("\nRecommended dlib wheels for Windows:")
        if py_version_short == "cp310":
            print("pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp310-cp310-win_amd64.whl")
        elif py_version_short == "cp39":
            print("pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp39-cp39-win_amd64.whl")
        elif py_version_short == "cp38":
            print("pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp38-cp38-win_amd64.whl")
        else:
            print(f"No pre-compiled wheel found for Python {py_version_short} on Windows.")
            print("Try compiling from source with: pip install dlib")
    elif system == "linux":
        print("\nRecommended dlib wheels for Linux:")
        if py_version_short == "cp310":
            print("pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp310-cp310-linux_x86_64.whl")
        elif py_version_short == "cp38":
            print("pip install https://github.com/ageitgey/face_recognition/releases/download/1.3.0/dlib-19.21.0-cp38-cp38-linux_x86_64.whl")
        else:
            print(f"No pre-compiled wheel found for Python {py_version_short} on Linux.")
            print("Try installing dependencies first:")
            print("sudo apt-get install -y build-essential cmake libopenblas-dev liblapack-dev")
            print("Then: pip install dlib")
    else:
        print(f"\nNo specific pre-compiled wheels available for {system}.")
        print("Try compiling from source with: pip install dlib")
        
    print("\nFor more pre-compiled wheels, check: https://github.com/ageitgey/face_recognition/issues/175")
    print("=" * 30)

if __name__ == "__main__":
    get_python_info()
