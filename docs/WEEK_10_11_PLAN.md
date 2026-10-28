# 10주차 ~ 11주차 보안 고도화·성능 최적화·취약점 검증 종합 계획서

본 문서는 10주차 ~ 11주차에 진행할 **1) 생체 인증 기기 전용 비밀키(`bioToken`) 고도화**, **2) 오버헤드 벤치마크 기반 DB 쿼리 단일화(`LEFT JOIN`) 최적화**, **3) ZTNA 모의 해킹 및 취약점 자동 검증**, **4) 최종 Android APK 통합 빌드** 계획을 정리한 문서입니다.

---

## Part 1. 생체 인증 기기 전용 비밀키(`bioToken`) 검증 고도화 (보안 강화)

### 1. 배경 및 목표
*   **배경:** 현재 모바일 앱의 생체 인증(`expo-local-authentication`)은 단말기 OS 내부에서 지문/FaceID 일치 여부만 확인한 뒤 서버의 `POST /api/verify-bio`로 `{ email, deviceId }`를 전송합니다. 만약 공격자가 사용자의 계정 비밀번호와 승인된 `deviceId`를 모두 탈취한 상태라면, 1차 로그인(`POST /api/login`) 직후 클라이언트 앱을 거치지 않고 `/api/verify-bio`를 직접 호출하여 이메일 OTP를 우회할 이론적 가능성이 존재합니다.
*   **목표:** 금융권 모바일 앱과 동일하게 **최초 1회 이메일 OTP 인증 통과 시 기기 전용 암호화 비밀키(`bioToken`)를 발급하여 모바일 하드웨어 보안 영역(`SecureStore`)에 저장**하고, 이후 생체 인증 시 이 `bioToken`을 서버에서 검증하도록 고도화합니다.
*   **사용자 경험(UX) 영향:** 사용자가 누르는 버튼이나 화면 흐름은 기존과 100% 동일하게 유지됩니다.

### 2. 세부 구현 단계
1.  **데이터베이스(`devices` 테이블) 컬럼 추가 (`ztna-policy-server/scripts/migrate_db.js` 및 EC2 MySQL):**
    ```sql
    ALTER TABLE devices ADD COLUMN bio_token_hash VARCHAR(255) DEFAULT NULL;
    ```
2.  **정책 서버(`ztna-policy-server/controllers/authController.js`) 수정:**
    *   `exports.verifyOtp` (이메일 OTP 통과 시 `bioToken` 발급):
        *   `crypto.randomBytes(32).toString('hex')`로 64자리 난수 `bioToken` 생성 후 `bcrypt.hash(bioToken, 10)` 해시값을 `devices.bio_token_hash`에 저장.
        *   응답 JSON에 `bioToken`을 포함하여 클라이언트로 1회 전달.
    *   `exports.verifyBio` (생체 인증 시 `bioToken` 검증):
        *   요청 바디에서 `{ email, deviceId, bioToken, latitude, longitude }` 수신.
        *   `!bioToken`이거나 `devices[0].bio_token_hash`가 없거나 `!(await bcrypt.compare(bioToken, devices[0].bio_token_hash))`인 경우 `users.otp_attempts`를 1 증가시키고 `401 Unauthorized` 반환.
    *   기기 차단(`revoke`) 시 `bio_token_hash` 초기화 (`ztna-policy-server/routes/admin.js`):
        *   관리자가 기기를 차단(`BLOCKED`)할 때 `bio_token_hash = NULL`로 함께 초기화하여 재승인 시 새로운 OTP 인증을 거치도록 강제.
3.  **모바일 클라이언트(`ztna-client/hooks/useAuth.ts`) 수정:**
    *   OTP 인증 성공 시(`handleVerifyOtp`): 응답의 `bioToken`을 `await Storage.setItemAsync('bio_token', verifyResponse.data.bioToken)`으로 `SecureStore`에 저장.
    *   생체 인증 시도 시(`handleLogin` 내 `authMethod === 'bio'`): `SecureStore`에서 `bio_token`을 조회하여 없으면 이메일 OTP 화면으로 안내하고, 있으면 지문/FaceID 인식 성공 후 `POST /api/verify-bio`에 `bioToken`을 함께 전송.

---

## Part 2. 오버헤드 측정 결과 기반 DB 검증 쿼리 단일화 (`LEFT JOIN` 성능 최적화)

### 1. 배경 및 문제점 (`docs/OVERHEAD_BENCHMARK_REPORT.md` 연계)
*   **문제점:** 오버헤드 벤치마크 3번 실험 결과, 게이트웨이(`ztna-gateway/server.js`)의 `verifyToken`과 정책 서버(`ztna-policy-server/controllers/authController.js`)의 `verifyContext`는 **API 요청 1건당 MySQL 쿼리를 3번 연속(`token_blacklist` -> `devices` -> `users`) 실행**하고 있습니다.
*   이로 인해 전체 보안 검증 시간(`2.656 ms`)의 **`61.8%`(`1.643 ms`)가 DB 순차 왕복 비용**으로 소모되며, 동시 접속자 50명(`c = 50`) 발생 시 요청은 50건이지만 DB에는 3배인 150건의 쿼리가 몰려 초당 처리량(`RPS`)을 제한하는 병목이 됩니다.
*   **사전 시뮬레이션 결과:** 3회 순차 쿼리(`1.386 ms`)를 단일 `LEFT JOIN` 1회 쿼리(`0.572 ms`)로 통합 시 **DB 검증 오버헤드가 `58.7%` 감소(`p95` 기준 `2.461 ms -> 0.808 ms`로 `67.2%` 감소)**함이 실측으로 입증되었습니다.

### 2. 세부 구현 단계
1.  **ZTNA 게이트웨이(`ztna-gateway/server.js` - `verifyToken`) 쿼리 통합:**
    *   기존 3개의 `await pool.query(...)`를 아래 단일 `LEFT JOIN` 쿼리 1회로 통합:
        ```sql
        SELECT u.role, u.department, u.position_level, u.is_active,
               d.status AS device_status, d.device_type,
               tb.id AS blacklisted_id
        FROM users u
        LEFT JOIN devices d ON d.user_id = u.id AND d.device_identifier = ?
        LEFT JOIN token_blacklist tb ON tb.jti = ?
        WHERE u.id = ?
        ```
    *   기존의 보안 검증 순서 및 응답 코드(1: `blacklisted_id` 존재 시 `401` 차단 -> 2: `!decoded.deviceId` 시 `403` 차단 -> 3: `device_status !== 'APPROVED'` 시 `401 revoked: true` 차단 -> 4: `!is_active` 시 `401 revoked: true` 차단 -> 5: `BYOD`/`CORPORATE` 및 직급/부서 동기화)는 **100% 동일하게 유지**.
    *   `Server-Timing` 헤더도 통합 쿼리 소요 시간(`db-verify`)을 기록하도록 업데이트.
2.  **정책 서버(`ztna-policy-server/controllers/authController.js` - `verifyContext`) 쿼리 통합:**
    *   Heartbeat 검증 시에도 동일하게 `users`, `devices`, `token_blacklist` 3개 테이블 조회를 단일 `LEFT JOIN` 쿼리 1회로 통합.
3.  **최적화 전(Before) vs 최적화 후(After) 벤치마크 재측정 및 보고서 반영:**
    *   `ztna-gateway/benchmark-overhead.js`를 재실행하여 단일 쿼리 적용 후의 전체 응답 속도(`Avg`, `p95`) 단축률 및 동시 접속 처리량(`RPS`) 상승 폭을 측정하고 `docs/OVERHEAD_BENCHMARK_REPORT.md`에 Before/After 비교 표로 추가.

---

## Part 3. ZTNA 보안 취약점 및 모의 해킹 자동 검증 체계 구축

### 1. ZTNA 모의 해킹(공격 방어) 자동 검증 스크립트 구현 (`ztna-gateway/security-audit-test.js`)
명령어 한 줄로 실제 공격 패킷을 전송하여 ZTNA 보안 계층이 모든 공격을 정상 차단(`PASS`)하는지 자동 검증하고 결과 표(`[공격 시나리오 / 기대 방어 코드 / 실제 응답 코드 / 판정(PASS/FAIL)]`)를 출력하는 스크립트를 작성합니다.

*   **자동 검증 대상 11대 공격 시나리오:**
    1.  **[무인증 사내망 침투 시도]:** Authorization 헤더 없이 `/private/api/documents` 호출 -> `401 Unauthorized` 차단 확인
    2.  **[위조 JWT 서명 공격]:** 임의의 비밀키로 위조 서명한 JWT로 `/private/` 호출 -> `403 Forbidden` 차단 확인
    3.  **[관리자 웹 토큰 우회 공격]:** `deviceId` 클레임이 없는 관리자 콘솔용 토큰으로 `/private/` 호출 -> `403 Forbidden` 차단 확인
    4.  **[폐기 토큰 재사용 공격 (Replay Attack)]:** 로그아웃되어 `token_blacklist`에 등재된 토큰으로 재접속 시도 -> `401 Unauthorized` 차단 확인
    5.  **[신뢰 해제 기기 접근 및 강제 퇴출 (Session Tearing)]:** `BLOCKED` 또는 미등록 기기 ID가 담긴 토큰으로 접근 시 -> `401 (revoked: true)` 즉시 퇴출 확인
    6.  **[클라이언트 권한 헤더 위조 (Privilege Escalation)]:** 일반 사원(Lv.1)이 요청 헤더에 `x-user-role: ADMIN`, `x-allow-download: true`를 강제 주입하여 전송 시 -> 게이트웨이가 DB의 실제 권한으로 덮어써서 권한 상승을 무력화하는지 확인
    7.  **[BYOD 및 저직급 기밀문서 업로드 우회 시도]:** `BYOD` 단말 또는 사원급(Lv.1) 토큰으로 `POST /private/api/documents` 파일 업로드 시도 -> `checkUploadPermission` 미들웨어가 디스크 저장 전에 `403 Forbidden`으로 차단하는지 확인
    8.  **[IP 스푸핑 (`X-Forwarded-For` 헤더 조작) 방어]:** 공격자가 `X-Forwarded-For: 8.8.8.8` 헤더를 임의 주입했을 때 Rate Limiter 및 `getClientIp`가 조작된 값에 속지 않고 실제 IP를 유지하는지 확인
    9.  **[SQL Injection 로그인 우회 시도]:** `POST /api/login`에 `{"email": "admin' OR '1'='1' --", "password": "x"}` 주입 시 -> Prepared Statement 바인딩에 의해 `401`로 안전하게 차단되는지 확인
    10. **[비허가 출처 CORS 및 공개 회원가입 노출 검사]:** 비허가 Origin(`https://evil.example.com`) 요청 시 CORS 차단 여부 및 제거된 `POST /api/signup` 호출 시 `404 Not Found` 차단 확인
    11. **[생체 인증 API 직접 호출 우회 시도 (`bioToken` 검증)]:** 1차 로그인 후 유효한 `bioToken` 없이 `POST /api/verify-bio`를 직접 호출했을 때 -> `401 Unauthorized`로 차단되는지 확인 (Part 1 구현 후 검증)

### 2. 오픈소스 패키지 취약점(CVE) 스캔 및 네트워크 포트 격리 검증
1.  **의존성 취약점 스캔 (`npm audit`):**
    *   `ztna-policy-server`, `ztna-gateway`, `ztna-admin-web`, `ztna-client` 4개 모듈의 `npm audit` 실행 및 취약점 점검.
2.  **네트워크 은폐성(Dark Cloud) 및 내부 포트 격리 검증:**
    *   보호 대상 사내망 서버(`target.js`, `5000번 포트`)가 외부 공인 IP(`54.79.43.69:5000`)로는 접근이 불가능하고 오직 로컬 루프백(`127.0.0.1:5000`)을 통해서만 게이트웨이와 통신하는지 검증.
3.  **보안성 평가 보고서 문서화 (`docs/SECURITY_VULNERABILITY_REPORT.md`):**
    *   위 모의 해킹 11대 항목 실행 결과 표, `npm audit` 결과, 포트 격리 검증 결과를 발표/보고서용 마크다운 문서로 저장.

---

## Part 4. 모바일 클라이언트 통합 Android APK 재빌드 및 배포

*   **포함 내역:**
    1.  Part 1의 생체 인증 `bioToken` (`SecureStore`) 검증 로직
    2.  갤럭시 Z 폴드 대화면 및 웹 UI 수정 사항 (`AttendanceTab.tsx` 임직원 디렉토리 오버레이 드로어, `DocumentSection.tsx` 기밀문서 카드 반응형 너비)
    3.  모서리 흰색 배경이 제거된 투명 아이콘(`icon.png`, `android-icon-foreground.png`)
*   **빌드 및 배포 명령어:**
    ```powershell
    Set-Location C:\ZTNA\ztna\ztna-client
    npx.cmd eas-cli build -p android --profile preview
    ```
*   빌드 완료 후 `docs/APP_INSTALL_GUIDE.md`의 APK 다운로드 링크 및 QR/설치 안내를 최신 버전으로 갱신합니다.
