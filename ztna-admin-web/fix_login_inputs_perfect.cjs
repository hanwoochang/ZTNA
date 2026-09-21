const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

const emailInputTarget = `<div>
              <input 
                type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ boxSizing: 'border-box' }}
                className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ padding: "24px", fontSize: "1.25rem" }} 
              />
            </div>`;

const passwordInputTarget = `<div>
              <input 
                type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ boxSizing: 'border-box' }}
                className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ padding: "24px", fontSize: "1.25rem" }} 
              />
            </div>`;

const newEmailInput = `<div>
              <input 
                type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" 
                style={{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem' }} 
              />
            </div>`;

const newPasswordInput = `<div>
              <input 
                type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" 
                style={{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem' }} 
              />
            </div>`;

content = content.replace(emailInputTarget, newEmailInput);
content = content.replace(passwordInputTarget, newPasswordInput);

// Also set the button explicitly to 84px height
content = content.replace(
  'style={{ padding: "24px", fontSize: "1.5rem" }}',
  'style={{ boxSizing: \'border-box\', height: \'84px\', padding: \'0 24px\', fontSize: \'1.5rem\' }}'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Inputs and button perfectly matched!');
