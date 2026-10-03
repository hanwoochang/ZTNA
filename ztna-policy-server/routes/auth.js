//회원가입, 로그인, OTP

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const transporter = require('../mailer');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { evaluateRisk } = require('../services/riskEngine');

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
        return res.status(403).json({ message: '보안 정책 위반: 루팅/탈옥된 기기는 접근이 차단됩니다.' });
    }

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const now = new Date();
    const loginHour = now.getHours(); // 테스트용: 강제로 새벽 3시로 조작
    //const loginHour = 3;
    let riskScore = 0;
    let reasons = [];

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: '이메일이나 비밀번호가 일치하지 않습니다.' });
        }

        const [devices] = await pool.query('SELECT * FROM devices WHERE user_id = ? AND device_identifier = ?', [user.id, deviceId]);
        const currentDevice = devices[0];

        // --- ZTNA 정책 엔진 (PDP) 3단계 엄격 판별 로직 (NIST SP 800-207 기반) ---
        let action = 'ALLOW';
        let forceDeny = false;

        // 1. 기기 등록 상태(status) 기반 사전 판별
        //    - 미등록 기기: 위험도 엔진에서 +30 (STEP_UP → OTP 등록 유도)
        //    - PENDING : 어드민 승인 대기 → 대기 응답
        //    - BLOCKED : 어드민이 차단/해제한 기기 → 즉시 차단
        if (currentDevice && currentDevice.status === 'PENDING') {
            await pool.query(
                'INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice.id, ipAddress, 30, 'DENY', '어드민 승인 대기 중인 기기', loginHour]
            );
            return res.status(202).json({
                message: '기기 등록 승인 대기 중입니다. 관리자에게 문의하세요.',
                requiresApproval: true
            });
        }
        if (currentDevice && currentDevice.status !== 'APPROVED') {
            forceDeny = true;
            riskScore = 100;
            reasons.push('관리자에 의해 차단(신뢰 해제)된 기기');
        }

        // 2~4. 위험도 엔진(CARTA)을 통한 동적 점수 산출 (기기 신뢰도 점수 포함)
        let lastLoginData = null;
        if (currentDevice) {
            const [lastLogin] = await pool.query(
                `SELECT created_at FROM access_logs WHERE user_id = ? AND action_taken IN ('ALLOW', 'STEP_UP') ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );
            lastLoginData = lastLogin[0] || null;
        }

        const riskEvaluation = evaluateRisk(currentDevice, ipAddress, latitude, longitude, lastLoginData, loginHour);
        riskScore += riskEvaluation.riskScore; // 누적
        reasons = reasons.concat(riskEvaluation.reasons);
        forceDeny = forceDeny || riskEvaluation.forceDeny;

        // 정책 판별 수행
        if (forceDeny || riskScore >= 70) {
            action = 'DENY';
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, reasons.join(', '), loginHour]);
            return res.status(403).json({ message: '보안 정책에 의해 즉시 차단되었습니다.', 위험도점수: riskScore, reasons });

        } 
        // 2. 조건부 허용 (STEP_UP) 조건: BYOD 이거나, 특정 위험 요소 감지 시
        else if ((currentDevice && currentDevice.device_type === 'BYOD') || riskScore >= 30) {
            action = 'STEP_UP';
            if (currentDevice && currentDevice.device_type === 'BYOD' && riskScore < 30) {
                reasons.push('BYOD(개인 기기) 접속으로 인한 2차 인증 요구');
                riskScore = Math.max(riskScore, 30);
            }
            
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 3 * 60000);
            const hashedOtp = await bcrypt.hash(otpCode, 6);
            await pool.query('UPDATE users SET otp_code = ?, otp_expiry = ?, otp_attempts = 0 WHERE id = ?', [hashedOtp, expiry, user.id]);
            
            // 이메일 발송
            transporter.sendMail({
                from: process.env.EMAIL_USER, to: email,
                subject: '[ZTNA 보안 알림] 2차 인증 번호입니다.',
                text: `새로운 환경에서의 접속이 감지되었습니다.\n인증번호: [ ${otpCode} ]\n(3분 후 만료)`
            }).catch(err => console.error('[이메일 발송 실패]:', err));

            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, reasons.join(', '), loginHour]);
            
            const isTrustedDevice = !!(currentDevice && currentDevice.status === 'APPROVED');
            return res.status(202).json({ message: 'OTP 인증이 필요합니다.', requiresOtp: true, isTrustedDevice, 위험도점수: riskScore });

        } else {
            if (currentDevice) {
                await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE id = ?',
                    [ipAddress, latitude || null, longitude || null, currentDevice.id]);
            }
            await pool.query('INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user.id, currentDevice?.id || null, ipAddress, riskScore, action, '정상 접속', loginHour]);

            // 로그인 완벽 성공 시 IP 기반 Rate Limit 카운트 초기화
            loginLimiter.resetKey(ipAddress);

            const token = jwt.sign({ 
                userId: user.id, 
                email: user.email, 
                role: user.role, 
                department: user.department, 
                jti: randomUUID(),
                deviceId: currentDevice?.device_identifier || deviceId,
                allowDownload: true 
            }, process.env.JWT_SECRET, { expiresIn: '15m' });
            return res.json({ message: 'ZTNA 출입증 발급 성공', token, allowDownload: true });
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
        if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        if (!user.otp_code || !user.otp_expiry) return res.status(401).json({ message: '유효한 OTP 요청이 없습니다. 다시 로그인해주세요.' });
        if (new Date() > new Date(user.otp_expiry)) {
            await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(401).json({ message: '인증 시간이 만료되었습니다. 다시 로그인해주세요.' });
        }
        if (user.otp_attempts >= 5) {
            await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(429).json({ message: '인증 5회 실패. OTP가 무효화되었습니다. 다시 로그인해주세요.' });
        }
        if (!(await bcrypt.compare(otp, user.otp_code))) {
            await pool.query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', [user.id]);
            const remaining = 5 - user.otp_attempts - 1;
            return res.status(401).json({ message: `인증번호가 틀렸습니다. (남은 시도: ${remaining}회)` });
        }

        await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
        const [existing] = await pool.query('SELECT id, status, device_type FROM devices WHERE user_id = ? AND device_identifier = ?', [user.id, deviceId]);

        if (existing.length === 0) {
            // 신규 기기 → PENDING으로 등록 (어드민 승인 대기)
            await pool.query(
                "INSERT INTO devices (user_id, device_identifier, last_ip_address, is_trusted, status, last_latitude, last_longitude) VALUES (?, ?, ?, 0, 'PENDING', ?, ?)",
                [user.id, deviceId, ipAddress, latitude || null, longitude || null]
            );
            return res.status(202).json({
                message: '기기 등록이 완료되었습니다. 관리자의 승인 후 로그인이 가능합니다.',
                requiresApproval: true
            });
        } else if (existing[0].status === 'PENDING') {
            // 등록됐지만 어드민 승인 대기 중
            return res.status(202).json({
                message: '관리자의 승인을 기다리는 중입니다.',
                requiresApproval: true
            });
        } else if (existing[0].status !== 'APPROVED') {
            // 어드민이 차단(해제)한 기기 → OTP를 통과해도 출입 불가
            return res.status(403).json({ message: '관리자에 의해 차단(신뢰 해제)된 기기입니다.' });
        } else {
            // 승인된 기기 → 위치 정보 업데이트
            await pool.query(
                'UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE user_id = ? AND device_identifier = ?',
                [ipAddress, latitude || null, longitude || null, user.id, deviceId]
            );
        }

        // OTP 인증 완벽 성공 시 IP 기반 Rate Limit 카운트 초기화
        otpLimiter.resetKey(ipAddress);

        // ZTNA Step-Up(2차 인증) 통과 시, BYOD 기기 여부에 따라 다운로드 권한(allowDownload) 결정
        const isBYOD = existing[0]?.device_type === 'BYOD';
        const allowDownload = !isBYOD;

        const token = jwt.sign({ 
            userId: user.id, 
            email: user.email, 
            role: user.role, 
            department: user.department, 
            jti: randomUUID(),
            deviceId,
            allowDownload 
        }, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        res.json({ message: '2차 인증 성공!', token, allowDownload });
    } catch (error) {
        console.error('[OTP 검증 에러 상세]:', error);
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

// [API 4] 생체 인증(FaceID/지문) 검증 (클라이언트 로컬 인증 성공 후 호출)
router.post('/verify-bio', async (req, res) => {
    const { email, deviceId, latitude, longitude } = req.body;

    if (!email || !deviceId) return res.status(400).json({ message: '이메일, 기기 정보는 필수입니다.' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        if (!user.otp_expiry) return res.status(401).json({ message: '유효한 2차 인증 요청이 없습니다.' });
        if (new Date() > new Date(user.otp_expiry)) {
            await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
            return res.status(401).json({ message: '인증 시간이 만료되었습니다. 다시 로그인해주세요.' });
        }

        // [신뢰 기기 검증] 이 deviceId가 서버에 등록된 신뢰 기기인지 확인
        // → 미등록 기기는 생체인증 우회 불가 (ZTNA 핵심 원칙 적용)
        const [devices] = await pool.query(
            'SELECT status, device_type FROM devices WHERE user_id = ? AND device_identifier = ?',
            [user.id, deviceId]
        );
        if (!devices[0] || devices[0].status !== 'APPROVED') {
            return res.status(403).json({ message: '미등록 또는 신뢰할 수 없는 기기입니다. 생체 인증은 등록된 기기에서만 가능합니다.' });
        }

        // 클라이언트 Secure Enclave에서 생체 인증 통과 + 서버 신뢰 기기 검증 통과
        await pool.query('UPDATE users SET otp_code = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE id = ?', [user.id]);
        
        await pool.query('UPDATE devices SET last_ip_address = ?, last_accessed_at = NOW(), last_latitude = ?, last_longitude = ? WHERE user_id = ? AND device_identifier = ?',
            [ipAddress, latitude || null, longitude || null, user.id, deviceId]);
        
        const isBYOD = devices[0]?.device_type === 'BYOD';
        const allowDownload = !isBYOD;

        const token = jwt.sign({ 
            userId: user.id, 
            email: user.email, 
            role: user.role, 
            department: user.department, 
            jti: randomUUID(),
            deviceId,
            allowDownload 
        }, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        res.json({ message: '생체 인증 성공!', token, allowDownload });
    } catch (error) {
        console.error('[생체 인증 에러 상세]:', error);
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});
// [API 5] 관리자 전용 로그인 (어드민 대시보드 전용, deviceId 체크 없음)
// 무차별 대입 방지(loginLimiter) + 모든 시도를 access_logs에 감사 기록
router.post('/admin-login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다.' });
    }

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';
    const loginHour = new Date().getHours();

    const writeLog = (userId, action, reason) => pool.query(
        'INSERT INTO access_logs (user_id, device_id, ip_address, risk_score, action_taken, reason, login_hour) VALUES (?, NULL, ?, ?, ?, ?, ?)',
        [userId, ipAddress, action === 'DENY' ? 50 : 0, action, reason, loginHour]
    ).catch(err => console.error('[관리자 로그인 감사 로그 실패]:', err.message));

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            await writeLog(user?.id || null, 'DENY', '[관리자 콘솔] 비밀번호 불일치');
            return res.status(401).json({ message: '이메일이나 비밀번호가 일치하지 않습니다.' });
        }
        if (user.role !== 'ADMIN') {
            await writeLog(user.id, 'DENY', '[관리자 콘솔] 관리자 권한 없는 계정의 접근 시도');
            return res.status(403).json({ message: '관리자 계정이 아닙니다.' });
        }
        if (user.is_active === 0) {
            await writeLog(user.id, 'DENY', '[관리자 콘솔] 정지된 계정');
            return res.status(403).json({ message: '정지된 계정입니다.' });
        }

        await writeLog(user.id, 'ALLOW', '[관리자 콘솔] 로그인 성공');
        loginLimiter.resetKey(ipAddress);

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, department: user.department, jti: randomUUID() },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        res.json({ message: '관리자 로그인 성공', token });
    } catch (error) {
        res.status(500).json({ message: '서버 에러', error: error.message });
    }
});

module.exports = router;