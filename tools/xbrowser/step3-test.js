// Weekly difficulty, typed numbers, fill-in query, worked example, bonus star. Usage: node step3-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function engineChecks(page) {
  // Pure data checks, run inside the page.
  return page.evaluate(async () => {
    const out = { bugs: [], leaks: 0, cases: 0, levels: {} };
    const want = { '2026-11-16': null, '2026-11-17': 'easy', '2026-11-18': 'medium', '2026-11-19': 'medium', '2026-11-20': 'hard', '2026-11-21': 'hard', '2026-11-22': 'medium', '2026-11-23': 'easy' };
    for (const [d, l] of Object.entries(want)) if (TAI.dailyLevel(d) !== l) out.bugs.push(`level for ${d}: ${TAI.dailyLevel(d)} (want ${l})`);
    const SQL = await initSqlJs({ locateFile: (f) => TAI.SQL_CDN + f });
    const jobs = [];
    for (let i = 0; i < 140; i++) jobs.push(() => TAI.dailyCase(TAI.util.addDays('2026-11-17', i)));
    for (let n = 1; n <= 100; n++) jobs.push(() => TAI.practiceCase(n));
    for (const job of jobs) {
      const c = job(); out.cases++;
      const lvl = c.level || 'classic'; out.levels[lvl] = (out.levels[lvl] || 0) + 1;
      const db = TAI.buildDb(SQL, c);
      const v = TAI.query(db, c.answerQ.sql, 5).values[0][0];
      if (!TAI.matchesAnswer(c, v)) out.bugs.push(`${c.tpl.id} ${c.date}: answer SQL gives ${v}, want ${c.answerQ.value}`);
      if (c.typed) {
        if (c.answerQ.sql.replace(c.answerQ.blank, '____') === c.answerQ.sql) out.bugs.push(`${c.tpl.id}: blank not found in SQL`);
        for (const card of c.cards) {
          const r = TAI.query(db, card.sql, 200);
          if (r.values.some((row) => row.some((x) => typeof x === 'number' && TAI.matchesAnswer(c, x)) && !(row.length >= 2 && typeof row[0] === 'string' && /^\d{4}-\d\d-\d\d$/.test(row[0]) && row[0] !== c.D))) { out.leaks++; if (out.leaks <= 5) out.bugs.push(`LEAK ${lvl} ${c.tpl.id} ${c.date}: "${card.title}" shows the answer ${c.answerQ.value}`); }
        }
      }
      db.close();
    }
    return out;
  });
}

const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }],
];

(async () => {
  let first = true;
  for (const [label, eng, opts] of SETUPS) {
    const bugs = []; const notes = [];
    const b = await eng.launch(); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      // Wednesday 18 Nov 2026, 09:00 local: the daily is medium.
      await p.clock.install({ time: new Date(2026, 10, 18, 9, 0, 0) });
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      if (first) { const e = await engineChecks(p); for (const x of e.bugs) bugs.push(x); notes.push(`engine: ${e.cases} cases ${JSON.stringify(e.levels)}, leaks ${e.leaks}`); first = false; }
      const lvl = await p.textContent('.lvl').catch(() => '');
      if (!/^Medium/.test(lvl)) bugs.push('home level tag on Wednesday: ' + lvl);
      await p.screenshot({ path: path.join(__dirname, 'shots', `step3-${slug}-home.png`) });
      await tap('.hero .btn'); await p.waitForSelector('#picks');
      const kicker = await p.textContent('.case-head .kicker');
      if (!/Medium/.test(kicker)) bugs.push('case label: ' + kicker);
      // fill-in query is open and has a blank
      const ta = await p.inputValue('#ownSql');
      if (!/____/.test(ta)) bugs.push('medium SQL box has no blank: ' + ta.slice(0, 60));
      if (!(await p.locator('details.own[open]').count())) bugs.push('fill-in box not open on medium');
      // running with the blank is blocked
      await tap('#runOwn'); await sleep(150);
      if (await p.locator('#feed .entry').count()) bugs.push('query with ____ was run');
      // typed number input, no radio options for the number
      const numId = await p.evaluate(() => { const c = window.__tai.state.c; return c.questions[c.questions.length - 1].id; });
      if (!(await p.locator('#ans_' + numId).count())) bugs.push('no typed number input');
      if (await p.locator(`input[type=radio][name="${numId}"]`).count()) bugs.push('number still has multiple choice');
      // notes grid leaves out the typed number
      await tap('#notesBtn'); await sleep(150);
      const rows = await p.locator('[data-mark]').count();
      if (rows !== 4) bugs.push('notes grid rows on medium: ' + rows + ' (want 4 causes)');
      await tap('#notesClose');
      // two wrong numbers -> worked example appears
      const pickCause = () => p.evaluate(() => { const c = window.__tai.state.c; const q = c.questions[0]; const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); });
      await pickCause();
      await p.fill('#ans_' + numId, '12'); await tap('#send'); await sleep(200);
      if (!(await p.locator('.why').count())) bugs.push('no feedback on a wrong number');
      if (await p.locator('.worked').count()) bugs.push('worked example after only 1 wrong number');
      await p.fill('#ans_' + numId, 'abc'); await tap('#send'); await sleep(200);
      const why = await p.textContent('#report .why').catch(() => '');
      if (!/I need a number/.test(why)) bugs.push('non-number feedback: ' + why);
      if (!(await p.locator('.worked').count())) bugs.push('no worked example after 2 wrong numbers');
      // fill the blank correctly and run -> star earned before solving
      const filled = await p.evaluate(() => { const a = window.__tai.state.c.answerQ; return a.sql; });
      await p.fill('#ownSql', filled); await tap('#runOwn'); await sleep(300);
      if (!(await p.evaluate(() => window.__tai.state.rec.star))) bugs.push('correct fill-in query did not earn the star');
      // type the right number (money with $ and commas) -> solved
      const v = await p.evaluate(() => { const a = window.__tai.state.c.answerQ; return a.money ? '$' + a.value.toLocaleString('en-US', { minimumFractionDigits: 2 }) : String(a.value); });
      await p.fill('#ans_' + numId, v); await tap('#send'); await sleep(300);
      if (!(await p.evaluate(() => window.__tai.state.rec.solved))) bugs.push('right typed number not accepted: ' + v);
      const share = await p.textContent('#shareText').catch(() => '');
      if (!/⭐/.test(share)) bugs.push('share grid has no star');
      if (!(await p.locator('.star.done').count())) bugs.push('no "proved with SQL" card');
      await p.locator('#report').screenshot({ path: path.join(__dirname, 'shots', `step3-${slug}-solved.png`) }).catch(() => {});

      // Friday 20 Nov: hard daily, empty SQL box, two checks fewer
      const ctxH = await b.newContext(opts); await ctxH.addInitScript(() => localStorage.setItem('tai.toured', '1'));
      const h = await ctxH.newPage(); await h.clock.install({ time: new Date(2026, 10, 20, 9, 0, 0) });
      await h.goto(BASE + '#/daily/2026-11-20'); await h.waitForSelector('#picks');
      if (!/Hard/.test(await h.textContent('.case-head .kicker'))) bugs.push('Friday not hard');
      if ((await h.inputValue('#ownSql')) !== '') bugs.push('hard SQL box should start empty');
      if (!(await h.locator('.scene b').first().textContent()).includes('Hard case')) bugs.push('no hard-case note');
      await ctxH.close();

      // Easy practice: multiple choice, bonus star card with a fill-in start, star via bonus
      await p.goto(BASE + '#/practice/2'); await p.waitForFunction(() => window.__tai.state && window.__tai.state.practice === 2 && document.getElementById('picks'));
      if (await p.locator('input.numin').count()) bugs.push('easy case has a typed number');
      await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
      await sleep(250);
      if (!(await p.locator('#starSql').count())) bugs.push('no bonus card on easy');
      else {
        if (!/____/.test(await p.inputValue('#starSql'))) bugs.push('easy bonus has no fill-in start');
        await p.fill('#starSql', 'SELECT 1;'); await tap('#starRun'); await sleep(200);
        if (!/none of its numbers/.test(await p.textContent('#starNote'))) bugs.push('wrong bonus query message: ' + (await p.textContent('#starNote')));
        await p.fill('#starSql', await p.evaluate(() => window.__tai.state.c.answerQ.sql)); await tap('#starRun'); await sleep(300);
        if (!(await p.locator('.star.done').count())) bugs.push('bonus query did not earn the star');
      }
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bugs.push('sideways scroll');
    } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${label}   ${notes.join(' | ')}`); for (const x of bugs) console.log('      - ' + x);
    await b.close();
  }
})();
