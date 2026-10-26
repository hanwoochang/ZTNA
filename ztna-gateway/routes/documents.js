const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documentsController');
const upload = require('../config/multer');

// 파일 디스크 저장 전에 BYOD 및 직급 권한을 먼저 검사하여 무권한 파일 저장 원천 차단
const checkUploadPermission = (req, res, next) => {
    if (req.headers['x-allow-download'] === 'false') {
        return res.status(403).json({ message: 'BYOD 기기에서는 기밀 문서를 업로드할 수 없습니다.' });
    }
    const isAdminRole = req.headers['x-user-role'] === 'ADMIN';
    const userPos = parseInt(req.headers['x-user-position-level'] || '1', 10);
    if (!isAdminRole && userPos < 3) {
        return res.status(403).json({ message: '기밀 문서 업로드 권한이 없습니다 (과장 이상만 가능).' });
    }
    next();
};

// Multer 용량 초과(LIMIT_FILE_SIZE) 및 업로드 에러를 JSON으로 반환하는 래퍼 미들웨어
const handleFileUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: '파일 크기는 최대 20MB를 초과할 수 없습니다.' });
            }
            return res.status(400).json({ message: '파일 업로드 처리 중 오류가 발생했습니다.' });
        }
        next();
    });
};

router.get('/secret.pdf', documentsController.downloadSecretPdf);
router.get('/', documentsController.getDocuments);
router.post('/', checkUploadPermission, handleFileUpload, documentsController.uploadDocument);
router.delete('/:id', documentsController.deleteDocument);
router.get('/:id/download', documentsController.downloadDocument);

module.exports = router;
