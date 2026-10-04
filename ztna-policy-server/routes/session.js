//로그아웃, 세션 관리

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../config/db');

// [API 5] 로그아웃
router.post('/logout', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '토큰이 없습니다.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await pool.query('INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
            [decoded.jti, new Date(decoded.exp * 1000)]);
        res.json({ message: '로그아웃 완료. 출입증이 폐기되었습니다.' });
    } catch (error) {
        res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
});

// [API 6] Heartbeat
router.post('/verify-context', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { deviceId } = req.body;

    let currentIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (currentIp.includes('::ffff:')) currentIp = currentIp.split('::ffff:')[1];
    if (currentIp === '::1') currentIp = '127.0.0.1';

    if (!token || !deviceId) return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 토큰에 박힌 기기와 요청 기기가 다르면 토큰 탈취/재사용으로 간주
        if (decoded.deviceId && decoded.deviceId !== deviceId) {
            await pool.query('INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
                [decoded.jti, new Date(decoded.exp * 1000)]);
            return res.status(403).json({ action: 'TERMINATE', message: '기기 정보 불일치! 연결이 강제 종료됩니다.' });
        }

        const [devices] = await pool.query(
            'SELECT status, device_type, last_ip_address FROM devices WHERE user_id = ? AND device_identifier = ?',
            [decoded.userId, deviceId]
        );
        const device = devices[0];

        if (!device || device.status !== 'APPROVED' || device.last_ip_address !== currentIp) {
            console.log(`[강제 추방] ${decoded.email} - 보안 컨텍스트 불일치 (신뢰 해제 또는 IP 변경)`);
            await pool.query('INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
                [decoded.jti, new Date(decoded.exp * 1000)]);
            return res.status(403).json({ action: 'TERMINATE', message: '보안 정책 위반 감지! 연결이 강제 종료됩니다.' });
        }

        // 최신 기기 소유 형태 기준으로 다운로드 권한 재산정
        const allowDownload = device.device_type !== 'BYOD';

        const newToken = jwt.sign(
            {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                department: decoded.department,
                jti: randomUUID(),
                deviceId,
                allowDownload
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        res.json({ status: 'SAFE', token: newToken, allowDownload });
    } catch (error) {
        res.status(401).json({ action: 'TERMINATE', message: '세션이 만료되었습니다.' });
    }
});

module.exports = router;