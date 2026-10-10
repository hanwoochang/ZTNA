# ZTNA 솔루션 통합 종합 기술 명세서 (Project Comprehensive Specification)

## 1. 프로젝트 개요 (Introduction)

본 문서는 **NIST SP 800-207 제로 트러스트 아키텍처 표준**에 기반하여 개발된 통합 ZTNA 보안 시스템의 구조와 동작 명세를 정의합니다.
기존 경계 기반 보안 모델의 한계를 극복하기 위해 모든 네트워크 접근을 기본적으로 불신(Default Deny)하며, 사용자 신원, 기기 무결성, 접속 위치, 시간대 등 다차원 컨텍스트를 종합 분석하여 최소 권한(Least Privilege)을 동적으로 부여합니다.

---

## 2. 서브시스템별 상세 구조 및 아키텍처

본 솔루션은 제어 평면(Control Plane), 데이터 평면(Data Plane), 클라이언트 접점, 관리자 관제 웹의 4개 계층으로 완전히 분리되어 상호작용합니다.

```
[ ZTNA Client (Mobile / Web) ]
         │
         ├─── (1) Auth & CARTA Risk Evaluation / Heartbeat ───▶ [ Policy Server (PDP) : 3000 ]
         │                                                            │ (Control Plane)
         │                                                            ▼
         └─── (2) Reverse Proxy Encrypted Traffic (JWT Verify) ───▶ [ ZTNA Gateway (PEP) : 4000 ]
                                                                      │ (Data Plane)
                                                                      ▼
                                                                  [ Target Server (Private Network) : 5000 ]
                                                                  (127.0.0.1 Binding Only)

[ Admin Web Dashboard : 5173 ] ─── (Real-time Audit & Revocation) ───▶ [ Policy Server : 3000 ]
```

### 2.1 ZTNA Policy Server (정책 결정점 / PDP / Control Plane)
* **포트:** 3000
* **역할:** 사용자의 인증 및 인가, CARTA 위험도 평가, 세션 발급/연장/폐기, 기기 라이프사이클 관리.
* **주요 구성 모듈:**
  * [controllers/authController.js](file:///C:/ZTNA/ztna/ztna-policy-server/controllers/authController.js): 회원가입, ZTNA 로그인 판별, 이메일 OTP 검증, 생체인증 검증, 세션 연장(Heartbeat), 로그아웃(토큰 블랙리스트 등재), 관리자 로그인.
  * [services/riskEngine.js](file:///C:/ZTNA/ztna/ztna-policy-server/services/riskEngine.js): 단말기 무결성, Haversine 공식 기반 물리적 이동 속도, 신규 IP, 심야 시간대 등 동적 점수(0~100점) 산출.
  * [routes/admin.js](file:///C:/ZTNA/ztna/ztna-policy-server/routes/admin.js): 관리자 전용 대시보드 통계, 24시간 위험도 트렌드, 단말기 승인/차단/삭제, 임직원 관리 API.
  * [utils/ip.js](file:///C:/ZTNA/ztna/ztna-policy-server/utils/ip.js): 프록시 헤더 및 IPv6 정제 공통 모듈.

### 2.2 ZTNA Gateway (정책 집행점 / PEP / Data Plane)
* **포트:** 4000
* **역할:** 외부 클라이언트와 비인가 트래픽의 내부망 직접 접근 차단, JWT 출입증 및 블랙리스트 실시간 검증, 리버스 프록시 트래픽 전달.
* **주요 구성 모듈:**
  * [server.js](file:///C:/ZTNA/ztna/ztna-gateway/server.js): 문지기 미들웨어(`verifyToken`).
    * 토큰 서명 유효성 및 만료 여부 검사.
    * `token_blacklist` 대조로 로그아웃된 토큰 즉시 거부.
    * DB 실시간 조회를 통한 세션 강제 종료(Session Tearing): 관리자가 기기 신뢰를 해제(BLOCKED)하는 즉시 다음 요청 차단.
    * 사용자 최신 역할(`role`), 부서(`department`), 직급(`position_level`) 실시간 조회 후 Target Server 전달 헤더 주입 및 클라이언트 동기화 헤더 반환.
  * [target.js](file:///C:/ZTNA/ztna/ztna-gateway/target.js) (Port 5000): 로컬루프백(`127.0.0.1`)에만 바인딩되어 외부에서 직접 접근할 수 없는 보호된 기밀 인트라넷.
    * MVC 패턴 컨트롤러: 출퇴근(`attendance`), 기밀문서(`documents`), 일정(`events`), 보안공지(`notices`), 임직원 조회(`employees`).
    * `ipBlocker`: 게이트웨이가 아닌 외부 IP의 직접 접근 차단.
    * `accessLogger`: 사내망 API 접근 이력 DB 감사 기록.

### 2.3 ZTNA Client (사용자 접점 / Secure Enterprise Workspace)
* **플랫폼:** React Native (Expo SDK 54), TypeScript, 반응형 웹 지원
* **주요 구성 모듈:**
  * [screens/LoginScreen.tsx](file:///C:/ZTNA/ztna/ztna-client/screens/LoginScreen.tsx) & [OtpScreen.tsx](file:///C:/ZTNA/ztna/ztna-client/screens/OtpScreen.tsx): 단말기 컨텍스트(UUID, GPS, 무결성) 수집 및 2차 인증 인터페이스.
  * [screens/BlockedScreen.tsx](file:///C:/ZTNA/ztna/ztna-client/screens/BlockedScreen.tsx): 보안 정책 위반 시 붉은 방패 화면과 함께 명확한 차단 사유 표출.
  * [screens/IntranetScreen.tsx](file:///C:/ZTNA/ztna/ztna-client/screens/IntranetScreen.tsx):
    * 10초 주기 Heartbeat 백그라운드 폴링.
    * 하단 탭 내비게이션: 근태 관리(`AttendanceTab`), 기밀문서 및 공지사항(`DocumentsTab`), 일정(`ScheduleTab`), 설정(`SettingsTab`).
    * [components/tabs/documents/DocumentSection.tsx](file:///C:/ZTNA/ztna/ztna-client/components/tabs/documents/DocumentSection.tsx): 기밀 PDF 카드 슬라이더, 업로드 모달, BYOD 감지 시 다운로드 버튼 비활성화.
    * [components/tabs/documents/NoticeSection.tsx](file:///C:/ZTNA/ztna/ztna-client/components/tabs/documents/NoticeSection.tsx): 부서/직급별 보안 공지사항 열람/작성/수정 모달.

### 2.4 Admin Web Dashboard (보안 관제 콘솔)
* **플랫폼:** React 19, Vite, TypeScript, Tailwind CSS
* **주요 구성 모듈:**
  * [components/layout/DashboardLayout.tsx](file:///C:/ZTNA/ztna/ztna-admin-web/src/components/layout/DashboardLayout.tsx): 대시보드 프레임워크.
  * [components/layout/NotificationBell.tsx](file:///C:/ZTNA/ztna/ztna-admin-web/src/components/layout/NotificationBell.tsx): 3초 주기 폴링 기반 고위험(70점 이상) 실시간 알림 벨, 배지, 드롭다운, 브라우저 Web Notification 발송.
  * [pages/LogsPage.tsx](file:///C:/ZTNA/ztna/ztna-admin-web/src/pages/LogsPage.tsx): 전사 접속 감사 로그 테이블 (70점 이상 레드 하이라이팅, 30점 이상 옐로우 하이라이팅).
  * [pages/DevicesPage.tsx](file:///C:/ZTNA/ztna/ztna-admin-web/src/pages/DevicesPage.tsx): 기기 승인/차단(Revoke)/삭제 및 BYOD ↔ CORPORATE 소유 형태 변경.
  * [pages/UsersPage.tsx](file:///C:/ZTNA/ztna/ztna-admin-web/src/pages/UsersPage.tsx): 임직원 계정 생성/수정/삭제 및 직급/부서 제어.

---

## 3. 핵심 보안 프로토콜 및 데이터베이스 스키마

### 3.1 CARTA 위험도 평가 및 정책 결정
1. **0 ~ 29점 (`ALLOW`)**: 승인된 CORPORATE 기기 정상 접속 -> 즉시 출입증(JWT, 15분 만료) 발급.
2. **30 ~ 69점 (`STEP_UP`)**: 미등록 기기 또는 BYOD 단말 접속 -> 이메일 OTP(6자리) 또는 FaceID/지문 생체 인증 요구.
   * 통과 시 단말 소유권에 따라 `allowDownload: false`가 설정된 조건부 JWT 발급.
3. **70점 이상 또는 치명적 위협 (`DENY`)**: OS 탈옥/루팅, 블랙리스트 기기, Impossible Travel(1,000km/h 초과 이동) -> 토큰 발급 즉시 거부, `access_logs`에 DENY 기록.

### 3.2 주요 데이터베이스 스키마
* **`users`**: `id`, `email`, `password_hash`, `name`, `department`, `position`, `position_level` (1~6), `role` (USER/FINANCE/ADMIN), `otp_code`, `otp_expiry`, `otp_attempts`, `is_active`.
* **`devices`**: `id`, `user_id`, `device_identifier`, `device_type` (BYOD/CORPORATE), `status` (PENDING/APPROVED/BLOCKED), `last_ip_address`, `last_latitude`, `last_longitude`, `last_accessed_at`.
* **`access_logs`**: `id`, `user_id`, `device_id`, `ip_address`, `risk_score`, `action_taken` (ALLOW/STEP_UP/DENY), `reason`, `login_hour`, `created_at`.
* **`token_blacklist`**: `id`, `jti`, `expires_at`, `created_at`.
* **`notices`**: `id`, `title`, `content`, `author`, `date`, `is_edited`, `target_dept`, `target_position_level`.
* **`documents`**: `id`, `title`, `description`, `original_name`, `filename`, `file_path`, `author`, `uploaded_at`.
* **`attendance`**: `id`, `user_id`, `date`, `check_in_time`, `check_out_time`.
* **`events`**: `id`, `title`, `date`, `author`.