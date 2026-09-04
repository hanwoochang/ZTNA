-- ZTNA v2.0 신규 기능 테이블 스키마 (1주차)

-- 1. 인트라넷 전용 기밀문서 열람 및 API 접근 로그 테이블
CREATE TABLE IF NOT EXISTS intranet_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 모바일 사원증 기반 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    date_record DATE NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, date_record),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
