"""
Face Recognition Service Status Checker
"""
import requests
import json

def check_service_status():
    """Check if face recognition service is running"""
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        result = response.json()
        print("✅ Face Recognition Service is running")
        print(f"Status: {result.get('status')}")
        print(f"Registered faces: {result.get('registered_faces', 0)}")
        return True
    except Exception as e:
        print("❌ Face Recognition Service is not running")
        print(f"Error: {e}")
        return False

def list_registered_faces():
    """List all registered faces"""
    try:
        response = requests.get('http://localhost:5001/list_registered', timeout=5)
        result = response.json()
        
        if result.get('success'):
            workers = result.get('workers', [])
            print(f"\n📋 Registered Faces ({len(workers)} total):")
            print("-" * 40)
            for worker in workers:
                print(f"ID: {worker['worker_id']} - Name: {worker['worker_name']}")
        else:
            print("❌ Failed to get registered faces")
            
    except Exception as e:
        print(f"❌ Error getting registered faces: {e}")

def check_backend_connection():
    """Check backend face API"""
    try:
        response = requests.get('http://localhost:5000/api/face/health', timeout=5)
        result = response.json()
        print("✅ Backend Face API is accessible")
        print(f"Response: {json.dumps(result, indent=2)}")
        return True
    except Exception as e:
        print("❌ Backend Face API is not accessible")
        print(f"Error: {e}")
        return False

def main():
    print("Face Recognition Service Status Check")
    print("=" * 50)
    
    # Check Python service
    print("\n1. Checking Python Face Recognition Service...")
    service_ok = check_service_status()
    
    # Check registered faces
    if service_ok:
        print("\n2. Checking registered faces...")
        list_registered_faces()
    
    # Check backend connection
    print("\n3. Checking Backend Face API...")
    backend_ok = check_backend_connection()
    
    print("\n" + "=" * 50)
    if service_ok and backend_ok:
        print("✅ All services are running properly!")
        print("\nNext steps:")
        print("1. Register a face using face_register_test.py")
        print("2. Test the face recognition in the web application")
    else:
        print("❌ Some services are not running")
        print("\nTroubleshooting:")
        if not service_ok:
            print("- Start Python service: python face_recognition_server.py")
        if not backend_ok:
            print("- Start Node.js backend: cd ../../sistem-absensi_backend/server && npm start")

if __name__ == "__main__":
    main()
