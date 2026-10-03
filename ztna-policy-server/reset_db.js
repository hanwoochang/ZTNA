// 개발용 DB 초기화 스크립트 (모든 데이터 삭제 후 관리자 계정만 생성)
// 실행: node reset_db.js   ※ DB 접속 정보는 .env에서 읽습니다.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ztna',
  });
  
  try {
    // 1. 외래키 제약조건 무시하고 모든 데이터 싹 밀기 (순번 초기화)
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    await c.query('TRUNCATE TABLE access_logs');
    await c.query('TRUNCATE TABLE devices');
    await c.query('TRUNCATE TABLE token_blacklist');
    await c.query('TRUNCATE TABLE users');
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[1/2] 모든 테이블 데이터 및 순번(ID) 초기화 완료');

    // 2. 관리자 계정 생성
    //    ※ 관리자 웹은 /api/admin-login(기기 검사 없음)을 사용하므로 신뢰 기기 사전 등록이 필요 없습니다.
    const hashedPw = await bcrypt.hash('1234', 10);
    await c.query(
      "INSERT INTO users (email, password_hash, role, department, name, is_active) VALUES (?, ?, 'ADMIN', '보안팀', '최고관리자', 1)",
      ['admin@company.com', hashedPw]
    );
    console.log('[2/2] 최고 관리자 계정(ID: 1) 생성 완료');

  } catch (err) {
    console.error('초기화 중 에러 발생:', err);
  } finally {
    await c.end();
  }
}

run();
