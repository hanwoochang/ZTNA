# ZTNA (Zero Trust Network Access) Enterprise Architecture

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-Admin_Web-20232A?logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

> **"결코 신뢰하지 말고, 항상 검증하라 (Never Trust, Always Verify)"**
> 
> NIST SP 800-207 제로 트러스트 표준 권고안을 완벽하게 구현한 엔터프라이즈급 마이크로서비스 아키텍처(MSA) 보안 시스템입니다.

## 1. 프로젝트 개요 (Project Overview)
기존의 경계 기반(Perimeter-based) 보안 모델(VPN 등)을 탈피하여, 내부망을 완벽하게 숨기고 모든 접근 요청을 맥박(Heartbeat)처럼 지속적으로 검증하는 시스템입니다. 
스마트폰 모바일 에이전트를 통해 수집된 사용자의 단말기 상태, GPS 물리적 이동 거리, 접속 시간대를 바탕으로 **CARTA(지속적 맞춤형 위험 및 신뢰 평가)**를 수행하며, ZTNA Gateway(PEP)를 통해 철저하게 인가된 트래픽만 기밀망으로 라우팅합니다.

## 2. 시스템 아키텍처 (System Architecture)
본 프로젝트는 완전한 망 분리 및 역할 분담을 위해 4개의 독립된 모듈로 구성됩니다.

1. **Client Agent (모바일 앱 / React Native):** 기기 고유 식별자(UUID), GPS 위치 실시간 수집, FaceID/지문 생체 인증, 기밀 문서(PDF) 뷰어 및 차단 화면(Red Shield) 제공.
2. **Policy Server (정책 엔진 / PDP):** CARTA 기반 동적 위험도 산출, 기기 무결성 검증, JWT 출입증 발급, 토큰 탈취 방지 검증 수행.
3. **ZTNA Gateway (정책 집행점 / PEP):** JWT 인가 실시간 검증, 비인가 접근 원천 차단 및 리버스 프록시 라우팅. (Target Server를 외부로부터 100% 은닉)
4. **Admin Web Dashboard (관리자 콘솔 / React):** 실시간 전사 접속 감사 로그(Audit Log) 관제, 시간대별 위험도 통계 차트(Recharts), 기기 승인/차단/영구삭제 라이프사이클 관리.

## 3. 핵심 보안 기능 (Key Security Features)
* **컨텍스트 기반 동적 위험도 산출 (CARTA):**
  - 접속 간 하버사인(Haversine) 공식 기반 물리적 이동 속도 계산 (1,000km/h 초과 시 즉시 차단)
  - 루팅/탈옥, 블랙리스트 기기 즉시 차단 (`forceDeny`)
  - 신규 등록 기기, IP 대역 변경, 비정상 심야 접속 등 컨텍스트 조합에 따른 위험도 누적 산출 (0점 ~ 100점).
* **지속 검증 (Continuous Verification) 및 토큰 탈취 방지:** 
  - 세션 유지 중에도 기기 상태와 네트워크 변경을 지속 모니터링(`verify-context`).
  - JWT 토큰 내부에 서명된 `deviceId`와 실제 요청자의 기기를 대조하여, 토큰 도난/재사용 시 즉시 세션 파기(블랙리스트 등재).
* **기기 자산 통제 및 권한 제어 (BYOD vs CORPORATE):**
  - 관리자 웹에서 등록된 기기를 `APPROVED`, `PENDING`, `BLOCKED` 상태로 능동 제어.
  - 임직원의 개인 기기(BYOD)로 접속 시 인트라넷 접근은 허용하되, 파일 다운로드를 백엔드 단에서 원천 차단.
* **보안 감사 및 관제 (Audit & Observability):**
  - 모든 로그인, 접근 시도, 관리자 로그인, 제어 행위를 `access_logs` DB에 사유와 함께 실시간 적재.
  - 무차별 대입 공격(Brute Force) 방어용 Rate Limiter 적용.

## 4. 기술 스택 (Tech Stack)
* **Client App:** React Native (Expo), TypeScript, Expo Location, Tailwind CSS
* **Admin Web:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons
* **Backend (Policy / Gateway):** Node.js, Express.js, JWT, Bcrypt, http-proxy-middleware
* **Database:** MySQL 8.x

## 5. 빠른 시작 (Getting Started)

### 환경 변수 설정 (`.env`)
서버와 클라이언트의 `.env` 파일을 생성하고 DB 및 JWT 정보를 설정합니다. (로컬 테스트용)
```env
JWT_SECRET=your_super_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=ztna
```

### 서버 및 클라이언트 실행
터미널을 여러 개 열어 다음 순서대로 실행합니다.

1. **Target Server (보호된 내부망 구동)**
   ```bash
   cd ztna-gateway
   node target.js
   ```
2. **Policy Server (인증 및 위험도 엔진)**
   ```bash
   cd ztna-policy-server
   npm install
   node server.js
   ```
3. **ZTNA Gateway (문지기 프록시)**
   ```bash
   cd ztna-gateway
   npm install
   node server.js
   ```
4. **Admin Web Dashboard (관리자 웹 관제)**
   ```bash
   cd ztna-admin-web
   npm install
   npm run dev
   ```
5. **Client App (모바일 앱 실행)**
   ```bash
   cd ztna-client
   npm install
   npx expo start
   ```

> **상세 기획 및 문서:** 전체 아키텍처 명세 및 세부 위험도 점수 기준은 프로젝트 루트의 `Project_Comprehensive_Spec.md` 및 `risk_score_comparison.md` 파일을 참조하세요.
