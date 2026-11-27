// Own-SQL tips (case-sensitive text, same result as before), several statements, the 10-row cap, one-line queries in
// the feed (one open at a time), and the wide-screen layout.
// Usage: node sqltips-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };

const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Galaxy S9+ (Chrome)', chromium, { ...D('Galaxy S9+'), viewport: { width: 320, height: 658 } }],
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Laptop at 125% (Chrome)', chromium, { viewport: { width: 1093, height: 614 } }],
  ['Windows Edge', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
];
// Practice #4 uses the "units" template: provider 'Pebble Pay' sends cents.
const CASE = '#/practice/4';
const LOWER = "SELECT ROUND(SUM(CASE WHEN provider = 'pebble pay' THEN amount / 100.0 ELSE amount END), 2) AS r FROM payments;";
const SAME = 'SELECT ROUND(SUM(amount), 2) AS r FROM payments;';
const RIGHT = "SELECT ROUND(SUM(CASE WHEN provider = 'Pebble Pay' THEN amount / 100.0 ELSE amount END), 2) AS r FROM payments;";

(async () => {
  let fails = 0;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      { const hm = await p.locator('.hmain').boundingBox(), hs = await p.locator('.hside').boundingBox(), W = await p.evaluate(() => innerWidth);
        if (W >= 960 && !(hs.x > hm.x + hm.width - 1)) bugs.push('home: practice column is not beside the case of the day');
        if (W < 960 && !(hs.y > hm.y + hm.height - 1)) bugs.push('home: practice should sit below on narrow screens'); }
      await p.evaluate(() => TAI.store.reset());
      await p.goto(BASE + CASE); await p.waitForSelector('#ownSql', { state: 'attached' });
      const own = p.locator('details.own');
      if (!(await own.evaluate((d) => d.open))) await tap('details.own > summary');
      const run = async (sql) => { await p.fill('#ownSql', sql); await tap('#runOwn'); await p.waitForTimeout(400); };
      await run(LOWER);
      // Tips show under Run, with the latest result.
      const tipsNow = async () => (await p.locator('#ownOut .tips').textContent().catch(() => '')) || '';
      const t1 = await tipsNow();
      if (!/'pebble pay'/.test(t1) || !/'Pebble Pay'/.test(t1)) bugs.push('no case-sensitivity tip for lowercase literal: ' + t1);
      await run(SAME);
      const t2 = await tipsNow();
      if (!/Same result as your query at/.test(t2)) bugs.push('no same-result tip: ' + t2);
      await run(RIGHT);
      if (await p.locator('#ownOut .tips').count()) bugs.push('tip shown on a correct query: ' + (await tipsNow()));
      // Other dialects: a PostgreSQL cast fails with the SQLite way shown; CAST AS DATE runs but is flagged; LIKE ignores case.
      await run('SELECT created_at::date FROM payments LIMIT 1;');
      if (!/DATE\(x\)/.test(await tipsNow())) bugs.push('no SQLite tip for ::date: ' + (await tipsNow()));
      await run('SELECT CAST(received_at AS DATE) AS d FROM payments LIMIT 1;');
      if (!/gives a number/.test(await tipsNow())) bugs.push('no tip for CAST AS DATE: ' + (await tipsNow()));
      await run("SELECT COUNT(*) FROM payments WHERE provider LIKE 'pebble pay';");
      if (/case-sensitive/.test(await tipsNow())) bugs.push('case tip shown for LIKE, which ignores case');
      if (!(await p.locator('details.dialect').count()) || !/SQLite/.test(await p.textContent('details.own > summary'))) bugs.push('no SQLite label or dialect fold');
      // Two statements in the box: two results. More than 10 rows: the rest behind "Show all".
      await run('SELECT COUNT(*) AS n FROM payments;\nSELECT * FROM payments LIMIT 14;');
      if ((await p.locator('#ownOut .qres').count()) !== 2) bugs.push('two statements did not give two results: ' + (await p.locator('#ownOut .qres').count()));
      const shown = () => p.locator('#ownOut .qres').nth(1).locator('tbody tr').evaluateAll((rs) => rs.filter((r) => getComputedStyle(r).display !== 'none').length);
      if ((await shown()) !== 10) bugs.push('long result should show 10 rows first, shows ' + (await shown()));
      await p.locator('#ownOut [data-more]').click();
      if ((await shown()) !== 14) bugs.push('Show all did not show 14 rows: ' + (await shown()));
      // Your queries in the feed are one line each, closed; open one, then another: only one stays open.
      const lines = p.locator('#feed .entry.qline');
      if ((await lines.count()) !== 7) bugs.push('expected 7 one-line queries in the feed, got ' + (await lines.count()));
      if (await p.locator('#feed .qline table').count()) bugs.push('a closed query line shows a table');
      await lines.nth(0).locator('[data-open]').click();
      if ((await p.locator('#feed .qline.open').count()) !== 1 || !(await p.locator('#feed .qline.open table').count())) bugs.push('opening a query line did not show its result');
      await lines.nth(6).locator('[data-open]').click();
      if ((await p.locator('#feed .qline.open').count()) !== 1 || !(await lines.nth(6).evaluate((e) => e.classList.contains('open')))) bugs.push('opening a second query did not close the first');
      if ((await lines.nth(6).locator('.qres').count()) !== 2) bugs.push('reopened two-statement query does not show both results');
      await lines.nth(6).locator('[data-open]').click();
      if (await p.locator('#feed .qline.open').count()) bugs.push('tapping an open query did not close it');
      const clock1 = await p.textContent('#clock');
      await p.reload(); await p.waitForSelector('#feed .entry');
      if (await p.locator('#feed .qline.open').count()) bugs.push('a query line is open after reload');
      if ((await p.textContent('#clock')) !== clock1) bugs.push('opening queries changed the clock');
      // Layout
      const w = await p.evaluate(() => innerWidth);
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (sx > 1) bugs.push('sideways scroll ' + sx + 'px');
      const box = async (s) => p.locator(s).boundingBox();
      const m = await box('.case .main'), s = await box('#investigate');
      if (w >= 960) {
        if (!(s.x > m.x + m.width - 1)) bugs.push('checks panel is not beside the evidence');
        if (m.width < 560) bugs.push('evidence column too narrow: ' + m.width);
        const used = s.x + s.width - m.x; if (used < Math.min(0.9 * w, 1140) || used > Math.min(1440, 0.75 * w + 300)) bugs.push('case page uses ' + Math.round(used) + ' of ' + w + ' px (want the shared frame)');
        await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await p.waitForTimeout(300);
        const s2 = await box('#investigate');
        if (s2.y < -2 || s2.y > 40) bugs.push('checks panel did not stay on screen: y=' + s2.y);
      } else if (!(s.y > m.y + m.height - 1)) bugs.push('on narrow screens the checks should sit below the evidence');
      await p.evaluate(() => scrollTo(0, 0));
      await p.screenshot({ path: `shots/sqltips-${slug}.png`, fullPage: false });
      await p.evaluate(() => TAI.store.reset());
    } catch (e) { bugs.push('error: ' + e.message.split('\n')[0]); }
    if (errs.length) bugs.push('page errors: ' + errs.join(' | '));
    console.log((bugs.length ? 'FAIL ' : 'PASS ') + label + (bugs.length ? '\n  - ' + bugs.join('\n  - ') : ''));
    if (bugs.length) fails++;
    await b.close();
  }
  console.log(fails ? `${fails} setup(s) failed` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
