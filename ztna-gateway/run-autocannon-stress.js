require('dotenv').config({ path: '/home/ubuntu/ztna/ztna-gateway/.env' });
const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const mysql = require('mysql2/promise');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        { expiresIn: '1h' }
    );

    return { actor, token };
}

function runAutocannon(opts) {
    return new Promise((resolve, reject) => {
        autocannon(opts, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function formatResult(name, res) {
    const lat = res.latency || {};
    const reqs = res.requests || {};
    const totalErrors = (res.non2xx || 0) + (res.errors || 0) + (res.timeouts || 0);

    return {
        '테스트 대상': name,
        '동시 접속': res.connections,
        '지속 시간': `${res.duration}s`,
        '평균 RPS': Number(reqs.average || 0).toFixed(1),
        '총 요청수': reqs.total || 0,
        '평균 지연 (ms)': Number(lat.average || 0).toFixed(2),
        'p50 (ms)': Number(lat.p50 || 0).toFixed(2),
        'p97.5 (ms)': Number(lat.p97_5 || 0).toFixed(2), // Autocannon 기본 제공 백분위수
        'p99 (ms)': Number(lat.p99 || 0).toFixed(2),
        '에러/타임아웃': totalErrors
    };
}

async function main() {
    console.log('================================================================================');
    console.log('            Autocannon 고부하 스트레스 벤치마크 (Direct vs ZTNA PEP)             ');
    console.log('================================================================================');

    const { actor, token } = await getActorAndToken();
    console.log(`[테스트 계정] ${actor.email} (Role: ${actor.role}, Lv: ${actor.position_level})\n`);

    const summaryTable = [];
    const testCases = [
        { connections: 10, duration: 10 },
        { connections: 50, duration: 10 },
        { connections: 100, duration: 10 }
    ];

    for (const { connections, duration } of testCases) {
        console.log(`>>> 동시 접속자 수: ${connections}명, 테스트 시간: ${duration}초 부하 테스트 시작...`);

        // 1. Direct Target (Direct No-ZTNA)
        const directRes = await runAutocannon({
            url: 'http://127.0.0.1:5000/api/notices',
            connections,
            duration,
            headers: {
                'x-ztna-benchmark': 'true',
                'x-user-id': String(actor.userId),
                'x-user-email': actor.email,
                'x-user-role': actor.role || 'USER',
                'x-user-department': encodeURIComponent(actor.department || 'ALL'),
                'x-user-position-level': String(actor.position_level || 1)
            }
        });
        summaryTable.push(formatResult(`Direct (No-ZTNA) [c=${connections}]`, directRes));

        await sleep(1500); // 소켓 및 리소스 정리를 위한 1.5초 대기

        // 2. ZTNA Gateway PEP 경유
        const ztnaRes = await runAutocannon({
            url: 'http://127.0.0.1:4000/private/api/notices',
            connections,
            duration,
            headers: {
                'x-ztna-benchmark': 'true',
                'Authorization': `Bearer ${token}`
            }
        });
        summaryTable.push(formatResult(`ZTNA Gateway 경유 [c=${connections}]`, ztnaRes));

        await sleep(1500);
    }

    console.log('\n================================================================================');
    console.log('                         Autocannon 부하 테스트 최종 결과                       ');
    console.log('================================================================================');
    console.table(summaryTable);
}

main().catch(err => {
    console.error('실행 에러:', err);
    process.exit(1);
});