# Sistema Absensi - Python Face Recognition Integration

## 🎯 Solusi yang Diimplementasikan

Menggunakan **Python OpenCV + face_recognition** sebagai backend service yang lebih stabil untuk face recognition, dengan JavaScript frontend sebagai interface.

### Architecture:
```
Frontend (React) → Backend (Node.js) → Python Service (Flask)
                                    ↓
                              Face Recognition
                              (OpenCV + dlib)
```

## 🔧 Komponen yang Dibuat

### 1. Python Face Recognition Service
- **File**: `face_recognition_service/face_recognition_server.py`
- **Port**: 5001
- **Dependencies**: opencv-python, face-recognition, flask, flask-cors
- **Features**:
  - ✅ Register face dari base64 image
  - ✅ Recognize face dengan confidence score
  - ✅ Persistent storage (pickle file)
  - ✅ Health check endpoint
  - ✅ CRUD operations untuk registered faces

### 2. Backend Integration
- **File**: `controllers/faceRecognitionController.js`
- **Routes**: `/api/face/*`
- **Features**:
  - ✅ Proxy ke Python service
  - ✅ Error handling untuk offline service
  - ✅ Timeout management
  - ✅ Database integration

### 3. Frontend Update
- **File**: `utils/faceRecognitionService.js`
- **Features**:
  - ✅ Service health monitoring
  - ✅ Real-time face recognition
  - ✅ UI status indicators
  - ✅ Fallback ke manual mode

## 🚀 Setup & Installation

### Prerequisites:
- Python 3.8+ (3.10 recommended for Windows)
- C++ build tools (for Windows users)

### Quick Start (Windows):
```bash
# 1. Install Python service
cd face_recognition_service
install.bat

# 2. Start Python service
start.bat

# 3. Start backend
cd ../sistem-absensi_backend/server
npm start

# 4. Start frontend
cd ../sistem-absensi_frontend/client
npm run dev
```

### Quick Start (Linux/MacOS):
```bash
# 1. Install Python service
cd face_recognition_service
chmod +x start_production.sh
pip install -r requirements.txt

# 2. Start Python service
./start_production.sh &

# 3. Start backend & frontend
# ... same as Windows
```

### Manual Setup for Windows:

#### Installing dlib on Windows:

1. **Install Visual Studio Build Tools**:
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - During installation, select "Desktop Development with C++"
   - Restart your computer after installation

2. **Install CMake**:
   ```bash
   pip install cmake
   ```

3. **Install dlib using pre-compiled wheel** (Recommended for Python 3.10):
   ```bash
   pip install https://github.com/jloh02/dlib/releases/download/v19.22/dlib-19.22.99-cp310-cp310-win_amd64.whl
   ```

4. **Alternative: Install dlib from source** (may take a while):
   ```bash
   pip install dlib
   ```

5. **Install remaining dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

#### Troubleshooting dlib Installation:

- If you get "Microsoft Visual C++ 14.0 or greater is required", install the Visual Studio Build Tools
- If compilation fails, try installing the pre-compiled wheel specific to your Python version
- For more options, visit: https://github.com/ageitgey/face_recognition/issues/175

### Manual Setup (Linux/MacOS):
```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get install -y cmake build-essential libopenblas-dev liblapack-dev 

# Python dependencies
pip install opencv-python face-recognition flask flask-cors pillow numpy

# Node.js dependencies (tambahan)
npm install axios

# Start services
python face_recognition_service/face_recognition_server.py
```

## 📡 API Endpoints

### Python Service (Port 5001):
- `GET /health` - Health check
- `POST /register` - Register new face
- `POST /recognize` - Recognize face
- `GET /list_registered` - List all registered faces
- `POST /delete_worker` - Delete worker face

### Backend Proxy (Port 5000):
- `GET /api/face/health` - Service health
- `POST /api/face/register` - Register worker face
- `POST /api/face/recognize` - Recognize face
- `GET /api/face/registered` - Get registered faces
- `DELETE /api/face/delete` - Delete worker face

## 🎮 How It Works

### Face Registration Flow:
1. Frontend captures image from camera
2. Convert to base64
3. Send to Backend `/api/face/register`
4. Backend forwards to Python service
5. Python processes with OpenCV/face_recognition
6. Returns success/error response

### Face Recognition Flow:
1. Frontend continuously captures frames
2. Send frame to `/api/face/recognize`
3. Python service processes and finds matches
4. Return worker_id + confidence if match found
5. Frontend shows approval dialog
6. Supervisor approves/rejects recognition

## 💾 Data Storage

### Python Service:
- **File**: `face_encodings.pkl`
- **Format**: Pickle dictionary
- **Contains**: Face encodings + worker mappings

### Database:
- **Table**: `pekerja`
- **Column**: `face_registered` (BOOLEAN)
- **Purpose**: Track which workers have registered faces

## 🌐 Deployment

### Development:
```bash
# Python service
python face_recognition_server.py

# Production with logging
FLASK_ENV=production python face_recognition_server.py
```

### Production (cPanel):
1. Upload Python files ke `~/python/`
2. Setup virtual environment
3. Install dependencies
4. Create startup script
5. Add to cron for auto-restart

Detail lengkap di `DEPLOYMENT_GUIDE.md`

## 🔍 Monitoring

### Health Check:
```javascript
// Frontend monitoring
const isHealthy = await pythonFaceService.checkHealth();

// Backend endpoint
GET /api/face/health
```

### Status Indicators:
- 🟢 Green: Service online dan ready
- 🔴 Red: Service offline atau error
- 🟡 Yellow: Loading/checking status

## 🛠️ Troubleshooting

### Common Issues:

1. **Python service won't start**:
   ```bash
   # Check dependencies
   pip list | grep face-recognition
   
   # Check port availability
   netstat -an | grep 5001
   ```

2. **Backend can't connect to Python**:
   ```bash
   # Test direct connection
   curl http://localhost:5001/health
   
   # Check firewall/proxy settings
   ```

3. **Face recognition accuracy issues**:
   - Ensure good lighting
   - Register multiple angles
   - Adjust confidence threshold (70% default)

4. **Performance issues**:
   - Reduce image resolution
   - Increase recognition interval
   - Optimize Python dependencies

## 📊 Performance

### Optimizations Implemented:
- ✅ 2-second recognition interval
- ✅ Image compression (JPEG 80% quality)
- ✅ Timeout handling (15s recognition, 30s registration)
- ✅ Efficient face encoding storage
- ✅ Health check caching

### Expected Performance:
- **Recognition Time**: 1-3 seconds
- **Accuracy**: 70%+ confidence threshold
- **Memory Usage**: ~100MB (Python service)
- **Concurrent Users**: 10+ (dapat di-scale)

## 🔮 Future Enhancements

### Possible Improvements:
1. **GPU Acceleration**: Use CUDA for faster processing
2. **Multiple Face Detection**: Handle multiple workers in one frame
3. **Anti-Spoofing**: Liveness detection
4. **Face Quality Assessment**: Ensure good registration photos
5. **Batch Processing**: Register multiple faces at once
6. **Analytics**: Face recognition statistics and reports

---

**Status**: ✅ Ready for testing and deployment
**Compatibility**: Windows, Linux, macOS
**Hosting**: Compatible with most cPanel providers that support Python
