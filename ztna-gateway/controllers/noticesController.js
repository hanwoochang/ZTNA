const pool = require('../config/db');

exports.getNotices = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const userRole = req.headers['x-user-role'];
        const userDept = decodeURIComponent(req.headers['x-user-department'] || 'ALL');
        const userPos = parseInt(req.headers['x-user-position-level'] || '1');
        
        let query = 'SELECT * FROM notices';
        let countQuery = 'SELECT COUNT(*) as total FROM notices';
        let filterParams = [];
        
        if (userRole !== 'ADMIN') {
            const condition = ' WHERE (target_department = "ALL" OR target_department = ?) AND target_position_level <= ?';
            query += condition;
            countQuery += condition;
            filterParams.push(userDept, userPos);
        }
        
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        
        const [rows] = await pool.query(query, [...filterParams, limit, offset]);
        const [countRow] = await pool.query(countQuery, filterParams);
        
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
    const { title, content, target_department, target_position_level } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    const userRole = req.headers['x-user-role'];
    const userPos = parseInt(req.headers['x-user-position-level'] || '1');
    
    if (userRole !== 'ADMIN' && userPos < 2) {
        return res.status(403).json({ message: '게시물 작성 권한이 없습니다 (대리 이상 가능).' });
    }
    
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    const targetDept = target_department || 'ALL';
    const targetPos = target_position_level || 1;
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const [result] = await pool.query('INSERT INTO notices (title, content, author, date, target_department, target_position_level) VALUES (?, ?, ?, ?, ?, ?)', [title, content, author, today, targetDept, targetPos]);
        res.json({ message: '기밀 게시글이 등록되었습니다.', notice: { id: result.insertId, title, content, author, date: today, target_department: targetDept, target_position_level: targetPos } });
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

    const userPos = parseInt(req.headers['x-user-position-level'] || '1');
    if (!isAdminRole && userPos < 2) {
        return res.status(403).json({ message: '게시물 삭제 권한이 없습니다 (대리 이상 가능).' });
    }

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
