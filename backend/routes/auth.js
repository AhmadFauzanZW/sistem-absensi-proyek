/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the login route
// Method: POST, URL: /api/auth/login
router.post('/login', authController.login);

module.exports = router;