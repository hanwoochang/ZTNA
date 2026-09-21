const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// The original container class
content = content.replace(
  'className="w-[440px] bg-card p-12 rounded-lg border border-hairline shadow-none"',
  'className="bg-card rounded-lg border border-hairline shadow-none" style={{ width: "600px", padding: "64px" }}'
);

// ShieldAlert size
content = content.replace(
  '<ShieldAlert size={56} className="text-primary" />',
  '<ShieldAlert size={80} className="text-primary" />'
);

// h1 size (text-3xl to larger inline style)
content = content.replace(
  'className="text-3xl font-semibold text-center mb-5 text-ink tracking-tight"',
  'className="font-semibold text-center mb-5 text-ink tracking-tight" style={{ fontSize: "2.5rem" }}'
);

// subtitle text size
content = content.replace(
  'className="text-center text-body mb-10 text-base"',
  'className="text-center text-body mb-10" style={{ fontSize: "1.25rem" }}'
);

// Email input sizing (increase font and padding)
content = content.replace(
  'className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-ink text-lg outline-none focus:bg-card focus:border-primary transition-all"',
  'className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ padding: "24px", fontSize: "1.25rem" }}'
);

// Password input sizing (increase font and padding)
content = content.replace(
  'className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-ink text-lg outline-none focus:bg-card focus:border-primary transition-all"',
  'className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ padding: "24px", fontSize: "1.25rem" }}'
);

// Button sizing
content = content.replace(
  'className="w-full bg-primary hover:bg-primary-active text-card p-5 rounded-md text-lg font-bold transition-all mt-6"',
  'className="w-full bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all mt-6" style={{ padding: "24px", fontSize: "1.5rem" }}'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed login page size!');
