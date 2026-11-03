# ZTNA 최종발표 및 졸업전시회 통합 시연 시나리오 가이드

본 문서는 **Zero-Trust Network Access (ZTNA) 보안 플랫폼**의 최종발표 및 졸업전시회 라이브 시연을 위해 구성된 통합 시나리오 명세서입니다. 단순 기능 시연을 넘어 **"기존 경계 기반 보안(VPN)이 막지 못하는 위협을 ZTNA가 어떻게 실시간으로 차단하는가"**를 증명할 수 있도록 **6가지 사용자/정책 통제 시나리오**와 **4가지 해커 침입 방어 시나리오**, 그리고 **현장 진행용 추천 스토리라인**으로 구성되어 있습니다.

---

## 1. 시연 환경 사전 준비 구성

심사위원과 관람객의 시각적 이해도를 극대화하기 위해 화면을 다음과 같이 배치합니다.

1. **좌측 화면 (PC 브라우저 1 - 관리자 관제 화면):**
   * **관리자 웹 대시보드 (`ztna-admin-web`):** `https://ztna-core.duckdns.org`
   * 실시간 보안 감사 로그(Access Logs), 단말기 승인/차단 제어(Devices), 임직원 계정 제어(Users) 화면을 띄워둡니다.
2. **우측 화면 (스마트폰 미러링 또는 PC 브라우저 2 - 임직원 단말 화면):**
   * **안드로이드 모바일 앱 (`ztna-client` APK)** 또는 **클라이언트 웹 포털 (`https://ztna-core.duckdns.org/app/`)**
3. **보조 화면 (PC 터미널 - 공격자/해커 콘솔):**
   * 침입 방어 시연 시 `curl` 또는 공격 시뮬레이션 스크립트를 실행하여 서버의 실시간 차단 응답(`401`, `403`, `429`)을 보여주는 터미널 창입니다.

---

## 2. 핵심 보안 정책 및 사용자 통제 시나리오 (6종)

### 시나리오 1: 미등록(신규) 단말기 Zero-Trust 온보딩 격리 및 승인 통제
* **보안 목표:** 공격자가 피싱 등으로 임직원의 아이디, 비밀번호, 심지어 2차 인증(이메일 OTP) 번호까지 탈취하더라도 **관리자가 사전 승인하지 않은 미등록 기기(`deviceId`)에서는 사내망 진입을 원천 차단**합니다.
* **관련 코드:** `ztna-policy-server/controllers/authController.js`, `ztna-client/hooks/useAuth.ts`
* **시연 절차:**
  1. 이미 승인된 법인 단말(`finance_corp@company.com`)로 로그인하여 사내 인트라넷(`IntranetScreen`)에 정상 진입하는 모습을 먼저 보여줍니다.
  2. 새로운 단말기(또는 브라우저 시크릿 모드로 생성된 신규 `web-...` 기기 식별자)에서 동일 계정(`finance_corp@company.com`)으로 로그인 후 이메일 OTP 6자리를 정확히 입력합니다.
  3. **차단 결과 확인:** 인증 번호가 맞았음에도 토큰이 발급되지 않고, **"신규 기기 등록이 요청되었습니다. 보안 관리자의 승인 후 접속 가능합니다."** 메시지와 함께 접속이 차단(`PENDING` 격리)됩니다.
  4. **관리자 승인 연동:** 좌측 관리자 대시보드 **[기기 관리]** 탭에 신규 기기가 `PENDING` 상태로 등록된 것을 확인하고, 관리자가 **`APPROVED` (법인 또는 개인)** 버튼을 클릭한 직후 다시 로그인하면 정상 진입됨을 보여줍니다.

---

### 시나리오 2: 법인 기기(`CORPORATE`) vs 개인 기기(`BYOD`) 적응형 권한 차등 및 모바일 DLP(캡처 차단)
* **보안 목표:** 동일한 사내망에 진입하더라도 **단말기의 신뢰 수준(`CORPORATE` vs `BYOD`)과 사용자 직급(`position_level`)에 따라 접근 가능한 메뉴와 데이터 반출(다운로드/화면 캡처) 권한을 세밀하게 통제**합니다.
* **관련 코드:** `ztna-client/screens/IntranetScreen.tsx`, `ztna-gateway/controllers/documentsController.js`
* **시연 절차:**
  1. **법인 단말(`finance_corp@company.com`, `CORPORATE`, 과장 Level 3):**
     * 하단(또는 좌측) 네비게이션에 `Attendance`, `Documents`, `Schedule`, `Settings` 4개 탭이 모두 표시됩니다.
     * 기밀문서(`Top Secret Documents`) 업로드 및 다운로드가 모두 허용됩니다.
  2. **개인 단말(`finance_byod@company.com`, `BYOD`, 사원 Level 1) 비교:**
     * 화면 상단에 **"BYOD / 외부 접속 모드: 기밀 문서 다운로드가 제한됩니다."** 경고 배너가 즉시 노출됩니다.
     * `Schedule` 탭이 자동으로 비노출 처리되며, 기밀문서 목록 열람은 가능하지만 **문서 다운로드 버튼이 잠김(`lock`) 상태로 비활성화**됩니다.
     * 우회하여 다운로드 API(`GET /private/api/documents/:id/download`)를 직접 호출하더라도 게이트웨이(PEP)가 JWT 내 `allowDownload: false` 클레임을 검증하여 `403 Forbidden`으로 차단합니다.
  3. **모바일 화면 캡처 원천 차단 (`expo-screen-capture`):**
     * 안드로이드 스마트폰으로 사내망(`IntranetScreen`)에 진입한 상태에서 **실제로 휴대폰 스크린샷 버튼(전원 + 볼륨 다운) 또는 화면 녹화를 실행**합니다.
     * 안드로이드 OS의 `FLAG_SECURE` 정책이 작동하여 **"보안 정책에 따라 화면을 캡처할 수 없습니다"** 경고와 함께 캡처가 원천 차단되는 모습을 시연합니다.

---

### 시나리오 3: 사내망 접속 중 실시간 원격 킬스위치 (Session Kill-Switch)
* **보안 목표:** "한 번 인증했다고 끝까지 신뢰하지 않는다(Continuous Verification)." 단말기 분실, 퇴사자 발생, 내부 정보 유출 징후 포착 시 **관리자가 클릭 한 번으로 현재 접속 중인 세션을 즉시 강제 종료**시킵니다.
* **관련 코드:** `ztna-gateway/server.js`, `ztna-policy-server/controllers/authController.js`, `ztna-client/hooks/useHeartbeat.ts`, `ztna-client/screens/BlockedScreen.tsx`
* **시연 절차:**
  1. 우측 스마트폰 화면에서 사내망에 정상 로그인하여 기밀문서 탭을 열어둡니다.
  2. 좌측 **관리자 웹 대시보드**에서 해당 사용자의 기기 상태를 **`BLOCKED`(차단)**으로 변경하거나, 임직원 계정을 **일시 정지(`is_active = 0`)**로 전환합니다.
  3. **실시간 차단 확인 (이중 방어 메커니즘):**
     * **즉각 반응 (PEP 게이트웨이 검증):** 사용자가 앱에서 탭을 누르거나 새로고침을 시도하는 즉시, 게이트웨이가 실시간 상태를 조회하여 `401 Unauthorized (revoked: true)`를 반환하고 세션을 파기합니다.
     * **무조작 상태 반응 (PDP Heartbeat 검증):** 사용자가 아무 조작 없이 화면만 켜두고 있어도, 백그라운드에서 30초 주기로 동작하는 `useHeartbeat`가 `/api/verify-context`로부터 `TERMINATE` 명령을 수신하여 **즉시 로컬 토큰을 삭제하고 보안 차단 화면(`BlockedScreen`)으로 강제 전환**합니다.

---

### 시나리오 4: 컨텍스트 기반 동적 위험도(Risk Score) 평가 및 자동 격리
* **보안 목표:** 정적인 아이디/비밀번호 검사를 넘어 **접속 시각, IP 대역, 단말기 무결성(루팅 여부), 물리적 이동 속도 등 실시간 맥락(Context)을 정량적 위험 점수로 산출**하여 임계치(`80점`) 이상일 때 자동으로 접근을 차단합니다.
* **관련 코드:** `ztna-policy-server/utils/riskEngine.js`, `ztna-policy-server/controllers/authController.js`
* **위험도 가산 기준 (`riskEngine.js`):**
  * 단말기 루팅/탈옥 감지 (`isRooted === true`): **`+100점` (즉시 차단)**
  * 물리적으로 불가능한 이동 속도 (`Impossible Travel`, 시속 500km 초과): **`+60점`**
  * 미등록 신규 단말기 접근: **`+30점`**
  * 업무 외 심야 시간대 접속 (22시 ~ 06시): **`+20점`**
  * 기존 접속 IP와 다른 새로운 네트워크 대역 접근: **`+15점`**
* **시연 절차:**
  1. 위험 시나리오(루팅 감지 또는 불가능한 이동 + 새로운 IP/심야 시간대 조합)로 로그인을 시도합니다.
  2. 위험 점수가 `80점` 이상으로 산출되면서 로그인이 즉시 거부(`403 Forbidden`)되고, 기존에 승인(`APPROVED`)되어 있던 단말기라도 **자동으로 `BLOCKED` 상태로 강등**됩니다.
  3. 관리자 대시보드 **[보안 감사 로그]** 테이블 최상단에 빨간색 `DENY` 배지와 함께 산출된 위험 점수(예: `Risk Score: 95`) 및 상세 차단 사유가 실시간으로 기록된 것을 확인합니다.

---

### 시나리오 5: 모바일 네트워크 전환(Wi-Fi <-> LTE/5G) 시 지능형 무중단 세션 유지
* **보안 목표:** 강력한 보안을 유지하면서도 정상적인 모바일 업무 환경(사무실 Wi-Fi에서 외부 5G/LTE로 전환)에서는 사용자의 세션이 끊기지 않도록 **편의성과 보안성을 동시에 달성**합니다.
* **관련 코드:** `ztna-client/app/index.tsx`, `ztna-client/hooks/useHeartbeat.ts`, `ztna-policy-server/controllers/authController.js`
* **시연 절차:**
  1. 스마트폰에서 Wi-Fi에 연결된 상태로 사내망에 로그인합니다 (화면 상단/대시보드에 현재 Wi-Fi 공인 IP 표시).
  2. 사내망 화면을 유지한 채 스마트폰 상단바를 내려 **Wi-Fi를 끄고 LTE/5G 모바일 데이터로 전환**합니다.
  3. 다음 Heartbeat 주기(또는 앱 포그라운드 복귀 시점)에 정책 서버가 IP 변경을 감지하지만, 단말기 식별자(`deviceId`)와 JWT 서명이 유효하고 기기가 `APPROVED` 상태이므로 세션을 끊지 않고 **`IP_CHANGED` 상태를 반환하며 DB의 `last_ip_address`를 새 LTE 공인 IP로 자동 업데이트**합니다.
  4. 사용자는 끊김 없이 업무를 이어가고, 관리자 대시보드에서는 해당 기기의 최신 접속 IP가 LTE 공인 IP로 실시간 갱신된 것을 확인합니다.

---

### 시나리오 6: 무차별 대입 공격(Brute-Force) 및 OTP 탈취 방어
* **보안 목표:** 로그인 관문과 2차 인증(OTP/생체인증) 엔드포인트에 대한 무차별 대입 공격을 다중 레이어(IP 기반 Rate Limiter + 계정별 실패 카운터)로 방어합니다.
* **관련 코드:** `ztna-policy-server/routes/auth.js`, `ztna-policy-server/controllers/authController.js`
* **시연 절차:**
  1. OTP 입력 화면에서 임의의 잘못된 6자리 번호를 연속으로 입력합니다.
  2. 5회 실패(`otp_attempts >= 5`) 도달 시 서버가 **발급되어 있던 OTP 코드와 만료 시간을 즉시 DB에서 파기(`NULL` 초기화)**하여 더 이상 해당 세션으로 인증할 수 없게 만들고 처음부터 다시 로그인하도록 강제합니다.
  3. 또한 동일 IP에서 반복적인 로그인/인증 요청이 발생하면 `express-rate-limit`이 작동하여 `429 Too Many Requests`로 15분간 요청 자체를 차단합니다.

---

## 3. 해커 침입 방어 라이브 시연 시나리오 (4종)

전시회 부스나 발표에서 **"해커가 실제로 공격을 시도했을 때 ZTNA가 어떻게 막아내는지"**를 터미널(Attacker Console)로 보여주는 침입 방어 시나리오입니다.

### 침입 방어 A: 내부 기밀 서버(Target Server) 직접 스캔 및 우회 침입 차단 (Dark Cloud)
* **공격 시나리오:** 해커가 사내 업무 서버(`ztna-target`, 5000번 포트)나 정책 서버(3000번 포트)로 직접 HTTP 요청을 보내 인증 게이트웨이를 우회하려는 시도.
* **공격 명령어 예시:**
  ```bash
  curl -i --connect-timeout 5 http://ztna-core.duckdns.org:5000/secret-data
  ```
* **방어 원리 및 결과:**
  * 내부 자원 서버(5000번 포트)는 외부 인터넷에 포트가 개방되어 있지 않으며(Dark Cloud 아키텍처), 오직 역방향 프록시 및 ZTNA PEP 게이트웨이(`https://ztna-core.duckdns.org/private/*`)를 통과한 검증된 트래픽만 도달할 수 있어 **연결 자체가 타임아웃/거부(`Connection Refused / Timed out`)**됩니다.

---

### 침입 방어 B: X-Forwarded-For 헤더 조작(IP 스푸핑) 및 루팅 단말 침입 차단
* **공격 시나리오:** 해커가 자신의 실제 IP를 숨기고 사내 로컬 IP(`127.0.0.1`)인 것처럼 `X-Forwarded-For` 헤더를 위조하여 주입하고, 루팅된 해킹 단말기로 로그인을 시도하는 상황.
* **공격 명령어 예시:**
  ```bash
  curl -X POST https://ztna-core.duckdns.org/api/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 127.0.0.1" \
    -d "{\"email\":\"finance_vuln@company.com\",\"password\":\"1234\",\"deviceId\":\"hacker-rooted-phone\",\"isRooted\":true}"
  ```
* **방어 원리 및 결과:**
  1. 정책 서버(`utils/ip.js`)는 클라이언트가 임의로 조작할 수 있는 `X-Forwarded-For`를 신뢰하지 않고 Nginx 리버스 프록시가 직접 덮어쓴 실제 소켓 IP(`X-Real-IP`)만 추출합니다.
  2. 루팅 단말기(`isRooted: true`)에 대해 위험 점수 `100점`이 부과되어 **즉시 `403 Forbidden`으로 차단**되며, 관리자 대시보드 감사 로그에 위조된 `127.0.0.1`이 아닌 **해커의 실제 공인 IP와 `DENY (위험 점수 100점)` 기록이 박제**됩니다.

---

### 침입 방어 C: 해외 좌표 기반 불가능한 이동(Impossible Travel) 계정 탈취 공격 차단
* **공격 시나리오:** 방금 서울(`위도 37.5665, 경도 126.9780`)에서 정상 접속했던 직원의 계정을 해커가 탈취하여, 수 분 내에 미국 뉴욕(`위도 40.7128, 경도 -74.0060`) 좌표에서 접속을 시도하는 상황.
* **공격 명령어 예시:**
  ```bash
  curl -X POST https://ztna-core.duckdns.org/api/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"finance_vuln@company.com\",\"password\":\"1234\",\"deviceId\":\"device-seoul-01\",\"isRooted\":false,\"latitude\":40.7128,\"longitude\":-74.0060}"
  ```
* **방어 원리 및 결과:**
  1. `riskEngine.js`의 Haversine 구면 거리 공식이 직전 접속 좌표(서울)와 현재 좌표(뉴욕, 약 11,000km 거리) 및 경과 시간을 계산하여 **시속 500km를 초과하는 물리적으로 불가능한 이동(`+60점`)**으로 판정합니다.
  2. IP 변경(`+15점`) 및 시간대/단말 위험도와 합산되어 임계치(`80점`)를 넘기므로 **즉시 접근이 차단(`DENY`)되고 해당 단말기는 자동으로 `BLOCKED` 격리**됩니다.

---

### 침입 방어 D: 관리자 웹 전용 토큰을 이용한 사내 인트라넷 우회 침입 차단
* **공격 시나리오:** 단말기 식별자(`deviceId`) 검증 없이 발급된 토큰이나 미승인 토큰으로 게이트웨이 내부 API(`/private/api/documents`)에 직접 접근하려는 시도.
* **공격 명령어 예시:**
  ```bash
  curl -i https://ztna-core.duckdns.org/private/api/documents \
    -H "Authorization: Bearer <탈취되거나_단말기정보가_없는_JWT_토큰>"
  ```
* **방어 원리 및 결과:**
  * PEP 게이트웨이(`ztna-gateway/server.js`)는 JWT 서명만 확인하는 것이 아니라 토큰 페이로드 내부의 `deviceId` 존재 여부, `token_blacklist` 등재 여부, 그리고 DB 상의 실시간 단말기 `APPROVED` 여부 및 계정 `is_active` 상태를 전수 대조하여 **`401 Unauthorized` 또는 `403 Forbidden`으로 즉시 차단**합니다.

---

## 4. 최종발표 / 졸업전시회 추천 5분 라이브 시연 스토리라인

발표 시간(약 3~5분) 동안 가장 매끄럽게 이어지는 **4단계 실전 연출 순서**입니다.

| 순서 | 단계명 | 시연 행동 (Presenter Action) | 화면에서 보여줄 핵심 포인트 |
| :--- | :--- | :--- | :--- |
| **Step 1** | **신규 기기 차단 및 관리자 승인 (Onboarding)** | 미등록 기기로 로그인 후 OTP까지 통과 시도 -> 차단 확인 후 관리자 웹에서 승인 클릭 | "비밀번호와 OTP를 다 알아도 승인되지 않은 기기는 `PENDING` 상태로 격리됩니다." |
| **Step 2** | **법인폰 vs 개인폰(BYOD) 권한 차등 및 캡처 방지 (DLP)** | 승인된 기기의 타입을 `BYOD`로 두고 접속 -> 문서 다운로드 잠김 확인 + **휴대폰 실제 스크린샷 촬영 시도** | "개인 기기에서는 기밀문서 다운로드가 막히고, 모바일 화면 캡처 자체가 OS 레벨에서 차단됩니다." |
| **Step 3** | **해커 침입 시도 및 동적 위험도 차단 (Risk Engine)** | 터미널에서 루팅 단말/해외 좌표(Impossible Travel) 공격 실행 -> 관리자 대시보드 로그 확인 | "해커가 IP를 속이거나 해외에서 탈취 계정으로 접속하면 위험도 엔진이 70점 이상을 부여해 즉시 차단하고 감사 로그에 기록합니다." |
| **Step 4** | **실시간 원격 킬스위치 (Continuous Verification)** | 스마트폰으로 사내망에 접속해 둔 상태에서, 관리자 웹에서 기기를 `BLOCKED`로 변경 | "이미 사내망에 들어와 있는 사용자라도 위험이 감지되면 관리자가 클릭 한 번으로 즉시 세션을 폭파(`BlockedScreen`)시킬 수 있습니다." |

---

## 5. 해커 침입 방어 시뮬레이터 (`scripts/attack-demo.js`) 설계 명세 (차주 제작 예정)

발표 및 졸업전시회 현장에서 발표자가 복잡한 `curl` 명령어를 직접 타이핑하지 않고, **노트북 로컬 터미널에서 숫자 키 입력만으로 실제 AWS 운영 서버(`https://ztna-core.duckdns.org`)에 모의 해킹 패킷을 전송하여 실시간 차단 및 대시보드 감사 로그 기록을 시연**하기 위한 대화형 스크립트 설계안입니다.

### 5.1 아키텍처 및 동작 특징 (서버 재배포 불필요)
* **클라이언트 사이드 모의 공격기:** AWS EC2 서버(`ztna-policy-server`, `ztna-gateway`)에는 이미 모든 방어 로직(CARTA 위험도 엔진, PEP 컨텍스트 검증, 생체인증 `bioToken` 검증, OTP 실패 파기, `X-Real-IP` 추출)이 배포되어 있으므로 **서버 측 코드 수정이나 재배포가 전혀 필요하지 않습니다.**
* **실시간 관제 연동:** 발표자 노트북에서 `node scripts/attack-demo.js`를 실행하고 메뉴 번호를 입력하면, AWS 서버로 HTTPS 공격 요청이 전송되고 **우측에 띄워둔 관리자 웹 대시보드(`https://ztna-core.duckdns.org`)의 [보안 감사 로그] 및 [기기 관리] 화면에 실시간으로 `DENY` 로그와 `BLOCKED` 격리 상태가 반영**됩니다.
* **원클릭 상태 복구(Reset) 지원:** 졸업전시회 부스에서 관람객에게 반복 시연할 수 있도록, 시연 중 `BLOCKED` 처리된 테스트 단말기를 관리자 API를 통해 1초 만에 다시 `APPROVED` 상태로 초기화하는 복구 메뉴(`[r]`)를 포함합니다.

### 5.2 대화형 메뉴 구성 및 단계별 실행 명세

```text
========================================================================
  ZTNA 해커 침입 방어 라이브 시뮬레이터 (Target: https://ztna-core.duckdns.org)
========================================================================
  [1] Stage 1: PEP 게이트웨이 미인증 침입 & 단말 컨텍스트 누락 토큰 우회 공격
  [2] Stage 2: 루팅 해킹폰 침입 & 생체인증(bioToken) 위조 우회 공격
  [3] Stage 3: 불가능한 이동(서울 -> 뉴욕 2초 이동) 탐지 및 기기 자동 격리(BLOCKED)
  [4] Stage 4: 2차 인증(OTP) 5회 무차별 대입(Brute-Force) 공격 및 OTP 즉시 파기
  [5] 전체 시나리오 (1 -> 2 -> 3 -> 4) 연속 실행
  [r] 시연 후 단말기 상태 원상복구 (APPROVED 초기화)
  [q] 종료
------------------------------------------------------------------------
```

#### [Stage 1] PEP 게이트웨이 미인증 침입 & 관리자 토큰 우회 공격
* **공격 패킷:**
  1. `GET /private/api/documents` (Authorization 헤더 없이 사내 기밀문서 API 직접 호출)
  2. `GET /private/api/documents` (단말기 식별자 `deviceId`가 없는 관리자 웹 전용 JWT 토큰을 헤더에 넣어 우회 호출)
* **서버 방어 응답:**
  * `ztna-gateway/server.js`의 `verifyToken` 미들웨어가 토큰 누락(`401`) 및 단말기 컨텍스트(`!decoded.deviceId`) 누락을 감지하여 **`403 Forbidden` ("단말기 보안 컨텍스트가 없는 토큰으로는 사내망에 접근할 수 없습니다.")** 반환.

#### [Stage 2] 루팅 단말기 침입 & 생체인증(`bioToken`) 위조 우회 공격
* **공격 패킷:**
  1. `POST /api/login`: `isRooted: true` 및 위조 헤더 `X-Forwarded-For: 127.0.0.1` 주입.
  2. `POST /api/verify-bio`: 이메일 OTP를 건너뛰고 임의의 위조된 `bioToken: "forged-fake-biometric-secret-key"`를 전송하여 생체인증 우회 시도.
* **서버 방어 응답:**
  * 루팅 단말기는 즉시 `403 Forbidden`으로 차단.
  * 위조 `bioToken` 호출은 DB의 `bio_token_hash`와 불일치하여 **`401 Unauthorized`로 차단**되며, 관리자 감사 로그에 위조된 `127.0.0.1`이 아닌 **공격자의 실제 공인 IP와 `DENY (위험 점수 70점: 생체 인증 기기 전용 비밀키 불일치 차단)`** 기록.

#### [Stage 3] 불가능한 이동(Impossible Travel) 탐지 및 단말 자동 격리
* **공격 패킷:**
  1. 테스트 단말기를 서울 본사 좌표(`latitude: 37.5665, longitude: 126.9780`)로 정상 접속시켜 `ALLOW` 기준점 생성.
  2. 직후 2초 만에 미국 뉴욕 좌표(`latitude: 40.7128, longitude: -74.0060`, 약 11,040km 거리)로 동일 계정 및 단말기 로그인(`POST /api/login`) 요청 전송.
* **서버 방어 응답:**
  * `services/riskEngine.js`가 Haversine 거리 및 시간차를 계산하여 **시속 1,000km 초과 물리적으로 불가능한 이동(`+70점`)**을 감지.
  * 총 위험도 점수가 차단 임계치(`70점`) 이상이므로 **`403 Forbidden` 즉시 차단**과 동시에 DB에서 해당 단말기 상태를 **`APPROVED` -> `BLOCKED`로 자동 격리**하고 기존 `bio_token_hash`를 폐기.

#### [Stage 4] 2차 인증(OTP) 5회 무차별 대입 공격 및 세션 파기
* **공격 패킷:**
  * 1차 로그인 후 `POST /api/verify-otp` 엔드포인트에 `000001`부터 `000006`까지 연속 대입 공격 수행.
* **서버 방어 응답:**
  * 1~5회차에는 `otp_attempts` 카운터를 1씩 증가시키며 남은 횟수 경고(`401`)를 반환하고, **5회 실패 도달 직후 시도에서 DB의 `otp_code`와 `otp_expiry`를 `NULL`로 즉시 파기하며 `429 Too Many Requests` ("인증 5회 실패. OTP가 무효화되었습니다.")** 반환.

#### [Reset (`r`)] 반복 시연을 위한 원상복구
* **동작 방식:**
  * 관리자 계정(`admin@company.com`)으로 토큰을 발급받아 `GET /api/admin/devices`로 시연 계정(`finance_vuln@company.com`)의 기기를 조회한 뒤, `PATCH /api/admin/devices/:id/approve`를 호출하여 `BLOCKED`된 기기를 즉시 `APPROVED` 상태로 복원합니다.

