// controllers/faceRecognitionController.js
const axios = require('axios');
const pool = require('../config/db');
const { logActivity } = require('./logController');

// Face Recognition Service URL
const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5001';

exports.registerWorkerFace = async (req, res) => {
    try {
        const { id_pekerja, image_base64 } = req.body;

        if (!id_pekerja || !image_base64) {
            return res.status(400).json({
                success: false,
                message: 'ID Pekerja dan gambar diperlukan'
            });
        }

        // Get worker info from database
        const [workerRows] = await pool.query(
            'SELECT p.nama_pengguna FROM pekerja pk JOIN pengguna p ON pk.id_pengguna = p.id_pengguna WHERE pk.id_pekerja = ?',
            [id_pekerja]
        );

        if (workerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pekerja tidak ditemukan'
            });
        }

        const workerName = workerRows[0].nama_pengguna;

        // Send to Python face recognition service
        const response = await axios.post(`${FACE_SERVICE_URL}/register`, {
            worker_id: id_pekerja,
            worker_name: workerName,
            image: image_base64
        }, {
            timeout: 30000 // 30 second timeout
        });

        if (response.data.success) {
            // Update database to mark that face is registered
            await pool.query(
                'UPDATE pekerja SET face_registered = TRUE WHERE id_pekerja = ?',
                [id_pekerja]
            );

            // Log activity
            await logActivity(
                req.user.id, 
                ACTIVITY_TYPES.FACE_REGISTRATION, 
                `Face registration berhasil untuk pekerja ${workerName}`, 
                req, 
                'SUCCESS',
                { id_pekerja, workerName }
            );

            return res.json({
                success: true,
                message: 'Wajah pekerja berhasil didaftarkan',
                data: response.data
            });
        } else {
            return res.status(400).json({
                success: false,
                message: response.data.message || 'Gagal mendaftarkan wajah'
            });
        }

    } catch (error) {
        console.error('Face registration error:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Service face recognition tidak tersedia'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mendaftarkan wajah'
        });
    }
};

// Face registration from manager/admin interface
exports.registerFaceFromAdmin = async (req, res) => {
    try {
        const { id_pekerja, nama_pengguna, face_image } = req.body;

        if (!id_pekerja || !face_image) {
            return res.status(400).json({
                success: false,
                message: 'ID Pekerja dan gambar wajah diperlukan'
            });
        }

        // Send to Python face recognition service
        const response = await axios.post(`${FACE_SERVICE_URL}/register`, {
            worker_id: id_pekerja,
            worker_name: nama_pengguna,
            image: face_image
        }, {
            timeout: 30000
        });

        if (response.data.success) {
            // Update database to mark that face is registered
            await pool.query(
                'UPDATE pekerja SET face_registered = TRUE WHERE id_pekerja = ?',
                [id_pekerja]
            );

            // Log activity
            logActivity(req, ACTIVITY_TYPES.REGISTER_FACE_ADMIN, { id_pekerja });

            return res.json({
                success: true,
                message: 'Wajah pekerja berhasil didaftarkan dari admin',
                data: response.data
            });
        } else {
            return res.status(400).json({
                success: false,
                message: response.data.message || 'Gagal mendaftarkan wajah'
            });
        }

    } catch (error) {
        console.error('Admin face registration error:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Service face recognition tidak tersedia'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mendaftarkan wajah'
        });
    }
};

exports.recognizeFace = async (req, res) => {
    try {
        const { image_base64 } = req.body;

        if (!image_base64) {
            return res.status(400).json({
                success: false,
                message: 'Gambar diperlukan'
            });
        }

        // Send to Python face recognition service
        const response = await axios.post(`${FACE_SERVICE_URL}/recognize`, {
            image: image_base64
        }, {
            timeout: 15000 // 15 second timeout
        });

        return res.json(response.data);

    } catch (error) {
        console.error('Error recognizing face:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Face recognition service tidak tersedia. Pastikan Python service berjalan.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

exports.getRegisteredFaces = async (req, res) => {
    try {
        // Get from Python service
        const response = await axios.get(`${FACE_SERVICE_URL}/list_registered`, {
            timeout: 10000
        });

        return res.json(response.data);

    } catch (error) {
        console.error('Error getting registered faces:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Face recognition service tidak tersedia'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

exports.deleteWorkerFace = async (req, res) => {
    try {
        const { id_pekerja } = req.body;

        if (!id_pekerja) {
            return res.status(400).json({
                success: false,
                message: 'ID Pekerja diperlukan'
            });
        }

        // Send to Python service
        const response = await axios.post(`${FACE_SERVICE_URL}/delete_worker`, {
            worker_id: id_pekerja
        }, {
            timeout: 10000
        });

        if (response.data.success) {
            // Update database
            await pool.query(
                'UPDATE pekerja SET face_registered = FALSE WHERE id_pekerja = ?',
                [id_pekerja]
            );
        }

        return res.json(response.data);

    } catch (error) {
        console.error('Error deleting worker face:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Face recognition service tidak tersedia'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server'
        });
    }
};

exports.healthCheck = async (req, res) => {
    try {
        const response = await axios.get(`${FACE_SERVICE_URL}/health`, {
            timeout: 5000
        });

        return res.json({
            success: true,
            python_service: response.data,
            message: 'Face recognition service berjalan normal'
        });

    } catch (error) {
        console.error('Face service health check failed:', error);
        
        return res.status(503).json({
            success: false,
            message: 'Face recognition service tidak tersedia',
            error: error.code === 'ECONNREFUSED' ? 'Service not running' : error.message
        });
    }
};
