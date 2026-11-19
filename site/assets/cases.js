/* 3 a.m. Incident: case templates.
   One template = one real failure pattern. Each build() takes a seeded random source and returns
   tables, query cards, questions, a lesson and self-checks. Every number in the story is computed
   from the generated rows, so the story and the data cannot disagree. */
(function () {
  'use strict';
  const TAI = window.TAI;
  const { addDays, fmtDay, fmtShort, dow, ts, round2, num, money, pct, distractors } = TAI.util;

  const AUTHORS = ['priya.s', 'tom.k', 'lena.m', 'arjun.v', 'chen.w', 'sofia.r', 'omar.h'];
  const COUNTRIES = [['US', 'United States'], ['UK', 'United Kingdom'], ['DE', 'Germany'], ['IN', 'India'], ['FR', 'France'], ['BR', 'Brazil'], ['AU', 'Australia'], ['CA', 'Canada'], ['NL', 'Netherlands']];
  const dayFactor = (t, iso) => (dow(iso) === 0 || dow(iso) === 6 ? 1.1 : 1) * (0.96 + t.r() * 0.08);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => sum(a) / a.length;
  function weights(t, keys, fixedKey, fixedShare) {
    const others = keys.filter((k) => k !== fixedKey);
    const w = others.map(() => 0.6 + t.r());
    const sw = sum(w);
    const out = {}; out[fixedKey] = fixedShare;
    others.forEach((k, i) => { out[k] = (1 - fixedShare) * w[i] / sw; });
    return out;
  }
  const opt = (id, text, correct, why) => ({ id, text, correct: !!correct, why: why || '' });

  /* ============ Template 1: the late partition ============ */
  const late = {
    id: 'late',
    name: 'The Late Partition',
    pattern: 'Late-arriving data',
    build(t, { D, days, co, v }) {
      const prev = days.slice(0, -1);
      const sources = ['web', 'ios', 'android', 'partner_api'];
      const broken = t.pick(sources);
      const others = sources.filter((s) => s !== broken);
      const share = weights(t, sources, broken, 0.26 + t.r() * 0.16);
      const base = t.int(co.scale[0], co.scale[1]);

      const cnt = {}; const orders = [];
      for (const d of days) {
        cnt[d] = {}; const f = dayFactor(t, d);
        for (const s of sources) {
          const n = Math.max(8, Math.round(base * f * share[s] * (0.95 + t.r() * 0.1)));
          cnt[d][s] = n;
          for (let i = 0; i < n; i++) orders.push(['', s, ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59))]);
        }
      }
      orders.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
      orders.forEach((o, i) => { o[0] = co.prefix + '-' + (300000 + i); });

      const nearDay = t.pick(prev.slice(1)); const nearSrc = t.pick(others);
      const parts = [];
      for (const d of days) {
        const n1 = addDays(d, 1);
        for (const s of sources) {
          let at;
          if (d === D && s === broken) at = ts(n1, 3, t.int(18, 52), t.int(0, 59));
          else if (d === nearDay && s === nearSrc) at = ts(n1, 1, t.int(55, 58), t.int(0, 59));
          else at = ts(n1, 1, t.int(4, 48), t.int(0, 59));
          parts.push(['orders', d, s, at, cnt[d][s]]);
        }
      }
      parts.sort((a, b) => (a[3] < b[3] ? -1 : 1));

      const total = (d) => sum(sources.map((s) => cnt[d][s]));
      const runs = []; const daily = [];
      for (const d of days) {
        const n1 = addDays(d, 1);
        const read = sum(sources.map((s) => (d === D && s === broken ? 0 : cnt[d][s])));
        runs.push(['build_daily_orders', d, ts(n1, 2, 0, t.int(1, 9)), ts(n1, 2, t.int(1, 3), t.int(0, 59)), 'SUCCESS', read]);
        runs.push(['email_dashboard_digest', d, ts(n1, 7, 0, t.int(1, 9)), ts(n1, 7, 0, t.int(20, 59)), 'SUCCESS', null]);
        for (const s of sources) if (!(d === D && s === broken)) daily.push([d, s, cnt[d][s]]);
      }
      runs.sort((a, b) => (a[2] < b[2] ? -1 : 1));

      const trueD = total(D); const dashD = trueD - cnt[D][broken];
      const avgPrev = Math.round(mean(prev.map(total)));
      const drop = 1 - dashD / avgPrev;

      const campName = t.pick(['Autumn Boost', 'Cosy Week', 'Back to Work', 'Friends & Family', 'Weekend Treat']);
      const campaigns = [
        [campName, 'paid_social', addDays(D, -t.int(16, 24)), addDays(D, -1), t.int(8, 24) * 100],
        ['Brand search', 'search', addDays(D, -t.int(80, 140)), null, t.int(3, 9) * 100],
        ['Newsletter', 'email', addDays(D, -t.int(200, 300)), null, t.int(1, 3) * 50],
      ];
      const DEP = {
        ios: ['ios-app', 'Release 4.' + t.int(10, 30) + ': dark mode and a new onboarding screen'],
        android: ['android-app', 'Release 4.' + t.int(10, 30) + ': smaller download, bug fixes'],
        web: ['checkout-web', 'New button colours on the basket page'],
        partner_api: ['partner-gateway', 'Change log format for partner requests'],
      };
      const deployAt = ts(D, t.int(10, 16), t.int(0, 59), t.int(0, 59));
      const deploys = [
        [ts(addDays(D, -3), t.int(10, 17), t.int(0, 59), 0), 'dbt-models', t.pick(AUTHORS), 'Add descriptions to finance models'],
        [ts(addDays(D, -2), t.int(10, 17), t.int(0, 59), 0), 'search-api', t.pick(AUTHORS), 'Warm the cache after restarts'],
        [deployAt, DEP[broken][0], t.pick(AUTHORS), DEP[broken][1]],
      ];
      const herringKind = t.pick(['pay', 'traffic']);
      const payRate = {};
      const pay = days.map((d) => { const att = Math.round(total(d) * (1.06 + t.r() * 0.04)); const rate = 0.014 + t.r() * 0.01; payRate[d] = rate; return [d, att, Math.round(att * rate)]; });
      const traffic = days.map((d) => [d, Math.round(total(d) * (15 + t.r() * 3))]);

      const tables = [
        { name: 'orders', cols: [['order_id', 'TEXT'], ['source', 'TEXT'], ['created_at', 'TEXT']], rows: orders },
        { name: 'daily_orders', cols: [['day', 'TEXT'], ['source', 'TEXT'], ['orders', 'INTEGER']], rows: daily },
        { name: 'partitions', cols: [['table_name', 'TEXT'], ['partition_date', 'TEXT'], ['source', 'TEXT'], ['landed_at', 'TEXT'], ['row_count', 'INTEGER']], rows: parts },
        { name: 'job_runs', cols: [['job', 'TEXT'], ['for_day', 'TEXT'], ['started_at', 'TEXT'], ['finished_at', 'TEXT'], ['status', 'TEXT'], ['rows_read', 'INTEGER']], rows: runs },
        { name: 'campaigns', cols: [['name', 'TEXT'], ['channel', 'TEXT'], ['started', 'TEXT'], ['ended', 'TEXT'], ['spend_per_day', 'INTEGER']], rows: campaigns },
        { name: 'deploys', cols: [['deployed_at', 'TEXT'], ['service', 'TEXT'], ['author', 'TEXT'], ['description', 'TEXT']], rows: deploys },
      ];
      if (herringKind === 'pay') tables.push({ name: 'payment_attempts', cols: [['day', 'TEXT'], ['attempts', 'INTEGER'], ['failures', 'INTEGER']], rows: pay });
      else tables.push({ name: 'site_traffic', cols: [['day', 'TEXT'], ['sessions', 'INTEGER']], rows: traffic });

      const Df = fmtDay(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders per day', sql: `SELECT day, SUM(orders) AS orders\nFROM daily_orders\nGROUP BY day\nORDER BY day;`,
          voice: { who: 'gus', text: 'I built that table at 02:00 sharp, like every night. Status: SUCCESS. You’re welcome.' } },
        { id: 'dash_src', kind: 'Dashboard', key: true, title: `Dashboard for ${Df}, by source`, sql: `SELECT source, orders\nFROM daily_orders\nWHERE day = '${D}'\nORDER BY orders DESC;` },
        { id: 'raw_src', kind: 'Raw data', key: true, title: `Raw orders for ${Df}, by source`, sql: `SELECT source, orders FROM (\n  SELECT source, COUNT(*) AS orders, 0 AS k\n  FROM orders WHERE DATE(created_at) = '${D}'\n  GROUP BY source\n  UNION ALL\n  SELECT 'TOTAL', COUNT(*), 1\n  FROM orders WHERE DATE(created_at) = '${D}'\n)\nORDER BY k, orders DESC;` },
        { id: 'parts', kind: 'Logs', key: true, title: `When did each source’s data land for ${Df}?`, sql: `SELECT source, landed_at, row_count\nFROM partitions\nWHERE partition_date = '${D}'\nORDER BY landed_at;` },
        { id: 'runs', kind: 'Logs', key: true, title: 'Job runs, last three nights', sql: `SELECT job, for_day, started_at, status, rows_read\nFROM job_runs\nWHERE for_day >= '${addDays(D, -2)}'\nORDER BY started_at;`,
          voice: { who: 'gus', text: 'Start at 02:00, read what’s there, finish. Nobody ever asked me to wait for anything.' } },
        { id: 'camp', kind: 'Context', title: 'Marketing campaigns', sql: `SELECT name, channel, started, ended, spend_per_day\nFROM campaigns\nORDER BY started DESC;`,
          voice: { who: 'sam', text: `${campName} ended the day before. that HAS to be it. right?? right???` } },
        { id: 'deploys', kind: 'Context', title: 'Deploys this week', sql: `SELECT deployed_at, service, author, description\nFROM deploys\nORDER BY deployed_at;` },
        herringKind === 'pay'
          ? { id: 'pay', kind: 'Context', title: 'Payment failures per day', sql: `SELECT day, attempts, failures,\n  ROUND(100.0 * failures / attempts, 1) AS fail_pct\nFROM payment_attempts\nORDER BY day;` }
          : { id: 'traffic', kind: 'Context', title: 'Website and app sessions per day', sql: `SELECT day, sessions\nFROM site_traffic\nORDER BY day;` },
      ];

      const cause = [
        opt('late', `The ${broken} data for ${Df} arrived after the nightly job had run, so the dashboard never counted it.`, true),
        opt('camp', `Demand really fell after the ${campName} campaign ended on ${fmtDay(addDays(D, -1))}, so fewer people ordered.`, false,
          `The campaign did end, but the raw orders table holds ${num(trueD)} orders for ${Df}: a normal day. Demand didn’t fall; the dashboard missed some.`),
        opt('deploy', `The ${DEP[broken][0]} deploy on ${Df} broke ordering on ${broken}, so those orders never happened.`, false,
          `Raw orders show ${num(cnt[D][broken])} ${broken} orders on ${Df}, about normal. People ordered fine. The orders just weren’t on the dashboard.`),
        herringKind === 'pay'
          ? opt('pay', `A spike in payment failures on ${Df} blocked checkout, so orders were lost.`, false, `Payment failures were ${(payRate[D] * 100).toFixed(1)}% on ${Df}, the same as any other day.`)
          : opt('traffic', `Fewer people visited the site and apps on ${Df}, so fewer people ordered.`, false, `Sessions on ${Df} were in the normal range. The visitors came; the orders came too.`),
      ];
      const wrongN = distractors(trueD, [
        { v: dashD, why: 'That’s the dashboard’s number: the one that’s wrong.' },
        { v: avgPrev, why: 'That’s a normal day’s average. Maya wants what actually happened on ' + Df + '.' },
        { v: trueD + cnt[D][broken], why: `That counts ${broken} twice.` },
      ], 3);
      const numberQ = [opt('n_true', num(trueD), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));

      return {
        valid: drop >= 0.15,
        teaser: `${co.name}’s dashboard says orders fell ${pct(drop)} yesterday.`,
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_orders for ${Df}: ${num(dashD)} orders (−${pct(drop)} vs 7-day average). All jobs: SUCCESS.` },
          { who: 'maya', text: v([`Morning. The dashboard says we took ${num(dashD)} orders yesterday. We normally do about ${num(avgPrev)}. Is ${co.name} falling off a cliff, or is the dashboard lying? One number, one sentence, before 9.`, `${num(dashD)} orders yesterday, against a usual ${num(avgPrev)}. I’m on the school run, so keep it short: are we in trouble or is the chart?`, `Before anyone panics: the dashboard says ${num(dashD)} orders. We never do that few. Real drop or broken report? I need to know before the 9:00.`, `I’ve had three coffees and one terrifying chart. ${num(dashD)} orders, normally ${num(avgPrev)}. Find me the truth.`]) },
          { who: 'sam', text: v([`ok but is this because ${campName} ended?? i literally SAID don’t stop it 😭`, `${campName} ended and we immediately flop?? i’m not saying i told you so. i’m just saying it`, `can we restart ${campName} like right now. asking for me`]) },
        ],
        tables, cards,
        chain: ['dash_src', 'raw_src', 'parts', 'runs'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `How many orders did ${co.name} really take on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: v([`So the orders are fine and the dashboard was early. Re-run it for ${fmtShort(D)}, and make that job wait for every source. Thank you.`, `So nobody stopped buying; one source just hadn’t arrived yet. Re-run ${fmtShort(D)} and make the job wait for every source. Thanks.`, `Good. I can stop drafting the bad-news email. Re-run the day, and let’s get an alert for late files.`]) },
        lesson: {
          name: 'Late-arriving data',
          what: 'The job ran on a clock, not on readiness. It read whatever had landed by 02:00, reported SUCCESS, and the missing partition was invisible.',
          spot: ['Compare rows in the source with rows the job read.', 'Compare when each partition landed with when the job started.', 'A segment that is missing entirely is rarely a real-world drop.'],
          seen: 'A finance report built before the last region’s file arrived. A vendor feed that lands “a bit late” after a holiday. A job that moved to a new server and now starts ten minutes earlier.',
          prevent: ['Make the job wait for every expected partition (a sensor), not a fixed time.', 'Check completeness before publishing: expected sources, expected row counts.', 'Automatically re-run a day when its data lands late.'],
        },
        truth: { answer: num(trueD), trueD, dashD, avgPrev, broken, lateRows: cnt[D][broken], drop },
        answerQ: { value: trueD, money: false, blank: D, what: `the real number of orders on ${Df}`, sql: `SELECT COUNT(*) AS real_orders\nFROM orders\nWHERE DATE(created_at) = '${D}';` },
        checks: [
          { label: 'raw total for D matches truth', sql: `SELECT COUNT(*) FROM orders WHERE DATE(created_at) = '${D}'`, test: (v) => v[0][0] === trueD },
          { label: 'dashboard total for D matches truth', sql: `SELECT SUM(orders) FROM daily_orders WHERE day = '${D}'`, test: (v) => v[0][0] === dashD },
          { label: 'broken source missing from dashboard', sql: `SELECT COUNT(*) FROM daily_orders WHERE day = '${D}' AND source = '${broken}'`, test: (v) => v[0][0] === 0 },
          { label: 'only the broken partition landed after the job', sql: `SELECT p.source FROM partitions p JOIN job_runs j ON j.for_day = p.partition_date AND j.job = 'build_daily_orders' WHERE p.landed_at > j.started_at`, test: (v) => v.length === 1 && v[0][0] === broken },
          { label: 'job rows_read equals dashboard total', sql: `SELECT rows_read FROM job_runs WHERE job = 'build_daily_orders' AND for_day = '${D}'`, test: (v) => v[0][0] === dashD },
          { label: 'drop is big enough to notice (>= 15%)', sql: 'SELECT 1', test: () => drop >= 0.15 },
        ],
      };
    },
  };

  /* ============ Template 2: the double count (fan-out join) ============ */
  const fanout = {
    id: 'fanout',
    name: 'The Best Day Ever',
    pattern: 'Fan-out join (double counting)',
    build(t, { D, days, co, v }) {
      const prev = days.slice(0, -1);
      const cs = t.shuffle(COUNTRIES).slice(0, 5);
      const broken = cs[0][0]; const brokenName = cs[0][1];
      const target = 0.26 + t.r() * 0.18;
      const nCust = t.int(380, 720);
      const nC = Math.round(nCust * target);
      const otherW = weights(t, cs.map((c) => c[0]), broken, target);
      const plans = [['basic', 12], ['plus', 24], ['pro', 49]];
      const customers = [];
      for (let i = 0; i < nCust; i++) {
        let country;
        if (i < nC) country = broken;
        else { let x = t.r() * (1 - target); country = cs[cs.length - 1][0]; for (const c of cs.slice(1)) { x -= otherW[c[0]]; if (x <= 0) { country = c[0]; break; } } }
        const pr = t.r(); const plan = pr < 0.5 ? plans[0] : pr < 0.85 ? plans[1] : plans[2];
        customers.push({ id: 'C' + (10000 + i * 7 + t.int(0, 6)), country, plan: plan[0], price: plan[1] });
      }
      const shuffled = t.shuffle(customers);
      const dims = shuffled.map((c) => [c.id, c.country, c.plan, ts(addDays(D, -t.int(30, 400)), t.int(0, 23), t.int(0, 59), t.int(0, 59))]);
      const syncAt = ts(D, 23, t.int(41, 47), t.int(0, 59));
      for (const c of shuffled) if (c.country === broken) dims.push([c.id, c.country, c.plan, syncAt]);

      const base = t.int(co.scale[0], co.scale[1]);
      const orders = []; const fct = []; const byDay = {};
      let oid = 0;
      for (const d of days) {
        const n = Math.round(base * dayFactor(t, d));
        byDay[d] = { rows: 0, rev: 0, trueRev: 0, orders: n };
        for (let i = 0; i < n; i++) {
          const c = shuffled[Math.floor(t.r() * shuffled.length)];
          const amount = round2(c.price * co.mult * (0.7 + t.r() * 0.8));
          const id = co.prefix + '-' + (500000 + oid++);
          const at = ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59));
          orders.push([id, c.id, at, amount]);
          byDay[d].trueRev += amount;
          const copies = d === D && c.country === broken ? 2 : 1;
          for (let k = 0; k < copies; k++) { fct.push([id, d, c.id, c.country, c.plan, amount]); byDay[d].rows++; byDay[d].rev += amount; }
        }
      }
      orders.sort((a, b) => (a[2] < b[2] ? -1 : 1));
      const daily = days.map((d) => [d, byDay[d].rows, round2(byDay[d].rev)]);
      const trueRev = round2(byDay[D].trueRev); const dashRev = round2(byDay[D].rev);
      const avgPrev = round2(mean(prev.map((d) => byDay[d].rev)));
      const up = dashRev / avgPrev - 1;
      const dupOrders = byDay[D].rows - byDay[D].orders;

      const ticket = 'SALES-' + t.int(1200, 4800);
      const syncs = days.map((d) => [ts(d, 23, t.int(28, 33), t.int(0, 59)), 'changed customers', 'merge', t.int(4, 31)]);
      syncs.push([syncAt, `country = '${broken}' (full re-sync, ${ticket})`, 'insert', nC]);
      syncs.sort((a, b) => (a[0] < b[0] ? -1 : 1));

      const code = t.pick(['COZY15', 'HELLO10', 'TREAT20', 'WEEKEND12']);
      const promoUses = [addDays(D, -2), addDays(D, -1), D].map((d) => [d, code, Math.round(byDay[d].orders * (0.05 + t.r() * 0.03))]);
      const pricePlan = t.pick(['plus', 'pro']); const oldP = pricePlan === 'plus' ? 24 : 49;
      const priceRows = [[ts(addDays(D, -4), 11, t.int(0, 59), 0), addDays(D, 1), pricePlan, oldP, oldP + (pricePlan === 'plus' ? 3 : 5)]];

      const tables = [
        { name: 'orders', cols: [['order_id', 'TEXT'], ['customer_id', 'TEXT'], ['ordered_at', 'TEXT'], ['amount', 'REAL']], rows: orders },
        { name: 'dim_customers', cols: [['customer_id', 'TEXT'], ['country', 'TEXT'], ['plan', 'TEXT'], ['loaded_at', 'TEXT']], rows: dims },
        { name: 'fct_orders', cols: [['order_id', 'TEXT'], ['day', 'TEXT'], ['customer_id', 'TEXT'], ['country', 'TEXT'], ['plan', 'TEXT'], ['amount', 'REAL']], rows: fct },
        { name: 'daily_revenue', cols: [['day', 'TEXT'], ['orders', 'INTEGER'], ['revenue', 'REAL']], rows: daily },
        { name: 'crm_syncs', cols: [['started_at', 'TEXT'], ['scope', 'TEXT'], ['mode', 'TEXT'], ['rows_written', 'INTEGER']], rows: syncs },
        { name: 'promo_uses', cols: [['day', 'TEXT'], ['code', 'TEXT'], ['orders_using_code', 'INTEGER']], rows: promoUses },
        { name: 'price_changes', cols: [['announced_at', 'TEXT'], ['effective_from', 'TEXT'], ['plan', 'TEXT'], ['old_price', 'INTEGER'], ['new_price', 'INTEGER']], rows: priceRows },
      ];

      const Df = fmtDay(D); const Pf = fmtShort(addDays(D, -1)); const Ds = fmtShort(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: orders and revenue per day', sql: `SELECT day, orders, revenue\nFROM daily_revenue\nORDER BY day;` },
        { id: 'raw_vs', kind: 'Raw data', key: true, title: `Raw orders vs the dashboard, ${Df}`, sql: `SELECT 'raw orders' AS source, COUNT(*) AS orders,\n  ROUND(SUM(amount), 2) AS revenue\nFROM orders WHERE DATE(ordered_at) = '${D}'\nUNION ALL\nSELECT 'dashboard', orders, revenue\nFROM daily_revenue WHERE day = '${D}';`,
          voice: { who: 'gus', text: 'I joined the orders to the customers, like the spec says. I always join what I’m given.' } },
        { id: 'distinct', kind: 'Model', key: true, title: `Is any order in fct_orders twice on ${Df}?`, sql: `SELECT COUNT(*) AS rows,\n  COUNT(DISTINCT order_id) AS distinct_orders\nFROM fct_orders\nWHERE day = '${D}';` },
        { id: 'by_country', kind: 'Model', key: true, title: `Revenue by country, ${Pf} vs ${Ds}`, sql: `SELECT country,\n  ROUND(SUM(CASE WHEN day = '${addDays(D, -1)}' THEN amount END), 2) AS "${Pf}",\n  ROUND(SUM(CASE WHEN day = '${D}' THEN amount END), 2) AS "${Ds}"\nFROM fct_orders\nWHERE day >= '${addDays(D, -1)}'\nGROUP BY country\nORDER BY 3 DESC;` },
        { id: 'dims', kind: 'Model', key: true, title: 'Customers with more than one row in dim_customers', sql: `SELECT country, COUNT(*) AS dup_customers,\n  MAX(last_loaded) AS loaded_at\nFROM (\n  SELECT customer_id, country, MAX(loaded_at) AS last_loaded\n  FROM dim_customers\n  GROUP BY customer_id, country\n  HAVING COUNT(*) > 1\n)\nGROUP BY country;` },
        { id: 'crm', kind: 'Logs', key: true, title: 'CRM sync log, latest five', sql: `SELECT started_at, scope, mode, rows_written\nFROM crm_syncs\nORDER BY started_at DESC\nLIMIT 5;`,
          voice: { who: 'vendor', text: 'Sync completed successfully ✅. We are investigating any perceived discrepancies.' } },
        { id: 'promo', kind: 'Context', title: `How many orders used ${code}?`, sql: `SELECT day, code, orders_using_code\nFROM promo_uses\nORDER BY day;`,
          voice: { who: 'sam', text: `see?! people LOVE ${code}. putting this in my review fr` } },
        { id: 'price', kind: 'Context', title: 'Price changes', sql: `SELECT announced_at, effective_from, plan, old_price, new_price\nFROM price_changes;` },
        { id: 'big', kind: 'Raw data', title: `Biggest orders on ${Df}`, sql: `SELECT order_id, customer_id, amount\nFROM orders\nWHERE DATE(ordered_at) = '${D}'\nORDER BY amount DESC\nLIMIT 5;` },
      ];

      const cause = [
        opt('fan', `A CRM re-sync duplicated every ${brokenName} customer, so their orders were counted twice.`, true),
        opt('promo', `The ${code} promo brought in a real wave of extra orders from new and returning customers.`, false, `${code} was used on about ${num(promoUses[2][2])} orders on ${Df}, much like the two days before. And the raw orders table shows a normal day.`),
        opt('price', `The ${pricePlan} price rise lifted the value of every ${pricePlan} order, so revenue went up.`, false, `The new ${pricePlan} price only applies from ${fmtDay(addDays(D, 1))}. It can’t explain ${Df}.`),
        opt('big', 'A few very large orders from business customers pushed revenue up for the day.', false, 'The biggest orders that day are ordinary sizes. Something multiplied many normal orders instead.'),
      ];
      const wrongN = distractors(trueRev, [
        { v: dashRev, why: 'That’s the dashboard’s number, with the double counting still in it.' },
        { v: dashRev / 2, why: `Halving the dashboard assumes every order was doubled. Only ${brokenName} customers were.` },
        { v: avgPrev, why: 'That’s a normal day’s average, not what happened on ' + Df + '.' },
      ], 3);
      const numberQ = [opt('n_true', money(trueRev), true)].concat(wrongN.map((w, i) => opt('n_' + i, money(w.v), false, w.why)));

      return {
        valid: up >= 0.15,
        teaser: `${co.name}’s revenue jumped ${pct(up)} overnight. Too good to be true?`,
        reporter: 'sam',
        intro: [
          { who: 'alert', text: `daily_revenue for ${Df}: ${money(dashRev)} (+${pct(up)} vs 7-day average). All jobs: SUCCESS.` },
          { who: 'sam', text: v([`REVENUE UP ${pct(up)} YESTERDAY 🚀🚀 we are SO back. it’s ${code}, i called it`, `+${pct(up)} revenue!!! ${code} is officially the best code ever written. not SQL. the discount code`, `we’re up ${pct(up)}. i’m printing the chart and framing it`]) },
          { who: 'maya', text: v(['If it looks too good to be true… Check it before I put it in front of the board. One number, one sentence.', 'I love good news. I love checked good news more. Is this real?', 'Sam is already writing a LinkedIn post. Please tell me the real revenue before he hits publish.', 'Last time a number jumped like this, we had counted something twice. Prove me wrong.']) },
        ],
        tables, cards,
        chain: ['raw_vs', 'distinct', 'dims', 'crm'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `What was ${co.name}’s real revenue on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: v([`So not our best day: a normal one, counted twice in ${brokenName}. I’d rather know now than in the board meeting. Thank you.`, `A normal day, with ${brokenName} counted twice. Sam, unframe the chart. Fix the join and re-run. Thank you.`, `I’ll take boring and correct over exciting and wrong. Dedupe the customers and re-run the day. Thanks.`]) },
        lesson: {
          name: 'Fan-out join',
          what: 'The orders joined to a customer table that was no longer unique on customer_id. Every duplicated customer multiplied their orders. Nothing failed; the numbers just grew.',
          spot: ['After a join, compare COUNT(*) with COUNT(DISTINCT order_id).', 'Check that a dimension is unique on its key before you trust a join.', 'A sudden jump concentrated in one segment is a data smell.'],
          seen: 'A CRM re-import. A history table joined without its “is current” filter. A join someone thought was one-to-one that was quietly one-to-many.',
          prevent: ['Add a uniqueness test on dimension keys (dbt’s unique test) and fail the build on it.', 'Load dimensions with merge/upsert, never plain insert.', 'Assert that a fact table’s row count doesn’t change when you join a dimension to it.'],
        },
        truth: { answer: money(trueRev), trueRev, dashRev, avgPrev, broken, nC, dupOrders, up },
        answerQ: { value: trueRev, money: true, blank: 'orders', what: `the real revenue on ${Df}`, sql: `SELECT ROUND(SUM(amount), 2) AS real_revenue\nFROM orders\nWHERE DATE(ordered_at) = '${D}';` },
        checks: [
          { label: 'raw revenue for D matches truth', sql: `SELECT ROUND(SUM(amount), 2) FROM orders WHERE DATE(ordered_at) = '${D}'`, test: (v) => Math.abs(v[0][0] - trueRev) < 0.011 },
          { label: 'dashboard revenue for D matches truth', sql: `SELECT revenue FROM daily_revenue WHERE day = '${D}'`, test: (v) => Math.abs(v[0][0] - dashRev) < 0.011 },
          { label: 'duplicate fct rows equal broken-country orders', sql: `SELECT COUNT(*) - COUNT(DISTINCT order_id), (SELECT COUNT(*) FROM orders o JOIN (SELECT DISTINCT customer_id, country FROM dim_customers) c USING (customer_id) WHERE DATE(o.ordered_at) = '${D}' AND c.country = '${broken}') FROM fct_orders WHERE day = '${D}'`, test: (v) => v[0][0] === dupOrders && v[0][1] === dupOrders },
          { label: 'only broken-country customers are duplicated', sql: `SELECT country, COUNT(*) FROM (SELECT customer_id, country FROM dim_customers GROUP BY 1, 2 HAVING COUNT(*) > 1) GROUP BY country`, test: (v) => v.length === 1 && v[0][0] === broken && v[0][1] === nC },
          { label: 'no duplicates before D', sql: `SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM fct_orders WHERE day < '${D}'`, test: (v) => v[0][0] === 0 },
          { label: 'spike is big enough to notice (>= 15%)', sql: 'SELECT 1', test: () => up >= 0.15 },
        ],
      };
    },
  };

  /* ============ Template 3: schema drift ============ */
  const drift = {
    id: 'drift',
    name: 'The Vanishing Sign-ups',
    pattern: 'Schema drift',
    build(t, { D, days, co, v }) {
      const prev = days.slice(0, -1);
      const platforms = ['ios', 'android', 'web'];
      const P = t.pick(['ios', 'android']);
      const pShare = weights(t, platforms, P, 0.3 + t.r() * 0.14);
      const cs = t.shuffle(COUNTRIES).slice(0, 5);
      const cw = {}; { const w = cs.map(() => 0.5 + t.r()); const s = sum(w); cs.forEach((c, i) => { cw[c[0]] = w[i] / s; }); }
      const H = t.pick(cs); // the holiday country (a red herring)
      const major = t.int(5, 7), minor = t.int(10, 30);
      const vOld = `${major}.${minor}.${t.int(1, 4)}`; const vNew = `${major}.${minor + 1}.0`;
      const releaseAt = ts(addDays(D, -1), 21, t.int(0, 9), t.int(0, 59));
      const otherP = platforms.find((p) => p !== P && p !== 'web');
      const otherV = `${t.int(5, 7)}.${t.int(10, 30)}.${t.int(0, 3)}`;
      const webV = 'web-' + D.slice(0, 7).replace('-', '.');

      const base = t.int(co.scale[0], co.scale[1]);
      const raw = []; let eid = 0, uid = 0;
      for (const d of days) {
        const f = dayFactor(t, d);
        for (const p of platforms) {
          for (const c of cs) {
            let n = base * f * pShare[p] * cw[c[0]] * (0.93 + t.r() * 0.14);
            if (d === D && c[0] === H[0]) n *= 0.9; // a small, real holiday effect
            n = Math.max(1, Math.round(n));
            for (let i = 0; i < n; i++) {
              const at = ts(d, t.int(0, 23), t.int(0, 59), t.int(0, 59));
              let ver = p === 'web' ? webV : p === P ? vOld : otherV;
              if (p === P && at >= releaseAt && t.r() < 0.9) ver = vNew;
              const isNew = ver === vNew;
              const user = 'u' + (700000 + uid++ * 3);
              const plan = t.pick(['free', 'free', 'trial', 'paid']);
              const payload = isNew ? { user, country_code: c[0], plan, platform: p } : { user, country: c[0], plan, platform: p };
              raw.push(['', at, p, ver, isNew ? null : c[0], JSON.stringify(payload)]);
            }
          }
        }
      }
      raw.sort((a, b) => (a[1] < b[1] ? -1 : 1));
      raw.forEach((r, i) => { r[0] = 'evt_' + (1000000 + i); });

      const dashMap = {}; const trueBy = {}; const nullBy = {};
      for (const r of raw) {
        const d = r[1].slice(0, 10);
        trueBy[d] = (trueBy[d] || 0) + 1;
        if (r[4] == null) { nullBy[d] = (nullBy[d] || 0) + 1; continue; }
        const k = d + '|' + r[4]; dashMap[k] = (dashMap[k] || 0) + 1;
      }
      const dash = Object.keys(dashMap).sort().map((k) => { const [d, c] = k.split('|'); return [d, c, dashMap[k]]; });
      const dashBy = (d) => sum(dash.filter((r) => r[0] === d).map((r) => r[2]));
      const trueD = trueBy[D]; const dashD = dashBy(D); const nullD = nullBy[D] || 0;
      const avgPrev = Math.round(mean(prev.map(dashBy)));
      const drop = 1 - dashD / avgPrev;

      const releases = [
        [ts(addDays(D, -6), 15, t.int(0, 59), 0), P, vOld, 'Bug fixes and performance improvements'],
        [ts(addDays(D, -4), 12, t.int(0, 59), 0), 'web', webV, 'Faster sign-up page'],
        [ts(addDays(D, -3), 17, t.int(0, 59), 0), otherP, otherV, 'Fix a crash on the login screen'],
        [releaseAt, P, vNew, `Sign-up event sends ISO country as country_code (was country). MOB-${t.int(300, 990)}`],
      ];
      const holidays = [[D, H[0], 'Public holiday'], [addDays(D, -t.int(9, 20)), t.pick(cs)[0], 'Public holiday']];
      const spend = [];
      for (const d of [addDays(D, -2), addDays(D, -1), D]) {
        spend.push([d, 'paid_social', d === D ? t.int(15, 19) * 100 : t.int(20, 22) * 100]);
        spend.push([d, 'search', t.int(9, 11) * 100]);
      }
      const deploys = [
        [ts(D, t.int(10, 15), t.int(0, 59), 0), 'signup-api', t.pick(AUTHORS), 'Add a rate limit to password reset'],
        [ts(addDays(D, -2), t.int(10, 15), t.int(0, 59), 0), 'dbt-models', t.pick(AUTHORS), 'Rename staging folder'],
      ];
      const herring = t.pick(['spend', 'deploys']);

      const tables = [
        { name: 'raw_signups', cols: [['event_id', 'TEXT'], ['created_at', 'TEXT'], ['platform', 'TEXT'], ['app_version', 'TEXT'], ['country', 'TEXT'], ['payload', 'TEXT']], rows: raw },
        { name: 'countries', cols: [['code', 'TEXT'], ['name', 'TEXT']], rows: cs.map((c) => [c[0], c[1]]) },
        { name: 'daily_signups', cols: [['day', 'TEXT'], ['country', 'TEXT'], ['signups', 'INTEGER']], rows: dash },
        { name: 'app_releases', cols: [['released_at', 'TEXT'], ['platform', 'TEXT'], ['version', 'TEXT'], ['notes', 'TEXT']], rows: releases },
        { name: 'holidays', cols: [['day', 'TEXT'], ['country', 'TEXT'], ['name', 'TEXT']], rows: holidays },
      ];
      if (herring === 'spend') tables.push({ name: 'marketing_spend', cols: [['day', 'TEXT'], ['channel', 'TEXT'], ['spend', 'INTEGER']], rows: spend });
      else tables.push({ name: 'deploys', cols: [['deployed_at', 'TEXT'], ['service', 'TEXT'], ['author', 'TEXT'], ['description', 'TEXT']], rows: deploys });

      const Df = fmtDay(D); const Pf = fmtShort(addDays(D, -1)); const Ds = fmtShort(D);
      const cards = [
        { id: 'dash', kind: 'Dashboard', key: true, title: 'Dashboard: sign-ups per day', sql: `SELECT day, SUM(signups) AS signups\nFROM daily_signups\nGROUP BY day\nORDER BY day;`,
          voice: { who: 'gus', text: 'I join sign-ups to countries every night. A row with no country has no business on my dashboard.' } },
        { id: 'by_country', kind: 'Dashboard', key: true, title: `Dashboard by country, ${Pf} vs ${Ds}`, sql: `SELECT country,\n  SUM(CASE WHEN day = '${addDays(D, -1)}' THEN signups END) AS "${Pf}",\n  SUM(CASE WHEN day = '${D}' THEN signups END) AS "${Ds}"\nFROM daily_signups\nWHERE day >= '${addDays(D, -1)}'\nGROUP BY country\nORDER BY 2 DESC;` },
        { id: 'raw_ver', kind: 'Raw data', key: true, title: `Raw sign-up events for ${Df}, by app version`, sql: `SELECT platform, app_version, COUNT(*) AS events,\n  SUM(country IS NULL) AS no_country\nFROM raw_signups\nWHERE DATE(created_at) = '${D}'\nGROUP BY platform, app_version\nORDER BY events DESC;` },
        { id: 'payload', kind: 'Raw data', key: true, title: `One raw event from ${P} ${vOld} and one from ${vNew}`, sql: `SELECT * FROM (\n  SELECT app_version, country, payload FROM raw_signups\n  WHERE app_version = '${vOld}' AND platform = '${P}' LIMIT 1)\nUNION ALL\nSELECT * FROM (\n  SELECT app_version, country, payload FROM raw_signups\n  WHERE app_version = '${vNew}' LIMIT 1);` },
        { id: 'releases', kind: 'Logs', key: true, title: 'App releases this week', sql: `SELECT released_at, platform, version, notes\nFROM app_releases\nORDER BY released_at;` },
        { id: 'holidays', kind: 'Context', title: 'Public holidays', sql: `SELECT h.day, c.name AS country, h.name\nFROM holidays h JOIN countries c ON c.code = h.country\nORDER BY h.day DESC;`,
          voice: { who: 'sam', text: `a holiday in ${H[1]}!! mystery solved. can i go back to bed now` } },
        herring === 'spend'
          ? { id: 'spend', kind: 'Context', title: 'Marketing spend, last three days', sql: `SELECT day, channel, spend\nFROM marketing_spend\nORDER BY day, channel;` }
          : { id: 'deploys', kind: 'Context', title: 'Deploys this week', sql: `SELECT deployed_at, service, author, description\nFROM deploys\nORDER BY deployed_at;` },
      ];

      const cause = [
        opt('drift', `The ${P} app ${vNew} renamed the country field, so those sign-ups have no country and the dashboard drops them.`, true),
        opt('holiday', `The public holiday in ${H[1]} kept people away, and sign-ups fell as a result.`, false, `The holiday was only in ${H[1]}, but sign-ups fell in every country. And the raw table has ${num(trueD)} sign-up events for ${Df}.`),
        herring === 'spend'
          ? opt('spend', 'Marketing cut paid social spend, so fewer people found the app and signed up.', false, 'Spend dipped a little, but the raw events show people signed up as usual. The drop is on the dashboard, not in the real world.')
          : opt('deploy', `The signup-api deploy on ${Df} added a rate limit that blocked some sign-ups.`, false, 'That change only touched password resets, and the raw events show sign-ups arriving as usual.'),
        opt('outage', `The ${P} app crashed after the ${vNew} release, so nobody on ${P} could sign up.`, false, `Raw events show plenty of ${P} sign-ups on ${Df}. They arrived. They just had no country.`),
      ];
      const wrongN = distractors(trueD, [
        { v: dashD, why: 'That’s the dashboard’s number, missing every sign-up without a country.' },
        { v: avgPrev, why: 'That’s a normal day’s average, not what happened on ' + Df + '.' },
        { v: trueD + nullD, why: 'That counts the sign-ups without a country twice.' },
      ], 3);
      const numberQ = [opt('n_true', num(trueD), true)].concat(wrongN.map((w, i) => opt('n_' + i, num(w.v), false, w.why)));

      return {
        valid: drop >= 0.15,
        teaser: `${co.name}’s sign-ups fell ${pct(drop)} yesterday. Marketing blames a holiday.`,
        reporter: 'maya',
        intro: [
          { who: 'alert', text: `daily_signups for ${Df}: ${num(dashD)} (−${pct(drop)} vs 7-day average). All jobs: SUCCESS.` },
          { who: 'maya', text: v([`Sign-ups fell ${pct(drop)} yesterday. Marketing says it’s the holiday in ${H[1]} and wants to pause spend everywhere. Before anyone does anything: is it real? One number, one sentence.`, `Marketing wants to pause all spend because sign-ups fell ${pct(drop)}. That costs real money either way. Is the drop real?`, `I’m about to approve a budget freeze based on one chart. Convince me the chart is right. Or wrong.`, `${pct(drop)} fewer sign-ups, and everyone has a theory. I’d like a fact instead. Before 9, please.`]) },
          { who: 'sam', text: v(['drafting an apology to investors rn. jk. unless?? 💀', `it’s the ${H[1]} holiday. has to be. nobody signs up on a holiday right`, 'sign-ups down?? did the button break again. please say the button broke']) },
        ],
        tables, cards,
        chain: ['by_country', 'raw_ver', 'payload', 'releases'],
        questions: [
          { id: 'cause', prompt: 'What happened?', options: cause },
          { id: 'number', prompt: `How many people really signed up on ${Df}?`, options: numberQ },
        ],
        closing: { who: 'maya', text: v([`So nobody stopped signing up; we stopped counting them. Tell marketing to keep the budget, and get the ${P} team and data team in one room. Thank you.`, `So the users are real; our join dropped them. Keep the budget, fix the join on country, and add a check for NULLs. Thank you.`, `Good, no freeze. The ${P} release and the dashboard need to talk to each other more. Thanks.`]) },
        lesson: {
          name: 'Schema drift',
          what: 'An upstream producer renamed a field. Nothing errored: the old column just became NULL, and an inner join quietly dropped those rows.',
          spot: ['Track the NULL rate of key columns per source and version.', 'Compare rows in with rows out at every join.', 'A drop spread evenly across every segment points at the pipeline, not the world.'],
          seen: 'A mobile release renames a field. A vendor reorders the columns in a CSV. An API starts sending prices as text instead of numbers.',
          prevent: ['Agree a data contract (schema) with producers and check it at ingestion.', 'Alert when a column’s NULL rate jumps.', 'Never drop unmatched rows silently: send them to an “unknown” bucket you watch.'],
        },
        truth: { answer: num(trueD), trueD, dashD, nullD, avgPrev, P, vNew, drop },
        answerQ: { value: trueD, money: false, blank: 'raw_signups', what: `the real number of sign-ups on ${Df}`, sql: `SELECT COUNT(*) AS real_signups\nFROM raw_signups\nWHERE DATE(created_at) = '${D}';` },
        checks: [
          { label: 'raw events for D match truth', sql: `SELECT COUNT(*) FROM raw_signups WHERE DATE(created_at) = '${D}'`, test: (v) => v[0][0] === trueD },
          { label: 'dashboard for D matches truth', sql: `SELECT SUM(signups) FROM daily_signups WHERE day = '${D}'`, test: (v) => v[0][0] === dashD },
          { label: 'missing = NULL-country events', sql: `SELECT SUM(country IS NULL) FROM raw_signups WHERE DATE(created_at) = '${D}'`, test: (v) => v[0][0] === trueD - dashD },
          { label: 'only the new version has NULL country', sql: `SELECT DISTINCT app_version FROM raw_signups WHERE country IS NULL`, test: (v) => v.length === 1 && v[0][0] === vNew },
          { label: 'country_code is in the new payloads', sql: `SELECT COUNT(*) FROM raw_signups WHERE app_version = '${vNew}' AND json_extract(payload, '$.country_code') IS NULL`, test: (v) => v[0][0] === 0 },
          { label: 'every country fell', sql: `SELECT COUNT(*) FROM (SELECT country, SUM(CASE WHEN day = '${addDays(D, -1)}' THEN signups END) a, SUM(CASE WHEN day = '${D}' THEN signups END) b FROM daily_signups GROUP BY country) WHERE b >= a`, test: (v) => v[0][0] === 0 },
          { label: 'drop is big enough to notice (>= 15%)', sql: 'SELECT 1', test: () => drop >= 0.15 },
        ],
      };
    },
  };

  TAI.TEMPLATES.push(late, fanout, drift);
})();
