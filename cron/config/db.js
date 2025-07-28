// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'absensi',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

// Test connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`[${new Date().toISOString()}] ✅ Cron service berhasil terhubung ke database`);
        console.log(`[${new Date().toISOString()}] Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        console.log(`[${new Date().toISOString()}] Database: ${process.env.DB_NAME}`);
        connection.release();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Gagal terhubung ke database:`, error.message);
        process.exit(1);
    }
})();

module.exports = pool;
