// Case notes: minimize, drag (wide screens), arrow-key move, remembered position, never covering the
// bottom bar, and minimizing on phones instead of covering the case. Usage: node notesmove-test.js [baseUrl]
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
const box = (p, s) => p.locator(s).boundingBox();
const overlaps = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

(async () => {
  let failed = 0;
  for (const [label, eng, opts, launch] of SETUPS) {
    const bugs = [];
    const b = await eng.launch(launch || {}); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const touch = !!opts.hasTouch; const tap = (s) => (touch ? p.tap(s) : p.click(s));
    try {
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      await p.evaluate(() => { TAI.store.reset(); localStorage.removeItem('tai.notesPos'); localStorage.removeItem('tai.notesMin'); });
      await p.goto(BASE + '#/practice/41'); await p.waitForSelector('#picks button');
      await tap('#picks button >> nth=0'); await p.waitForTimeout(150);
      await tap('#notesBtn'); await p.waitForTimeout(150);
      if (await p.locator('#notes').isHidden()) bugs.push('notes did not open');
      const wide = await p.evaluate(() => matchMedia('(min-width: 900px)').matches);
      // minimize, then the title bar must not cover the bottom bar or its buttons
      await tap('#notesMin'); await p.waitForTimeout(150);
      if (!(await p.locator('#notes').evaluate((n) => n.classList.contains('min')))) bugs.push('minimize did nothing');
      if (await p.locator('#notesBody').isVisible()) bugs.push('minimized notes still show their body');
      const nb = await box(p, '#notes'); const bar = await box(p, '.bar');
      if (nb.height > 80) bugs.push('minimized notes are ' + Math.round(nb.height) + 'px tall');
      if (overlaps(nb, await box(p, '#toReport'))) bugs.push('minimized notes cover the Report button');
      if (!wide && overlaps(nb, bar)) bugs.push('minimized notes cover the bottom bar');
      // Notes button re-expands
      await tap('#notesBtn'); await p.waitForTimeout(150);
      if (await p.locator('#notes').evaluate((n) => n.classList.contains('min'))) bugs.push('Notes button did not expand minimized notes');
      if (wide) {
        // drag the panel so its top-left lands at a spot with room on every side, by an exact amount
        const h = await box(p, '#notesHead'); const before = await box(p, '#notes'); const vp0 = p.viewportSize();
        const want = [Math.round(vp0.width / 2 - 150 - before.x), Math.round(40 - before.y)];
        const sx = h.x + 120, sy = h.y + h.height / 2;
        await p.mouse.move(sx, sy); await p.mouse.down();
        await p.mouse.move(sx + want[0], sy + want[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
        const after = await box(p, '#notes');
        if (Math.abs(after.x - before.x - want[0]) > 3 || Math.abs(after.y - before.y - want[1]) > 3) bugs.push(`drag moved notes by ${Math.round(after.x - before.x)},${Math.round(after.y - before.y)} (want ${want})`);
        // arrow keys on the grip
        await p.focus('#notesGrip'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(50);
        const k = await box(p, '#notes'); if (Math.abs(k.x - after.x - 20) > 2) bugs.push('ArrowRight on the grip did not move notes 20px');
        // dragging far away keeps it on screen
        const h2 = await box(p, '#notesHead');
        await p.mouse.move(h2.x + 100, h2.y + 10); await p.mouse.down(); await p.mouse.move(5000, 5000, { steps: 4 }); await p.mouse.up();
        const far = await box(p, '#notes'); const vp = p.viewportSize();
        if (far.x + far.width > vp.width + 1 || far.y + 40 > vp.height) bugs.push('notes dragged off screen: ' + JSON.stringify(far));
        // position survives a reload
        const kept = await box(p, '#notes');
        await p.reload(); await p.waitForSelector('#picks button'); await tap('#notesBtn'); await p.waitForTimeout(150);
        const re = await box(p, '#notes'); if (Math.abs(re.x - kept.x) > 2 || Math.abs(re.y - kept.y) > 2) bugs.push('position not remembered after reload');
        // clicking a button in the title bar must not start a drag
        await tap('#notesMin'); await p.waitForTimeout(100); const m1 = await box(p, '#notes');
        if (Math.abs(m1.x - re.x) > 2) bugs.push('minimize moved the panel');
        await tap('#notesTitle'); await p.waitForTimeout(100);
        if (await p.locator('#notes').evaluate((n) => n.classList.contains('min'))) bugs.push('tapping the minimized title bar did not expand it');
        if (await p.evaluate(() => getComputedStyle(document.getElementById('notes')).resize) !== 'both') bugs.push('notes cannot be resized');
      } else {
        // phones: jumping to pinned evidence minimizes instead of covering it
        await tap('#feed .pin >> nth=0'); await p.waitForTimeout(100);
        await p.evaluate(() => document.getElementById('notesBody').scrollTop = 1e5);
        await tap('[data-goto] >> nth=0'); await p.waitForTimeout(1500); // let the smooth scroll finish
        if (!(await p.locator('#notes').evaluate((n) => n.classList.contains('min')))) bugs.push('jumping to pinned evidence should minimize notes on phones');
        await tap('#notesTitle'); await p.waitForTimeout(150);
        if (await p.locator('#notes').evaluate((n) => n.classList.contains('min'))) bugs.push('tapping the minimized title bar did not expand it');
      }
      // minimized state is remembered
      await tap('#notesMin'); await p.reload(); await p.waitForSelector('#picks button'); await tap('#notesBtn'); await p.waitForTimeout(150);
      if (!(await p.locator('#notes').evaluate((n) => n.classList.contains('min')))) bugs.push('minimized state not remembered');
      if (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth > 1)) bugs.push('sideways scroll');
      await p.screenshot({ path: `shots/notesmove-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` });
      await p.evaluate(() => { TAI.store.reset(); localStorage.removeItem('tai.notesPos'); localStorage.removeItem('tai.notesMin'); });
    } catch (e) { bugs.push('error: ' + e.message.split('\n')[0]); }
    if (errs.length) bugs.push('page errors: ' + errs.join(' | '));
    console.log((bugs.length ? 'FAIL ' : 'PASS ') + label + (bugs.length ? '\n  - ' + bugs.join('\n  - ') : ''));
    if (bugs.length) failed++;
    await b.close();
  }
  console.log(failed ? failed + ' setup(s) failed' : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})();
