// routes/logs.js
const express = require('express');
const router = express.Router();
const { getAllLogs, getActivitySummary, getUserLogs } = require('../controllers/logController');
const { protect, authorize } = require('../middleware/authMiddleware');

// UBAH 'director' menjadi 'Direktur'
router.get('/', protect, authorize('Direktur'), getAllLogs);

// Lakukan hal yang sama untuk rute lain di file ini
router.get('/summary', protect, authorize('Direktur'), getActivitySummary);
router.get('/user/:userId', protect, authorize('Direktur'), getUserLogs);

module.exports = router;