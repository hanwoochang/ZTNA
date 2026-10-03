const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'0421',database:'ztna'});
  try {
    try {
        await c.query("ALTER TABLE devices ADD COLUMN status ENUM('PENDING', 'APPROVED', 'BLOCKED') DEFAULT 'PENDING'");
        console.log('Added status column');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    await c.query("UPDATE devices SET status = 'APPROVED' WHERE is_trusted = 1");
    await c.query("UPDATE devices SET status = 'BLOCKED' WHERE is_trusted = 0");
    console.log('Migrated data');
  } catch(e) { console.error(e); }
  process.exit();
}
run();
