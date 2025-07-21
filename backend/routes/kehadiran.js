// server/routes/kehadiran.js

const express = require('express');
const router = express.Router();
const { getCatatanKehadiran, getAbsensiMingguan, catatKehadiran, getTodayWorkerStatus, recordAttendanceByQR } = require('../controllers/kehadiranController');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/kehadiran
router.get('/', protect, getCatatanKehadiran);

// GET /api/kehadiran/mingguan
router.get('/mingguan', protect, getAbsensiMingguan);

// POST /api/kehadiran/catat
router.post('/catat', protect, catatKehadiran);

router.get('/status-harian', protect, authorize('Supervisor'), getTodayWorkerStatus);

router.post('/catat-by-qr', protect, authorize('Supervisor'), recordAttendanceByQR);

module.exports = router;