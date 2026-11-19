// Plays Daily #12–#22 (20–30 Nov 2026), which covers all 11 case types including the 4 production
// incidents, with a fake clock. Opens every check, sends a wrong report then the right one, checks the
// new cast portraits, the 11-card pattern deck, and sideways overflow. Usage: node newtypes-test.js [baseUrl]
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

async function play(page) {
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    TAI.store.reset();
    const routes = []; for (let i = 0; i <= 10; i++) routes.push('#/daily/' + TAI.util.addDays('2026-11-20', i));
    const fails = []; const types = new Set(); const people = new Set();
    for (const r of routes) {
      location.hash = r; let st;
      for (let k = 0; k < 200; k++) { await sleep(25); st = window.__tai.state; if (st && document.getElementById('picks') && st.iso === r.split('/')[2]) break; }
      if (!st || !document.getElementById('picks')) { fails.push(r + ' did not open'); continue; }
      const c = st.c; types.add(c.tpl.id); c.intro.forEach((m) => people.add(m.who));
      if (document.querySelectorAll('.chat .msg svg').length < c.intro.length) fails.push(r + ' a chat portrait is missing');
      const h1 = document.querySelector('.case-head h1').textContent;
      if (h1.split(c.co.name).length !== 2) fails.push(r + ' company named ' + (h1.split(c.co.name).length - 1) + ' times in title: ' + h1);
      for (const b of [...document.querySelectorAll('#picks button')]) { b.click(); await sleep(5); }
      if (document.querySelectorAll('#feed .err').length) fails.push(r + ' a check shows an SQL error');
      const answer = (q, right) => { const ty = document.getElementById('ans_' + q.id); if (ty) { ty.value = right ? String(c.answerQ.value) : '1'; ty.dispatchEvent(new Event('input')); return; } const o = q.options.find((x) => (right ? x.correct : !x.correct)); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); };
      for (const q of c.questions) answer(q, false);
      document.getElementById('send').click(); await sleep(5);
      if (st.rec.solved) fails.push(r + ' solved with wrong answers');
      if (!document.querySelector('.why')) fails.push(r + ' no explanation for wrong answer');
      for (const q of c.questions) answer(q, true);
      document.getElementById('send').click(); await sleep(20);
      if (!st.rec.solved) fails.push(r + ' not solved with right answers');
      if (!document.body.innerText.includes(c.closing.text.slice(0, 30))) fails.push(r + ' closing line not shown');
      if (document.documentElement.scrollWidth > innerWidth + 1) fails.push(r + ' sideways scroll');
      const out = [...document.querySelectorAll('.wrap *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && !e.closest('.tbl'); });
      if (out.length) fails.push(r + ' element past edge: ' + (out[0].className || out[0].tagName));
    }
    location.hash = '#/';
    return { fails, types: [...types], people: [...people] };
  });
}

(async () => {
  let failed = 0;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install({ time: new Date('2026-11-30T10:00:00') });
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      const r = await play(p);
      bugs.push(...r.fails);
      if (r.types.length !== 11) bugs.push('expected 11 case types in #12–#22, got ' + r.types.join(','));
      for (const who of ['nia', 'theo']) if (!r.people.includes(who)) bugs.push(who + ' never speaks');
      await p.goto(BASE + '#/'); await p.waitForSelector('.deck');
      const cards = await p.locator('.pcard').count(); if (cards !== 11) bugs.push('pattern deck has ' + cards + ' cards');
      const unlocked = await p.locator('button.pcard').count(); if (unlocked !== 11) bugs.push('after solving every type, ' + unlocked + ' patterns unlocked');
      if (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth > 1)) bugs.push('home sideways scroll');
      await p.screenshot({ path: `shots/newtypes-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, fullPage: true });
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
