//회원가입, 로그인, OTP 라우팅

const express = require('express');
const router = express.Router();
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// [API 1] 회원가입 (rate limit 적용 — 봇 무제한 계정 생성 방지)
router.post('/signup', loginLimiter, authController.signup);

// [API 2] 로그인 (ZTNA PDP 위험 평가 포함)
router.post('/login', loginLimiter, authController.login);

// [API 3] OTP 검증
router.post('/verify-otp', otpLimiter, authController.verifyOtp);

// [API 4] 생체 인증(FaceID/지문) 검증
router.post('/verify-bio', authController.verifyBio);

const { getClientIp } = require('../utils/ip');

// [API 5] 관리자 전용 로그인 (어드민 대시보드 전용)
router.post('/admin-login', loginLimiter, authController.adminLogin);

// [API 6] 단말 공인 IP 확인 (모바일 데이터/웹 환경에서 0.0.0.0 방지)
router.get('/my-ip', (req, res) => {
    res.json({ ip: getClientIp(req) });
});

module.exports = router;