const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('🔄 DB 마이그레이션 시작...');

        // 0. access_logs 테이블 생성 (없으면 생성)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_logs (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                user_id      INT,
                device_id    INT,
                ip_address   VARCHAR(50),
                risk_score   INT DEFAULT 0,
                action_taken ENUM('ALLOW', 'STEP_UP', 'DENY') NOT NULL,
                reason       VARCHAR(500),
                login_hour   INT,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ access_logs 테이블 생성 완료 (또는 이미 존재)');

        // 1. users 테이블 컬럼 추가
        const userCols = ['role', 'department', 'name', 'is_active'];
        for (const col of userCols) {
            try {
                let query = '';
                if (col === 'role') query = "ALTER TABLE users ADD COLUMN role ENUM('ADMIN', 'FINANCE', 'HR', 'DEV', 'GENERAL') DEFAULT 'GENERAL'";
                if (col === 'department') query = "ALTER TABLE users ADD COLUMN department VARCHAR(50) DEFAULT '일반부서'";
                if (col === 'name') query = "ALTER TABLE users ADD COLUMN name VARCHAR(50) DEFAULT '임직원'";
                if (col === 'is_active') query = "ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1";
                await pool.query(query);
                console.log(`✅ users 테이블 컬럼 추가 완료: ${col}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ 컬럼이 이미 존재함: ${col}`);
                } else {
                    throw err;
                }
            }
        }

        // 2. devices 테이블 컬럼 추가
        const deviceCols = ['device_type', 'is_compliant', 'status'];
        for (const col of deviceCols) {
            try {
                let query = '';
                if (col === 'device_type') query = "ALTER TABLE devices ADD COLUMN device_type ENUM('CORPORATE', 'BYOD') DEFAULT 'BYOD'";
                if (col === 'is_compliant') query = "ALTER TABLE devices ADD COLUMN is_compliant TINYINT(1) DEFAULT 1";
                if (col === 'status') query = "ALTER TABLE devices ADD COLUMN status ENUM('PENDING', 'APPROVED', 'BLOCKED') DEFAULT 'PENDING'";
                await pool.query(query);
                console.log(`✅ devices 테이블 컬럼 추가 완료: ${col}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ 컬럼이 이미 존재함: ${col}`);
                } else {
                    throw err;
                }
            }
        }

        // 2-1. status 백필: status를 기기 상태의 단일 기준(Source of Truth)으로 사용
        //   - 기존 승인 기기(is_trusted=1) → APPROVED
        //   - 그 외(is_trusted=0)는 승인 대기/차단 구분이 불가하므로 기존 status 유지
        const [backfill] = await pool.query(
            "UPDATE devices SET status = 'APPROVED' WHERE is_trusted = 1 AND (status IS NULL OR status <> 'APPROVED')"
        );
        console.log(`✅ devices.status 백필 완료 (APPROVED 반영: ${backfill.affectedRows}건)`);

        // 3. 테스트 계정(Seed) 삽입
        const passwordHash = await bcrypt.hash('1234', 10);
        const testUsers = [
            { email: 'admin@company.com', role: 'ADMIN', dept: '보안팀', name: '보안관리자' },
            { email: 'finance_corp@company.com', role: 'FINANCE', dept: '재무팀', name: '김재무' },
            { email: 'finance_byod@company.com', role: 'FINANCE', dept: '재무팀', name: '이재무' },
            { email: 'finance_vuln@company.com', role: 'FINANCE', dept: '재무팀', name: '박취약' },
        ];

        for (const u of testUsers) {
            const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
            if (rows.length === 0) {
                await pool.query(
                    'INSERT INTO users (email, password_hash, role, department, name, is_active) VALUES (?, ?, ?, ?, ?, 1)',
                    [u.email, passwordHash, u.role, u.dept, u.name]
                );
                console.log(`✅ 테스트 계정 추가 완료: ${u.email}`);
            } else {
                // Update roles in case they were added before migration
                await pool.query(
                    'UPDATE users SET role = ?, department = ?, name = ? WHERE email = ?',
                    [u.role, u.dept, u.name, u.email]
                );
                console.log(`ℹ️ 테스트 계정 정보 업데이트 됨: ${u.email}`);
            }
        }

        console.log('🎉 DB 마이그레이션이 성공적으로 완료되었습니다!');
    } catch (error) {
        console.error('❌ DB 마이그레이션 중 에러 발생:', error);
    } finally {
        await pool.end();
    }
}

migrate();
