/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

const express = require('express');
const router = express.Router();

const { getProfileData, getAllPekerja, getPekerjaById, getAttendanceHistory, getFaceData } = require('../controllers/pekerjaController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Endpoint untuk Halaman Absensi
router.get('/all', protect, getAllPekerja);

// Endpoint untuk Face Recognition Data (hanya supervisor)
router.get('/face-data', protect, authorize('Supervisor'), getFaceData);

// Rute yang lebih SPESIFIK harus didefinisikan PERTAMA
router.get('/profil', protect, getProfileData);
router.get('/history', protect, getAttendanceHistory);

// Fixed: Use simple parameter name instead of underscore
router.get('/:id', protect, getPekerjaById);

module.exports = router;