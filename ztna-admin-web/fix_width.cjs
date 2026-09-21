const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// Replace style on inputs
content = content.replace(
  /style=\{\{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem' \}\}/g,
  "style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }}"
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed width to 100% explicit!');
