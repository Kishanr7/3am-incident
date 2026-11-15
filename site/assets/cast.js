/* 3 a.m. Incident: the on-call crew. Simple inline SVG portraits, no image files. */
(function () {
  'use strict';
  const TAI = window.TAI;
  const svg = (inner, bg) => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="24" fill="${bg}"/>${inner}</svg>`;

  const maya = svg(
    '<path d="M11 30c0-11 5.5-18 13-18s13 7 13 18v7h-5V28c0-5-3.5-8-8-8s-8 3-8 8v9h-5z" fill="#3a2621"/>' +
    '<circle cx="24" cy="27" r="9.5" fill="#e8b394"/>' +
    '<path d="M15 24c2-6 6-8 9-8s7 2 9 8c-4-3-12-3-18 0z" fill="#3a2621"/>' +
    '<circle cx="20.2" cy="27" r="2.9" fill="none" stroke="#2b1d18" stroke-width="1.3"/><circle cx="27.8" cy="27" r="2.9" fill="none" stroke="#2b1d18" stroke-width="1.3"/>' +
    '<path d="M23.1 27h1.8" stroke="#2b1d18" stroke-width="1.2"/><circle cx="20.2" cy="27" r="1" fill="#2b1d18"/><circle cx="27.8" cy="27" r="1" fill="#2b1d18"/>' +
    '<path d="M21.5 32.2q2.5 1.4 5 0" stroke="#8a3b2c" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M16 40q8 -4 16 0v8H16z" fill="#8a3b2c"/>', '#f4d6c6');

  const sam = svg(
    '<circle cx="24" cy="27" r="10" fill="#c98c62"/>' +
    '<g fill="#5a3418"><circle cx="16" cy="20" r="4"/><circle cx="20" cy="16" r="4.3"/><circle cx="25" cy="14.8" r="4.4"/><circle cx="30" cy="16.5" r="4.2"/><circle cx="33" cy="21" r="3.6"/><circle cx="15" cy="25" r="2.6"/><circle cx="33.5" cy="25.5" r="2.4"/></g>' +
    '<circle cx="20.3" cy="26.6" r="2.4" fill="#fff"/><circle cx="27.7" cy="26.6" r="2.4" fill="#fff"/><circle cx="20.6" cy="26.9" r="1.2" fill="#22160f"/><circle cx="28" cy="26.9" r="1.2" fill="#22160f"/>' +
    '<ellipse cx="24" cy="32.6" rx="2.2" ry="2.6" fill="#5b1f12"/>' +
    '<path d="M16 40q8 -4 16 0v8H16z" fill="#e0952e"/>', '#ffe2a8');

  const byte = svg(
    '<path d="M13 18l3.5-9 7 6.5zM35 18l-3.5-9-7 6.5z" fill="#8c8681"/><path d="M15.5 16l2-4.6 3.6 3.4zM32.5 16l-2-4.6-3.6 3.4z" fill="#e7a7a0"/>' +
    '<ellipse cx="24" cy="27" rx="13" ry="11.5" fill="#9a948f"/>' +
    '<ellipse cx="19" cy="25.5" rx="2.4" ry="3" fill="#f3e3a1"/><ellipse cx="29" cy="25.5" rx="2.4" ry="3" fill="#f3e3a1"/><ellipse cx="19" cy="25.8" rx=".9" ry="2.4" fill="#1d1a17"/><ellipse cx="29" cy="25.8" rx=".9" ry="2.4" fill="#1d1a17"/>' +
    '<path d="M22.6 30h2.8l-1.4 1.5z" fill="#d9837a"/><path d="M24 31.5q-1.5 2-3.2 1M24 31.5q1.5 2 3.2 1" stroke="#3a3430" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    '<path d="M9 28.5l7 1M9 32l7-.6M39 28.5l-7 1M39 32l-7-.6" stroke="#3a3430" stroke-width=".8" stroke-linecap="round"/>', '#d9e4dc');

  const gus = svg(
    '<rect x="11" y="12" width="26" height="21" rx="4" fill="#d8cdb6" stroke="#6d6250" stroke-width="1.4"/>' +
    '<rect x="14.5" y="15" width="19" height="13" rx="2" fill="#3f5a4a"/>' +
    '<circle cx="20" cy="20.5" r="2.4" fill="#cfe8c9"/><circle cx="28" cy="20.5" r="2.4" fill="#cfe8c9"/><path d="M20 20.5v-1.4M20 20.5h1.2M28 20.5v-1.4M28 20.5h1.2" stroke="#3f5a4a" stroke-width=".8"/>' +
    '<path d="M18.5 25.2q2.8-2.2 5.5 0q2.7-2.2 5.5 0q-2.7 1.4-5.5.4q-2.8 1-5.5-.4z" fill="#f1ede4"/>' +
    '<rect x="19" y="33" width="10" height="4" fill="#b6a98f"/><rect x="14" y="37" width="20" height="3" rx="1.5" fill="#8f826a"/>', '#efe4cc');

  const vendor = svg(
    '<circle cx="24" cy="27" r="10" fill="#b98568"/>' +
    '<path d="M14 22q10-9 20 0v-2q-10-8-20 0z" fill="#2f2a3a"/><path d="M13.5 21h21" stroke="#2f2a3a" stroke-width="2.5" stroke-linecap="round"/>' +
    '<rect x="16" y="24" width="7" height="4.4" rx="1.6" fill="#1f1b26"/><rect x="25" y="24" width="7" height="4.4" rx="1.6" fill="#1f1b26"/><path d="M23 25.5h2" stroke="#1f1b26" stroke-width="1.2"/>' +
    '<path d="M21 32.5h6" stroke="#5a2c22" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M16 40q8 -4 16 0v8H16z" fill="#4b4560"/><path d="M24 38l-2 4 2 4 2-4z" fill="#d9c55a"/>', '#e2dcf0');

  const alert = svg('<path d="M24 12a8 8 0 0 0-8 8v6l-3 5h22l-3-5v-6a8 8 0 0 0-8-8z" fill="#f2b53a"/><circle cx="24" cy="34.5" r="2.8" fill="#f2b53a"/>', '#4a3b33');

  TAI.CAST = {
    maya: { name: 'Maya', role: 'CFO', svg: maya, blurb: 'Sharp, impatient, fair. Wants one number and one sentence.' },
    sam: { name: 'Sam', role: 'Growth lead', svg: sam, blurb: 'Panics first, apologises later. Owns every campaign.' },
    byte: { name: 'Byte', role: 'On-call cat', svg: byte, blurb: 'Walks across your keyboard when you’re stuck. Usually right.' },
    gus: { name: 'Old Gus', role: 'Legacy cron job', svg: gus, blurb: 'Nobody knows what he does. Everything breaks without him.' },
    vendor: { name: 'The Vendor', role: 'Data supplier', svg: vendor, blurb: 'Never late, according to the vendor. Always “investigating”.' },
    alert: { name: '#data-alerts', role: 'Monitoring', svg: alert, blurb: '' },
  };
})();
