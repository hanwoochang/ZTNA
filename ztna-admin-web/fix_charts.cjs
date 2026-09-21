const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

content = content.replace(/<ResponsiveContainer width="100%" height="100%">/g, '');
content = content.replace(/<\/ResponsiveContainer>/g, '');
content = content.replace('<LineChart data={trend}', '<LineChart width={700} height={260} data={trend}');
content = content.replace('<BarChart data={topRisky}', '<BarChart width={450} height={260} data={topRisky}');

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed ResponsiveContainer!');
