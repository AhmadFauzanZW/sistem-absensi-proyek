const pool = require('../config/db');

// Get all activity logs untuk director dashboard
const getAllLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        
        // Filter parameters
        const { userId, activity, dateFrom, dateTo } = req.query;
        
        let whereConditions = [];
        let queryParams = [];
        
        if (userId) {
            whereConditions.push('la.id_pengguna = ?');
            queryParams.push(userId);
        }
        
        if (activity) {
            whereConditions.push('la.tipe_aktivitas = ?');
            queryParams.push(activity);
        }
        
        if (dateFrom) {
            whereConditions.push('DATE(la.waktu_aktivitas) >= ?');
            queryParams.push(dateFrom);
        }
        
        if (dateTo) {
            whereConditions.push('DATE(la.waktu_aktivitas) <= ?');
            queryParams.push(dateTo);
        }
        
        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM log_aktivitas la
            ${whereClause}
        `;
        
        const [countResult] = await pool.query(countQuery, queryParams);
        const total = countResult[0].total;
        
        // Get logs with user information
        const logsQuery = `
            SELECT 
                la.id_log_aktivitas as id,
                la.id_pengguna,
                p.nama_pengguna as nama_lengkap,
                p.nama_pengguna as username,
                pr.nama_peran as role,
                la.tipe_aktivitas as aktivitas,
                la.deskripsi,
                la.waktu_aktivitas as waktu,
                la.ip_address,
                la.user_agent,
                'SUCCESS' as status
            FROM log_aktivitas la
            JOIN pengguna p ON la.id_pengguna = p.id_pengguna
            JOIN peran pr ON p.id_peran = pr.id_peran
            ${whereClause}
            ORDER BY la.waktu_aktivitas DESC
            LIMIT ? OFFSET ?
        `;
        
        queryParams.push(limit, offset);
        const [logs] = await pool.query(logsQuery, queryParams);
        
        res.json({
            success: true,
            logs: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error in getAllLogs:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil log aktivitas'
        });
    }
};

// Get activity summary untuk dashboard direktur
const getActivitySummary = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        // Get activity type summary
        const [activitySummary] = await pool.query(`
            SELECT 
                la.tipe_aktivitas as type,
                COUNT(*) as count
            FROM log_aktivitas la
            WHERE la.waktu_aktivitas >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY la.tipe_aktivitas
            ORDER BY count DESC
        `, [days]);
        
        // Get recent activities
        const [recentActivities] = await pool.query(`
            SELECT 
                la.id_log_aktivitas as id,
                la.id_pengguna,
                p.nama_pengguna as nama_lengkap,
                pr.nama_peran as role,
                la.tipe_aktivitas as aktivitas,
                la.deskripsi,
                la.waktu_aktivitas as waktu
            FROM log_aktivitas la
            JOIN pengguna p ON la.id_pengguna = p.id_pengguna
            JOIN peran pr ON p.id_peran = pr.id_peran
            ORDER BY la.waktu_aktivitas DESC
            LIMIT 10
        `);
        
        // Get daily activity chart data
        const [dailyActivity] = await pool.query(`
            SELECT 
                DATE(la.waktu_aktivitas) as date,
                COUNT(*) as count
            FROM log_aktivitas la
            WHERE la.waktu_aktivitas >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(la.waktu_aktivitas)
            ORDER BY date DESC
        `, [days]);
        
        // Get user stats
        const [userStats] = await pool.query(`
            SELECT 
                p.nama_pengguna as nama_lengkap,
                pr.nama_peran as role,
                COUNT(*) as total_activities,
                MAX(la.waktu_aktivitas) as last_activity
            FROM log_aktivitas la
            JOIN pengguna p ON la.id_pengguna = p.id_pengguna
            JOIN peran pr ON p.id_peran = pr.id_peran
            WHERE la.waktu_aktivitas >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY la.id_pengguna, p.nama_pengguna, pr.nama_peran
            ORDER BY total_activities DESC
            LIMIT 10
        `, [days]);
        
        res.json({
            success: true,
            data: {
                activitySummary,
                recentActivities,
                dailyActivity,
                userStats
            }
        });
        
    } catch (error) {
        console.error('Error in getActivitySummary:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil ringkasan aktivitas'
        });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM log_aktivitas');
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const [logs] = await pool.query(
            `SELECT l.waktu_aktivitas, p.nama_pengguna, pr.nama_peran, l.tipe_aktivitas, l.deskripsi
             FROM log_aktivitas l
             JOIN pengguna p ON l.id_pengguna = p.id_pengguna
             JOIN peran pr ON p.id_peran = pr.id_peran
             ORDER BY l.waktu_aktivitas DESC
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        res.json({
            logs,
            pagination: { currentPage: parseInt(page), totalPages, totalItems }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Get logs for specific user
const getUserLogs = async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const [logs] = await pool.query(`
            SELECT 
                la.id_log_aktivitas as id,
                la.tipe_aktivitas as aktivitas,
                la.deskripsi,
                la.waktu_aktivitas as waktu,
                la.ip_address,
                la.user_agent,
                'SUCCESS' as status
            FROM log_aktivitas la
            WHERE la.id_pengguna = ?
            ORDER BY la.waktu_aktivitas DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
        
        // Count total for pagination
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM log_aktivitas WHERE id_pengguna = ?',
            [userId]
        );
        const total = countResult[0].total;
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error in getUserLogs:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil log user'
        });
    }
};

// Helper function untuk mencatat aktivitas (dapat digunakan di controller lain)
const logActivity = async (userId, activityType, description, req = null) => {
    try {
        await pool.query(
            'INSERT INTO log_aktivitas (id_pengguna, tipe_aktivitas, deskripsi, waktu_aktivitas, ip_address, user_agent) VALUES (?, ?, ?, NOW(), ?, ?)',
            [
                userId,
                activityType,
                description,
                req ? (req.ip || req.connection.remoteAddress) : null,
                req ? (req.get('User-Agent') || 'Unknown') : null
            ]
        );
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

module.exports = {
    getAllLogs,
    getActivitySummary,
    getUserLogs,
    logActivity
};