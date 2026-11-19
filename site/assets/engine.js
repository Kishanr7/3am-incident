/* 3 a.m. Incident: daily case engine.
   Pure functions: seeded randomness, dates, building a case's SQLite database,
   streaks kept in this browser. No network, no tracking. */
(function () {
  'use strict';
  const TAI = (window.TAI = window.TAI || {});

  // First daily case. Daily #1 is this date; #N is EPOCH + N-1 days.
  TAI.EPOCH = '2026-11-09';
  TAI.SQL_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';

  // ---------- randomness ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function tools(seed) {
    const r = mulberry32(seed);
    const t = {
      r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
      chance: (p) => r() < p,
    };
    return t;
  }

  // ---------- dates (all ISO 'YYYY-MM-DD', calendar arithmetic in UTC) ----------
  const pad = (n) => String(n).padStart(2, '0');
  const MS_DAY = 86400000;
  function toUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
  function fromUTC(ms) { const d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  const addDays = (iso, n) => fromUTC(toUTC(iso) + n * MS_DAY);
  const diffDays = (a, b) => Math.round((toUTC(a) - toUTC(b)) / MS_DAY);
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(iso) { const d = new Date(toUTC(iso)); return DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function fmtShort(iso) { const d = new Date(toUTC(iso)); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  const dow = (iso) => new Date(toUTC(iso)).getUTCDay();
  const ts = (iso, h, m, s) => iso + ' ' + pad(h) + ':' + pad(m) + ':' + pad(s);
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  // ---------- numbers ----------
  const round2 = (x) => Math.round(x * 100) / 100;
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (x) => Math.round(Math.abs(x) * 100) + '%';

  /* Pick n wrong numeric options that are clearly different from the truth and from each other.
     cands: [{v, why}] in preference order. */
  function distractors(truth, cands, n, gap) {
    gap = gap || 0.04;
    const fallback = [0.78, 1.27, 0.66, 1.4].map((k) => ({ v: truth * k, why: 'That number doesn’t come from any query. Look again at what the data says.' }));
    const out = [];
    for (const c of cands.concat(fallback)) {
      if (c == null || !isFinite(c.v) || c.v <= 0) continue;
      const taken = [truth].concat(out.map((o) => o.v));
      if (taken.every((x) => Math.abs(c.v - x) / Math.max(1, truth) >= gap)) out.push(c);
      if (out.length === n) break;
    }
    return out;
  }

  TAI.util = { mulberry32, hash, tools, pad, addDays, diffDays, fmtDay, fmtShort, dow, ts, todayISO, round2, num, money, pct, distractors };

  // ---------- case catalogue ----------
  TAI.TEMPLATES = TAI.TEMPLATES || [];
  TAI.COMPANIES = [
    { name: 'Brewly', what: 'coffee subscriptions', prefix: 'BRW', scale: [520, 760], mult: 1.0 },
    { name: 'Parcelo', what: 'parcel lockers', prefix: 'PCL', scale: [640, 900], mult: 0.6 },
    { name: 'Kitebox', what: 'meal kits', prefix: 'KTB', scale: [380, 560], mult: 2.4 },
    { name: 'Plantly', what: 'house plants by post', prefix: 'PLT', scale: [300, 480], mult: 1.6 },
    { name: 'Tunebird', what: 'online music lessons', prefix: 'TNB', scale: [420, 620], mult: 1.9 },
    { name: 'Stayzy', what: 'holiday cabins', prefix: 'STZ', scale: [260, 420], mult: 5.5 },
    { name: 'Lumen', what: 'a fitness app', prefix: 'LMN', scale: [560, 820], mult: 0.9 },
  ];

  function dayNo(iso) { return diffDays(iso, TAI.EPOCH) + 1; }
  const mod = (a, m) => ((a % m) + m) % m;
  // Daily #1–#7 were published with the first three templates; keep them exactly as players saw them.
  TAI.LEGACY_DAILIES = 7;
  function meta(iso) {
    const n = dayNo(iso);
    const T = TAI.TEMPLATES; const C = TAI.COMPANIES;
    if (n <= TAI.LEGACY_DAILIES) return { no: n, date: iso, tpl: T[mod(n - 1, 3)], co: C[mod(n - 1, C.length)] };
    // #8 to #11: cycle through the first seven templates; shift the company each cycle so pairings vary.
    if (n < TAI.ROTATION2_FROM) {
      const k = n - 1 - TAI.LEGACY_DAILIES;
      return { no: n, date: iso, tpl: T[mod(k, 7)], co: C[mod(k + Math.floor(k / 7) * 3, C.length)] };
    }
    // From #12 (20 Nov 2026): every template, production incidents mixed in between the dashboard ones.
    const k = n - TAI.ROTATION2_FROM; const order = TAI.ROTATION2.map((id) => T.find((x) => x.id === id)).filter(Boolean);
    return { no: n, date: iso, tpl: order[mod(k, order.length)], co: C[mod(k + Math.floor(k / order.length) * 3 + 2, C.length)] };
  }
  TAI.ROTATION2_FROM = 12;
  TAI.ROTATION2 = ['nowhere', 'late', 'email', 'fanout', 'purge', 'units', 'bill', 'drift', 'status', 'tz', 'backfill'];
  /* Build the full case for a calendar date. Deterministic: same date, same case, for everyone. */
  function caseFor(iso, opts) {
    const m = meta(iso);
    const tpl = (opts && opts.tpl) || m.tpl;
    const co = (opts && opts.co) || m.co;
    const D = addDays(iso, -1); // the incident day is always "yesterday"
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(D, -i));
    // A template reports valid=false when its random draw makes a weak puzzle (e.g. a spike too small
    // to notice). Re-roll deterministically until it is valid, so every date still gets one fixed case.
    let c, t, attempt = 0;
    do {
      t = tools(hash('3am|' + iso + '|' + tpl.id + '|' + co.name + '|' + ((opts && opts.salt) || '') + '|' + attempt));
      // Dialogue variety comes from its own random stream, so it never changes a case's data or answers.
      // Daily #1–#7 keep the first line of each list: the words they were published with.
      const vr = mulberry32(hash('voice|' + iso + '|' + tpl.id + '|' + co.name + '|' + ((opts && opts.salt) || '')));
      const plain = !(opts && opts.salt) && !(opts && opts.tpl) && m.no <= TAI.LEGACY_DAILIES;
      const v = (list) => (plain ? list[0] : list[Math.floor(vr() * list.length)]);
      c = tpl.build(t, { D, days, co, caseDate: iso, no: m.no, v });
      attempt++;
    } while (c.valid === false && attempt < 20);
    c.attempts = attempt;
    c.no = m.no; c.date = iso; c.D = D; c.days = days; c.co = co; c.tpl = tpl;
    // Shuffle answer options once, deterministically.
    for (const q of c.questions) q.options = t.shuffle(q.options);
    return c;
  }
  TAI.dayNo = dayNo; TAI.meta = meta; TAI.caseFor = caseFor;
  // ---------- practice library: 100 fixed cases, not tied to a date ----------
  // #1–100: the first seven types, as published. #101–136: the four production incidents,
  // 3 easy, 3 medium and 3 hard of each (101–112 easy, 113–124 medium, 125–136 hard).
  TAI.PRACTICE_COUNT = 136;
  const LEVELS = { easy: [1, 40], medium: [41, 75], hard: [76, 100] };
  TAI.LEVELS = LEVELS;
  const LEVEL_NAMES = ['easy', 'medium', 'hard'];
  function level(n) { if (n > 100) return LEVEL_NAMES[Math.floor((n - 101) / 12)]; return n <= LEVELS.easy[1] ? 'easy' : n <= LEVELS.medium[1] ? 'medium' : 'hard'; }
  // Every practice case number at a level, in order.
  TAI.levelCases = (l) => { const out = []; for (let n = 1; n <= TAI.PRACTICE_COUNT; n++) if (level(n) === l) out.push(n); return out; };
  function practiceMeta(n) {
    if (n > 100) {
      const j = n - 101; const NEW = TAI.TEMPLATES.slice(7);
      return { n, level: level(n), tpl: NEW[j % NEW.length], co: TAI.COMPANIES[(j + Math.floor(j / NEW.length) * 3 + 1) % TAI.COMPANIES.length], iso: addDays('2026-01-05', (n - 1) * 3) };
    }
    const T = TAI.TEMPLATES.slice(0, 7); // the library was published with the first seven types; keep saved progress pointing at the same cases
    return { n, level: level(n), tpl: T[(n - 1) % T.length], co: TAI.COMPANIES[((n - 1) + Math.floor((n - 1) / T.length) * 3) % TAI.COMPANIES.length], iso: addDays('2026-01-05', (n - 1) * 3) };
  }
  /* Difficulty changes the evidence, not the answer:
     easy   = only the key checks plus one red herring;
     medium = every card (the same as a daily case);
     hard   = the two most direct checks are removed, so you must write some SQL yourself. */
  /* Medium and hard: the real number must be typed, and no ready-made check may print it.
     Two checks used to print it outright; on medium and hard they show the evidence without the total. */
  const NO_ANSWER_SQL = {
    late: { raw_src: (D) => `SELECT source, COUNT(*) AS orders\nFROM orders\nWHERE DATE(created_at) = '${D}'\nGROUP BY source\nORDER BY orders DESC;` },
    fanout: { raw_vs: (D) => `SELECT 'raw orders' AS source, COUNT(*) AS orders\nFROM orders WHERE DATE(ordered_at) = '${D}'\nUNION ALL\nSELECT 'dashboard', orders\nFROM daily_revenue WHERE day = '${D}';` },
  };
  function applyLevel(c, level) {
    c.level = level;
    if (level === 'easy') {
      const herrings = c.cards.filter((x) => !x.key);
      c.cards = c.cards.filter((x) => x.key || x === herrings[0]);
      return c;
    }
    c.typed = true;
    const fix = NO_ANSWER_SQL[c.tpl.id] || {};
    c.cards = c.cards.map((x) => (fix[x.id] ? Object.assign({}, x, { sql: fix[x.id](c.D), title: x.title.replace(/^Raw orders vs the dashboard/, 'Raw order count vs the dashboard') }) : x));
    if (level === 'hard') {
      const drop = c.chain.slice(0, 2);
      c.cards = c.cards.filter((x) => drop.indexOf(x.id) < 0);
      c.chain = c.chain.slice(2);
      c.hardNote = 'Hard case: two of the usual checks are missing, and you type the real number. Write your own SQL to find it.';
    }
    return c;
  }
  function practiceCase(n) {
    const m = practiceMeta(n);
    const c = caseFor(m.iso, { tpl: m.tpl, co: m.co, salt: 'practice-' + n });
    c.practice = n;
    return applyLevel(c, m.level);
  }
  /* Daily difficulty follows the week (like a crossword): Mon–Tue easy, Wed–Thu and Sun medium, Fri–Sat hard.
     Cases before RAMP_START stay exactly as they were published. */
  TAI.RAMP_START = '2026-11-17';
  const WEEK_LEVEL = ['medium', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
  function dailyLevel(iso) { return iso < TAI.RAMP_START ? null : WEEK_LEVEL[dow(iso)]; }
  function dailyCase(iso) { const c = caseFor(iso); const l = dailyLevel(iso); return l ? applyLevel(c, l) : c; }
  // Does a typed or queried number match the real one? Counts must be exact; money within a dollar.
  function matchesAnswer(c, x) { if (!c.answerQ || typeof x !== 'number' || !isFinite(x)) return false; return c.answerQ.money ? Math.abs(x - c.answerQ.value) < 1 : Math.abs(x - c.answerQ.value) < 0.5; }
  TAI.practiceMeta = practiceMeta; TAI.practiceCase = practiceCase; TAI.applyLevel = applyLevel;
  TAI.dailyLevel = dailyLevel; TAI.dailyCase = dailyCase; TAI.matchesAnswer = matchesAnswer;


  // ---------- database ----------
  function buildDb(SQL, c) {
    const db = new SQL.Database();
    db.run('BEGIN');
    for (const tb of c.tables) {
      db.run('CREATE TABLE ' + tb.name + ' (' + tb.cols.map((x) => x[0] + ' ' + x[1]).join(', ') + ')');
      const st = db.prepare('INSERT INTO ' + tb.name + ' VALUES (' + tb.cols.map(() => '?').join(',') + ')');
      for (const row of tb.rows) st.run(row);
      st.free();
    }
    db.run('COMMIT');
    return db;
  }
  function query(db, sql, maxRows) {
    const res = db.exec(sql);
    const last = res.length ? res[res.length - 1] : { columns: [], values: [] };
    const values = maxRows ? last.values.slice(0, maxRows) : last.values;
    return { columns: last.columns, values, total: last.values.length };
  }
  TAI.buildDb = buildDb; TAI.query = query;

  // ---------- this browser's saved progress ----------
  const KEY = 'tai.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { cases: {} }; } catch (e) { return { cases: {} }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: progress lasts this visit only */ } }
  let mem = load();
  const store = {
    get: (iso) => mem.cases[iso] || null,
    put: (iso, rec) => { mem.cases[iso] = rec; save(mem); },
    all: () => mem.cases,
    reset: () => { mem = { cases: {} }; save(mem); },
  };
  TAI.store = store;
  // Move progress to another device without an account: a short code holding only which days were solved.
  store.exportCode = () => {
    const rows = Object.entries(mem.cases).filter(([d, r]) => r.solved && /^\d{4}-/.test(d)).map(([d, r]) => d.replace(/-/g, '') + (r.solvedOn === d ? '1' : '0'));
    for (const [k, r] of Object.entries(mem.cases)) if (r.solved && /^p\d+$/.test(k)) rows.push(k);
    return 'TAI1-' + btoa(rows.join('.')).replace(/=+$/, '');
  };
  store.importCode = (code) => {
    const m = String(code || '').trim().match(/^TAI1-([A-Za-z0-9+/]+)$/);
    if (!m) return -1;
    let txt; try { txt = atob(m[1]); } catch (e) { return -1; }
    let n = 0;
    for (const part of txt.split('.')) {
      if (/^p\d+$/.test(part)) { if (!(mem.cases[part] && mem.cases[part].solved)) { mem.cases[part] = { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: 'imported', imported: true, queries: 0 }; n++; } continue; }
      const x = part.match(/^(\d{4})(\d{2})(\d{2})([01])$/); if (!x) continue;
      const d = x[1] + '-' + x[2] + '-' + x[3];
      const cur = mem.cases[d];
      if (cur && cur.solved) continue;
      mem.cases[d] = { timeline: [], reports: [true], picks: {}, solved: true, solvedOn: x[4] === '1' ? d : 'imported', imported: true, queries: 0 };
      n++;
    }
    save(mem); return n;
  };


  // A streak counts daily cases solved on their own day (like Wordle). Archive solves don't count.
  function streaks(today) {
    const cases = store.all();
    const ok = (iso) => { const r = cases[iso]; return !!(r && r.solved && r.solvedOn === iso); };
    // Streak protection: Byte covers one missed day in any 7 days, so one busy day doesn't wipe a long streak.
    // A covered day doesn't add to the count; two misses close together still end the streak.
    // Today is never a miss: there is still time to play it.
    let best = 0, run = 0, lastCover = null; let covered = [];
    for (let x = TAI.EPOCH; x <= today; x = addDays(x, 1)) {
      if (ok(x)) { run++; best = Math.max(best, run); continue; }
      if (x === today) continue;
      if (run > 0 && (!lastCover || diffDays(x, lastCover) >= 7)) { lastCover = x; covered.push(x); continue; }
      run = 0; covered = [];
    }
    const cur = run;
    const coverReady = !lastCover || diffDays(today, lastCover) >= 7;
    const recs = Object.keys(cases).filter((k) => /^\d{4}-/.test(k)).map((k) => cases[k]);
    const prac = Object.keys(cases).filter((k) => /^p\d+$/.test(k) && cases[k].solved).length;
    const solved = recs.filter((r) => r.solved);
    const avgQ = solved.length ? solved.reduce((a, r) => a + r.timeline.filter((e) => e.t !== 'hint').length, 0) / solved.length : 0;
    return { covered, coverReady, lastCover, practiceSolved: prac, current: cur, best, played: recs.filter((r) => r.timeline.length || r.reports.length).length, solved: solved.length, avgQueries: avgQ };
  }
  TAI.streaks = streaks;
})();
