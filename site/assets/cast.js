/* 3 a.m. Incident: the on-call crew. Hand-built SVG portraits with shading; no image files to load.
   To use your own pictures instead, add "img: 'assets/cast/maya.webp'" to a character below. */
(function () {
  'use strict';
  const TAI = window.TAI;
  let uid = 0;
  // Each portrait gets unique gradient ids, so several copies can sit on one page.
  const svg = (build) => () => { const id = 'c' + (uid++); return `<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false"><defs><clipPath id="${id}cl"><circle cx="48" cy="48" r="48"/></clipPath></defs><g clip-path="url(#${id}cl)">${build(id)}</g></svg>`; };
  const bg = (id, a, b) => `<defs><radialGradient id="${id}bg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><circle cx="48" cy="48" r="48" fill="url(#${id}bg)"/>`;
  const skin = (id, light, dark) => `<defs><radialGradient id="${id}sk" cx="45%" cy="38%" r="65%"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>`;
  const eye = (x, y, iris) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.6" fill="#fbfaf7"/><circle cx="${x + 0.3}" cy="${y + 0.1}" r="2" fill="${iris}"/><circle cx="${x + 0.3}" cy="${y + 0.1}" r="1" fill="#141414"/><circle cx="${x + 0.9}" cy="${y - 0.7}" r=".6" fill="#fff"/>`;

  const maya = svg((id) => bg(id, '#dfece8', '#b9d3cc') + skin(id, '#f1c8ad', '#d89f80') +
    // hair back
    '<path d="M24 52c-2-20 8-34 24-34s27 13 24 34c-1 9-3 16-6 20H30c-3-4-5-11-6-20z" fill="#2e211d"/>' +
    // blazer and blouse
    `<defs><linearGradient id="${id}bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d3b3b"/><stop offset="1" stop-color="#5a2828"/></linearGradient></defs>` +
    `<path d="M16 96c1-15 10-24 22-26l10 9 10-9c12 2 21 11 22 26z" fill="url(#${id}bl)"/>` +
    '<path d="M40 71l8 9 8-9-3-2h-10z" fill="#f4efe7"/><path d="M38 70l10 26M58 70l-10 26" stroke="#4a2020" stroke-width="1.2" opacity=".5"/>' +
    // neck
    `<path d="M42 60h12v12c-3 3-9 3-12 0z" fill="url(#${id}sk)"/><path d="M42 66c4 3 8 3 12 0" stroke="#c48a6c" stroke-width="1" fill="none" opacity=".6"/>` +
    // face
    `<ellipse cx="48" cy="46" rx="15" ry="17.5" fill="url(#${id}sk)"/>` +
    '<ellipse cx="33" cy="47" rx="2.6" ry="4" fill="#dda385"/><ellipse cx="63" cy="47" rx="2.6" ry="4" fill="#dda385"/><circle cx="33" cy="52.5" r="1.3" fill="#f4f1ea"/><circle cx="63" cy="52.5" r="1.3" fill="#f4f1ea"/>' +
    // fringe
    '<path d="M32 42c1-12 8-18 17-18 9 0 15 6 16 16-6-6-13-8-20-6-5 1-9 4-13 8z" fill="#3a2a24"/><path d="M44 27c-4 3-6 7-7 11" stroke="#58423a" stroke-width="1.2" fill="none" opacity=".7"/>' +
    // brows, eyes, glasses
    '<path d="M38 40.5q4-2 8 0M50 40.5q4-2 8 0" stroke="#2e211d" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    eye(42, 45.5, '#5a3b2a') + eye(54, 45.5, '#5a3b2a') +
    '<rect x="36.5" y="41.5" width="10.5" height="8" rx="3" fill="none" stroke="#1f1a18" stroke-width="1.4"/><rect x="49" y="41.5" width="10.5" height="8" rx="3" fill="none" stroke="#1f1a18" stroke-width="1.4"/><path d="M47 44.5h2" stroke="#1f1a18" stroke-width="1.3"/>' +
    // nose, mouth, cheeks
    '<path d="M48 48v5.5l-1.6 1" stroke="#b97d61" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M43.5 57.5q4.5 2.4 9 0" stroke="#9c4a44" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="39" cy="53" rx="3" ry="1.8" fill="#e59a8a" opacity=".35"/><ellipse cx="57" cy="53" rx="3" ry="1.8" fill="#e59a8a" opacity=".35"/>');

  const sam = svg((id) => bg(id, '#f6ead6', '#e8d2ae') + skin(id, '#c99572', '#a2704f') +
    // hoodie
    `<defs><linearGradient id="${id}hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a64a"/><stop offset="1" stop-color="#c58431"/></linearGradient></defs>` +
    `<path d="M14 96c2-16 12-25 25-27h18c13 2 23 11 25 27z" fill="url(#${id}hd)"/>` +
    '<path d="M36 70q12 10 24 0" stroke="#a96d24" stroke-width="2.5" fill="none"/><path d="M43 76v10M53 76v10" stroke="#f6ead6" stroke-width="1.6" stroke-linecap="round"/>' +
    `<path d="M42 60h12v11c-3 3-9 3-12 0z" fill="url(#${id}sk)"/>` +
    `<ellipse cx="48" cy="47" rx="15" ry="17" fill="url(#${id}sk)"/>` +
    '<ellipse cx="33.5" cy="48" rx="2.5" ry="3.8" fill="#b07c5a"/><ellipse cx="62.5" cy="48" rx="2.5" ry="3.8" fill="#b07c5a"/>' +
    '<path d="M31 51v-3a2 2 0 0 1 4 0v3" fill="#f2f2f0"/><path d="M33 51v6" stroke="#f2f2f0" stroke-width="1.6" stroke-linecap="round"/>' +
    // curls
    '<g fill="#3b2416"><circle cx="34" cy="38" r="6"/><circle cx="39" cy="31" r="6.5"/><circle cx="47" cy="28" r="7"/><circle cx="55" cy="30" r="6.5"/><circle cx="61" cy="36" r="6"/><circle cx="63" cy="43" r="4"/><circle cx="33" cy="44" r="3.6"/></g>' +
    '<g fill="#5a3824" opacity=".8"><circle cx="41" cy="29" r="2"/><circle cx="50" cy="26" r="2.2"/><circle cx="58" cy="31" r="1.8"/><circle cx="36" cy="35" r="1.6"/></g>' +
    // worried brows, wide eyes
    '<path d="M38 40q3.5-3 7-1M51 39q3.5-2 7 1" stroke="#2c1a10" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="45.5" rx="4" ry="3.4" fill="#fbfaf7"/><ellipse cx="54" cy="45.5" rx="4" ry="3.4" fill="#fbfaf7"/><circle cx="42.3" cy="45.8" r="2.1" fill="#4a2c1a"/><circle cx="54.3" cy="45.8" r="2.1" fill="#4a2c1a"/><circle cx="42.3" cy="45.8" r="1" fill="#111"/><circle cx="54.3" cy="45.8" r="1" fill="#111"/><circle cx="43" cy="45" r=".6" fill="#fff"/><circle cx="55" cy="45" r=".6" fill="#fff"/>' +
    '<path d="M48 48.5v5l-1.5 1" stroke="#8a5a3c" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 57.5q4-2.6 8 0q-4 4.5-8 0z" fill="#6b2a20"/><path d="M45.5 58.6q2.5 1.6 5 0" stroke="#e9a49a" stroke-width="1" fill="none"/>' +
    // sweat drop
    '<path d="M64 33q2 3.5 0 5q-2-1.5 0-5z" fill="#9fd3e8"/>');

  const byte = svg((id) => bg(id, '#e3ece6', '#c3d6cb') +
    `<defs><radialGradient id="${id}fur" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#b1aba4"/><stop offset="1" stop-color="#7f7871"/></radialGradient></defs>` +
    // body/chest
    `<path d="M22 96c0-16 11-26 26-26s26 10 26 26z" fill="url(#${id}fur)"/><path d="M38 96c0-10 4-18 10-18s10 8 10 18z" fill="#ece6dc"/>` +
    // ears
    `<path d="M24 38l4-22 16 12z" fill="url(#${id}fur)"/><path d="M72 38l-4-22-16 12z" fill="url(#${id}fur)"/>` +
    '<path d="M28 34l2.5-13 9 7.5z" fill="#e7b0a6"/><path d="M68 34l-2.5-13-9 7.5z" fill="#e7b0a6"/>' +
    // head
    `<ellipse cx="48" cy="50" rx="24" ry="21" fill="url(#${id}fur)"/>` +
    // tabby stripes
    '<path d="M48 30v8M42 31l1.5 7M54 31l-1.5 7" stroke="#5f5852" stroke-width="2.2" stroke-linecap="round"/><path d="M25 47l7 1.5M24 53l7 0M71 47l-7 1.5M72 53l-7 0" stroke="#5f5852" stroke-width="1.8" stroke-linecap="round"/>' +
    // muzzle
    '<ellipse cx="43" cy="59" rx="6.5" ry="5" fill="#ece6dc"/><ellipse cx="53" cy="59" rx="6.5" ry="5" fill="#ece6dc"/>' +
    // eyes
    '<ellipse cx="38" cy="48" rx="5.2" ry="5.6" fill="#b9cf6a"/><ellipse cx="58" cy="48" rx="5.2" ry="5.6" fill="#b9cf6a"/><ellipse cx="38" cy="48.3" rx="1.6" ry="4.6" fill="#16140f"/><ellipse cx="58" cy="48.3" rx="1.6" ry="4.6" fill="#16140f"/><circle cx="39.6" cy="45.8" r="1.1" fill="#fff"/><circle cx="59.6" cy="45.8" r="1.1" fill="#fff"/>' +
    // nose, mouth, whiskers
    '<path d="M45.5 55h5l-2.5 2.6z" fill="#d98a86"/><path d="M48 57.6v2.2q-2.5 2.6-5 .8M48 59.8q2.5 2.6 5 .8" stroke="#4a443f" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
    '<path d="M36 58l-15-2M36 61l-14 2M60 58l15-2M60 61l14 2" stroke="#f5f1ea" stroke-width=".9" stroke-linecap="round" opacity=".9"/>');

  const gus = svg((id) => bg(id, '#ebe6d8', '#d3cbb4') +
    `<defs><linearGradient id="${id}case" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6dcc4"/><stop offset="1" stop-color="#c2b597"/></linearGradient><radialGradient id="${id}scr" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#3d6b56"/><stop offset="1" stop-color="#1f3a2f"/></radialGradient></defs>` +
    // keyboard
    '<path d="M18 84l6-8h48l6 8z" fill="#b7aa8c"/><path d="M26 79h44M24 82h48" stroke="#8f8368" stroke-width="1"/>' +
    // monitor
    `<rect x="20" y="18" width="56" height="50" rx="7" fill="url(#${id}case)" stroke="#8f8368" stroke-width="1.5"/>` +
    `<rect x="27" y="24" width="42" height="33" rx="5" fill="url(#${id}scr)"/>` +
    '<path d="M29 27q10-3 20-1" stroke="#9fd3b4" stroke-width="1.2" opacity=".35" fill="none"/>' +
    '<rect x="40" y="68" width="16" height="6" fill="#a99c7f"/>' +
    // face on screen: clock eyes, moustache
    '<circle cx="40" cy="37" r="4.5" fill="#cdeccf"/><circle cx="56" cy="37" r="4.5" fill="#cdeccf"/><path d="M40 37v-3M40 37h2.4M56 37v-3M56 37h2.4" stroke="#1f3a2f" stroke-width="1.1" stroke-linecap="round"/>' +
    '<path d="M36 31.5q4-2 8 0M52 31.5q4-2 8 0" stroke="#cdeccf" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
    '<path d="M38 47q5-4 10-.5q5-3.5 10 .5q-4 3-10 1q-6 2-10-1z" fill="#f2efe6"/><path d="M45 51.5q3 1.2 6 0" stroke="#cdeccf" stroke-width="1.1" fill="none"/>' +
    // power LED, vents, label
    '<circle cx="68" cy="62.5" r="1.6" fill="#7fd37f"/><path d="M26 62h14" stroke="#9c8f72" stroke-width="1.2"/><text x="48" y="64" font-size="4.2" text-anchor="middle" fill="#7a6e55" font-family="monospace">CRON-86</text>');

  const vendor = svg((id) => bg(id, '#e6e4ef', '#c9c5dc') + skin(id, '#d9a888', '#b78463') +
    // suit, shirt, tie
    `<defs><linearGradient id="${id}suit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f4660"/><stop offset="1" stop-color="#2a2f44"/></linearGradient></defs>` +
    `<path d="M14 96c2-16 12-25 25-27l9 10 9-10c13 2 23 11 25 27z" fill="url(#${id}suit)"/>` +
    '<path d="M40 70l8 9 8-9-2-2H42z" fill="#f2f2f2"/><path d="M48 78l-3 5 3 13 3-13z" fill="#c9a43c"/><path d="M48 78l-2 3h4z" fill="#a8862c"/>' +
    `<path d="M42 60h12v11c-3 3-9 3-12 0z" fill="url(#${id}sk)"/>` +
    `<ellipse cx="48" cy="46" rx="15" ry="17.5" fill="url(#${id}sk)"/>` +
    '<ellipse cx="33" cy="47" rx="2.6" ry="4" fill="#c89574"/><ellipse cx="63" cy="47" rx="2.6" ry="4" fill="#c89574"/>' +
    // slicked hair
    '<path d="M32 42c-1-12 6-19 16-19 11 0 17 7 16 18-2-5-6-9-12-10-7-1-15 2-20 11z" fill="#1d1a22"/><path d="M38 30q8-4 18 0" stroke="#4a4552" stroke-width="1.2" fill="none" opacity=".8"/>' +
    // sunglasses with shine
    '<path d="M35 42h12v4.5q-.5 4-6 4t-6-4zM49 42h12v4.5q-.5 4-6 4t-6-4z" fill="#151319"/><path d="M47 43.5h2" stroke="#151319" stroke-width="1.6"/><path d="M37 43.5l3.5 3.5M51 43.5l3.5 3.5" stroke="#6b6680" stroke-width="1.1" opacity=".8"/>' +
    '<path d="M48 49v5l-1.6 1" stroke="#9e6d50" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    // smug half-smile and phone
    '<path d="M43 58q5 1.6 10-1.4" stroke="#7a3e32" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
    '<rect x="62" y="40" width="7" height="15" rx="2" fill="#26232d" transform="rotate(14 65 47)"/><path d="M60 62q4-4 6-9" stroke="#b78463" stroke-width="4" stroke-linecap="round" fill="none"/>');

  const alert = svg((id) => `<circle cx="48" cy="48" r="48" fill="#34403f"/><path d="M48 22a15 15 0 0 0-15 15v12l-6 10h42l-6-10V37a15 15 0 0 0-15-15z" fill="#e8c46a"/><circle cx="48" cy="66" r="5" fill="#e8c46a"/><path d="M37 37a11 11 0 0 1 8-9" stroke="#f6e3ad" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  // Nia: support lead. Headset, braids, calm but tired.
  const nia = svg((id) => bg(id, '#ece4f1', '#d3c4de') + skin(id, '#a8714f', '#7d4f33') +
    '<path d="M25 56c-3-22 7-36 23-36s26 14 23 36c-1 8-3 14-5 18H30c-2-4-4-10-5-18z" fill="#1f1512"/>' +
    '<path d="M27 58v24M31 60v26M65 60v26M69 58v24" stroke="#2b1d18" stroke-width="3.2" stroke-linecap="round"/>' +
    `<defs><linearGradient id="${id}sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f8f86"/><stop offset="1" stop-color="#467069"/></linearGradient></defs>` +
    `<path d="M15 96c2-15 12-24 24-26h18c12 2 22 11 24 26z" fill="url(#${id}sw)"/><path d="M40 70q8 6 16 0" stroke="#3a5f59" stroke-width="2" fill="none"/>` +
    `<path d="M42 60h12v11c-3 3-9 3-12 0z" fill="url(#${id}sk)"/>` +
    `<ellipse cx="48" cy="47" rx="14.5" ry="17" fill="url(#${id}sk)"/>` +
    '<path d="M33 42c1-11 7-17 15-17s14 6 15 16c-5-5-10-7-15-7s-11 3-15 8z" fill="#2b1d18"/>' +
    '<path d="M38.5 40q3.5-1.6 7 0M50.5 40q3.5-1.6 7 0" stroke="#1a110e" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    eye(42, 45.5, '#3b2418') + eye(54, 45.5, '#3b2418') +
    '<path d="M48 48.5v4.5l-1.5 1" stroke="#6a4129" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M43.5 57.8q4.5 1.8 9 0" stroke="#5e2a22" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
    // headset
    '<path d="M31 46c0-12 7-20 17-20s17 8 17 20" stroke="#2d3436" stroke-width="2.6" fill="none"/><rect x="28" y="42" width="6" height="10" rx="3" fill="#2d3436"/><rect x="62" y="42" width="6" height="10" rx="3" fill="#2d3436"/><path d="M31 52q1 8 9 9" stroke="#2d3436" stroke-width="1.8" fill="none"/><circle cx="41" cy="61" r="1.8" fill="#2d3436"/>');

  // Theo: CRM and email lead. Beanie, round glasses, a coffee.
  const theo = svg((id) => bg(id, '#f3e6dc', '#e3c9b6') + skin(id, '#f0cfb7', '#d4a688') +
    `<defs><linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5d8c"/><stop offset="1" stop-color="#36466e"/></linearGradient></defs>` +
    `<path d="M15 96c2-15 12-24 24-26h18c12 2 22 11 24 26z" fill="url(#${id}sh)"/><path d="M42 70l6 8 6-8" stroke="#f3efe7" stroke-width="2" fill="none"/>` +
    `<path d="M42 60h12v11c-3 3-9 3-12 0z" fill="url(#${id}sk)"/>` +
    `<ellipse cx="48" cy="48" rx="14.5" ry="17" fill="url(#${id}sk)"/>` +
    '<ellipse cx="33.8" cy="49" rx="2.4" ry="3.6" fill="#d9a587"/><ellipse cx="62.2" cy="49" rx="2.4" ry="3.6" fill="#d9a587"/>' +
    '<path d="M35 56q2 10 13 11q11-1 13-11q-2 5-13 6q-11-1-13-6z" fill="#9a6a45" opacity=".85"/>' +
    // beanie
    '<path d="M31 40c0-12 8-19 17-19s17 7 17 19z" fill="#c4573f"/><rect x="30" y="37" width="36" height="6" rx="3" fill="#a9452f"/><circle cx="48" cy="20" r="3.2" fill="#e9c6a8"/>' +
    '<path d="M38.5 44.5q3.5-1.8 7 0M50.5 44.5q3.5-1.8 7 0" stroke="#6b4a33" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    eye(42, 48.5, '#4f6b48') + eye(54, 48.5, '#4f6b48') +
    '<circle cx="42" cy="48.5" r="5" fill="none" stroke="#2a2522" stroke-width="1.3"/><circle cx="54" cy="48.5" r="5" fill="none" stroke="#2a2522" stroke-width="1.3"/><path d="M47 48.2h2" stroke="#2a2522" stroke-width="1.2"/>' +
    '<path d="M48 51.5v4l-1.4 1" stroke="#b07c5a" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 59.5q4 1.4 8-.6" stroke="#8a3f33" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    // coffee cup
    '<rect x="64" y="70" width="11" height="14" rx="2" fill="#f4efe7"/><rect x="64" y="74" width="11" height="4" fill="#c4573f"/><path d="M75 74q4 0 4 4t-4 4" stroke="#f4efe7" stroke-width="1.8" fill="none"/>');

  const C = {
    maya: { name: 'Maya', role: 'CFO', draw: maya, blurb: 'Sharp, impatient, fair. Wants the real number before the 9:00 meeting.' },
    sam: { name: 'Sam', role: 'Growth lead', draw: sam, blurb: 'Panics first, apologises later. Owns every campaign.' },
    nia: { name: 'Nia', role: 'Support lead', draw: nia, blurb: 'First to hear when something breaks, because customers tell her. Loudly.' },
    theo: { name: 'Theo', role: 'CRM & email lead', draw: theo, blurb: 'Writes every subject line nine times. Lives in the send schedule.' },
    byte: { name: 'Byte', role: 'On-call cat', draw: byte, blurb: 'Walks across your keyboard when you’re stuck. Usually right.' },
    gus: { name: 'Old Gus', role: 'Legacy cron job', draw: gus, blurb: 'Nobody knows what he does. Everything breaks without him.' },
    vendor: { name: 'The Vendor', role: 'Data supplier', draw: vendor, blurb: 'Never late, according to the vendor. Always “investigating”.' },
    alert: { name: '#data-alerts', role: 'Monitoring', draw: alert, blurb: '' },
  };
  // Backwards-compatible: CAST[x].svg returns a fresh portrait each time it is read.
  for (const k of Object.keys(C)) Object.defineProperty(C[k], 'svg', { get() { return this.img ? `<img src="${this.img}" alt="" loading="lazy">` : this.draw(); } });
  TAI.CAST = C;
})();
