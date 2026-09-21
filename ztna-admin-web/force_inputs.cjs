const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

const emailRegex = /<input\s+type="email"[\s\S]*?\/>/;
const passwordRegex = /<input\s+type="password"[\s\S]*?\/>/;

content = content.replace(emailRegex, `<input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />`);

content = content.replace(passwordRegex, `<input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />`);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Inputs aggressively forced to matching sizes!');
