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
const { getLokasiProyek, getSupervisorAssignments } = require('../controllers/proyekController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/proyek/lokasi
router.get('/lokasi', protect, getLokasiProyek);

// GET /api/proyek/supervisor-assignments
router.get('/supervisor-assignments', protect, authorize('Supervisor'), getSupervisorAssignments);

module.exports = router;