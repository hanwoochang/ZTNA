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
            return res.status(401).json({ message: '계정 정보가 유효하지 않습니다. 다시 로그인해 주세요.' });
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
    try {
        const userEmail = req.headers['x-user-email'] || 'Unknown User';
        
        // IP 추적
        let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
        if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
        if (ipAddress === '::1') ipAddress = '127.0.0.1';

        // 현재 시간 계산 (영어 포맷으로 변경하여 PDF 기본 폰트 충돌 방지)
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

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
           .text(`DOWNLOADED BY: ${userEmail}`, { align: 'center' })
           .text(`TIME: ${timestamp}`, { align: 'center' })
           .text(`IP: ${ipAddress}`, { align: 'center' });

        // 문서 작성 완료 (이 코드가 호출되면 브라우저로 전송 마무리)
        doc.end();
    } catch (error) {
        console.error('[PDF 생성 에러]:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'PDF 생성 중 에러가 발생했습니다.' });
        }
    }
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
        res.json({ message: '성공적으로 출근(Check-in) 처리되었습니다.' });
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
        res.json({ message: '성공적으로 퇴근(Check-out) 처리되었습니다.' });
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

// --- 게시판(Notice Board) DB 연동 API ---
async function initNoticesDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                author VARCHAR(100) NOT NULL,
                date VARCHAR(50) NOT NULL,
                is_edited TINYINT(1) DEFAULT 0
            )
        `);
        // 기존 테이블에 is_edited 컬럼이 없을 경우 추가 (스키마 마이그레이션)
        try {
            await pool.query('ALTER TABLE notices ADD COLUMN is_edited TINYINT(1) DEFAULT 0');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
        // Check if empty, then insert dummy data
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM notices');
        if (rows[0].count === 0) {
            await pool.query(`
                INSERT INTO notices (title, content, author, date) VALUES 
                ('[필독] ZTNA v2.0 보안 정책 업데이트 안내', '모든 직원은 새로운 보안 정책을 숙지해 주시기 바랍니다.', '보안팀', '2026-09-04'),
                ('2분기 부서별 기밀문서 열람 권한 심사 결과', '권한 심사 결과가 메일로 개별 발송되었습니다.', '인사팀', '2026-09-02'),
                ('비인가 IP 접근 시도 계정 차단 내역 보고', '어제 새벽 발생한 접근 시도는 모두 차단 완료되었습니다.', '보안관제', '2026-09-01')
            `);
        }
    } catch (error) {
        console.error('DB 초기화 에러:', error);
    }
}
initNoticesDB();

// --- 캘린더 일정(Events) DB 연동 API ---
async function initEventsDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(50) NOT NULL,
                author VARCHAR(100) NOT NULL
            )
        `);
        // Check if empty
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM events');
        if (rows[0].count === 0) {
            await pool.query(`
                INSERT INTO events (title, date, author) VALUES 
                ('임원진 세미나', '2026-09-14', '관리자'),
                ('보안 점검회의', '2026-09-15', '관리자'),
                ('서버 정기 유지보수', '2026-09-20', '관리자')
            `);
        }
    } catch (error) {
        console.error('Events DB 초기화 에러:', error);
    }
}
initEventsDB();

app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, email, name, department, role FROM users ORDER BY email ASC');
        res.json(rows);
    } catch (err) {
        console.error('[임직원 목록 조회 에러]:', err);
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events ORDER BY date ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.post('/api/events', async (req, res) => {
    const { title, date } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    if (!title || !date) return res.status(400).json({ message: '제목과 날짜를 입력해주세요.' });

    try {
        const [result] = await pool.query('INSERT INTO events (title, date, author) VALUES (?, ?, ?)', [title, date, author]);
        res.json({ message: '일정이 등록되었습니다.', event: { id: result.insertId, title, date, author } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';
    
    try {
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '일정을 찾을 수 없습니다.' });
        
        if (rows[0].author !== currentUser && currentUser !== '관리자') {
            return res.status(403).json({ message: '본인이 등록한 일정만 삭제할 수 있습니다.' });
        }

        const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
        res.json({ message: '일정이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.get('/api/notices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.get('/api/notices/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.post('/api/notices', async (req, res) => {
    const { title, content } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    const today = new Date().toISOString().split('T')[0];
    try {
        const [result] = await pool.query('INSERT INTO notices (title, content, author, date) VALUES (?, ?, ?, ?)', [title, content, author, today]);
        res.json({ message: '기밀 게시글이 등록되었습니다.', notice: { id: result.insertId, title, content, author, date: today } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.delete('/api/notices/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';

    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        const notice = rows[0];

        if (notice.author !== currentUser && currentUser !== '보안팀' && currentUser !== '인사팀') {
            return res.status(403).json({ message: '본인이 작성한 게시글만 삭제할 수 있습니다.' });
        }

        await pool.query('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});

app.put('/api/notices/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';
    
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        const notice = rows[0];

        if (notice.author !== currentUser && currentUser !== '보안팀' && currentUser !== '인사팀') {
            return res.status(403).json({ message: '수정 권한이 없습니다 (작성자 본인만 가능).' });
        }

        const updatedTitle = title || notice.title;
        const updatedContent = content || notice.content;
        const updatedDate = new Date().toISOString().split('T')[0]; // 순수 날짜만 유지

        await pool.query('UPDATE notices SET title = ?, content = ?, date = ?, is_edited = 1 WHERE id = ?', [updatedTitle, updatedContent, updatedDate, id]);
        res.json({ message: '게시글이 수정되었습니다.', notice: { ...notice, title: updatedTitle, content: updatedContent, date: updatedDate, is_edited: 1 } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
});
// -------------------------------------------

// '127.0.0.1'에만 바인딩
app.listen(port, '127.0.0.1', () => {
    console.log(`보호받는 타겟 서버가 localhost:${port} 에서 조용히 실행 중입니다.`);
});