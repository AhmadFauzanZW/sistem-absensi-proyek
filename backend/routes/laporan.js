/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

// server/routes/laporan.js

const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/laporanController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/generate', protect, authorize('Manager', 'Direktur'), generateReport);

module.exports = router;