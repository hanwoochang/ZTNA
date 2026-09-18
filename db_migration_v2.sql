-- 1단계: users 테이블 구조 변경 (RBAC 도입)
-- ENUM을 사용할 수 있지만, 향후 확장을 고려하여 VARCHAR로 처리하거나 ENUM으로 선언합니다.
-- 이미 존재하는 컬럼일 수 있으므로 에러를 무시하기 위해 프로시저를 사용할 수 있지만, 간단하게 실행하겠습니다.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('ADMIN', 'FINANCE', 'HR', 'DEV', 'GENERAL') DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT '일반부서',
ADD COLUMN IF NOT EXISTS name VARCHAR(50) DEFAULT '이름없음',
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;

-- 2단계: devices 테이블 구조 변경 (기기 속성 도입)
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS device_type ENUM('CORPORATE', 'BYOD') DEFAULT 'BYOD',
ADD COLUMN IF NOT EXISTS is_compliant TINYINT(1) DEFAULT 1;

-- 3단계: 테스트용 시드(Seed) 데이터 추가
-- 관리자 계정 생성 (비밀번호는 모두 1234를 bcrypt로 해싱한 값 사용)
-- bcrypt hash for '1234' = $2b$10$U.CqYV2z5b4yY6jX5F3P2eJ9iG6B5x4Y3P2eJ9iG6B5x4Y3P2eJ9i (will insert a standard valid one or create through signup later. Or just use a known hash. Wait, I will use a simple known hash for 'password123' if possible, or I can just write a script to register them via the API.
-- Actually, let's just create a Node.js script to do this properly so we have correct bcrypt hashes.
