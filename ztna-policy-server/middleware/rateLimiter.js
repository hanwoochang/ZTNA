//제한 횟수나 시간 조정

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { message: '🚨 로그인 시도 횟수를 초과했습니다. 5분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 5,
    message: { message: '🚨 OTP 시도 횟수를 초과했습니다. 3분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, otpLimiter };
