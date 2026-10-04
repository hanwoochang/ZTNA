const pool = require('../config/db');

exports.getNotices = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [rows] = await pool.query('SELECT * FROM notices ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        const [countRow] = await pool.query('SELECT COUNT(*) as total FROM notices');
        
        res.json({
            notices: rows,
            total: countRow[0].total,
            page,
            totalPages: Math.ceil(countRow[0].total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.getNotice = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.createNotice = async (req, res) => {
    const { title, content } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    const today = new Date().toISOString().split('T')[0];
    try {
        const [result] = await pool.query('INSERT INTO notices (title, content, author, date) VALUES (?, ?, ?, ?)', [title, content, author, today]);
        res.json({ message: '기밀 게시글이 등록되었습니다.', notice: { id: result.insertId, title, content, author, date: today } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.updateNotice = async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';
    const isAdminRole = req.headers['x-user-role'] === 'ADMIN';
    
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        const notice = rows[0];

        if (notice.author !== currentUser && !isAdminRole) {
            return res.status(403).json({ message: '수정 권한이 없습니다 (작성자 본인만 가능).' });
        }

        const updatedTitle = title || notice.title;
        const updatedContent = content || notice.content;
        const updatedDate = new Date().toISOString().split('T')[0];

        await pool.query('UPDATE notices SET title = ?, content = ?, date = ?, is_edited = 1 WHERE id = ?', [updatedTitle, updatedContent, updatedDate, id]);
        res.json({ message: '게시글이 수정되었습니다.', notice: { ...notice, title: updatedTitle, content: updatedContent, date: updatedDate, is_edited: 1 } });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.deleteNotice = async (req, res) => {
    const id = parseInt(req.params.id);
    const currentUser = req.headers['x-user-email']?.split('@')[0] || '익명';
    const isAdminRole = req.headers['x-user-role'] === 'ADMIN';

    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        const notice = rows[0];

        if (notice.author !== currentUser && !isAdminRole) {
            return res.status(403).json({ message: '본인이 작성한 게시글만 삭제할 수 있습니다.' });
        }

        await pool.query('DELETE FROM notices WHERE id = ?', [id]);
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};
