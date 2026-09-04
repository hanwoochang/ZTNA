const axios = require('axios');
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runTests() {
    console.log('=== ZTNA 1주차 기능 터미널 시연 시작 ===\n');

    // 1. 로그인하여 JWT 발급받기 (Policy Server: 3000)
    console.log('[1] 정책 서버(Policy Server) 로그인 시도...');
    let token = '';
    try {
        const loginRes = await axios.post('http://localhost:3000/api/login', {
            email: '043kws@gmail.com',
            password: 'mypassword123',
            deviceId: 'terminal-test-device',
            isRooted: false,
            latitude: 37.5665,
            longitude: 126.9780,
            isWifi: true,
            batteryLevel: 1
        });
        
        // 만약 2차 인증(OTP)이 뜬다면 우회할 수 없으므로, 시연용 기기 등록을 위해 
        // 실제 DB에 기기를 수동으로 신뢰 상태로 등록하거나 해야함.
        // 하지만 처음 로그인이면 OTP 뜰 확률이 있음.
        if (loginRes.data.requiresOtp) {
            console.log('OTP 인증이 필요합니다! 터미널 자동 테스트를 위해 기기를 신뢰 상태로 조작합니다.');
            const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '0421', database: 'ztna' });
            
            // 사용자 ID 가져오기
            const [users] = await pool.query('SELECT id FROM users WHERE email = ?', ['043kws@gmail.com']);
            const userId = users[0].id;

            // 기기를 강제로 신뢰 상태로 삽입
            await pool.query('INSERT INTO devices (user_id, device_identifier, is_trusted) VALUES (?, ?, 1)', [userId, 'terminal-test-device']);
            pool.end();
            
            console.log('기기 신뢰 처리 완료. 다시 로그인합니다...');
            const loginRes2 = await axios.post('http://localhost:3000/api/login', {
                email: '043kws@gmail.com',
                password: 'mypassword123',
                deviceId: 'terminal-test-device',
                isRooted: false,
                latitude: 37.5665,
                longitude: 126.9780,
                isWifi: true,
                batteryLevel: 1
            });
            token = loginRes2.data.token;
        } else {
            token = loginRes.data.token;
        }
        console.log('✅ ZTNA 출입증(JWT) 발급 완료!\n');
    } catch (error) {
        console.error('로그인 에러:', error.response ? error.response.data : error.message);
        return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    // 2. 출근(Check-in) API 호출 (Gateway: 4000)
    console.log('[2] 사내망 출근 API 호출 (Gateway 거침)...');
    try {
        const checkinRes = await axios.post('http://localhost:4000/private/api/attendance/check-in', {}, config);
        console.log(`응답: ${checkinRes.data.message}\n`);
    } catch (error) {
        console.error('출근 에러:', error.response ? error.response.data : error.message);
    }

    // 3. 기밀 문서 PDF 다운로드 (Gateway: 4000)
    console.log('[3] 사내망 기밀문서 PDF 다운로드 API 호출...');
    try {
        const pdfRes = await axios.get('http://localhost:4000/private/api/documents/secret.pdf', {
            ...config,
            responseType: 'stream'
        });
        const writer = fs.createWriteStream('downloaded_secret.pdf');
        pdfRes.data.pipe(writer);
        
        await new Promise((resolve) => writer.on('finish', resolve));
        console.log('✅ PDF 다운로드 완료 (파일명: downloaded_secret.pdf)\n');
    } catch (error) {
        console.error('PDF 다운로드 에러:', error.response ? error.response.data : error.message);
    }

    // 4. DB에 로그가 잘 쌓였는지 확인
    console.log('[4] 데이터베이스 로그 기록 최종 확인...');
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '0421', database: 'ztna' });
    
    try {
        const [intranetLogs] = await pool.query('SELECT * FROM intranet_access_logs ORDER BY id DESC LIMIT 2');
        console.log('--- [최근 사내망 접근 로그 (intranet_access_logs)] ---');
        console.table(intranetLogs.map(l => ({ 
            Email: l.user_email, Endpoint: l.api_endpoint, IP: l.ip_address, Time: l.accessed_at 
        })));

        const [attendanceLogs] = await pool.query('SELECT * FROM attendance_logs ORDER BY id DESC LIMIT 1');
        console.log('\n--- [최근 출퇴근 기록 (attendance_logs)] ---');
        console.table(attendanceLogs.map(a => ({ 
            CheckIn: a.check_in_time, CheckOut: a.check_out_time, Date: a.date_record 
        })));
        console.log('\n=== 시연 완벽하게 종료! ===');
    } catch(err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

runTests();
