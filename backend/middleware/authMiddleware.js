const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Dapatkan token dari header -> "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];

            // Verifikasi token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Lampirkan payload user ke request, agar bisa diakses di controller
            // Disini kita tidak mengambil data dari DB lagi untuk efisiensi
            req.user = decoded.user;

            next(); // Lanjutkan ke controller selanjutnya
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Middleware untuk role tertentu
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    }
}

module.exports = { protect, authorize };