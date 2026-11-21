// Streak protection shown on the home page: Mon–Thu solved, Fri missed, Sat (today) solved, Sun solved late.
// Expect streak 5, Fri marked as covered by Byte, an explanation line, the paw on the streak button,
// and Sun not counted. Usage: node streakui-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Galaxy S9+ (Chrome)', chromium, { ...D('Galaxy S9+'), viewport: { width: 320, height: 658 } }],
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows Edge', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
];
(async () => {
  let failed = 0;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install({ time: new Date('2026-11-21T20:00:00') });
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      await p.evaluate(() => {
        TAI.store.reset();
        const put = (d, on) => TAI.store.put(d, { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: on || d, solvedAt: 30, queries: 1 });
        ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-21'].forEach((d) => put(d));
        put('2026-11-15', '2026-11-21'); // Sunday, solved late
      });
      await p.reload(); await p.waitForSelector('.week');
      const r = await p.evaluate(() => {
        const tile = (iso) => document.querySelector(`.day[href="#/daily/${iso}"]`);
        return {
          streak: document.getElementById('statsBtn').textContent,
          friCovered: tile('2026-11-20').classList.contains('covered'), friMark: tile('2026-11-20').querySelector('.st').textContent,
          sunLate: tile('2026-11-15').classList.contains('late'), sunGreen: tile('2026-11-15').classList.contains('solved'),
          line: (document.querySelector('.cover') || {}).textContent || '',
          wide: document.documentElement.scrollWidth - innerWidth,
        };
      });
      if (!/🔥\s*5/.test(r.streak)) bugs.push('streak button: ' + r.streak);
      if (!r.streak.includes('🐾')) bugs.push('streak button does not show the cover');
      if (!r.friCovered || r.friMark !== '🐾') bugs.push('Fri 20 Nov not shown as covered');
      if (!r.sunLate || r.sunGreen) bugs.push('Sun solved late should not look like a streak day');
      if (!/Fri 20 Nov/.test(r.line)) bugs.push('no explanation line: ' + r.line);
      if (r.wide > 1) bugs.push('sideways scroll ' + r.wide);
      await p.locator('.week').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `shots/streakui-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` });
      await p.evaluate(() => TAI.store.reset());
    } catch (e) { bugs.push('error: ' + e.message.split('\n')[0]); }
    if (errs.length) bugs.push('page errors: ' + errs.join(' | '));
    console.log((bugs.length ? 'FAIL ' : 'PASS ') + label + (bugs.length ? '\n  - ' + bugs.join('\n  - ') : ''));
    if (bugs.length) failed++;
    await b.close();
  }
  console.log(failed ? failed + ' setup(s) failed' : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})();
