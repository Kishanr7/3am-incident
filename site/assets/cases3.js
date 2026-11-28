/* 3 a.m. Incident: case templates 8–11, production incidents beyond the sales dashboard.
   Same contract as cases.js: seeded build(), every number computed from the generated rows,
   self-checks that must return the intended answer. v(list) picks one line of dialogue per case. */
(function () {
  'use strict';
  const TAI = window.TAI;
  const { addDays, fmtDay, fmtShort, ts, pad, round2, num, money, pct, distractors } = TAI.util;

  const AUTHORS = ['priya.s', 'tom.k', 'lena.m', 'arjun.v', 'chen.w', 'sofia.r', 'omar.h'];
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => sum(a) / a.length;
  const opt = (id, text, correct, why) => ({ id, text, correct: !!correct, why: why || '' });
  const byTime = (i) => (a, b) => (a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0);
  const atMin = (d, min, s) => ts(addDays(d, Math.floor(min / 1440)), Math.floor((min % 1440) / 60), min % 60, s || 0);
  const minOf = (stamp) => Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16));

  /* ============ Template 8: an UPDATE without a WHERE ============ */
  const nowhere = {
    id: 'nowhere',
    name: 'The Missing WHERE',
    pattern: 'Hand-run UPDATE without a WHERE clause',
    build(t, { D, days, co, v }) {
      const prev = days.slice(0, -1);
      const NEWP = 0.99;
      const nSku = t.int(22, 40);
      const skus = []; const price = {};
      for (let i = 0; i < nSku; i++) { const s = `${co.prefix}-${110 + i * 7}`; skus.push(s); price[s] = Math.floor(Math.max(6, co.mult * (7 + t.r() * 38))) + 0.99; }
      const target = skus[t.int(0, nSku - 1)];
      const sellable = skus.filter((s) => s !== target); // the clearance item was already sold out
      const user = t.pick(AUTHORS);
      const X = ts(D, t.int(10, 13), t.int(0, 59), t.int(0, 59));
      const base = t.int(co.scale[0], co.scale[1]);
      const items = []; const byDay = {};
      for (const d of days) {
        const n = Math.round(base * (0.95 + t.r() * 0.1));
        byDay[d] = { orders: 0, rev: 0 };
        const add = (at, bargain) => {
          const sku = t.pick(sellable); const qty = bargain ? t.int(2, 6) : t.int(1, 2);
          const unit = bargain ? NEWP : price[sku];
          items.push(['', at, sku, qty, unit]); byDay[d].orders++; byDay[d].rev += qty * unit;
        };
        for (let i = 0; i < n; i++) { const at = ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59)); add(at, d === D && at >= X); }
        if (d === D) { const extra = Math.round(n * (24 - Number(X.slice(11, 13))) / 24 * (0.5 + t.r() * 0.4)); for (let i = 0; i < extra; i++) { const m = minOf(X) + 1 + t.int(0, 1439 - minOf(X) - 1); add(atMin(D, m, t.int(0, 59)), true); } }
      }
      items.sort(byTime(1)); items.forEach((r, i) => { r[0] = 'o' + (510000 + i); });
      const after = items.filter((r) => r[1] >= X);
      const loss = round2(sum(after.map((r) => r[3] * (price[r[2]] - r[4]))));
      const lossNoQty = round2(sum(after.map((r) => price[r[2]] - r[4])));
      const maxQty = Math.max(...after.map((r) => r[3]));
      const charged = round2(sum(after.map((r) => r[3] * r[4])));
      const daily = days.map((d) => [d, byDay[d].orders, round2(byDay[d].rev)]);
      const dashRev = round2(byDay[D].rev); const avgPrev = round2(mean(prev.map((d) => byDay[d].rev)));
      const avgOrders = mean(prev.map((d) => byDay[d].orders)); const ordersUp = byDay[D].orders / avgOrders - 1;
      const drop = 1 - dashRev / avgPrev;

      const products = skus.map((s) => [s, NEWP, s === target ? 0 : t.int(8, 90)]);
      const audit = [];
      for (let i = 0; i < 4; i++) { const s = t.pick(skus); audit.push([ts(addDays(D, -t.int(9, 40)), t.int(9, 17), t.int(0, 59), 0), s, round2(price[s] + 2), price[s], t.pick(AUTHORS)]); }
      for (const s of skus) audit.push([X, s, price[s], NEWP, user]);
      const ticket = 'OPS-' + t.int(2100, 4800);
      const tickets = [[ticket, ts(D, 9, t.int(0, 40), 0), `Set ${target} to ${NEWP} for clearance`, user], ['OPS-' + t.int(1000, 2000), ts(addDays(D, -2), 15, 10, 0), 'Update shipping copy on checkout', t.pick(AUTHORS)]];
      const before = minOf(X) - t.int(3, 9);
      const qlog = [
        [atMin(D, before, 12), user, `SELECT sku, price FROM products WHERE sku = '${target}';`, 1],
        [X, user, `UPDATE products SET price = ${NEWP};`, nSku],
        [atMin(D, minOf(X) + 1, 4), user, 'COMMIT;', 0],
        [atMin(D, minOf(X) + t.int(20, 50), 30), t.pick(AUTHORS), "UPDATE carts SET status = 'expired' WHERE updated_at < DATE('now', '-30 days');", t.int(40, 300)],
        [atMin(D, 7 * 60 + t.int(0, 50), 9), 'svc_reports', 'SELECT * FROM daily_sales;', 7],
      ].sort(byTime(0));
      const deploys = [[ts(D, t.int(8, 9), t.int(0, 59), 0), 'web-shop', t.pick(AUTHORS), 'New product page layout'], [ts(addDays(D, -1), 16, t.int(0, 59), 0), 'search', t.pick(AUTHORS), 'Faster search suggestions']];
      const feed = days.slice(-4).map((d) => [ts(d, 2, 0, t.int(5, 50)), t.int(0, 3), 'SUCCESS']);
      const newsletter = [[ts(D, 8, 0, 0), t.pick(['Our picks for the weekend', 'New in this week', 'Back in stock']), t.int(8, 20) * 1000]];

      const tables = [
        { name: 'products', cols: [['sku', 'TEXT'], ['price', 'REAL'], ['stock', 'INTEGER']], rows: products },
        { name: 'order_items', cols: [['order_id', 'TEXT'], ['sold_at', 'TEXT'], ['sku', 'TEXT'], ['qty', 'INTEGER'], ['unit_price', 'REAL']], rows: items },
        { name: 'daily_sales', cols: [['day', 'TEXT'], ['orders', 'INTEGER'], ['revenue', 'REAL']], rows: daily },
        { name: 'price_audit', cols: [['changed_at', 'TEXT'], ['sku', 'TEXT'], ['old_price', 'REAL'], ['new_price', 'REAL'], ['changed_by', 'TEXT']], rows: audit },
        { name: 'query_log', cols: [['ran_at', 'TEXT'], ['user_name', 'TEXT'], ['statement', 'TEXT'], ['rows_affected', 'INTEGER']], rows: qlog },
        { name: 'tickets', cols: [['ticket', 'TEXT'], ['opened_at', 'TEXT'], ['title', 'TEXT'], ['assignee', 'TEXT']], rows: tickets },
        { name: 'deploys', cols: [['deployed_at', 'TEXT'], ['service', 'TEXT'], ['author', 'TEXT'], ['note', 'TEXT']], rows: deploys },
        { name: 'price_feed_runs', cols: [['run_at', 'TEXT'], ['rows_updated', 'INTEGER'], ['status', 'TEXT']], rows: feed },
        { name: 'newsletters', cols: [['sent_at', 'TEXT'], ['subject', 'TEXT'], ['recipients', 'INTEGER']], rows: newsletter },
      ];
      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders and revenue per day', sql: 'SELECT day, orders, revenue\nFROM daily_sales\nORDER BY day;',
          voice: { who: 'gus', text: v(['Orders up, money down. I just add it up. Interpreting is above my pay grade, which is zero.', 'I report what’s in the table. The table has been through a lot today.']) } },
        { id: 'prices', kind: 'Raw data', key: true, title: 'Product prices right now', sql: 'SELECT price, COUNT(*) AS products\nFROM products\nGROUP BY price\nORDER BY products DESC;' },
        { id: 'audit', kind: 'Logs', key: true, title: 'Recent price changes', sql: 'SELECT changed_at, changed_by,\n  COUNT(*) AS products\nFROM price_audit\nGROUP BY changed_at, changed_by\nORDER BY changed_at DESC\nLIMIT 6;' },
        { id: 'qlog', kind: 'Logs', key: true, title: `Production query log, ${Df}`, sql: `SELECT ran_at, user_name, statement, rows_affected\nFROM query_log\nWHERE DATE(ran_at) = '${D}'\nORDER BY ran_at;` },
        { id: 'ticket', kind: 'Context', key: true, title: 'Ops tickets', sql: 'SELECT ticket, opened_at, title, assignee\nFROM tickets\nORDER BY opened_at DESC;',
          voice: { who: 'nia', text: v([`One clearance item. That was the whole ticket.`, 'I asked for one price. I got a closing-down sale.']) } },
        { id: 'deploys', kind: 'Logs', title: 'Deploys', sql: 'SELECT deployed_at, service, author, note\nFROM deploys\nORDER BY deployed_at DESC;',
          voice: { who: 'sam', text: v(['the new product page dropped the SAME morning. coincidence? i think not', 'new layout went live and suddenly everything costs a dollar. the design team is cooking 💀']) } },
        { id: 'feed', kind: 'Logs', title: 'Supplier price feed runs', sql: 'SELECT run_at, rows_updated, status\nFROM price_feed_runs\nORDER BY run_at DESC;',
          voice: { who: 'vendor', text: 'Our price feed delivered flawlessly, as it does every night.' } },
        { id: 'news', kind: 'Context', title: 'Newsletters sent', sql: 'SELECT sent_at, subject, recipients\nFROM newsletters;' },
      ];
      const cause = [
        opt('nowhere', `A hand-run UPDATE for one product had no WHERE clause, so all ${nSku} products were changed to ${money(NEWP)}.`, true),
        opt('deploy', `The new product page deployed that morning showed the clearance price of ${money(NEWP)} on every product.`, false, `The prices changed in the database itself: price_audit shows all ${nSku} products changed at ${X.slice(11, 16)} by ${user}, a person, not by the web-shop deploy.`),
        opt('feed', `The supplier’s nightly price feed sent a placeholder price of ${money(NEWP)} and overwrote every product.`, false, `The feed runs at 02:00 and updates at most a few rows a night. Every price changed at ${X.slice(11, 16)}, in one statement run by hand.`),
        opt('promo', `A discount rule added to checkout applied the ${money(NEWP)} clearance price to every item in every cart.`, false, `A checkout rule wouldn’t change the products table, but price_audit shows every product’s stored price changed to ${money(NEWP)} at ${X.slice(11, 16)}.`),
      ];
      const wrongN = distractors(loss, [
        { v: round2(avgPrev - dashRev), why: 'That’s the gap to a normal day. But there were extra bargain orders, and the morning was normal. Compare each item with its real price.' },
        { v: lossNoQty, why: 'That counts one unit per order line. Bargain hunters bought several of each: multiply by qty.' },
        { v: charged, why: 'That’s what customers paid after the change, not what the store lost.' },
      ], 3);
      const numberQ = [opt('n_true', money(loss), true)].concat(wrongN.map((w, i) => opt('n_' + i, money(w.v), false, w.why)));
      return {
        valid: drop > 0.1 && ordersUp > 0.12 && loss > 50,
        teaser: v([`${co.name} sold more than usual yesterday and made less money.`, `${co.name}: orders up ${pct(ordersUp)}, revenue down ${pct(drop)}. Pick one.`, `From ${X.slice(11, 16)} yesterday, every product at ${co.name} cost ${money(NEWP)}.`]),
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_sales for ${Df}: revenue ${money(dashRev)} (−${pct(drop)} vs 7-day average). Orders: ${num(byDay[D].orders)} (+${pct(ordersUp)}). All jobs: SUCCESS.` },
          { who: 'nia', text: (t.int(30, 60), v([`Support here. Since about ${pad(Math.round(minOf(X) / 60))}:00 yesterday every product on the site shows ${money(NEWP)}, and customers are buying up to ${maxQty} at a time.`, `My queue is full of “is this price real??”. For hours now every product page has said ${money(NEWP)}, and people are ordering by the armful.`])) },
          { who: 'maya', text: v([`More orders and less money. Those don’t go together. Tell me what caused it and how much it cost us, before 9.`, `I’m at the airport with bad Wi-Fi. Short version please: what caused this, and how much money did we lose?`, `Revenue down, orders up. Before the 9:00 I need two things: what caused it, and how much money it cost us.`]) },
        ],
        tables, cards,
        chain: ['prices', 'audit', 'qlog', 'ticket'],
        questions: [
          { id: 'cause', prompt: 'What caused it?', options: cause },
          { id: 'number', prompt: `How much money did the wrong prices lose on ${Df}? (What those items cost at their old prices, minus what customers paid.)`, options: numberQ },
        ],
        closing: { who: 'maya', text: v([`So one missing line turned a clearance into a closing-down sale. Restore prices from price_audit, honour the orders, and no more hand-run UPDATEs without a second pair of eyes. Thank you.`, `A ${money(loss)} typo. Restore the old prices from the audit table today, and make production changes go through a reviewed script. Thank you.`]) },
        lesson: {
          name: 'The missing WHERE',
          what: 'A quick fix run by hand in production: UPDATE products SET price = … meant for one row, without a WHERE clause. The database did exactly what it was told, to every row.',
          spot: ['A change that touches every row at the same second, by one person, in the audit log.', 'rows_affected far bigger than the ticket asked for.', 'Orders up and revenue down at the same time.'],
          prevent: ['Run the SELECT with the same WHERE first and check the count.', 'Open a transaction, check rows affected, then COMMIT.', 'Turn on safe-update mode, and keep an audit table so you can restore.'],
          seen: 'Every customer given the same email address. All stock set to zero. Every user made an admin. Usually by a senior engineer, on a Friday, in a hurry.',
        },
        truth: { answer: money(loss), loss, nSku, X, drop },
        answerQ: { value: loss, money: true, blank: X, what: `the money lost on ${Df}`, look: `You need two tables: \`order_items\` (what was sold, and at what price) and \`price_audit\` (each product’s old price). Match them on \`sku\`, and only count items sold after the bad change.`, nudge: `The ____ is a timestamp (both ____ take the same one): the moment the bad change ran. Copy it exactly from \`changed_at\` in \`price_audit\`.`, sql: `SELECT ROUND(SUM(i.qty * (a.old_price - i.unit_price)), 2) AS lost\nFROM order_items i\nJOIN price_audit a ON a.sku = i.sku\nWHERE a.changed_at = '${X}'\n  AND i.sold_at >= '${X}';` },
        checks: [
          { label: 'answer query returns the loss', sql: `SELECT ROUND(SUM(i.qty * (a.old_price - i.unit_price)), 2) FROM order_items i JOIN price_audit a ON a.sku = i.sku WHERE a.changed_at = '${X}' AND i.sold_at >= '${X}'`, test: (r) => Math.abs(r[0][0] - loss) < 0.011 },
          { label: 'the bad UPDATE touched every product', sql: `SELECT COUNT(*) FROM price_audit WHERE changed_at = '${X}'`, test: (r) => r[0][0] === nSku },
          { label: 'nothing sold below the real price before the change', sql: `SELECT COUNT(*) FROM order_items WHERE sold_at < '${X}' AND unit_price = ${NEWP}`, test: (r) => r[0][0] === 0 },
          { label: 'dashboard matches order items', sql: `SELECT revenue, (SELECT ROUND(SUM(qty * unit_price), 2) FROM order_items WHERE DATE(sold_at) = '${D}') FROM daily_sales WHERE day = '${D}'`, test: (r) => Math.abs(r[0][0] - r[0][1]) < 0.011 },
        ],
      };
    },
  };

  /* ============ Template 9: a retried job that wasn't safe to run twice ============ */
  const email = {
    id: 'email',
    name: 'The Double Send',
    pattern: 'Non-idempotent retry',
    build(t, { D, days, co, v }) {
      const campaign = t.pick(['Winter Preview', 'Early Access', 'Thank You Week', 'Big Weekend', 'New Season']);
      const A = t.int(1800, 3400); const B = t.int(8, 12); const k = t.int(2, B - 3);
      const sizes = []; let left = A;
      for (let b = 1; b <= B; b++) { const s = b === B ? left : Math.round(A / B * (0.85 + t.r() * 0.3)); sizes.push(s); left -= s; }
      const ids = []; for (let i = 0; i < A; i++) ids.push('c' + (40000 + i * 3 + t.int(0, 2)));
      const batchOf = []; let p = 0; sizes.forEach((s, bi) => { for (let i = 0; i < s; i++) batchOf.push([ids[p++], bi + 1]); });
      const s1 = 9 * 60 + t.int(0, 20); const per = 4; // minutes per batch
      const sends = [];
      const sendBatch = (start, b) => batchOf.filter((x) => x[1] === b).forEach((x) => sends.push(['', x[0], campaign, atMin(D, start + (b - 1) * per + t.int(0, per - 1), t.int(0, 59)), b]));
      for (let b = 1; b <= k; b++) sendBatch(s1, b);
      const timeoutAt = s1 + k * per + 2; const r1 = timeoutAt + t.int(10, 20); // run 1 stalls right after batch k
      for (let b = 1; b <= B; b++) sendBatch(r1, b);
      sends.sort(byTime(3)); sends.forEach((r, i) => { r[0] = 's' + (700000 + i); });
      const dup = sum(sizes.slice(0, k));
      const total = sends.length;
      const usual = days.slice(0, -1).map(() => t.int(150, 420));
      // Other emails (receipts, password resets) are counted separately, so the campaign numbers add up.
      const daily = days.map((d, i) => [d, d === D ? total : 0, d === D ? t.int(150, 400) : usual[i]]);
      const jobs = [];
      for (const d of days.slice(-4, -1)) jobs.push([atMin(d, 9 * 60 + t.int(0, 10)), atMin(d, 9 * 60 + 12 + t.int(0, 5)), 'SUCCESS', 'Transactional digest']);
      jobs.push([atMin(D, s1), atMin(D, timeoutAt), 'TIMEOUT', 'No reply from the mail API; worker stopped']);
      jobs.push([atMin(D, r1), atMin(D, r1 + B * per + 2), 'SUCCESS', 'Automatic retry 1 of 3']);
      const campaigns = [[campaign, 'theo', atMin(D, s1), A], [t.pick(['Spring Hello', 'Summer Sale', 'Autumn Picks']), 'theo', addDays(D, -t.int(20, 40)), t.int(1500, 3000)]];
      const feedback = days.slice(-4).map((d) => [d, d === D ? t.int(60, 140) : t.int(3, 12), d === D ? t.int(20, 60) : t.int(0, 3)]);
      const esp = days.slice(-3).map((d) => [d, 'operational', d === D ? 'Delivered 100% of messages submitted' : '']);
      const someone = batchOf[t.int(0, sizes[0] - 1)][0];

      const tables = [
        { name: 'email_sends', cols: [['send_id', 'TEXT'], ['customer_id', 'TEXT'], ['campaign', 'TEXT'], ['sent_at', 'TEXT'], ['batch', 'INTEGER']], rows: sends },
        { name: 'daily_email', cols: [['day', 'TEXT'], ['campaign_emails', 'INTEGER'], ['other_emails', 'INTEGER']], rows: daily },
        { name: 'job_runs', cols: [['started_at', 'TEXT'], ['ended_at', 'TEXT'], ['status', 'TEXT'], ['note', 'TEXT']], rows: jobs },
        { name: 'campaigns', cols: [['campaign', 'TEXT'], ['owner', 'TEXT'], ['scheduled_for', 'TEXT'], ['audience', 'INTEGER']], rows: campaigns },
        { name: 'email_feedback', cols: [['day', 'TEXT'], ['unsubscribes', 'INTEGER'], ['spam_reports', 'INTEGER']], rows: feedback },
        { name: 'provider_status', cols: [['day', 'TEXT'], ['status', 'TEXT'], ['note', 'TEXT']], rows: esp },
      ];
      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: emails sent per day', sql: 'SELECT day, campaign_emails,\n  other_emails\nFROM daily_email\nORDER BY day;' },
        { id: 'camp', kind: 'Context', key: true, title: 'Campaigns', sql: 'SELECT campaign, scheduled_for, audience\nFROM campaigns\nORDER BY scheduled_for DESC;',
          voice: { who: 'theo', text: v(['One campaign. One audience. One send. That was the plan.', `I wrote that subject line ${t.int(4, 9)} times. People were meant to read it once.`]) } },
        { id: 'jobs', kind: 'Logs', key: true, title: `Campaign sender runs`, sql: 'SELECT started_at, ended_at, status, note\nFROM job_runs\nORDER BY started_at DESC\nLIMIT 6;',
          voice: { who: 'gus', text: 'I was told to retry on failure. Nobody told me what I had already done.' } },
        { id: 'batches', kind: 'Raw data', key: true, title: `Sends per batch, ${campaign}`, sql: `SELECT batch, COUNT(*) AS sends,\n  COUNT(DISTINCT customer_id) AS customers\nFROM email_sends\nGROUP BY batch\nORDER BY batch;` },
        { id: 'one', kind: 'Raw data', key: true, title: 'Every send to one customer who complained', sql: `SELECT customer_id, sent_at, batch\nFROM email_sends\nWHERE customer_id = '${someone}'\nORDER BY sent_at;`,
          voice: { who: 'nia', text: v(['This customer wrote in twice. Fitting.', '“Your email was so good you sent it twice?” is the nicest one in my queue.']) } },
        { id: 'feedback', kind: 'Context', title: 'Unsubscribes and spam reports', sql: 'SELECT day, unsubscribes, spam_reports\nFROM email_feedback\nORDER BY day;',
          voice: { who: 'sam', text: v(['unsubscribes are UP?? ok the subject line was mid but not THAT mid', 'people are calling it spam. respectfully, it was art']) } },
        { id: 'esp', kind: 'Logs', title: 'Email provider status page', sql: 'SELECT day, status, note\nFROM provider_status\nORDER BY day;',
          voice: { who: 'vendor', text: 'We delivered every message you sent us. Promptly. Twice, where requested.' } },
      ];
      const cause = [
        opt('retry', `The sender timed out after batch ${k}, and its retry restarted at batch 1, so batches 1–${k} went out twice.`, true),
        opt('esp', 'The email provider’s API retried its own deliveries after a slow reply, so it delivered some messages twice.', false, `Our own email_sends table has two rows for each of those customers, one from each run (compare the send times). We sent them twice; the provider delivered what we sent.`),
        opt('list', 'The audience export merged two customer segments, so customers in both segments were on the send list twice.', false, `The campaign audience is ${num(A)}, and exactly ${num(A)} different customers got the email. The extra sends are the same customers in the same batches, sent again by a second run.`),
        opt('two', `A second campaign was scheduled for the same morning and reused the ${campaign} template and audience.`, false, `There is only one campaign on ${Df}; the other one in the campaigns table is weeks old.`),
      ];
      const wrongN = distractors(dup, [
        { v: total, why: 'That’s every send, including the customers who got it once.' },
        { v: A, why: 'That’s the whole audience. Most of them got the email once.' },
        { v: dup * 2, why: 'That counts sends, not customers: each of those customers got exactly two.' },
      ], 3, 0.03);
      const numberQ = [opt('n_true', num(dup), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));
      return {
        valid: k >= 2 && sizes.every((s) => s > 50 && s * 2 !== dup && s !== dup),
        teaser: v([`${co.name} emailed a lot of its customers twice. Theo wants to know who and why.`, `“Why did I get this twice?” ${co.name}’s inbox is on fire.`, `${co.name}’s ${campaign} email went out. Then it went out again.`]),
        reporter: 'theo',
        intro: [
          { who: 'alert', text: `daily_email for ${Df}: ${num(total)} ${campaign} emails sent (campaign audience: ${num(A)}). Spam reports: ${feedback[feedback.length - 1][2]}. Sender status: SUCCESS.` },
          ...(() => {
            // Computed in the old order so the dialogue picks don't shift; shown witness first, then the ask.
            const boss = { who: 'theo', text: v([`Morning. Half my replies to the ${campaign} email say “you sent this twice”. Why did it go out twice, and how many people got it more than once?`, `I’m drafting an apology. Before I send one more email to anyone: why did ${campaign} go out twice, and how many people got it more than once?`, `Did we really email the same customers twice? I need the reason for my boss and the number of people for the apology.`]) };
            const witness = { who: 'nia', text: v([`Support is drowning in “why did I get this twice?” replies, and unsubscribes are way up. Please tell me it stopped.`, `${feedback[feedback.length - 1][1]} unsubscribes yesterday, plus a pile of “you sent this twice” replies. Normal is about ${Math.round(mean(feedback.slice(0, -1).map((x) => x[1])))} unsubscribes.`]) };
            return [witness, boss];
          })(),
        ],
        tables, cards,
        chain: ['batches', 'jobs', 'one', 'camp'],
        questions: [
          { id: 'cause', prompt: 'What caused it?', options: cause },
          { id: 'number', prompt: `How many customers got the ${campaign} email more than once?`, options: numberQ },
        ],
        closing: { who: 'theo', text: v([`So the job was retried from the start and nobody checked what was already sent. Apology to those ${num(dup)} people only, and the sender skips anyone already in email_sends. Thank you.`, `${num(dup)} people, not everyone. I’ll apologise to them, and we’ll make the sender safe to retry. Thank you.`]) },
        lesson: {
          name: 'Unsafe retry',
          what: 'A job timed out halfway and was retried from the start. The first run had already done part of the work, so that part happened twice. The job wasn’t idempotent: running it twice didn’t give the same result as running it once.',
          spot: ['A TIMEOUT or FAILED run followed by an automatic retry.', 'Duplicates only in the first part of the work (early batches).', 'The same id twice, minutes apart.'],
          prevent: ['Record what’s done and skip it on retry (an idempotency key per customer and campaign).', 'Make the database refuse duplicates (a unique constraint).', 'Retry only the failed part, not the whole job.'],
          seen: 'Customers charged twice after a payment retry. Duplicate rows after a re-run ETL load. The same push notification three times. Double payouts to suppliers.',
        },
        truth: { answer: num(dup), dup, k, total },
        answerQ: { value: dup, money: false, blank: 'HAVING', what: `the customers who got ${campaign} more than once`, look: `The answer is a number of customers, not of emails. In \`email_sends\`, group the sends by \`customer_id\` and keep the customers who got more than one, then count them.`, nudge: `The ____ is a SQL keyword: the one that filters groups after GROUP BY. WHERE can’t see COUNT(*).`, sql: `SELECT COUNT(*) AS customers\nFROM (\n  SELECT customer_id\n  FROM email_sends\n  GROUP BY customer_id\n  HAVING COUNT(*) > 1\n);` },
        checks: [
          { label: 'customers with 2+ sends = batches before the timeout', sql: 'SELECT COUNT(*) FROM (SELECT customer_id FROM email_sends GROUP BY customer_id HAVING COUNT(*) > 1)', test: (r) => r[0][0] === dup },
          { label: 'nobody got it three times', sql: 'SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM email_sends GROUP BY customer_id)', test: (r) => r[0][0] === 2 },
          { label: 'every customer got it at least once', sql: 'SELECT COUNT(DISTINCT customer_id) FROM email_sends', test: (r) => r[0][0] === A },
          { label: 'dashboard campaign emails = rows in email_sends', sql: `SELECT campaign_emails, (SELECT COUNT(*) FROM email_sends) FROM daily_email WHERE day = '${D}'`, test: (r) => r[0][0] === r[0][1] && r[0][0] === total },
          { label: 'first run stops before the retry starts, and sends nothing after it stops', sql: "SELECT (SELECT ended_at FROM job_runs WHERE status = 'TIMEOUT'), (SELECT started_at FROM job_runs WHERE note LIKE 'Automatic retry%'), (SELECT COUNT(*) FROM email_sends WHERE sent_at > (SELECT ended_at FROM job_runs WHERE status = 'TIMEOUT') AND sent_at < (SELECT started_at FROM job_runs WHERE note LIKE 'Automatic retry%'))", test: (r) => r[0][0] < r[0][1] && r[0][2] === 0 },
        ],
      };
    },
  };

  /* ============ Template 10: a clean-up job that deleted active users ============ */
  const purge = {
    id: 'purge',
    name: 'The Wrong Goodbye',
    pattern: 'NULL handling in a delete job',
    build(t, { D, days, co, v }) {
      const prev = days.slice(0, -1);
      const cutoff = addDays(D, -730);
      const W = t.int(380, 1100); const author = t.pick(AUTHORS);
      const chans = ['web', 'app', 'partner'];
      const deleted = []; let uid = 900000;
      const runAt = (d) => ts(d, 2, 30, t.int(0, 59));
      const legitN = {};
      for (const d of days) {
        legitN[d] = t.int(15, 45);
        const at = runAt(d);
        for (let i = 0; i < legitN[d]; i++) deleted.push(['u' + (uid += t.int(3, 40)), at, addDays(cutoff, -t.int(1, 900)), chans[i % 3]]);
        if (d === D) for (let i = 0; i < W; i++) deleted.push(['u' + (uid += t.int(3, 40)), at, null, 'app']);
      }
      const wrongIds = deleted.filter((r) => r[2] === null).map((r) => r[0]);
      const base = t.int(co.scale[0], co.scale[1]) * 9;
      const dau = days.map((d) => [d, d === D ? base - Math.round(W * (0.7 + t.r() * 0.2)) + t.int(-40, 40) : base + t.int(-120, 120)]);
      const avgPrev = mean(prev.map((d, i) => dau[i][1])); const dashD = dau[dau.length - 1][1]; const drop = 1 - dashD / avgPrev;
      const jobs = days.map((d) => [runAt(d), 'svc_cleanup', legitN[d] + (d === D ? W : 0), 'SUCCESS']);
      const mergedAt = ts(addDays(D, -1), t.int(15, 18), t.int(0, 59), 0);
      const changes = [
        [mergedAt, author, 'jobs/cleanup_inactive.sql', "Handle missing logins: COALESCE(last_login, '1970-01-01') < cutoff"],
        [ts(addDays(D, -1), 11, t.int(0, 59), 0), t.pick(AUTHORS), 'app/onboarding.ts', 'New onboarding screens'],
        [ts(addDays(D, -3), 14, t.int(0, 59), 0), t.pick(AUTHORS), 'jobs/cleanup_inactive.sql', 'Log rows deleted per run'],
      ];
      const lastSeen = wrongIds.map((u) => [u, ts(addDays(D, -t.int(1, 6)), t.int(6, 23), t.int(0, 59), 0)]);
      const tickets = days.slice(-4).map((d) => [d, 'cannot log in', d === D ? t.int(90, 220) : t.int(2, 9)]);
      const outage = [[ts(D, 14, t.int(0, 15), 0), ts(D, 14, t.int(25, 40), 0), 'Identity provider: degraded sign-in', 'Resolved']];

      const tables = [
        { name: 'deleted_users', cols: [['user_id', 'TEXT'], ['deleted_at', 'TEXT'], ['last_login', 'TEXT'], ['signup_channel', 'TEXT']], rows: deleted },
        { name: 'daily_active', cols: [['day', 'TEXT'], ['active_users', 'INTEGER']], rows: dau },
        { name: 'job_runs', cols: [['started_at', 'TEXT'], ['run_by', 'TEXT'], ['rows_deleted', 'INTEGER'], ['status', 'TEXT']], rows: jobs },
        { name: 'code_changes', cols: [['merged_at', 'TEXT'], ['author', 'TEXT'], ['file', 'TEXT'], ['summary', 'TEXT']], rows: changes },
        { name: 'app_last_seen', cols: [['user_id', 'TEXT'], ['last_seen', 'TEXT']], rows: lastSeen },
        { name: 'support_tickets', cols: [['day', 'TEXT'], ['category', 'TEXT'], ['tickets', 'INTEGER']], rows: tickets },
        { name: 'incidents', cols: [['started_at', 'TEXT'], ['ended_at', 'TEXT'], ['title', 'TEXT'], ['status', 'TEXT']], rows: outage },
      ];
      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: daily active users', sql: 'SELECT day, active_users\nFROM daily_active\nORDER BY day;' },
        { id: 'jobs', kind: 'Logs', key: true, title: 'Nightly clean-up job: accounts deleted', sql: 'SELECT started_at, rows_deleted, status\nFROM job_runs\nORDER BY started_at;',
          voice: { who: 'gus', text: v(['I delete the inactive ones. Last night there were a lot of inactive ones. I didn’t ask questions.', 'Rows deleted: lots. Status: SUCCESS. I sleep well.']) } },
        { id: 'channels', kind: 'Raw data', key: true, title: `Accounts deleted on ${Df}, by sign-up channel`, sql: `SELECT signup_channel, COUNT(*) AS users,\n  COUNT(last_login) AS with_a_login\nFROM deleted_users\nWHERE DATE(deleted_at) = '${D}'\nGROUP BY signup_channel;` },
        { id: 'sample', kind: 'Raw data', key: true, title: `A few accounts deleted on ${Df}`, sql: `SELECT user_id, last_login, signup_channel\nFROM deleted_users\nWHERE DATE(deleted_at) = '${D}'\nORDER BY user_id DESC\nLIMIT 10;` },
        { id: 'code', kind: 'Logs', key: true, title: 'Recent code changes', sql: 'SELECT merged_at, author, file, summary\nFROM code_changes\nORDER BY merged_at DESC;' },
        { id: 'seen', kind: 'Raw data', title: 'When deleted users last opened the app', sql: `SELECT DATE(s.last_seen) AS day, COUNT(*) AS users\nFROM app_last_seen s\nJOIN deleted_users d ON d.user_id = s.user_id\nGROUP BY 1\nORDER BY 1;`,
          voice: { who: 'nia', text: v(['“Inactive”. These people used the app this week, and some of them have written to me in capital letters.', 'They were using the app this week. Now they don’t exist. They are not happy.']) } },
        { id: 'tickets', kind: 'Context', title: 'Support tickets: “cannot log in”', sql: 'SELECT day, tickets\nFROM support_tickets\nORDER BY day;' },
        { id: 'outage', kind: 'Logs', title: 'Incidents', sql: 'SELECT started_at, ended_at, title, status\nFROM incidents;',
          voice: { who: 'vendor', text: 'Sign-in was briefly degraded for some users. All accounts remain exactly as you left them.' } },
      ];
      const cause = [
        opt('null', 'The clean-up job’s new COALESCE read a missing last_login as 1970, so users who only use the app were deleted.', true),
        opt('outage', 'The identity provider outage corrupted sign-in sessions, so its security rules removed those accounts.', false, `The outage ran from ${outage[0][0].slice(11, 16)} to ${outage[0][1].slice(11, 16)} in the afternoon. The accounts were deleted at 02:30, by our own job, and they are in deleted_users.`),
        opt('fine', 'The job worked as designed: these accounts had not logged in for over two years, so deleting them was correct.', false, 'Those accounts have no login date at all (last_login is empty), and app_last_seen shows they used the app in the last week.'),
        opt('onboarding', 'The new onboarding screens made app users sign up again, so the job removed their old, now unused accounts.', false, 'The onboarding change only touched app/onboarding.ts. The accounts were removed by cleanup_inactive.sql, which was changed later that day, and app_last_seen shows they were still in use.'),
      ];
      const allD = legitN[D] + W;
      const wrongN = distractors(W, [
        { v: allD, why: `That’s everyone deleted on ${Df}. Some of them really were inactive (their last login is years ago).` },
        { v: Math.round(avgPrev - dashD), why: 'That’s the drop in active users. Not every deleted user would have opened the app that day.' },
        { v: W + Math.round(legitN[D] / 3), why: 'That counts every deleted app account, including app users who really hadn’t logged in for years.' },
      ], 3, 0.03);
      const numberQ = [opt('n_true', num(W), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));
      return {
        valid: drop > 0.04 && W > legitN[D] * 5,
        teaser: v([`${co.name}’s clean-up job deleted ${num(allD)} accounts last night. Some of them were in use.`, `“My account is gone.” ${co.name}’s support queue, all morning.`, `${co.name} lost ${pct(drop)} of its active users overnight.`]),
        reporter: 'nia',
        intro: [
          { who: 'alert', text: `daily_active for ${Df}: ${num(dashD)} (−${pct(drop)} vs 7-day average). cleanup_inactive deleted ${num(allD)} accounts. All jobs: SUCCESS.` },
          { who: 'nia', text: v([`Support here. All morning people have been telling me their account is gone. They are not inactive, they are furious.`, `I have ${tickets[tickets.length - 1][2]} “I can’t log in” tickets. These people say they used the app this week, and now their account doesn’t exist.`]) },
          { who: 'maya', text: v(['Deleting customers is how we end up in the news. Before 9 I want the cause, and how many accounts we deleted by mistake.', 'Find out why we deleted active accounts, and how many. Legal will ask me in the 9:00, so I want both before then.']) },
        ],
        tables, cards,
        chain: ['jobs', 'channels', 'sample', 'code'],
        questions: [
          { id: 'cause', prompt: 'What caused it?', options: cause },
          { id: 'number', prompt: `How many accounts were deleted by mistake on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'nia', text: v([`So “no web login” became “inactive since 1970”. Restore those ${num(W)} accounts from deleted_users, and the clean-up job does a dry run with a count before it deletes anything. Thank you.`, `${num(W)} people who did nothing wrong. Let’s restore them today, and from now on the job stops if it’s about to delete far more than usual. Thank you.`]) },
        lesson: {
          name: 'NULL means unknown',
          what: 'A job “handled” missing values by replacing NULL with a very old date. Missing didn’t mean old: those users simply logged in another way. The job then treated them as inactive and deleted them.',
          spot: ['A nightly job whose row count jumps far above normal.', 'Deleted rows where the key column is NULL.', 'A recent change that adds COALESCE or IFNULL to a filter.'],
          prevent: ['Decide what NULL means before replacing it.', 'Dry-run deletes: count first, and stop if the count is unusual.', 'Soft delete or keep a restore table, as this team did.'],
          seen: 'Customers billed because a NULL end date read as “still active”. Users excluded from a report because NOT IN met a NULL. Averages skewed because NULL became 0.',
        },
        truth: { answer: num(W), W, allD, drop },
        answerQ: { value: W, money: false, blank: 'IS NULL', what: `the accounts wrongly deleted on ${Df}`, look: `Count the rows of \`deleted_users\` from the clean-up on ${Df} (\`deleted_at\`), but only the accounts the job got wrong. Look closely at \`last_login\` for those accounts.`, nudge: `The ____ is how SQL tests for an empty value. (= NULL never matches anything.)`, sql: `SELECT COUNT(*) AS wrongly_deleted\nFROM deleted_users\nWHERE DATE(deleted_at) = '${D}'\n  AND last_login IS NULL;` },
        checks: [
          { label: 'NULL logins on D = wrongly deleted', sql: `SELECT COUNT(*) FROM deleted_users WHERE DATE(deleted_at) = '${D}' AND last_login IS NULL`, test: (r) => r[0][0] === W },
          { label: 'no NULL deletions on other days', sql: `SELECT COUNT(*) FROM deleted_users WHERE DATE(deleted_at) <> '${D}' AND last_login IS NULL`, test: (r) => r[0][0] === 0 },
          { label: 'every wrongly deleted user was seen in the app', sql: `SELECT COUNT(*) FROM deleted_users d JOIN app_last_seen s ON s.user_id = d.user_id WHERE d.last_login IS NULL`, test: (r) => r[0][0] === W },
          { label: 'job count matches deleted rows', sql: `SELECT rows_deleted, (SELECT COUNT(*) FROM deleted_users WHERE DATE(deleted_at) = '${D}') FROM job_runs WHERE DATE(started_at) = '${D}'`, test: (r) => r[0][0] === allD && r[0][1] === allD },
        ],
      };
    },
  };

  /* ============ Template 11: one dashboard tile that scans the whole table ============ */
  const bill = {
    id: 'bill',
    name: 'The Expensive Refresh',
    pattern: 'Full table scan (no partition filter)',
    build(t, { D, days, co, v, sameDay }) {
      const RATE = 6.25; // dollars per TB scanned
      const cost = (gb) => round2(gb / 1000 * RATE);
      const hashes = () => 'q_' + Math.floor(t.r() * 0xffffff).toString(16).padStart(6, '0');
      const rows = [];
      const author = t.pick(AUTHORS);
      const tiles = ['Orders today', 'Revenue by region', 'Top products', 'Refund rate', 'Active users', 'Stock alerts'].map((n) => [n, hashes(), 60, addDays(D, -t.int(60, 400)) + ' 10:00:00', t.pick(AUTHORS), t.int(4, 30)]);
      const badTile = ['Live events today', hashes(), 5, sameDay ? ts(D, t.int(7, 9), t.int(0, 59), 0) : ts(addDays(D, -1), t.int(16, 19), t.int(0, 59), 0), author, t.int(380, 520)]; // see TAI.SAME_DAY_FROM
      const analysts = AUTHORS.filter((a) => a !== author).slice(0, 4);
      const backfillAt = ts(D, t.int(10, 15), t.int(0, 59), 0);
      for (const d of days) {
        for (let j = 0; j < 20; j++) rows.push([ts(d, 1 + Math.floor(j / 6), (j * 10) % 60, t.int(0, 59)), 'svc_etl', 'etl_' + j, t.int(600, 1400)]);
        for (let j = 0; j < t.int(40, 70); j++) rows.push([ts(d, t.int(8, 19), t.int(0, 59), t.int(0, 59)), t.pick(analysts), hashes(), t.int(20, 700)]);
        for (const tl of tiles) for (let h = 0; h < 24; h++) rows.push([ts(d, h, 0, t.int(0, 30)), 'svc_dashboards', tl[1], tl[5] + t.int(0, 3)]);
      }
      rows.push([backfillAt, analysts[0], 'q_backfill', t.int(7000, 11000)]);
      const startMin = (Date.UTC(...badTile[3].slice(0, 10).split('-').map((x, i) => (i === 1 ? x - 1 : +x))) / 60000) + minOf(badTile[3]);
      const endMin = Date.UTC(...addDays(D, 1).split('-').map((x, i) => (i === 1 ? x - 1 : +x))) / 60000;
      const d0 = Date.UTC(...days[0].split('-').map((x, i) => (i === 1 ? x - 1 : +x))) / 60000;
      for (let m = startMin + 5; m < endMin; m += 5) rows.push([atMin(days[0], m - d0, t.int(0, 20)), 'svc_dashboards', badTile[1], badTile[5] + t.int(-15, 15)]);
      rows.sort(byTime(0));
      const hist = rows.map((r, i) => ['qid' + (300000 + i), r[0], r[1], r[2], r[3], cost(r[3])]);
      const dayCost = (d) => round2(sum(hist.filter((r) => r[1].slice(0, 10) === d).map((r) => r[5])));
      const daily = days.map((d) => [d, dayCost(d)]);
      const tileCost = round2(sum(hist.filter((r) => r[3] === badTile[1] && r[1].slice(0, 10) === D).map((r) => r[5])));
      const tileAll = round2(sum(hist.filter((r) => r[3] === badTile[1]).map((r) => r[5])));
      const svcD = round2(sum(hist.filter((r) => r[2] === 'svc_dashboards' && r[1].slice(0, 10) === D).map((r) => r[5])));
      const prev = sameDay ? days.slice(0, -1) : days.slice(0, -2); const avgPrev = round2(mean(prev.map(dayCost)));
      const dashCost = dayCost(D); const times = (dashCost / avgPrev).toFixed(1) + '×';
      const allTiles = tiles.concat([badTile]);
      const tileRows = allTiles.map((x) => [x[0], x[1], x[2], x[3].slice(0, 16), x[4]]);
      const texts = allTiles.map((x) => [x[1], x === badTile ? "SELECT COUNT(*) FROM events\nWHERE DATE(event_time) = CURRENT_DATE" : `SELECT … FROM events\nWHERE event_date = CURRENT_DATE`]);
      const sizes = [['events', 'event_date', addDays(D, -7), round2(badTile[5] * (0.96 + t.r() * 0.02)) /* so a full scan by the tile reads about the whole table */], ['events', 'event_date', D, 0]]; sizes[1][3] = round2(sizes[0][3] * (1.01 + t.r() * 0.02));
      const pricing = [[addDays(D, -t.int(300, 600)), RATE, 'Price per TB scanned']];

      const tables = [
        { name: 'query_history', cols: [['query_id', 'TEXT'], ['started_at', 'TEXT'], ['user_name', 'TEXT'], ['query_hash', 'TEXT'], ['gb_scanned', 'REAL'], ['cost_usd', 'REAL']], rows: hist },
        { name: 'daily_cost', cols: [['day', 'TEXT'], ['cost_usd', 'REAL']], rows: daily },
        { name: 'dashboard_tiles', cols: [['tile', 'TEXT'], ['query_hash', 'TEXT'], ['refresh_minutes', 'INTEGER'], ['created_at', 'TEXT'], ['created_by', 'TEXT']], rows: tileRows },
        { name: 'tile_sql', cols: [['query_hash', 'TEXT'], ['sql_text', 'TEXT']], rows: texts },
        { name: 'table_sizes', cols: [['table_name', 'TEXT'], ['partitioned_by', 'TEXT'], ['measured_on', 'TEXT'], ['size_gb', 'REAL']], rows: sizes },
        { name: 'pricing', cols: [['since', 'TEXT'], ['usd_per_tb', 'REAL'], ['note', 'TEXT']], rows: pricing },
      ];
      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Cloud warehouse cost per day', sql: 'SELECT day, cost_usd\nFROM daily_cost\nORDER BY day;' },
        { id: 'users', kind: 'Raw data', key: true, title: `Cost by user on ${Df}`, sql: `SELECT user_name, COUNT(*) AS queries,\n  ROUND(SUM(cost_usd), 2) AS cost_usd\nFROM query_history\nWHERE DATE(started_at) = '${D}'\nGROUP BY user_name\nORDER BY cost_usd DESC;`,
          voice: { who: 'gus', text: v(['svc_etl is me. I read what I need, at 1 a.m., and go back to sleep. Look elsewhere.', 'My jobs cost the same every night. I’m old, not expensive.']) } },
        { id: 'top', kind: 'Raw data', key: true, title: `Biggest queries on ${Df}`, sql: `SELECT query_hash, COUNT(*) AS runs,\n  ROUND(AVG(gb_scanned)) AS avg_gb\nFROM query_history\nWHERE DATE(started_at) = '${D}'\nGROUP BY query_hash\nORDER BY SUM(gb_scanned) DESC\nLIMIT 5;` },
        { id: 'tiles', kind: 'Context', key: true, title: 'Dashboard tiles', sql: 'SELECT tile, query_hash, refresh_minutes,\n  created_at, created_by\nFROM dashboard_tiles\nORDER BY created_at DESC;',
          voice: { who: 'sam', text: v(['the live events tile is my baby. real-time vibes. you can’t put a price on vibes', 'ok i asked for “live” but i didn’t ask for “expensive”']) } },
        { id: 'sql', kind: 'Code', key: true, title: 'The SQL behind each tile', sql: 'SELECT query_hash, sql_text\nFROM tile_sql;' },
        { id: 'sizes', kind: 'Context', title: 'Size of the events table', sql: 'SELECT table_name, partitioned_by, measured_on, size_gb\nFROM table_sizes;' },
        { id: 'pricing', kind: 'Context', title: 'Warehouse pricing', sql: 'SELECT since, usd_per_tb, note\nFROM pricing;',
          voice: { who: 'vendor', text: 'Our prices have not changed. Your enthusiasm for scanning data has.' } },
      ];
      const cause = [
        opt('scan', 'A new tile refreshes every 5 minutes and filters on DATE(event_time), so every refresh scans all events.', true),
        opt('backfill', `${analysts[0]}’s one-off backfill at ${backfillAt.slice(11, 16)} on ${Df} scanned ${num(hist.find((r) => r[3] === 'q_backfill')[4])} GB in one go and ran up the bill.`, false, `That query ran once and cost ${money(cost(hist.find((r) => r[3] === 'q_backfill')[4]))}. The bill went up by far more than that.`),
        opt('price', 'The warehouse raised its price per TB scanned, so the same daily queries now cost several times more.', false, `The price per TB has been ${money(RATE)} since ${pricing[0][0]}. We scanned more, we didn’t pay more per TB.`),
        opt('growth', 'A late load of old events made the events table balloon, so every query scanned far more data than usual.', false, `The table grew by about ${pct(sizes[1][3] / sizes[0][3] - 1)} in a week. The bill went up ${times}.`),
      ];
      const wrongN = distractors(tileCost, [
        { v: round2(dashCost - avgPrev), why: 'That’s how much more the whole day cost than usual. Other queries vary too: add up that one tile’s runs.' },
        { v: svcD, why: 'That’s every dashboard tile together. The old tiles cost the same as always.' },
        sameDay ? null : { v: tileAll, why: `That includes the tile’s runs on the evening before. The question is about ${Df}.` }, // no runs before D any more
      ], 3);
      const numberQ = [opt('n_true', money(tileCost), true)].concat(wrongN.map((w, i) => opt('n_' + i, money(w.v), false, w.why)));
      return {
        valid: dashCost / avgPrev > 2.2 && tileCost > 100,
        teaser: v([`${co.name}’s cloud bill was ${times} normal yesterday.`, `Something at ${co.name} spent ${money(dashCost)} on queries in one day.`, `${co.name}’s data warehouse cost ${times} as much as usual. Maya would like to know why.`]),
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_cost for ${Df}: ${money(dashCost)} (${times} the usual ${money(avgPrev)}). Budget alert: 80% of the monthly budget used.` },
          { who: 'maya', text: v([`Our warehouse bill was ${times} normal yesterday. If that keeps up, it eats this month’s budget in days. What caused it, and how much of yesterday’s bill was it?`, `The cloud bill just emailed me, which it never does. ${money(dashCost)} in one day. What caused it, and how much of that was it?`, `Before I approve anything else this month: what made yesterday cost ${times} as much as usual, and how much of the bill was that one thing?`]) },
          { who: 'sam', text: v(['80% of the monthly budget already?? who has the company card', `is the cloud just… more expensive on ${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][new Date(D + 'T12:00:00').getDay()]}??`]) },
        ],
        tables, cards,
        chain: ['top', 'tiles', 'sql', 'users'],
        questions: [
          { id: 'cause', prompt: 'What caused it?', options: cause },
          { id: 'number', prompt: `How much did the new tile cost on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: v([`So a “live” tile read the whole table every five minutes. Filter on event_date, refresh it hourly, and set a cost alert per query. Thank you.`, `${money(tileCost)} a day for one tile. Fix the filter today, and anything that refreshes more than hourly needs a cost estimate first. Thank you.`]) },
        lesson: {
          name: 'Full table scan',
          what: 'The events table is split by event_date, so a filter on event_date reads one day. This tile filtered on DATE(event_time) instead. The warehouse couldn’t use the split, so every refresh read the whole table, every 5 minutes.',
          spot: ['One query hash with many runs and the same huge scan each time.', 'A filter that wraps the partition column in a function, or uses a different column.', 'Cost per day jumping right after something new was scheduled.'],
          prevent: ['Filter on the partition column itself.', 'Require a partition filter on big tables.', 'Set per-query limits and daily cost alerts.'],
          seen: 'A “SELECT *” in a scheduled job that cost thousands a month. A test query left on a schedule. A BI tool refreshing every minute against raw data.',
        },
        truth: { answer: money(tileCost), tileCost, dashCost, times },
        answerQ: { value: tileCost, money: true, blank: badTile[1], what: `the tile’s cost on ${Df}`, look: `Add up \`cost_usd\` in \`query_history\` for ${Df} (\`started_at\`), but only for the one tile’s query. \`dashboard_tiles\` shows which \`query_hash\` belongs to which tile.`, nudge: `The ____ is a \`query_hash\`: the tile that refreshes far more often than the rest (\`refresh_minutes\` in \`dashboard_tiles\`).`, sql: `SELECT ROUND(SUM(cost_usd), 2) AS tile_cost\nFROM query_history\nWHERE query_hash = '${badTile[1]}'\n  AND DATE(started_at) = '${D}';` },
        checks: [
          { label: 'tile cost on D', sql: `SELECT ROUND(SUM(cost_usd), 2) FROM query_history WHERE query_hash = '${badTile[1]}' AND DATE(started_at) = '${D}'`, test: (r) => Math.abs(r[0][0] - tileCost) < 0.011 },
          { label: sameDay ? 'tile runs every 5 minutes from its creation on D' : 'tile runs every 5 minutes on D', sql: `SELECT COUNT(*) FROM query_history WHERE query_hash = '${badTile[1]}' AND DATE(started_at) = '${D}'`, test: (r) => r[0][0] === (sameDay ? Math.ceil((endMin - startMin - 5) / 5) : 288) }, // from creation to midnight
          { label: 'daily cost matches history', sql: `SELECT cost_usd, (SELECT ROUND(SUM(cost_usd), 2) FROM query_history WHERE DATE(started_at) = '${D}') FROM daily_cost WHERE day = '${D}'`, test: (r) => Math.abs(r[0][0] - r[0][1]) < 0.011 },
          { label: 'the bad tile is the biggest query on D', sql: `SELECT query_hash FROM query_history WHERE DATE(started_at) = '${D}' GROUP BY query_hash ORDER BY SUM(gb_scanned) DESC LIMIT 1`, test: (r) => r[0][0] === badTile[1] },
        ],
      };
    },
  };

  TAI.TEMPLATES.push(nowhere, email, purge, bill);
})();
