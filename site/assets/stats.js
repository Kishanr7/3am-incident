/* 3 a.m. Incident: privacy-friendly visit counts with GoatCounter (https://www.goatcounter.com).
   No cookies, nothing stored on the device, no personal data: GoatCounter keeps a page path, the referring site,
   browser and screen size, and a country from the IP address, which it does not store.
   Only runs on the live site, never on localhost or deploy previews. Honours Do Not Track and Global Privacy Control.
   The script loads from gc.zgo.at, outside the service worker's cache, so offline play is untouched;
   if it is blocked or offline, nothing happens.
   Exposes taiCount(name) for events (case solved, share). */
(function () {
  'use strict';
  var HOST = '3am-incident-kish.netlify.app';
  var ENDPOINT = 'https://3am-incident.goatcounter.com/count';
  var queue = [];
  var ready = false;
  var off = location.hostname !== HOST || navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === '1' || window.doNotTrack === '1';

  function send(v) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(v); } catch (e) { /* never break the game */ }
  }
  function count(v) { if (off) return; if (ready) send(v); else if (queue) queue.push(v); }

  // One path per screen: the home page, a daily, a practice case, case file #1. A shared "beat my time" link counts
  // as the case it opens, plus an event, so the per-case numbers stay together.
  function view() {
    var p = location.pathname, t = document.title, h = location.hash;
    var m = h.match(/^#\/(daily|practice)\/([\w-]+)/);
    if (m) { p = '/' + m[1] + '/' + m[2]; t = (m[1] === 'daily' ? 'Daily ' : 'Practice ') + m[2]; }
    count({ path: p, title: t });
    if (/[?&]vs=/.test(h)) event('beat-my-time-link-opened');
  }
  function event(name) { count({ path: name, title: name, event: true }); }
  window.taiCount = event;

  if (!off) {
    window.goatcounter = { no_onload: true, no_events: true };
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', ENDPOINT);
    s.onload = function () { ready = true; var q = queue; queue = null; for (var i = 0; i < q.length; i++) send(q[i]); };
    s.onerror = function () { queue = null; off = true; };
    document.head.appendChild(s);
  }

  view();
  window.addEventListener('hashchange', function () { if (/^#\/(daily|practice)\//.test(location.hash) || /^#\/?$/.test(location.hash) || !location.hash) view(); });

  // Share and copy buttons on the solved screens (main game and case file #1).
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#shareBtn, #copy');
    if (b) event(b.id === 'shareBtn' ? 'share-clicked' : 'copy-result-clicked');
  });
})();
