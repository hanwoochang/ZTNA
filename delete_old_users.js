const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'0421',database:'ztna'});
  await c.query("DELETE FROM users WHERE email IN ('043kws@gmail.com', '0421kws@naver.com')");
  console.log('Old test accounts deleted successfully.');
  c.end();
}
run();
