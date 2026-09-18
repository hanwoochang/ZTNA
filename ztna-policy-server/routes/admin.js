const express = require('express');
const router = express.Router();
const pool = require('../db');
const isAdmin = require('../middleware/isAdmin');

// 모든 /api/admin 라우터에 isAdmin 미들웨어 적용
router.use(isAdmin);

// 1. 대시보드 통계 API (임시 구현, 추후 고도화)
router.get('/stats', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(*) as total FROM users');
        const [devices] = await pool.query('SELECT COUNT(*) as total FROM devices');
        const [deniedLogs] = await pool.query("SELECT COUNT(*) as total FROM access_logs WHERE action_taken = 'DENY' AND DATE(created_at) = CURDATE()");
        
        res.json({
            totalUsers: users[0].total,
            totalDevices: devices[0].total,
            deniedToday: deniedLogs[0].total
        });
    } catch (error) {
        res.status(500).json({ message: '통계 조회 실패', error: error.message });
    }
});

// 2. 전체 유저 목록 조회
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, email, role, department, name, is_active, created_at FROM users ORDER BY id DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: '유저 목록 조회 실패', error: error.message });
    }
});

const bcrypt = require('bcrypt');

// 2-1. 신규 유저(임직원) 생성 API
router.post('/users', async (req, res) => {
    const { email, password, name, department, role } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ message: '필수 정보(이메일, 비밀번호, 이름)가 누락되었습니다.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (email, password_hash, name, department, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [email, hashedPassword, name, department || '일반부서', role || 'USER']
        );
        res.json({ message: '임직원 계정이 성공적으로 생성되었습니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
        }
        res.status(500).json({ message: '유저 생성 실패', error: error.message });
    }
});

// 3. 기기 현황 목록 조회
router.get('/devices', async (req, res) => {
    try {
        const [devices] = await pool.query(`
            SELECT d.id, d.device_identifier, d.device_type, d.is_compliant, d.is_trusted, d.last_ip_address, d.last_accessed_at, u.email, u.name 
            FROM devices d 
            LEFT JOIN users u ON d.user_id = u.id 
            ORDER BY d.last_accessed_at DESC
        `);
        res.json(devices);
    } catch (error) {
        res.status(500).json({ message: '기기 목록 조회 실패', error: error.message });
    }
});

// 4. 전사 접속 로그(Audit Log) 조회
router.get('/logs', async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT l.id, u.email, l.ip_address, l.risk_score, l.action_taken, l.reason, l.created_at 
            FROM access_logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            ORDER BY l.id DESC LIMIT 100
        `);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: '로그 조회 실패', error: error.message });
    }
});

module.exports = router;
