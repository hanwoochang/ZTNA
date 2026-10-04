require('dotenv').config();
const express = require('express');
const app = express();
const port = 5000;

// 미들웨어
const ipBlocker = require('./middlewares/ipBlocker');
const accessLogger = require('./middlewares/accessLogger');

// 라우터
const documentsRouter = require('./routes/documents');
const attendanceRouter = require('./routes/attendance');
const employeesRouter = require('./routes/employees');
const eventsRouter = require('./routes/events');
const noticesRouter = require('./routes/notices');

// DB 초기화
const initDb = require('./config/initDb');
initDb();

// JSON 바디 파싱
app.use(express.json());

// 미들웨어 등록
app.use(ipBlocker);
app.use(accessLogger);

// 1급 기밀 API
app.get('/', (req, res) => {
    res.json({
        message: '[1급 기밀 구역 성공적 진입!] ZTNA 게이트웨이를 완벽하게 통과했습니다.',
        secretData: '성공했으니 다음 단계로'
    });
});

// 라우터 마운트
app.use('/api/documents', documentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/notices', noticesRouter);

// '127.0.0.1'에만 바인딩
app.listen(port, '127.0.0.1', () => {
    console.log(`보호받는 타겟 서버가 localhost:${port} 에서 조용히 실행 중입니다.`);
});