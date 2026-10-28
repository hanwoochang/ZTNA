require('dotenv').config();
const http = require('http');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('./config/db');

const TARGET_BASE = 'http://127.0.0.1:5000';
const GATEWAY_BASE = 'http://127.0.0.1:4000';
const POLICY_BASE = 'http://127.0.0.1:3000';

const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });

function requestOnce(urlStr, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const startNs = process.hrtime.bigint();
        const reqOpts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'x-ztna-benchmark': 'true',
                ...(options.headers || {})
            },
            agent: keepAliveAgent
        };

        const req = http.request(reqOpts, (res) => {
            let bodyBytes = 0;
            res.on('data', (chunk) => { bodyBytes += chunk.length; });
            res.on('end', () => {
                const endNs = process.hrtime.bigint();
                const durationMs = Number(endNs - startNs) / 1e6;
                resolve({
                    statusCode: res.statusCode,
                    durationMs,
                    serverTiming: parseServerTiming(res.headers['server-timing']),
                    rawServerTiming: res.headers['server-timing'] || '',
                    bodyBytes
                });
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

function parseServerTiming(headerValue) {
    if (!headerValue) return {};
    const result = {};
    const parts = String(headerValue).split(',');
    for (const part of parts) {
        const segments = part.trim().split(';');
        const name = segments[0]?.trim();
        for (const seg of segments.slice(1)) {
            const [k, v] = seg.trim().split('=');
            if (k === 'dur' && v !== undefined) {
                result[name] = parseFloat(v);
            }
        }
    }
    return result;
}

function calcStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) return { avg: 0, min: 0, p50: 0, p95: 0, p99: 0, max: 0 };
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const pick = (p) => sorted[Math.min(n - 1, Math.floor(n * p))];
    return {
        avg: sum / n,
        min: sorted[0],
        p50: pick(0.50),
        p95: pick(0.95),
        p99: pick(0.99),
        max: sorted[n - 1]
    };
}

function fmt(num, digits = 2) {
    return Number(num).toFixed(digits);
}

async function runConcurrentBatch(totalRequests, concurrency, fn) {
    const durations = [];
    let nextIndex = 0;
    const startNs = process.hrtime.bigint();

    async function worker() {
        while (true) {
            const idx = nextIndex++;
            if (idx >= totalRequests) break;
            const res = await fn(idx);
            durations.push(res.durationMs);
        }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    const totalSec = Number(process.hrtime.bigint() - startNs) / 1e9;
    const rps = totalRequests / totalSec;
    return { stats: calcStats(durations), rps, totalSec };
}

async function prepareTestActor() {
    const [rows] = await pool.query(`
        SELECT u.id AS userId, u.email, u.role, u.department, u.position_level, d.device_identifier AS deviceId, d.device_type
        FROM users u
        JOIN devices d ON u.id = d.user_id
        WHERE u.is_active = 1 AND d.status = 'APPROVED'
        LIMIT 1
    `);

    if (!rows[0]) {
        throw new Error('벤치마크용 활성 사용자(is_active=1) 및 승인된 기기(status=APPROVED)를 DB에서 찾을 수 없습니다.');
    }

    const actor = rows[0];
    const tokenFresh = jwt.sign(
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
        { expiresIn: '15m' }
    );

    const tokenExpiringSoon = jwt.sign(
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
        { expiresIn: '3m' }
    );

    return { actor, tokenFresh, tokenExpiringSoon };
}

async function main() {
    console.log('================================================================================');
    console.log('                 ZTNA 아키텍처 보안 오버헤드 종합 벤치마크 (1~4)                 ');
    console.log('================================================================================');

    const { actor, tokenFresh, tokenExpiringSoon } = await prepareTestActor();
    console.log(`[테스트 컨텍스트] 계정: ${actor.email} (Role: ${actor.role}, Lv: ${actor.position_level}) | 기기: ${actor.deviceId}`);
    console.log('[안내] x-ztna-benchmark 헤더가 적용되어 DB 감사 로그(intranet_access_logs)를 오염시키지 않습니다.\n');

    // Warm-up
    for (let i = 0; i < 10; i++) {
        await requestOnce(`${TARGET_BASE}/`);
        await requestOnce(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${tokenFresh}` }
        });
    }

    // =========================================================================
    // [1] A/B 경로 비교 실험 (Direct Target vs ZTNA Gateway PEP)
    // =========================================================================
    const ITERATIONS = 100;
    const directRootTimes = [];
    const gatewayRootTimes = [];
    const gatewayTimingsList = [];
    const directNoticesTimes = [];
    const gatewayNoticesTimes = [];

    for (let i = 0; i < ITERATIONS; i++) {
        const dRoot = await requestOnce(`${TARGET_BASE}/`);
        directRootTimes.push(dRoot.durationMs);

        const gRoot = await requestOnce(`${GATEWAY_BASE}/private/`, {
            headers: { Authorization: `Bearer ${tokenFresh}` }
        });
        gatewayRootTimes.push(gRoot.durationMs);
        if (gRoot.serverTiming && Object.keys(gRoot.serverTiming).length > 0) {
            gatewayTimingsList.push(gRoot.serverTiming);
        }

        const dNotice = await requestOnce(`${TARGET_BASE}/api/notices`, {
            headers: {
                'x-user-id': String(actor.userId),
                'x-user-email': actor.email,
                'x-user-role': actor.role || 'USER',
                'x-user-department': encodeURIComponent(actor.department || 'ALL'),
                'x-user-position-level': String(actor.position_level || 1)
            }
        });
        directNoticesTimes.push(dNotice.durationMs);

        const gNotice = await requestOnce(`${GATEWAY_BASE}/private/api/notices`, {
            headers: { Authorization: `Bearer ${tokenFresh}` }
        });
        gatewayNoticesTimes.push(gNotice.durationMs);
    }

    const sDirectRoot = calcStats(directRootTimes);
    const sGatewayRoot = calcStats(gatewayRootTimes);
    const sDirectNotice = calcStats(directNoticesTimes);
    const sGatewayNotice = calcStats(gatewayNoticesTimes);

    console.log('--------------------------------------------------------------------------------');
    console.log(`[1번 실험] A/B 경로 응답 지연시간 비교 (반복 횟수: 각 ${ITERATIONS}회)`);
    console.log('--------------------------------------------------------------------------------');
    console.table([
        {
            '비교 구간': '경량 API (GET /) - Direct (No ZTNA)',
            'Avg (ms)': fmt(sDirectRoot.avg),
            'p50 (ms)': fmt(sDirectRoot.p50),
            'p95 (ms)': fmt(sDirectRoot.p95),
            'p99 (ms)': fmt(sDirectRoot.p99),
            'ZTNA 오버헤드': 'Baseline'
        },
        {
            '비교 구간': '경량 API (GET /private/) - ZTNA Gateway',
            'Avg (ms)': fmt(sGatewayRoot.avg),
            'p50 (ms)': fmt(sGatewayRoot.p50),
            'p95 (ms)': fmt(sGatewayRoot.p95),
            'p99 (ms)': fmt(sGatewayRoot.p99),
            'ZTNA 오버헤드': `+${fmt(sGatewayRoot.avg - sDirectRoot.avg)} ms`
        },
        {
            '비교 구간': '사내 공지 조회 (GET /api/notices) - Direct',
            'Avg (ms)': fmt(sDirectNotice.avg),
            'p50 (ms)': fmt(sDirectNotice.p50),
            'p95 (ms)': fmt(sDirectNotice.p95),
            'p99 (ms)': fmt(sDirectNotice.p99),
            'ZTNA 오버헤드': 'Baseline'
        },
        {
            '비교 구간': '사내 공지 조회 (GET /private/api/notices) - ZTNA',
            'Avg (ms)': fmt(sGatewayNotice.avg),
            'p50 (ms)': fmt(sGatewayNotice.p50),
            'p95 (ms)': fmt(sGatewayNotice.p95),
            'p99 (ms)': fmt(sGatewayNotice.p99),
            'ZTNA 오버헤드': `+${fmt(sGatewayNotice.avg - sDirectNotice.avg)} ms`
        }
    ]);

    // =========================================================================
    // [2] 동시 접속 부하 테스트 (Concurrency = 1, 10, 50)
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('[2번 실험] 동시 접속(Concurrency) 부하 테스트 — 처리량(RPS) 및 지연시간 비교');
    console.log('--------------------------------------------------------------------------------');
    const concurrencies = [1, 10, 50];
    const loadRows = [];

    for (const c of concurrencies) {
        const totalReqs = c === 1 ? 100 : 300;
        const directRes = await runConcurrentBatch(totalReqs, c, () => requestOnce(`${TARGET_BASE}/`));
        const ztnaRes = await runConcurrentBatch(totalReqs, c, () =>
            requestOnce(`${GATEWAY_BASE}/private/`, {
                headers: { Authorization: `Bearer ${tokenFresh}` }
            })
        );

        loadRows.push({
            '동시 접속(c)': `c = ${c}`,
            '경로': 'Direct (타겟 직접)',
            '처리량 (Req/sec)': fmt(directRes.rps, 1),
            'Avg (ms)': fmt(directRes.stats.avg),
            'p95 (ms)': fmt(directRes.stats.p95),
            'p99 (ms)': fmt(directRes.stats.p99)
        });
        loadRows.push({
            '동시 접속(c)': `c = ${c}`,
            '경로': 'ZTNA Gateway 경유',
            '처리량 (Req/sec)': fmt(ztnaRes.rps, 1),
            'Avg (ms)': fmt(ztnaRes.stats.avg),
            'p95 (ms)': fmt(ztnaRes.stats.p95),
            'p99 (ms)': fmt(ztnaRes.stats.p99)
        });
    }
    console.table(loadRows);

    // =========================================================================
    // [3] Server-Timing 기반 구간별 마이크로 타이밍 분석 & 쿼리 통합 효과 비교
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('[3번 실험] ZTNA Gateway (PEP) 내부 구간별 마이크로 타이밍 (Server-Timing 헤더 분석)');
    console.log('--------------------------------------------------------------------------------');

    const avgTiming = (key) => {
        const vals = gatewayTimingsList.map((t) => t[key]).filter((v) => typeof v === 'number');
        return calcStats(vals);
    };

    const tJwt = avgTiming('jwt');
    const tBlacklist = avgTiming('db-blacklist');
    const tDevice = avgTiming('db-device');
    const tUser = avgTiming('db-user');
    const tPep = avgTiming('ztna-pep');
    const tUpstream = avgTiming('target-upstream');
    const totalMeasured = tPep.avg + tUpstream.avg;

    console.table([
        {
            '세부 단계 (Server-Timing)': '1. JWT 서명 검증 (jwt)',
            'Avg (ms)': fmt(tJwt.avg, 3),
            'p95 (ms)': fmt(tJwt.p95, 3),
            'PEP 내 비중 (%)': `${fmt((tJwt.avg / (tPep.avg || 1)) * 100, 1)}%`
        },
        {
            '세부 단계 (Server-Timing)': '2. DB 블랙리스트 조회 (db-blacklist)',
            'Avg (ms)': fmt(tBlacklist.avg, 3),
            'p95 (ms)': fmt(tBlacklist.p95, 3),
            'PEP 내 비중 (%)': `${fmt((tBlacklist.avg / (tPep.avg || 1)) * 100, 1)}%`
        },
        {
            '세부 단계 (Server-Timing)': '3. DB 기기 신뢰 상태 조회 (db-device)',
            'Avg (ms)': fmt(tDevice.avg, 3),
            'p95 (ms)': fmt(tDevice.p95, 3),
            'PEP 내 비중 (%)': `${fmt((tDevice.avg / (tPep.avg || 1)) * 100, 1)}%`
        },
        {
            '세부 단계 (Server-Timing)': '4. DB 계정/권한 동기화 (db-user)',
            'Avg (ms)': fmt(tUser.avg, 3),
            'p95 (ms)': fmt(tUser.p95, 3),
            'PEP 내 비중 (%)': `${fmt((tUser.avg / (tPep.avg || 1)) * 100, 1)}%`
        },
        {
            '세부 단계 (Server-Timing)': '[합계] ZTNA PEP 보안 검증 총합 (ztna-pep)',
            'Avg (ms)': fmt(tPep.avg, 3),
            'p95 (ms)': fmt(tPep.p95, 3),
            'PEP 내 비중 (%)': '100.0%'
        },
        {
            '세부 단계 (Server-Timing)': '5. 타겟 서버 프록시 왕복 (target-upstream)',
            'Avg (ms)': fmt(tUpstream.avg, 3),
            'p95 (ms)': fmt(tUpstream.p95, 3),
            'PEP 내 비중 (%)': `(전체 대비 ${fmt((tUpstream.avg / (totalMeasured || 1)) * 100, 1)}%)`
        }
    ]);

    // 추가 실험: DB 순차 쿼리 3회 vs 단일 JOIN 쿼리 1회 비교
    const decodedSample = jwt.verify(tokenFresh, process.env.JWT_SECRET);
    const seqDbTimes = [];
    const joinDbTimes = [];

    for (let i = 0; i < ITERATIONS; i++) {
        const s0 = process.hrtime.bigint();
        await pool.query('SELECT id FROM token_blacklist WHERE jti = ?', [decodedSample.jti]);
        await pool.query('SELECT status, device_type FROM devices WHERE user_id = ? AND device_identifier = ?', [actor.userId, actor.deviceId]);
        await pool.query('SELECT role, department, position_level, is_active FROM users WHERE id = ?', [actor.userId]);
        seqDbTimes.push(Number(process.hrtime.bigint() - s0) / 1e6);

        const j0 = process.hrtime.bigint();
        await pool.query(
            `SELECT u.role, u.department, u.position_level, u.is_active,
                    d.status AS device_status, d.device_type,
                    tb.id AS blacklisted_id
             FROM users u
             LEFT JOIN devices d ON d.user_id = u.id AND d.device_identifier = ?
             LEFT JOIN token_blacklist tb ON tb.jti = ?
             WHERE u.id = ?`,
            [actor.deviceId, decodedSample.jti, actor.userId]
        );
        joinDbTimes.push(Number(process.hrtime.bigint() - j0) / 1e6);
    }

    const sSeqDb = calcStats(seqDbTimes);
    const sJoinDb = calcStats(joinDbTimes);
    const dbSavedPct = ((sSeqDb.avg - sJoinDb.avg) / sSeqDb.avg) * 100;

    console.log('\n[3-추가 분석] DB 검증 쿼리 구조 비교 (순차 3회 쿼리 vs 단일 LEFT JOIN 1회 쿼리)');
    console.table([
        {
            'DB 조회 방식': '현재 방식 (순차 쿼리 3회: blacklist -> devices -> users)',
            'Avg (ms)': fmt(sSeqDb.avg, 3),
            'p50 (ms)': fmt(sSeqDb.p50, 3),
            'p95 (ms)': fmt(sSeqDb.p95, 3),
            '비고': 'DB 네트워크 왕복 3회'
        },
        {
            'DB 조회 방식': '통합 방식 (단일 LEFT JOIN 쿼리 1회)',
            'Avg (ms)': fmt(sJoinDb.avg, 3),
            'p50 (ms)': fmt(sJoinDb.p50, 3),
            'p95 (ms)': fmt(sJoinDb.p95, 3),
            '비고': `DB 오버헤드 ${fmt(dbSavedPct, 1)}% 감소 (왕복 1회)`
        }
    ]);

    // =========================================================================
    // [4] 지속적 신뢰 검증 (Heartbeat: POST /api/verify-context) 및 리소스 오버헤드
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('[4번 실험] Policy Server 지속적 신뢰 검증 (Heartbeat: POST /api/verify-context)');
    console.log('--------------------------------------------------------------------------------');

    const hbSkipReissueTimes = [];
    const hbForceReissueTimes = [];
    let hbPayloadBytes = 0;
    const reqBody = JSON.stringify({ deviceId: actor.deviceId });

    for (let i = 0; i < ITERATIONS; i++) {
        const resSkip = await requestOnce(`${POLICY_BASE}/api/verify-context`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenFresh}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(reqBody)
            },
            body: reqBody
        });
        hbSkipReissueTimes.push(resSkip.durationMs);
        hbPayloadBytes = resSkip.bodyBytes + Buffer.byteLength(reqBody);

        const resReissue = await requestOnce(`${POLICY_BASE}/api/verify-context`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenExpiringSoon}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(reqBody)
            },
            body: reqBody
        });
        hbForceReissueTimes.push(resReissue.durationMs);
    }

    const sHbSkip = calcStats(hbSkipReissueTimes);
    const sHbReissue = calcStats(hbForceReissueTimes);

    console.table([
        {
            'Heartbeat 시나리오': '일반 주기 (만료 5분 이상 남음 -> 기존 토큰 유지)',
            'Avg (ms)': fmt(sHbSkip.avg),
            'p50 (ms)': fmt(sHbSkip.p50),
            'p95 (ms)': fmt(sHbSkip.p95),
            '1회 왕복 데이터량': `약 ${hbPayloadBytes} Bytes`,
            '분당 대역폭 (1인당)': `약 ${ fmt((hbPayloadBytes * 1) / 1024, 2) } KB/min`
        },
        {
            'Heartbeat 시나리오': '갱신 주기 (만료 5분 이하 임박 -> 신규 JWT 서명/발급)',
            'Avg (ms)': fmt(sHbReissue.avg),
            'p50 (ms)': fmt(sHbReissue.p50),
            'p95 (ms)': fmt(sHbReissue.p95),
            '1회 왕복 데이터량': `약 ${hbPayloadBytes} Bytes`,
            '분당 대역폭 (1인당)': `약 ${ fmt((hbPayloadBytes * 1) / 1024, 2) } KB/min`
        }
    ]);

    await pool.end();
    keepAliveAgent.destroy();
    console.log('================================================================================');
    console.log('벤치마크 완료! 브라우저에서는 F12 -> Network -> API 클릭 -> Timing 탭에서');
    console.log('Server-Timing 그래프 막대로 실시간 ZTNA 구간별 소요 시간을 확인하실 수 있습니다.');
    console.log('================================================================================');
}

main().catch((err) => {
    console.error('[벤치마크 오류]:', err.message);
    process.exit(1);
});
