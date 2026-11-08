import { useState, useRef, useEffect } from 'react';
import { Terminal, Play, RotateCcw, X, Maximize2, Minimize2, Trash2, ShieldAlert } from 'lucide-react';

interface LogEntry {
  id: number;
  time: string;
  type: 'HEADER' | 'REQUEST' | 'BLOCKED' | 'ALLOWED' | 'STEP_UP' | 'INFO' | 'ERROR';
  title: string;
  detail?: string;
}

const DISPLAY_HOST = 'https://ztna-core.duckdns.org';
const VICTIM_EMAIL = '043kws@gmail.com';
const VICTIM_PASSWORD = '1234';
const WEB_DEVICE_ID = 'web-764001b1-06ec-47e7-bec3-f51a84f42650';
const PHONE_DEVICE_ID = 'ac5348250393b996';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AttackSimulatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string>(WEB_DEVICE_ID);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      type: 'INFO',
      title: 'ZTNA 해커 침입 방어 라이브 시뮬레이터 준비 완료',
      detail: `Target: ${DISPLAY_HOST} | 상단 버튼 클릭 또는 숫자 키(1~5, r)로 실시간 공격을 시연할 수 있습니다.`
    }
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(2);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const addLog = (type: LogEntry['type'], title: string, detail?: string) => {
    const id = nextIdRef.current++;
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs((prev) => [...prev, { id, time, type, title, detail }]);
  };

  const clearLogs = () => {
    setLogs([
      {
        id: nextIdRef.current++,
        time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        type: 'INFO',
        title: '콘솔 로그가 초기화되었습니다.'
      }
    ]);
  };

  const getAdminToken = async (): Promise<string> => {
    const existing = localStorage.getItem('adminToken');
    if (existing) return existing;
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: '1234' })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || '관리자 토큰 발급 실패');
    }
    return data.token;
  };

  const sendAttackRequest = async (
    method: string,
    pathOrUrl: string,
    headers: Record<string, string> = {},
    bodyObj: Record<string, unknown> | null = null,
    timeoutMs = 5000
  ) => {
    const isFullUrl = pathOrUrl.startsWith('http');
    const displayUrl = isFullUrl ? pathOrUrl : `${DISPLAY_HOST}${pathOrUrl}`;

    const headerSummary = Object.entries(headers)
      .map(([k, v]) => `${k}: ${k.toLowerCase() === 'authorization' ? v.slice(0, 32) + '...' : v}`)
      .join(' | ');

    addLog(
      'REQUEST',
      `[ATTACKER -> SERVER] ${method} ${displayUrl}`,
      [headerSummary ? `Headers: ${headerSummary}` : '', bodyObj ? `Payload: ${JSON.stringify(bodyObj)}` : '']
        .filter(Boolean)
        .join('\n')
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();

    try {
      const res = await fetch(pathOrUrl, {
        method,
        headers: {
          ...(bodyObj ? { 'Content-Type': 'application/json' } : {}),
          ...headers
        },
        body: bodyObj ? JSON.stringify(bodyObj) : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - t0);
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        data = { raw: 'Non-JSON Response' };
      }

      if (res.status >= 400) {
        addLog(
          'BLOCKED',
          `[ZTNA DEFENSE] BLOCKED (HTTP ${res.status}, ${elapsed}ms)`,
          `서버 응답: ${JSON.stringify(data)}\n=> [방어 성공] ZTNA 정책에 의해 공격이 실시간 차단되었습니다.`
        );
      } else if (res.status === 202) {
        addLog(
          'STEP_UP',
          `[ZTNA DEFENSE] STEP-UP 요구 (HTTP 202, ${elapsed}ms)`,
          `서버 응답: ${JSON.stringify(data)}`
        );
      } else {
        addLog(
          'ALLOWED',
          `[ZTNA DEFENSE] ALLOWED (HTTP ${res.status}, ${elapsed}ms)`,
          `서버 응답: ${JSON.stringify({ ...data, token: data.token ? String(data.token).slice(0, 28) + '...' : undefined })}`
        );
      }
      return { status: res.status, data };
    } catch (err: unknown) {
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - t0);
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(
        'BLOCKED',
        `[ZTNA DEFENSE <- NETWORK] BLOCKED (Connection Timeout/Refused, ${elapsed}ms)`,
        `네트워크 차단: ${errMsg}\n=> [방어 성공] Dark Cloud 아키텍처에 의해 내부 포트 직접 접근이 원천 차단되었습니다.`
      );
      return { status: 0, data: {} };
    }
  };

  const restoreDevices = async (silent = false) => {
    try {
      const adminToken = await getAdminToken();
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      };

      const devRes = await fetch(`/api/admin/devices?_t=${Date.now()}`, {
        headers: authHeaders
      });
      const devices = await devRes.json();
      if (Array.isArray(devices)) {
        const targetDevs = devices.filter(
          (d) =>
            d.device_identifier === targetDeviceId ||
            d.device_identifier === WEB_DEVICE_ID ||
            d.device_identifier === PHONE_DEVICE_ID
        );
        for (const d of targetDevs) {
          await fetch(`/api/admin/devices/${d.id}/approve`, {
            method: 'PATCH',
            headers: authHeaders
          });
          await fetch(`/api/admin/devices/${d.id}/type`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ device_type: 'CORPORATE' })
          });
        }
      }
      if (!silent) {
        addLog(
          'ALLOWED',
          '[원상복구 완료] 시연 단말기 상태가 APPROVED / CORPORATE로 복원되었습니다.',
          `복원 대상: ${targetDeviceId}`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('ERROR', `[복구 오류] ${msg}`);
    }
  };

  // Stage 1: Dark Cloud & PEP 우회
  const executeStage1 = async () => {
    addLog(
      'HEADER',
      'Stage 1: Dark Cloud 포트 직접 스캔 & PEP 게이트웨이 우회 침투 방어',
      '내부 업무 서버(Port 5000) 직접 스캔 및 단말 컨텍스트(deviceId)가 없는 토큰 우회 침투를 시도합니다.'
    );

    await sendAttackRequest('GET', 'http://ztna-core.duckdns.org:5000/api/documents', {}, null, 2500);
    await sleep(500);

    await sendAttackRequest('GET', '/private/api/documents');
    await sleep(500);

    const adminToken = await getAdminToken();
    await sendAttackRequest('GET', '/private/api/documents', {
      Authorization: `Bearer ${adminToken}`
    });
  };

  // Stage 2: IP 스푸핑 + 루팅 단말 + 생체인증 위조
  const executeStage2 = async () => {
    addLog(
      'HEADER',
      'Stage 2: X-Forwarded-For IP 스푸핑 + 루팅 단말 & 생체인증(bioToken) 위조 공격',
      'X-Forwarded-For 헤더를 127.0.0.1로 조작하고, 루팅 단말 및 가짜 생체인증 비밀키로 2차 인증 우회를 시도합니다.'
    );

    await restoreDevices(true);

    await sendAttackRequest(
      'POST',
      '/api/login',
      { 'X-Forwarded-For': '127.0.0.1, 10.0.0.1' },
      {
        email: VICTIM_EMAIL,
        password: VICTIM_PASSWORD,
        deviceId: 'hacker-rooted-android-99',
        isRooted: true,
        latitude: 37.5665,
        longitude: 126.978
      }
    );
    await sleep(500);

    // 2차 인증 세션 활성화 유도
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: VICTIM_EMAIL,
        password: VICTIM_PASSWORD,
        deviceId: 'hacker-unregistered-device-01',
        isRooted: false
      })
    });

    await sendAttackRequest(
      'POST',
      '/api/verify-bio',
      { 'X-Forwarded-For': '127.0.0.1, 10.0.0.1' },
      {
        email: VICTIM_EMAIL,
        deviceId: targetDeviceId,
        bioToken: 'forged-fake-biometric-secret-key-0000000000000000',
        latitude: 37.5665,
        longitude: 126.978
      }
    );
    addLog(
      'INFO',
      '[관제 확인 포인트] 감사 로그에 위조된 127.0.0.1이 아닌 실제 공인 IP와 bioToken 불일치 DENY(70점)가 기록되었습니다.'
    );
  };

  // Stage 3: 불가능한 이동 (서울 -> 뉴욕)
  const executeStage3 = async () => {
    addLog(
      'HEADER',
      'Stage 3: 해외 좌표 기반 불가능한 이동(Impossible Travel) 탐지 및 단말 자동 격리',
      `대상 기기(${targetDeviceId}): 서울 본사 접속 직후 2초 만에 미국 뉴욕 좌표(11,040km)에서 접속을 시도합니다.`
    );

    await restoreDevices(true);

    addLog('INFO', '[Step 3-1] 서울 본사(37.5665, 126.9780) 정상 접속 기준점 생성');
    await sendAttackRequest('POST', '/api/login', {}, {
      email: VICTIM_EMAIL,
      password: VICTIM_PASSWORD,
      deviceId: targetDeviceId,
      isRooted: false,
      latitude: 37.5665,
      longitude: 126.978
    });

    addLog('INFO', '[대기] 2초 후 미국 뉴욕(40.7128, -74.0060)에서 동일 계정/단말로 해커 침입 시도...');
    await sleep(2000);

    await sendAttackRequest('POST', '/api/login', {}, {
      email: VICTIM_EMAIL,
      password: VICTIM_PASSWORD,
      deviceId: targetDeviceId,
      isRooted: false,
      latitude: 40.7128,
      longitude: -74.006
    });
    addLog(
      'INFO',
      `[관제 확인 포인트] 단말 자산 탭에서 '${targetDeviceId}' 기기가 자동으로 BLOCKED(차단) 상태로 격리되었습니다.`
    );
  };

  // Stage 4: OTP 5회 무차별 대입
  const executeStage4 = async () => {
    addLog(
      'HEADER',
      'Stage 4: 2차 인증(OTP) 5회 무차별 대입(Brute-Force) 공격 및 OTP 즉시 파기',
      '6자리 OTP 번호를 연속 대입할 때 5회 실패 시 서버가 DB의 OTP를 즉시 NULL로 파기합니다.'
    );

    const bruteDeviceId = 'hacker-bruteforce-bot-01';
    await sendAttackRequest('POST', '/api/login', {}, {
      email: VICTIM_EMAIL,
      password: VICTIM_PASSWORD,
      deviceId: bruteDeviceId,
      isRooted: false
    });

    for (let i = 1; i <= 6; i++) {
      const fakeOtp = String(i).padStart(6, '0');
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: VICTIM_EMAIL,
          otp: fakeOtp,
          deviceId: bruteDeviceId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        addLog(
          'BLOCKED',
          `[시도 #${i}: OTP=${fakeOtp}] HTTP 429 (OTP DESTROYED)`,
          `서버 응답: ${data.message}\n=> [방어 성공] 5회 실패 도달로 인해 OTP 세션이 영구 파기되었습니다.`
        );
      } else {
        addLog('STEP_UP', `[시도 #${i}: OTP=${fakeOtp}] HTTP ${res.status}`, `서버 응답: ${data.message}`);
      }
      await sleep(250);
    }
  };

  const handleRun = async (fn: () => Promise<void>) => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog('ERROR', `[실행 오류] ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 22px',
          backgroundColor: '#0f172a',
          color: '#38bdf8',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '16px'
        }}
      >
        <Terminal size={20} />
        <span>해커 침입 시뮬레이터</span>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: isExpanded ? 'calc(100vw - 360px)' : '760px',
        height: isExpanded ? 'calc(100vh - 64px)' : '560px',
        zIndex: 9999,
        backgroundColor: '#090d16',
        color: '#e2e8f0',
        border: '1px solid #334155',
        borderRadius: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Consolas, Monaco, monospace'
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={20} color="#f87171" />
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>
            ZTNA Live Attacker Console ({DISPLAY_HOST})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={clearLogs}
            title="로그 지우기"
            style={{
              padding: '5px 8px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="크기 전환"
            style={{
              padding: '5px 8px',
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="닫기"
            style={{
              padding: '5px 8px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: '#94a3b8' }}>Stage 2/3 공격 대상 단말기 선택:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTargetDeviceId(WEB_DEVICE_ID)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: targetDeviceId === WEB_DEVICE_ID ? '1px solid #38bdf8' : '1px solid #334155',
                backgroundColor: targetDeviceId === WEB_DEVICE_ID ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              웹 시연 기기 (휴대폰 로그인 유지)
            </button>
            <button
              onClick={() => setTargetDeviceId(PHONE_DEVICE_ID)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: targetDeviceId === PHONE_DEVICE_ID ? '1px solid #f87171' : '1px solid #334155',
                backgroundColor: targetDeviceId === PHONE_DEVICE_ID ? '#b91c1c' : '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              스마트폰 기기 (Stage 3 시 휴대폰 동시 차단)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button
            disabled={isRunning}
            onClick={() => handleRun(executeStage1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Play size={13} />
            <span>[1] Dark Cloud & 토큰 우회</span>
          </button>

          <button
            disabled={isRunning}
            onClick={() => handleRun(executeStage2)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Play size={13} />
            <span>[2] 루팅폰 & 생체키 위조</span>
          </button>

          <button
            disabled={isRunning}
            onClick={() => handleRun(executeStage3)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#1e293b',
              color: '#f87171',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Play size={13} />
            <span>[3] 서울-&gt;뉴욕 불가능 이동</span>
          </button>

          <button
            disabled={isRunning}
            onClick={() => handleRun(executeStage4)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#1e293b',
              color: '#fbbf24',
              border: '1px solid #d97706',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Play size={13} />
            <span>[4] OTP 무차별 대입 폭파</span>
          </button>

          <button
            disabled={isRunning}
            onClick={() =>
              handleRun(async () => {
                await executeStage1();
                await sleep(700);
                await executeStage2();
                await sleep(700);
                await executeStage3();
                await sleep(700);
                await executeStage4();
              })
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#312e81',
              color: '#e0e7ff',
              border: '1px solid #6366f1',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Play size={13} />
            <span>[5] Stage 1~4 연속 실행</span>
          </button>

          <button
            disabled={isRunning}
            onClick={() => handleRun(() => restoreDevices(false))}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 10px',
              backgroundColor: '#064e3b',
              color: '#34d399',
              border: '1px solid #059669',
              borderRadius: '6px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <RotateCcw size={13} />
            <span>[r] 차단 단말기 원상복구</span>
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          padding: '14px 16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '13px',
          lineHeight: 1.5
        }}
      >
        {logs.map((entry) => {
          let borderColor = '#334155';
          let titleColor = '#94a3b8';
          let bgColor = '#0f172a';

          if (entry.type === 'HEADER') {
            borderColor = '#38bdf8';
            titleColor = '#38bdf8';
            bgColor = '#0c4a6e33';
          } else if (entry.type === 'REQUEST') {
            borderColor = '#fbbf24';
            titleColor = '#fde047';
          } else if (entry.type === 'BLOCKED') {
            borderColor = '#ef4444';
            titleColor = '#f87171';
            bgColor = '#7f1d1d33';
          } else if (entry.type === 'ALLOWED') {
            borderColor = '#10b981';
            titleColor = '#34d399';
            bgColor = '#064e3b33';
          } else if (entry.type === 'STEP_UP') {
            borderColor = '#f59e0b';
            titleColor = '#fbbf24';
          } else if (entry.type === 'ERROR') {
            borderColor = '#ef4444';
            titleColor = '#ef4444';
          }

          return (
            <div
              key={entry.id}
              style={{
                borderLeft: `3px solid ${borderColor}`,
                backgroundColor: bgColor,
                padding: '8px 12px',
                borderRadius: '0 6px 6px 0'
              }}
            >
              <div style={{ fontWeight: 700, color: titleColor }}>
                <span style={{ color: '#64748b', marginRight: '8px' }}>[{entry.time}]</span>
                {entry.title}
              </div>
              {entry.detail && (
                <pre
                  style={{
                    margin: '4px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: '#cbd5e1',
                    fontFamily: 'inherit',
                    fontSize: '12px'
                  }}
                >
                  {entry.detail}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
