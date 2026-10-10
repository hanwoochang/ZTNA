# ZTNA (Zero Trust Network Access) Enterprise Architecture

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-Admin_Web-20232A?logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

> **"결코 신뢰하지 말고, 항상 검증하라 (Never Trust, Always Verify)"**
> 
> NIST SP 800-207 제로 트러스트 표준 권고안을 충실히 구현한 엔터프라이즈급 마이크로서비스 아키텍처(MSA) 통합 보안 시스템입니다.

---

## 1. 프로젝트 개요 (Project Overview)
기존의 경계 기반(Perimeter-based) 보안 모델(VPN 등)을 탈피하여, 내부망 리소스를 인터넷으로부터 완전히 은닉(Dark Cloud)하고 모든 접근 요청을 맥박(Heartbeat)처럼 지속적으로 검증하는 차세대 ZTNA 시스템입니다.

모바일/반응형 웹 보안 워크스페이스를 통해 수집된 단말기 무결성, GPS 물리적 이동 속도, 접속 시간대, IP 대역 등의 컨텍스트를 종합 분석하여 **CARTA(지속적 맞춤형 위험 및 신뢰 평가)**를 수행하며, ZTNA Gateway(PEP)를 통해 인가된 트래픽만 내부 기밀망으로 통과시킵니다.

---

## 2. 시스템 아키텍처 (System Architecture)
완전한 망 분리 및 역할 분담(Separation of Concerns)을 위해 4개의 독립된 서브시스템으로 구성됩니다.

```
[ ZTNA Client (Mobile / Web) ]
         │
         ├─── (1) 인증 & CARTA 위험도 평가 / Heartbeat ───▶ [ Policy Server (PDP) : 3000 ]
         │                                                      │ (인증/세션/기기/위험도 제어)
         │                                                      ▼
         └─── (2) Reverse Proxy 인가 트래픽 (JWT 검증) ───▶ [ ZTNA Gateway (PEP) : 4000 ]
                                                                │ (Session Tearing & RBAC 동기화)
                                                                ▼
                                                            [ Target Server (기밀 인트라넷) : 5000 ]
                                                            (127.0.0.1 로컬 바인딩으로 외부 은닉)

[ Admin Web Dashboard : 5173 ] ─── (실시간 관제 & 기기/임직원 통제) ───▶ [ Policy Server : 3000 ]
```

1. **Client Agent (`ztna-client` / React Native & Expo):**
   * 기기 고유 식별자(UUID), GPS 실시간 위치 수집, FaceID/지문 생체 인증.
   * 기밀 문서(PDF) 다운로드 제어 및 뷰어, 보안 공지사항, 캘린더 일정 관리, 사원증 기반 출퇴근 기록.
   * 비인가/위험 감지 시 즉각적인 붉은 경고 차단 화면(`BlockedScreen`) 전환.
2. **Policy Server (`ztna-policy-server` / PDP & Control Plane, Port 3000):**
   * MVC 패턴(`authController.js`) 기반의 인증, 세션, 기기 생명주기 제어.
   * CARTA 알고리즘 기반 실시간 위험도(0~100점) 산출 및 정책(ALLOW / STEP_UP / DENY) 결정.
   * 10초 주기 맥박(Heartbeat, `/verify-context`)을 통한 기기/IP 변조 탐지 및 실시간 JWT 재발급.
3. **ZTNA Gateway (`ztna-gateway` / PEP & Data Plane, Port 4000):**
   * 출입증(JWT) 검증 미들웨어, 토큰 블랙리스트 대조, 기기 신뢰 취소 즉시 세션 파기(Session Tearing).
   * DB 사용자 직급(Lv 1~6) 및 역할(USER, FINANCE, ADMIN) 실시간 동기화 헤더 주입.
   * 리버스 프록시(`http-proxy-middleware`)를 통해 실제 타겟 인트라넷(Port 5000)으로 인가된 트래픽만 중계.
4. **Admin Web Dashboard (`ztna-admin-web` / React & Vite, Port 5173):**
   * 3초 주기 고위험(70점 이상) 접속 실시간 알림 벨, 브라우저 푸시 알림, 토스트 팝업.
   * 전사 접속 감사 로그(Audit Log) 관제 (30점+ 노랑, 70점+ 빨강 위험도 시각화).
   * 단말기 승인/차단/소유권(BYOD vs CORPORATE) 변경, 임직원 등록/수정/삭제 관리.

---

## 3. 핵심 보안 기능 (Key Security Features)

* **컨텍스트 기반 동적 위험도 산출 (CARTA):**
  * Haversine 공식을 활용한 물리적 이동 속도 계산 (1,000km/h 초과 시 Impossible Travel 즉시 차단).
  * OS 루팅/탈옥, 블랙리스트 기기 즉시 차단 (`forceDeny`).
  * 신규 등록 기기, 미등록 IP 대역, 심야 비정상 활동(새벽 2~5시) 복합 평가 (0점 ~ 100점 누적).
* **지속적 검증 (Continuous Verification) & 세션 강제 종료 (Session Tearing):**
  * 세션 유지 중에도 10초 주기로 기기 상태와 네트워크 변경을 지속 모니터링.
  * 관리자가 대시보드에서 기기 신뢰를 해제(Revoke)하면, 이미 발급된 JWT 토큰이 있더라도 게이트웨이 및 Heartbeat에서 즉시 감지하여 실시간 강제 추방.
* **단말기 소유권 기반 권한 제어 (BYOD vs CORPORATE):**
  * 개인 기기(BYOD)로 접속 시 인트라넷 조회는 허용하되, 파일 다운로드를 백엔드 및 클라이언트 단에서 원천 차단.
* **역할 및 직급 기반 접근 통제 (RBAC):**
  * 직급(사원 Lv.1 ~ 임원 Lv.6) 및 역할(일반 사용자, 재무 관리자, 시스템 관리자)에 따른 세부 열람/작성/다운로드 권한 통제.
* **보안 감사 및 실시간 가시성 (Audit & Observability):**
  * 모든 로그인 시도, 위험도 점수, 사유, 인가 결과를 `access_logs`에 영구 기록.
  * 무차별 대입 공격(Brute Force) 방어용 IP 기반 Rate Limiter 적용.

---

## 4. 기술 스택 (Tech Stack)

* **Client App:** React Native (Expo SDK 54), TypeScript, Expo Location, React Navigation
* **Admin Web:** React 19, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons
* **Backend:** Node.js (v18+), Express.js, JWT, Bcrypt, http-proxy-middleware, mysql2
* **Database:** MySQL 8.x

---

## 5. 실행 가이드 (Getting Started)

### 환경 변수 설정 (`.env`)
`ztna-policy-server` 및 `ztna-gateway` 디렉터리에 각각 `.env` 파일을 구성합니다:
```env
PORT=3000 (또는 gateway는 4000)
JWT_SECRET=your_ztna_super_secret_jwt_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ztna
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### 서브시스템 실행 (총 4개 터미널)

1. **Target Server (보호받는 인트라넷 구동)**
   ```bash
   cd ztna-gateway
   node target.js
   ```
2. **ZTNA Policy Server (정책 엔진 / PDP)**
   ```bash
   cd ztna-policy-server
   npm install
   node server.js
   ```
3. **ZTNA Gateway (정책 집행점 / PEP)**
   ```bash
   cd ztna-gateway
   npm install
   node server.js
   ```
4. **Admin Web Dashboard (관리자 관제 웹)**
   ```bash
   cd ztna-admin-web
   npm install
   npm run dev
   ```
5. **Client App (보안 모바일/웹 클라이언트)**
   ```bash
   cd ztna-client
   npm install
   npx expo start
   ```

---

> **세부 기술 문서:**
> * 전체 아키텍처 상세 명세: [Project_Comprehensive_Spec.md](file:///C:/ZTNA/ztna/Project_Comprehensive_Spec.md)
> * CARTA 위험도 평가 상세 규칙: [docs/risk_score_comparison.md](file:///C:/ZTNA/ztna/docs/risk_score_comparison.md)
> * NIST SP 800-207 요약: [docs/NIST_SP_800-207_Summary.md](file:///C:/ZTNA/ztna/docs/NIST_SP_800-207_Summary.md)
