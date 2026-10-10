const pool = require('../config/db');

exports.getEmployees = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, email, name, department, role, position, position_level FROM users ORDER BY email ASC');
        res.json(rows);
    } catch (err) {
        console.error('[임직원 목록 조회 에러]:', err);
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};
