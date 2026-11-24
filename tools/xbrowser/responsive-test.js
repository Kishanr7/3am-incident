// Responsive sweep: every screen at many widths and a few short heights.
// Flags sideways scroll, anything poking outside the screen, small tap targets on touch screens, content hidden
// behind the bottom bar, and the side panel taller than the screen. Screenshots go to shots/resp-*.png.
// Usage: node responsive-test.js [baseUrl] [--shots]
const { chromium, webkit } = require('playwright');
const path = require('path');
const BASE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:8767/site/';
const SHOTS = process.argv.includes('--shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [width, height, touch]
const SIZES = [
  [280, 653, true], [320, 568, true], [360, 740, true], [375, 667, true], [390, 844, true], [414, 896, true],
  [480, 800, true], [568, 320, true], [600, 960, true], [740, 360, true], [768, 1024, true], [820, 1180, true],
  [844, 390, true], [900, 700, false], [959, 700, false], [960, 640, false], [1024, 768, false], [1093, 614, false],
  [1180, 820, true], [1280, 720, false], [1366, 768, false], [1440, 900, false], [1680, 1050, false],
  [1920, 1080, false], [2560, 1440, false], [3840, 2160, false],
];
const SHOT_AT = new Set(['280x653', '375x667', '568x320', '768x1024', '1024x768', '1366x768', '1920x1080', '2560x1440']);

// Runs in the page: list layout problems on what is visible now.
function audit(touch) {
  const W = innerWidth, H = innerHeight, out = [];
  const sx = document.documentElement.scrollWidth - W; if (sx > 1) out.push('sideways scroll ' + sx + 'px');
  const clipped = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) return true; } return false; };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const seen = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none' || el.closest('.sr,[hidden],dialog:not([open])')) continue;
    if ((r.right > W + 1 || r.left < -1) && !clipped(el) && st.position !== 'fixed') { const k = name(el); if (!seen.has(k)) { seen.add(k); out.push(`off screen: ${k} (${Math.round(r.left)}..${Math.round(r.right)} of ${W})`); } }
  }
  if (touch) {
    const small = new Set();
    for (const el of document.querySelectorAll('button, a.btn, a.pill, .tab, summary, label.opt, .day, .lcase, .pcard, .pin, .fold')) {
      const r = el.getBoundingClientRect(); if (!r.width || el.closest('[hidden],dialog:not([open]),.sr')) continue;
      if ((r.height < 32 || r.width < 32) && !el.closest('p')) small.add(name(el) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    for (const s of small) out.push('small tap target: ' + s);
  }
  // text that is cut off inside its box
  for (const el of document.querySelectorAll('h1,h2,h3,b,.btn,.pill,.tab,.kicker,.lvl,.name,.kind')) {
    const st = getComputedStyle(el); if (st.display === 'none' || el.closest('[hidden],.sr')) continue;
    if (st.overflow === 'hidden' && st.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2) out.push('text cut off: ' + name(el));
  }
  return out;
}

async function check(p, label, touch, bugs) {
  const found = await p.evaluate(audit, touch);
  for (const f of found) bugs.push(`${label}: ${f}`);
}

(async () => {
  let fails = 0; const all = [];
  for (const [eng, ename] of [[chromium, 'Chrome'], [webkit, 'WebKit']]) {
    const b = await eng.launch();
    for (const [w, h, touch] of SIZES) {
      if (ename === 'WebKit' && ![320, 375, 390, 568, 768, 820, 1180, 1440].includes(w)) continue;
      const key = `${w}x${h}`, bugs = [];
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && ename === 'Chrome', deviceScaleFactor: 1 });
      await ctx.addInitScript(() => { localStorage.setItem('tai.toured', '1'); });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      const shot = async (n) => { if (SHOTS && SHOT_AT.has(key) && ename === 'Chrome') await p.screenshot({ path: path.join(__dirname, 'shots', `resp-${n}-${key}.png`), fullPage: true }); };
      try {
        // Home, with a practice level and the crew open
        await p.goto(BASE + '#/'); await p.waitForSelector('#howBtn');
        await check(p, 'home', touch, bugs);
        await p.click('.tab[data-l="easy"]'); await sleep(150);
        await p.evaluate(() => { const d = document.querySelector('details.crew'); if (d) d.open = true; });
        await check(p, 'home+library', touch, bugs); await shot('home');
        // How it works and stats dialogs
        await p.click('#howBtn'); await sleep(250); await check(p, 'how-it-works', touch, bugs);
        await p.keyboard.press('Escape'); await sleep(150);
        await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
        await p.click('#statsBtn'); await sleep(250); await check(p, 'stats', touch, bugs);
        await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
        // An easy case with every fold open and a check run
        await p.goto(BASE + '#/practice/2'); await p.waitForFunction(() => window.__tai && window.__tai.state && window.__tai.state.practice === 2 && document.getElementById('picks'));
        await p.evaluate(() => { document.querySelectorAll('#investigate details').forEach((d) => (d.open = true)); });
        await p.locator('#picks button').nth(1).click(); await sleep(250);
        await p.locator('#picks button').nth(2).click(); await sleep(250);
        await check(p, 'case', touch, bugs); await shot('case');
        // Nothing hides behind the bottom bar at the very end of the page
        const hidden = await p.evaluate(() => { scrollTo(0, document.body.scrollHeight); const bar = document.querySelector('.bar'); const last = [...document.querySelectorAll('.wrap.case > *')].map((e) => e.getBoundingClientRect()).filter((r) => r.height).sort((a, b) => b.bottom - a.bottom)[0]; return bar && last ? Math.round(last.bottom - bar.getBoundingClientRect().top) : 0; });
        if (hidden > 2) bugs.push(`case: ${hidden}px of content stays under the bottom bar`);
        // The side panel fits the screen on wide layouts
        const side = await p.evaluate(() => { const s = document.getElementById('investigate'); const st = getComputedStyle(s); return st.position === 'sticky' ? Math.round(s.getBoundingClientRect().height - (innerHeight - 90)) : 0; });
        if (side > 4) bugs.push(`case: side panel is ${side}px taller than the screen`);
        // Notes open
        await p.locator('.pin').first().click().catch(() => {}); await p.click('#notesBtn'); await sleep(300);
        await check(p, 'case+notes', touch, bugs); await shot('notes');
        await p.click('#notesMin').catch(() => {}); await sleep(250);
        // Report, wrong answer, then solved screen
        await p.click('#toReport'); await sleep(300);
        await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => !x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
        await sleep(300); await check(p, 'report-wrong', touch, bugs);
        await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
        await sleep(400); await p.evaluate(() => { const d = document.querySelector('.sharebox'); if (d) d.open = true; });
        await check(p, 'solved', touch, bugs); await shot('solved');
        // A hard daily (typed number, empty SQL box)
        await p.goto(BASE + '#/daily/2026-11-20'); await p.waitForFunction(() => window.__tai.state && window.__tai.state.iso === '2026-11-20' && document.getElementById('ownSql'));
        await p.evaluate(() => document.querySelectorAll('#investigate details').forEach((d) => (d.open = true)));
        await p.fill('#ownSql', 'SELECT * FROM ' + (await p.evaluate(() => window.__tai.state.c.tables[0].name)) + ' LIMIT 20;');
        await p.click('#runOwn'); await sleep(300);
        await p.click('#toReport'); await sleep(250);
        await check(p, 'hard case', touch, bugs);
        // The big case file
        await p.goto(BASE + 'case-1/'); await sleep(1500);
        await check(p, 'case-1', touch, bugs); await shot('case1');
      } catch (e) { bugs.push('STOPPED: ' + e.message.split('\n')[0]); }
      for (const e of errs) bugs.push('page error: ' + e);
      await ctx.close();
      const line = `${bugs.length ? 'FAIL' : 'PASS'}  ${ename} ${key}${touch ? ' touch' : ''}`;
      console.log(line); for (const x of bugs) console.log('      - ' + x);
      if (bugs.length) fails++; all.push(line);
    }
    await b.close();
  }
  console.log(fails ? fails + ' sizes with problems' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
