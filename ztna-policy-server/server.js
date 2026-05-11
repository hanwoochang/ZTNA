require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { randomUUID } = require('crypto'); // jti용 UUID 생성

const app = express();
const port = 3000;

const rateLimit = require('express-rate-limit');

// 로그인 전용 제한: 5분에 5회
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { message: '🚨 로그인 시도 횟수를 초과했습니다. 5분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP 전용 제한: 3분에 5회
const otpLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 5,
    message: { message: '🚨 OTP 시도 횟수를 초과했습니다. 3분 후 다시 시도하세요.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 두 좌표 간 거리 계산 (Haversine 공식, 단위: km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ztna',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// [API 1] 회원가입
// ==========================================
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)', 
            [email, hashedPassword]
        );
        res.status(201).json({ message: '회원가입 성공!', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: '회원가입 실패', error: error.message });
    }
});

// ==========================================
// [API 2] 로그인
// ==========================================
app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password, deviceId, isRooted, latitude, longitude, isWifi, batteryLevel, previousBatteryLevel } = req.body;
    
    if (!email || !password || !deviceId) {
        return res.status(400).json({ message: '이메일, 비밀번호, 기기 정보는 필수입니다.' });
    }

    if (isRooted) {
        return res.status(403).json({ 
            message: '🚨 보안 정책 위반: 루팅/탈옥된 기기는 접근이 차단됩니다.' 
        });
    }
    
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const now = new Date();
    const loginHour = now.getHours(); // 0~23시
    //const loginHour = 3; // 🕒 테스트용: 강제로 새벽 3시로 조작

    let riskScore = 0;
    let reasons = [];

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: '🚫 이메일이나 비밀번호가 일치하지 않습니다.' });
        }

        const [devices] = await pool.query('SELECT * FROM devices WHERE user_id = ? AND device_identifier = ?', [user.id, deviceId]);
        const currentDevice = devices[0];

        if (!currentDevice) {
            riskScore += 30;
            reasons.push('미등록 새로운 기기 접근');
        } else if (!currentDevice.is_trusted) {
            riskScore += 100;
            reasons.push('신뢰할 수 없는 기기');
        } else if (currentDevice.last_ip_address !== ipAddress) {
            riskScore += 20;
            reasons.push('평소와 다른 새로운 IP 위치');
        }

        // 위치 기반 위험도 평가 추가
        if (latitude && longitude && currentDevice?.last_latitude && currentDevice?.last_longitude) {
            const distance = calculateDistance(
                currentDevice.last_latitude,
                currentDevice.last_longitude,
                latitude,
            longitude
            );

            console.log(`[위치 체크] 이전 위치와의 거리: ${distance.toFixed(0)}km`);

            // 마지막 로그인 시간 가져오기
            const [lastLogin] = await pool.query(`SELECT created_at FROM access_logs WHERE user_id = ? AND action_taken IN ('ALLOWED', 'STEP_UP')ORDER BY created_at DESC LIMIT 1`, [user.id]);

            if (lastLogin.length > 0) {
                const lastLoginTime = new Date(lastLogin[0].created_at);
                const timeDiffHours = (now - lastLoginTime) / 1000 / 3600; // 시간 단위

                if (timeDiffHours > 0) {
                    const speed = distance / timeDiffHours; // km/h
                    console.log(`[이동 속도] ${speed.toFixed(0)}km/h (${distance.toFixed(0)}km / ${timeDiffHours.toFixed(1)}시간)`);

                    if (speed > 1000) {
                        // 비행기 속도 초과 → 물리적으로 불가능
                        riskScore += 50;
                        reasons.push(`물리적으로 불가능한 이동 감지 (${speed.toFixed(0)}km/h)`);
                    } else if (speed > 500) {
                        // 고속 이동 의심 (500~1000km/h)
                        riskScore += 30;
                        reasons.push(`비정상적으로 빠른 이동 감지 (${speed.toFixed(0)}km/h)`);
                    } else if (distance > 500) {
                        // 속도는 정상이지만 장거리 이동
                        riskScore += 20;
                        reasons.push(`장거리 이동 감지 (${distance.toFixed(0)}km)`);
                    } else if (distance > 100) {
                        riskScore += 10;
                        reasons.push(`평소와 다른 위치 접속 (${distance.toFixed(0)}km 이동)`);
                    }
                }
            } else {
                // 로그인 기록 없으면 거리만 체크
                if (distance > 500) {
                    riskScore += 20;
                    reasons.push(`장거리 이동 감지 (${distance.toFixed(0)}km)`);
                } else if (distance > 100) {
                    riskScore += 10;
                    reasons.push(`평소와 다른 위치 접속 (${distance.toFixed(0)}km 이동)`);
                }
            }
        }

        // 위치 권한 거부 시
        if (!latitude || !longitude) {
            riskScore += 15;
            reasons.push('위치 정보 수집 불가');
        }

        // 네트워크 타입 체크
        if (isWifi === false) {
            riskScore += 20;
            reasons.push('모바일 데이터 접속');
        }

        // 배터리 급감 체크 (이전 대비 20% 이상 감소)
        if (previousBatteryLevel !== null && batteryLevel !== null) {
            const batteryDrop = previousBatteryLevel - batteryLevel;
            if (batteryDrop >= 0.2) {
                riskScore += 20;
                reasons.push(`배터리 급감 감지 (${(batteryDrop * 100).toFixed(0)}% 감소)`);
            }
        }

        // 시간대 기반 위험도 평가
        // 1. 새벽 시간대 접속 체크 (2시~5시)
        if (loginHour >= 2 && loginHour <= 5) {
            riskScore += 20;
            reasons.push(`비정상 시간대 접속 (${loginHour}시)`);
        }

        // 2. 평소 접속 패턴과 비교 (최근 10회 기록 기준)
        const [loginHistory] = await pool.query(
            `SELECT login_hour FROM access_logs 
             WHERE user_id = ? AND action_taken = 'ALLOWED' AND login_hour IS NOT NULL
             ORDER BY created_at DESC LIMIT 10`,
            [user.id]
        );

        if (loginHistory.length >= 3) {
            const avgHour = Math.round(
                loginHistory.reduce((sum, log) => sum + log.login_hour, 0) / loginHistory.length
            );
            const hourDiff = Math.abs(loginHour - avgHour);

            if (hourDiff >= 4) {
                riskScore += 15;
                reasons.push(`평소와 다른 시간대 접속 (평소: ${avgHour}시, 현재: ${loginHour}시)`);
            }
        }

        let action = 'ALLOWED';

        if (riskScore >= 70) {
            action = 'DENIED';
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, reasons.join(', '), loginHour]);
            return res.status(403).json({ message: '🚨 차단된 접근입니다.', 위험도점수: riskScore });

        } else if (riskScore >= 30) {
            action = 'STEP_UP';
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 3 * 60000);

            const hashedOtp = await bcrypt.hash(otpCode, 6); 
            await pool.query('UPDATE users SET otp_code = ?, otp_expiry = ?, otp_attempts = 0 WHERE id = ?', [hashedOtp, expiry, user.id]);
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: '[ZTNA 보안 알림] 2차 인증 번호입니다.',
                text: `새로운 환경에서의 접속이 감지되었습니다.\n인증번호: [ ${otpCode} ]\n(3분 후 만료)`
            });
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, reasons.join(', '), loginHour]);

            return res.status(202).json({ message: '⚠️ OTP 인증이 필요합니다.', requiresOtp: true, 위험도점수: riskScore });

        } else {
            if (currentDevice) {
                await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE id = ?', [ipAddress, latitude || null, longitude || null, currentDevice.id]);
            }
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, '정상 접속', loginHour]);

            // jti 포함해서 토큰 발급
            const token = jwt.sign(
                { userId: user.id, email: user.email, jti: randomUUID() },
                process.env.JWT_SECRET,
                { expiresIn: '5m' } 
            );
            return res.json({ message: '✅ ZTNA 출입증 발급 성공', token });
        }
    } catch (error) {
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// ==========================================
// [API 3] OTP 검증
// ==========================================
app.post('/api/verify-otp', otpLimiter, async (req, res) => {
    const { email, otp, deviceId, latitude, longitude } = req.body;

    if (!email || !otp || !deviceId) {
        return res.status(400).json({ message: '이메일, 인증번호, 기기 정보는 필수입니다.' });
    }
    if (otp.length !== 6) {
        return res.status(400).json({ message: '인증번호는 6자리여야 합니다.' });
    }
    
    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';
    
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: '❌ 사용자를 찾을 수 없습니다.' });
        }

        // 1. OTP 자체가 없는 상태 (로그인 시도 안 한 경우)
        if (!user.otp_code || !user.otp_expiry) {
            return res.status(401).json({ message: '❌ 유효한 OTP 요청이 없습니다. 다시 로그인해주세요.' });
        }

        // 2. 만료 시간 체크
        if (new Date() > new Date(user.otp_expiry)) {
            await pool.query(
                'UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', 
                [user.id]
            );
            return res.status(401).json({ message: '⏰ 인증 시간이 만료되었습니다. 다시 로그인해주세요.' });
        }

        // 3. 5회 초과 시 OTP 즉시 무효화 후 차단
        if (user.otp_attempts >= 5) {
            await pool.query(
                'UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', 
                [user.id]
            );
            return res.status(429).json({ message: '🚨 인증 5회 실패. OTP가 무효화되었습니다. 다시 로그인해주세요.' });
        }

        // 4. OTP 틀린 경우 → 실패 횟수 증가
        if (!(await bcrypt.compare(otp, user.otp_code))) {
            await pool.query(
                'UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', 
                [user.id]
            );
            const remaining = 5 - user.otp_attempts - 1;
            return res.status(401).json({ 
                message: `❌ 인증번호가 틀렸습니다. (남은 시도: ${remaining}회)` 
            });
        }

        // 5. 인증 성공 → OTP 정보 및 실패 횟수 초기화
        await pool.query(
            'UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', 
            [user.id]
        );
        
        const [existing] = await pool.query(
            'SELECT id FROM devices WHERE user_id = ? AND device_identifier = ?', 
            [user.id, deviceId]
        );
        if (existing.length === 0) {
            await pool.query('INSERT INTO devices (user_id, device_identifier, last_ip_address, is_trusted, last_latitude, last_longitude) VALUES (?, ?, ?, 1, ?, ?)', [user.id, deviceId, ipAddress, latitude || null, longitude || null]);
        } else {
            await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE user_id = ? AND device_identifier = ?', [ipAddress, latitude || null, longitude || null, user.id, deviceId]);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, jti: randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );
        res.json({ message: '✅ 2차 인증 성공!', token });

    } catch (error) {
        console.error('[OTP 검증 에러 상세]:', error); 
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// ==========================================
// [API 4] 로그아웃 - 토큰 블랙리스트 등록
// ==========================================
app.post('/api/logout', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '토큰이 없습니다.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 블랙리스트에 등록 (만료시간까지만 보관)
        await pool.query(
            'INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
            [decoded.jti, new Date(decoded.exp * 1000)]
        );

        res.json({ message: '✅ 로그아웃 완료. 출입증이 폐기되었습니다.' });
    } catch (error) {
        res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
});

// ==========================================
// [API 5] 지속적 컨텍스트 검증 (Heartbeat) - 연장 로직 포함 
// ==========================================
app.post('/api/verify-context', async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const { deviceId } = req.body;
    
    // 서버가 직접 IP 추출
    let currentIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (currentIp.includes('::ffff:')) currentIp = currentIp.split('::ffff:')[1];
    if (currentIp === '::1') currentIp = '127.0.0.1';

    if (!token || !deviceId || !currentIp) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [devices] = await pool.query(
            'SELECT is_trusted, last_ip_address FROM devices WHERE user_id = ? AND device_identifier = ?', 
            [decoded.userId, deviceId]
        );
        const device = devices[0];

        // 🚨 차단 로직: 신뢰 깨짐 or IP 무단 변경
        if (!device || device.is_trusted === 0 || device.last_ip_address !== currentIp) {
            console.log(`[강제 추방] ${decoded.email} - 보안 컨텍스트 불일치`);
            await pool.query(
                'INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
                [decoded.jti, new Date(decoded.exp * 1000)]
            );
            return res.status(403).json({ 
                action: 'TERMINATE', 
                message: '🚨 보안 정책 위반 감지! 연결이 강제 종료됩니다.' 
            });
        }

        // 무사 통과 시: 새로운 5분짜리 토큰 발급 (Sliding Session)
        const newToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email, jti: randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: '5m' } 
        );

        // 새 토큰을 응답에 담아서 클라이언트로 쏴줌
        res.json({ status: 'SAFE', token: newToken }); 

    } catch (error) {
        res.status(401).json({ action: 'TERMINATE', message: '세션이 만료되었습니다.' });
    }
});

// ==========================================
// 서버 실행
// ==========================================
app.listen(port, () => console.log(`🚀 ZTNA Policy Server running on ${port}`));
