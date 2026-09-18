const mysql = require('mysql2/promise');
async function check() {
  const db = await mysql.createConnection({host: 'localhost', user: 'root', password: '0421', database: 'ztna'});
  const [users] = await db.query('SELECT id, email, name, role FROM users');
  console.log("USERS:", users);
  const [devices] = await db.query('SELECT * FROM devices');
  console.log("DEVICES:", devices);
  process.exit();
}
check();
