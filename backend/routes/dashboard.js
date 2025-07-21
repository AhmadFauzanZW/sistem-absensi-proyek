const express = require('express');
const router = express.Router();
const { getSupervisorSummary, getSupervisorActivities, getManagerDashboard, getDirekturDashboard  } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- ROUTE BARU UNTUK MANAGER ---
// Method: GET, URL: /api/dashboard/manager
router.get('/manager', protect, authorize('Manager', 'Direktur'), getManagerDashboard);

// GET /api/dashboard/summary
// Rute ini dilindungi oleh 'protect' dan hanya bisa diakses oleh Supervisor, Manager, Direktur [cite: 38, 221]
router.get('/summary', protect, authorize('Supervisor', 'Manager', 'Direktur'), getSupervisorSummary);

// GET /api/dashboard/activities
router.get('/activities', protect, authorize('Supervisor', 'Manager', 'Direktur'), getSupervisorActivities);

// GET /api/dashboard/direktur
router.get('/direktur', protect, authorize('Direktur'), getDirekturDashboard);

module.exports = router;