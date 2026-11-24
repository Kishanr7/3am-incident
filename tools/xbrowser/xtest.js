// Cross-browser test for 3 a.m. Incident. Usage: node xtest.js [baseUrl] [onlyProfile]
const { chromium, webkit, firefox, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8767/site/';
const ONLY = process.argv[3] || '';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const D = (name) => { const d = { ...devices[name] }; delete d.defaultBrowserType; return d; };
const PROFILES = [
  // platform, label, engine, context options
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function playAll(page, bugs) {
  // Every daily of this week + every practice case. Opens every check so every table is drawn.
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    TAI.store.reset();
    const routes = [];
    for (let i = 6; i >= 0; i--) { const d = TAI.util.addDays(TAI.util.todayISO(), -i); if (d >= TAI.EPOCH) routes.push('#/daily/' + d); }
    for (let n = 1; n <= TAI.PRACTICE_COUNT; n++) routes.push('#/practice/' + n);
    const fails = [];
    let widest = 0;
    for (const r of routes) {
      location.hash = r;
      let st;
      for (let k = 0; k < 200; k++) {
        await sleep(25); st = window.__tai.state;
        if (st && document.getElementById('picks') && (r.includes('practice') ? String(st.practice) === r.split('/')[2] : st.iso === r.split('/')[2])) break;
      }
      if (!st || !document.getElementById('picks')) { fails.push(r + ' did not open'); continue; }
      const c = st.c;
      let guard = 0;
      while (guard++ < 30) {
        const b = [...document.querySelectorAll('#picks button')].find((x) => !x.disabled && !x.classList.contains('used') && !x.dataset.tested);
        if (!b) break; b.dataset.tested = '1'; b.click(); await sleep(5);
      }
      const h1 = document.querySelector('.case-head h1').textContent;
      if (h1.split(c.co.name).length > 2) fails.push(r + ' repeated company in title');
      // wrong answer first, then right
      const answer = (q, right) => { const ty = document.getElementById('ans_' + q.id); if (ty) { ty.value = right ? String(c.answerQ.value) : '1'; ty.dispatchEvent(new Event('input')); return; } const o = q.options.find((x) => (right ? x.correct : !x.correct)); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); };
      for (const q of c.questions) answer(q, false);
      document.getElementById('send').click(); await sleep(5);
      if (st.rec.solved) fails.push(r + ' solved with wrong answers');
      if (!document.querySelector('.why')) fails.push(r + ' no explanation for wrong answer');
      for (const q of c.questions) answer(q, true);
      document.getElementById('send').click(); await sleep(5);
      if (!st.rec.solved) fails.push(r + ' not solved with right answers');
      const w = document.documentElement.scrollWidth; widest = Math.max(widest, w);
      if (w > innerWidth + 1) fails.push(r + ' sideways scroll ' + w + '>' + innerWidth);
      // anything sticking out of the page
      const out = [...document.querySelectorAll('.wrap *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && !e.closest('.tbl'); });
      if (out.length) fails.push(r + ' element past edge: ' + (out[0].className || out[0].tagName));
    }
    location.hash = '#/';
    return { n: routes.length, fails, widest };
  });
}

async function runProfile([platform, label, engine, ctxOpts, launchOpts]) {
  const res = { platform, label, engine: engine.name(), bugs: [], notes: [] };
  let browser;
  try { browser = await engine.launch(launchOpts || {}); } catch (e) { res.bugs.push('LAUNCH FAILED: ' + e.message.split('\n')[0]); return res; }
  const ctx = await browser.newContext({ ...ctxOpts, locale: 'en-IN', timezoneId: 'Asia/Kolkata', serviceWorkers: 'allow' });
  if (engine === chromium) await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => { if (!/favicon/.test(r.url())) errors.push('request failed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)); });
  const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const shot = (n) => page.screenshot({ path: path.join(OUT, `${slug}-${n}.png`) }).catch(() => {});
  const touch = !!ctxOpts.hasTouch;
  const tap = (sel) => (touch ? page.tap(sel) : page.click(sel));
  try {
    // 1. First visit: tour
    await page.goto(BASE + '#/', { waitUntil: 'load' });
    await page.waitForSelector('dialog.tour[open]', { timeout: 8000 }).catch(() => res.bugs.push('tour did not appear on first visit'));
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await sleep(300); await shot('1-tour');
    const tourBox = await page.locator('dialog.tour').boundingBox().catch(() => null);
    const vp = page.viewportSize();
    if (tourBox && (tourBox.x < 0 || tourBox.x + tourBox.width > vp.width + 1 || tourBox.y < 0 || tourBox.y + tourBox.height > vp.height + 1)) res.bugs.push(`tour box outside screen ${JSON.stringify(tourBox)} vs ${vp.width}x${vp.height}`);
    for (let i = 0; i < 2; i++) await tap('#tNext');
    const lastLabel = await page.textContent('#tNext');
    if (!/Play today/.test(lastLabel)) res.bugs.push('tour last button label: ' + lastLabel);
    await tap('#tNext');
    await page.waitForSelector('#picks', { timeout: 15000 }).catch(() => res.bugs.push('tour finish did not open today\'s case'));
    await sleep(300); await shot('3-case');

    // 2. Real taps in today's case: a check, Byte, own SQL, wrong report, right report, share
    const pickCount = await page.locator('#picks button').count();
    if (!pickCount) res.bugs.push('no check buttons in today\'s case');
    await tap('#picks button >> nth=0'); await sleep(200);
    if (!(await page.locator('#feed .tbl, #feed table, #feed .card').count())) res.bugs.push('tapping a check showed no result');
    const byte = page.locator('button:has-text("Byte")').first();
    if (await byte.count()) { await (touch ? byte.tap() : byte.click()); await sleep(200); }
    // own SQL
    // Medium cases open the SQL box by themselves; clicking its summary then would close it.
    if (!(await page.locator('details.own').first().evaluate((d) => d.open))) await page.locator('details.own summary').first().click();
    const ta = page.locator('#ownSql');
    const fs16 = await ta.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    if (touch && fs16 < 16) res.bugs.push(`SQL box text is ${fs16}px: iPhone Safari zooms the page when it is tapped`);
    await ta.fill('SELECT 1 AS one, 2 AS two;');
    const runBtn = page.locator('details.own button').first();
    await (touch ? runBtn.tap() : runBtn.click()); await sleep(300);
    const own = await page.evaluate(() => document.getElementById('feed').innerText);
    if (!/one/.test(own)) res.bugs.push('own SQL query did not show a result');
    await ta.fill('SELEC nonsense'); await (touch ? runBtn.tap() : runBtn.click()); await sleep(200);
    // report
    const reportBtn = page.locator('.bar >> text=Report').first();
    await (touch ? reportBtn.tap() : reportBtn.click()); await sleep(400);
    await shot('4-report');
    const ok = await page.evaluate(() => {
      const c = window.__tai.state.c;
      for (const q of c.questions) {
        const typed = document.getElementById('ans_' + q.id); // medium and hard: the last answer is a typed number
        if (typed) { typed.value = String(c.answerQ.value); typed.dispatchEvent(new Event('input', { bubbles: true })); continue; }
        const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).closest('label').click();
      }
      const hl = getComputedStyle(document.querySelector('.opt input:checked').closest('.opt')).borderColor;
      const plain = getComputedStyle(document.querySelector('.opt input:not(:checked)').closest('.opt')).borderColor;
      return { hl, plain };
    });
    if (ok.hl === ok.plain) res.bugs.push('chosen answer is not highlighted');
    await tap('#send'); await sleep(500);
    if (!(await page.evaluate(() => window.__tai.state.rec.solved))) res.bugs.push('could not solve today\'s case by tapping');
    await shot('5-solved');
    const copy = page.locator('#copy');
    if (await copy.count()) { await (touch ? copy.tap() : copy.click()); await sleep(300); }
    // bottom bar must not cover content: background must be opaque-ish
    const barBg = await page.evaluate(() => { const b = document.querySelector('.bar'); return b ? getComputedStyle(b).backgroundColor : 'none'; });
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(barBg)) res.bugs.push('bottom bar has no background: text shows through it');

    // 3. Home: overflow, theme, practice, stats, streak code
    await page.goto(BASE + '#/'); await page.waitForSelector('#howBtn');
    if (await page.locator('dialog.tour[open]').count()) res.bugs.push('tour shown again after it was finished');
    await shot('2-home');
    const homeW = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (homeW > 1) res.bugs.push('home sideways scroll by ' + homeW + 'px');
    const small = await page.evaluate(() => [...document.querySelectorAll('a,button,summary')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && b.height < 32 && getComputedStyle(e).display !== 'inline'; }).map((e) => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)).slice(0, 5));
    if (touch && small.length) res.notes.push('small tap targets: ' + small.join(', '));
    const th0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await tap('#themeBtn'); await sleep(200);
    const th1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (th0 === th1) res.bugs.push('theme switch did not change colours');
    await shot('2b-home-other-theme');
    await tap('#themeBtn');
    await tap('.tab[data-l="hard"]'); await sleep(200);
    const nHard = await page.evaluate(() => TAI.levelCases('hard').length); if ((await page.locator('.lcase').count()) !== nHard) res.bugs.push('hard level did not show ' + nHard + ' cases');
    // Web fonts arrive late on the live site and can shift the layout under a tap: wait for them, and retry once.
    await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true));
    await tap('.lcase >> nth=0');
    if (!(await page.waitForSelector('#picks', { timeout: 6000 }).catch(() => null))) { res.notes.push('practice tile needed a second tap'); await tap('.lcase >> nth=0'); }
    await page.waitForSelector('#picks', { timeout: 20000 }).catch(async () => res.bugs.push('practice case did not open: ' + JSON.stringify(await page.evaluate(() => ({ hash: location.hash, tiles: document.querySelectorAll('.lcase').length, text: document.body.innerText.slice(0, 80) })).catch(() => 'page gone'))));
    await page.goto(BASE + '#/'); await page.waitForSelector('#statsBtn');
    await tap('#statsBtn'); await page.waitForSelector('dialog[open]').catch(() => res.bugs.push('stats did not open'));
    const codeIn = page.locator('#imp');
    const fsIn = await codeIn.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    if (touch && fsIn < 16) res.bugs.push(`streak-code box text is ${fsIn}px: iPhone Safari zooms when tapped`);
    const code = await page.evaluate(() => TAI.store.exportCode());
    await codeIn.fill(code); await tap('#impBtn'); await sleep(100);
    const note = await page.textContent('#impNote');
    if (!/Nothing new|Added/.test(note)) res.bugs.push('streak code import says: ' + note);
    await codeIn.fill('garbage'); await tap('#impBtn');
    if (!/doesn/.test(await page.textContent('#impNote'))) res.bugs.push('bad streak code not rejected');
    await page.keyboard.press('Escape'); await sleep(200);
    if (await page.locator('dialog[open]').count()) res.bugs.push('Escape did not close stats');

    // 4. Every case, every check
    const all = await playAll(page);
    res.cases = all.n;
    for (const f of all.fails) res.bugs.push(f);

    // 5. Case 1 (full SQL console)
    await page.goto(BASE + 'case-1/');
    await page.waitForFunction(() => document.querySelector('#sql, textarea'), null, { timeout: 15000 }).catch(() => res.bugs.push('case 1 did not load'));
    await sleep(1500);
    const c1 = await page.evaluate(() => ({ w: document.documentElement.scrollWidth - innerWidth, fs: (() => { const t = document.querySelector('textarea'); return t ? parseFloat(getComputedStyle(t).fontSize) : 99; })() }));
    if (c1.w > 1) res.bugs.push('case 1 sideways scroll by ' + c1.w + 'px');
    if (touch && c1.fs < 16) res.bugs.push(`case 1 SQL box text is ${c1.fs}px: iPhone zooms when tapped`);
    await shot('6-case1');

    // 6. Offline after first visit (installed-app behaviour)
    await page.goto(BASE + '#/'); await sleep(2500);
    const swOk = await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller ? 'controlled' : (navigator.serviceWorker ? 'registered-not-controlling' : 'no-sw'));
    res.notes.push('service worker: ' + swOk);
    if (swOk === 'controlled' && engine === webkit) res.notes.push('offline: see server-off test (Playwright WebKit offline mode blocks the service worker)');
    else if (swOk === 'controlled') {
      await ctx.setOffline(true);
      try {
        await page.reload({ waitUntil: 'load' });
        await page.evaluate(() => { location.hash = '#/practice/3'; });
        await page.waitForSelector('#picks', { timeout: 10000 });
        res.notes.push('offline: works');
      } catch (e) { res.bugs.push('offline play failed: ' + e.message.split('\n')[0]); }
      await ctx.setOffline(false);
    }
  } catch (e) {
    res.bugs.push('TEST STOPPED: ' + e.message.split('\n')[0]);
    await shot('error');
  }
  const uniq = [...new Set(errors)].filter((e) => !/net::ERR_INTERNET_DISCONNECTED|offline|Failed to load resource.*(internet|offline)/i.test(e));
  for (const e of uniq.slice(0, 8)) res.bugs.push(e);
  await browser.close();
  return res;
}

async function tzCheck() {
  // Same day everywhere? The daily case follows the player's local date; check no errors at odd time zones and near midnight.
  const out = [];
  const browser = await chromium.launch();
  for (const tz of ['America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
    const ctx = await browser.newContext({ timezoneId: tz, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '#/'); await page.waitForSelector('#howBtn');
    const r = await page.evaluate(() => ({ today: TAI.util.todayISO(), title: document.getElementById('todayTitle').textContent, no: TAI.caseFor(TAI.util.todayISO()).no }));
    out.push({ tz, ...r, errs });
    await ctx.close();
  }
  await browser.close();
  return out;
}

(async () => {
  const t0 = Date.now();
  for (const p of PROFILES) {
    if (ONLY && !p[1].toLowerCase().includes(ONLY.toLowerCase())) continue;
    const r = await runProfile(p);
    results.push(r);
    console.log(`${r.bugs.length ? 'FAIL' : 'PASS'}  ${r.platform.padEnd(8)} ${r.label.padEnd(28)} cases:${r.cases || 0}  ${r.notes.join(' | ')}`);
    for (const b of r.bugs) console.log('      - ' + b);
  }
  if (!ONLY) { const tz = await tzCheck(); console.log('TIMEZONES'); for (const z of tz) console.log('  ', z.tz.padEnd(20), z.today, '#' + z.no, z.errs.length ? 'ERR ' + z.errs.join(';') : 'ok'); results.push({ tz }); }
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log('done in', Math.round((Date.now() - t0) / 1000), 's');
})();
