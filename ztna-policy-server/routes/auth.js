//회원가입, 로그인, OTP

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const transporter = require('../mailer');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { calculateDistance } = require('../utils/distance');

// [API 1] 회원가입
router.post('/signup', async (req, res) => {
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

// [API 2] 로그인
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password, deviceId, isRooted, latitude, longitude, isWifi, batteryLevel, previousBatteryLevel } = req.body;

    if (!email || !password || !deviceId) {
        return res.status(400).json({ message: '이메일, 비밀번호, 기기 정보는 필수입니다.' });
    }
    if (isRooted) {
        return res.status(403).json({ message: '🚨 보안 정책 위반: 루팅/탈옥된 기기는 접근이 차단됩니다.' });
    }

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const now = new Date();
    const loginHour = now.getHours(); // 🕒 테스트용: 강제로 새벽 3시로 조작
    //const loginHour = 3;
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

        // 위치 기반 위험도
        if (latitude && longitude && currentDevice?.last_latitude && currentDevice?.last_longitude) {
            const distance = calculateDistance(
                currentDevice.last_latitude, currentDevice.last_longitude,
                latitude, longitude
            );
            console.log(`[위치 체크] 이전 위치와의 거리: ${distance.toFixed(0)}km`);

            const [lastLogin] = await pool.query(
                `SELECT created_at FROM access_logs WHERE user_id = ? AND action_taken IN ('ALLOWED', 'STEP_UP') ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );

            if (lastLogin.length > 0) {
                const timeDiffHours = (now - new Date(lastLogin[0].created_at)) / 1000 / 3600;
                if (timeDiffHours > 0) {
                    const speed = distance / timeDiffHours;
                    console.log(`[이동 속도] ${speed.toFixed(0)}km/h`);
                    if (speed > 1000) { riskScore += 50; reasons.push(`물리적으로 불가능한 이동 감지 (${speed.toFixed(0)}km/h)`); }
                    else if (speed > 500) { riskScore += 30; reasons.push(`비정상적으로 빠른 이동 감지 (${speed.toFixed(0)}km/h)`); }
                    else if (distance > 500) { riskScore += 20; reasons.push(`장거리 이동 감지 (${distance.toFixed(0)}km)`); }
                    else if (distance > 100) { riskScore += 10; reasons.push(`평소와 다른 위치 접속 (${distance.toFixed(0)}km 이동)`); }
                }
            } else {
                if (distance > 500) { riskScore += 20; reasons.push(`장거리 이동 감지 (${distance.toFixed(0)}km)`); }
                else if (distance > 100) { riskScore += 10; reasons.push(`평소와 다른 위치 접속 (${distance.toFixed(0)}km 이동)`); }
            }
        }

        if (!latitude || !longitude) { riskScore += 15; reasons.push('위치 정보 수집 불가'); }
        if (isWifi === false) { riskScore += 20; reasons.push('모바일 데이터 접속'); }
        if (previousBatteryLevel !== null && batteryLevel !== null) {
            const batteryDrop = previousBatteryLevel - batteryLevel;
            if (batteryDrop >= 0.2) { riskScore += 20; reasons.push(`배터리 급감 감지 (${(batteryDrop * 100).toFixed(0)}% 감소)`); }
        }
        if (loginHour >= 2 && loginHour <= 5) { riskScore += 20; reasons.push(`비정상 시간대 접속 (${loginHour}시)`); }

        const [loginHistory] = await pool.query(
            `SELECT login_hour FROM access_logs WHERE user_id = ? AND action_taken = 'ALLOWED' AND login_hour IS NOT NULL ORDER BY created_at DESC LIMIT 10`,
            [user.id]
        );
        if (loginHistory.length >= 3) {
            const avgHour = Math.round(loginHistory.reduce((sum, log) => sum + log.login_hour, 0) / loginHistory.length);
            if (Math.abs(loginHour - avgHour) >= 4) {
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
            
            // 이메일 발송은 백그라운드에서 처리 (지연 시간 방지)
            transporter.sendMail({
                from: process.env.EMAIL_USER, to: email,
                subject: '[ZTNA 보안 알림] 2차 인증 번호입니다.',
                text: `새로운 환경에서의 접속이 감지되었습니다.\n인증번호: [ ${otpCode} ]\n(3분 후 만료)`
            }).catch(err => console.error('[이메일 발송 실패]:', err));

            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, reasons.join(', '), loginHour]);
            return res.status(202).json({ message: '⚠️ OTP 인증이 필요합니다.', requiresOtp: true, 위험도점수: riskScore });

        } else {
            if (currentDevice) {
                await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE id = ?',
                    [ipAddress, latitude || null, longitude || null, currentDevice.id]);
            }
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, '정상 접속', loginHour]);

            // 로그인 완벽 성공 시 IP 기반 Rate Limit 카운트 초기화
            loginLimiter.resetKey(ipAddress);

            const token = jwt.sign({ userId: user.id, email: user.email, jti: randomUUID() }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.json({ message: '✅ ZTNA 출입증 발급 성공', token });
        }
    } catch (error) {
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// [API 3] OTP 검증
router.post('/verify-otp', otpLimiter, async (req, res) => {
    const { email, otp, deviceId, latitude, longitude } = req.body;

    if (!email || !otp || !deviceId) return res.status(400).json({ message: '이메일, 인증번호, 기기 정보는 필수입니다.' });
    if (otp.length !== 6) return res.status(400).json({ message: '인증번호는 6자리여야 합니다.' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) return res.status(401).json({ message: '❌ 사용자를 찾을 수 없습니다.' });
        if (!user.otp_code || !user.otp_expiry) return res.status(401).json({ message: '❌ 유효한 OTP 요청이 없습니다. 다시 로그인해주세요.' });
        if (new Date() > new Date(user.otp_expiry)) {
            await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(401).json({ message: '⏰ 인증 시간이 만료되었습니다. 다시 로그인해주세요.' });
        }
        if (user.otp_attempts >= 5) {
            await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(429).json({ message: '🚨 인증 5회 실패. OTP가 무효화되었습니다. 다시 로그인해주세요.' });
        }
        if (!(await bcrypt.compare(otp, user.otp_code))) {
            await pool.query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', [user.id]);
            const remaining = 5 - user.otp_attempts - 1;
            return res.status(401).json({ message: `❌ 인증번호가 틀렸습니다. (남은 시도: ${remaining}회)` });
        }

        await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
        const [existing] = await pool.query('SELECT id FROM devices WHERE user_id = ? AND device_identifier = ?', [user.id, deviceId]);
        if (existing.length === 0) {
            await pool.query('INSERT INTO devices (user_id, device_identifier, last_ip_address, is_trusted, last_latitude, last_longitude) VALUES (?, ?, ?, 1, ?, ?)',
                [user.id, deviceId, ipAddress, latitude || null, longitude || null]);
        } else {
            await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE user_id = ? AND device_identifier = ?',
                [ipAddress, latitude || null, longitude || null, user.id, deviceId]);
        }
        
        // OTP 인증 완벽 성공 시 IP 기반 Rate Limit 카운트 초기화
        otpLimiter.resetKey(ipAddress);
        
        const token = jwt.sign({ userId: user.id, email: user.email, jti: randomUUID() }, process.env.JWT_SECRET, { expiresIn: '5m' });
        res.json({ message: '✅ 2차 인증 성공!', token });
    } catch (error) {
        console.error('[OTP 검증 에러 상세]:', error);
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

module.exports = router;