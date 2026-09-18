const jwt = require('jsonwebtoken');
const pool = require('../db');

async function isAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '관리자 토큰이 없습니다.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 블랙리스트 확인 (강제 추방된 세션 방지)
        const [rows] = await pool.query('SELECT * FROM token_blacklist WHERE jti = ?', [decoded.jti]);
        if (rows.length > 0) {
            return res.status(401).json({ message: '유효하지 않은 관리자 세션입니다. 다시 로그인하세요.' });
        }

        // 권한 확인
        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({ message: '접근 권한이 없습니다. (관리자 전용)' });
        }

        req.user = decoded; // req.user 객체에 토큰 정보 세팅
        next(); // 권한 통과
    } catch (error) {
        return res.status(401).json({ message: '관리자 토큰 검증 실패', error: error.message });
    }
}

module.exports = isAdmin;
