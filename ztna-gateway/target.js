const express = require('express');
const app = express();
const port = 5000;

// localhost 외 접근 차단 미들웨어
app.use((req, res, next) => {
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const clientIP = req.socket.remoteAddress;

    if (!allowedIPs.includes(clientIP)) {
        console.log(`[차단] 외부 IP(${clientIP})가 타겟 서버에 직접 접근 시도!`);
        return res.status(403).json({ message: '외부 직접 접근 금지' });
    }
    next();
});

// 1급 기밀 API
app.get('/', (req, res) => {
    res.json({
        message: '[1급 기밀 구역 성공적 진입!] ZTNA 게이트웨이를 완벽하게 통과했습니다.',
        secretData: '성공했으니 다음 단계로'
    });
});

// '127.0.0.1'에만 바인딩
app.listen(port, '127.0.0.1', () => {
    console.log(`보호받는 타겟 서버가 localhost:${port} 에서 조용히 실행 중입니다.`);
});
