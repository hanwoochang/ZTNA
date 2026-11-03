# ZTNA 클라이언트 앱 & 관리자 웹 설치 및 접속 가이드

본 문서는 배포된 AWS EC2 클라우드 인프라와 통신하는 **안드로이드 모바일 앱(APK)** 설치 방법, **아이폰(iOS) 구동 방법**, 그리고 **관리자 웹(Admin Web)** 접속 방법을 상세히 안내합니다.

---

## 1. 안드로이드 (Android) APK 설치 방법

안드로이드 스마트폰에서는 별도의 스토어 인증 없이 독립 실행형 `.apk` 파일을 직접 다운로드받아 설치할 수 있습니다.

### [1단계] 설치 파일 다운로드
스마트폰의 모바일 브라우저(Chrome, 삼성 인터넷 등)에서 아래 링크 중 하나를 선택하여 다운로드합니다:

*   **Expo 공식 최신 빌드 페이지 (PC 화면에서 QR 스캔 및 최신 APK 다운로드 가능):**  
    [https://expo.dev/accounts/hanwoochang/projects/ztna-client/builds/4e456877-6e20-4b30-827a-aff2c780a58d](https://expo.dev/accounts/hanwoochang/projects/ztna-client/builds/4e456877-6e20-4b30-827a-aff2c780a58d)
*   **이전 안정화 APK 직접 다운로드 URL:**  
    [https://expo.dev/artifacts/eas/qRerr84_BYfY9gku85sc0qhWVUbn9KjzM7vITBAssuM.apk](https://expo.dev/artifacts/eas/qRerr84_BYfY9gku85sc0qhWVUbn9KjzM7vITBAssuM.apk)

### [2단계] 보안 설정 및 설치 진행
1. 다운로드가 완료되면 상단 알림창을 내리거나, 스마트폰의 **[내 파일] -> [다운로드]** 폴더로 이동합니다.
2. 다운로드된 `qRerr84_BYfY9gku85sc0qhWVUbn9KjzM7vITBAssuM.apk` 파일을 터치합니다.
3. **"보안상의 이유로 이 출처의 알 수 없는 앱을 설치할 수 없습니다"** 팝업이 뜨는 경우:
   - **[설정]** 버튼 터치
   - 해당 브라우저(예: Chrome) 항목 옆의 **[이 출처의 앱 허용] 토글 스위치를 활성화(ON)**
   - 뒤로가기 버튼을 눌러 설치 화면으로 복귀
4. **"이 앱을 설치하시겠습니까?"** 화면에서 **[설치]**를 터치합니다.
5. Google Play 프로텍트 경고("차단된 앱" 또는 "알 수 없는 개발자")가 나타나는 경우:
   - **[세부정보 더보기]** 또는 **[세부정보 확인]** 클릭
   - **[무시하고 설치]** 또는 **[그래도 설치]** 선택

### [3단계] 앱 실행 및 권한 허용
1. 설치가 완료되면 홈 화면이나 앱 서랍에 생성된 **`ztna-client`** 아이콘을 터치하여 실행합니다.
2. 앱 실행 시 요청되는 필수 권한을 허용합니다:
   - **생체 인증(지문/얼굴 인식) 권한**: 기밀망 출입 시 생체 인증 검증에 사용
   - **위치 권한**: 위험 점수(PDP) 평가를 위한 현재 위치 정보 수집에 사용

---

## 2. 아이폰 (iOS) 구동 및 테스트 방법

애플(Apple)의 정책상 일반 파일(.apk 또는 .ipa)의 직접 설치가 제한되어 있으므로, Expo 개발자 도구를 통해 정식 기능과 동일하게 실행합니다.

### [1단계] Expo Go 앱 설치
1. 아이폰의 **App Store**를 실행합니다.
2. 검색창에 **`Expo Go`**를 입력하고 무료로 다운로드하여 설치합니다.

### [2단계] PC에서 개발 서버 구동
1. PC 터미널에서 모바일 클라이언트 폴더로 이동합니다:
   ```bash
   cd C:\ZTNA\ztna\ztna-client
   ```
2. Expo 개발 서버를 실행합니다:
   ```bash
   npx expo start
   ```
3. 터미널 창에 대형 QR 코드가 생성됩니다.

### [3단계] 아이폰으로 QR 코드 스캔
1. 아이폰의 **기본 카메라 앱**을 켭니다.
2. PC 터미널 화면에 떠 있는 **QR 코드를 카메라로 비춥니다**.
3. 노란색으로 뜨는 **"Expo Go에서 열기"** 배너를 터치합니다.
4. ZTNA 클라이언트 앱이 실행되며 AWS EC2 클라우드 서버와 정상 연동됩니다.

---

## 3. 관리자 웹 (Admin Web) 및 클라이언트 웹 (Client Web) 접속 방법

관리자 웹과 클라이언트 웹은 AWS EC2 Nginx 리버스 프록시 및 Let's Encrypt SSL/TLS 인증서(HTTPS)가 적용된 도메인으로 배포되어 있으며, PC나 모바일 기기의 웹 브라우저에서 즉시 접속할 수 있습니다.

*   **관리자 웹 (Admin Web Dashboard) 접속 URL:** `https://ztna-core.duckdns.org`
*   **클라이언트 웹 (Client Web Portal) 접속 URL:** `https://ztna-core.duckdns.org/app/`
*   **포트:** 443 (HTTPS 기본 포트이므로 포트 번호 입력 생략 가능, HTTP 80 접속 시 자동으로 HTTPS로 리다이렉트됨)
*   **지원 브라우저:** Chrome, Edge, Safari, Firefox 등 모든 최신 브라우저
*   **모바일 보안 정책 안내:** 모바일 앱으로 사내 기밀망(`IntranetScreen`) 진입 시 `expo-screen-capture`에 의해 화면 캡처 및 녹화가 자동으로 차단되며, `expo-device` 기반 루팅/탈옥(`isRootedExperimentalAsync`) 감지 시 위험도 점수가 가산되어 접근이 통제됩니다.

---

## 4. 테스트 로그인 계정 안내

모바일 앱, 클라이언트 웹 및 관리자 웹에서 바로 테스트할 수 있는 기본 시드 계정(`migrate_db.js` 기준) 정보입니다.

| 구분 | 이메일 | 비밀번호 | 권한 (Role) | 직급 (Position) | 단말/보안 특성 및 접근 허용 범위 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **최고 관리자** | `admin@company.com` | `1234` | ADMIN | 임원 (Level 6) | 관리자 웹 대시보드, 전체 기밀문서 열람/업로드/삭제, 전 사원 및 단말 제어 |
| **재무팀 정직원 (법인폰)** | `finance_corp@company.com` | `1234` | USER | 과장 (Level 3) | 법인 기기(`CORPORATE`) 승인, 사내 일정(Schedule) 조회/등록, 공지사항 작성/삭제, 기밀문서 업로드 및 다운로드 허용 |
| **재무팀 신입 (개인다운로드 통제)** | `finance_byod@company.com` | `1234` | USER | 사원 (Level 1) | 개인 기기(`BYOD`) 승인, 사내망 기본 조회 및 출퇴근 기록 가능 (단, `BYOD` 정책에 따라 기밀문서 다운로드 차단 및 Schedule 탭 비노출) |
| **재무팀 주의직원 (취약단말)** | `finance_vuln@company.com` | `1234` | USER | 대리 (Level 2) | 취약 OS/루팅 위험 시나리오 테스트용 계정 (대리 직급 이상이므로 정상 기기 접속 시 공지사항 및 일정 등록 가능, 기밀문서 업로드는 과장 이상만 가능) |

> **참고:** 관리자 계정(`admin@company.com`)은 관리자 웹(`https://ztna-core.duckdns.org`) 전용 로그인과 클라이언트 웹/모바일 앱(`https://ztna-core.duckdns.org/app/`) 로그인 모두 가능합니다. 사내망 내 공지사항 및 일정 등록/삭제는 **대리(Level 2) 이상**, 기밀문서 업로드 및 삭제는 **과장(Level 3) 이상** 또는 `ADMIN`에게 허용됩니다.
