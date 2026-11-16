/* 3 a.m. Incident: case templates 4–7.
   Same contract as cases.js: seeded build(), every number computed from the generated rows,
   self-checks that must return the intended answer. */
(function () {
  'use strict';
  const TAI = window.TAI;
  const { addDays, fmtDay, fmtShort, dow, ts, pad, round2, num, money, pct, distractors } = TAI.util;

  const AUTHORS = ['priya.s', 'tom.k', 'lena.m', 'arjun.v', 'chen.w', 'sofia.r', 'omar.h'];
  const PROVIDERS = ['Cardly', 'PayNova', 'QuickPay'];
  const dayFactor = (t, iso) => (dow(iso) === 0 || dow(iso) === 6 ? 1.1 : 1) * (0.96 + t.r() * 0.08);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => sum(a) / a.length;
  const opt = (id, text, correct, why) => ({ id, text, correct: !!correct, why: why || '' });
  const byTime = (i) => (a, b) => (a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0);
  function shiftTs(s, hours) { // 'YYYY-MM-DD HH:MM:SS' + hours, calendar-safe
    const [d, tm] = s.split(' '); const [h, m, sec] = tm.split(':').map(Number);
    let H = h + hours; let day = d;
    while (H >= 24) { H -= 24; day = addDays(day, 1); }
    while (H < 0) { H += 24; day = addDays(day, -1); }
    return ts(day, H, m, sec);
  }
  function pickProvider(t, w) { const x = t.r(); let acc = 0; for (let i = 0; i < PROVIDERS.length; i++) { acc += w[i]; if (x < acc) return PROVIDERS[i]; } return PROVIDERS[PROVIDERS.length - 1]; }
  const competitorRows = (t, D) => [[t.pick(['Brightcart', 'Zippa', 'Moxie Market']), addDays(D, -1), addDays(D, 2), t.pick(['30% off everything', 'Free delivery all week', 'Buy one get one free'])]];

  /* ============ Template 4: cents read as dollars ============ */
  const units = {
    id: 'units',
    name: 'The Hundredfold Day',
    pattern: 'Unit mismatch (cents vs dollars)',
    build(t, { D, days, co }) {
      const prev = days.slice(0, -1);
      const NEW = 'Pebble Pay';
      const pw = [0.5, 0.3, 0.2];
      const base = t.int(co.scale[0], co.scale[1]);
      const liveAt = ts(D, t.int(9, 11), t.int(0, 59), t.int(0, 59));
      const pilot = 0.04 + t.r() * 0.05; // share of checkouts routed to the new provider after go-live
      const rows = []; const byDay = {}; let pebbleN = 0;
      for (const d of days) {
        const n = Math.round(base * dayFactor(t, d));
        byDay[d] = { orders: n, trueC: 0, dash: 0 };
        for (let i = 0; i < n; i++) {
          const at = ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59));
          let prov = pickProvider(t, pw);
          if (d === D && at >= liveAt && t.r() < pilot) { prov = NEW; pebbleN++; }
          const cents = Math.round(co.mult * (1200 + t.r() * 3600));
          const amount = prov === NEW ? cents : cents / 100;
          rows.push(['', at, prov, amount, 'USD']);
          byDay[d].trueC += cents; byDay[d].dash += amount;
        }
      }
      rows.sort(byTime(1)); rows.forEach((r, i) => { r[0] = 'pay_' + (800000 + i); });
      const daily = days.map((d) => [d, byDay[d].orders, round2(byDay[d].dash)]);
      const trueRev = round2(byDay[D].trueC / 100); const dashRev = round2(byDay[D].dash);
      const avgPrev = round2(mean(prev.map((d) => byDay[d].dash)));
      const up = dashRev / avgPrev - 1;
      const pebbleRev = round2(sum(rows.filter((r) => r[2] === NEW).map((r) => r[3])));
      const times = (dashRev / avgPrev).toFixed(1) + '×';

      const sample = (prov) => { const r = rows.find((x) => x[2] === prov && x[1].slice(0, 10) === D); if (!r) return [prov, '', '{}']; return [prov, r[1], JSON.stringify({ id: r[0], amount: r[3], currency: prov === NEW ? 'usd' : 'USD', status: 'paid' })]; };
      const hooks = PROVIDERS.concat([NEW]).map(sample);
      const integrations = [
        [NEW, liveAt, 'payments-team', `Pilot: about ${Math.round(pilot * 100)}% of checkouts. Webhook mapped with the existing parser.`],
        ['Cardly', addDays(D, -t.int(500, 900)), 'payments-team', 'Main card provider'],
        ['PayNova', addDays(D, -t.int(300, 480)), 'payments-team', 'Wallets'],
        ['QuickPay', addDays(D, -t.int(120, 280)), 'payments-team', 'Pay later'],
      ];
      const creator = t.pick(['@cosyfinds', '@dailydeals.jo', '@thrifty.tom', '@homewithana']);
      const mentions = days.map((d) => [d, d === D ? t.int(380, 900) : t.int(20, 60), d === D ? `${creator} posted about ${co.name}` : '']);
      const sessions = days.map((d) => [d, Math.round(byDay[d].orders * (15 + t.r() * 3))]);

      const tables = [
        { name: 'payments', cols: [['payment_id', 'TEXT'], ['received_at', 'TEXT'], ['provider', 'TEXT'], ['amount', 'REAL'], ['currency', 'TEXT']], rows },
        { name: 'daily_revenue', cols: [['day', 'TEXT'], ['orders', 'INTEGER'], ['revenue', 'REAL']], rows: daily },
        { name: 'raw_webhooks', cols: [['provider', 'TEXT'], ['received_at', 'TEXT'], ['payload', 'TEXT']], rows: hooks },
        { name: 'integrations', cols: [['provider', 'TEXT'], ['live_since', 'TEXT'], ['owner', 'TEXT'], ['notes', 'TEXT']], rows: integrations },
        { name: 'social_mentions', cols: [['day', 'TEXT'], ['mentions', 'INTEGER'], ['note', 'TEXT']], rows: mentions },
        { name: 'site_sessions', cols: [['day', 'TEXT'], ['sessions', 'INTEGER']], rows: sessions },
      ];
      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders and revenue per day', sql: `SELECT day, orders, revenue\nFROM daily_revenue\nORDER BY day;`,
          voice: { who: 'gus', text: 'I add up the amounts. All of them. I don’t ask what they mean.' } },
        { id: 'aov', kind: 'Raw data', key: true, title: `Average payment by provider, ${Df}`, sql: `SELECT provider, COUNT(*) AS payments,\n  ROUND(AVG(amount), 2) AS avg_amount\nFROM payments\nWHERE DATE(received_at) = '${D}'\nGROUP BY provider\nORDER BY avg_amount DESC;` },
        { id: 'big', kind: 'Raw data', key: true, title: `Biggest payments on ${Df}`, sql: `SELECT payment_id, provider, amount\nFROM payments\nWHERE DATE(received_at) = '${D}'\nORDER BY amount DESC\nLIMIT 5;` },
        { id: 'hooks', kind: 'Raw data', key: true, title: 'One raw webhook from each provider', sql: `SELECT provider, payload\nFROM raw_webhooks\nORDER BY provider;` },
        { id: 'integrations', kind: 'Logs', key: true, title: 'Payment integrations', sql: `SELECT provider, live_since, notes\nFROM integrations\nORDER BY live_since DESC;`,
          voice: { who: 'vendor', text: `${NEW} is fully compliant with industry standards. Amounts are in the smallest currency unit, as clearly documented on page 47.` } },
        { id: 'mentions', kind: 'Context', title: 'Social media mentions', sql: `SELECT day, mentions, note\nFROM social_mentions\nORDER BY day;`,
          voice: { who: 'sam', text: `${creator} posted about us and we went VIRAL bestie. this is the creator economy working 📈` } },
        { id: 'sessions', kind: 'Context', title: 'Website and app sessions per day', sql: `SELECT day, sessions\nFROM site_sessions\nORDER BY day;` },
      ];
      const cause = [
        opt('units', `The new ${NEW} integration sends amounts in cents, and the pipeline read them as dollars, so those payments counted 100 times over.`, true),
        opt('viral', `${creator}’s post went viral and brought in a real wave of big-spending customers.`, false, `Order and session counts on ${Df} are normal. Revenue jumped without more customers: something inflated a few payments.`),
        opt('b2b', 'A handful of very large business orders came in on the same day.', false, `Every giant payment is from ${NEW}, and each looks like a normal basket with the decimal point missing: 4599 instead of 45.99.`),
        opt('basket', 'The new checkout made people buy more per order, so basket sizes went up.', false, `Average payments for ${PROVIDERS.join(', ')} are unchanged. Only ${NEW}’s payments are huge.`),
      ];
      const wrongN = distractors(trueRev, [
        { v: dashRev, why: 'That’s the dashboard’s number, with the cents still counted as dollars.' },
        { v: dashRev - pebbleRev, why: `That throws ${NEW}’s payments away. They were real sales; they just need dividing by 100.` },
        { v: avgPrev, why: 'That’s a normal day’s average, not what happened on ' + Df + '.' },
      ], 3);
      const numberQ = [opt('n_true', money(trueRev), true)].concat(wrongN.map((w, i) => opt('n_' + i, money(w.v), false, w.why)));
      return {
        valid: up >= 0.15 && pebbleN >= 5,
        teaser: `${co.name}’s revenue was ${times} a normal day yesterday. Orders weren’t.`,
        reporter: 'sam',
        intro: [
          { who: 'alert', text: `daily_revenue for ${Df}: ${money(dashRev)} (+${pct(up)} vs 7-day average). Orders: ${num(byDay[D].orders)}, normal. All jobs: SUCCESS.` },
          { who: 'sam', text: `REVENUE ${times}?? ${creator} posted about us yesterday. i’m literally shaking rn 🚀` },
          { who: 'maya', text: `Same number of orders, ${times} the money. Before I say this out loud to anyone: what happened? One number, one sentence.` },
        ],
        tables, cards,
        chain: ['aov', 'big', 'hooks', 'integrations'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `What was ${co.name}’s real revenue on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: `So a pilot with a few dozen payments nearly became our best quarter. Divide ${NEW} by 100, and nothing goes live without a test payment next time. Thank you.` },
        lesson: {
          name: 'Unit mismatch',
          what: 'Two systems agreed on the field name (amount) but not its unit. One sent cents, the other expected dollars. Nothing failed; the number was just 100 times too big.',
          spot: ['Compare averages per source: one source 100× (or 1000×) the others is a unit bug.', 'Look at raw payloads, not just the column name.', 'Revenue moving while order counts don’t is a classic sign.'],
          prevent: ['Name units in the schema (amount_cents, amount_usd).', 'Send one known test payment through every new integration and check the result.', 'Alert when a source’s average value jumps far outside its usual range.'],
          seen: 'Prices stored in cents in one service and dollars in another. Durations in seconds vs milliseconds. Weights in grams vs kilograms. Currencies with no decimal places (like yen) treated like dollars.',
        },
        truth: { answer: money(trueRev), trueRev, dashRev, pebbleN, up },
        answerQ: { value: trueRev, money: true, blank: NEW, what: `the real revenue on ${Df}`, sql: `SELECT ROUND(SUM(CASE WHEN provider = '${NEW}'\n  THEN amount / 100.0 ELSE amount END), 2) AS real_revenue\nFROM payments\nWHERE DATE(received_at) = '${D}';` },
        checks: [
          { label: 'true revenue = Pebble / 100 + others', sql: `SELECT ROUND(SUM(CASE WHEN provider = '${NEW}' THEN amount / 100.0 ELSE amount END), 2) FROM payments WHERE DATE(received_at) = '${D}'`, test: (v) => Math.abs(v[0][0] - trueRev) < 0.011 },
          { label: 'dashboard equals raw sum', sql: `SELECT revenue, (SELECT ROUND(SUM(amount), 2) FROM payments WHERE DATE(received_at) = '${D}') FROM daily_revenue WHERE day = '${D}'`, test: (v) => Math.abs(v[0][0] - dashRev) < 0.011 && Math.abs(v[0][1] - dashRev) < 0.011 },
          { label: 'Pebble only on D, after go-live', sql: `SELECT MIN(received_at), COUNT(DISTINCT DATE(received_at)) FROM payments WHERE provider = '${NEW}'`, test: (v) => v[0][0] >= liveAt && v[0][1] === 1 },
          { label: 'Pebble average is far above the others', sql: `SELECT (SELECT AVG(amount) FROM payments WHERE provider = '${NEW}') / (SELECT AVG(amount) FROM payments WHERE provider <> '${NEW}')`, test: (v) => v[0][0] > 50 },
          { label: 'order count is normal', sql: 'SELECT 1', test: () => Math.abs(byDay[D].orders / mean(prev.map((d) => byDay[d].orders)) - 1) < 0.15 },
        ],
      };
    },
  };

  /* ============ Template 5: a new status value, silently filtered ============ */
  const status = {
    id: 'status',
    name: 'The Quiet Rename',
    pattern: 'New status value filtered out',
    build(t, { D, days, co }) {
      const prev = days.slice(0, -1);
      const P = t.pick(PROVIDERS);
      const share = 0.32 + t.r() * 0.14;
      const rest = PROVIDERS.filter((p) => p !== P);
      const w = PROVIDERS.map((p) => (p === P ? share : (1 - share) / 2));
      const changeAt = ts(D, t.int(0, 2), t.int(0, 59), t.int(0, 59));
      const base = t.int(co.scale[0], co.scale[1]);
      const rows = []; const by = {};
      for (const d of days) {
        const n = Math.round(base * dayFactor(t, d));
        by[d] = { orders: 0, rev: 0, all: 0, allRev: 0, trueN: 0, trueRev: 0 };
        for (let i = 0; i < n; i++) {
          const at = ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59));
          const prov = pickProvider(t, w);
          const x = t.r();
          let st = x < 0.03 ? 'refunded' : x < 0.05 ? 'cancelled' : 'paid';
          if (st === 'paid' && prov === P && at >= changeAt) st = 'succeeded';
          const amount = round2(co.mult * (12 + t.r() * 36));
          rows.push(['', at, prov, st, amount]);
          by[d].all++; by[d].allRev += amount;
          if (st === 'paid') { by[d].orders++; by[d].rev += amount; }
          if (st === 'paid' || st === 'succeeded') { by[d].trueN++; by[d].trueRev += amount; }
        }
      }
      rows.sort(byTime(1)); rows.forEach((r, i) => { r[0] = co.prefix + '-' + (600000 + i); });
      const daily = days.map((d) => [d, by[d].orders, round2(by[d].rev)]);
      const trueRev = round2(by[D].trueRev); const dashRev = round2(by[D].rev);
      const avgPrev = round2(mean(prev.map((d) => by[d].rev)));
      const drop = 1 - dashRev / avgPrev;

      const rival = competitorRows(t, D);
      const incidentAt = ts(D, t.int(13, 16), t.int(0, 40), 0);
      const incidents = [[incidentAt, shiftTs(incidentAt, 0).slice(0, 14) + pad(Number(incidentAt.slice(14, 16)) + t.int(6, 12)) + ':00', 'checkout', 'Elevated latency on checkout. Resolved.'],
        [ts(addDays(D, -4), 3, 10, 0), ts(addDays(D, -4), 3, 40, 0), 'search', 'Search index rebuild. No customer impact.']];
      const changelog = [
        [P, D, `API version ${D.slice(0, 7)}: the payment status “paid” is now reported as “succeeded”. Please update your integrations.`],
        [rest[0], addDays(D, -9), 'New optional field: fraud_score.'],
        [rest[1], addDays(D, -20), 'Webhook retries now back off for up to 24 hours.'],
      ];
      const model = [['daily_revenue', addDays(D, -t.int(150, 400)), `SELECT DATE(created_at) AS day,\n  COUNT(*) AS orders, SUM(amount) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY 1`]];

      const tables = [
        { name: 'orders', cols: [['order_id', 'TEXT'], ['created_at', 'TEXT'], ['provider', 'TEXT'], ['status', 'TEXT'], ['amount', 'REAL']], rows },
        { name: 'daily_revenue', cols: [['day', 'TEXT'], ['orders', 'INTEGER'], ['revenue', 'REAL']], rows: daily },
        { name: 'model_sql', cols: [['model', 'TEXT'], ['last_changed', 'TEXT'], ['sql', 'TEXT']], rows: model },
        { name: 'provider_changelog', cols: [['provider', 'TEXT'], ['effective', 'TEXT'], ['note', 'TEXT']], rows: changelog },
        { name: 'status_incidents', cols: [['started_at', 'TEXT'], ['ended_at', 'TEXT'], ['service', 'TEXT'], ['summary', 'TEXT']], rows: incidents },
        { name: 'competitor_promos', cols: [['competitor', 'TEXT'], ['starts', 'TEXT'], ['ends', 'TEXT'], ['offer', 'TEXT']], rows: rival },
      ];
      const Df = fmtDay(D); const Pf = fmtShort(addDays(D, -1)); const Ds = fmtShort(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders and revenue per day', sql: `SELECT day, orders, revenue\nFROM daily_revenue\nORDER BY day;` },
        { id: 'status_days', kind: 'Raw data', key: true, title: `Orders by status, ${Pf} vs ${Ds}`, sql: `SELECT status,\n  SUM(DATE(created_at) = '${addDays(D, -1)}') AS "${Pf}",\n  SUM(DATE(created_at) = '${D}') AS "${Ds}"\nFROM orders\nWHERE DATE(created_at) >= '${addDays(D, -1)}'\nGROUP BY status\nORDER BY 2 DESC;` },
        { id: 'status_prov', kind: 'Raw data', key: true, title: `Statuses by payment provider, ${Df}`, sql: `SELECT provider, status, COUNT(*) AS orders\nFROM orders\nWHERE DATE(created_at) = '${D}'\nGROUP BY provider, status\nORDER BY provider, orders DESC;` },
        { id: 'model', kind: 'Model', key: true, title: 'The SQL behind the dashboard', sql: `SELECT model, last_changed, sql\nFROM model_sql;`,
          voice: { who: 'gus', text: 'Paid means paid. That’s been the rule since before you were hired.' } },
        { id: 'changelog', kind: 'Logs', key: true, title: 'Payment provider changelogs', sql: `SELECT provider, effective, note\nFROM provider_changelog\nORDER BY effective DESC;`,
          voice: { who: 'vendor', text: 'This change was announced in our developer newsletter. You are subscribed to our developer newsletter, right?' } },
        { id: 'incidents', kind: 'Context', title: 'Status page incidents', sql: `SELECT started_at, ended_at, service, summary\nFROM status_incidents\nORDER BY started_at DESC;` },
        { id: 'rival', kind: 'Context', title: 'Competitor promotions', sql: `SELECT competitor, starts, ends, offer\nFROM competitor_promos;`,
          voice: { who: 'sam', text: `${rival[0][0]} is doing ${rival[0][3].toLowerCase()}. they’re stealing our customers. i need a counter-campaign by noon` } },
      ];
      const cause = [
        opt('status', `${P} started reporting payments as “succeeded” instead of “paid”, and the dashboard only counts “paid”, so those orders vanished from it.`, true),
        opt('rival', `${rival[0][0]}’s sale pulled customers away, so fewer people bought from ${co.name}.`, false, `The orders table holds as many orders on ${Df} as on a normal day. Customers didn’t leave; the dashboard stopped counting some of them.`),
        opt('incident', `The checkout incident on ${Df} blocked payments for part of the day, so orders were lost.`, false, `It lasted a few minutes, and orders kept arriving all day. The missing orders are spread across the whole day.`),
        opt('refunds', 'A wave of refunds and cancellations wiped out a chunk of the day’s sales.', false, 'Refunds and cancellations are at their usual few percent. A new status appeared instead.'),
      ];
      const wrongN = distractors(trueRev, [
        { v: dashRev, why: 'That’s the dashboard’s number: it still only counts “paid”.' },
        { v: round2(by[D].allRev), why: 'That includes refunded and cancelled orders. Money that went back isn’t revenue.' },
        { v: avgPrev, why: 'That’s a normal day’s average, not what happened on ' + Df + '.' },
      ], 3);
      const numberQ = [opt('n_true', money(trueRev), true)].concat(wrongN.map((w, i) => opt('n_' + i, money(w.v), false, w.why)));
      return {
        valid: drop >= 0.15,
        teaser: `${co.name}’s revenue fell ${pct(drop)} yesterday. Sam blames a competitor.`,
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_revenue for ${Df}: ${money(dashRev)} (−${pct(drop)} vs 7-day average). All jobs: SUCCESS.` },
          { who: 'maya', text: `Revenue down ${pct(drop)} yesterday. Sam wants an emergency discount to fight ${rival[0][0]}. I’m not spending a cent until I know what happened. One number, one sentence.` },
          { who: 'sam', text: `they literally launched ${rival[0][3].toLowerCase()} the day before. it’s giving sabotage` },
        ],
        tables, cards,
        chain: ['status_days', 'status_prov', 'model', 'changelog'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `What was ${co.name}’s real revenue on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: `So no emergency discount. We stopped counting a word, not customers. Count “succeeded” as paid and re-run the day. Thank you.` },
        lesson: {
          name: 'A new value nobody expected',
          what: 'The model filtered on a fixed list of values. A provider added a new one, and every row with it silently fell out. No error, no failed job.',
          spot: ['Compare the distinct values of status-like columns day by day.', 'Read the WHERE clause of the model behind a number.', 'Check provider changelogs when one provider’s numbers move.'],
          prevent: ['Test that a column only holds accepted values (dbt’s accepted_values) and fail loudly on a new one.', 'Map external statuses to your own small set in one place.', 'Alert when a day’s rows-in and rows-counted drift apart.'],
          seen: 'A payment status renamed in a new API version. A country code changing from “UK” to “GB”. A new product type that the revenue model never heard of.',
        },
        truth: { answer: money(trueRev), trueRev, dashRev, P, drop },
        answerQ: { value: trueRev, money: true, blank: 'succeeded', what: `the real revenue on ${Df}`, sql: `SELECT ROUND(SUM(amount), 2) AS real_revenue\nFROM orders\nWHERE DATE(created_at) = '${D}'\n  AND status IN ('paid', 'succeeded');` },
        checks: [
          { label: 'true revenue = paid + succeeded', sql: `SELECT ROUND(SUM(amount), 2) FROM orders WHERE DATE(created_at) = '${D}' AND status IN ('paid', 'succeeded')`, test: (v) => Math.abs(v[0][0] - trueRev) < 0.011 },
          { label: 'dashboard = paid only', sql: `SELECT revenue FROM daily_revenue WHERE day = '${D}'`, test: (v) => Math.abs(v[0][0] - dashRev) < 0.011 },
          { label: 'succeeded only from P, only on D', sql: `SELECT COUNT(DISTINCT provider), MIN(DATE(created_at)), MAX(DATE(created_at)) FROM orders WHERE status = 'succeeded'`, test: (v) => v[0][0] === 1 && v[0][1] === D && v[0][2] === D },
          { label: 'no paid rows from P after the change', sql: `SELECT COUNT(*) FROM orders WHERE provider = '${P}' AND status = 'paid' AND created_at >= '${changeAt}'`, test: (v) => v[0][0] === 0 },
        ],
      };
    },
  };

  /* ============ Template 6: timestamps switched to UTC ============ */
  const W = [1, 0.6, 0.4, 0.3, 0.3, 0.5, 1.2, 2, 2.6, 3, 3.2, 3.4, 3.8, 3.5, 3.2, 3.1, 3.2, 3.6, 4, 4.4, 4.6, 4.2, 3, 1.8];
  const WS = sum(W);
  function hourOf(t, maxHour) { const tot = sum(W.slice(0, maxHour)); let x = t.r() * tot; for (let h = 0; h < maxHour; h++) { x -= W[h]; if (x <= 0) return h; } return maxHour - 1; }
  const tz = {
    id: 'tz',
    name: 'Who Orders at 3 a.m.?',
    pattern: 'Timezone mix-up',
    build(t, { D, days, co }) {
      const prev = days.slice(0, -1);
      const OFF = 5; // the company runs on UTC−5
      const deployAt = ts(D, t.int(6, 10), t.int(0, 59), t.int(0, 59));
      const base = t.int(co.scale[0], co.scale[1]);
      const rows = []; const trueBy = {};
      const D1 = addDays(D, 1);
      for (const d of days.concat([D1])) {
        const partial = d === D1; // only the first two hours of today exist when the job runs at 02:00
        const n = partial ? Math.round(base * (W[0] + W[1]) / WS) : Math.round(base * dayFactor(t, d));
        for (let i = 0; i < n; i++) {
          const local = ts(d, hourOf(t, partial ? 2 : 24), t.int(0, 59), t.int(0, 59));
          const v2 = local >= deployAt;
          rows.push(['', v2 ? shiftTs(local, OFF) : local, v2 ? 'v2' : 'v1', local]);
          trueBy[d] = (trueBy[d] || 0) + 1;
        }
      }
      rows.sort(byTime(1)); rows.forEach((r, i) => { r[0] = co.prefix + '-' + (700000 + i); });
      const stored = {}; for (const r of rows) { const d = r[1].slice(0, 10); stored[d] = (stored[d] || 0) + 1; }
      const daily = days.map((d) => [d, stored[d] || 0]);
      const trueD = trueBy[D]; const dashD = stored[D] || 0;
      const avgPrev = Math.round(mean(prev.map((d) => stored[d])));
      const drop = 1 - dashD / avgPrev;
      const night = (d) => rows.filter((r) => r[1].slice(0, 10) === d && r[1].slice(11, 13) < '06').length;
      const nightD1 = night(D1); const nightAvg = mean(prev.map(night));

      const deploys = [
        [deployAt, 'ingest-api', t.pick(AUTHORS), 'Switch to ingest service v2: new event library, timestamps standardised to UTC'],
        [ts(addDays(D, -2), t.int(10, 16), t.int(0, 59), 0), 'web-shop', t.pick(AUTHORS), 'New product photos on the home page'],
        [ts(addDays(D, -4), t.int(10, 16), t.int(0, 59), 0), 'dbt-models', t.pick(AUTHORS), 'Add descriptions to the orders model'],
      ];
      const weather = days.slice(-3).map((d) => [d, d === D ? 'Heavy rain from 18:00, flood warnings' : t.pick(['Sunny', 'Cloudy', 'Light showers'])]);
      const rival = competitorRows(t, D);
      const tables = [
        { name: 'orders', cols: [['order_id', 'TEXT'], ['created_at', 'TEXT'], ['ingest_version', 'TEXT']], rows: rows.map((r) => r.slice(0, 3)) },
        { name: 'daily_orders', cols: [['day', 'TEXT'], ['orders', 'INTEGER']], rows: daily },
        { name: 'deploys', cols: [['deployed_at', 'TEXT'], ['service', 'TEXT'], ['author', 'TEXT'], ['description', 'TEXT']], rows: deploys },
        { name: 'weather', cols: [['day', 'TEXT'], ['forecast', 'TEXT']], rows: weather },
        { name: 'competitor_promos', cols: [['competitor', 'TEXT'], ['starts', 'TEXT'], ['ends', 'TEXT'], ['offer', 'TEXT']], rows: rival },
      ];
      const Df = fmtDay(D); const D1f = fmtDay(D1);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders per day', sql: `SELECT day, orders\nFROM daily_orders\nORDER BY day;`,
          voice: { who: 'gus', text: 'I count orders by the date on them. If the date is wrong, take it up with whoever wrote it.' } },
        { id: 'hourly', kind: 'Raw data', key: true, title: `Orders per hour, ${Df} afternoon to ${D1f} morning`, sql: `SELECT DATE(created_at) AS day,\n  strftime('%H:00', created_at) AS hour,\n  COUNT(*) AS orders\nFROM orders\nWHERE created_at >= '${D} 15:00:00'\nGROUP BY 1, 2\nORDER BY 1, 2;` },
        { id: 'night', kind: 'Raw data', key: true, title: 'Orders stamped between midnight and 6 a.m., by day', sql: `SELECT DATE(created_at) AS day, COUNT(*) AS night_orders\nFROM orders\nWHERE strftime('%H', created_at) < '06'\nGROUP BY 1\nORDER BY 1;` },
        { id: 'versions', kind: 'Logs', key: true, title: 'Which ingest version wrote the orders?', sql: `SELECT ingest_version,\n  MIN(created_at) AS first_order,\n  MAX(created_at) AS last_order,\n  COUNT(*) AS orders\nFROM orders\nGROUP BY 1;` },
        { id: 'deploys', kind: 'Logs', key: true, title: 'Deploys this week', sql: `SELECT deployed_at, service, author, description\nFROM deploys\nORDER BY deployed_at;` },
        { id: 'weather', kind: 'Context', title: 'Weather, last three days', sql: `SELECT day, forecast\nFROM weather\nORDER BY day;`,
          voice: { who: 'sam', text: 'it was literally POURING last night. nobody orders anything in that weather, right? …right?' } },
        { id: 'rival', kind: 'Context', title: 'Competitor promotions', sql: `SELECT competitor, starts, ends, offer\nFROM competitor_promos;` },
      ];
      const cause = [
        opt('tz', `The new ingest service stamps orders in UTC, five hours ahead, so ${Df}’s evening orders were filed under ${D1f} and dropped out of ${Df}.`, true),
        opt('rain', `Heavy rain on ${Df} evening kept people from ordering.`, false, `Orders didn’t stop in the evening; they turn up stamped after midnight on ${D1f}. People don’t really order at 3 a.m. in those numbers.`),
        opt('rival', `${rival[0][0]}’s promotion pulled customers away for the day.`, false, `Count every order placed on ${Df} in local time and it’s a normal day. Nobody left.`),
        opt('bots', `Bots flooded the site with fake orders after midnight, and the fraud filter threw ${Df}’s real orders out.`, false, 'Those after-midnight orders are real customers ordering in the evening. Their times are five hours off, and nothing was thrown out.'),
      ];
      const wrongN = distractors(trueD, [
        { v: dashD, why: 'That’s the dashboard’s number, missing the evening orders.' },
        { v: avgPrev, why: 'That’s a normal day’s average, not what happened on ' + Df + '.' },
        { v: dashD + (stored[D1] || 0), why: `That also counts orders placed after midnight on ${D1f}.` },
      ], 3);
      const numberQ = [opt('n_true', num(trueD), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));
      return {
        valid: drop >= 0.15 && nightD1 > nightAvg * 4,
        teaser: `${co.name} lost ${pct(drop)} of its orders yesterday, and somebody ordered a lot at 3 a.m.`,
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_orders for ${Df}: ${num(dashD)} (−${pct(drop)} vs 7-day average). Also: unusual order volume between 00:00 and 05:00. All jobs: SUCCESS.` },
          { who: 'maya', text: `Orders down ${pct(drop)} yesterday, and apparently half the city went shopping at 3 a.m. Those can’t both be real. What happened? One number, one sentence.` },
          { who: 'sam', text: 'ok the 3am thing is lowkey creepy. are we being hacked' },
        ],
        tables, cards,
        chain: ['hourly', 'night', 'versions', 'deploys'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `How many orders did ${co.name} really take on ${Df} (local time)?`, options: numberQ },
        ],
        closing: { who: 'maya', text: 'So the city slept fine and our clock jumped five hours. Store UTC, report in local time, and re-run the day. Thank you.' },
        lesson: {
          name: 'Timezone mix-up',
          what: 'Old rows were in local time, new rows in UTC, in the same column, with nothing to tell them apart. Grouping by date put every evening order on the next day.',
          spot: ['Plot orders by hour: real customers don’t peak at 3 a.m.', 'Check when a deploy changed how timestamps are written.', 'A drop on one day and a bump on the next often cancel out: look at both.'],
          prevent: ['Store timestamps in UTC with the offset (timestamptz), never as bare local times.', 'Convert to the business timezone in one place, at reporting time.', 'Test that hour-of-day patterns stay realistic after any ingestion change.'],
          seen: 'Daylight-saving weeks with 23 or 25 hours. A server moved to a new region. A mobile app sending phone time instead of server time. A report that splits a week at UTC midnight for a team in India.',
        },
        truth: { answer: num(trueD), trueD, dashD, drop, nightD1 },
        answerQ: { value: trueD, money: false, blank: '-5 hours', what: `the real number of orders on ${Df}, local time`, sql: `SELECT COUNT(*) AS real_orders\nFROM orders\nWHERE DATE(CASE WHEN ingest_version = 'v2'\n  THEN DATETIME(created_at, '-5 hours')\n  ELSE created_at END) = '${D}';` },
        checks: [
          { label: 'true local count for D', sql: `SELECT COUNT(*) FROM orders WHERE (ingest_version = 'v1' AND DATE(created_at) = '${D}') OR (ingest_version = 'v2' AND DATE(created_at, '-${OFF} hours') = '${D}')`, test: (v) => v[0][0] === trueD },
          { label: 'dashboard for D equals stored date D', sql: `SELECT orders, (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = '${D}') FROM daily_orders WHERE day = '${D}'`, test: (v) => v[0][0] === dashD && v[0][1] === dashD },
          { label: 'v2 starts at the deploy (in UTC)', sql: `SELECT MIN(created_at) FROM orders WHERE ingest_version = 'v2'`, test: (v) => v[0][0] >= shiftTs(deployAt, OFF) },
          { label: 'no v2 before D, no v1 after the deploy', sql: `SELECT COUNT(*) FROM orders WHERE (ingest_version = 'v2' AND created_at < '${D}') OR (ingest_version = 'v1' AND created_at >= '${deployAt}')`, test: (v) => v[0][0] === 0 },
          { label: 'card results fit (hourly <= 20 rows)', sql: `SELECT COUNT(*) FROM (SELECT DATE(created_at), strftime('%H', created_at) FROM orders WHERE created_at >= '${D} 15:00:00' GROUP BY 1, 2)`, test: (v) => v[0][0] <= 20 },
        ],
      };
    },
  };

  /* ============ Template 7: a backfill that rewrote history ============ */
  const backfill = {
    id: 'backfill',
    name: 'The Rewritten Week',
    pattern: 'Backfill gone wrong',
    build(t, { D, days, co }) {
      const channels = ['web', 'ios', 'android'];
      const appShare = 0.4 + t.r() * 0.15;
      const share = { web: 1 - appShare, ios: appShare * (0.45 + t.r() * 0.1) }; share.android = appShare - share.ios;
      const base = t.int(co.scale[0], co.scale[1]);
      const cnt = {}; const rows = [];
      for (const d of days) {
        cnt[d] = {}; const f = dayFactor(t, d);
        for (const ch of channels) {
          const n = Math.max(5, Math.round(base * f * share[ch] * (0.95 + t.r() * 0.1))); cnt[d][ch] = n;
          for (let i = 0; i < n; i++) rows.push(['', ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59)), ch]);
        }
      }
      rows.sort(byTime(1)); rows.forEach((r, i) => { r[0] = co.prefix + '-' + (900000 + i); });
      const start = t.int(0, 3); const R = days.slice(start, start + 3); // the three rewritten days
      const runAt = ts(D, t.int(14, 17), t.int(0, 59), t.int(0, 59));
      const tot = (d) => cnt[d].web + cnt[d].ios + cnt[d].android;
      const daily = days.map((d) => R.indexOf(d) >= 0 ? [d, cnt[d].web, runAt] : [d, tot(d), ts(addDays(d, 1), 2, t.int(1, 4), t.int(0, 59))]);
      const missing = sum(R.map((d) => cnt[d].ios + cnt[d].android));
      const mid = R[1];
      const user = t.pick(AUTHORS);
      const ticket = 'DATA-' + t.int(300, 990);
      const runs = [
        [ts(addDays(D, -12), 11, t.int(0, 59), 0), t.pick(AUTHORS), `${addDays(D, -20)}..${addDays(D, -18)}`, '(none)', 'SUCCESS', t.int(1500, 4000)],
        [runAt, user, `${R[0]}..${R[2]}`, `channel = 'web'  -- testing ${ticket}`, 'SUCCESS', sum(R.map((d) => cnt[d].web))],
      ];
      const deletions = days.slice(-4).map((d) => [d, t.int(1, 4), t.int(0, 6)]);
      const deploys = [[ts(addDays(D, -1), t.int(10, 16), t.int(0, 59), 0), 'dashboard-ui', t.pick(AUTHORS), 'New chart colours and a dark mode'],
        [ts(addDays(D, -3), t.int(10, 16), t.int(0, 59), 0), 'ios-app', t.pick(AUTHORS), 'Release 5.' + t.int(1, 9) + ': faster checkout']];
      const tables = [
        { name: 'orders', cols: [['order_id', 'TEXT'], ['created_at', 'TEXT'], ['channel', 'TEXT']], rows },
        { name: 'daily_orders', cols: [['day', 'TEXT'], ['orders', 'INTEGER'], ['updated_at', 'TEXT']], rows: daily },
        { name: 'backfill_runs', cols: [['started_at', 'TEXT'], ['run_by', 'TEXT'], ['days', 'TEXT'], ['filter', 'TEXT'], ['status', 'TEXT'], ['rows_written', 'INTEGER']], rows: runs },
        { name: 'privacy_deletions', cols: [['day', 'TEXT'], ['requests', 'INTEGER'], ['orders_deleted', 'INTEGER']], rows: deletions },
        { name: 'deploys', cols: [['deployed_at', 'TEXT'], ['service', 'TEXT'], ['author', 'TEXT'], ['description', 'TEXT']], rows: deploys },
      ];
      const Rf = `${fmtShort(R[0])}–${fmtShort(R[2])}`; const midF = fmtDay(mid);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders per day, and when each row was last written', sql: `SELECT day, orders, updated_at\nFROM daily_orders\nORDER BY day;` },
        { id: 'raw_vs', kind: 'Raw data', key: true, title: 'Raw orders vs the dashboard, day by day', sql: `SELECT d.day, r.raw_orders, d.orders AS dashboard\nFROM daily_orders d\nJOIN (SELECT DATE(created_at) AS day, COUNT(*) AS raw_orders\n      FROM orders GROUP BY 1) r USING (day)\nORDER BY d.day;` },
        { id: 'channels', kind: 'Raw data', key: true, title: `Raw orders by channel, ${midF}`, sql: `SELECT channel, COUNT(*) AS orders\nFROM orders\nWHERE DATE(created_at) = '${mid}'\nGROUP BY channel\nORDER BY orders DESC;` },
        { id: 'backfill', kind: 'Logs', key: true, title: 'Backfill runs', sql: `SELECT started_at, run_by, days, filter, rows_written\nFROM backfill_runs\nORDER BY started_at DESC;`,
          voice: { who: 'gus', text: 'Someone ran me by hand yesterday afternoon. I did exactly what I was told. I always do.' } },
        { id: 'deletions', kind: 'Context', title: 'Privacy deletion requests processed', sql: `SELECT day, requests, orders_deleted\nFROM privacy_deletions\nORDER BY day;` },
        { id: 'deploys', kind: 'Context', title: 'Deploys this week', sql: `SELECT deployed_at, service, author, description\nFROM deploys\nORDER BY deployed_at;`,
          voice: { who: 'sam', text: 'the dashboard has dark mode now?? ok that’s actually a slay' } },
      ];
      const cause = [
        opt('backfill', `A backfill yesterday rewrote ${Rf} with a test filter (web orders only) left in, so those days lost their app orders.`, true),
        opt('dedupe', 'The old numbers were double counted, and a fix brought them down to the truth.', false, `The raw orders table has every app order once. Nothing was double counted; app orders were dropped from three days.`),
        opt('privacy', 'Privacy deletion requests removed those customers’ orders.', false, 'Deletions removed a handful of orders this week. The gap is in the thousands.'),
        opt('ui', 'The dashboard redesign broke the chart, so it shows the wrong values.', false, 'The table under the chart changed: its updated_at shows those rows were rewritten yesterday.'),
      ];
      const wrongN = distractors(missing, [
        { v: cnt[mid].ios + cnt[mid].android, why: `That’s only what ${midF} lost. Three days were rewritten.` },
        { v: sum(R.map(tot)), why: 'That’s every order on those days, not just the missing ones.' },
        { v: sum(R.map((d) => cnt[d].web)), why: 'That’s what the dashboard shows now: the web orders it kept.' },
      ], 3, 0.06);
      const numberQ = [opt('n_true', num(missing), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));
      return {
        valid: true,
        teaser: `${co.name}’s numbers for last week changed overnight. Nobody touched them. Supposedly.`,
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_orders: 3 past days changed since yesterday (${Rf}), down ${pct(missing / sum(R.map(tot)))}. All jobs: SUCCESS.` },
          { who: 'maya', text: `My weekly report says ${midF} had ${num(tot(mid))} orders. The dashboard now says ${num(cnt[mid].web)}. The board already has my report. Which is right, and what happened? I need the total damage too.` },
          { who: 'sam', text: 'not me this time. i swear 👀' },
        ],
        tables, cards,
        chain: ['raw_vs', 'channels', 'backfill', 'dash'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `How many orders are missing from the dashboard across ${Rf}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: 'So my report was right and the dashboard was rewritten. Re-run those three days without the filter, and no more backfills without a second pair of eyes. Thank you.' },
        lesson: {
          name: 'Backfill gone wrong',
          what: 'A manual re-run overwrote good history with partial data. It reported SUCCESS because it did exactly what it was told, including a filter left over from testing.',
          spot: ['Check updated_at: history that changed recently was rewritten by something.', 'Compare rewritten days with the raw source, segment by segment.', 'Read the parameters of every manual run, not just its status.'],
          prevent: ['Backfill into a staging table, compare it with the old numbers, then swap.', 'Have a second person review backfill parameters.', 'Alert when published history changes by more than a small percentage.'],
          seen: 'A one-off fix re-run with a LIMIT still in it. A backfill pointed at a dev table. A re-run that used today’s exchange rates for last year’s revenue.',
        },
        truth: { answer: num(missing), missing, R },
        answerQ: { value: missing, money: false, blank: 'web', what: 'how many orders are missing from the dashboard', sql: `SELECT COUNT(*) AS missing_orders\nFROM orders\nWHERE DATE(created_at) BETWEEN '${R[0]}' AND '${R[2]}'\n  AND channel <> 'web';` },
        checks: [
          { label: 'missing = raw - dashboard over rewritten days', sql: `SELECT SUM(r.n - d.orders) FROM daily_orders d JOIN (SELECT DATE(created_at) AS day, COUNT(*) AS n FROM orders GROUP BY 1) r USING (day) WHERE d.day IN ('${R.join("','")}')`, test: (v) => v[0][0] === missing },
          { label: 'other days match raw', sql: `SELECT COUNT(*) FROM daily_orders d JOIN (SELECT DATE(created_at) AS day, COUNT(*) AS n FROM orders GROUP BY 1) r USING (day) WHERE d.orders <> r.n`, test: (v) => v[0][0] === 3 },
          { label: 'rewritten days = web only', sql: `SELECT SUM(d.orders = r.n) FROM daily_orders d JOIN (SELECT DATE(created_at) AS day, COUNT(*) AS n FROM orders WHERE channel = 'web' GROUP BY 1) r USING (day) WHERE d.day IN ('${R.join("','")}')`, test: (v) => v[0][0] === 3 },
          { label: 'backfill rows_written = dashboard rows it wrote', sql: `SELECT rows_written, (SELECT SUM(orders) FROM daily_orders WHERE updated_at = started_at) FROM backfill_runs WHERE filter LIKE 'channel%'`, test: (v) => v[0][0] === v[0][1] },
        ],
      };
    },
  };

  TAI.TEMPLATES.push(units, status, tz, backfill);
})();
