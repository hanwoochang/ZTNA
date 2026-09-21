const mysql = require('mysql2/promise');

async function deleteUser() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '0421', database: 'ztna' });
  
  const email = '043kws@gmail.com';
  console.log(`Deleting account: ${email}`);

  const [userRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (userRows.length > 0) {
    const userId = userRows[0].id;
    // access_logs delete
    await db.query('DELETE FROM access_logs WHERE user_id = ?', [userId]);
    // devices delete
    await db.query('DELETE FROM devices WHERE user_id = ?', [userId]);
    // users delete
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log(`Successfully deleted user ID ${userId} and all related logs/devices.`);
  } else {
    console.log(`Account not found (already deleted): ${email}`);
  }
  
  process.exit();
}

deleteUser().catch(err => {
  console.error(err);
  process.exit(1);
});
