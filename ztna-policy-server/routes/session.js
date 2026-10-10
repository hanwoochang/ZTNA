//로그아웃, 세션 관리 라우터

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// [API 5] 로그아웃
router.post('/logout', authController.logout);

// [API 6] Heartbeat (세션 연장 및 기기/컨텍스트 검증)
router.post('/verify-context', authController.verifyContext);

module.exports = router;