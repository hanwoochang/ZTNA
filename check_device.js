const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'0421',database:'ztna'});
  const [rows] = await c.query("SELECT * FROM devices WHERE device_identifier='admin-dashboard-browser'");
  console.log(rows);
  c.end();
}
run();
