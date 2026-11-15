# Cross-browser tests

Runs the real game in the three browser engines that matter, at real device sizes, with touch where the device has it.

| Platform | Setups |
| --- | --- |
| Windows | Chrome 1366×768, Edge 1920×1080 |
| Mac | Safari engine (WebKit) 1440×900, Chrome 1280×800 |
| iPhone | iPhone SE, 13 mini, 15 Pro Max, a 320-px-wide small phone (WebKit, touch) |
| Android | Pixel 7, Galaxy S9+ at 320 px (Chrome, touch) |
| iPad | iPad Mini landscape (WebKit, touch) |

For every setup: first-visit tour, today's case by real taps (a check, Byte, own SQL, a wrong report then a right one, copy result), home page (sideways scroll, theme switch, practice levels, stats, streak code in and out, Escape), **all 107 cases with every check opened**, case 1, offline. Text boxes must be 16 px or larger on touch screens (iPhone zooms otherwise). Also checks the daily case in five time zones.

```bash
cd tools/xbrowser
npm init -y && npm i -D playwright@1.61.1 && npx playwright install webkit chromium
python -m http.server 8767 --directory ../..      # in another terminal
node xtest.js http://localhost:8767/site/          # about 10 minutes; screenshots in shots/
node offline-test.js                               # loads the site, switches the server off, plays a case
```

Limits: WebKit here is Playwright's build of Safari's engine on Windows, not Safari on a real iPhone or Mac. Playwright's own offline switch blocks the service worker in WebKit, so offline is tested by stopping the server instead. Firefox's test build does not start on this PC (missing Windows runtime); Firefox was checked by feature review only.
