// 1. 필요한 라이브러리들 불러오기
require('dotenv').config(); // .env 파일의 설정값들을 읽어옴
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // 비동기(async/await) 방식으로 DB와 통신

const app = express();
const port = process.env.PORT || 3000;

// 2. 미들웨어 설정 (요청을 받기 전 거치는 관문)
app.use(cors()); // 다른 도메인(React Native 앱 등)에서 오는 요청을 허용
app.use(express.json()); // 클라이언트가 보내는 JSON 형식의 데이터를 읽을 수 있게 해줌

// 3. MySQL 데이터베이스 연결 설정 (커넥션 풀 생성)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 4. 간단한 테스트용 API (서버와 DB가 잘 살아있는지 확인하는 용도)
app.get('/api/health', async (req, res) => {
    try {
        // DB에 아주 간단한 쿼리를 날려봄
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ message: ' ZTNA 정책 서버 정상 작동 중!', db_status: 'Connected' });
    } catch (error) {
        res.status(500).json({ message: ' 서버는 켜졌으나 DB 연결 실패', error: error.message });
    }
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- [API 1] 회원가입 (비밀번호 암호화해서 DB에 저장) ---
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. 비밀번호 암호화 (해싱)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. DB에 사용자 저장
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [email, hashedPassword]
        );

        res.status(201).json({ message: '회원가입 성공!', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
        }
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// --- [API 2] 로그인 (동적 위험도 평가 엔진 탑재!) ---
app.post('/api/login', async (req, res) => {
    // 앱(클라이언트)에서 이제 비밀번호뿐만 아니라 기기 ID와 IP 주소도 같이 보내줍니다!
    const { email, password, deviceId, ipAddress } = req.body;
    
    let riskScore = 0; // 초기 위험도 점수
    let reasons = [];  // 위험 점수가 올라간 이유를 담을 배열

    try {
        // 1. 기본 신원 확인 (비밀번호 검증)
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: '이메일이나 비밀번호가 틀렸습니다.' });
        }

        // 2. 동적 위험도 평가 (Context Evaluation)
        let currentDevice = null;

        if (!deviceId || !ipAddress) {
            // 기기 정보나 IP를 아예 안 보냈다면? 해커의 비정상적인 접근으로 간주!
            riskScore += 50;
            reasons.push('필수 기기/네트워크 정보 누락');
        } else {
            // DB에서 이 기기가 등록된 적 있는지 검사
            const [devices] = await pool.query('SELECT * FROM devices WHERE user_id = ? AND device_identifier = ?', [user.id, deviceId]);
            currentDevice = devices[0];

            if (!currentDevice) {
                // 처음 보는 새로운 기기 접속 시 (+30점)
                riskScore += 30;
                reasons.push('미등록 새로운 기기 접근');
                
                // 일단 새로운 기기 목록에 등록은 해둠 (실제로는 여기서 is_trusted를 false로 두고 관리자가 승인해야 함)
                const [newDev] = await pool.query(
                    'INSERT INTO devices (user_id, device_identifier, last_ip_address) VALUES (?, ?, ?)',
                    [user.id, deviceId, ipAddress]
                );
                currentDevice = { id: newDev.insertId, is_trusted: 1, last_ip_address: ipAddress };
            } else {
                // 이미 등록된 기기지만, 관리자가 차단한 기기라면? (+100점, 즉시 아웃)
                if (!currentDevice.is_trusted) {
                    riskScore += 100;
                    reasons.push('신뢰할 수 없는(차단된) 기기');
                } 
                // 기기는 맞는데, 평소 접속하던 IP(위치)가 아니라면? (+20점)
                else if (currentDevice.last_ip_address !== ipAddress) {
                    riskScore += 20;
                    reasons.push('평소와 다른 새로운 IP(위치) 접근');
                }
            }
        }

        // 3. 점수에 따른 정책 결정 (Policy Decision)
        let action = 'ALLOWED';
        let responseMsg = ' [안전] 로그인 및 ZTNA 출입증 발급 성공!';
        let token = null;

        if (riskScore >= 70) {
            action = 'DENIED';
            responseMsg = ' [위험] 비정상적인 접근이 감지되어 즉시 차단되었습니다.';
        } else if (riskScore >= 30) {
            action = 'STEP_UP';
            responseMsg = ' [주의] 평소와 다른 환경입니다. 추가 인증(OTP 등)이 필요합니다.';
        } else {
            // 30점 미만일 때만 안전하다고 판단하여 토큰 발급!
            action = 'ALLOWED';
            token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            // 정상 접속이므로 마지막 접속 IP 업데이트
            if (currentDevice) {
                await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW() WHERE id = ?', [ipAddress, currentDevice.id]);
            }
        }

        // 4. 보안 감사 로그(Audit Log) 기록 - 나중에 교수님께 보여줄 증거 자료!
        await pool.query(
            'INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, currentDevice ? currentDevice.id : null, ipAddress || 'Unknown', riskScore, action, reasons.join(', ')]
        );

        // 5. 클라이언트에 최종 결과 응답
        if (action === 'ALLOWED') {
            res.json({ message: responseMsg, 위험도점수: riskScore, 사유: reasons, token: token });
        } else {
            // 403 Forbidden: 넌 누군진 알겠는데, 위험해서 문은 못 열어줘!
            res.status(403).json({ message: responseMsg, 위험도점수: riskScore, 사유: reasons });
        }

    } catch (error) {
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// 5. 서버 실행 및 DB 연결 확인
app.listen(port, async () => { // 지정한 포트에서 서버를 대기 상태로 만듬
    console.log('서버가 http://localhost:${port} 에서 실행 중입니다.');
    try {
        // 서버가 켜질 때 DB 연결이 잘 되는지 한 번 테스트해봄
        const connection = await pool.getConnection();
        console.log('MySQL 데이터베이스(ztna_project) 연결 완벽하게 성공!');
        connection.release(); // 연결 확인 후 다시 풀(Pool)에 반환
    } catch (err) {
        console.error('MySQL 연결 실패! .env 파일의 비밀번호 등을 다시 확인해주세요.');
        console.error('에러 상세 내용:', err.message);
    }
});
