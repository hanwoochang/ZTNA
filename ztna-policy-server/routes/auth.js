//회원가입, 로그인, OTP 라우팅

const express = require('express');
const router = express.Router();
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// [API 1] 회원가입
router.post('/signup', authController.signup);

// [API 2] 로그인 (ZTNA PDP 위험 평가 포함)
router.post('/login', loginLimiter, authController.login);

// [API 3] OTP 검증
router.post('/verify-otp', otpLimiter, authController.verifyOtp);

// [API 4] 생체 인증(FaceID/지문) 검증
router.post('/verify-bio', authController.verifyBio);

// [API 5] 관리자 전용 로그인 (어드민 대시보드 전용)
router.post('/admin-login', loginLimiter, authController.adminLogin);

module.exports = router;