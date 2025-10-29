const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage configuration
const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;

        switch (file.fieldname) {
            case 'profile':
                uploadPath = './storage/images/profile/';
                break;
            case 'image':
                uploadPath = './storage/images/teams/';
                break;
            case 'video':
                uploadPath = './storage/videos/';
                break;
            default:
                uploadPath = null;
        }

        if (!uploadPath) return cb(new Error('Invalid field name'), false);

        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (!file) return cb(null, false);

    const imageTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    const videoTypes = ['video/mp4'];

    if (file.fieldname === 'profile' || file.fieldname === 'image') {
        return cb(null, imageTypes.includes(file.mimetype));
    } else if (file.fieldname === 'video') {
        return cb(null, videoTypes.includes(file.mimetype));
    } else {
        return cb(null, false);
    }
};

// Multer upload
const upload = multer({
    storage: storageEngine,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

module.exports = upload;