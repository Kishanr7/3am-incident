// Case notes: the – button minimizes them into the Notes button (nothing left on screen), the Notes button
// brings them back in the same place; on wide screens they drag by the title bar, move with arrow keys,
// stay on screen, resize, and remember their position. Usage: node notesmove-test.js [baseUrl]
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
const WAIT = 400; // longer than the 220 ms shrink/grow animation

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
      await p.evaluate(() => { TAI.store.reset(); localStorage.removeItem('tai.notesPos'); });
      await p.goto(BASE + '#/practice/41'); await p.waitForSelector('#picks button');
      await tap('#picks button >> nth=0'); await p.waitForTimeout(150);
      await tap('#notesBtn'); await p.waitForTimeout(WAIT);
      if (await p.locator('#notes').isHidden()) bugs.push('notes did not open');
      if (await p.locator('#notesClose').count()) bugs.push('there should be one minimize button, not a separate close');
      await p.fill('#notesText', 'kept after minimizing');
      const wide = await p.evaluate(() => matchMedia('(min-width: 900px)').matches);
      // – minimizes into the Notes button: nothing of the notes stays on screen
      const open1 = await box(p, '#notes');
      await tap('#notesMin'); await p.waitForTimeout(WAIT);
      if (!(await p.locator('#notes').isHidden())) bugs.push('– did not minimize the notes into the Notes button');
      if (await p.evaluate(() => document.activeElement && document.activeElement.id) !== 'notesBtn') bugs.push('focus did not go back to the Notes button');
      // the Notes button brings them back, same place, same text
      await tap('#notesBtn'); await p.waitForTimeout(WAIT);
      if (await p.locator('#notes').isHidden()) bugs.push('Notes button did not bring the notes back');
      const open2 = await box(p, '#notes');
      if (Math.abs(open2.x - open1.x) > 2 || Math.abs(open2.y - open1.y) > 2) bugs.push('notes came back somewhere else');
      if ((await p.inputValue('#notesText')) !== 'kept after minimizing') bugs.push('scratchpad text lost when minimizing');
      // tapping Notes again while open minimizes too; a quick double tap ends open
      await tap('#notesBtn'); await p.waitForTimeout(WAIT);
      if (!(await p.locator('#notes').isHidden())) bugs.push('Notes button did not minimize open notes');
      await tap('#notesBtn'); await p.waitForTimeout(60); await tap('#notesMin'); await p.waitForTimeout(60); await tap('#notesBtn'); await p.waitForTimeout(WAIT);
      if (await p.locator('#notes').isHidden()) bugs.push('open, minimize, open quickly should end open');
      if (wide) {
        const h = await box(p, '#notesHead'); const before = await box(p, '#notes'); const vp0 = p.viewportSize();
        const want = [Math.round(vp0.width / 2 - 150 - before.x), Math.round(40 - before.y)];
        const sx = h.x + 120, sy = h.y + h.height / 2;
        await p.mouse.move(sx, sy); await p.mouse.down();
        await p.mouse.move(sx + want[0], sy + want[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
        const after = await box(p, '#notes');
        if (Math.abs(after.x - before.x - want[0]) > 3 || Math.abs(after.y - before.y - want[1]) > 3) bugs.push(`drag moved notes by ${Math.round(after.x - before.x)},${Math.round(after.y - before.y)} (want ${want})`);
        await p.focus('#notesGrip'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(50);
        const k = await box(p, '#notes'); if (Math.abs(k.x - after.x - 20) > 2) bugs.push('ArrowRight on the grip did not move notes 20px');
        const h2 = await box(p, '#notesHead');
        await p.mouse.move(h2.x + 100, h2.y + 10); await p.mouse.down(); await p.mouse.move(5000, 5000, { steps: 4 }); await p.mouse.up();
        const far = await box(p, '#notes'); const vp = p.viewportSize();
        if (far.x + far.width > vp.width + 1 || far.y + 40 > vp.height) bugs.push('notes dragged off screen: ' + JSON.stringify(far));
        // minimizing after a drag, then reopening: back where it was dragged to
        await tap('#notesMin'); await p.waitForTimeout(WAIT); await tap('#notesBtn'); await p.waitForTimeout(WAIT);
        const back = await box(p, '#notes'); if (Math.abs(back.x - far.x) > 2 || Math.abs(back.y - far.y) > 2) bugs.push('reopened somewhere other than where it was dragged');
        // and after a reload
        await p.reload(); await p.waitForSelector('#picks button'); await tap('#notesBtn'); await p.waitForTimeout(WAIT);
        const re = await box(p, '#notes'); if (Math.abs(re.x - far.x) > 2 || Math.abs(re.y - far.y) > 2) bugs.push('position not remembered after reload');
        if (await p.evaluate(() => getComputedStyle(document.getElementById('notes')).resize) !== 'both') bugs.push('notes cannot be resized');
      } else {
        // phones: jumping to pinned evidence tucks the notes away so the evidence is visible
        await tap('#feed .pin >> nth=0'); await p.waitForTimeout(100);
        await p.evaluate(() => { document.getElementById('notesBody').scrollTop = 1e5; });
        await tap('[data-goto] >> nth=0'); await p.waitForTimeout(1500);
        if (!(await p.locator('#notes').isHidden())) bugs.push('jumping to pinned evidence should minimize the notes on phones');
      }
      if (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth > 1)) bugs.push('sideways scroll');
      await p.evaluate(() => { TAI.store.reset(); localStorage.removeItem('tai.notesPos'); });
    } catch (e) { bugs.push('error: ' + e.message.split('\n')[0]); }
    if (errs.length) bugs.push('page errors: ' + errs.join(' | '));
    console.log((bugs.length ? 'FAIL ' : 'PASS ') + label + (bugs.length ? '\n  - ' + bugs.join('\n  - ') : ''));
    if (bugs.length) failed++;
    await b.close();
  }
  console.log(failed ? failed + ' setup(s) failed' : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})();
