# ZTNA 솔루션 기술 명세서 (Technical Specification)

## 1. 시스템 아키텍처 (System Architecture)
본 시스템은 **Client - Control Plane - Data Plane**으로 구성된 전형적인 ZTNA 아키텍처를 따른다.

- **Control Plane**: `ztna-policy-server` (인증 및 정책 결정)
- **Data Plane**: `ztna-gateway` (트래픽 중계 및 검증)
- **Client**: `ztna-client` (컨텍스트 수집 및 인증 인터페이스)

## 2. 기술 스택 (Tech Stack)

### 2.1 Backend (Servers)
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **Libraries**:
    - `jsonwebtoken`: JWT 생성 및 검증
    - `bcrypt`: 비밀번호 해싱
    - `http-proxy-middleware`: 리버스 프록시 구현
    - `nodemailer`: OTP 메일 발송

### 2.2 Frontend (Mobile Client)
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Security**: `expo-secure-store` (토큰 저장), `expo-device` (기기 정보), `expo-location` (GPS)

## 3. 핵심 알고리즘 및 로직

### 3.1 위험 점수(Risk Score) 산출 로직
접근 요청 시 다음 항목을 합산하여 최종 점수를 산출한다.
- **기기 신뢰도**: 미등록 기기(+30점), 비신뢰 기기(+100점)
- **네트워크 위치**: 새로운 IP 접속(+20점), 위치 정보 없음(+15점)
- **물리적 이동 속도**: 1,000km/h 이상(+50점), 500km/h 이상(+30점)
- **환경 컨텍스트**: 비정상 시간대(+20점), 모바일 데이터 접속(+20점), 배터리 급감(+20점)

### 3.2 위험도별 액션 (Action Matrix)
- **Score < 30**: `ALLOWED` (즉시 JWT 발급)
- **30 <= Score < 70**: `STEP_UP` (OTP 인증 프로세스 시작)
- **Score >= 70**: `DENIED` (접근 즉시 차단)

## 4. 데이터베이스 스키마 (주요 테이블)

- **users**: 사용자 정보, 해시된 비밀번호, OTP 정보 저장.
- **devices**: 기기 식별자, 신뢰 여부, 마지막 접속 IP 및 위치 정보.
- **access_logs**: 모든 로그인 시도의 위험 점수, 사유, 결과 기록.
- **token_blacklist**: 폐기된 JWT의 JTI(Unique ID) 저장.

## 5. API 명세 (핵심 엔드포인트)

### 5.1 Policy Server
- `POST /api/signup`: 회원가입
- `POST /api/login`: 로그인 및 컨텍스트 전달 (위험도 평가)
- `POST /api/verify-otp`: 2차 인증 확인
- `POST /api/logout`: 세션 종료 및 토큰 폐기
- `POST /api/verify-context`: 하트비트 세션 유효성 검증

### 5.2 Gateway
- `ALL /private/*`: 프라이빗 리소스 접근 (JWT 검증 필수)

## 6. 보안 프로토콜 (Security Protocols)
1.  **지속적 검증(Continuous Verification)**: 발급된 JWT는 짧은 유효기간(5분)을 가지며, 하트비트를 통해 갱신된다.
2.  **즉각적 무효화(Instant Revocation)**: 로그아웃 시 JTI를 DB 블랙리스트에 등록하고, 게이트웨이는 매 요청마다 이를 대조한다.
3.  **Impossible Travel 감지**: Haversine 공식을 사용하여 물리적으로 이동 가능한 거리를 초과한 접근을 원천 차단한다.
