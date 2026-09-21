const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// The current inputs have duplicate style tags like:
// style={{ boxSizing: 'border-box' }}
// className="..." style={{ padding: "24px", fontSize: "1.25rem" }}

// Let's replace the whole input blocks to be 100% safe.
const emailInputOldRegex = /<input\s+type="email"[^>]+>/;
const passwordInputOldRegex = /<input\s+type="password"[^>]+>/;

const newEmailInput = `<input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', padding: '24px', fontSize: '1.5rem' }} />`;
const newPasswordInput = `<input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', padding: '24px', fontSize: '1.5rem' }} />`;

content = content.replace(emailInputOldRegex, newEmailInput);
content = content.replace(passwordInputOldRegex, newPasswordInput);

// The button has:
// style={{ padding: "24px", fontSize: "1.5rem" }}
content = content.replace(
  'style={{ padding: "24px", fontSize: "1.5rem" }}',
  'style={{ boxSizing: \'border-box\', height: \'84px\', padding: \'24px\', fontSize: \'1.5rem\' }}'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed input and button sizing to be identical!');
