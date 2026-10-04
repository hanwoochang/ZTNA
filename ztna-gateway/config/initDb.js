const pool = require('./db');

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
        try {
            await pool.query('ALTER TABLE notices ADD COLUMN is_edited TINYINT(1) DEFAULT 0');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
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

async function initDocumentsDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS intranet_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                author VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM intranet_documents');
        if (rows[0].count === 0) {
            await pool.query(`
                INSERT INTO intranet_documents (title, description, filename, original_name, author) VALUES 
                ('ZTNA v2.0 아키텍처 가이드', '사내망 보안 가이드 문서입니다.', 'dummy_guide.pdf', '가이드.pdf', '보안팀'),
                ('2분기 매출 보고서 (대외비)', '외부 유출을 금지합니다.', 'dummy_report.pdf', '매출보고서.pdf', '재무팀')
            `);
        }
    } catch (error) {
        console.error('Documents DB 초기화 에러:', error);
    }
}

module.exports = () => {
    initNoticesDB();
    initEventsDB();
    initDocumentsDB();
};
