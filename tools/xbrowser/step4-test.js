// Streak protection rules and the pattern deck. Usage: node step4-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };

async function streakRules(p) {
  return p.evaluate(() => {
    const today = '2026-11-30';
    const rng = (a, b) => { const out = []; for (let x = a; x <= b; x = TAI.util.addDays(x, 1)) out.push(x); return out; };
    const nov = (d) => '2026-11-' + String(d).padStart(2, '0');
    const cases = [
      ['10 days in a row', rng(nov(20), nov(29)), 10, []],
      ['one miss is covered', rng(nov(20), nov(27)).concat([nov(29)]), 9, [nov(28)]],
      ['two misses in a row end it', rng(nov(20), nov(26)).concat([nov(29)]), 1, []],
      ['two misses 5 days apart end it', [20, 21, 23, 24, 25, 26, 28, 29].map(nov), 2, []],
      ['two misses 7 days apart are both covered', [20, 22, 23, 24, 25, 26, 27, 29].map(nov), 8, [nov(21), nov(28)]],
      ['today not played yet is not a miss', rng(nov(25), nov(29)), 5, []],
      ['nothing solved', [], 0, []],
      ['archive solves do not count', [], 0, [], true],
    ];
    const bugs = [];
    for (const [label, days, want, wantCovered, archive] of cases) {
      TAI.store.reset();
      for (const d of days) TAI.store.put(d, { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: d, solvedAt: 30, queries: 1 });
      if (archive) for (const d of rng(nov(20), nov(29))) TAI.store.put(d, { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: today, solvedAt: 30, queries: 1 });
      const st = TAI.streaks(today);
      if (st.current !== want || JSON.stringify(st.covered) !== JSON.stringify(wantCovered)) bugs.push(`${label}: streak ${st.current} covered ${JSON.stringify(st.covered)} (want ${want}, ${JSON.stringify(wantCovered)})`);
    }
    TAI.store.reset();
    return bugs;
  });
}

const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows Edge', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
];
(async () => {
  let first = true;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      if (first) { for (const x of await streakRules(p)) bugs.push(x); first = false; }
      await p.reload(); await p.waitForSelector('.deck');
      const nT = await p.evaluate(() => TAI.TEMPLATES.length); if ((await p.locator('.pcard').count()) !== nT) bugs.push('deck should have ' + nT + ' cards');
      if ((await p.locator('.pcard.locked').count()) !== nT) bugs.push('all cards should start locked');
      // solve practice 1 (late) and 2 (fanout), easy cases
      for (const n of [1, 2]) {
        await p.goto(BASE + '#/practice/' + n); await p.waitForFunction((k) => window.__tai.state && window.__tai.state.practice === k && document.getElementById('picks'), n);
        await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
        await p.waitForTimeout(150);
      }
      await p.goto(BASE + '#/'); await p.waitForSelector('.deck');
      if ((await p.locator('button.pcard').count()) !== 2) bugs.push('2 patterns should be unlocked, got ' + (await p.locator('button.pcard').count()));
      const head = await p.textContent('.deck').catch(() => '');
      if (!/Late-arriving data/.test(head) || !/Fan-out join/.test(head)) bugs.push('unlocked names wrong: ' + head.slice(0, 80));
      await p.locator('.deck').screenshot({ path: path.join(__dirname, 'shots', `step4-${slug}-deck.png`) });
      await tap('button.pcard >> nth=0'); await p.waitForTimeout(200);
      if (!(await p.locator('dialog[open]').count())) bugs.push('pattern card did not open tips');
      else {
        const txt = await p.textContent('dialog[open]');
        if (!/How to spot it/.test(txt)) bugs.push('tips dialog missing tips');
        await p.keyboard.press('Escape'); await p.waitForTimeout(150);
        if (await p.locator('dialog[open]').count()) bugs.push('Escape did not close tips');
      }
      // stats shows streak protection
      await tap('#statsBtn'); await p.waitForSelector('dialog[open]');
      if (!/Streak protection/.test(await p.textContent('dialog[open]'))) bugs.push('stats has no streak protection line');
      await p.keyboard.press('Escape');
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bugs.push('sideways scroll on home');
    } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${label}`); for (const x of bugs) console.log('      - ' + x);
    await b.close();
  }
})();
