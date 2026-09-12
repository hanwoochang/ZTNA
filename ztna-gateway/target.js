require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const app = express();
const port = 5000;

// DB 연결
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ztna',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JSON 바디 파싱 (향후 POST 요청 처리에 필요)
app.use(express.json());

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

// 공통 접근 로그 미들웨어
app.use(async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];

    if (userId && userEmail) {
        try {
            // 원격 클라이언트 실제 IP 추적 시도
            let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
            if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
            if (ipAddress === '::1') ipAddress = '127.0.0.1';

            await pool.query(
                'INSERT INTO intranet_access_logs (user_id, user_email, api_endpoint, method, ip_address) VALUES (?, ?, ?, ?, ?)',
                [userId, userEmail, req.originalUrl, req.method, ipAddress]
            );
            console.log(`[사내망 기록] ${userEmail} 님이 ${req.method} ${req.originalUrl} 호출`);
        } catch (error) {
            console.error('[사내망 접근 로그 에러]:', error.message);
        }
    } else {
        console.log(`[경고] 식별할 수 없는 접근 시도: ${req.method} ${req.originalUrl}`);
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

// 기밀 문서 다운로드 API (동적 PDF 생성)
app.get('/api/documents/secret.pdf', (req, res) => {
    const userEmail = req.headers['x-user-email'] || 'Unknown User';
    
    // IP 추적
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    // 현재 시간 계산
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    // PDF 문서 객체 생성
    const doc = new PDFDocument();

    // 브라우저에서 다운로드될 파일명과 파일 타입 설정
    res.setHeader('Content-disposition', 'attachment; filename="Top_Secret_Document.pdf"');
    res.setHeader('Content-type', 'application/pdf');

    // 생성되는 PDF 스트림을 즉시 응답(Response)으로 보냄
    doc.pipe(res);

    // [문서 본문 작성]
    doc.fontSize(25).fillColor('black').text('ZTNA Top Secret Document', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(14).text('This document contains highly classified information. Unauthorized distribution is strictly prohibited.');
    doc.moveDown(2);
    
    doc.fontSize(12).text('Project Code: ZTNA-V2-APOLLO');
    doc.text('Clearance Level: Level 5');
    
    // [동적 워터마크 추가] 사용자를 식별할 수 있는 핵심 정보 주입
    doc.moveDown(5);
    doc.fontSize(20).fillColor('red').opacity(0.3)
       .text(`DOWNLOADED BY: ${userEmail}`, { align: 'center', angle: -20 })
       .text(`TIME: ${timestamp}`, { align: 'center', angle: -20 })
       .text(`IP: ${ipAddress}`, { align: 'center', angle: -20 });

    // 문서 작성 완료 (이 코드가 호출되면 브라우저로 전송 마무리)
    doc.end();
});

// 모바일 사원증 기반 출근(체크인) API
app.post('/api/attendance/check-in', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    // 오늘 날짜 추출 (YYYY-MM-DD 형식)
    // 서버 환경에 따라 UTC 기준이 될 수 있으므로, 실제 실무에서는 KST(한국 시간)로 보정 권장
    const today = new Date();
    const dateRecord = today.toISOString().split('T')[0];

    try {
        // 동일한 날짜에 레코드가 없으면 새로 삽입(INSERT), 이미 있으면 출근 시간만 유지(아무것도 안 함)
        await pool.query(
            `INSERT INTO attendance_logs (user_id, check_in_time, date_record, ip_address) 
             VALUES (?, NOW(), ?, ?) 
             ON DUPLICATE KEY UPDATE check_in_time = IF(check_in_time IS NULL, NOW(), check_in_time)`,
            [userId, dateRecord, ipAddress]
        );
        res.json({ message: '✅ 성공적으로 출근(Check-in) 처리되었습니다.' });
    } catch (error) {
        console.error('[출근 처리 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
});

// 모바일 사원증 기반 퇴근(체크아웃) API
app.post('/api/attendance/check-out', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const today = new Date();
    const dateRecord = today.toISOString().split('T')[0];

    try {
        // 동일한 날짜에 레코드가 없으면 새로 삽입(출근 안찍고 퇴근만 찍는 경우), 
        // 이미 출근 기록이 있으면 해당 레코드의 퇴근 시간(check_out_time)을 갱신(UPDATE)
        await pool.query(
            `INSERT INTO attendance_logs (user_id, check_out_time, date_record, ip_address) 
             VALUES (?, NOW(), ?, ?) 
             ON DUPLICATE KEY UPDATE check_out_time = NOW(), ip_address = ?`,
            [userId, dateRecord, ipAddress, ipAddress]
        );
        res.json({ message: '✅ 성공적으로 퇴근(Check-out) 처리되었습니다.' });
    } catch (error) {
        console.error('[퇴근 처리 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
});

// 당일 출퇴근 기록 조회 API
app.get('/api/attendance/today', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    const today = new Date();
    // KST 기준으로 보정하기 위한 로직 (옵션)
    // today.setHours(today.getHours() + 9);
    const dateRecord = today.toISOString().split('T')[0];

    try {
        const [rows] = await pool.query(
            `SELECT check_in_time, check_out_time FROM attendance_logs 
             WHERE user_id = ? AND date_record = ? LIMIT 1`,
            [userId, dateRecord]
        );
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            // 오늘 기록이 없는 경우
            res.json({ check_in_time: null, check_out_time: null });
        }
    } catch (error) {
        console.error('[출퇴근 기록 조회 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
});

// '127.0.0.1'에만 바인딩
app.listen(port, '127.0.0.1', () => {
    console.log(`보호받는 타겟 서버가 localhost:${port} 에서 조용히 실행 중입니다.`);
});