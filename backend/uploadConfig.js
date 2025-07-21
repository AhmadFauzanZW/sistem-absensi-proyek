const multer = require('multer');
const path = require('path');

// Buat folder public/uploads jika belum ada
const fs = require('fs');
const dir = './public/uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // Folder tempat menyimpan file
    },
    filename: function (req, file, cb) {
        // Buat nama file yang unik untuk menghindari konflik
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;