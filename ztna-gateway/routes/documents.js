const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documentsController');
const upload = require('../config/multer');

router.get('/secret.pdf', documentsController.downloadSecretPdf);
router.get('/', documentsController.getDocuments);
router.post('/', upload.single('file'), documentsController.uploadDocument);
router.get('/:id/download', documentsController.downloadDocument);

module.exports = router;
