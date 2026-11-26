// Running your own query keeps the page still: the Run button stays where it was, pass or fail shows right under it,
// and the query is still saved in the evidence feed and the query count. Same for the ⭐ bonus query after solving.
// Usage: node runinplace-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };

const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['iPhone 15 Pro Max (WebKit)', webkit, D('iPhone 15 Pro Max')],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Galaxy S9+ (Chrome)', chromium, { ...D('Galaxy S9+'), viewport: { width: 320, height: 658 } }],
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows Edge', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
  ['Mac Chrome', chromium, { viewport: { width: 1280, height: 800 } }],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
];
const EASY = 1, HARD = 76, STAR = 2; // practice cases: easy (fill-in), hard (free SQL), easy solved beforehand (bonus)

(async () => {
  let fails = 0;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const pos = (s) => p.evaluate((sel) => ({ y: scrollY, top: document.querySelector(sel).getBoundingClientRect().top }), s);
    const still = (what, a, z) => { if (Math.abs(z.top - a.top) > 3) bugs.push(`${what}: the page moved (button ${Math.round(a.top)} → ${Math.round(z.top)} px, scroll ${Math.round(a.y)} → ${Math.round(z.y)})`); };
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      await p.evaluate((n) => { TAI.store.reset(); TAI.store.put('p' + n, { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: '2026-11-26', solvedAt: 30, queries: 1 }); }, STAR);
      const open = async (n) => {
        await p.goto(BASE + '#/practice/' + n); await p.waitForSelector('#runOwn', { state: 'attached' }); await p.waitForTimeout(300);
        if (!(await p.locator('details.own').evaluate((d) => d.open))) await tap('details.own > summary');
        for (const id of await p.$$eval('.qc', (x) => x.slice(0, 2).map((q) => q.dataset.id))) { await tap(`.qc[data-id="${id}"]`); await p.waitForTimeout(500); }
      };
      const runOwn = async (sql) => {
        await p.fill('#ownSql', sql); await p.evaluate(() => document.getElementById('runOwn').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
        const n0 = await p.locator('#feed .entry').count(), q0 = await p.textContent('#qn');
        const a = await pos('#runOwn'); await tap('#runOwn'); await p.waitForTimeout(900); const z = await pos('#runOwn');
        if ((await p.locator('#feed .entry').count()) !== n0 + 1) bugs.push('query not added to the evidence feed');
        if ((await p.textContent('#qn')) === q0) bugs.push('query count did not change');
        return [a, z, ((await p.locator('#ownOut').textContent({ timeout: 1000 }).catch(() => '(no result box under Run)')) || '').trim()];
      };
      const answer = (n) => p.evaluate((k) => { const a = TAI.practiceCase(k).answerQ; return { right: a.sql, wrong: a.sql.replace(a.blank, 'NULL') }; }, n);

      await open(EASY); let s = await answer(EASY);
      let [a, z, out] = await runOwn(s.wrong); still('easy, wrong fill-in', a, z);
      if (!/❌/.test(out) || !/not the real number|no rows/.test(out)) bugs.push('easy wrong fill-in: no fail verdict: ' + out.slice(0, 80));
      [a, z, out] = await runOwn(s.right); still('easy, right fill-in', a, z);
      if (!/✅/.test(out)) bugs.push('easy right fill-in: no pass verdict: ' + out.slice(0, 80));
      [a, z, out] = await runOwn('SELEC nonsense'); still('SQL error', a, z);
      if (!/SQL error/.test(out)) bugs.push('no SQL error shown under Run: ' + out.slice(0, 80));
      if (await p.evaluate(() => document.activeElement && document.activeElement.closest && !!document.activeElement.closest('#feed'))) bugs.push('focus jumped to the feed');

      await open(HARD); s = await answer(HARD);
      [a, z, out] = await runOwn(s.right); still('hard, own SQL', a, z);
      if (/✅|real number/.test(out)) bugs.push('hard case says whether the number is right: ' + out.slice(0, 80));
      if (!(await p.locator('#ownOut table').count())) bugs.push('hard: result table not shown under Run');

      await p.goto(BASE + '#/practice/' + STAR); await p.waitForSelector('#starRun', { state: 'attached' }); await p.waitForTimeout(300);
      s = await answer(STAR);
      for (const [sql, want] of [['SELECT 1 AS x', /none of its numbers/], [s.right, null]]) {
        await p.fill('#starSql', sql); await p.evaluate(() => document.getElementById('starRun').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
        const n0 = await p.locator('#feed .entry').count();
        const a2 = await pos('#report'); await tap('#starRun'); await p.waitForTimeout(900); const z2 = await pos('#report');
        still('bonus query', a2, z2);
        if ((await p.locator('#feed .entry').count()) !== n0 + 1) bugs.push('bonus query not added to the feed');
        if (want && !want.test((await p.textContent('#starNote')) || '')) bugs.push('bonus: no fail note under Run');
        if (!want && !(await p.locator('.star.done').count())) bugs.push('bonus: right query did not earn the star');
      }
      await p.evaluate(() => TAI.store.reset());
    } catch (e) { bugs.push('error: ' + e.message.split('\n')[0]); }
    if (errs.length) bugs.push('page errors: ' + errs.join(' | '));
    await b.close();
    console.log((bugs.length ? 'FAIL ' : 'ok   ') + label + (bugs.length ? '\n   - ' + bugs.join('\n   - ') : ''));
    if (bugs.length) fails++;
  }
  console.log(fails ? `${fails} setup(s) failed` : 'all setups passed');
  process.exit(fails ? 1 : 0);
})();
