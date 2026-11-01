require('dotenv').config({ path: '/home/ubuntu/ztna/ztna-gateway/.env' });
const { spawnSync } = require('child_process');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const mysql = require('mysql2/promise');

async function getActorAndToken() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ztna_db',
        port: process.env.DB_PORT || 3306
    });

    const [rows] = await pool.query(`
        SELECT u.id AS userId, u.email, u.role, u.department, u.position_level, d.device_identifier AS deviceId, d.device_type
        FROM users u
        JOIN devices d ON u.id = d.user_id
        WHERE u.is_active = 1 AND d.status = 'APPROVED'
        LIMIT 1
    `);
    await pool.end();

    if (!rows[0]) throw new Error('테스트용 활성 계정을 찾을 수 없습니다.');
    const actor = rows[0];

    const token = jwt.sign(
        {
            userId: actor.userId,
            email: actor.email,
            role: actor.role,
            department: actor.department,
            position_level: actor.position_level,
            jti: randomUUID(),
            deviceId: actor.deviceId,
            allowDownload: actor.device_type !== 'BYOD'
        },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    return { actor, token };
}

async function runTest(targetName, envTarget, token) {
    console.log(`\n================================================================================`);
    console.log(`>>> k6 부하 테스트 시작: [${targetName}] (10명 -> 50명 -> 100명 점진적 부하 인가)`);
    console.log(`================================================================================`);

    const env = {
        ...process.env,
        TEST_TARGET: envTarget,
        ZTNA_TOKEN: token
    };

    const res = spawnSync('k6', ['run', '/home/ubuntu/ztna/ztna-gateway/k6-load-test.js'], {
        env,
        stdio: 'inherit',
        encoding: 'utf-8'
    });

    if (res.error) {
        console.error('k6 실행 에러:', res.error);
    }
}

async function main() {
    console.log('================================================================================');
    console.log('                 k6 정밀 시나리오 부하 테스트 (Direct vs ZTNA PEP)              ');
    console.log('================================================================================');

    const { actor, token } = await getActorAndToken();
    console.log(`[테스트 계정] ${actor.email} (Role: ${actor.role}, Lv: ${actor.position_level})`);

    // 1. Direct Target 테스트
    await runTest('1. Direct (타겟 직접 호출 - No ZTNA)', 'direct', token);

    // 2. ZTNA Gateway 테스트
    await runTest('2. ZTNA Gateway (PEP 보안 검증 경유)', 'gateway', token);

    console.log('\n================================================================================');
    console.log('                 k6 모든 시나리오 부하 테스트가 완료되었습니다!                  ');
    console.log('================================================================================');
}

main().catch(err => {
    console.error('오류 발생:', err.message);
    process.exit(1);
});
