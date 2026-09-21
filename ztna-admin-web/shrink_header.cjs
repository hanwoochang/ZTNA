const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. Header wrapper padding
content = content.replace(/style=\{\{ padding: '32px 48px' \}\}/g, "style={{ padding: '16px 48px' }}");

// 2. Button in UsersPage
content = content.replace(
  'className="bg-primary hover:bg-primary-active text-card px-8 py-4 rounded-md text-lg font-bold transition-all"',
  'className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: "10px 24px", fontSize: "15px" }}'
);

// 3. Input in DevicesPage
content = content.replace(
  'className="bg-canvas text-lg text-ink rounded-md px-6 py-4 w-80 outline-none border border-hairline focus:border-primary"',
  'className="bg-canvas text-ink rounded-md w-80 outline-none border border-hairline focus:border-primary" style={{ padding: "10px 16px", fontSize: "15px" }}'
);

// 4. Search icon position in DevicesPage
// It was right-5 top-4.5
content = content.replace(
  'className="absolute right-5 top-4.5 text-muted"',
  'className="absolute right-4 top-3 text-muted"'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed header sizes!');
