const cron = require('node-cron');
const express = require('express');
const pool = require('./config/db');
require('dotenv').config();

// Initialize Express app for health checks
const app = express();
const PORT = process.env.CRON_PORT || 3002;

// Middleware
app.use(express.json());

// Global state tracking
let cronState = {
    isRunning: false,
    lastRun: null,
    nextRun: null,
    lastResult: null,
    runCount: 0
};

const logWithTimestamp = (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
};

const tandaiPekerjaAbsen = async () => {
    cronState.isRunning = true;
    cronState.lastRun = new Date();
    cronState.runCount++;
    
    logWithTimestamp('Menjalankan tugas penjadwalan: Menandai pekerja absen...');
    const today = new Date().toISOString().slice(0, 10);

    try {
        // Get all active workers
        const [activeWorkers] = await pool.query(
            `SELECT pk.id_pekerja, p.nama_pengguna FROM pekerja pk
             JOIN pengguna p ON pk.id_pengguna = p.id_pengguna 
             WHERE p.status_pengguna = 'Aktif'`
        );
        const allWorkerIds = activeWorkers.map(p => p.id_pekerja);
        logWithTimestamp(`Ditemukan ${allWorkerIds.length} pekerja aktif`);

        // Get workers who have attendance records today
        const [attendedWorkers] = await pool.query(
            `SELECT DISTINCT id_pekerja FROM catatan_kehadiran WHERE DATE(waktu_clock_in) = ?`,
            [today]
        );
        const attendedWorkerIds = attendedWorkers.map(p => p.id_pekerja);
        logWithTimestamp(`${attendedWorkerIds.length} pekerja sudah memiliki catatan kehadiran`);

        // Find absent workers
        const absentWorkerIds = allWorkerIds.filter(id => !attendedWorkerIds.includes(id));

        if (absentWorkerIds.length > 0) {
            logWithTimestamp(`Menemukan ${absentWorkerIds.length} pekerja absen. Memasukkan ke database...`);

            // Insert absent records in batches for better performance
            const batchSize = 50;
            for (let i = 0; i < absentWorkerIds.length; i += batchSize) {
                const batch = absentWorkerIds.slice(i, i + batchSize);
                
                const insertPromises = batch.map(id_pekerja => {
                    const query = `
                        INSERT INTO catatan_kehadiran (id_pekerja, waktu_clock_in, status_kehadiran, metode_verifikasi)
                        VALUES (?, ?, 'Absen', 'Sistem')
                    `;
                    return pool.query(query, [id_pekerja, `${today} 23:00:00`]);
                });

                await Promise.all(insertPromises);
                logWithTimestamp(`Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} pekerja diproses`);
            }

            cronState.lastResult = {
                success: true,
                message: `Berhasil menandai ${absentWorkerIds.length} pekerja absen`,
                processedCount: absentWorkerIds.length
            };
            logWithTimestamp(`✅ Berhasil menandai ${absentWorkerIds.length} pekerja absen.`);
        } else {
            cronState.lastResult = {
                success: true,
                message: 'Tidak ada pekerja yang absen hari ini',
                processedCount: 0
            };
            logWithTimestamp(`✅ Tidak ada pekerja yang absen hari ini.`);
        }
    } catch (error) {
        cronState.lastResult = {
            success: false,
            message: error.message,
            processedCount: 0
        };
        logWithTimestamp(`❌ Gagal menjalankan tugas penjadwalan absen: ${error.message}`, 'ERROR');
        console.error(error);
    } finally {
        cronState.isRunning = false;
    }
};

// Manual trigger for testing (POST /trigger)
const triggerManual = async (req, res) => {
    if (cronState.isRunning) {
        return res.status(423).json({
            success: false,
            message: 'Cron job sedang berjalan',
            state: cronState
        });
    }

    logWithTimestamp('Manual trigger diminta');
    
    // Run async without blocking response
    setImmediate(tandaiPekerjaAbsen);
    
    res.json({
        success: true,
        message: 'Manual trigger dimulai',
        triggeredAt: new Date()
    });
};

// Schedule untuk jam 23:00 setiap hari
const cronJob = cron.schedule('0 23 * * *', tandaiPekerjaAbsen, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        service: 'cron-scheduler',
        timezone: 'Asia/Jakarta',
        schedule: '23:00 daily',
        state: cronState,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
    });
});

// Status endpoint with detailed information
app.get('/status', (req, res) => {
    res.json({
        service: 'absensi-cron-service',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timezone: process.env.TZ || 'Asia/Jakarta',
        cronSchedule: '0 17-23 * * *',
        cronState: cronState,
        database: {
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        },
        uptime: {
            seconds: process.uptime(),
            readable: new Date(process.uptime() * 1000).toISOString().substr(11, 8)
        },
        memory: process.memoryUsage()
    });
});

// Manual trigger endpoint for testing
app.post('/trigger', triggerManual);

// Logs endpoint
app.get('/logs', (req, res) => {
    res.json({
        lastRun: cronState.lastRun,
        lastResult: cronState.lastResult,
        runCount: cronState.runCount,
        nextScheduledRun: '23:00:00 Asia/Jakarta daily'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logWithTimestamp('Menerima SIGTERM, melakukan graceful shutdown...');
    cronJob.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    logWithTimestamp('Menerima SIGINT, melakukan graceful shutdown...');
    cronJob.stop();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    logWithTimestamp(`✅ Cron service dimulai pada port ${PORT}`);
    logWithTimestamp(`📋 Health check tersedia di: http://localhost:${PORT}/health`);
    logWithTimestamp(`📊 Status endpoint: http://localhost:${PORT}/status`);
    logWithTimestamp(`🔧 Manual trigger: POST http://localhost:${PORT}/trigger`);
    logWithTimestamp(`⏰ Jadwal: setiap hari jam 17:00 - 23:00 WIB per jam nya`);
    
    // Set next run info
    cronState.nextRun = 'Daily at 23:00 Asia/Jakarta';
});