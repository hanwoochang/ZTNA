require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDb() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ztna',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true // 중요: 여러 쿼리 실행 허용
    });

    try {
        const sqlPath = path.join(__dirname, 'db_v2_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing DB schema...');
        await pool.query(sql);
        console.log('DB Schema successfully applied.');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        pool.end();
    }
}

initDb();
