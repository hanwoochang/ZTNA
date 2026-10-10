require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// 블랙리스트 체크가 추가된 문지기 미들웨어
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('[차단] 출입증(JWT) 없이 접근 시도!');
        return res.status(401).json({ message: '접근 금지: 출입증(JWT)이 없습니다!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 1. 블랙리스트 확인 (로그아웃된 토큰인지 체크)
        const [blacklisted] = await pool.query(
            'SELECT id FROM token_blacklist WHERE jti = ?', 
            [decoded.jti]
        );

        if (blacklisted.length > 0) {
            console.log(`[차단] 폐기된 출입증으로 접근 시도! (${decoded.email})`);
            return res.status(401).json({ message: '접근 금지: 이미 폐기된 출입증입니다!' });
        }

        // 2. 실시간 강제 차단(Revoke) 검사 및 권한 갱신 (Heartbeat / API Call)
        if (decoded.deviceId) {
            const [devices] = await pool.query(
                'SELECT status, device_type FROM devices WHERE user_id = ? AND device_identifier = ?',
                [decoded.userId, decoded.deviceId]
            );
            
            if (!devices[0] || devices[0].status !== 'APPROVED') {
                console.log(`[강제 튕김] 관리자에 의해 신뢰 해제된 기기 접근 차단! (${decoded.email})`);
                // 이미 발급된 JWT라도 강제로 효력을 상실시킴 (Session Tearing)
                return res.status(401).json({ 
                    message: '관리자에 의해 기기 접근이 차단/해제되었습니다. 세션이 차단됩니다.', 
                    revoked: true 
                });
            }

            // 실시간 소유 형태(BYOD/CORPORATE) 변경 감지 및 토큰 권한 오버라이드
            if (devices[0].device_type === 'BYOD') {
                decoded.allowDownload = false;
            } else if (devices[0].device_type === 'CORPORATE') {
                decoded.allowDownload = true;
            }
        }

        // 실시간 사용자 직급 및 권한 DB 동기화 (토큰 재발급 없이도 즉시 반영)
        const [freshUsers] = await pool.query('SELECT role, department, position_level FROM users WHERE id = ?', [decoded.userId]);
        if (freshUsers.length > 0) {
            decoded.role = freshUsers[0].role;
            decoded.department = freshUsers[0].department;
            decoded.position_level = freshUsers[0].position_level;
        }

        req.user = decoded;
        console.log(`[통과] ${req.user.email} 님이 내부망에 접근합니다. (직급Lv: ${req.user.position_level}, 권한: ${req.user.role})`);
        next();
    } catch (error) {
        console.log('[차단 상세 이유]:', error.message); // 🌟 진짜 에러 이유를 출력하도록 수정!
        return res.status(403).json({ message: '접근 금지: 유효하지 않은 출입증입니다!' });
    }
};

app.use('/private', verifyToken, createProxyMiddleware({
    target: process.env.TARGET_URL,
    changeOrigin: true,
    pathRewrite: { '^/private': '' },
    on: {
        proxyRes: (proxyRes, req, res) => {
            if (req.user && req.user.allowDownload !== undefined) {
                proxyRes.headers['x-allow-download-sync'] = req.user.allowDownload ? 'true' : 'false';
            }
            if (req.user && req.user.position_level !== undefined) {
                proxyRes.headers['x-user-position-level-sync'] = String(req.user.position_level);
            }
            if (req.user && req.user.role !== undefined) {
                proxyRes.headers['x-user-role-sync'] = String(req.user.role);
            }
        },
        proxyReq: (proxyReq, req, res) => {
            // verifyToken 미들웨어에서 해석한 사용자 정보를 헤더에 주입하여 Target Server로 전달
            if (req.user) {
                proxyReq.setHeader('x-user-id', req.user.userId);
                proxyReq.setHeader('x-user-email', req.user.email);
                // 클라이언트 위조 방지를 위해 값이 없어도 항상 덮어씀
                proxyReq.setHeader('x-user-role', req.user.role || 'NONE');
                proxyReq.setHeader('x-user-department', encodeURIComponent(req.user.department || 'ALL'));
                proxyReq.setHeader('x-user-position-level', req.user.position_level || '1');
                proxyReq.setHeader('x-allow-download', req.user.allowDownload ? 'true' : 'false');
            }
        }
    }
}));

app.listen(port, () => {
    console.log(`ZTNA 게이트웨이가 http://localhost:${port} 에서 철통 보안 중입니다.`);
});