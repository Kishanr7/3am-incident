// Own-SQL tips (case-sensitive text, same result as before), Hide/Show for own queries, and the wide-screen layout.
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
      await p.evaluate(() => TAI.store.reset());
      await p.goto(BASE + CASE); await p.waitForSelector('#ownSql', { state: 'attached' });
      const own = p.locator('details.own');
      if (!(await own.evaluate((d) => d.open))) await tap('details.own > summary');
      const run = async (sql) => { await p.fill('#ownSql', sql); await tap('#runOwn'); await p.waitForTimeout(400); };
      await run(LOWER);
      const last = () => p.locator('#feed .entry').last();
      const t1 = (await last().locator('.tips').textContent().catch(() => '')) || '';
      if (!/'pebble pay'/.test(t1) || !/'Pebble Pay'/.test(t1)) bugs.push('no case-sensitivity tip for lowercase literal: ' + t1);
      await run(SAME);
      const t2 = (await last().locator('.tips').textContent().catch(() => '')) || '';
      if (!/Same result as your query at/.test(t2)) bugs.push('no same-result tip: ' + t2);
      await run(RIGHT);
      if (await last().locator('.tips').count()) bugs.push('tip shown on a correct query: ' + (await last().locator('.tips').textContent()));
      // Hide the first own query, check it folds, survives reload, and comes back.
      const first = p.locator('#feed .entry').first();
      await first.locator('[data-fold]').click();
      if (!(await p.locator('#feed .entry').first().evaluate((e) => e.classList.contains('folded')))) bugs.push('Hide did not fold the query');
      const clock1 = await p.textContent('#clock');
      await p.reload(); await p.waitForSelector('#feed .entry');
      if (!(await p.locator('#feed .entry').first().evaluate((e) => e.classList.contains('folded')))) bugs.push('fold not kept after reload');
      if ((await p.textContent('#clock')) !== clock1) bugs.push('hiding changed the clock');
      await p.locator('#feed .entry').first().locator('[data-fold]').click();
      if (await p.locator('#feed .entry').first().evaluate((e) => e.classList.contains('folded'))) bugs.push('Show did not unfold');
      // Layout
      const w = await p.evaluate(() => innerWidth);
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (sx > 1) bugs.push('sideways scroll ' + sx + 'px');
      const box = async (s) => p.locator(s).boundingBox();
      const m = await box('.case .main'), s = await box('#investigate');
      if (w >= 960) {
        if (!(s.x > m.x + m.width - 1)) bugs.push('checks panel is not beside the evidence');
        if (m.width < 560) bugs.push('evidence column too narrow: ' + m.width);
        const used = s.x + s.width - m.x; if (used < Math.min(0.85 * w, 1450)) bugs.push('only ' + Math.round(used) + ' of ' + w + 'px used');
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
