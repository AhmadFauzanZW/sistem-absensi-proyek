"""
Face Recognition Test Script
Use this to verify that the face_recognition library is installed correctly
"""
import os
import sys

def test_face_recognition():
    print("\nTesting Face Recognition Installation...")
    print("=" * 40)
    
    # Step 1: Check Python version
    print(f"Python version: {sys.version}")
    
    # Step 2: Try to import dlib
    print("\nStep 1: Testing dlib import...")
    try:
        import dlib
        print(f"✅ dlib imported successfully (version: {dlib.__version__})")
    except ImportError as e:
        print(f"❌ Failed to import dlib: {e}")
        print("\nPlease fix dlib installation first:")
        print("- Run simple_install.bat")
        print("- Follow instructions in README.md")
        return False
        
    # Step 3: Try to import face_recognition
    print("\nStep 2: Testing face_recognition import...")
    try:
        import face_recognition
        print("✅ face_recognition imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import face_recognition: {e}")
        print("Please install face_recognition after dlib is installed:")
        print("pip install face_recognition")
        return False
    
    # Step 4: Try to import other dependencies
    print("\nStep 3: Testing other dependencies...")
    dependencies = [
        ("numpy", "numpy"),
        ("PIL", "pillow"),
        ("flask", "flask"),
        ("flask_cors", "flask-cors"),
        ("cv2", "opencv-python")
    ]
    
    all_deps_ok = True
    for module_name, package_name in dependencies:
        try:
            module = __import__(module_name)
            print(f"✅ {module_name} imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import {module_name}: {e}")
            print(f"   Install with: pip install {package_name}")
            all_deps_ok = False
    
    if not all_deps_ok:
        print("\nSome dependencies are missing. Install them with:")
        print("pip install -r requirements.txt")
        return False
    
    # Step 5: Basic functionality test
    print("\nStep 4: Testing basic face recognition functionality...")
    try:
        # Generate a simple test image
        import numpy as np
        from PIL import Image
        
        # Create a blank 100x100 image
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        test_img_pil = Image.fromarray(test_img)
        
        # Save and load the test image
        test_path = "test_image.jpg"
        test_img_pil.save(test_path)
        
        # Try to load with face_recognition
        face_recognition.load_image_file(test_path)
        print("✅ Basic functionality test passed")
        
        # Clean up
        if os.path.exists(test_path):
            os.remove(test_path)
            
    except Exception as e:
        print(f"❌ Functionality test failed: {e}")
        print("This might indicate issues with the installation")
        return False
    
    print("\n✅ All tests passed! Face recognition should work correctly.")
    print("You can now run the face recognition server:")
    print("- Windows: start.bat")
    print("- Linux/macOS: ./start_production.sh")
    return True

if __name__ == "__main__":
    success = test_face_recognition()
    if not success:
        print("\n❌ Some tests failed. Please fix the issues before running the server.")
        sys.exit(1)
    else:
        print("\n✨ Everything looks good! The system is ready to use.")
