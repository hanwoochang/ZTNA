const mysql = require('mysql2/promise');

async function cleanAccounts() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '0421', database: 'ztna' });
  
  const testEmails = [
    'sim_user@company.com',
    'finance_corp@company.com',
    'finance_byod@company.com',
    'finance_vuln@company.com'
  ];
  
  console.log('Cleaning up test accounts...');

  for (const email of testEmails) {
    const [userRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (userRows.length > 0) {
      const userId = userRows[0].id;
      // access_logs delete
      await db.query('DELETE FROM access_logs WHERE user_id = ?', [userId]);
      // devices delete
      await db.query('DELETE FROM devices WHERE user_id = ?', [userId]);
      // users delete
      await db.query('DELETE FROM users WHERE id = ?', [userId]);
      
      console.log(`Deleted account and related records for: ${email}`);
    } else {
      console.log(`Account not found (already deleted): ${email}`);
    }
  }
  
  // also delete SIM-DEV devices if they exist but have no user
  await db.query("DELETE FROM devices WHERE device_identifier LIKE 'SIM-DEV%'");
  
  console.log('Cleanup completed successfully.');
  process.exit();
}

cleanAccounts().catch(err => {
  console.error(err);
  process.exit(1);
});
