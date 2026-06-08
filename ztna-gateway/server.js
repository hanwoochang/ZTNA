require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mysql = require('mysql2/promise'); // 🌟 DB 연결 추가

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
    origin: function(origin, callback) {
        // Origin 없는 요청 = 모바일 앱 → 허용
        if (!origin) {
            return callback(null, true);
        }

        // 브라우저 요청은 허가된 IP만 허용
        const allowedOrigins = [
            `http://${process.env.CLIENT_IP}`,
            `https://${process.env.CLIENT_IP}`,
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`[CORS 차단] 허가되지 않은 도메인: ${origin}`);
            callback(new Error('허가되지 않은 도메인입니다.'), false);
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

//Policy Server와 같은 DB 연결
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ztna',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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

        // 블랙리스트 확인 (로그아웃된 토큰인지 체크)
        const [blacklisted] = await pool.query(
            'SELECT id FROM token_blacklist WHERE jti = ?', 
            [decoded.jti]
        );

        if (blacklisted.length > 0) {
            console.log(`[차단] 폐기된 출입증으로 접근 시도! (${decoded.email})`);
            return res.status(401).json({ message: '접근 금지: 이미 폐기된 출입증입니다!' });
        }

        req.user = decoded;
        console.log(`[통과] ${req.user.email} 님이 내부망에 접근합니다.`);
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
}));

app.listen(port, () => {
    console.log(`ZTNA 게이트웨이가 http://localhost:${port} 에서 철통 보안 중입니다.`);
});