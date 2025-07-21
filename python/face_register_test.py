"""
Face Registration Test Script
Gunakan script ini untuk mendaftarkan wajah Anda sebagai test worker
"""
import cv2
import requests
import base64
import json

def capture_and_register():
    print("Face Registration Test")
    print("=" * 30)
    
    # Worker info untuk testing
    worker_id = input("Masukkan ID pekerja (contoh: 1): ").strip()
    worker_name = input("Masukkan nama pekerja (contoh: Ahmad): ").strip()
    
    if not worker_id or not worker_name:
        print("ID dan nama pekerja harus diisi!")
        return
    
    # Capture from webcam
    print("\nMembuka kamera...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Tidak bisa membuka kamera!")
        return
    
    print("Tekan SPACE untuk capture, ESC untuk keluar")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Mirror the frame
        frame = cv2.flip(frame, 1)
        
        # Show instructions
        cv2.putText(frame, "Tekan SPACE untuk capture", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, "Tekan ESC untuk keluar", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow('Face Registration', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == 32:  # SPACE
            # Convert to base64
            _, buffer = cv2.imencode('.jpg', frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            img_base64 = f"data:image/jpeg;base64,{img_base64}"
            
            # Send to face registration service
            try:
                print("Mendaftarkan wajah...")
                response = requests.post('http://localhost:5001/register', 
                    json={
                        'worker_id': int(worker_id),
                        'worker_name': worker_name,
                        'image': img_base64
                    },
                    timeout=30
                )
                
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                
                if result.get('success'):
                    print("✅ Wajah berhasil didaftarkan!")
                    break
                else:
                    print(f"❌ Gagal mendaftar: {result.get('message')}")
                    
            except Exception as e:
                print(f"❌ Error: {e}")
    
    cap.release()
    cv2.destroyAllWindows()

def test_recognition():
    print("\nTesting Face Recognition...")
    
    # Capture from webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Tidak bisa membuka kamera!")
        return
    
    print("Tekan SPACE untuk test recognition, ESC untuk keluar")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Mirror the frame
        frame = cv2.flip(frame, 1)
        
        cv2.putText(frame, "Tekan SPACE untuk test", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, "Tekan ESC untuk keluar", (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow('Face Recognition Test', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == 32:  # SPACE
            # Convert to base64
            _, buffer = cv2.imencode('.jpg', frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            img_base64 = f"data:image/jpeg;base64,{img_base64}"
            
            # Send to face recognition service
            try:
                print("Testing recognition...")
                response = requests.post('http://localhost:5001/recognize', 
                    json={'image': img_base64},
                    timeout=15
                )
                
                result = response.json()
                print(f"Recognition result: {json.dumps(result, indent=2)}")
                
            except Exception as e:
                print(f"❌ Error: {e}")
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    while True:
        print("\nFace Recognition Test Menu:")
        print("1. Register Face")
        print("2. Test Recognition") 
        print("3. Exit")
        
        choice = input("Pilih opsi (1-3): ").strip()
        
        if choice == "1":
            capture_and_register()
        elif choice == "2":
            test_recognition()
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Pilihan tidak valid!")
