const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

content = content.replace(/<t[hd][^>]*py-4[^>]*>/g, match => match.replace('py-4', 'py-2'));

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed table padding to py-2!');
