const express = require('express');
const router = express.Router();
const noticesController = require('../controllers/noticesController');

router.get('/', noticesController.getNotices);
router.post('/', noticesController.createNotice);
router.get('/:id', noticesController.getNotice);
router.put('/:id', noticesController.updateNotice);
router.delete('/:id', noticesController.deleteNotice);

module.exports = router;
