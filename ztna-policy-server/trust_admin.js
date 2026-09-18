const mysql = require('mysql2/promise');
require('dotenv').config({path: './ztna-policy-server/.env'});
async function run() {
  const pool = mysql.createPool({host:'localhost',user:'root',password:'0421',database:'ztna'});
  await pool.query("INSERT IGNORE INTO devices (user_id, device_identifier, is_trusted, device_type) VALUES ((SELECT id FROM users WHERE email='admin@company.com'), 'admin-dashboard-browser', 1, 'CORPORATE')");
  console.log('Trusted device added');
  pool.end();
}
run();
