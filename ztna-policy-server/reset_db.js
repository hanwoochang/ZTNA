const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'0421',database:'ztna'});
  
  try {
    // 1. 외래키 제약조건 무시하고 모든 데이터 싹 밀기 (순번 초기화)
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    await c.query('TRUNCATE TABLE access_logs');
    await c.query('TRUNCATE TABLE devices');
    await c.query('TRUNCATE TABLE token_blacklist');
    await c.query('TRUNCATE TABLE users');
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[1/3] 모든 테이블 데이터 및 순번(ID) 초기화 완료');

    // 2. 관리자 계정 생성
    const hashedPw = await bcrypt.hash('1234', 10);
    const [result] = await c.query(
      "INSERT INTO users (email, password_hash, role, department, name, is_active) VALUES (?, ?, 'ADMIN', '보안팀', '최고관리자', 1)",
      ['admin@company.com', hashedPw]
    );
    const adminId = result.insertId; // 당연히 1번이 됩니다.
    console.log('[2/3] 최고 관리자 계정(ID: 1) 생성 완료');

    // 3. 관리자 대시보드 접근용 기기 자동 등록 (OTP 방지)
    await c.query(
      "INSERT INTO devices (user_id, device_identifier, is_trusted, device_type, last_ip_address, is_compliant) VALUES (?, 'admin-dashboard-browser', 1, 'CORPORATE', '127.0.0.1', 1)",
      [adminId]
    );
    console.log('[3/3] 관리자 웹 대시보드 브라우저 신뢰 기기 등록 완료');

  } catch (err) {
    console.error('초기화 중 에러 발생:', err);
  } finally {
    await c.end();
  }
}

run();
