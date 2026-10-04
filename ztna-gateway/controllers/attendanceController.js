const pool = require('../config/db');

exports.checkIn = async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const today = new Date();
    const dateRecord = today.toISOString().split('T')[0];

    try {
        await pool.query(
            `INSERT INTO attendance_logs (user_id, check_in_time, date_record, ip_address) 
             VALUES (?, NOW(), ?, ?) 
             ON DUPLICATE KEY UPDATE check_in_time = IF(check_in_time IS NULL, NOW(), check_in_time)`,
            [userId, dateRecord, ipAddress]
        );
        res.json({ message: '성공적으로 출근(Check-in) 처리되었습니다.' });
    } catch (error) {
        console.error('[출근 처리 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
};

exports.checkOut = async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
    if (ipAddress === '::1') ipAddress = '127.0.0.1';

    const today = new Date();
    const dateRecord = today.toISOString().split('T')[0];

    try {
        await pool.query(
            `INSERT INTO attendance_logs (user_id, check_out_time, date_record, ip_address) 
             VALUES (?, NOW(), ?, ?) 
             ON DUPLICATE KEY UPDATE check_out_time = NOW(), ip_address = ?`,
            [userId, dateRecord, ipAddress, ipAddress]
        );
        res.json({ message: '성공적으로 퇴근(Check-out) 처리되었습니다.' });
    } catch (error) {
        console.error('[퇴근 처리 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
};

exports.getTodayAttendance = async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: '사용자 식별 불가 (출입증 없음)' });

    const today = new Date();
    const dateRecord = today.toISOString().split('T')[0];

    try {
        const [rows] = await pool.query(
            `SELECT check_in_time, check_out_time FROM attendance_logs 
             WHERE user_id = ? AND date_record = ? LIMIT 1`,
            [userId, dateRecord]
        );
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json({ check_in_time: null, check_out_time: null });
        }
    } catch (error) {
        console.error('[출퇴근 기록 조회 에러]:', error);
        res.status(500).json({ message: '서버 내부 에러가 발생했습니다.' });
    }
};
