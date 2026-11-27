# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/): a new case type, level rule or screen is a minor version; a fix is a patch.
Each release also bumps the offline cache version in `site/sw.js` (`tai-vN`), so returning players get the new files.

## [Unreleased]

## [1.8.2] - 2026-11-27: Shorter search description

### Fixed
- The home page's search description is 138 characters instead of 181, so Bing (limit 160) and Google show it whole.
  The longer text stays for link previews (Open Graph, Twitter).

## [1.8.1] - 2026-11-27: Google Search Console ownership

### Added
- `site/google5911b0789f211ac9.html`, the file Google Search Console checks to confirm who owns the site, so the
  sitemap can be submitted and pages indexed. Keep it: removing it un-verifies the site.

## [1.8.0] - 2026-11-27: Speaks your SQL dialect

### Added
- The query box says it is SQLite, and a "Coming from PostgreSQL, MySQL or Spark?" fold shows the usual differences
  (the day or hour of a timestamp, date maths, days between dates, case-insensitive matching, JSON fields, row limits,
  division).
- When a query fails because of another dialect's syntax (`x::date`, `DATE_TRUNC`, `EXTRACT`, `INTERVAL`, `ILIKE`,
  `TOP 10`, `DATEDIFF`, `TO_CHAR` …), Byte shows the SQLite way under Run. Two that run but give a wrong answer are
  always flagged: `CAST(x AS DATE)` (a number like 2026 in SQLite) and `CURRENT_DATE` / `NOW()` (today's real date,
  not the case's).

### Fixed
- The "text matches are case-sensitive" tip no longer appears for `LIKE`, which ignores case in SQLite.

### Changed
- Tests: `tools/xbrowser/no-goatcounter.js`, preloaded for runs against the live site, so test runs never send
  visit counts (an empty counter script plus GoatCounter's own `skipgc` opt-out, which also covers WebKit pages
  controlled by the service worker).

## [1.7.0] - 2026-11-27: Visit counts, search engines and launch polish

### Added
- Cookie-free visit counts with [GoatCounter](https://www.goatcounter.com) (`site/assets/stats.js`): one count per
  screen (home, `/daily/<date>`, `/practice/<n>`, `/case-1/`, `/privacy/`) and a few events (case solved by type
  and level, Copy or Share pressed, a "beat my time" link opened). No cookies, nothing stored on the device, no
  personal data, so no consent banner. Counts only on the live site (not localhost or deploy previews), skips
  Do Not Track and Global Privacy Control, never cached by the service worker, and fails silently when blocked or
  offline.
- A privacy page (`/privacy/`) saying what is counted and what stays on the device, linked from the home footer and
  case file #1.
- A 404 page, `favicon.ico` and `favicon.svg` (search results need a real favicon file).
- Search engines: JSON-LD (`WebSite` + `VideoGame`) on the home page and case file #1; canonical URL, Open Graph and
  Twitter tags on case file #1; a short static intro on the home page that the game replaces when it starts, so
  crawlers that don't run JavaScript still read what the game is; a better `<noscript>` text; `lastmod` and the
  privacy page in `sitemap.xml`; `lang` in the manifest; a marked spot for Search Console / Bing verification tags.
- Security headers: a Content-Security-Policy that lists every outside host (cdnjs, jsDelivr, GoatCounter), plus
  X-Frame-Options, Permissions-Policy and Cross-Origin-Opener-Policy.
- Test: `tools/xbrowser/stats-test.js` (8 setups) checks every count and event with a stub counter, no count under
  Global Privacy Control, no CSP violations, the SQL engine starting under the CSP, the 404 page and the SEO files.

### Changed
- "No tracking" is now "no cookies" on the home footer, and case file #1 says "nothing you *type* leaves your
  browser", since page views are now counted.
- Case file #1's script moved from the page into `case-1/case.js`, so the CSP needs no `unsafe-inline` for scripts.
- Its title names the case: *Case #1: The Missing Revenue · 3 a.m. Incident*.

## [1.6.0] - 2026-11-27: One query result at a time

### Changed
- Your own queries no longer pile up full results in the evidence feed. Each one is a single line there (the query
  and its row count, for example "1 row, 25 rows"); tap it to see its result, and only one is open at a time. The
  latest result is always under the Run button. The Hide/Show buttons are gone: nothing needs hiding any more.
- Long results show the first 10 rows, with a "Show all N rows" button; then the table scrolls inside its own box.
- Ready-made checks are unchanged.

### Fixed
- Several statements in the box (for example two `SELECT`s) ran, but only the last result was shown. Each statement
  now gets its own result, headed by the statement (up to 5). One Run is still one query. The ⭐ and the fill-in
  pass/fail look at every result.

## [1.5.1] - 2026-11-27: The incident happens on the incident day

### Fixed
- In two case types the cause started the evening before the incident day, so the day before was partly wrong too
  and it was unclear which day the case is about (found by Kishan in Daily #19: the raw sign-ups for the day before
  didn't match the dashboard). *The Vanishing Sign-ups*: the broken app release now goes out just after midnight on
  the incident day (was 21:xx the evening before). *The Expensive Refresh*: the new tile is created that morning (was
  16–19:xx the evening before), and the usual cost is the average of the six days before. From Daily #28 (6 Dec,
  `TAI.SAME_DAY_FROM`) and in practice; Daily #1–#27 stay exactly as published.
- *The Vanishing Sign-ups* could, rarely, give the other app the same version number as the broken release, so its
  sign-ups were dropped all week. No published or practice case had it; new cases can't.

### Added
- Self-test: in those two types, nothing before the incident day is affected.

## [1.5.0] - 2026-11-26: Ten patterns, and where the number comes from

### Removed
- The cents case type (*The Hundredfold Day*) is retired: players found it confusing. From Daily #28 (Sun 6 Dec) the
  days cycle through the other ten types, starting where #28 would have been, so Daily #1–#27 stay exactly as they
  were. The two published cents dailies (#11 and #17) still open from the week and archive.
- Its 14 practice cases are no longer listed in the library (now 122 cases: 46 easy, 42 medium, 34 hard). Numbers
  were not changed, so saved progress still points at the same cases, and old links to them still open.
- The pattern deck has ten cards.

### Added
- "Where the number comes from" in the *Your job* box: the tables behind the wrong number, from the raw data to the
  dashboard, for example `orders` + `dim_customers` → `fct_orders` → `daily_revenue` (dashboard). It names tables
  only, never the cause. The self-test checks that every table it names exists in the case.

### Changed
- The Missing WHERE: the money question says how it is counted (what the items cost at their old prices, minus what
  customers paid).
- The easy note points to the 🧩 query "under the checks" instead of "on the right" (it is below on phones), and
  Byte's worked query says to run it in the SQL box under the checks.
- Tests: `tools/xbrowser/no-netlify-toolbar.js` lets the browser tests run on a Netlify deploy preview, whose
  review toolbar covers the bottom bar on phones.

## [1.4.2] - 2026-11-26: Run a query without losing your place

### Fixed
- Pressing Run on your own query (the fill-in "Finish the query" box, or "Write your own SQL") no longer jumps the page
  up to the evidence feed. The result shows right under the Run button, and the page stays where it was. On easy and
  medium, the fill-in query says pass or fail: "✅ That returns the real number" or "❌ not the real number yet". On hard
  it shows the result only, because finding the number is the job there. The query is still saved in your evidence,
  counts as one query and costs 5 minutes, as before.
- The ⭐ bonus query after a solved case keeps the page still too, also when the star is earned.

### Added
- `tools/xbrowser/runinplace-test.js`: runs the fill-in, a SQL error, a hard case's own query and the bonus query on
  10 setups (iPhone, Android, Windows, Mac, iPad) and fails if the Run button moves by more than 3 px.
- This changelog, a contributing guide ([CONTRIBUTING.md](CONTRIBUTING.md)) and the release process: a branch and pull
  request per change, merge commits, and a tag and GitHub release per version.

## [1.4.1] - 2026-11-24: Practice tiles open on the first tap

### Fixed
- In WebKit tests on a small iPhone, a tap on a practice tile sometimes reached the tile but never opened the case
  (about 1 run in 14). The tap's click reported a mouse button other than the main one, so the browser did not follow
  the link. The app now opens its own links (`#/…`) itself when they are clicked; opening a link in a new tab still
  works as before. The cross-browser test logs the events and page state if a tile ever needs a second tap.

## [1.4.0] - 2026-11-24: Every screen size

### Added
- A responsive check of every screen (home, dialogs, case, notes, report, solved screen, hard case, case file #1) at
  26 sizes from 280 px phones to 4K, plus short landscape, in Chrome and WebKit (`tools/xbrowser/responsive-test.js`).

### Changed
- Folds, checkboxes and buttons are about 40 px to tap on phones and tablets.
- On big monitors the page frame grows to 1320 px (from 1800 px wide) and to 1480 px with larger type (from 2300 px).
- Home: the pattern deck sits under the week, and the crew spans the full width, so the two columns stay balanced.

### Fixed
- Case file #1: the right root cause was the longest answer option. All options are now about the same length.

## [1.3.0] - 2026-11-23: Easy grows up, and one page frame

### Changed
- From Daily 24 Nov and in practice: easy cases no longer have a check that prints the real number. Easy gets the
  fill-in query (replace one ____) and two red herrings instead of one.
- The week is 3 easy, 2 medium, 2 hard: Sunday to Tuesday easy, Wednesday and Thursday medium, Friday and Saturday hard.
- Check titles no longer hint at the cause (for example "Is any order in fct_orders twice?" is now "fct_orders: rows
  and distinct orders").
- Home and case pages share one frame from 960 px: at most 1200 px wide, a main column and a 360 px side column.
  Home shows today's case and the week beside practice; the case page shows evidence beside the checks.
- The level note sits inside the "Your job" box.

## [1.2.0] - 2026-11-23: Laptop width and table guide

### Added
- "What's in the database": a fold beside the checks with one plain line on every table (what a row is, where it comes
  from). Row counts are not shown, because in one case type a row count is the answer.

### Changed
- The case page uses two columns from 960 px instead of 1100 px, so laptops at 125–150% scaling are no longer squeezed
  into the phone layout.

## [1.1.0] - 2026-11-22: Friends' feedback

### Added
- A "Your job before 9:00" box on every case listing the two questions the report asks.
- Case type "The Hundredfold Day" gets a viewable Pebble Pay API docs card: amounts are in cents.
- From Daily 23 Nov and in practice: medium hides one of the usual checks, hard hides three.

### Changed
- Every cause option names a concrete mechanism and all four are about the same length, so the answer can't be guessed
  from the wording. The self-test fails if the right one is clearly the longest.
- Openings read as a chain: the alert, a witness with a symptom that matches it, and the boss asking the two report
  questions, never hinting at the cause.
- Solved screen: the result first (time, queries, reports, streak), then the buttons; the share text and legend are
  folded away; the install tip shows only on the first two solves.

### Fixed
- Story lines that were not true for every generated case (for example "thousands of customers" when a case had 300).

## [1.0.0] - 2026-11-22: Public launch

### Added
- MIT licence.
- Search engines may index the site; link previews (title, description, image), `robots.txt` and `sitemap.xml`.

### Removed
- The pilot banner and the test-version notice.

## [0.4.0] - 2026-11-22: Notes, streak cover and story integrity

### Added
- Case notes can be minimized into the Notes button, and on wide screens dragged, resized and moved with arrow keys.
- When Byte covers a missed day, the week, the streak button and the share text say so.
- The self-test checks that every number a story states can be found in the data.

### Fixed
- Seven story claims that did not match the data in some cases (for example Daily #14 said 3,294 emails when the
  batches added up to 3,063).

## [0.3.0] - 2026-11-19: Production incidents

### Added
- Four case types about production incidents: The Missing WHERE, The Double Send, The Wrong Goodbye and The Expensive
  Refresh, with two new characters (Nia, Theo) and several versions of each dialogue line.
- Practice cases #101–136 for the new types.
- Tips on your own SQL (case-sensitive text, the same result as before), Hide/Show for your queries, and a two-column
  case page on wide screens.

## [0.2.0] - 2026-11-16: Engagement

### Added
- First-visit tour, case notes, weekly difficulty (typed numbers and a fill-in query on harder days), a bonus ⭐ for
  proving the number with SQL, beat-my-time links, a countdown to the next daily, Share, an install tip on phones,
  streak protection and the pattern deck.
- A repeatable cross-browser test covering Windows, Mac, Android, iPhone and iPad.

## [0.1.0] - 2026-11-15: Pilot

### Added
- Case file #1, The Missing Revenue, with a full SQL console.
- Daily cases from seven generated case types, a practice library of 100 cases, streaks, the cast, and an installable
  app that works offline.

[Unreleased]: https://github.com/Kishanr7/3am-incident/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/Kishanr7/3am-incident/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/Kishanr7/3am-incident/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Kishanr7/3am-incident/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Kishanr7/3am-incident/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Kishanr7/3am-incident/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Kishanr7/3am-incident/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/Kishanr7/3am-incident/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Kishanr7/3am-incident/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Kishanr7/3am-incident/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Kishanr7/3am-incident/releases/tag/v0.1.0
