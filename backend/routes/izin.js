// server/routes/izin.js
const express = require('express');
const router = express.Router();
const { ajukanIzin, getIzinUntukValidasi, prosesValidasi, getRiwayatIzin } = require('../controllers/izinController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../uploadConfig');

// POST /api/izin - Mengajukan izin baru
router.post('/', protect, upload.single('bukti'), ajukanIzin);

// GET /api/izin/validasi - Mendapatkan daftar izin untuk divalidasi
router.get('/validasi', protect, authorize('Supervisor', 'Manager', 'Direktur'), getIzinUntukValidasi);

// PUT /api/izin/:id/proses - Memproses persetujuan/penolakan
router.put('/:id/proses', protect, authorize('Supervisor', 'Manager', 'Direktur'), prosesValidasi);

// GET /api/izin/riwayat - Mendapatkan riwayat pengajuan izin
router.get('/riwayat', protect, getRiwayatIzin);

module.exports = router;