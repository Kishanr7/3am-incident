"use strict";
/* ---------- deterministic fictional world ---------- */
const SEED = 20260315;
const DAYS = Array.from({length: 14}, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`);
const INCIDENT_DAY = "2026-03-14";
const CUR = [
  {c: "USD", share: .55, mean: 52, countries: ["US"], rate: 1},
  {c: "EUR", share: .24, mean: 47, countries: ["DE", "FR", "NL", "ES"], rate: 1.084},
  {c: "GBP", share: .13, mean: 41, countries: ["GB"], rate: 1.268},
  {c: "INR", share: .08, mean: 3600, countries: ["IN"], rate: 0.01201},
];
const MISSING = ["EUR", "GBP"];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pad = (n, w = 2) => String(n).padStart(w, "0");
const nextDay = d => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };

const MODEL_V11 = `-- fct_daily_revenue v11 (2026-01-20, maria.k)
INSERT INTO fct_daily_revenue
SELECT o.order_date,
       COUNT(*) AS orders,
       ROUND(SUM(o.amount_local * COALESCE(
         f.usd_per_unit,
         -- FX not loaded yet? fall back to the latest earlier rate
         (SELECT p.usd_per_unit FROM fx_rates p
           WHERE p.currency = o.currency AND p.rate_date < o.order_date
           ORDER BY p.rate_date DESC LIMIT 1)
       )), 2) AS revenue_usd
FROM stg_orders o
LEFT JOIN fx_rates f
  ON f.currency = o.currency AND f.rate_date = o.order_date
WHERE o.status = 'paid' AND o.order_date = '{{ run_date }}'
GROUP BY o.order_date;`;

const MODEL_V12 = `-- fct_daily_revenue v12 (2026-03-13, akhil.r)
-- refactor: simplify FX conversion, drop slow fallback subquery
INSERT INTO fct_daily_revenue
SELECT o.order_date,
       COUNT(*) AS orders,
       ROUND(SUM(o.amount_local * f.usd_per_unit), 2) AS revenue_usd
FROM stg_orders o
JOIN fx_rates f
  ON f.currency = o.currency AND f.rate_date = o.order_date
WHERE o.status = 'paid' AND o.order_date = '{{ run_date }}'
GROUP BY o.order_date;`;

const SCHEMA_SQL = `
CREATE TABLE raw_order_events (event_id TEXT, order_id TEXT, event_ts TEXT, currency TEXT, amount_local REAL, status TEXT, country TEXT);
CREATE TABLE stg_orders (order_id TEXT PRIMARY KEY, order_date TEXT, currency TEXT, amount_local REAL, status TEXT, country TEXT);
CREATE TABLE fx_rates (rate_date TEXT, currency TEXT, usd_per_unit REAL, loaded_at TEXT);
CREATE TABLE fx_landing (file_name TEXT, rate_date TEXT, currency TEXT, usd_per_unit REAL);
CREATE TABLE source_files (file_name TEXT, source TEXT, arrived_at TEXT, expected_rows INTEGER, loaded_rows INTEGER, status TEXT);
CREATE TABLE pipeline_runs (run_id TEXT, job_name TEXT, run_date TEXT, started_at TEXT, finished_at TEXT, status TEXT, rows_in INTEGER, rows_out INTEGER, message TEXT);
CREATE TABLE deploys (deploy_id TEXT, deployed_at TEXT, author TEXT, repo TEXT, message TEXT);
CREATE TABLE model_versions (model_name TEXT, version INTEGER, deployed_at TEXT, author TEXT, sql_text TEXT);
CREATE TABLE fct_daily_revenue (revenue_date TEXT, orders INTEGER, revenue_usd REAL);`;

const TABLE_DESC = {
  fct_daily_revenue: "What the exec dashboard reads. One row per day.",
  stg_orders: "Cleaned orders, one row per order (deduplicated).",
  raw_order_events: "Raw order events from the app. May contain duplicates.",
  fx_rates: "Daily FX rates used to convert to USD.",
  fx_landing: "FX vendor files as received, before loading.",
  source_files: "Every file that landed, and how much of it was loaded.",
  pipeline_runs: "Nightly job log. Status, row counts, messages.",
  deploys: "Code deploys to the data repos.",
  model_versions: "SQL of each version of the warehouse models.",
};

function buildWorld(SQL) {
  const rnd = mulberry32(SEED);
  const db = new SQL.Database();
  db.run(SCHEMA_SQL);
  db.run("BEGIN");
  const insEv = db.prepare("INSERT INTO raw_order_events VALUES (?,?,?,?,?,?,?)");
  const insFx = db.prepare("INSERT INTO fx_rates VALUES (?,?,?,?)");
  const insFile = db.prepare("INSERT INTO source_files VALUES (?,?,?,?,?,?)");
  const insRun = db.prepare("INSERT INTO pipeline_runs VALUES (?,?,?,?,?,?,?,?,?)");
  let ev = 0, ord = 0, run = 0;
  const rates = {};
  const stats = {};
  for (const [di, day] of DAYS.entries()) {
    const dow = new Date(day + "T00:00:00Z").getUTCDay();
    const n = Math.round(900 * (dow === 0 || dow === 6 ? 1.12 : 1) * (0.95 + rnd() * 0.1));
    let events = 0, dups = 0;
    for (let i = 0; i < n; i++) {
      let r = rnd(), cur = CUR[0];
      for (const c of CUR) { if (r < c.share) { cur = c; break; } r -= c.share; }
      const amount = Math.round(cur.mean * (0.35 + 1.3 * ((rnd() + rnd() + rnd()) / 3)) * 100) / 100;
      const status = rnd() < 0.94 ? "paid" : "refunded";
      const country = cur.countries[Math.floor(rnd() * cur.countries.length)];
      const secs = Math.floor(rnd() * 86000);
      const ts = `${day} ${pad(Math.floor(secs / 3600))}:${pad(Math.floor(secs / 60) % 60)}:${pad(secs % 60)}`;
      const oid = `ord_${pad(++ord, 6)}`;
      insEv.run([`ev_${pad(++ev, 7)}`, oid, ts, cur.c, amount, status, country]); events++;
      if (rnd() < 0.03) {
        const s2 = Math.min(secs + 1 + Math.floor(rnd() * 90), 86399);
        const ts2 = `${day} ${pad(Math.floor(s2 / 3600))}:${pad(Math.floor(s2 / 60) % 60)}:${pad(s2 % 60)}`;
        insEv.run([`ev_${pad(++ev, 7)}`, oid, ts2, cur.c, amount, status, country]); events++; dups++;
      }
    }
    // FX rates for the day
    rates[day] = {};
    for (const c of CUR) {
      const prev = di ? rates[DAYS[di - 1]][c.c] : c.rate;
      rates[day][c.c] = c.c === "USD" ? 1 : Math.round(prev * (1 + (rnd() - 0.5) * 0.006) * 1e6) / 1e6;
    }
    const nd = nextDay(day);
    const fxCur = day === INCIDENT_DAY ? CUR.filter(c => !MISSING.includes(c.c)) : CUR;
    const fxArr = day === INCIDENT_DAY ? `${nd} 00:48:02` : `${nd} 00:4${Math.floor(rnd() * 5)}:${pad(Math.floor(rnd() * 60))}`;
    for (const c of fxCur) insFx.run([day, c.c, rates[day][c.c], `${nd} 00:50:${pad(10 + Math.floor(rnd() * 40))}`]);
    insFile.run([`orders_events_${day}.jsonl`, "app", `${nd} 00:2${Math.floor(rnd() * 9)}:${pad(Math.floor(rnd() * 60))}`, events, events, "LOADED"]);
    insFile.run([`fx_rates_${day}.csv`, "fx-vendor", fxArr, 4, fxCur.length, "LOADED"]);
    stats[day] = {events, dups, fxRows: fxCur.length};
  }
  insEv.free(); insFx.free(); insFile.free();
  // the vendor re-sent a complete file after the nightly run
  const late = rates[INCIDENT_DAY];
  db.run("INSERT INTO source_files VALUES (?,?,?,?,?,?)", [`fx_rates_${INCIDENT_DAY}_v2.csv`, "fx-vendor", `${nextDay(INCIDENT_DAY)} 02:41:17`, 4, 0, "RECEIVED"]);
  for (const c of CUR) {
    if (!MISSING.includes(c.c)) db.run("INSERT INTO fx_landing VALUES (?,?,?,?)", [`fx_rates_${INCIDENT_DAY}.csv`, INCIDENT_DAY, c.c, late[c.c]]);
  }
  for (const c of CUR) db.run("INSERT INTO fx_landing VALUES (?,?,?,?)", [`fx_rates_${INCIDENT_DAY}_v2.csv`, INCIDENT_DAY, c.c, late[c.c]]);

  db.run(`INSERT INTO stg_orders SELECT order_id, substr(MIN(event_ts), 1, 10), currency, amount_local, status, country
          FROM raw_order_events GROUP BY order_id`);

  // run the models, exactly as the warehouse would
  for (const day of DAYS) {
    const sql = (day >= "2026-03-13" ? MODEL_V12 : MODEL_V11).replace("{{ run_date }}", day);
    db.run(sql);
  }
  for (const day of DAYS) {
    const nd = nextDay(day), s = stats[day];
    const stg = db.exec(`SELECT COUNT(*) FROM stg_orders WHERE order_date='${day}'`)[0].values[0][0];
    const paid = db.exec(`SELECT COUNT(*) FROM stg_orders WHERE order_date='${day}' AND status='paid'`)[0].values[0][0];
    const fct = db.exec(`SELECT orders FROM fct_daily_revenue WHERE revenue_date='${day}'`)[0].values[0][0];
    const jobs = [
      ["ingest_orders", "00:30", "00:33", s.events, s.events, `ingested ${s.events} events`],
      ["load_fx_rates", "00:50", "00:50", s.fxRows, s.fxRows, `loaded ${s.fxRows} rates`],
      ["build_stg_orders", "00:55", "00:56", s.events, stg, `removed ${s.dups} duplicate events`],
      ["build_fct_daily_revenue", "01:00", "01:01", paid, fct, "ok"],
    ];
    for (const [job, st, fin, ri, ro, msg] of jobs) {
      insRun.run([`run_${pad(++run, 4)}`, job, day, `${nd} ${st}:${pad(Math.floor(rnd() * 50))}`, `${nd} ${fin}:${pad(10 + Math.floor(rnd() * 49))}`, "SUCCESS", ri, ro, msg]);
    }
  }
  insRun.free();
  const deploys = [
    ["d-1a9e04", "2026-03-03 10:12:44", "jen.m", "dashboards", "Add week-over-week sparkline to exec revenue tile"],
    ["d-52c7b1", "2026-03-06 16:30:09", "akhil.r", "pipelines", "build_stg_orders: dedupe on order_id instead of event_id"],
    ["d-8d03fa", "2026-03-10 11:05:51", "jen.m", "dashboards", "Change revenue tile colour thresholds"],
    ["d-7f3c2a", "2026-03-13 18:40:26", "akhil.r", "pipelines", "refactor(fct_daily_revenue): simplify FX conversion, drop slow fallback subquery (perf)"],
    ["d-c41e77", "2026-03-14 09:15:03", "ops-bot", "infra", "Rotate warehouse service credentials"],
  ];
  for (const d of deploys) db.run("INSERT INTO deploys VALUES (?,?,?,?,?)", d);
  db.run("INSERT INTO model_versions VALUES (?,?,?,?,?)", ["stg_orders", 4, "2026-03-06 16:30:09", "akhil.r",
    "-- stg_orders v4\nINSERT INTO stg_orders\nSELECT order_id, substr(MIN(event_ts),1,10), currency, amount_local, status, country\nFROM raw_order_events\nGROUP BY order_id;"]);
  db.run("INSERT INTO model_versions VALUES (?,?,?,?,?)", ["fct_daily_revenue", 11, "2026-01-20 14:02:11", "maria.k", MODEL_V11]);
  db.run("INSERT INTO model_versions VALUES (?,?,?,?,?)", ["fct_daily_revenue", 12, "2026-03-13 18:40:26", "akhil.r", MODEL_V12]);
  db.run("COMMIT");

  // answer key, computed from the same data the player sees
  const q = s => db.exec(s)[0].values[0][0];
  const dash = q(`SELECT revenue_usd FROM fct_daily_revenue WHERE revenue_date='${INCIDENT_DAY}'`);
  const avg = q(`SELECT AVG(revenue_usd) FROM fct_daily_revenue WHERE revenue_date < '${INCIDENT_DAY}'`);
  const truth = q(`SELECT ROUND(SUM(o.amount_local * l.usd_per_unit), 2) FROM stg_orders o
                   JOIN fx_landing l ON l.currency = o.currency AND l.file_name = 'fx_rates_${INCIDENT_DAY}_v2.csv'
                   WHERE o.status='paid' AND o.order_date='${INCIDENT_DAY}'`);
  const lostOrders = q(`SELECT COUNT(*) FROM stg_orders WHERE status='paid' AND order_date='${INCIDENT_DAY}' AND currency IN ('EUR','GBP')`);
  // common wrong answers, so feedback can say *why* a number is wrong
  const otherDays = db.exec(`SELECT revenue_date, revenue_usd FROM fct_daily_revenue WHERE revenue_date <> '${INCIDENT_DAY}'`)[0].values;
  const localSum = q(`SELECT SUM(amount_local) FROM stg_orders WHERE status='paid' AND order_date='${INCIDENT_DAY}'`);
  const withRefunds = q(`SELECT SUM(o.amount_local * l.usd_per_unit) FROM stg_orders o
                         JOIN fx_landing l ON l.currency = o.currency AND l.file_name = 'fx_rates_${INCIDENT_DAY}_v2.csv'
                         WHERE o.order_date='${INCIDENT_DAY}'`);
  const rawDup = q(`SELECT SUM(e.amount_local * l.usd_per_unit) FROM raw_order_events e
                    JOIN fx_landing l ON l.currency = e.currency AND l.file_name = 'fx_rates_${INCIDENT_DAY}_v2.csv'
                    WHERE e.status='paid' AND substr(e.event_ts,1,10)='${INCIDENT_DAY}'`);
  return {db, key: {dash, avg, truth, lostOrders, drop: 1 - dash / avg, otherDays, localSum, withRefunds, rawDup}};
}

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const money = n => "$" + Number(n).toLocaleString("en-US", {maximumFractionDigits: 0});
let SQLLIB, world, started = 0, penalty = 0, queries = 0, hints = 0, solved = false, submits = 0;
const firstTry = {};
const HINTS = [
  "Every job says SUCCESS. Don't trust the status: compare <code>rows_in</code> and <code>rows_out</code> in <code>pipeline_runs</code> across days.",
  "Look at <code>stg_orders</code> for 2026-03-14 by currency, then at <code>fx_rates</code> for the same day. What's missing? <code>source_files</code> knows why.",
  "Something changed in the revenue model on 13 March. Compare the two versions in <code>model_versions</code>. What does an inner join do to a row with no matching rate?",
  "For the true number: run the old model's <code>SELECT … GROUP BY</code> (v11) with <code>2026-03-14</code> in place of <code>{{ run_date }}</code>, or join <code>stg_orders</code> to the complete late file in <code>fx_landing</code>.",
];

function post(who, cls, text, t, fresh) {
  const d = document.createElement("div");
  d.className = `msg ${cls}${fresh ? " new" : ""}`;
  d.innerHTML = `<div><span class="who">${esc(who)}</span><span class="t">${t}</span></div><p>${text}</p>`;
  $("feed").appendChild(d);
  d.scrollIntoView({block: "nearest"});
}

function story() {
  const k = world.key;
  post("revenue-monitor", "alert", `🔴 <b>fct_daily_revenue</b>: 2026-03-14 revenue <b>${money(k.dash)}</b> is <b>${Math.round(k.drop * 100)}% below</b> the 13-day average (${money(k.avg)}).`, "03:02");
  post("Maya (CFO)", "boss", `Just saw the alert. The dashboard says ${money(k.dash)} for yesterday. We normally do ${money(Math.round(k.avg / 1000) * 1000)}. The board deck goes out at 9. Is this real, or is it us?`, "03:04");
  post("Sam (Growth)", "boss", `Ads ran as normal yesterday, no outages on our side. If sales really fell ${Math.round(k.drop * 100)}% I need to know before Europe wakes up.`, "03:05");
  post("you (on call)", "you", "Looking now. All nightly jobs show green, which is either good news or bad news.", "03:06");
}

function renderSchema() {
  const tables = world.db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0].values.map(r => r[0]);
  const order = Object.keys(TABLE_DESC);
  tables.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  $("schema").innerHTML = tables.map(t => {
    const cols = world.db.exec(`PRAGMA table_info(${t})`)[0].values.map(r => `${esc(r[1])} <i>${esc(r[2].toLowerCase())}</i>`);
    return `<details><summary>${esc(t)}</summary><div class="desc">${esc(TABLE_DESC[t] || "")}</div><ul>${cols.map(c => `<li>${c}</li>`).join("")}</ul>
      <button class="btn peek" data-t="${esc(t)}">Peek at rows</button></details>`;
  }).join("");
  $("schema").querySelectorAll(".peek").forEach(b => b.addEventListener("click", () => {
    $("sql").value = `SELECT * FROM ${b.dataset.t} LIMIT 20;`; runQuery(); $("sql").focus();
  }));
}

function runQuery() {
  const sql = $("sql").value.trim();
  if (!sql) return;
  queries++; $("qcount").textContent = queries;
  const t0 = performance.now();
  try {
    const res = world.db.exec(sql);
    const ms = Math.round(performance.now() - t0);
    if (!res.length) { $("out").innerHTML = `<div class="result-meta">OK · no rows returned · ${ms} ms</div>`; return; }
    const r = res[res.length - 1], shown = r.values.slice(0, 200);
    const wide = r.columns.map(c => c === "sql_text" || c === "message");
    $("out").innerHTML = `<div class="result-meta">${r.values.length} row${r.values.length === 1 ? "" : "s"}${r.values.length > 200 ? " (showing 200)" : ""} · ${ms} ms</div>
      <div class="tablewrap"><table><thead><tr>${r.columns.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${shown.map(row => `<tr>${row.map((v, i) => `<td${wide[i] ? ' class="wrap"' : ""}>${v === null ? '<i style="opacity:.6">NULL</i>' : esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  } catch (e) {
    $("out").innerHTML = `<div class="err">${esc(e.message)}</div>`;
  }
}

function tick() {
  const s = Math.floor((Date.now() - started) / 1000) + penalty;
  $("clock").textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  return s;
}

function check(e) {
  e.preventDefault();
  if (solved) return;
  submits++;
  const f = $("report"), k = world.key;
  const val = n => (f.querySelector(`input[name=${n}]:checked`) || {}).value;
  const q2 = [...f.querySelectorAll("input[name=q2]:checked")].map(i => i.value).sort().join(",");
  const raw = $("q4").value.replace(/[$,\s]/g, "");
  const n = parseFloat(raw);
  const results = {
    1: val("q1") === "data",
    2: q2 === MISSING.slice().sort().join(","),
    3: val("q3") === "fxjoin",
    4: Number.isFinite(n) && Math.abs(n - k.truth) / k.truth <= 0.02,
  };
  const msgs = {
    1: ["Right. Real sales look normal.", "Check the raw orders. Did customers really buy less?"],
    2: ["Right.", "Compare what's in stg_orders with what reached the dashboard, by currency."],
    3: ["Right. Two harmless-looking things combined.", "Not quite. Which explanation fits every clue, including the timing?"],
    4: [`Right (true value ${money(k.truth)}).`, q4Feedback(n, k)],
  };
  for (const i of [1, 2, 3, 4]) {
    if (!(i in firstTry)) firstTry[i] = results[i];
    const v = $("v" + i);
    v.textContent = results[i] ? msgs[i][0] : msgs[i][1];
    v.className = "verdict " + (results[i] ? "ok" : "bad");
  }
  $("tries").textContent = `Reports sent: ${submits}`;
  if (Object.values(results).every(Boolean)) finish();
  else post("Maya (CFO)", "boss", "That doesn't add up yet. What am I missing?", "03:" + pad(Math.min(59, 6 + Math.floor(tick() / 60))), true);
}

function q4Feedback(n, k) {
  if (!Number.isFinite(n)) return "Enter a number in USD, e.g. 51234.56.";
  const near = (a, tol = 0.005) => Math.abs(n - a) <= Math.abs(a) * tol + 0.5;
  if (near(k.dash)) return "That's the broken number the dashboard shows. What should it have been?";
  const day = k.otherDays.find(([, rev]) => Math.abs(n - rev) <= 1);  // copied from the table, so near-exact
  if (day) return `That's the dashboard figure for ${day[0]}. The incident day is 14 March.`;
  if (near(k.localSum, 0.01)) return "Those are local-currency amounts added together. Convert each order to USD first.";
  if (near(k.withRefunds)) return "Close, but that includes refunded orders. Revenue counts paid orders only.";
  if (near(k.rawDup)) return "Close, but that counts duplicate raw events. Use the deduplicated orders.";
  if (n < k.dash) return "Lower than the broken number. The true figure must add back the orders that went missing.";
  return "Not close enough. Every paid order on 14 March, converted to USD. Which rates should the EUR and GBP orders use?";
}

function finish() {
  solved = true;
  if (window.taiCount) taiCount("solved-case-1");
  const s = tick(), k = world.key;
  clearInterval(window._clk);
  const mm = `${Math.floor(s / 60)}m ${pad(s % 60)}s`;
  const squares = [1, 2, 3, 4].map(i => firstTry[i] ? "🟩" : "🟨").join("");
  const share = `🕒 3 a.m. Incident · Case #1\nSolved in ${mm} · ${queries} queries · ${hints} hint${hints === 1 ? "" : "s"}\n${squares}`;
  $("done-clock").textContent = pad(Math.min(59, 6 + Math.floor(s / 60)));
  $("done-head").textContent = s < 15 * 60 ? "Board deck saved with time to spare." : "Board deck saved. Coffee earned.";
  $("share").textContent = share;
  $("debrief").innerHTML = `
    <h3>What happened</h3>
    <p>The FX vendor's nightly file for 14 March arrived with only 2 of 4 currencies (USD, INR). Every job still reported <b>SUCCESS</b>.</p>
    <p>On its own that was harmless: revenue model v11 fell back to the previous day's rate when one was missing. But on the evening of 13 March, a performance refactor (v12, deploy <code>d-7f3c2a</code>) replaced the <code>LEFT JOIN</code> and fallback with a plain <code>JOIN</code>. Every EUR and GBP order with no rate simply vanished: <b>${k.lostOrders.toLocaleString("en-US")} orders</b>, about <b>${money(k.truth - k.dash)}</b>.</p>
    <p>The complete file arrived at 02:41, after the nightly run. True revenue was <b>${money(k.truth)}</b>, a normal Saturday.</p>
    <h3>What a senior engineer does next</h3>
    <ul>
      <li><b>Tonight:</b> load <code>fx_rates_2026-03-14_v2.csv</code>, re-run the revenue model for 14 March, and tell Maya the number is fixed and why.</li>
      <li><b>Completeness check:</b> FX load fails if <code>loaded_rows &lt; expected_rows</code> (the evidence was in <code>source_files</code> all along).</li>
      <li><b>Reconciliation test:</b> <code>build_fct_daily_revenue</code> fails when <code>rows_out ≠ rows_in</code>. Green status meant "the SQL ran", not "the number is right".</li>
      <li><b>Semantic diffs for refactors:</b> a "perf only" change must produce identical output on past days, including days with missing rates, before it ships.</li>
      <li><b>Keep the fallback, but make it loud:</b> using yesterday's rate is fine; doing it silently is not.</li>
    </ul>
    <p style="color:var(--mute);font-size:.85rem">Fictional company, fictional people, generated data. The failure pattern is real.</p>`;
  $("done").classList.add("show");
  $("copy").focus();
}

function boot() {
  initSqlJs({locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`}).then(SQL => {
    SQLLIB = SQL;
    world = buildWorld(SQL);
    $("boot").hidden = true; $("app").hidden = false; $("foot").hidden = false;
    story(); renderSchema();
    $("sql").value = "-- Start where the alarm is. Ctrl+Enter runs.\nSELECT * FROM fct_daily_revenue ORDER BY revenue_date DESC;";
    started = Date.now();
    window._clk = setInterval(tick, 1000);
    setTimeout(() => { if (!solved) post("Maya (CFO)", "boss", "Any update? Even a partial answer helps me plan the morning.", "03:14", true); }, 8 * 60 * 1000);
    window.__incident = {key: world.key, db: world.db};
  }).catch(err => {
    $("boot").innerHTML = `The SQL engine could not load (${esc(err && err.message || err)}). This game needs an internet connection once, to download SQLite for the browser from cdnjs.`;
  });
}

$("run").addEventListener("click", runQuery);
$("sql").addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
});
$("reset").addEventListener("click", () => {
  if (!confirm("Rebuild the warehouse? Your progress on the report is kept.")) return;
  world.db.close(); world = buildWorld(SQLLIB); window.__incident = {key: world.key, db: world.db};
  $("out").innerHTML = '<div class="result-meta">Warehouse rebuilt.</div>';
});
$("hintbtn").addEventListener("click", () => {
  if (hints >= HINTS.length) return;
  const p = document.createElement("p"); p.innerHTML = `<b>${hints + 1}.</b> ${HINTS[hints]}`;
  $("hintlist").appendChild(p);
  hints++; penalty += 120; $("hcount").textContent = hints; tick();
  if (hints >= HINTS.length) $("hintbtn").disabled = true;
});
$("report").addEventListener("submit", check);
$("copy").addEventListener("click", () => {
  const txt = $("share").textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
    () => { $("copied").textContent = "Copied."; },
    () => { $("copied").textContent = "Select the text above and copy it."; });
});
$("close").addEventListener("click", () => { $("done").classList.remove("show"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("done").classList.remove("show"); });
if (typeof initSqlJs === "function") boot();
else $("boot").textContent = "The SQL engine could not load. This game needs an internet connection once, to download SQLite for the browser from cdnjs.";
