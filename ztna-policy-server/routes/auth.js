//회원가입, 로그인, OTP 라우팅

const express = require('express');
const router = express.Router();
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const { getClientIp } = require('../utils/ip');

// [API 1] 로그인 (ZTNA PDP 위험 평가 포함)
router.post('/login', loginLimiter, authController.login);

// [API 2] OTP 검증
router.post('/verify-otp', otpLimiter, authController.verifyOtp);

// [API 3] 생체 인증(FaceID/지문) 검증
router.post('/verify-bio', otpLimiter, authController.verifyBio);

// [API 4] 관리자 전용 로그인 (어드민 대시보드 전용)
router.post('/admin-login', loginLimiter, authController.adminLogin);

// [API 6] 단말 공인 IP 확인 (모바일 데이터/웹 환경에서 0.0.0.0 방지)
router.get('/my-ip', (req, res) => {
    res.json({ ip: getClientIp(req) });
});

module.exports = router;