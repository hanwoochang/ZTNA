const pool = require('../config/db');
const { getClientIp } = require('../utils/ip');

module.exports = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const isBenchmark = req.headers['x-ztna-benchmark'] === 'true';

    if (userId && userEmail) {
        // 단순 근태 상태 조회(백그라운드 폴링), 루트 헬스체크(/), 벤치마크 요청은 DB 감사 로그 적재 생략 (로그 테이블 오염 방지)
        const isAttendanceStatusPoll = req.method === 'GET' && req.originalUrl.startsWith('/api/attendance/today');
        const isRootCheck = req.method === 'GET' && req.originalUrl === '/';
        if (!isAttendanceStatusPoll && !isRootCheck && !isBenchmark) {
            try {
                const ipAddress = getClientIp(req);

                await pool.query(
                    'INSERT INTO intranet_access_logs (user_id, user_email, api_endpoint, method, ip_address) VALUES (?, ?, ?, ?, ?)',
                    [userId, userEmail, req.originalUrl, req.method, ipAddress]
                );
                console.log(`[사내망 기록] ${userEmail} 님이 ${req.method} ${req.originalUrl} 호출`);
            } catch (error) {
                console.error('[사내망 접근 로그 에러]:', error.message);
                return res.status(401).json({ message: '계정 정보가 유효하지 않습니다. 다시 로그인해 주세요.' });
            }
        }
    } else if (!isBenchmark && !(req.method === 'GET' && req.originalUrl === '/')) {
        console.log(`[경고] 식별할 수 없는 접근 시도: ${req.method} ${req.originalUrl}`);
    }
    next();
};
