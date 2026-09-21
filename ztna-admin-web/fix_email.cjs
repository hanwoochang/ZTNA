const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

content = content.replace(
    'type="email" placeholder="Email Address"',
    'type="email" placeholder="Email Address" style={{ boxSizing: \'border-box\' }}'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed email input!');
