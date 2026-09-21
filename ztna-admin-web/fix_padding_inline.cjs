const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// Replace standard tailwind padding classes in th and td with explicit inline styles to bypass Tailwind JIT cache
content = content.replace(/<t([hd])([^>]*)py-2([^>]*)>/g, (match, tag, before, after) => {
    // If it already has a style tag, we need to inject it. But it's easier to just append a new style tag
    // if there isn't one, or if there is, we might conflict. 
    // Wait, none of the th/td tags currently have inline styles in App.tsx.
    return `<t${tag}${before}${after} style={{ paddingTop: '8px', paddingBottom: '8px' }}>`;
});

// Just in case it's still py-4 somehow
content = content.replace(/<t([hd])([^>]*)py-4([^>]*)>/g, (match, tag, before, after) => {
    return `<t${tag}${before}${after} style={{ paddingTop: '8px', paddingBottom: '8px' }}>`;
});

// Also there was py-8 or py-6 just in case
content = content.replace(/<t([hd])([^>]*)py-8([^>]*)>/g, (match, tag, before, after) => {
    return `<t${tag}${before}${after} style={{ paddingTop: '8px', paddingBottom: '8px' }}>`;
});
content = content.replace(/<t([hd])([^>]*)py-6([^>]*)>/g, (match, tag, before, after) => {
    return `<t${tag}${before}${after} style={{ paddingTop: '8px', paddingBottom: '8px' }}>`;
});

fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed table padding with inline styles!');
