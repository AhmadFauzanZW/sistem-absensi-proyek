// server/controllers/manajemenPekerjaController.js

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Mengambil semua data pekerja dengan filter
exports.getAllWorkers = async (req, res) => {
    try {
        const { search, lokasi, jabatan, page = 1, limit = 10, sortBy = 'nama_pengguna', sortOrder = 'ASC' } = req.query;
        const offset = (page - 1) * limit;

        // --- Bagian untuk membangun query dinamis ---
        let baseQuery = `
            FROM pekerja pk
            JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
            LEFT JOIN lokasi_proyek lp ON pk.id_lokasi_penugasan = lp.id_lokasi
            LEFT JOIN jenis_pekerjaan j ON pk.id_jenis_pekerjaan = j.id_jenis_pekerjaan
        `;
        let whereClause = ` WHERE 1=1 `;
        const params = [];

        if (search) {
            whereClause += ` AND (p.nama_pengguna LIKE ? OR p.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (lokasi) {
            whereClause += ` AND pk.id_lokasi_penugasan = ?`;
            params.push(lokasi);
        }
        if (jabatan) {
            whereClause += ` AND pk.id_jenis_pekerjaan = ?`;
            params.push(jabatan);
        }

        // --- Query untuk menghitung total item untuk paginasi ---
        const countQuery = `SELECT COUNT(pk.id_pekerja) as total ${baseQuery} ${whereClause}`;
        const [totalResult] = await pool.query(countQuery, params);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        // --- Query utama untuk mengambil data dengan sorting dan paginasi ---
        const safeSortBy = {
            'nama_pengguna': 'p.nama_pengguna',
            'waktu_dibuat': 'p.waktu_dibuat'
        }[sortBy] || 'p.nama_pengguna'; // Fallback ke default jika sortBy tidak valid

        const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const dataQuery = `
            SELECT 
                pk.id_pekerja, p.id_pengguna, p.nama_pengguna, p.no_telpon, pk.alamat, p.email, p.status_pengguna, p.waktu_dibuat,
                lp.nama_lokasi, j.nama_pekerjaan, pk.gaji_harian, pk.kode_qr, pk.face_registered
            ${baseQuery} ${whereClause}
            ORDER BY ${safeSortBy} ${safeSortOrder}
            LIMIT ? OFFSET ?
        `;
        const [workers] = await pool.query(dataQuery, [...params, parseInt(limit), parseInt(offset)]);

        res.json({
            workers,
            pagination: { currentPage: parseInt(page), totalPages, totalItems }
        });

    } catch (error) {
        console.error("Error fetching workers:", error);
        res.status(500).send("Server Error");
    }
};

// 2. Menambah pekerja baru (dengan transaksi)
exports.addWorker = async (req, res) => {
    const { nama_pengguna, no_telpon, alamat, email, password, id_jenis_pekerjaan, id_lokasi_penugasan, gaji_harian } = req.body;

    // Ambil koneksi dari pool untuk transaksi
    const connection = await pool.getConnection();

    try {
        // Mulai transaksi
        await connection.beginTransaction();

        // Langkah 1: Buat entri di tabel 'pengguna'
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const peranPekerjaId = 4; // Asumsi id_peran untuk 'Pekerja' adalah 4

        const [userResult] = await connection.query(
            'INSERT INTO pengguna (nama_pengguna, no_telpon, email, password_hash, id_peran, status_pengguna) VALUES (?, ?, ?, ?, ?, ?)',
            [nama_pengguna, no_telpon, email, password_hash, peranPekerjaId, 'Aktif']
        );
        const newUserId = userResult.insertId;

        // Langkah 2: Buat entri di tabel 'pekerja'
        await connection.query(
            'INSERT INTO pekerja (id_pengguna, id_jenis_pekerjaan, alamat, id_lokasi_penugasan, gaji_harian) VALUES (?, ?, ?, ?, ?)',
            [newUserId, id_jenis_pekerjaan, alamat, id_lokasi_penugasan, gaji_harian]
        );

        // Jika semua berhasil, commit transaksi
        await connection.commit();
        res.status(201).json({ message: 'Pekerja berhasil ditambahkan' });

    } catch (error) {
        // Jika ada error, rollback transaksi
        await connection.rollback();
        console.error("Error adding worker:", error);
        // Cek jika error karena duplikat email
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }
        res.status(500).send("Server Error");
    } finally {
        // Selalu lepaskan koneksi kembali ke pool
        connection.release();
    }
};

// 3. Mengubah data pekerja
exports.updateWorker = async (req, res) => {
    const { id_pekerja } = req.params;
    const { id_pengguna, nama_pengguna, no_telpon, alamat, email, id_jenis_pekerjaan, id_lokasi_penugasan, gaji_harian } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE pengguna SET nama_pengguna = ?, no_telpon = ?, email = ? WHERE id_pengguna = ?',
            [nama_pengguna, no_telpon, email, id_pengguna]
        );
        await connection.query(
            'UPDATE pekerja SET id_jenis_pekerjaan = ?, alamat = ?, id_lokasi_penugasan = ?, gaji_harian = ? WHERE id_pekerja = ?',
            [id_jenis_pekerjaan, alamat, id_lokasi_penugasan, gaji_harian, id_pekerja]
        );

        await connection.commit();
        res.json({ message: 'Data pekerja berhasil diperbarui' });
    } catch (error) {
        await connection.rollback();
        console.error("Error updating worker:", error);
        res.status(500).send("Server Error");
    } finally {
        connection.release();
    }
};

// 4. Mengubah status aktif/nonaktif pekerja
exports.updateWorkerStatus = async (req, res) => {
    const { id_pengguna } = req.params;
    const { status } = req.body; // 'Aktif' atau 'Nonaktif'

    try {
        await pool.query('UPDATE pengguna SET status_pengguna = ? WHERE id_pengguna = ?', [status, id_pengguna]);
        res.json({ message: `Status pekerja berhasil diubah menjadi ${status}` });
    } catch (error) {
        console.error("Error updating worker status:", error);
        res.status(500).send("Server Error");
    }
};

// 5. Endpoint untuk mendapatkan metadata (daftar lokasi & jabatan)
exports.getMetaData = async (req, res) => {
    try {
        const [lokasi] = await pool.query("SELECT id_lokasi, nama_lokasi FROM lokasi_proyek WHERE status_proyek = 'Aktif' ORDER BY nama_lokasi");
        const [jabatan] = await pool.query("SELECT id_jenis_pekerjaan, nama_pekerjaan FROM jenis_pekerjaan ORDER BY nama_pekerjaan");
        res.json({ lokasi, jabatan });
    } catch (error) {
        console.error("Error fetching metadata:", error);
        res.status(500).send("Server Error");
    }
};

// 6. Generate QR Code untuk pekerja
exports.generateQRCode = async (req, res) => {
    const { id_pekerja } = req.params;
    const { qr_code } = req.body;

    try {
        // Update QR code untuk pekerja
        await pool.query('UPDATE pekerja SET kode_qr = ? WHERE id_pekerja = ?', [qr_code, id_pekerja]);
        
        res.json({ 
            success: true, 
            message: 'QR Code berhasil disimpan',
            qr_code: qr_code
        });
    } catch (error) {
        console.error("Error saving QR code:", error);
        res.status(500).json({ 
            success: false, 
            message: "Gagal menyimpan QR Code" 
        });
    }
};

// 7. Update face registration status
// server/controllers/manajemenPekerjaController.js

exports.updateFaceRegistration = async (req, res) => {
    const { id_pekerja } = req.params;
    const { nama_pengguna, face_image } = req.body;

    try {
        // Validate input
        if (!face_image) {
            return res.status(400).json({
                success: false,
                message: 'Data gambar wajah diperlukan'
            });
        }

        // Convert base64 to buffer and save to file
        const fs = require('fs');
        const path = require('path');

        // Remove data:image/jpeg;base64, prefix if exists
        const base64Data = face_image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Create face_images directory if it doesn't exist
        const faceImagesDir = path.join(__dirname, '../face_images');
        if (!fs.existsSync(faceImagesDir)) {
            fs.mkdirSync(faceImagesDir, { recursive: true });
        }

        // Generate filename
        const filename = `worker_${id_pekerja}_${Date.now()}.jpg`;
        const filepath = path.join(faceImagesDir, filename);

        // Save image file
        fs.writeFileSync(filepath, imageBuffer);

        // Update database with new face image path
        const [result] = await pool.query(
            'UPDATE pekerja SET foto_profil_path = ?, face_registered = 1 WHERE id_pekerja = ?',
            [filename, id_pekerja]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pekerja tidak ditemukan'
            });
        }

        // Also call Python service to update face recognition model
        try {
            const axios = require('axios');
            const pythonServiceUrl = 'https://ai.absenproyek.biz.id' || 'http://localhost:5000';

            // Send base64 image data to Python service, not file path
            await axios.post(`${pythonServiceUrl}/register`, {
                worker_id: id_pekerja,
                worker_name: nama_pengguna,
                image: face_image // Send the original base64 image
            });

            console.log('Face registration updated in Python service');
        } catch (pythonError) {
            console.error('Error updating Python face service:', pythonError);
            // Continue even if Python service fails
        }

        res.json({
            success: true,
            message: 'Wajah berhasil didaftarkan dan model diperbarui',
            filename: filename
        });

    } catch (error) {
        console.error('Error updating face registration:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui registrasi wajah: ' + error.message
        });
    }
};