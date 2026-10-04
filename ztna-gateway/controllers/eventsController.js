const pool = require('../config/db');

exports.getEvents = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM events ORDER BY date ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.createEvent = async (req, res) => {
    const { title, date } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    if (!title || !date) return res.status(400).json({ message: '제목과 날짜를 입력해주세요.' });

    try {
        const [result] = await pool.query('INSERT INTO events (title, date, author) VALUES (?, ?, ?)', [title, date, author]);
        res.json({ message: '일정이 등록되었습니다.', event: { id: result.insertId, title, date, author } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.deleteEvent = async (req, res) => {
    const id = parseInt(req.params.id);
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';
    const isAdminRole = req.headers['x-user-role'] === 'ADMIN';
    
    try {
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '일정을 찾을 수 없습니다.' });
        
        if (rows[0].author !== currentUser && !isAdminRole) {
            return res.status(403).json({ message: '본인이 등록한 일정만 삭제할 수 있습니다.' });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [id]);
        res.json({ message: '일정이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};
