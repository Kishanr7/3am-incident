// Install tip, Share button, countdown and beat-my-time links. Usage: node step2-test.js [baseUrl]
const { chromium, webkit, devices } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8767/site/';
const D = (n) => { const d = { ...devices[n] }; delete d.defaultBrowserType; return d; };
const SETUPS = [
  ['Windows Chrome', chromium, { viewport: { width: 1366, height: 768 } }, 'desktop'],
  ['Mac Safari engine', webkit, { viewport: { width: 1440, height: 900 } }, 'desktop'],
  ['iPhone SE', webkit, D('iPhone SE'), 'ios'],
  ['Pixel 7', chromium, D('Pixel 7'), 'android'],
];
const solve = (p) => p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
(async () => {
  for (const [label, eng, opts, kind] of SETUPS) {
    const bugs = []; const notes = [];
    const b = await eng.launch(); const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => localStorage.setItem('tai.toured', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      // 1. home before any solve: no install tip anywhere
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      if (await p.locator('.install').count()) bugs.push('install tip shown before first solve');
      const today = await p.evaluate(() => TAI.util.todayISO());
      // 2. challenge link: banner shows
      await p.goto(BASE + '#/daily/' + today + '?vs=35.4'); await p.waitForSelector('#picks');
      const banner = await p.locator('.vs').textContent().catch(() => '');
      if (!/08:35/.test(banner) || !/4 queries/.test(banner)) bugs.push('challenge banner wrong: ' + banner);
      // two checks then solve -> 08:25, 2 queries -> beats 08:35
      await p.click('#picks button >> nth=0'); await p.click('#picks button >> nth=1');
      await solve(p); await p.waitForTimeout(300);
      const res = await p.locator('.vsres').textContent().catch(() => '');
      if (!/beat your friend by 10 minutes/.test(res)) bugs.push('challenge result wrong: ' + res);
      const share = await p.textContent('#shareText');
      const link = (share.match(/Beat my time: (\S+)/) || [])[1] || '';
      if (!link.endsWith('#/daily/' + today + '?vs=25.2')) bugs.push('share link wrong: ' + link);
      // countdown ticks
      const c1 = await p.textContent('[data-countdown]').catch(() => '');
      await p.waitForTimeout(1300);
      const c2 = await p.textContent('[data-countdown]').catch(() => '');
      if (!/^\d\d:\d\d:\d\d$/.test(c1) || c1 === c2) bugs.push(`countdown not ticking: "${c1}" -> "${c2}"`);
      // share button only on touch devices that support it
      const hasShare = await p.locator('#shareBtn').count();
      const canShare = await p.evaluate(() => typeof navigator.share === 'function');
      if (kind === 'desktop' && hasShare) bugs.push('Share button shown on desktop');
      notes.push(`share button: ${hasShare ? 'yes' : 'no'} (navigator.share ${canShare ? 'available' : 'missing'})`);
      // install tip on the solved screen: phones only
      const solvedTip = await p.locator('#report .install').count();
      if (kind === 'desktop' && solvedTip) bugs.push('install tip on desktop solved screen');
      if (kind === 'ios' && !solvedTip) bugs.push('no install tip on iPhone solved screen');
      if (kind === 'android') notes.push('android solved-screen tip: ' + (solvedTip ? 'yes' : 'no (needs the browser install event, not fired in tests)'));
      await p.screenshot({ path: path.join(__dirname, 'shots', `step2-${slug}-solved.png`), fullPage: false });
      await p.locator('.win').screenshot({ path: path.join(__dirname, 'shots', `step2-${slug}-win.png`) }).catch(() => {});
      // 3. friend opens the shared link in a fresh browser
      const ctx2 = await b.newContext(opts); await ctx2.addInitScript(() => localStorage.setItem('tai.toured', '1'));
      const p2 = await ctx2.newPage();
      await p2.goto(link.replace(/^https?:\/\/[^/]+\/(site\/)?/, BASE)); await p2.waitForSelector('#picks');
      const b2 = await p2.locator('.vs').textContent().catch(() => '');
      if (!/08:25/.test(b2) || !/2 queries/.test(b2)) bugs.push('friend sees wrong banner: ' + b2);
      await solve(p2); await p2.waitForTimeout(300);
      const r2 = await p2.locator('.vsres').textContent().catch(() => '');
      if (!/beat your friend by 10 minutes/.test(r2)) bugs.push('friend (08:15) should beat 08:25: ' + r2);
      await ctx2.close();
      // 4. junk challenge values ignored
      await p.goto(BASE + '#/practice/3?vs=99999.1'); await p.waitForFunction(() => window.__tai.state && window.__tai.state.practice === 3 && document.getElementById('picks'));
      if (await p.locator('.vs').count()) bugs.push('junk challenge accepted');
      await p.goto(BASE + '#/practice/3?vs=<script>'); await p.waitForTimeout(800);
      if (!(await p.locator('#picks').count())) bugs.push('junk challenge broke the case page');
      // practice: no countdown
      await solve(p); await p.waitForTimeout(200);
      if (!(await p.locator('[data-countdown]').count())) bugs.push('no countdown on practice after today is solved');
      // 5. home after a solve: tip only on phones, dismiss sticks
      await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
      const homeTip = await p.locator('.install').count();
      if (kind === 'desktop' && homeTip) bugs.push('install tip on desktop home');
      if (kind === 'ios') {
        if (!homeTip) bugs.push('no install tip on iPhone home after a solve');
        else {
          const tipBox = await p.locator('.install').boundingBox(); const hero = await p.locator('.hero').boundingBox();
          if (tipBox.y < hero.y + hero.height) bugs.push('install tip above today\'s case');
          await p.tap('#installX'); await p.waitForTimeout(100);
          if (await p.locator('.install').count()) bugs.push('✕ did not hide the tip');
          await p.reload(); await p.waitForSelector('#howBtn');
          if (await p.locator('.install').count()) bugs.push('tip came back after reload');
        }
      }
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) bugs.push('sideways scroll on home');
    } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
    for (const e of errs) bugs.push('page error: ' + e);
    console.log(`${bugs.length ? 'FAIL' : 'PASS'}  ${label}   ${notes.join(' | ')}`); for (const x of bugs) console.log('      - ' + x);
    await b.close();
  }
})();
