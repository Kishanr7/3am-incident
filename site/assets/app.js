/* 3 a.m. Incident: home page and the daily case player. */
(function () {
  'use strict';
  const TAI = window.TAI;
  const U = TAI.util;
  const CAST = TAI.CAST;
  const app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const av = (who, cls) => `<span class="av ${cls || ''}">${CAST[who].svg}</span>`;
  const MOON = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="var(--accent)"/><path d="M19.5 7.5a9 9 0 1 0 5 15.6A10 10 0 0 1 19.5 7.5z" fill="var(--surface)"/><circle cx="23" cy="9" r="1.3" fill="var(--surface)"/></svg>';
  const START_MIN = 15, STEP_MIN = 5, MEETING_MIN = 60; // 08:15 start, 5 minutes per action, meeting at 09:00

  // Light/dark: follows the device until the player picks one; the choice is remembered on this device.
  function isDark() { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  function themeIcon() { return isDark() ? '☀️' : '🌙'; }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#themeBtn'); if (!b) return;
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tai.theme', next); } catch (err) { /* remembered for this visit only */ }
    b.textContent = themeIcon();
  });

  let SQL = null;
  function loadSql() {
    if (SQL) return Promise.resolve(SQL);
    if (typeof window.initSqlJs !== 'function') return Promise.reject(new Error('sql.js not loaded'));
    return window.initSqlJs({ locateFile: (f) => TAI.SQL_CDN + f }).then((s) => (SQL = s));
  }
  function toast(text) {
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = text;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1800);
  }
  const today = () => U.todayISO();
  const newRec = () => ({ timeline: [], reports: [], picks: {}, solved: false });

  // ---------------- install as an app ----------------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (!S) renderHome(); });
  window.addEventListener('appinstalled', () => { installEvt = null; if (!S) renderHome(); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function installCard() {
    if (standalone()) return '';
    if (installEvt) return `<div class="card install row" style="margin-top:12px"><span>📲 <b>Get the app.</b> <span class="small muted">Home-screen icon, works offline, no app store.</span></span><button class="btn primary" id="installBtn">Install</button></div>`;
    if (isIOS()) return `<div class="card install small" style="margin-top:12px">📲 <b>Get the app on ${/iPad|Macintosh/.test(navigator.userAgent) ? 'iPad' : 'iPhone'}:</b> in Safari tap <b>Share</b> <span aria-hidden="true">⬆️</span>, then <b>Add to Home Screen</b>. It works offline.</div>`;
    return '';
  }
  document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest('#installBtn')) || !installEvt) return;
    installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; if (!S) renderHome(); });
  });

  let openLevel = ''; // which practice level is unfolded (this visit only)
  // ---------------- home ----------------
  function renderHome() {
    document.title = '3 a.m. Incident: a daily data mystery';
    const t = today();
    const st = TAI.streaks(t);
    const c = TAI.caseFor(t);
    const rec = TAI.store.get(t);
    const status = rec && rec.solved ? 'solved' : rec && rec.timeline.length ? 'started' : 'new';
    const btn = status === 'solved' ? 'See your result' : status === 'started' ? 'Continue investigating' : 'Start investigating';
    const days = []; for (let i = 6; i >= 0; i--) { const d = U.addDays(t, -i); if (d >= TAI.EPOCH) days.push(d); }
    const week = days.map((d) => {
      const r = TAI.store.get(d); const solved = r && r.solved;
      const m = TAI.meta(d);
      return `<a class="day ${solved ? 'solved' : ''} ${d === t ? 'today' : ''}" href="#/daily/${d}" aria-label="Daily #${m.no}, ${U.fmtDay(d)}, ${m.co.name}${solved ? ', solved' : ''}">
        <span>${U.fmtDay(d).slice(0, 3)}</span><b>#${m.no}</b><span class="st">${solved ? '✓' : r && r.timeline.length ? '•' : '&nbsp;'}</span></a>`;
    }).join('');
    const lvl = TAI.LEVELS[openLevel] ? openLevel : ''; // folded on every visit until a level is tapped
    const done = { easy: 0, medium: 0, hard: 0 };
    for (let n = 1; n <= TAI.PRACTICE_COUNT; n++) { const r = TAI.store.get('p' + n); if (r && r.solved) done[TAI.practiceMeta(n).level]++; }
    let lib = '';
    if (lvl) for (let n = TAI.LEVELS[lvl][0]; n <= TAI.LEVELS[lvl][1]; n++) {
      const pm = TAI.practiceMeta(n); const r = TAI.store.get('p' + n);
      const st2 = r && r.solved ? 'solved' : r && r.timeline.length ? 'started' : '';
      lib += `<a class="lcase ${st2}" href="#/practice/${n}" aria-label="Practice ${n}, ${esc(pm.co.name)}, ${esc(pm.tpl.name)}${st2 ? ', ' + st2 : ''}"><b>${n}</b><span>${esc(pm.co.name)}</span><span class="st">${st2 === 'solved' ? '✓' : st2 === 'started' ? '•' : ''}</span></a>`;
    }
    const cast = ['maya', 'sam', 'byte', 'gus', 'vendor'].map((k) => `<div class="card person">${av(k)}<div><b>${CAST[k].name}</b><div class="role">${CAST[k].role}</div></div><p>${esc(CAST[k].blurb)}</p></div>`).join('');

    app.innerHTML = `
      <div class="wrap">
        <div class="top">
          <a class="logo" href="#/">${MOON}<span>3 a.m. Incident</span></a>
          <button class="pill theme" id="themeBtn" aria-label="Switch light or dark mode">${themeIcon()}</button>
          <button class="pill" id="statsBtn" aria-label="Your stats. Current streak ${st.current}">🔥 ${st.current}</button>
        </div>

        <section class="intro" aria-label="What is this?">
          <p class="lead">A 5-minute daily puzzle for people who work with data.</p>
          <p>A number on the dashboard looks wrong. Check the data, find out why, and tell your boss before the 9:00 meeting.</p>
          <ol class="steps">
            <li><span aria-hidden="true">📉</span>Spot the odd number</li>
            <li><span aria-hidden="true">🔎</span>Tap to check the data</li>
            <li><span aria-hidden="true">💬</span>Say what went wrong</li>
          </ol>
          <button class="btn link how" id="howBtn" type="button">How it works</button>
        </section>

        <section class="card hero" aria-labelledby="todayTitle">
          <div class="moon">${MOON}</div>
          <div class="kicker">Today’s case · ${U.fmtDay(t)}</div>
          <h1 id="todayTitle">${esc(c.teaser)}</h1>
          <div class="who">${av(c.reporter)}<span class="small muted">${esc(CAST[c.reporter].name)} wants to know why.</span></div>
          <a class="btn primary" href="#/daily/${t}">${btn}</a>
        </section>

        ${installCard()}
        <h2>This week</h2>
        <nav class="week" aria-label="This week’s daily cases">${week}</nav>
        <p class="small muted">Missed a day? You can still play it. Only today’s case adds to your streak.</p>

        <h2 id="practice">Practice</h2>
        <p class="small muted" style="margin-top:-4px">100 more cases. Hard ones make you write a little SQL.</p>
        <div class="tabs" aria-label="Difficulty">${['easy', 'medium', 'hard'].map((l) => `<button class="tab" data-l="${l}" aria-expanded="${l === lvl}" aria-controls="lib">${LEVEL_NAME[l]} <span class="muted">${done[l]}/${TAI.LEVELS[l][1] - TAI.LEVELS[l][0] + 1}</span></button>`).join('')}</div>
        ${lvl ? `<nav class="lib" id="lib" aria-label="${LEVEL_NAME[lvl]} practice cases">${lib}</nav>` : ''}

        <h2>Big case</h2>
        <a class="card file" href="case-1/">
          <span class="num">#1</span>
          <span><b>The Missing Revenue</b><br><span class="small muted">Write your own SQL. Best on a laptop, about 25 minutes.</span></span>
        </a>

        <details class="crew">
          <summary>Meet the crew</summary>
          <div class="cast">${cast}</div>
        </details>

        <p class="pilot">Test version. The companies and data are made up, and your progress stays on this device. Please don’t share the link yet.</p>
        <footer>Made by Kishan · no account, no tracking</footer>
      </div>`;
    document.getElementById('statsBtn').onclick = () => showStats();
    document.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { const open = b.getAttribute('aria-expanded') === 'true'; openLevel = open ? '' : b.dataset.l; const y = scrollY; renderHome(); scrollTo(0, y); const t2 = document.querySelector('.tab[data-l="' + b.dataset.l + '"]'); if (t2) t2.focus(); }; });
  }

  function showStats() {
    const st = TAI.streaks(today());
    if (typeof HTMLDialogElement !== 'function') { toast('Streak: ' + st.current + ' · best ' + st.best); return; }
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<h2 style="margin-top:0">Your stats</h2>
      <div class="stats"><div><b>${st.played}</b><span>played</span></div><div><b>${st.solved}</b><span>solved</span></div><div><b>${st.current}</b><span>streak</span></div><div><b>${st.best}</b><span>best</span></div></div>
      <p class="small" style="margin:0 0 8px">Practice cases solved: <b>${st.practiceSolved}</b> / ${TAI.PRACTICE_COUNT}</p>
      <p class="small muted">No account needed: your streak lives in this browser. To keep it on another phone or laptop, copy your streak code there.</p>
      <div class="row"><button class="btn" id="exp" type="button">Copy streak code</button></div>
      <label class="small" for="imp" style="display:block;margin-top:12px;font-weight:600">Got a code from another device?</label>
      <div class="row" style="margin-top:4px"><input id="imp" class="codein" placeholder="TAI1-…" autocomplete="off" spellcheck="false"><button class="btn" id="impBtn" type="button">Add</button></div>
      <p class="small muted" id="impNote" role="status"></p>
      <form method="dialog" class="row"><button class="btn primary">Close</button></form>`;
    document.body.appendChild(dlg); dlg.addEventListener('close', () => { dlg.remove(); if (!S) renderHome(); }); dlg.showModal();
    dlg.querySelector('#exp').onclick = () => {
      const code = TAI.store.exportCode();
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Code copied'), () => { dlg.querySelector('#imp').value = code; dlg.querySelector('#imp').select(); toast('Select and copy the code'); });
    };
    dlg.querySelector('#impBtn').onclick = () => {
      const n = TAI.store.importCode(dlg.querySelector('#imp').value);
      dlg.querySelector('#impNote').textContent = n < 0 ? 'That doesn’t look like a streak code.' : n === 0 ? 'Nothing new in that code.' : 'Added ' + n + (n === 1 ? ' solved day.' : ' solved days.');
    };
  }

  // ---------------- case ----------------
  let S = null; // { c, db, rec, iso }

  function save() { TAI.store.put(S.key, S.rec); }
  const actions = () => S.rec.timeline.length;
  function clockMin() { return START_MIN + STEP_MIN * actions(); }
  function clockText(m) { const h = 8 + Math.floor(m / 60), mm = m % 60; return U.pad(h) + ':' + U.pad(mm); }

  const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  function openCase(kind, id) {
    const t = today();
    if (kind === 'daily' && (id < TAI.EPOCH || id > t)) { location.hash = '#/'; return; }
    if (kind === 'practice' && !(id >= 1 && id <= TAI.PRACTICE_COUNT)) { location.hash = '#/'; return; }
    app.innerHTML = '<div class="wrap"><div class="loading" role="status">Waking up the warehouse…</div></div>';
    const token = openCase.token;
    loadSql().then(() => {
      if (token !== openCase.token) return; // the player navigated away while loading
      const c = kind === 'daily' ? TAI.caseFor(id) : TAI.practiceCase(id);
      const db = TAI.buildDb(SQL, c);
      const key = kind === 'daily' ? id : 'p' + id;
      const label = kind === 'daily' ? `Daily #${c.no}` : `Practice #${id} · ${LEVEL_NAME[c.level]}`;
      S = { c, db, key, iso: kind === 'daily' ? id : null, daily: kind === 'daily', practice: kind === 'practice' ? id : null, label, rec: TAI.store.get(key) || newRec() };
      renderCase();
    }).catch(() => {
      app.innerHTML = '<div class="wrap"><div class="loading" role="alert">Couldn’t load the SQL engine. It needs an internet connection once. <a href="">Try again</a></div></div>';
    });
  }

  function tableHtml(r) {
    if (!r.columns.length) return '<p class="small muted">No rows.</p>';
    const isNum = r.columns.map((_, j) => r.values.length > 0 && r.values.every((row) => row[j] === null || typeof row[j] === 'number'));
    const long = r.values.some((row) => row.some((v) => typeof v === 'string' && v.length > 26));
    const stack = r.columns.length >= 4 || long; // on phones, wide results become one card per row
    const head = r.columns.map((c, j) => `<th scope="col"${isNum[j] ? ' class="n"' : ''}>${esc(c)}</th>`).join('');
    const body = r.values.map((row) => '<tr>' + row.map((v, j) => {
      const lab = ` data-label="${esc(r.columns[j])}"`;
      if (v === null) return `<td class="null"${lab}>NULL</td>`;
      if (typeof v === 'number') return `<td class="n"${lab}>${Number.isInteger(v) ? v : (Math.round(v * 100) / 100).toFixed(2)}</td>`;
      return `<td${String(v).length > 26 ? ' class="long"' : ''}${lab}>${esc(v)}</td>`;
    }).join('') + '</tr>').join('');
    return `<div class="tbl" tabindex="0" role="region" aria-label="Query result"><table class="res${stack ? ' stack' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` +
      (r.total > r.values.length ? `<p class="more">Showing ${r.values.length} of ${r.total} rows.</p>` : '');
  }

  function entryHtml(e, i) {
    const c = S.c;
    if (e.t === 'card') {
      const card = c.cards.find((x) => x.id === e.id);
      let res; try { res = tableHtml(TAI.query(S.db, card.sql, 30)); } catch (err) { res = `<p class="err">${esc(err.message)}</p>`; }
      const voice = card.voice ? `<div class="voice">${av(card.voice.who)}<p><b>${esc(CAST[card.voice.who].name)}:</b> ${esc(card.voice.text)}</p></div>` : '';
      return `<article class="entry" id="e${i}" tabindex="-1"><span class="kind">${esc(card.kind)} · ${clockText(START_MIN + STEP_MIN * (i + 1))}</span><h3>${esc(card.title)}</h3>
        <details><summary>Show SQL</summary><pre class="sql">${esc(card.sql)}</pre></details>${res}${voice}</article>`;
    }
    if (e.t === 'sql') {
      let res; try { res = tableHtml(TAI.query(S.db, e.sql, 50)); } catch (err) { res = `<p class="err">${esc(err.message)}</p>`; }
      return `<article class="entry" id="e${i}" tabindex="-1"><span class="kind">Your query · ${clockText(START_MIN + STEP_MIN * (i + 1))}</span><pre class="sql">${esc(e.sql)}</pre><div style="margin-top:8px">${res}</div></article>`;
    }
    if (e.t === 'hint') {
      const card = e.id && c.cards.find((x) => x.id === e.id);
      const text = card ? `*walks across your keyboard and sits on “${card.title}”* Mrrp.` : '*curls up on the report form* Mrrp. (You’ve seen enough. Tell Maya.)';
      return `<div class="msg byte" id="e${i}" tabindex="-1">${av('byte')}<div class="bubble"><span class="name">Byte · ${clockText(START_MIN + STEP_MIN * (i + 1))}</span>${esc(text)}</div></div>`;
    }
    return '';
  }

  function renderCase() {
    const { c, rec } = S;
    document.title = `${S.label} · 3 a.m. Incident`;
    // Alerts fire at 03:12; people start messaging at 08:10, two minutes apart, in the order shown.
    let chatMin = 10;
    const intro = c.intro.map((m) => {
      const at = m.who === 'alert' ? '03:12' : '08:' + U.pad((chatMin += 2) - 2);
      return `<div class="msg ${m.who === 'alert' ? 'alert' : ''}">${av(m.who)}<div class="bubble"><span class="name">${esc(CAST[m.who].name)} · ${at}</span>${esc(m.text)}</div></div>`;
    }).join('');
    const schema = c.tables.map((tb) => `<b>${tb.name}</b>(${tb.cols.map((x) => x[0]).join(', ')})`).join('<br>');
    app.innerHTML = `
      <div class="wrap">
        <div class="top"><a class="back" href="#/" aria-label="Home">←</a><a class="logo" href="#/">${MOON}<span>3 a.m. Incident</span></a><button class="pill theme" id="themeBtn" aria-label="Switch light or dark mode">${themeIcon()}</button></div>
        <div class="case-head"><span class="kicker">${esc(S.label)}${S.daily ? ' · ' + U.fmtDay(c.date) : ''}</span><h1>${esc(c.teaser.startsWith(c.co.name + ' ') ? c.teaser : c.co.name + ': ' + c.teaser.replace(c.co.name + '’s ', '').replace(/^./, (x) => x.toUpperCase()))}</h1></div>
        ${c.hardNote ? `<p class="scene small"><b>${esc(c.hardNote)}</b></p>` : ''}
        <p class="scene small"><b>Your job:</b> find out why the number is wrong, then tap <b>Report</b>. Each check takes 5 minutes, and the meeting is at 9:00.</p>
        <div class="chat" aria-label="Incident channel">${intro}</div>
        <div class="feed" id="feed" aria-live="polite"></div>

        <section id="investigate">
          <h2>What do you want to check?</h2>
          <div class="picks" id="picks"></div>
          <details class="card own" style="margin-top:10px">
            <summary>Write your own SQL</summary>
            <div class="schema">${schema}</div>
            <label class="sr" for="ownSql">Your SQL</label>
            <textarea id="ownSql" spellcheck="false" placeholder="SELECT * FROM ${c.tables[0].name} LIMIT 5;"></textarea>
            <div class="row" style="margin-top:8px"><button class="btn" id="runOwn">Run (Ctrl+Enter)</button><span class="small muted">SQLite. Counts as one query.</span></div>
          </details>
        </section>

        <section class="report" id="report" aria-labelledby="reportTitle"></section>
      </div>
      <div class="bar"><div class="wrap">
        <span class="pill clock" id="clock"></span><span class="pill" id="qn"></span>
        <button class="btn sp" id="hintBtn" aria-label="Ask Byte for a hint (costs 5 minutes)">🐾 Byte</button>
        <a class="btn primary" href="#report" id="toReport">Report</a>
      </div></div>`;

    const feed = document.getElementById('feed');
    feed.innerHTML = rec.timeline.map(entryHtml).join('');
    renderPicks(); renderReport(); updateBar();
    document.getElementById('runOwn').onclick = runOwn;
    document.getElementById('ownSql').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runOwn(); } });
    document.getElementById('hintBtn').onclick = hint;
    document.getElementById('toReport').onclick = (e) => { e.preventDefault(); document.getElementById('report').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    window.scrollTo(0, 0);
  }

  function ran(id) { return S.rec.timeline.some((e) => e.t === 'card' && e.id === id); }
  function pawTarget() { const h = S.rec.timeline.filter((e) => e.t === 'hint' && e.id); const last = h[h.length - 1]; return last && !ran(last.id) ? last.id : null; }

  function renderPicks() {
    const paw = pawTarget();
    document.getElementById('picks').innerHTML = S.c.cards.map((card) => {
      const done = ran(card.id);
      return `<button class="qc ${done ? 'done' : ''} ${paw === card.id ? 'paw' : ''}" data-id="${card.id}" ${done ? 'aria-disabled="true"' : ''}><span class="kind">${esc(card.kind)}</span><span class="t">${esc(card.title)}</span></button>`;
    }).join('');
    document.querySelectorAll('.qc').forEach((b) => { b.onclick = () => runCard(b.dataset.id); });
  }

  function push(e) {
    if (S.rec.solved) e.after = true;
    S.rec.timeline.push(e); save();
    const i = S.rec.timeline.length - 1;
    document.getElementById('feed').insertAdjacentHTML('beforeend', entryHtml(e, i));
    const el = document.getElementById('e' + i);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true });
    updateBar();
  }
  function runCard(id) {
    if (ran(id)) { const idx = S.rec.timeline.findIndex((e) => e.t === 'card' && e.id === id); document.getElementById('e' + idx).scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    push({ t: 'card', id }); renderPicks();
  }
  function runOwn() {
    const ta = document.getElementById('ownSql'); const sql = ta.value.trim();
    if (!sql) { ta.focus(); return; }
    push({ t: 'sql', sql });
  }
  function hint() {
    const next = S.c.chain.find((id) => !ran(id));
    push({ t: 'hint', id: next || null }); renderPicks();
  }
  function updateBar() {
    const m = clockMin(); const el = document.getElementById('clock');
    el.textContent = '🕗 ' + clockText(m); el.classList.toggle('late', m > MEETING_MIN);
    el.setAttribute('aria-label', 'Time ' + clockText(m) + (m > MEETING_MIN ? ', late for the 9:00 meeting' : ', meeting at 9:00'));
    const q = S.rec.timeline.filter((e) => e.t !== 'hint').length;
    document.getElementById('qn').textContent = q + (q === 1 ? ' query' : ' queries');
  }

  // ---------------- report ----------------
  function renderReport() {
    const { c, rec } = S;
    const box = document.getElementById('report');
    if (rec.solved) { renderSolved(box); const tr = document.getElementById('toReport'); if (tr) tr.textContent = 'Result'; return; }
    const last = rec.lastWrong || {};
    const qs = c.questions.map((q) => {
      const opts = q.options.map((o) => {
        const checked = rec.picks[q.id] === o.id;
        const wrong = checked && last[q.id];
        return `<label class="opt ${wrong ? 'wrong' : ''}"><input type="radio" name="${q.id}" value="${o.id}" ${checked ? 'checked' : ''}><span>${esc(o.text)}</span></label>` +
          (wrong ? `<div class="why">${av('maya')}${esc(o.why)}</div>` : '');
      }).join('');
      return `<fieldset><legend>${esc(q.prompt)}</legend>${opts}</fieldset>`;
    }).join('');
    box.innerHTML = `<h2 id="reportTitle">Report to Maya</h2>
      <div class="card">${qs}<div class="row"><button class="btn primary" id="send">Send report</button><span class="small muted" id="sendNote">${rec.reports.length ? 'Reports sent: ' + rec.reports.length : 'Pick one answer for each.'}</span></div></div>`;
    const mark = () => box.querySelectorAll('.opt').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    box.querySelectorAll('input[type=radio]').forEach((inp) => { inp.onchange = () => { S.rec.picks[inp.name] = inp.value; save(); mark(); }; });
    mark();
    document.getElementById('send').onclick = sendReport;
  }

  function sendReport() {
    const { c, rec } = S;
    const missing = c.questions.filter((q) => !rec.picks[q.id]);
    if (missing.length) { document.getElementById('sendNote').textContent = 'Pick one answer for each question.'; return; }
    const wrong = {};
    for (const q of c.questions) { const o = q.options.find((x) => x.id === rec.picks[q.id]); if (!o.correct) wrong[q.id] = true; }
    const ok = !Object.keys(wrong).length;
    rec.reports.push(ok); rec.lastWrong = wrong;
    if (ok) {
      rec.solved = true; rec.solvedOn = today(); rec.solvedAt = clockMin();
      rec.queries = rec.timeline.filter((e) => e.t !== 'hint').length;
    }
    save(); renderReport();
    const box = document.getElementById('report');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!ok) toast('Maya: “That doesn’t add up. Try again.”');
  }

  function shareText() {
    const { c, rec } = S;
    const grid = rec.timeline.filter((e) => !e.after).map((e) => {
      if (e.t === 'hint') return '🐾';
      if (e.t === 'sql') return '🟪';
      const card = c.cards.find((x) => x.id === e.id); return card.key ? '🟦' : '⬜';
    }).join('') || '—';
    const reports = rec.reports.map((x) => (x ? '✅' : '❌')).join('');
    const late = rec.solvedAt > MEETING_MIN;
    const st = TAI.streaks(today());
    const daily = S.daily && rec.solvedOn === S.iso;
    const url = /^https?:/.test(location.protocol) ? '\n' + location.origin + location.pathname : '';
    return `🕒 3 a.m. Incident · ${S.label}\n${grid}\nReport ${reports} · ${clockText(rec.solvedAt)}${late ? ', late' : ', on time'}` +
      (daily && st.current > 1 ? `\n🔥 ${st.current}-day streak` : '') + url;
  }

  function renderSolved(box) {
    const { c, rec } = S;
    const L = c.lesson; const late = rec.solvedAt > MEETING_MIN;
    const daily = S.daily && rec.solvedOn === S.iso;
    const st = TAI.streaks(today());
    const next = S.practice && S.practice < TAI.PRACTICE_COUNT ? `<a class="btn" href="#/practice/${S.practice + 1}">Next case →</a>` : '';
    box.innerHTML = `<h2 id="reportTitle" class="sr">Case closed</h2>
      <div class="card win">
        <div class="msg">${av(c.closing.who)}<div class="bubble"><span class="name">${CAST[c.closing.who].name} · ${clockText(rec.solvedAt)}</span>${esc(c.closing.text)}</div></div>
        <h2 style="margin:16px 0 4px">Case closed${late ? ', a little late' : ' before 9:00'}.</h2>
        <p class="small muted" style="margin:0">${rec.queries} ${rec.queries === 1 ? 'query' : 'queries'} · ${rec.reports.length} ${rec.reports.length === 1 ? 'report' : 'reports'}${daily ? ` · 🔥 streak ${st.current}` : S.practice ? ' · practice case' : ' · archive case (streaks count on the day)'}</p>
        <div class="share" id="shareText">${esc(shareText())}</div>
        <div class="row"><button class="btn primary" id="copy">Copy result</button>${next}<a class="btn" href="#/">Home</a></div>
        <p class="small muted">🟦 key evidence · ⬜ other checks · 🟪 your own SQL · 🐾 Byte</p>
      </div>
      <div class="card lesson" style="margin-top:12px">
        <span class="kind small muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">The pattern</span>
        <h3>${esc(L.name)}</h3>
        <p style="margin:0">${esc(L.what)}</p>
        <h4>How to spot it</h4><ul>${L.spot.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4>How to stop it happening again</h4><ul>${L.prevent.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${L.seen ? `<h4>Seen at real jobs</h4><p style="margin:0" class="small">${esc(L.seen)}</p>` : ''}
      </div>
      <div class="card small" style="margin-top:12px">
        <b>Want a harder one?</b> <a href="case-1/">Case file #1: The Missing Revenue</a> gives you a full SQL console and no query cards.
        <br><span class="muted">Feedback helps more than anything: what was confusing, too easy, or unrealistic? Tell the person who sent you the link.</span>
      </div>`;
    document.getElementById('copy').onclick = () => {
      const text = shareText();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied'), () => {
        const r = document.createRange(); r.selectNodeContents(document.getElementById('shareText'));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Press Ctrl+C to copy.');
      });
    };
    document.getElementById('copy').focus({ preventScroll: true });
  }


  // ---------------- first-visit tour ----------------
  // Three short screens, shown once per device (tai.toured). Reopen from "How it works" on the home page.
  function tourSeen() { try { return localStorage.getItem('tai.toured') === '1'; } catch (e) { return true; } }
  function showTour() {
    if (document.querySelector('dialog.tour[open]')) return;
    if (typeof HTMLDialogElement !== 'function') return; // iOS < 15.4: no pop-up support
    const steps = [
      { art: `<div class="tmock"><div class="msg alert">${av('alert')}<div class="bubble"><span class="name">#data-alerts · 03:12</span>Orders: −35% vs normal. All jobs: SUCCESS.</div></div><div class="msg">${av('maya')}<div class="bubble"><span class="name">Maya · 08:10</span>Is this real, or is the dashboard lying?</div></div></div>`,
        title: 'Something looks wrong', text: 'Each morning a number on the dashboard looks off, and your boss Maya wants to know why before the 9:00 meeting.' },
      { art: `<div class="tmock"><div class="tpick"><span>Logs</span>When did each source’s data arrive?</div><div class="tpick"><span>Raw data</span>Orders for yesterday, by source</div><div class="tclock">🕗 Each check: +5 min · 🐾 Byte has hints</div></div>`,
        title: 'Tap to check the data', text: 'Pick what to look at. Each check runs a real SQL query on a small, made-up database. No typing needed.' },
      { art: `<div class="tmock"><div class="topt">The iOS data arrived late, after the nightly job ran</div><div class="topt on">✓ Real orders: 674</div><div class="tclock">🔥 New case every day · keep your streak</div></div>`,
        title: 'Tell Maya what happened', text: 'Choose the cause and the real number. Get it right before 9:00. A new case comes every day, plus 100 practice cases.' },
    ];
    const onCase = () => /^#\/(daily|practice)\//.test(location.hash); // a case link, even while it loads
    const dlg = document.createElement('dialog');
    dlg.className = 'tour';
    dlg.setAttribute('aria-label', 'How 3 a.m. Incident works');
    let i = 0;
    const finish = () => { try { localStorage.setItem('tai.toured', '1'); } catch (e) { /* shown again next visit */ } if (dlg.open) dlg.close(); dlg.remove(); };
    function draw() {
      const s = steps[i], last = i === steps.length - 1;
      dlg.innerHTML = `<div class="tart">${s.art}</div>
        <p class="tstep">${i + 1} of ${steps.length}</p>
        <h2>${s.title}</h2><p>${s.text}</p>
        <div class="tdots" aria-hidden="true">${steps.map((_, j) => `<span class="${j === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="row tnav">
          ${i ? '<button class="btn" id="tBack" type="button">Back</button>' : '<button class="btn link" id="tSkip" type="button">Skip</button>'}
          <button class="btn primary" id="tNext" type="button">${last ? (onCase() ? 'Start' : 'Play today’s case') : 'Next'}</button>
        </div>`;
      const b = dlg.querySelector('#tBack'), k = dlg.querySelector('#tSkip');
      if (b) b.onclick = () => { i--; draw(); };
      if (k) k.onclick = finish;
      dlg.querySelector('#tNext').onclick = () => {
        if (!last) { i++; draw(); return; }
        finish();
        if (!onCase()) location.hash = '#/daily/' + today();
      };
      dlg.querySelector('#tNext').focus();
    }
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(); }); // Esc key
    dlg.addEventListener('close', finish);
    document.body.appendChild(dlg); draw(); dlg.showModal(); dlg.querySelector('#tNext').focus();
  }
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#howBtn')) showTour(); });

  // ---------------- router ----------------
  function route() {
    if (S && S.db) { S.db.close(); S = null; }
    openCase.token = (openCase.token || 0) + 1;
    const m = location.hash.match(/^#\/daily\/(\d{4}-\d{2}-\d{2})$/);
    const p = location.hash.match(/^#\/practice\/(\d{1,3})$/);
    if (m) openCase('daily', m[1]);
    else if (p) openCase('practice', Number(p[1]));
    else renderHome();
  }
  window.addEventListener('hashchange', route);
  route();
  if (!tourSeen()) showTour();
  window.__tai = { get state() { return S; } };
  // Netlify's free plan can add a fixed "Powered by Netlify" badge (#nl-badge-frame) at the bottom right.
  // If it's there, lift the bottom bar above it so it never covers Byte or Report.
  function clearBadge() {
    const f = document.getElementById('nl-badge-frame');
    const h = f && f.getBoundingClientRect().height ? Math.ceil(f.getBoundingClientRect().height) + 6 : 0;
    document.documentElement.style.setProperty('--badge', h + 'px');
  }
  new MutationObserver(clearBadge).observe(document.body, { childList: true });
  window.addEventListener('resize', clearBadge); setTimeout(clearBadge, 1500); clearBadge();
  // Installable app + offline play (iPhone: Share > Add to Home Screen; Android: Install app).
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* still playable online */ }); });
  }
})();
