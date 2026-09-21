const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// Replace the Search icon className with inline styles for perfect centering
content = content.replace(
  'className="absolute right-4 top-3 text-muted"',
  'className="absolute text-muted" style={{ right: "16px", top: "50%", transform: "translateY(-50%)" }}'
);

// Just in case it's still top-4.5
content = content.replace(
  'className="absolute right-5 top-4.5 text-muted"',
  'className="absolute text-muted" style={{ right: "16px", top: "50%", transform: "translateY(-50%)" }}'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed search icon centering!');
