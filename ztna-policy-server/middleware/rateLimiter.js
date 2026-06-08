//제한 횟수나 시간 조정

const rateLimit = require('express-rate-limit');

const getCleanIp = (req) => {
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress?.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';
    return ipAddress || 'unknown';
};

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { message: '🚨 로그인 시도 횟수를 초과했습니다. 5분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getCleanIp,
});

const otpLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 5,
    message: { message: '🚨 OTP 시도 횟수를 초과했습니다. 3분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getCleanIp,
});

module.exports = { loginLimiter, otpLimiter };