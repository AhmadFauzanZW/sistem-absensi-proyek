const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan kata sandi diperlukan.' });
  }

  // Check if JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Konfigurasi server tidak lengkap.' });
  }

  try {
    // Test database connection first
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({
        message: 'Tidak dapat terhubung ke database. Silakan coba lagi nanti.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Query untuk mendapatkan data pengguna aktif
    const [users] = await pool.query(
        `SELECT
           p.id_pengguna, p.password_hash, pr.nama_peran,
           pk.id_pekerja, p.nama_pengguna, jpk.nama_pekerjaan
         FROM pengguna p
                JOIN peran pr ON p.id_peran = pr.id_peran
                LEFT JOIN pekerja pk ON p.id_pengguna = pk.id_pengguna
                LEFT JOIN jenis_pekerjaan jpk ON pk.id_jenis_pekerjaan = jpk.id_jenis_pekerjaan
         WHERE p.email = ? AND p.status_pengguna = 'Aktif'`,
        [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Kredensial tidak valid.' });
    }

    const user = users[0];

    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Kredensial tidak valid.' });
    }

    // Buat payload token JWT
    const payload = {
      user: {
        id: user.id_pengguna,
        role: user.nama_peran,
        name: user.nama_pengguna,
      },
    };

    // Generate JWT with error handling
    let token;
    try {
      token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    } catch (jwtError) {
      console.error('Error generating JWT:', jwtError);
      return res.status(500).json({ message: 'Gagal membuat token autentikasi.' });
    }

    // Get client IP address safely
    const clientIp = req.ip ||
                    req.connection?.remoteAddress ||
                    req.socket?.remoteAddress ||
                    (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                    'unknown';

    // Catat aktivitas login menggunakan skema lama
    try {
      await pool.query(
        'INSERT INTO log_aktivitas (id_pengguna, tipe_aktivitas, deskripsi, waktu_aktivitas, ip_address, user_agent) VALUES (?, ?, ?, NOW(), ?, ?)',
        [
          user.id_pengguna,
          'LOGIN',
          `User ${user.nama_pengguna} berhasil login`,
          clientIp,
          req.get('User-Agent') || 'Unknown'
        ]
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail login if logging fails
    }

    // Kirim respons dengan token dan info pengguna
    res.json({
      token,
      user: {
        id: user.id_pekerja || user.id_pengguna,
        name: user.nama_pengguna,
        role: user.nama_peran,
        jabatan: user.nama_pekerjaan || null,
      },
    });
  } catch (error) {
    console.error('Error saat login:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};