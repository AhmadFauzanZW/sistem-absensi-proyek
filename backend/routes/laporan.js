// server/routes/laporan.js

const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/laporanController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/generate', protect, authorize('Manager', 'Direktur'), generateReport);

module.exports = router;