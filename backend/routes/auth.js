const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the login route
// Method: POST, URL: /api/auth/login
router.post('/login', authController.login);

module.exports = router;