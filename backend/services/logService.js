/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

const pool = require('../config/db');

/**
 * Mencatat aktivitas pengguna ke dalam database.
 * @param {number} userId - ID dari pengguna (Pengguna.id_pengguna).
 * @param {string} activityType - Jenis aktivitas (e.g., 'LOGIN', 'APPROVE_IZIN').
 * @param {string} description - Deskripsi detail dari aktivitas.
 * @param {object} req - Objek request Express untuk mendapatkan IP & User Agent.
 */
const logActivity = async (userId, activityType, description, req) => {
    try {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        await pool.query(
            `INSERT INTO log_aktivitas (id_pengguna, tipe_aktivitas, deskripsi, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
            [userId, activityType, description, ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

module.exports = logActivity;