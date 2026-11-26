// Netlify deploy previews add a "Collaborate" toolbar (/.netlify/scripts/cdp) at the bottom of the page. On phones it
// covers the game's bottom bar, so taps time out. The live site has no toolbar. Preload this to block it in every
// browser context:  node -r ./no-netlify-toolbar.js xtest.js https://deploy-preview-N--3am-incident-kish.netlify.app/
const pw = require('playwright');
const EMPTY = (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
for (const engine of [pw.chromium, pw.webkit, pw.firefox]) {
  const launch = engine.launch.bind(engine);
  engine.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...a) => { const ctx = await newContext(...a); await ctx.route('**/.netlify/scripts/**', EMPTY); await ctx.route('https://app.netlify.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '' })); return ctx; };
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async (...a) => { const p = await newPage(...a); await p.route('**/.netlify/scripts/**', EMPTY); await p.route('https://app.netlify.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '' })); return p; };
    return browser;
  };
}
