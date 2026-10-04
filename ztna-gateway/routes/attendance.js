const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/today', attendanceController.getTodayAttendance);

module.exports = router;
