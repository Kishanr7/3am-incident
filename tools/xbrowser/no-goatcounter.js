// Test runs must never add to the real visit counts. On the live site (the only host where site/assets/stats.js
// counts), preload this to replace GoatCounter's script with an empty one in every browser context:
//   node -r ./no-goatcounter.js xtest.js https://3am-incident-kish.netlify.app/
// Two layers: a route that swaps in an empty script, and GoatCounter's own opt-out (localStorage skipgc = 't'), because
// in WebKit a service-worker-controlled page fetches past Playwright's routes. stats-test.js doesn't need this: it
// installs its own stub (registered later, so it wins) and blocks the service worker.
const pw = require('playwright');
const EMPTY = (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
const NOCOUNT = (r) => r.fulfill({ status: 204, body: '' });
const OPTOUT = () => { try { localStorage.setItem('skipgc', 't'); } catch (e) { /* storage blocked: the route still applies */ } };
const block = async (t) => { await t.route('https://gc.zgo.at/**', EMPTY); await t.route('https://*.goatcounter.com/**', NOCOUNT); await t.addInitScript(OPTOUT); return t; };
for (const engine of [pw.chromium, pw.webkit, pw.firefox]) {
  const launch = engine.launch.bind(engine);
  engine.launch = async (...args) => {
    const browser = await launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...a) => block(await newContext(...a));
    const newPage = browser.newPage.bind(browser);
    browser.newPage = async (...a) => block(await newPage(...a));
    return browser;
  };
}
