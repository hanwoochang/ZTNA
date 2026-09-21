require('dotenv').config();
const pool = require('./db');

async function generateMockLogs() {
    try {
        console.log('더미 데이터(Mock Logs) 생성을 시작합니다...');
        
        // 1. 기존 유저 목록 가져오기
        const [users] = await pool.query('SELECT id FROM users');
        if (users.length === 0) {
            console.log('유저가 없습니다. 유저를 먼저 생성해주세요.');
            process.exit(1);
        }
        
        const userIds = users.map(u => u.id);
        const logsToInsert = [];
        const now = new Date();
        
        // 2. 과거 24시간 동안 총 150개의 더미 로그 생성
        for (let i = 0; i < 150; i++) {
            const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
            
            // 시간 설정 (과거 24시간 내 무작위)
            const hoursAgo = Math.floor(Math.random() * 24);
            const logTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) - (Math.floor(Math.random() * 60) * 60000));
            
            // 위험도 시나리오 설정
            // 새벽 시간(0시 ~ 5시)에는 위험도를 높게 책정 (해킹 시도 가정)
            const logHour = logTime.getHours();
            let riskScore, actionTaken, reason, ipAddress;
            
            if (logHour >= 0 && logHour <= 5) {
                // 심야/새벽 이상 접근 (위험)
                riskScore = Math.floor(Math.random() * 30) + 70; // 70 ~ 99
                actionTaken = 'DENY';
                reason = `[MOCK] 비인가 기기 및 심야 시간대 해외 IP 접근`;
                ipAddress = `104.28.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`; // Fake 해외 IP
            } else if (logHour >= 18 || logHour === 12) {
                // 퇴근 후 또는 점심시간 (경고/OTP 요구)
                riskScore = Math.floor(Math.random() * 20) + 30; // 30 ~ 49
                actionTaken = 'STEP_UP';
                reason = `[MOCK] 외부망(BYOD) 접근 - 추가 인증 요구`;
                ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`;
            } else {
                // 업무 시간 (정상)
                riskScore = Math.floor(Math.random() * 10); // 0 ~ 9
                actionTaken = 'ALLOW';
                reason = `[MOCK] 사내망 MDM 기기 정상 접근`;
                ipAddress = `10.0.0.${Math.floor(Math.random() * 255)}`;
            }
            
            // 3. 특정 유저(랜덤 배정) 1~2명에게 의도적으로 높은 위험도 몰아주기 (Top 5 랭킹 테스트용)
            if (i % 15 === 0) {
                riskScore = 95;
                actionTaken = 'DENY';
                reason = `[MOCK] 블랙리스트 IP 지속적 로그인 시도`;
                ipAddress = `99.99.99.99`;
            }

            logsToInsert.push([
                randomUserId,
                ipAddress,
                riskScore,
                actionTaken,
                reason,
                logTime
            ]);
        }
        
        // 4. DB에 일괄 삽입
        await pool.query(
            'INSERT INTO access_logs (user_id, ip_address, risk_score, action_taken, reason, created_at) VALUES ?',
            [logsToInsert]
        );
        
        console.log(`✅ 성공적으로 150개의 더미(Mock) 로그가 생성되었습니다!`);
        console.log(`차트에서 시간대별 추이 및 유저 랭킹을 확인해 보세요.`);
        process.exit(0);
        
    } catch (error) {
        console.error('더미 데이터 생성 중 오류 발생:', error);
        process.exit(1);
    }
}

generateMockLogs();
