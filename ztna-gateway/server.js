require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// [핵심 로직] ZTNA 문지기 미들웨어: 토큰 검사소
const verifyToken = (req, res, next) => {
    // 1. 요청 헤더에서 'Authorization' 출입증 꺼내기
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer eyJhb..." 형태에서 토큰 문자열만 분리

    // 2. 출입증이 아예 없으면 쫓아냄!
    if (!token) {
        console.log('[차단] 출입증(JWT) 없이 접근 시도!');
        return res.status(401).json({ message: '접근 금지: 출입증(JWT)이 없습니다!' });
    }

    try {
        // 3. 출입증 위조 검사 (.env에 있는 비밀키로 꼼꼼히 확인)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 검사 통과! 방문자 정보(email, role 등)를 기록
        
        console.log(`[통과] ${req.user.email} 님이 내부망에 접근합니다.`);
        next(); // 진짜 내부망으로 통과시켜줌! (이 next()가 없으면 여기서 멈춤)
    } catch (error) {
        // 4. 출입증이 가짜이거나 유효기간(1시간)이 지났으면 쫓아냄!
        console.log('[차단] 가짜이거나 만료된 출입증 접근 시도!');
        return res.status(403).json({ message: '접근 금지: 유효하지 않은 출입증입니다!' });
    }
};

// 프록시 라우터: '/private' 주소로 오는 요청은 무조건 verifyToken 문지기를 거쳐야 함
app.use('/private', verifyToken, createProxyMiddleware({
    target: process.env.TARGET_URL, // 문지기 통과하면 여기(5000번)로 보내줌
    changeOrigin: true,
    pathRewrite: {
        '^/private': '', // 목적지에 도착할 땐 '/private' 꼬리표를 떼고 자연스럽게 전달
    },
}));

// 서버 실행
app.listen(port, () => {
    console.log(`ZTNA 게이트웨이가 http://localhost:${port} 에서 철통 보안 중입니다.`);
});
