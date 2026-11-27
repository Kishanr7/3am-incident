// Visit counts, privacy and security headers (v1.7.0), on 8 setups.
//   node stats-test.js                      local: serves site/ as if it were the live host, with the headers from site/_headers
//   node -r ./no-netlify-toolbar.js stats-test.js https://deploy-preview-N--3am-incident-kish.netlify.app/
//   node stats-test.js https://3am-incident-kish.netlify.app/
// GoatCounter's script is always replaced by a stub, so tests never add to the real numbers. The stub sends each
// count with fetch(), so the Content-Security-Policy's connect-src is exercised too.
// Checks: one count per screen with the right path (home, daily, practice, case file #1, privacy), events (solved,
// copy, beat-my-time link), no count when Global Privacy Control is on, no CSP violations or console errors,
// the SQL engine starts under the CSP (home + case file #1), the 404 page, favicon, robots, sitemap, JSON-LD.
const { chromium, webkit, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const LIVE = 'https://3am-incident-kish.netlify.app/';
const arg = process.argv[2];
const BASE = arg ? arg.replace(/\/?$/, '/') : LIVE;
const LOCAL = !arg;
const SITE = path.resolve(__dirname, '../../site');
const D = (name) => { const d = { ...devices[name] }; delete d.defaultBrowserType; return d; };
const PROFILES = [
  ['Windows', 'Chrome 1366', chromium, { viewport: { width: 1366, height: 768 } }],
  ['Windows', 'Edge 1920', chromium, { viewport: { width: 1920, height: 1080 } }, { channel: 'msedge' }],
  ['Mac', 'Safari (WebKit) 1440', webkit, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ['Mac', 'Chrome 1280', chromium, { viewport: { width: 1280, height: 800 } }],
  ['iPhone', 'iPhone SE (375)', webkit, D('iPhone SE')],
  ['iPhone', 'iPhone 15 Pro Max', webkit, D('iPhone 15 Pro Max')],
  ['Android', 'Pixel 7 (Chrome)', chromium, D('Pixel 7')],
  ['Android', 'Galaxy S9+ (Chrome, 320)', chromium, D('Galaxy S9+')],
];
const STUB = `(function(){var s=window.goatcounter||{};s.count=function(v){fetch('https://3am-incident.goatcounter.com/count?p='+encodeURIComponent(v.path)+(v.event?'&e=true':''),{mode:'no-cors'}).catch(function(){});};window.goatcounter=s;if(!s.no_onload)s.count({path:'AUTO-ONLOAD'});})();`;

// site/_headers -> [{ pattern, headers }]
function readHeaders() {
  const rules = []; let cur = null;
  for (const line of fs.readFileSync(path.join(SITE, '_headers'), 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); continue; }
    const i = line.indexOf(':'); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return rules;
}
const RULES = readHeaders();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
function serveLocal(route) {
  const u = new URL(route.request().url());
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  let file = path.join(SITE, p); let status = 200;
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(SITE, '404.html'); status = 404; }
  const headers = { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' };
  for (const r of RULES) if (r.pattern === '/*' || r.pattern === u.pathname) Object.assign(headers, r.headers);
  return route.fulfill({ status, headers, body: fs.readFileSync(file) });
}

(async () => {
  const allBugs = [];
  const n = new Date(); const todayIso = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); // the browser's local day
  for (const [plat, label, engine, ctxOpts, launchOpts] of (process.env.ONLY ? PROFILES.slice(0, +process.env.ONLY) : PROFILES)) {
    const bugs = []; const notes = [];
    let b;
    try { b = await engine.launch(launchOpts || {}); } catch (e) { console.log(`${plat.padEnd(8)} ${label.padEnd(26)} SKIPPED (${e.message.split('\n')[0]})`); continue; }
    const run = async (extraInit) => {
      const ctx = await b.newContext({ ...ctxOpts, serviceWorkers: 'block' });
      const hits = []; const errors = [];
      await ctx.route('https://gc.zgo.at/**', (r) => r.fulfill({ status: 200, headers: { 'content-type': 'text/javascript' }, body: STUB }));
      await ctx.route('https://3am-incident.goatcounter.com/**', (r) => { const u = new URL(r.request().url()); hits.push(u.searchParams.get('p') + (u.searchParams.get('e') ? ' (event)' : '')); return r.fulfill({ status: 204, body: '' }); });
      if (LOCAL) await ctx.route(LIVE + '**', serveLocal);
      await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); try { localStorage.setItem('tai.toured', '1'); } catch (e) { /* */ } });
      if (extraInit) await ctx.addInitScript(extraInit);
      const p = await ctx.newPage();
      p.on('console', (m) => { if (m.type() === 'error' && !/favicon|netlify|Failed to load resource.*404/i.test(m.text())) errors.push(m.text().slice(0, 160)); });
      p.on('pageerror', (e) => errors.push('pageerror ' + e.message.slice(0, 160)));
      const csp = async () => { const v = await p.evaluate(() => window.__csp || []).catch(() => []); for (const x of v) bugs.push('CSP violation on ' + p.url() + ': ' + x); };
      return { ctx, p, hits, errors, csp };
    };
    try {
      const { ctx, p, hits, errors, csp } = await run();
      const settle = () => p.waitForTimeout(700);
      // Home
      const resp = await p.goto(BASE); await p.waitForSelector('#statsBtn', { timeout: 20000 }); await settle(); await csp();
      const h = resp.headers();
      if (!/script-src[^;]*gc\.zgo\.at/.test(h['content-security-policy'] || '')) bugs.push('no CSP header allowing gc.zgo.at on home');
      // Practice case: open, solve, copy result
      await p.evaluate(() => { location.hash = '#/practice/7'; });
      await p.waitForSelector('#send', { timeout: 20000 }); await settle();
      await p.evaluate(() => { const c = window.__tai.state.c; for (const q of c.questions) { const ty = document.getElementById('ans_' + q.id); if (ty) { ty.value = String(c.answerQ.value); ty.dispatchEvent(new Event('input')); continue; } const o = q.options.find((x) => x.correct); document.querySelector(`input[name="${q.id}"][value="${o.id}"]`).click(); } document.getElementById('send').click(); });
      await p.waitForSelector('#copy', { timeout: 10000 }); await p.click('#copy').catch(() => {}); await settle();
      const level = await p.evaluate(() => window.__tai.state.c.level);
      await csp();
      // Today's daily from a "beat my time" link
      await p.evaluate((d) => { location.hash = '#/daily/' + d + '?vs=5.3'; }, todayIso);
      await p.waitForSelector('#send', { timeout: 20000 }).catch(() => notes.push('daily ' + todayIso + ' did not open (date edge)'));
      await settle(); await csp();
      // Case file #1: the SQL engine must start under the CSP
      await p.goto(BASE + 'case-1/'); await p.waitForFunction(() => document.getElementById('boot') && document.getElementById('boot').hidden, null, { timeout: 25000 }).catch(() => bugs.push('case-1: SQL engine did not start'));
      await settle(); await csp();
      // Privacy page
      await p.goto(BASE + 'privacy/'); await settle(); await csp();
      if (!(await p.locator('h1', { hasText: 'Privacy' }).count())) bugs.push('privacy page has no heading');
      // 404
      const r404 = await p.goto(BASE + 'no-such-page/'); await settle(); await csp();
      if (r404.status() !== 404) bugs.push('missing page returns ' + r404.status());
      if (!(await p.locator('h1', { hasText: '404' }).count())) bugs.push('404 page not shown');
      const want = ['/', '/practice/7', 'solved-practice-' + level + ' (event)', 'copy-result-clicked (event)', '/daily/' + todayIso, 'beat-my-time-link-opened (event)', '/case-1/', '/privacy/'];
      for (const w of want) if (!hits.includes(w)) bugs.push('not counted: ' + w);
      if (hits.includes('AUTO-ONLOAD')) bugs.push('GoatCounter counted on load by itself (double count)');
      if (hits.filter((x) => x === '/practice/7').length !== 1) bugs.push('practice view counted ' + hits.filter((x) => x === '/practice/7').length + ' times');
      if (hits.some((x) => /no-such-page/.test(x))) bugs.push('404 page was counted');
      for (const e of errors) bugs.push('console: ' + e);
      notes.push(hits.length + ' counts');
      await ctx.close();
      // Global Privacy Control on: nothing loads, nothing counted
      const g = await run(() => { Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }); });
      await g.p.goto(BASE); await g.p.waitForSelector('#statsBtn', { timeout: 20000 }); await g.p.waitForTimeout(800);
      if (g.hits.length) bugs.push('counted with Global Privacy Control on: ' + g.hits.join(', '));
      if (await g.p.evaluate(() => !!document.querySelector('script[src*="zgo.at"]'))) bugs.push('counter script loaded with GPC on');
      await g.ctx.close();
    } catch (e) { bugs.push('FAILED: ' + e.message.split('\n')[0]); }
    await b.close().catch(() => {});
    console.log(`${plat.padEnd(8)} ${label.padEnd(26)} ${bugs.length ? 'BUGS' : 'ok'}  (${notes.join('; ')})`);
    for (const x of bugs) console.log('    - ' + x);
    allBugs.push(...bugs);
  }
  // Crawler files and structured data (one fetch each, engine-independent)
  const b = await chromium.launch(); const ctx = await b.newContext({ serviceWorkers: 'block' });
  if (LOCAL) await ctx.route(LIVE + '**', serveLocal);
  const req = ctx.request; const seo = [];
  const get = async (u) => {
    if (!LOCAL) return req.get(u);
    let f = path.join(SITE, u.slice(LIVE.length)); if (f.endsWith(path.sep) || u.endsWith('/')) f = path.join(f, 'index.html');
    const ok = fs.existsSync(f); return { status: () => (ok ? 200 : 404), text: async () => (ok ? fs.readFileSync(f, 'utf8') : '') };
  };
  for (const [u, test] of [
    ['robots.txt', (t) => /Sitemap: https:\/\/3am-incident-kish\.netlify\.app\/sitemap\.xml/.test(t)],
    ['sitemap.xml', (t) => (t.match(/<lastmod>/g) || []).length === 3 && t.includes('/privacy/')],
    ['favicon.ico', () => true], ['favicon.svg', () => true], ['og.png', () => true], ['manifest.webmanifest', (t) => JSON.parse(t).icons.length >= 3],
  ]) { const r = await get(BASE + u); if (r.status() !== 200 || !test(await r.text())) seo.push(u + ' missing or wrong (' + r.status() + ')'); }
  for (const u of ['', 'case-1/', 'privacy/']) {
    const t = await (await get(BASE + u)).text();
    if (!/<link rel="canonical" href="https:\/\/3am-incident-kish\.netlify\.app\//.test(t)) seo.push(u + ': no canonical');
    if (!/<meta name="description" content="[^"]{50,}/.test(t)) seo.push(u + ': no description');
    const ld = t.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (u !== 'privacy/') { try { JSON.parse(ld[1]); } catch (e) { seo.push(u + ': JSON-LD missing or invalid'); } }
  }
  const home = await (await get(BASE)).text();
  if (!/class="static-intro"[\s\S]*SQL/.test(home)) seo.push('home: no static text for crawlers');
  await b.close();
  console.log('SEO files  ' + (seo.length ? 'BUGS' : 'ok (robots, sitemap lastmod, favicons, og.png, manifest, canonical, descriptions, JSON-LD, static intro)'));
  for (const x of seo) console.log('    - ' + x);
  allBugs.push(...seo);
  console.log(allBugs.length ? `\n${allBugs.length} problem(s)` : '\nAll pass');
  process.exit(allBugs.length ? 1 : 0);
})();
