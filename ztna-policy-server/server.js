//조립 담당

require('dotenv').config();
const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());

// 라우터 연결
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/session'));

// 만료된 블랙리스트 토큰 1시간마다 자동 정리
const pool = require('./db');
setInterval(async () => {
    await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
    console.log('[정리 완료] 만료된 블랙리스트 토큰 삭제');
}, 60 * 60 * 1000);

app.listen(port, () => console.log(`🚀 ZTNA Policy Server running on ${port}`));