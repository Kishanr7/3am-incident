// Rough page-speed check, like Lighthouse's mobile run: Pixel 7 size, 4x slower CPU, slow 4G (1.6 Mbps, 150 ms).
//   node perf-test.js https://3am-incident-kish.netlify.app/
// Prints First Contentful Paint, Largest Contentful Paint, layout shift, time until the home page is usable, and
// bytes per host, for a first visit (empty cache) and a repeat visit. Chromium only (needs the DevTools protocol).
const { chromium, devices } = require('playwright');
const BASE = (process.argv[2] || 'https://3am-incident-kish.netlify.app/').replace(/\/?$/, '/');
(async () => {
  const b = await chromium.launch();
  const d = { ...devices['Pixel 7'] }; delete d.defaultBrowserType;
  const ctx = await b.newContext({ ...d });
  await ctx.route('https://gc.zgo.at/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    try { localStorage.setItem('tai.toured', '1'); } catch (e) { /* */ }
  });
  for (const visit of ['first visit', 'repeat visit']) {
    const bytes = {};
    const onResp = (e) => { const h = new URL(e.response.url).host || 'inline'; bytes[h] = (bytes[h] || 0) + (e.response.encodedDataLength || 0); };
    cdp.on('Network.responseReceived', onResp);
    const t0 = Date.now();
    await p.goto(BASE, { waitUntil: 'load' });
    await p.waitForSelector('#statsBtn', { timeout: 60000 });
    const usable = Date.now() - t0;
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime, ...window.__perf,
      xfer: performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) + (performance.getEntriesByType('navigation')[0] || {}).transferSize }));
    cdp.off('Network.responseReceived', onResp);
    console.log(`${visit.padEnd(13)} FCP ${Math.round(m.fcp)} ms · LCP ${Math.round(m.lcp)} ms · CLS ${m.cls.toFixed(3)} · home usable ${usable} ms · transferred ${Math.round(m.xfer / 1024)} KB`);
  }
  await b.close();
})();
