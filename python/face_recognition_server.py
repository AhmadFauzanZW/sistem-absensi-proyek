# Face Recognition Service
# Requirements: opencv-python, face-recognition, flask, flask-cors, pillow, numpy
import os
import sys
import json
import base64
import pickle
import numpy as np
from io import BytesIO
from PIL import Image
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Setup logging before imports that might fail
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import face_recognition, with proper error handling
try:
    import face_recognition
except ImportError as e:
    logger.error("ERROR: Could not import face_recognition library")
    logger.error(f"Error details: {e}")
    logger.error("\nTroubleshooting steps:")
    logger.error("1. Make sure dlib is installed correctly: run simple_install.bat")
    logger.error("2. Check if Python version is compatible (3.8-3.10 recommended)")
    logger.error("3. Verify that Visual Studio Build Tools are installed (on Windows)")
    logger.error("4. See README.md for detailed installation instructions\n")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ENCODINGS_FILE = 'face_encodings.pkl'
CONFIDENCE_THRESHOLD = 0.6  # Lower is more strict

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class FaceRecognitionService:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.load_encodings()
    
    def load_encodings(self):
        """Load face encodings from pickle file"""
        try:
            if os.path.exists(ENCODINGS_FILE):
                with open(ENCODINGS_FILE, 'rb') as f:
                    data = pickle.load(f)
                    self.known_face_encodings = data.get('encodings', [])
                    self.known_face_names = data.get('names', [])
                logger.info(f"Loaded {len(self.known_face_encodings)} face encodings")
            else:
                logger.info("No existing encodings file found")
        except Exception as e:
            logger.error(f"Error loading encodings: {e}")
            self.known_face_encodings = []
            self.known_face_names = []

    def save_encodings(self):
        """Save face encodings to pickle file"""
        try:
            data = {
                'encodings': self.known_face_encodings,
                'names': self.known_face_names
            }
            with open(ENCODINGS_FILE, 'wb') as f:
                pickle.dump(data, f)
            logger.info("Encodings saved successfully")
            return True
        except Exception as e:
            logger.error(f"Error saving encodings: {e}")
            return False

    def process_image_from_base64(self, base64_string):
        """Convert base64 string to PIL Image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL to numpy array
            return np.array(image)
        except Exception as e:
            logger.error(f"Error processing base64 image: {e}")
            return None
    
    def register_face(self, image_array, worker_id, worker_name):
        """Register a new face"""
        try:
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image_array)
            
            if not face_locations:
                return False, "No face detected in image"
            
            if len(face_locations) > 1:
                return False, "Multiple faces detected. Please ensure only one face is visible"
            
            # Get face encoding
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if face_encodings:
                face_encoding = face_encodings[0]
                
                # Check if this worker already exists and remove old encoding
                worker_key = f"{worker_id}_{worker_name}"

                # Remove existing encoding if exists
                indices_to_remove = []
                for i, name in enumerate(self.known_face_names):
                    if name.startswith(f"{worker_id}_"):
                        indices_to_remove.append(i)

                # Remove in reverse order to maintain indices
                for i in reversed(indices_to_remove):
                    del self.known_face_encodings[i]
                    del self.known_face_names[i]
                    logger.info(f"Removed old encoding for worker ID {worker_id}")

                # Add new encoding
                self.known_face_encodings.append(face_encoding)
                self.known_face_names.append(worker_key)

                if indices_to_remove:
                    logger.info(f"Updated face encoding for {worker_name} (ID: {worker_id})")
                else:
                    logger.info(f"Added new face encoding for {worker_name} (ID: {worker_id})")

                # Save to file
                if self.save_encodings():
                    return True, f"Face registered successfully for {worker_name}"
                else:
                    return False, "Failed to save face encoding"

            return False, "Could not generate face encoding"
            
        except Exception as e:
            logger.error(f"Error registering face: {e}")
            return False, f"Error processing face: {str(e)}"
    
    def recognize_face(self, image_array):
        """Recognize face in image"""
        try:
            if not self.known_face_encodings:
                return False, None, 0, "No registered faces in database"
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image_array)
            
            if not face_locations:
                return False, None, 0, "No face detected in image"
            
            if len(face_locations) > 1:
                return False, None, 0, "Multiple faces detected. Please ensure only one face is visible"
            
            # Get face encodings for the detected face
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if not face_encodings:
                return False, None, 0, "Could not generate face encoding"
            
            face_encoding = face_encodings[0]
            
            # Compare with known faces
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            # Get confidence (inverse of distance)
            confidence = 1 - face_distances[best_match_index]
            
            if confidence >= CONFIDENCE_THRESHOLD:
                worker_key = self.known_face_names[best_match_index]
                worker_id, worker_name = worker_key.split('_', 1)
                
                return True, {
                    'worker_id': int(worker_id),
                    'worker_name': worker_name,
                    'confidence': float(confidence)
                }, confidence * 100, "Face recognized successfully"
            else:
                return False, None, confidence * 100, "Face not recognized with sufficient confidence"
                
        except Exception as e:
            logger.error(f"Error recognizing face: {e}")
            return False, None, 0, f"Error processing face: {str(e)}"

    def delete_worker(self, worker_id):
        """Delete a worker's face encoding"""
        try:
            worker_id_str = str(worker_id)
            indices_to_remove = []

            for i, name in enumerate(self.known_face_names):
                if name.startswith(f"{worker_id_str}_"):
                    indices_to_remove.append(i)

            if not indices_to_remove:
                return False, f"Worker with ID {worker_id} not found"

            # Remove in reverse order to maintain indices
            for i in reversed(indices_to_remove):
                worker_name = self.known_face_names[i].split('_', 1)[1]
                del self.known_face_encodings[i]
                del self.known_face_names[i]
                logger.info(f"Deleted face encoding for {worker_name} (ID: {worker_id})")

            if self.save_encodings():
                return True, f"Successfully deleted {len(indices_to_remove)} face encoding(s) for worker {worker_id}"
            else:
                return False, "Failed to save changes"

        except Exception as e:
            logger.error(f"Error deleting worker: {e}")
            return False, f"Error deleting worker: {str(e)}"

# Initialize service
face_service = FaceRecognitionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'registered_faces': len(face_service.known_face_encodings),
        'service': 'face_recognition'
    })

@app.route('/register', methods=['POST'])
def register_face():
    """Register a new face"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data or 'worker_id' not in data or 'worker_name' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required fields: image, worker_id, worker_name'
            }), 400
        
        # Process image
        image_array = face_service.process_image_from_base64(data['image'])
        if image_array is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image data'
            }), 400
        
        # Register face
        success, message = face_service.register_face(
            image_array, 
            data['worker_id'], 
            data['worker_name']
        )
        
        return jsonify({
            'success': success,
            'message': message,
            'total_registered': len(face_service.known_face_encodings)
        })
        
    except Exception as e:
        logger.error(f"Error in register endpoint: {e}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/recognize', methods=['POST'])
def recognize_face():
    """Recognize a face"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required field: image'
            }), 400
        
        logger.info("Received face recognition request")
        
        # Check if we have any registered faces
        if len(face_service.known_face_encodings) == 0:
            logger.warning("No registered faces available")
            return jsonify({
                'success': False,
                'message': 'No registered faces available. Please register faces first.',
                'confidence': 0
            })
        
        logger.info(f"Total registered faces: {len(face_service.known_face_encodings)}")
        
        # Process image
        image_array = face_service.process_image_from_base64(data['image'])
        if image_array is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image data',
                'confidence': 0
            }), 400
        
        logger.info("Image processed successfully")
        
        # Recognize face
        success, worker_data, confidence, message = face_service.recognize_face(image_array)
        
        logger.info(f"Recognition result: success={success}, confidence={confidence:.1f}%, message={message}")
        
        response = {
            'success': success,
            'message': message,
            'confidence': confidence
        }
        
        if success and worker_data:
            response['worker'] = worker_data
            logger.info(f"Worker recognized: {worker_data}")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in recognize endpoint: {e}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/list_registered', methods=['GET'])
def list_registered():
    """List all registered faces"""
    try:
        workers = []
        for name in face_service.known_face_names:
            if '_' in name:
                worker_id, worker_name = name.split('_', 1)
                workers.append({
                    'worker_id': int(worker_id),
                    'worker_name': worker_name
                })

        return jsonify({
            'success': True,
            'total': len(workers),
            'workers': workers
        })
        
    except Exception as e:
        logger.error(f"Error in list_registered endpoint: {e}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/delete_worker', methods=['POST'])
def delete_worker():
    """Delete a registered worker"""
    try:
        data = request.get_json()
        
        if not data or 'worker_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required field: worker_id'
            }), 400
        
        worker_id = data['worker_id']
        success, message = face_service.delete_worker(worker_id)

        return jsonify({
            'success': success,
            'message': message,
            'total_registered': len(face_service.known_face_encodings)
        })

    except Exception as e:
        logger.error(f"Error in delete_worker endpoint: {e}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/reload_encodings', methods=['POST'])
def reload_encodings():
    """Reload face encodings from file"""
    try:
        face_service.load_encodings()
        return jsonify({
            'success': True,
            'message': 'Face encodings reloaded successfully',
            'total_registered': len(face_service.known_face_encodings)
        })
    except Exception as e:
        logger.error(f"Error reloading encodings: {e}")
        return jsonify({
            'success': False,
            'message': f'Error reloading encodings: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("Starting Face Recognition Service...")
    print(f"Service will run on http://localhost:5001")
    print(f"Loaded {len(face_service.known_face_encodings)} registered faces")

    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        threaded=True
    )
