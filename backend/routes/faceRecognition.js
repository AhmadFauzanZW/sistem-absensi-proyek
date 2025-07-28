// routes/faceRecognition.js
const express = require('express');
const router = express.Router();
const { healthCheck, registerWorkerFace, recognizeFace, getRegisteredFaces, deleteWorkerFace, registerFaceFromAdmin } = require('../controllers/faceRecognitionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Health check for face recognition service
router.get('/health', protect, authorize('Supervisor'), healthCheck);

// Register worker face - allow Supervisor, Manager, and Direktur
router.post('/register', protect, authorize('Supervisor', 'Manager', 'Direktur'), registerWorkerFace);

// Register face from admin/manager interface (alternative endpoint)
router.post('/register-admin', protect, authorize('Manager', 'Direktur'), registerFaceFromAdmin);

// Recognize face
router.post('/recognize', protect, authorize('Supervisor'), recognizeFace);

// Get list of registered faces
router.get('/registered', protect, authorize('Supervisor'), getRegisteredFaces);

// Delete worker face
router.delete('/delete', protect, authorize('Supervisor'), deleteWorkerFace);

module.exports = router;
