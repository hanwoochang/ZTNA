require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const pool = require('./config/db');
const { getClientIp } = require('./utils/ip');

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = [
    'https://ztna-core.duckdns.org',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:3000'
];

app.set('trust proxy', 1);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS 정책에 의해 차단된 출처입니다.'));
    },
    exposedHeaders: ['Server-Timing', 'x-allow-download-sync', 'x-user-position-level-sync', 'x-user-role-sync']
}));

// 블랙리스트 체크 및 구간별 마이크로 타이밍(Server-Timing)이 포함된 문지기 미들웨어
const verifyToken = async (req, res, next) => {
    const tStart = process.hrtime.bigint();
    const isBenchmark = req.headers['x-ztna-benchmark'] === 'true';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        if (!isBenchmark) console.log('[차단] 출입증(JWT) 없이 접근 시도!');
        return res.status(401).json({ message: '접근 금지: 출입증(JWT)이 없습니다!' });
    }

    try {
        const tJwtStart = process.hrtime.bigint();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tJwtEnd = process.hrtime.bigint();

        // 1. 블랙리스트 확인 (로그아웃된 토큰인지 체크)
        const tBlacklistStart = process.hrtime.bigint();
        const [blacklisted] = await pool.query(
            'SELECT id FROM token_blacklist WHERE jti = ?', 
            [decoded.jti]
        );
        const tBlacklistEnd = process.hrtime.bigint();

        if (blacklisted.length > 0) {
            if (!isBenchmark) console.log(`[차단] 폐기된 출입증으로 접근 시도! (${decoded.email})`);
            return res.status(401).json({ message: '접근 금지: 이미 폐기된 출입증입니다!' });
        }

        // 2. ZTNA 단말기 식별자(deviceId) 필수 검증 (관리자 웹 전용 토큰 등으로 우회 진입 차단)
        if (!decoded.deviceId) {
            if (!isBenchmark) console.log(`[차단] 단말기 식별 정보(deviceId)가 없는 토큰으로 사내망 접근 시도! (${decoded.email})`);
            return res.status(403).json({
                message: '접근 금지: 인가된 단말기 식별 정보가 없는 토큰으로는 사내 기밀망에 접근할 수 없습니다.'
            });
        }

        // 3. 실시간 강제 차단(Revoke) 검사 및 권한 갱신 (Heartbeat / API Call)
        const tDeviceStart = process.hrtime.bigint();
        const [devices] = await pool.query(
            'SELECT status, device_type FROM devices WHERE user_id = ? AND device_identifier = ?',
            [decoded.userId, decoded.deviceId]
        );
        const tDeviceEnd = process.hrtime.bigint();
        
        if (!devices[0] || devices[0].status !== 'APPROVED') {
            if (!isBenchmark) console.log(`[강제 튕김] 관리자에 의해 신뢰 해제된 기기 접근 차단! (${decoded.email})`);
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

        // 실시간 사용자 직급, 권한 및 계정 정지 여부 DB 동기화 (토큰 재발급 없이도 즉시 반영)
        const tUserStart = process.hrtime.bigint();
        const [freshUsers] = await pool.query('SELECT role, department, position_level, is_active FROM users WHERE id = ?', [decoded.userId]);
        const tUserEnd = process.hrtime.bigint();

        if (!freshUsers[0] || freshUsers[0].is_active === 0) {
            if (!isBenchmark) console.log(`[강제 튕김] 정지되었거나 삭제된 계정 접근 차단! (${decoded.email})`);
            return res.status(401).json({
                message: '관리자에 의해 계정이 정지되었습니다. 세션이 차단됩니다.',
                revoked: true
            });
        }
        decoded.role = freshUsers[0].role;
        decoded.department = freshUsers[0].department;
        decoded.position_level = freshUsers[0].position_level;

        const tPepEnd = process.hrtime.bigint();
        req.ztnaTimings = {
            jwtMs: Number(tJwtEnd - tJwtStart) / 1e6,
            dbBlacklistMs: Number(tBlacklistEnd - tBlacklistStart) / 1e6,
            dbDeviceMs: Number(tDeviceEnd - tDeviceStart) / 1e6,
            dbUserMs: Number(tUserEnd - tUserStart) / 1e6,
            ztnaPepMs: Number(tPepEnd - tStart) / 1e6,
            proxyStartNs: tPepEnd
        };

        req.user = decoded;
        if (!isBenchmark) {
            console.log(`[통과] ${req.user.email} 님이 내부망에 접근합니다. (직급Lv: ${req.user.position_level}, 권한: ${req.user.role})`);
        }
        next();
    } catch (error) {
        if (!isBenchmark) console.log('[차단 상세 이유]:', error.message);
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
            if (req.ztnaTimings) {
                const t = req.ztnaTimings;
                const upstreamMs = Number(process.hrtime.bigint() - t.proxyStartNs) / 1e6;
                proxyRes.headers['server-timing'] = [
                    `jwt;dur=${t.jwtMs.toFixed(3)};desc="JWT Verify"`,
                    `db-blacklist;dur=${t.dbBlacklistMs.toFixed(3)};desc="DB Blacklist Check"`,
                    `db-device;dur=${t.dbDeviceMs.toFixed(3)};desc="DB Device Trust"`,
                    `db-user;dur=${t.dbUserMs.toFixed(3)};desc="DB User Sync"`,
                    `ztna-pep;dur=${t.ztnaPepMs.toFixed(3)};desc="ZTNA PEP Total"`,
                    `target-upstream;dur=${upstreamMs.toFixed(3)};desc="Target Server"`
                ].join(', ');
            }
        },
        proxyReq: (proxyReq, req, res) => {
            // verifyToken 미들웨어에서 해석한 사용자 정보 및 Nginx가 검증한 실제 IP를 헤더에 주입하여 Target Server로 전달
            proxyReq.setHeader('x-real-ip', getClientIp(req));
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
