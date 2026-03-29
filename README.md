# Mini ZTNA (Zero Trust Network Access) Architecture

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-Upcoming-61DAFB?logo=react&logoColor=black)

> **"결코 신뢰하지 말고, 항상 검증하라 (Never Trust, Always Verify)"**
> 
> 단일 비밀번호 인증의 한계를 넘어, 사용자 기기 및 네트워크 컨텍스트(Context)를 실시간으로 평가하여 내부망 접근을 동적으로 제어하는 마이크로서비스 아키텍처(MSA) 기반 제로 트러스트 보안 시스템입니다.

## 1. 프로젝트 개요 (Project Overview)
기존의 경계 기반(Perimeter-based) 보안 모델을 탈피하고, 모든 접근 요청을 의심하고 검증하는 ZTNA 환경을 구축합니다. 모바일 에이전트(App)를 통해 수집된 사용자의 단말기 상태와 IP 정보를 바탕으로 **동적 위험도 평가(Dynamic Risk Scoring)**를 수행하며, ZTNA Gateway(Proxy)를 통해 철저하게 인가된 트래픽만 내부망으로 라우팅합니다.

## 2. 시스템 아키텍처 (System Architecture)
본 프로젝트는 완벽한 망 분리와 역할 분담을 위해 4개의 독립된 노드(Node)로 구성됩니다.

1. ** Client Agent (App):** 기기 고유 식별자(UUID) 및 IP 수집, 인증 요청
2. ** Policy Server (Port 3000):** 신원 검증, 위험도 산출, JWT 출입증 발급
3. ** ZTNA Gateway (Port 4000):** JWT 인가 검증 및 리버스 프록시 라우팅
4. ** Target Server (Port 5000):** 외부 접근이 원천 차단된 보호 대상 내부망

## 3. 핵심 보안 기능 (Key Security Features)
* **컨텍스트 기반 동적 위험도 산출:** 로그인 시 '미등록 기기', 'IP 변경' 등의 이상 징후를 탐지하여 위험도 점수 산출 및 접근 제어 (Allowed / Step-up / Denied).
* **Target Server 우회 방지 (Microsegmentation):** 보호 대상 서버의 리스닝 포트를 루프백(`127.0.0.1`)으로 바인딩하여 OS 네트워크 스택 단에서 외부 직접 접근을 원천 차단.
* **무상태(Stateless) 중앙 통제:** 모든 인가 로직은 세션 없이 JWT 위변조 및 만료 시간 검증을 통해 Gateway에서 중앙 처리.
* **보안 감사 로그 (Audit Trail):** 모든 접근 시도, 평가 점수, 처리 결과 및 사유를 DB(`access_logs`)에 실시간 적재.

## 4. 기술 스택 (Tech Stack)
* **Backend:** Node.js, Express.js, http-proxy-middleware
* **Frontend:** React Native (예정)
* **Database:** MySQL 8.x
* **Security:** JSON Web Token (JWT), Bcrypt

## 5. 시작하기 (Getting Started)

### 환경 변수 설정 (`.env`)
각 서버의 최상위 디렉토리에 `.env` 파일을 생성하고 아래 값을 설정합니다.
```env
# Policy Server & Gateway 공통
JWT_SECRET=your_super_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=ztna
```

1. Target Server 실행 (보호된 내부망)
$cd ztna-gateway$ node target.js
2. Policy Server 실행 (인증 및 정책 엔진)
$cd ztna-policy-server$ npm install
$ node server.js
3. ZTNA Gateway 실행 (문지기 프록시)
$cd ztna-gateway$ npm install
$ node server.js
