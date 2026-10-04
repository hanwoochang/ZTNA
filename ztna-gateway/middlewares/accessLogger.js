const pool = require('../config/db');

module.exports = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];

    if (userId && userEmail) {
        try {
            // 원격 클라이언트 실제 IP 추적 시도
            let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
            if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
            if (ipAddress === '::1') ipAddress = '127.0.0.1';

            await pool.query(
                'INSERT INTO intranet_access_logs (user_id, user_email, api_endpoint, method, ip_address) VALUES (?, ?, ?, ?, ?)',
                [userId, userEmail, req.originalUrl, req.method, ipAddress]
            );
            console.log(`[사내망 기록] ${userEmail} 님이 ${req.method} ${req.originalUrl} 호출`);
        } catch (error) {
            console.error('[사내망 접근 로그 에러]:', error.message);
            return res.status(401).json({ message: '계정 정보가 유효하지 않습니다. 다시 로그인해 주세요.' });
        }
    } else {
        console.log(`[경고] 식별할 수 없는 접근 시도: ${req.method} ${req.originalUrl}`);
    }
    next();
};
