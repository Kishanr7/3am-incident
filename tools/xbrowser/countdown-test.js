// Next-daily countdown on home, today's case, practice and past days, on every platform.
// Usage: node countdown-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const SETUPS = [
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows Edge', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Galaxy S9+ (Chrome)', chromium, D('Galaxy S9+')],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
];
const solve = (p) => p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const ty = document.getElementById('ans_' + q.id); if (ty) { ty.value = String(c.answerQ.value); ty.dispatchEvent(new Event('input')); continue; } const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
const open = async (p, hash) => { await p.goto(BASE + hash); await p.waitForFunction((h) => { const s = window.__tai && window.__tai.state; return s && document.getElementById('picks') && location.hash === h; }, hash); await p.waitForTimeout(100); };
const isTime = (s) => /^\d\d:\d\d:\d\d$/.test(s || '');

(async () => {
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {});
    const ctx = await b.newContext(opts); await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    try {
      // Monday 16 Nov 2026, 15:00 local
      await p.clock.install({ time: new Date(2026, 10, 16, 15, 0, 0) });
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      if (await p.locator('[data-countdown]').count()) bugs.push('home shows a countdown before today is solved');
      // practice solved, today not solved -> link to today's case
      await open(p, '#/practice/4'); await solve(p); await p.waitForTimeout(200);
      if (await p.locator('[data-countdown]').count()) bugs.push('practice shows a countdown while today is unsolved');
      const link = await p.locator('.countdown a').getAttribute('href').catch(() => null);
      if (link !== '#/daily/2026-11-16') bugs.push('practice should link to today\'s case, got ' + link);
      // solve today
      await open(p, '#/daily/2026-11-16'); await solve(p); await p.waitForTimeout(200);
      const t1 = await p.textContent('[data-countdown]').catch(() => '');
      // the fake clock keeps running while the page loads, so allow a few seconds
      if (!/^(09:00:00|08:59:5\d)$/.test(t1)) bugs.push('today\'s countdown at 15:00 should read about 09:00:00, got ' + t1);
      await p.clock.runFor(2000); await p.waitForTimeout(50);
      const t2 = await p.textContent('[data-countdown]').catch(() => '');
      const secs = (x) => x.split(':').reduce((m, v) => m * 60 + Number(v), 0);
      if (!isTime(t2) || secs(t1) - secs(t2) < 2) bugs.push('countdown not ticking: ' + t1 + ' -> ' + t2);
      // home now shows it in today's card
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn'); await p.clock.runFor(1000);
      const h = await p.locator('.hero [data-countdown]').textContent().catch(() => '');
      if (!isTime(h)) bugs.push('home card has no countdown after solving today: ' + h);
      // practice and a past day now show the countdown too
      await open(p, '#/practice/4'); await p.clock.runFor(1000);
      if (!isTime(await p.textContent('[data-countdown]').catch(() => ''))) bugs.push('practice solved screen has no countdown');
      await open(p, '#/daily/2026-11-15'); await solve(p); await p.waitForTimeout(200); await p.clock.runFor(1000);
      if (!isTime(await p.textContent('[data-countdown]').catch(() => ''))) bugs.push('past-day solved screen has no countdown');
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bugs.push('sideways scroll');
      // midnight: it turns into a link to the new case
      const ctx2 = await b.newContext(opts); await ctx2.addInitScript(() => localStorage.setItem('tai.toured', '1'));
      const q = await ctx2.newPage(); await q.clock.install({ time: new Date(2026, 10, 16, 23, 59, 57) });
      await open(q, '#/daily/2026-11-16'); await solve(q); await q.waitForTimeout(200);
      await q.clock.runFor(5000);
      const after = await q.locator('.countdown a').getAttribute('href').catch(() => null);
      if (after !== '#/daily/2026-11-17') bugs.push('at midnight should link to 17 Nov, got ' + after + ' / ' + (await q.textContent('.countdown').catch(() => '')));
      await ctx2.close();
    } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${label}`); for (const x of bugs) console.log('      - ' + x);
    await b.close();
  }
})();
