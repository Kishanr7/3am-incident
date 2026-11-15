// Real "server gone" test: serve the site, load it, kill the server, reload and play.
const { webkit, chromium, firefox } = require('playwright');
const { spawn } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const eng of [webkit, chromium]) {
    const port = 8790 + ['webkit', 'chromium', 'firefox'].indexOf(eng.name());
    const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', require('path').resolve(__dirname, '../..')], { stdio: 'ignore' });
    await sleep(1500);
    const b = await eng.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
    const base = `http://localhost:${port}/site/`;
    let out = '';
    try {
      await p.goto(base); await p.evaluate(() => localStorage.setItem('tai.toured', '1')); await sleep(3500); await p.reload(); await sleep(1500);
      const ctl = await p.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
      srv.kill(); await sleep(1000);
      await p.goto(base + '#/practice/7', { timeout: 10000 });
      await p.waitForSelector('#picks', { timeout: 15000 });
      await p.click('#picks button >> nth=0'); await sleep(300);
      const rows = await p.locator('#feed table tr').count();
      out = `sw:${ctl} -> case opened with server off, check ran (${rows} rows)`;
    } catch (e) { out = 'FAILED: ' + e.message.split('\n')[0]; }
    console.log(eng.name().padEnd(9), out);
    srv.kill(); await b.close().catch(() => {});
  }
  process.exit(0);
})();
