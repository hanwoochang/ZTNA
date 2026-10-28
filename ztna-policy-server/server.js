//조립 담당

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

const allowedOrigins = [
    'https://ztna-core.duckdns.org',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:3000'
];

app.set('trust proxy', 1);
app.use(cors({
    origin: (origin, callback) => {
        // 모바일 네이티브 앱(Origin 헤더 없음) 또는 허용된 도메인만 통과
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS 정책에 의해 차단된 출처입니다.'));
    },
    exposedHeaders: ['Server-Timing']
}));
app.use(express.json());

// 라우터 연결
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/session'));
app.use('/api/admin', require('./routes/admin'));

// 만료된 블랙리스트 토큰 1시간마다 자동 정리
const pool = require('./config/db');
setInterval(async () => {
    try {
        await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
        console.log('[정리 완료] 만료된 블랙리스트 토큰 삭제');
    } catch (err) {
        console.error('[블랙리스트 정리 실패]:', err.message);
    }
}, 60 * 60 * 1000);

app.listen(port, () => console.log(`ZTNA Policy Server running on ${port}`));
