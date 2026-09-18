const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDB() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    try {
        console.log('\n=== [USERS 테이블 구조] ===');
        const [usersDesc] = await pool.query('DESCRIBE users');
        console.table(usersDesc.map(r => ({ Field: r.Field, Type: r.Type, Default: r.Default })));

        console.log('\n=== [DEVICES 테이블 구조] ===');
        const [devicesDesc] = await pool.query('DESCRIBE devices');
        console.table(devicesDesc.map(r => ({ Field: r.Field, Type: r.Type, Default: r.Default })));

        console.log('\n=== [등록된 유저 데이터 (일부)] ===');
        const [usersData] = await pool.query('SELECT id, email, role, department, name, is_active FROM users ORDER BY id DESC LIMIT 5');
        console.table(usersData);
    } catch (e) { console.error(e); } finally { pool.end(); }
}
checkDB();
