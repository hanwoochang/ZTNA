/**
 * ============================================================================
 * ZTNA 11대 보안 공격 시나리오 자동 검증 스크립트 (Penetration & Security Audit)
 * ============================================================================
 * 실행 방법 (EC2 서버 내부):
 *   cd ~/ztna/ztna-gateway && node security-audit-test.js
 * ============================================================================
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('./config/db');
const { getClientIp } = require('./utils/ip');

const GATEWAY_BASE = process.env.BENCH_GATEWAY_URL || 'http://127.0.0.1:4000';
const POLICY_BASE = process.env.BENCH_POLICY_URL || 'http://127.0.0.1:3000';

function sendRequest(urlStr, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;

        const reqOpts = {
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = lib.request(reqOpts, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const rawBody = Buffer.concat(chunks).toString('utf8');
                let jsonBody = null;
                try {
                    jsonBody = JSON.parse(rawBody);
                } catch (_) {}
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    rawBody,
                    jsonBody
                });
            });
        });

        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function runAudit() {
    console.log('================================================================================');
    console.log('       ZTNA 11대 보안 취약점 및 모의 해킹(Penetration Test) 자동 검증');
    console.log('================================================================================');

    // 테스트용 일반 사원(Lv.1) 및 BYOD 기기 픽스처 준비
    const testEmail = 'audit_staff@ztna.local';
    const testDeviceApproved = 'audit-device-approved-001';
    const testDeviceBlocked = 'audit-device-blocked-002';

    await pool.query(
        `INSERT INTO users (email, password_hash, name, department, position, position_level, role, is_active)
         VALUES (?, '$2b$10$dummyhashforsecurityaudit000000000000000000000000000', '보안감사사원', '보안감사팀', '사원', 1, 'USER', 1)
         ON DUPLICATE KEY UPDATE position_level = 1, role = 'USER', is_active = 1`,
        [testEmail]
    );
    const [[auditUser]] = await pool.query('SELECT id, email FROM users WHERE email = ?', [testEmail]);

    await pool.query('DELETE FROM devices WHERE user_id = ? AND device_identifier IN (?, ?)', [
        auditUser.id,
        testDeviceApproved,
        testDeviceBlocked
    ]);

    await pool.query(
        `INSERT INTO devices (user_id, device_identifier, is_trusted, status, device_type, last_ip_address, bio_token_hash)
         VALUES (?, ?, 1, 'APPROVED', 'BYOD', '127.0.0.1', NULL)`,
        [auditUser.id, testDeviceApproved]
    );

    await pool.query(
        `INSERT INTO devices (user_id, device_identifier, is_trusted, status, device_type, last_ip_address, bio_token_hash)
         VALUES (?, ?, 0, 'BLOCKED', 'BYOD', '127.0.0.1', NULL)`,
        [auditUser.id, testDeviceBlocked]
    );

    const results = [];
    const addResult = (no, scenario, expected, actual, passed, detail) => {
        results.push({
            'No.': no,
            '공격 시나리오': scenario,
            '기대 방어 코드': expected,
            '실제 응답': actual,
            '판정': passed ? 'PASS' : 'FAIL',
            '비고': detail
        });
    };

    // -------------------------------------------------------------------------
    // 1. [무인증 사내망 침투 시도]
    // -------------------------------------------------------------------------
    {
        const res = await sendRequest(`${GATEWAY_BASE}/private/api/documents`);
        const passed = res.statusCode === 401;
        addResult(
            1,
            '무인증 사내망 침투 시도 (No Token)',
            '401 Unauthorized',
            `${res.statusCode}`,
            passed,
            res.jsonBody?.message || '토큰 누락 즉시 차단'
        );
    }

    // -------------------------------------------------------------------------
    // 2. [위조 JWT 서명 공격]
    // -------------------------------------------------------------------------
    {
        // 모의 해킹 테스트용 임의 생성 가짜 비밀키 (실제 서버 비밀키와 무관)
        const fakeAttackerSecret = randomUUID();
        // nosemgrep: javascript.jsonwebtoken.security.jwt-hardcode.hardcoded-jwt-secret
        const forgedToken = jwt.sign(
            { userId: auditUser.id, email: auditUser.email, role: 'ADMIN', deviceId: testDeviceApproved, jti: randomUUID() },
            fakeAttackerSecret,
            { expiresIn: '15m' }
        );
        const res = await sendRequest(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${forgedToken}` }
        });
        const passed = res.statusCode === 403;
        addResult(
            2,
            '위조 JWT 서명 공격 (Invalid Signature)',
            '403 Forbidden',
            `${res.statusCode}`,
            passed,
            res.jsonBody?.message || '서명 불일치 차단'
        );
    }

    // -------------------------------------------------------------------------
    // 3. [관리자 웹 토큰 우회 공격 (deviceId 누락)]
    // -------------------------------------------------------------------------
    {
        const adminWebOnlyToken = jwt.sign(
            { userId: auditUser.id, email: auditUser.email, role: 'ADMIN', jti: randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const res = await sendRequest(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${adminWebOnlyToken}` }
        });
        const passed = res.statusCode === 403;
        addResult(
            3,
            '관리자 웹 토큰 사내망 우회 공격 (No deviceId)',
            '403 Forbidden',
            `${res.statusCode}`,
            passed,
            '단말기 식별자 없는 토큰 차단'
        );
    }

    // -------------------------------------------------------------------------
    // 4. [폐기 토큰 재사용 공격 (Replay Attack)]
    // -------------------------------------------------------------------------
    {
        const revokedJti = randomUUID();
        const replayToken = jwt.sign(
            { userId: auditUser.id, email: auditUser.email, role: 'USER', deviceId: testDeviceApproved, jti: revokedJti },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        await pool.query('INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))', [revokedJti]);

        const res = await sendRequest(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${replayToken}` }
        });
        const passed = res.statusCode === 401;
        addResult(
            4,
            '폐기 토큰 재사용 공격 (Blacklist Replay)',
            '401 Unauthorized',
            `${res.statusCode}`,
            passed,
            res.jsonBody?.message || '블랙리스트 JTI 차단'
        );
    }

    // -------------------------------------------------------------------------
    // 5. [신뢰 해제 기기 접근 및 강제 퇴출 (Session Tearing)]
    // -------------------------------------------------------------------------
    {
        const blockedDeviceToken = jwt.sign(
            { userId: auditUser.id, email: auditUser.email, role: 'USER', deviceId: testDeviceBlocked, jti: randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const res = await sendRequest(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${blockedDeviceToken}` }
        });
        const passed = res.statusCode === 401 && res.jsonBody?.revoked === true;
        addResult(
            5,
            '신뢰 해제(BLOCKED) 기기 접근 강제 퇴출',
            '401 (revoked: true)',
            `${res.statusCode} (revoked: ${res.jsonBody?.revoked})`,
            passed,
            '실시간 DB 기기 상태 검증'
        );
    }

    // -------------------------------------------------------------------------
    // 6. [클라이언트 권한 헤더 위조 (Privilege Escalation)]
    // -------------------------------------------------------------------------
    {
        const staffToken = jwt.sign(
            {
                userId: auditUser.id,
                email: auditUser.email,
                role: 'USER',
                position_level: 1,
                allowDownload: false,
                deviceId: testDeviceApproved,
                jti: randomUUID()
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        // 공격자가 헤더에 ADMIN 및 allow-download: true를 강제 주입하여 공지사항 작성(ADMIN 전용) 시도
        const payload = JSON.stringify({ title: 'Hacked Notice', content: 'Escalated', is_important: true });
        const res = await sendRequest(`${GATEWAY_BASE}/private/api/notices`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${staffToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'x-user-role': 'ADMIN',
                'x-user-position-level': '5',
                'x-allow-download': 'true'
            },
            body: payload
        });
        const syncedRole = res.headers['x-user-role-sync'];
        const syncedDownload = res.headers['x-allow-download-sync'];
        const passed = res.statusCode === 403 && syncedRole === 'USER' && syncedDownload === 'false';
        addResult(
            6,
            '클라이언트 권한 헤더 위조 (Header Spoofing)',
            '403 (role=USER 강제동기화)',
            `${res.statusCode} (role=${syncedRole}, dl=${syncedDownload})`,
            passed,
            '게이트웨이 헤더 강제 덮어쓰기'
        );
    }

    // -------------------------------------------------------------------------
    // 7. [BYOD 및 저직급 기밀문서 업로드 우회 시도]
    // -------------------------------------------------------------------------
    {
        const staffToken = jwt.sign(
            {
                userId: auditUser.id,
                email: auditUser.email,
                role: 'USER',
                position_level: 1,
                allowDownload: false,
                deviceId: testDeviceApproved,
                jti: randomUUID()
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const res = await sendRequest(`${GATEWAY_BASE}/private/api/documents`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${staffToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: 'Unauthorized Upload' })
        });
        const passed = res.statusCode === 403;
        addResult(
            7,
            'BYOD/저직급 기밀문서 업로드 우회 시도',
            '403 Forbidden',
            `${res.statusCode}`,
            passed,
            res.jsonBody?.message || 'Multer 저장 전 사전 차단'
        );
    }

    // -------------------------------------------------------------------------
    // 8. [IP 스푸핑 (X-Forwarded-For 헤더 조작) 방어]
    // -------------------------------------------------------------------------
    {
        // getClientIp 유틸리티에 X-Forwarded-For 조작 헤더 주입 검증
        const fakeReq = {
            headers: {
                'x-forwarded-for': '8.8.8.8, 1.1.1.1',
                'x-real-ip': '203.0.113.50'
            },
            ip: '::ffff:203.0.113.50',
            socket: { remoteAddress: '::ffff:203.0.113.50' }
        };
        const extractedIp = getClientIp(fakeReq);
        const passed = extractedIp === '203.0.113.50' && extractedIp !== '8.8.8.8';
        addResult(
            8,
            'IP 스푸핑 (X-Forwarded-For 조작) 방어',
            '실제 IP 유지 (8.8.8.8 무시)',
            `추출 IP: ${extractedIp}`,
            passed,
            'Nginx X-Real-IP / Loopback 신뢰'
        );
    }

    // -------------------------------------------------------------------------
    // 9. [SQL Injection 로그인 우회 시도]
    // -------------------------------------------------------------------------
    {
        const sqliPayload = JSON.stringify({
            email: "admin@ztna.com' OR '1'='1' --",
            password: "' OR '1'='1",
            deviceId: 'sqli-attacker-device'
        });
        const res = await sendRequest(`${POLICY_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(sqliPayload)
            },
            body: sqliPayload
        });
        const passed = res.statusCode === 401;
        addResult(
            9,
            'SQL Injection 로그인 우회 시도',
            '401 Unauthorized',
            `${res.statusCode}`,
            passed,
            'Prepared Statement 바인딩 방어'
        );
    }

    // -------------------------------------------------------------------------
    // 10. [비허가 출처 CORS 및 공개 회원가입(/api/signup) 노출 검사]
    // -------------------------------------------------------------------------
    {
        const corsRes = await sendRequest(`${POLICY_BASE}/api/login`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://evil-attacker.example.com',
                'Access-Control-Request-Method': 'POST'
            }
        });
        const allowOrigin = corsRes.headers['access-control-allow-origin'];
        const signupPayload = JSON.stringify({ email: 'hacker@evil.com', password: '123' });
        const signupRes = await sendRequest(`${POLICY_BASE}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(signupPayload)
            },
            body: signupPayload
        });
        const passed = !allowOrigin && signupRes.statusCode === 404;
        addResult(
            10,
            '비허가 Origin CORS 및 /api/signup 제거 검증',
            'CORS 차단 & 404 Not Found',
            `ACO=${allowOrigin || '차단됨'} / Signup=${signupRes.statusCode}`,
            passed,
            'CORS 화이트리스트 & 회원가입 제거'
        );
    }

    // -------------------------------------------------------------------------
    // 11. [생체 인증 API 직접 호출 우회 시도 (bioToken 검증)]
    // -------------------------------------------------------------------------
    {
        // OTP 요청 상태(pending)를 설정하고 실제 bio_token_hash를 심어둔 상태에서 위조된 bioToken으로 우회 시도
        await pool.query(
            `UPDATE users SET otp_code = '$2b$10$dummyotphash000000000000000000000000000000000000000',
                              otp_expiry = DATE_ADD(NOW(), INTERVAL 3 MINUTE),
                              otp_attempts = 0
             WHERE id = ?`,
            [auditUser.id]
        );
        await pool.query(
            `UPDATE devices SET bio_token_hash = '$2b$10$validbiotokenhash00000000000000000000000000000000000'
             WHERE user_id = ? AND device_identifier = ?`,
            [auditUser.id, testDeviceApproved]
        );

        const bioBypassPayload = JSON.stringify({
            email: auditUser.email,
            deviceId: testDeviceApproved,
            bioToken: 'forged_or_missing_bio_secret_token_000000'
        });
        const res = await sendRequest(`${POLICY_BASE}/api/verify-bio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bioBypassPayload)
            },
            body: bioBypassPayload
        });
        const passed = res.statusCode === 401;
        addResult(
            11,
            '생체 인증 API(/api/verify-bio) 직접 호출 우회 시도',
            '401 Unauthorized',
            `${res.statusCode}`,
            passed,
            res.jsonBody?.message || 'bioToken 해시 불일치 차단'
        );
    }

    // 정리: 테스트 중 쌓인 감사 로그/시도 횟수 초기화
    await pool.query('UPDATE users SET otp_attempts = 0 WHERE id = ?', [auditUser.id]);
    await pool.end();

    console.table(results);

    const passCount = results.filter((r) => r['판정'] === 'PASS').length;
    console.log('================================================================================');
    console.log(`[최종 판정] 총 ${results.length}개 공격 시나리오 중 ${passCount}개 방어 성공 (${passCount === results.length ? 'ALL PASS' : '일부 확인 필요'})`);
    console.log('================================================================================');

    if (passCount !== results.length) {
        process.exit(1);
    }
}

runAudit().catch((err) => {
    console.error('[보안 감사 스크립트 오류]:', err);
    process.exit(1);
});
