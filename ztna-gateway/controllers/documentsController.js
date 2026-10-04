const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

exports.getDocuments = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, title, description, original_name, author, created_at FROM intranet_documents ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'DB 에러가 발생했습니다.' });
    }
};

exports.uploadDocument = async (req, res) => {
    const allowUpload = req.headers['x-allow-download'];
    if (allowUpload === 'false') {
        return res.status(403).json({ message: 'BYOD 기기에서는 기밀 문서를 업로드할 수 없습니다.' });
    }

    const { title, description } = req.body;
    const author = req.headers['x-user-email']?.split('@')[0] || '익명';
    
    if (!req.file || !title) {
        return res.status(400).json({ message: '제목과 파일을 모두 입력/첨부해주세요.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO intranet_documents (title, description, filename, original_name, author) VALUES (?, ?, ?, ?, ?)',
            [title, description || '', req.file.filename, req.file.originalname, author]
        );
        res.json({ message: '문서가 성공적으로 업로드되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: '문서 업로드 실패' });
    }
};

exports.downloadDocument = async (req, res) => {
    const allowDownload = req.headers['x-allow-download'];
    if (allowDownload === 'false') {
        return res.status(403).json({ message: 'BYOD 기기에서는 기밀 문서를 다운로드할 수 없습니다.' });
    }

    try {
        const [rows] = await pool.query('SELECT filename, original_name FROM intranet_documents WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
        
        const fileRecord = rows[0];
        const filePath = path.join(__dirname, '..', 'uploads', fileRecord.filename);
        
        if (fs.existsSync(filePath)) {
            res.download(filePath, fileRecord.original_name);
        } else {
            // 더미 데이터 처리
            const doc = new PDFDocument();
            res.setHeader('Content-disposition', `attachment; filename="${encodeURIComponent(fileRecord.original_name)}"`);
            res.setHeader('Content-type', 'application/pdf');
            doc.pipe(res);
            doc.fontSize(20).text(`Dummy Document: ${fileRecord.original_name}`);
            doc.end();
        }
    } catch (err) {
        res.status(500).json({ message: '다운로드 실패' });
    }
};

exports.downloadSecretPdf = (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'] || 'Unknown User';
        const allowDownload = req.headers['x-allow-download'];

        if (allowDownload === 'false') {
            console.log(`[차단] ${userEmail} 님이 조건부 허용(BYOD) 상태로 기밀문서 다운로드 시도`);
            return res.status(403).json({ message: '조건부 허용 모드(BYOD 등)에서는 기밀문서 다운로드가 제한됩니다.' });
        }
        
        // IP 추적
        let ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
        if (ipAddress.includes('::ffff:')) ipAddress = ipAddress.split('::ffff:')[1];
        if (ipAddress === '::1') ipAddress = '127.0.0.1';

        // 현재 시간 계산 (영어 포맷으로 변경하여 PDF 기본 폰트 충돌 방지)
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

        // PDF 문서 객체 생성
        const doc = new PDFDocument();

        res.setHeader('Content-disposition', 'attachment; filename="Top_Secret_Document.pdf"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(25).fillColor('black').text('ZTNA Top Secret Document', { align: 'center' });
        doc.moveDown(1);
        
        doc.fontSize(14).text('This document contains highly classified information. Unauthorized distribution is strictly prohibited.');
        doc.moveDown(2);
        
        doc.fontSize(12).text('Project Code: ZTNA-V2-APOLLO');
        doc.text('Clearance Level: Level 5');
        
        doc.moveDown(5);
        doc.fontSize(20).fillColor('red').opacity(0.3)
           .text(`DOWNLOADED BY: ${userEmail}`, { align: 'center' })
           .text(`TIME: ${timestamp}`, { align: 'center' })
           .text(`IP: ${ipAddress}`, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('[PDF 생성 에러]:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'PDF 생성 중 에러가 발생했습니다.' });
        }
    }
};
