// cron-service/index.js
// =================================================================
// IMPORTS
// =================================================================
const cron = require('node-cron');
const express = require('express');
const pool = require('./config/db'); // Pastikan path ini benar
require('dotenv').config();

// =================================================================
// KONFIGURASI APLIKASI
// =================================================================
const app = express();
const PORT = process.env.CRON_PORT || 3002;

// =================================================================
// STATE MANAGEMENT & HELPERS
// =================================================================
// Objek untuk melacak status cron job secara global
const cronState = {
    isRunning: false,
    lastRun: null,
    lastResult: { success: null, message: 'Belum pernah berjalan' },
    runCount: 0,
    schedule: '0 17 * * *' // Jadwal diset untuk jam 5 sore setiap hari
};

/**
 * Fungsi helper untuk logging dengan timestamp.
 * @param {string} message - Pesan log.
 * @param {'INFO' | 'ERROR' | 'WARN'} level - Level log.
 */
const log = (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
};

// =================================================================
// LOGIKA UTAMA CRON JOB
// =================================================================
/**
 * Fungsi utama untuk menandai pekerja yang tidak hadir sebagai 'Absen'.
 * Didesain untuk menjadi idempotent (aman dijalankan berkali-kali).
 */
const tandaiPekerjaAbsen = async () => {
    // Mencegah job berjalan jika sudah ada instance lain yang berjalan
    if (cronState.isRunning) {
        log('Job sebelumnya masih berjalan, melewati eksekusi kali ini.', 'WARN');
        return;
    }

    // Update state
    cronState.isRunning = true;
    cronState.lastRun = new Date();
    cronState.runCount++;
    
    log('🚀 Memulai tugas penjadwalan: Menandai pekerja absen...');
    const today = new Date().toISOString().slice(0, 10);

    try {
        // 1. Dapatkan semua ID pekerja yang statusnya 'Aktif'
        const [activeWorkers] = await pool.query(
            `SELECT pk.id_pekerja FROM pekerja pk
             JOIN pengguna p ON pk.id_pengguna = p.id_pengguna 
             WHERE p.status_pengguna = 'Aktif'`
        );
        const allWorkerIds = activeWorkers.map(p => p.id_pekerja);
        log(`📋 Ditemukan ${allWorkerIds.length} pekerja aktif.`);

        // 2. Dapatkan semua ID pekerja yang sudah punya catatan kehadiran hari ini
        const [attendedWorkers] = await pool.query(
            `SELECT DISTINCT id_pekerja FROM catatan_kehadiran WHERE DATE(waktu_clock_in) = ?`,
            [today]
        );
        const attendedWorkerIds = attendedWorkers.map(p => p.id_pekerja);
        log(`✅ ${attendedWorkerIds.length} pekerja sudah memiliki catatan kehadiran hari ini.`);

        // 3. Tentukan pekerja yang absen (ada di daftar aktif tapi tidak ada di daftar hadir)
        const absentWorkerIds = allWorkerIds.filter(id => !attendedWorkerIds.includes(id));

        if (absentWorkerIds.length > 0) {
            log(`🔍 Menemukan ${absentWorkerIds.length} pekerja absen. Memasukkan ke database...`);

            // 4. Masukkan data 'Absen' untuk setiap pekerja yang tidak hadir
            const insertPromises = absentWorkerIds.map(id_pekerja => {
                const query = `
                    INSERT INTO catatan_kehadiran (id_pekerja, waktu_clock_in, status_kehadiran, metode_verifikasi)
                    VALUES (?, ?, 'Absen', 'Sistem')
                `;
                // Set waktu clock_in ke jam 11 malam pada hari ini
                return pool.query(query, [id_pekerja, `${today} 23:00:00`]);
            });

            await Promise.all(insertPromises);
            
            const successMessage = `Berhasil menandai ${absentWorkerIds.length} pekerja sebagai absen.`;
            log(`✔️  ${successMessage}`);
            cronState.lastResult = { success: true, message: successMessage, processedCount: absentWorkerIds.length };

        } else {
            const noAbsentMessage = 'Tidak ada pekerja yang absen hari ini.';
            log(`✔️  ${noAbsentMessage}`);
            cronState.lastResult = { success: true, message: noAbsentMessage, processedCount: 0 };
        }
    } catch (error) {
        const errorMessage = `Gagal menjalankan tugas penjadwalan: ${error.message}`;
        log(errorMessage, 'ERROR');
        console.error(error); // Log stack trace untuk detail
        cronState.lastResult = { success: false, message: errorMessage };
    } finally {
        // Pastikan state isRunning selalu direset, bahkan jika terjadi error
        cronState.isRunning = false;
        log('🏁 Tugas penjadwalan selesai.');
    }
};

// =================================================================
// API ENDPOINTS (untuk observabilitas & kontrol)
// =================================================================
// Endpoint untuk memeriksa apakah layanan hidup
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

// Endpoint untuk mendapatkan status detail dari cron job
app.get('/status', (req, res) => {
    res.json({
        service: 'absensi-cron-service',
        status: cronState.isRunning ? 'running' : 'idle',
        schedule: cronState.schedule,
        timezone: "Asia/Jakarta",
        ...cronState
    });
});

// Endpoint untuk memicu job secara manual (berguna untuk testing)
app.post('/trigger', (req, res) => {
    if (cronState.isRunning) {
        return res.status(429).json({ message: 'Job sedang berjalan, tidak bisa dipicu manual.' });
    }
    log('� Menerima permintaan trigger manual...');
    // Jalankan fungsi secara async agar tidak memblokir response HTTP
    setImmediate(tandaiPekerjaAbsen);
    res.status(202).json({ message: 'Trigger manual diterima, job akan segera dimulai.' });
});

// =================================================================
// PENJADWALAN & SHUTDOWN
// =================================================================
// Jadwalkan tugas untuk berjalan setiap hari pukul 23:00 (11 malam)
log(`⏰ Menjadwalkan job untuk berjalan setiap hari pada pukul 23:00 (Asia/Jakarta).`);
const scheduledJob = cron.schedule(cronState.schedule, tandaiPekerjaAbsen, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

// Fungsi untuk graceful shutdown
const gracefulShutdown = () => {
    log('SIGTERM/SIGINT diterima, melakukan graceful shutdown...');
    scheduledJob.stop();
    // Beri sedikit waktu untuk proses yang sedang berjalan sebelum keluar
    setTimeout(() => {
        log('Shutdown selesai.');
        process.exit(0);
    }, 1000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// =================================================================
// MULAI SERVER
// =================================================================
app.listen(PORT, () => {
    log(`✅ Cron service dimulai pada port ${PORT}`);
    log(`🩺 Health check: http://localhost:${PORT}/health`);
    log(`📊 Status: http://localhost:${PORT}/status`);
    log(`⚡ Manual trigger: POST http://localhost:${PORT}/trigger`);
});