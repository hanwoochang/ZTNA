require('dotenv').config();
const axios = require('axios');
const pool = require('./db');
const bcrypt = require('bcrypt');

const API_URL = 'http://localhost:3000/api';

async function setupTestData() {
    console.log('[1] 시뮬레이션용 기기 데이터 셋업 중...');
    const hashedPw = await bcrypt.hash('1234', 10);
    
    // 시뮬레이션용 유저가 없으면 생성
    await pool.query('INSERT IGNORE INTO users (email, password_hash, role, department, name, is_active) VALUES (?, ?, ?, ?, ?, 1)', 
        ['sim_user@company.com', hashedPw, 'FINANCE', '재무팀', '시뮬레이터']);
    
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', ['sim_user@company.com']);
    const userId = users[0].id;

    // 시나리오 A용 기기 (MDM, 사내지급)
    await pool.query('INSERT IGNORE INTO devices (user_id, device_identifier, device_type, is_compliant, is_trusted) VALUES (?, ?, ?, 1, 1)', 
        [userId, 'SIM-DEV-CORP', 'CORPORATE']);
    
    // 시나리오 B용 기기 (BYOD, 개인기기)
    await pool.query('INSERT IGNORE INTO devices (user_id, device_identifier, device_type, is_compliant, is_trusted) VALUES (?, ?, ?, 1, 1)', 
        [userId, 'SIM-DEV-BYOD', 'BYOD']);
        
    console.log('✅ 셋업 완료\n');
}

async function runSimulations() {
    try {
        await setupTestData();

        console.log('==================================================');
        console.log('🚀 [시나리오 A] 사내 지급 기기(MDM)로 정상 접속 시도');
        console.log('==================================================');
        try {
            const resA = await axios.post(`${API_URL}/login`, {
                email: 'sim_user@company.com',
                password: '1234',
                deviceId: 'SIM-DEV-CORP' // MDM 기기
            });
            console.log(`결과 상태코드: ${resA.status}`);
            console.log(`응답 메시지: ${resA.data.message}`);
            if(resA.data.token) console.log(`👉 결과: ALLOW (토큰 발급 완료)`);
        } catch (err) {
            console.log(`에러: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }
        console.log('\n');

        console.log('==================================================');
        console.log('📱 [시나리오 B] 퇴근 후 개인 기기(BYOD)로 접속 시도');
        console.log('==================================================');
        try {
            const resB = await axios.post(`${API_URL}/login`, {
                email: 'sim_user@company.com',
                password: '1234',
                deviceId: 'SIM-DEV-BYOD' // BYOD 기기
            });
            console.log(`결과 상태코드: ${resB.status}`);
            console.log(`응답 메시지: ${resB.data.message}`);
            if(resB.data.requiresOtp) console.log(`👉 결과: STEP_UP (2차 인증 요구됨)`);
        } catch (err) {
            console.log(`에러: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }
        console.log('\n');

        console.log('==================================================');
        console.log('💀 [시나리오 C] 미등록/해킹 의심 기기로 무단 접속 시도');
        console.log('==================================================');
        try {
            const resC = await axios.post(`${API_URL}/login`, {
                email: 'sim_user@company.com',
                password: '1234',
                deviceId: 'UNKNOWN-HACKER-DEVICE' // 등록되지 않은 기기
            });
            console.log(`결과 상태코드: ${resC.status}`);
            console.log(`응답 메시지: ${resC.data.message}`);
        } catch (err) {
            console.log(`결과 상태코드: ${err.response?.status}`);
            console.log(`응답 메시지: ${err.response?.data?.message}`);
            console.log(`차단 사유: ${err.response?.data?.reasons?.join(', ')}`);
            console.log(`👉 결과: DENY (원천 차단됨)`);
        }
        console.log('\n==================================================');
        process.exit(0);

    } catch (error) {
        console.error('시뮬레이션 중 치명적 에러 발생:', error.message);
        process.exit(1);
    }
}

runSimulations();
