// Tests the case notes drawer on phones and desktops. Usage: node notes-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const SETUPS = [
  ['iPhone SE (WebKit)', webkit, D('iPhone SE')],
  ['Small phone 320 (WebKit)', webkit, { ...D('iPhone SE'), viewport: { width: 320, height: 568 } }],
  ['Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['iPad Mini (WebKit)', webkit, D('iPad Mini landscape')],
  ['Windows Chrome 1366', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Mac Safari engine 1440', webkit, { viewport: { width: 1440, height: 900 } }],
];
(async () => {
  for (const [label, eng, opts] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      await p.goto(BASE + '#/practice/12'); await p.waitForSelector('#picks');
      if (!(await p.isVisible('#notesBtn'))) bugs.push('Notes button not visible');
      if (await p.isVisible('#notes')) bugs.push('notes open by default');
      // bar fits on one screen width
      const barOver = await p.evaluate(() => [...document.querySelectorAll('.bar .wrap > *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length);
      if (barOver) bugs.push('bottom bar items past the edge');
      // run two checks, pin the first
      await tap('#picks button >> nth=0'); await p.waitForTimeout(150);
      await tap('#picks button >> nth=1'); await p.waitForTimeout(150);
      await tap('#e0 .pin'); await p.waitForTimeout(100);
      if ((await p.getAttribute('#e0 .pin', 'aria-pressed')) !== 'true') bugs.push('pin did not stick');
      if ((await p.textContent('#notesN')).trim() !== '1') bugs.push('badge not 1 after a pin');
      // pin box must not cover the result title
      const overlap = await p.evaluate(() => { const a = document.querySelector('#e0 .pin').getBoundingClientRect(), h = document.querySelector('#e0 h3').getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(document.querySelector('#e0 h3')); const t = range.getBoundingClientRect(); return t.right > a.left + 1 && t.top < a.bottom && t.bottom > a.top; });
      if (overlap) bugs.push('pin button overlaps the result title');
      // open notes
      await tap('#notesBtn'); await p.waitForTimeout(200);
      if (!(await p.isVisible('#notes'))) bugs.push('notes did not open');
      const box = await p.locator('#notes').boundingBox(); const vp = p.viewportSize();
      if (!box || box.x < -1 || box.x + box.width > vp.width + 1 || box.y < -1 || box.y + box.height > vp.height + 1) bugs.push('notes drawer off screen ' + JSON.stringify(box));
      const rows = await p.locator('[data-mark]').count();
      if (rows < 6) bugs.push('theory grid has only ' + rows + ' rows');
      const first = '[data-mark] >> nth=0';
      await tap(first); let cls = await p.getAttribute(first, 'class'); if (!/m-no/.test(cls)) bugs.push('1st tap should rule out: ' + cls);
      await tap(first); cls = await p.getAttribute(first, 'class'); if (!/m-yes/.test(cls)) bugs.push('2nd tap should mark likely: ' + cls);
      await tap(first); cls = await p.getAttribute(first, 'class'); if (!/m-none/.test(cls)) bugs.push('3rd tap should clear: ' + cls);
      await tap('[data-mark] >> nth=1'); // ruled out, stays
      if ((await p.locator('.npins li').count()) !== 1) bugs.push('pinned list should have 1 item');
      await p.fill('#notesText', 'ios rows missing? 674 vs 435');
      await p.screenshot({ path: path.join(__dirname, 'shots', `notes-${slug}.png`) });
      // nothing inside the drawer sticks out sideways
      const wide = await p.evaluate(() => { const n = document.getElementById('notes').getBoundingClientRect(); return [...document.querySelectorAll('#notes *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > n.right + 1; }).length; });
      if (wide) bugs.push(wide + ' items stick out of the drawer');
      // jump to a pin
      await tap('.npins .link');
      await p.waitForTimeout(600);
      const phone = vp.width < 900;
      if (phone && (await p.isVisible('#notes'))) bugs.push('drawer should close after jumping to a pin on phones');
      if (!phone && !(await p.isVisible('#notes'))) bugs.push('drawer should stay open on desktop after jumping');
      // close with Escape or ✕
      if (await p.isVisible('#notes')) { await p.keyboard.press('Escape'); await p.waitForTimeout(100); if (await p.isVisible('#notes')) bugs.push('Escape did not close notes'); }
      // reload: everything kept
      await p.reload(); await p.waitForSelector('#picks');
      if ((await p.textContent('#notesN')).trim() !== '3') bugs.push('badge after reload is ' + (await p.textContent('#notesN')) + ', expected 3 (1 mark, 1 pin, text)');
      if ((await p.getAttribute('#e0 .pin', 'aria-pressed')) !== 'true') bugs.push('pin lost after reload');
      await tap('#notesBtn'); await p.waitForTimeout(150);
      if ((await p.inputValue('#notesText')) !== 'ios rows missing? 674 vs 435') bugs.push('scratchpad text lost after reload');
      await tap('#notesClose'); await p.waitForTimeout(100);
      if (await p.isVisible('#notes')) bugs.push('✕ did not close notes');
      // the report shows the ruled-out answer struck through
      const ruled = await p.locator('#report .opt.ruled').count();
      if (ruled !== 1) bugs.push('report should show 1 ruled-out answer, shows ' + ruled);
      // notes cost no time
      const clock = await p.textContent('#clock');
      if (!/08:25/.test(clock)) bugs.push('clock is ' + clock + ' (2 checks should be 08:25)');
      // still solvable
      await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
      await p.waitForTimeout(200);
      if (!(await p.evaluate(() => window.__tai.state.rec.solved))) bugs.push('could not solve with notes in use');
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bugs.push('sideways scroll');
      // dark mode drawer
      await tap('#themeBtn'); await tap('#notesBtn'); await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(__dirname, 'shots', `notes-${slug}-dark.png`) });
    } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${label}`); for (const x of bugs) console.log('      - ' + x);
    await b.close();
  }
})();
