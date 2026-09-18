const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'0421',database:'ztna'});
  await c.query("UPDATE devices SET last_ip_address='127.0.0.1' WHERE device_identifier='admin-dashboard-browser'");
  console.log('IP updated');
  c.end();
}
run();
