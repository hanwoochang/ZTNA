# 🛡️ Enterprise-Grade ZTNA (Zero Trust Network Access) Architecture

> **"Never Trust, Always Verify." (아무것도 신뢰하지 말고, 항상 검증하라)**

기존 경계 기반(Perimeter-based) 보안 모델의 한계를 극복하기 위해 설계된 **지능형 제로 트러스트 아키텍처(ZTNA) 프로젝트**입니다. 사용자의 신원, 기기 무결성, 위치, 행동 패턴(UEBA), 모바일 위협(MTD)을 실시간으로 종합 평가하여 내부망의 1급 기밀 서버를 완벽하게 보호합니다.

## 🌟 Architecture Overview

본 프로젝트는 ZTNA의 핵심 구성 요소인 4-Tier 아키텍처로 설계되었습니다.

1. **📱 Client Agent (React Native):** 기기 상태 및 텔레메트리(배터리, 네트워크, 위치) 수집, 실시간 컨텍스트 동기화 및 Heartbeat 통신.
2. **🧠 Policy Server (PDP - Node.js/MySQL):** 지능형 위험도 평가 엔진, 동적 JWT 출입증 발급, OTP 2차 인증 및 세션 통제.
3. **🚪 Gateway (PEP - Express Proxy):** 타겟 서버 앞단에 위치하여 실시간 JWT 서명 및 블랙리스트 검증을 수행하는 프록시 방화벽.
4. **🏢 Target Server (Stealth Node):** 루프백(`127.0.0.1`) 바인딩을 통해 외부 포트 스캐닝을 원천 차단한 물리적/논리적 격리망.

---

## 🔥 핵심 보안 인텔리전스 (Key Security Features)

### 1. 지능형 행위 기반 분석 (UEBA - User Entity Behavior Analytics)
단순 인증을 넘어 사용자의 과거 접속 패턴을 학습하여 이상 징후를 감지합니다.
* **동적 시간대 프로파일링:** 최근 10회 접속 시간의 평균을 산출하여, 평소와 4시간 이상 차이 나는 이례적인 시간대 접근 시 페널티 부여.
* **심야 시간대 제어:** 해킹 시도가 빈번한 심야(02시~05시) 접속 시 선제적 위험도(Risk Score) 상승 처리.

### 2. 불가능한 이동 감지 (Impossible Travel)
GPS 좌표와 시간차를 계산하여 세션 탈취 및 VPN 우회 공격을 방어합니다.
* **Haversine 속도 계산 엔진:** 이전 접속 위치(위도/경도)와 현재 위치의 거리를 구하고, 경과 시간으로 나누어 **이동 속도(km/h)**를 정밀 산출.
* **물리적 제약 검증:** 이동 속도가 500km/h(고속 이동 의심) ~ 1000km/h(비행기 속도 초과)를 넘을 경우, 물리적으로 불가능한 접속으로 간주하여 즉시 차단(Denied).

### 3. 모바일 위협 방어 (MTD - Mobile Threat Defense)
에이전트 앱이 하드웨어 텔레메트리를 분석하여 숨겨진 악성코드(Malware)를 탐지합니다.
* **배터리 이상 급감 감지:** 백그라운드 크립토재킹(Cryptojacking)이나 스파이웨어 구동을 의심하여, 단시간 내 배터리가 20% 이상 급감한 상태에서 접근 시 페널티 부여.
* **네트워크 컨텍스트 스캔:** 안전한 Wi-Fi 환경이 아닌 5G/LTE 모바일 데이터 접속 시 보안 컨텍스트 하향 조정.
* **기기 무결성 (Anti-Tampering):** 탈옥(Jailbreak), 루팅(Rooting), 에뮬레이터(AVD 등) 환경에서의 앱 구동 및 내부망 접근 원천 차단.

### 4. 동적 정책 집행 및 네트워크 은폐 (Dynamic Enforcement & Cloaking)
* **단계적 인증 (Step-up Authentication):** 위험도 점수가 30점 이상~70점 미만일 경우 즉시 차단하지 않고, 이메일 OTP를 통한 2차 인증 강제.
* **초단기 슬라이딩 세션 & 실시간 파기:** JWT 수명을 5분으로 제한하고, 에이전트의 1분 주기 Heartbeat 성공 시에만 갱신. 보안 위반 감지 시 토큰 식별자(`jti`)를 즉시 블랙리스트에 등록하여 0.1초 만에 논리적 차단.
* **서버 스텔스화 (Stealth Network):** 타겟 서버의 외부망(`0.0.0.0`) 노출을 끊어 해커의 정찰(Reconnaissance) 공격 완벽 무력화.

---

## 🛠️ Tech Stack

* **Frontend (Agent):** React Native, Expo (Device, Location, Battery, SecureStore)
* **Backend (PDP/PEP):** Node.js, Express, HTTP-Proxy-Middleware, Axios
* **Database:** MySQL 8.0 (Connection Pool, JWT Blacklist)
* **Security:** `express-rate-limit` (Brute-force 방어), `bcrypt` (단방향 암호화), JWT (Stateless Auth)

---

## ⚙️ Getting Started (설치 및 실행 방법)

### 1. Database Setup
MySQL 환경에 `ztna` 데이터베이스를 생성하고 아래 쿼리를 실행합니다.
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    otp_code VARCHAR(255),
    otp_expiry DATETIME,
    otp_attempts INT DEFAULT 0
);

CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    device_identifier VARCHAR(255) NOT NULL,
    is_trusted BOOLEAN DEFAULT 1,
    last_ip_address VARCHAR(50),
    last_latitude DECIMAL(10, 8) NULL,
    last_longitude DECIMAL(11, 8) NULL,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    device_id INT,
    ip_address VARCHAR(50),
    risk_score INT,
    action_taken VARCHAR(50),
    reason TEXT,
    login_hour INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jti VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL
);
