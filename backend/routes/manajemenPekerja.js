/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

// server/routes/manajemenPekerja.js

const express = require('express');
const router = express.Router();
const { getAllWorkers, addWorker, updateWorker, updateWorkerStatus, getMetaData, generateQRCode, updateFaceRegistration } = require('../controllers/manajemenPekerjaController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Semua rute di sini hanya bisa diakses oleh Manager
router.use(protect, authorize('Manager', 'Direktur'));

router.get('/pekerja', getAllWorkers);
router.post('/pekerja', addWorker);
router.put('/pekerja/:id_pekerja', updateWorker);
router.patch('/pekerja/status/:userId', updateWorkerStatus);
router.post('/pekerja/:id_pekerja/generate-qr', generateQRCode);
router.patch('/pekerja/:id_pekerja/face-registration', updateFaceRegistration);
router.get('/meta-data', getMetaData);

module.exports = router;