// Byte's hints after wrong numbers: one more per wrong try, never the full answer query. Usage: node hints-test.js [baseUrl]
// Plays a medium and a hard practice case on all 11 setups: four wrong numbers, then the right one.
// Both levels get 2 hints: where to look, then what the key piece is (medium: what goes in the ____ of its fill-in
// query; hard, which has no fill-in query, never sees a ____). No query or query shape is ever shown.
const { chromium, webkit, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SETUPS = [
  ['Windows', 'Chrome 1366', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows', 'Edge 1920', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac', 'Safari (WebKit) 1440', webkit, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ['Mac', 'Chrome 1280', chromium, { viewport: { width: 1280, height: 800 } }],
  ['iPhone', 'iPhone SE (375)', webkit, D('iPhone SE')],
  ['iPhone', 'iPhone 13 mini', webkit, D('iPhone 13 Mini')],
  ['iPhone', 'iPhone 15 Pro Max', webkit, D('iPhone 15 Pro Max')],
  ['iPhone', 'Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Android', 'Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Android', 'Galaxy S9+ (Chrome, 320)', chromium, D('Galaxy S9+')],
  ['iPad', 'iPad Mini landscape', webkit, D('iPad Mini landscape')],
];
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

(async () => {
  let failed = 0; let k = 0;
  for (const [plat, label, eng, opts, launch] of SETUPS) {
    const bugs = []; const seen = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => { try { localStorage.setItem('tai.toured', '1'); } catch (e) { /* private mode */ } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const tap = (s) => (opts.hasTouch ? p.tap(s) : p.click(s));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      await p.evaluate(() => TAI.store.reset());
      for (const level of ['medium', 'hard']) {
        // a different case of each level per setup, so 11 setups cover many case types
        const n = await p.evaluate(([l, i]) => { const all = TAI.levelCases(l); return all[(i * 5) % all.length]; }, [level, k]);
        await p.evaluate((x) => { location.hash = '#/practice/' + x; }, n);
        await p.waitForFunction((x) => window.__tai && window.__tai.state && String(window.__tai.state.practice) === String(x) && document.getElementById('picks'), n);
        const info = await p.evaluate(() => { const c = window.__tai.state.c; return { tpl: c.tpl.id, sql: c.answerQ.sql, blank: c.answerQ.blank, value: c.answerQ.value, money: c.answerQ.money, num: c.questions[c.questions.length - 1].id, fillIn: !!c.fillIn }; });
        seen.push(`${level} #${n} ${info.tpl}`);
        const want = 2;
        if (info.fillIn !== (level === 'medium')) bugs.push(`${level} #${n}: fill-in is ${info.fillIn}`);
        await p.evaluate(() => { const c = window.__tai.state.c; const q = c.questions[0]; const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); });
        const bq = new RegExp('(^|[^\\w-])' + info.blank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\w-])');
        for (let i = 1; i <= 4; i++) {
          await p.fill('#ans_' + info.num, '1'); await tap('#send'); await sleep(250);
          const w = await p.evaluate(() => { const el = document.querySelector('#report .worked'); return el ? { li: el.querySelectorAll('li').length, text: el.innerText, pres: [...el.querySelectorAll('pre')].map((x) => x.textContent) } : null; });
          const expect = Math.min(Math.max(0, i - 1), want);
          const got = w ? w.li : 0;
          if (got !== expect) bugs.push(`${level} #${n} ${info.tpl}: ${got} hints after ${i} wrong (want ${expect})`);
          const all = await p.evaluate(() => document.getElementById('report').innerText);
          if (/dragged this query/i.test(all)) bugs.push(`${level} #${n}: old "dragged this query" text`);
          if (norm(all).includes(norm(info.sql))) bugs.push(`${level} #${n} ${info.tpl}: the full answer query is on screen after ${i} wrong`);
          if (w && bq.test(w.text)) bugs.push(`${level} #${n} ${info.tpl}: hints give away the blank ${info.blank}`);
          if (w && w.pres.length) bugs.push(`${level} #${n}: the hints show a query`);
          if (level === 'hard' && w && /____/.test(w.text)) bugs.push(`hard #${n}: hints talk about a ____ hard does not have`);
          if (w && i >= want + 1 && !/That’s all Byte has/.test(w.text)) bugs.push(`${level} #${n}: no "that’s all" line after the last hint`);
        }
        const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (wide > 1) bugs.push(`${level} #${n}: page scrolls sideways by ${wide}px`);
        await p.locator('#report .worked').scrollIntoViewIfNeeded();
        await p.screenshot({ path: path.join(OUT, `hints-${slug}-${level}.png`) });
        const v = info.money ? '$' + info.value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : String(info.value);
        await p.fill('#ans_' + info.num, v); await tap('#send'); await sleep(300);
        if (!(await p.evaluate(() => window.__tai.state.rec.solved))) bugs.push(`${level} #${n}: right number ${v} not accepted after the hints`);
      }
    } catch (e) { bugs.push('ERROR ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    await b.close(); k++;
    if (bugs.length) failed++;
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${plat} · ${label}  (${seen.join(', ')})`); for (const x of bugs) console.log('   - ' + x);
  }
  console.log(failed ? `${failed} setups failed` : 'ALL 11 SETUPS PASS');
  process.exit(failed ? 1 : 0);
})();
