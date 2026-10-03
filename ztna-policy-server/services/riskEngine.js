// 위험도 산출 엔진 (CARTA)
const { calculateDistance } = require('../utils/distance');

const evaluateRisk = (currentDevice, ipAddress, latitude, longitude, lastLoginData, loginHour) => {
    let riskScore = 0;
    let reasons = [];
    const now = new Date();

    // 1. 기기 신뢰도 무결성 가산
    if (!currentDevice) {
        // 신규 미등록 기기
        riskScore += 30;
        reasons.push('신규 미등록 기기 (OTP 등록 후 어드민 승인 필요)');
    } else if (currentDevice.is_compliant === 0) {
        riskScore = 100;
        reasons.push('보안 컴플라이언스 위반 기기 (무결성 훼손)');
    }

    // 2. 위치 및 네트워크 기반 위험도 가산
    if (latitude && longitude && currentDevice?.last_latitude && currentDevice?.last_longitude) {
        const distance = calculateDistance(currentDevice.last_latitude, currentDevice.last_longitude, latitude, longitude);
        
        if (lastLoginData) {
            const timeDiffHours = (now - new Date(lastLoginData.created_at)) / 1000 / 3600;
            if (timeDiffHours > 0) {
                const speed = distance / timeDiffHours;
                if (speed > 1000) { riskScore += 70; reasons.push(`물리적으로 불가능한 이동 속도 (1,000km/h 초과)`); }
                else if (speed > 500) { riskScore += 30; reasons.push(`비정상적인 고속 이동 패턴 (500~1,000km/h)`); }
                else if (distance > 500) { riskScore += 20; reasons.push(`장거리 이동 (500km 초과)`); }
                else if (distance >= 100) { riskScore += 10; reasons.push(`중거리 이동 (100~500km)`); }
            }
        } else {
            if (distance > 500) { riskScore += 20; reasons.push(`장거리 이동 (500km 초과)`); }
            else if (distance >= 100) { riskScore += 10; reasons.push(`중거리 이동 (100~500km)`); }
        }
    } else if (currentDevice && (!latitude || !longitude)) {
        riskScore += 15;
        reasons.push('모바일 앱의 GPS 위치 정보 권한 강제 거부 상태');
    }

    // 3. 새로운 IP 주소 대역 접속 감지
    if (currentDevice && currentDevice.last_ip_address && currentDevice.last_ip_address !== ipAddress) {
        riskScore += 20;
        reasons.push('기존 접속 이력이 없는 새로운 IP 주소 대역 접속');
    }

    // 4. 시간대 기반 위험도 가산
    if (loginHour >= 2 && loginHour <= 5) { 
        riskScore += 15; reasons.push(`비정상 활동 시간대 (새벽 2시 ~ 5시 사이 접속)`); 
    } else if (loginHour < 9 || loginHour >= 18) {
        riskScore += 15; reasons.push(`평소와 다른 시간대 접속`);
    }

    return { riskScore, reasons };
};

module.exports = { calculateDistance, evaluateRisk };
