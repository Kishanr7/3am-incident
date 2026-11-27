# 3 a.m. Incident

[![Play](https://img.shields.io/badge/play-3am--incident--kish.netlify.app-2f6f6a)](https://3am-incident-kish.netlify.app) [![Release](https://img.shields.io/github/v/release/Kishanr7/3am-incident)](https://github.com/Kishanr7/3am-incident/releases) [![MIT licence](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

**A daily data mystery.** The dashboard says something terrible happened overnight. Every job says SUCCESS. Find out what really happened before the 9:00 meeting.

**Play it:** https://3am-incident-kish.netlify.app (free, no sign-up, works offline once loaded; install it on your phone from the browser menu).

> Status: public since 22 Nov 2026. Early days: a handful of players so far. Feedback and case ideas welcome as GitHub issues.

## What's in it

| Mode | What | Where |
| --- | --- | --- |
| **Daily case** | A new case every day, 5–10 minutes, tap-to-investigate. A "Your job" box lists the two questions to answer, and "What’s in the database" explains every table. Same case for everyone on a given date. Streak kept on the device | Home page |
| **Practice library** | 122 cases: 46 easy, 42 medium, 34 hard. #1–100 cover six of the first seven types (the retired cents type is hidden); #101–136 the four production incidents (3 of each per level). Easy: options plus a fill-in query, two red herrings; medium: type the number, one of the usual checks hidden; hard: three hidden, write your own SQL | Home page → Practice library |
| **Case files** | Case #1, *The Missing Revenue*: a full SQL console, no query cards, 20–30 minutes, laptop | `/case-1/` |

Every case is a real failure pattern, with a short lesson at the end: what happened, how to spot it, how to prevent it, and where it shows up at real jobs. There are ten patterns: six where a dashboard number is wrong, and four production incidents. The job box names the tables behind the wrong number (for example `orders` → `daily_orders` (dashboard)), so you know where to look.

| Case type | The failure |
| --- | --- |
| The Late Partition | One source's data landed after the nightly job ran |
| The Best Day Ever | A dimension got duplicate rows; a join double counted |
| The Vanishing Sign-ups | An app release renamed a field; rows lost their country |
| The Quiet Rename | A provider says "succeeded" instead of "paid"; the model only counts "paid" |
| Who Orders at 3 a.m.? | A new ingest service stamps UTC; evening orders move to the next day |
| The Rewritten Week | A backfill with a test filter left in overwrote three past days |
| The Missing WHERE | A hand-run `UPDATE` meant for one product had no `WHERE`; every price became $0.99 |
| The Double Send | An email job timed out and the retry started from batch 1, so early batches got it twice |
| The Wrong Goodbye | A clean-up job turned a missing login into 1970 and deleted active app users |
| The Expensive Refresh | A new 5-minute dashboard tile filters on `DATE(event_time)`, so every refresh scans the whole table |

Daily #1–#7 used the first three types and are kept exactly as published, dialogue included. Daily #8–#11 cycled through the first seven. From Daily #12 (20 Nov 2026), days cycled through all eleven, with the production incidents mixed in. From Daily #28 (6 Dec 2026) the cents type (The Hundredfold Day) is retired: days cycle through the other ten, and Daily #1–#27 stay exactly as they were. Practice #1–100 stay on the first seven types, so saved progress keeps pointing at the same cases, but the cents cases are no longer listed (their links still open); #101–136 add the four production incidents.

Each case picks one of several versions of its opening, reactions and closing, so a type reads differently each time it comes round. Cast: Maya (CFO), Sam (growth), Nia (support lead), Theo (CRM and email), Byte, Old Gus and The Vendor.

**Case notes** (📝 in the bottom bar): a panel, closed by default, for keeping track. The – button minimizes it into the Notes button (it shrinks into it), and the Notes button brings it back where it was. On screens 900 px and wider it can be dragged anywhere by its title bar or the ⠿ handle (arrow keys work too) and resized; the position is remembered. On phones it opens above the bottom bar, so Notes, Byte and Report stay reachable. Mark each possible answer ✕ ruled out or ✓ likely (a logic-grid idea, as in Murdle), pin any result with 📌 and jump back to it, and jot numbers in a scratchpad. Saved per case on the device; it never costs game time. Ruled-out answers also look struck through in the report.

**Difficulty by weekday**, like a crossword. From 24 Nov 2026: Sun–Tue easy, Wed–Thu medium, Fri–Sat hard (3 easy, 2 medium, 2 hard). **Easy**: pick the answers from options; no check prints the real number, so you finish a short query (replace one ____) to find it; two red herrings. **Medium**: type the real number, finish the query, and one of the usual checks is missing. **Hard**: type the number, write your own SQL, three checks missing. Earlier dailies keep the rules they were published with (17–23 Nov: Mon–Tue easy with no SQL, Wed–Thu and Sun medium). After two wrong numbers Byte shows the full query. **Bonus ⭐**: write a query that returns the real number.

**Beat my time**: the shared result links to the same case with your finish time; your friend sees it and who won. **Streak protection**: Byte covers one missed day in any 7, automatically; the covered day shows a 🐾 on "This week" and the streak button, with a line saying when the next cover is ready. Solving a missed day later doesn't count for the streak. **Pattern deck**: one card per failure pattern, unlocked by solving that type (★ at 1, 3, 7 solves).

The cast: Maya (CFO), Sam (growth lead), Byte (the on-call cat who gives hints), Old Gus (the legacy cron job) and The Vendor.

## Phones: install it like an app

The site is a Progressive Web App (PWA): it installs to the home screen, opens full screen and works offline after the first visit.

- **iPhone:** open the link in Safari → Share → **Add to Home Screen**.
- **Android:** open the link in Chrome → **Install** (the home page also shows an Install button).

Putting it in the App Store or Google Play would need developer accounts (Apple $99/year, Google $25 once) and a wrapper such as Capacitor or a Trusted Web Activity. It's not needed to play.

## No backend, no accounts, no cookies

Everything runs in the player's browser: a real SQLite engine ([sql.js](https://github.com/sql-js/sql.js), from cdnjs) runs against a small fictional database generated from a fixed seed. Nothing typed is sent anywhere. The query box helps players who know another dialect: a fold with the usual PostgreSQL, MySQL and Spark differences, and a tip when a query fails on another dialect's syntax.

**Visit counts.** The live site counts page views with [GoatCounter](https://www.goatcounter.com) (`site/assets/stats.js`): no cookies, nothing stored on the device, no personal data, so no consent banner. It counts one path per screen (`/`, `/daily/2026-11-30`, `/practice/12`, `/case-1/`, `/privacy/`) and a few events (`solved-daily-easy`, `share-clicked`, `copy-result-clicked`, `beat-my-time-link-opened`, `solved-case-1`). It only runs on the live host, never on localhost or deploy previews, skips browsers that send Do Not Track or Global Privacy Control, and isn't cached by the service worker, so offline play is untouched. What players are told: [site/privacy/](site/privacy/index.html). Dashboard: https://3am-incident.goatcounter.com (owner login).

**Search engines.** `site/index.html` and `site/case-1/` carry a description, canonical URL, Open Graph and Twitter tags and JSON-LD (`WebSite` + `VideoGame`); the home page has a short static intro that the app replaces on load, so crawlers that don't run JavaScript still read what the game is. `site/sitemap.xml` lists the three public pages; update `lastmod` when their text changes. Google Search Console ownership is verified by `site/google5911b0789f211ac9.html` (keep it); Bing imports it from Search Console. Another service's `<meta>` tag goes where `site/index.html` says so.

Progress and streaks live in the browser's local storage. To move a streak to another device, use **Stats → Copy streak code** and paste it on the other device. Accounts are deliberately postponed (see `VISION.md`).

## How the cases are made

`site/assets/cases.js` holds **case templates**. A template is a failure pattern with settings: company, which source, country or app version breaks, sizes, timings, red herrings. A seeded random generator turns a date, or a practice number, into one fixed case. Every number in the story is computed from the generated rows, so the story and the data can't disagree.

Each template also ships **self-checks**: SQL that must return the intended answer, for example "the dashboard total equals the truth minus the late partition". If a random draw makes a weak puzzle (say, a drop too small to notice), the generator re-rolls it deterministically.

## Testing

| Test | How | Result (2026-11-15) |
| --- | --- | --- |
| Case generator: 1000 daily dates + 136 practice cases, all 11 types (including the retired one, and a check that it is never dealt again) | Serve the repo root, open `tools/selftest.html?days=1000`. Story integrity: every number in a case's teaser, alert, dialogue, closing and wrong-answer notes must be findable in the data (a value, a column total or average, or a row count), and templates check that alert totals match the raw tables. It runs every self-check and every query card, checks there's exactly one right answer per question, distinct options, determinism, difficulty rules, that the right cause option is never clearly the longest, and that every table has a description | **All pass** (1136 cases) |
| Published dailies unchanged | Old and new engine compared for Daily #1–#7: same company, story, numbers, answer order | **Identical** |
| Full play-through in the UI at phone width (375 px) | Script plays all 7 daily + 136 practice cases (every type at easy, medium and hard): runs every card, asks Byte, runs own SQL, sends a wrong report (checks feedback), then the right one (checks solved, share text, next link, no sideways scroll) | **All pass, no console errors** |
| Streak rules | Today's solve counts; archive and practice solves don't; streak code round-trips; junk code rejected | Pass |
| Offline | Load once, stop the server, reload: today's case and the SQL engine run from the device | Pass |
| Light and dark themes, theme switch remembered | Manual + script | Pass |
| Text contrast (WCAG AA, 4.5:1) | Every text/background token pair, both themes | Pass (lowest 4.6:1) |
| Real iPhone / Android devices | Not yet: tested in a phone-sized browser with an Android user agent | **Not verified** |

## Colour

The palette was chosen for calm, not drama. Research on colour and emotion finds that saturation drives arousal and brightness drives pleasantness, and that blue, blue-green and green hues rate as the most pleasant ([Valdez & Mehrabian, 1994](https://pubmed.ncbi.nlm.nih.gov/7996122/); [Wilms & Oberfeld, 2018](https://pubmed.ncbi.nlm.nih.gov/28612080/)). So: a soft paper background (not pure white), muted teal and sage accents, and charcoal text (not pure black). Dark mode uses an off-black (#141a1c) and desaturated accents, following common dark-theme guidance against pure black and saturated colours on dark backgrounds.

## Files

| Path | What |
| --- | --- |
| `site/index.html`, `site/assets/*` | Home, daily player, practice library, engine, templates, cast |
| `site/case-1/` | Case file #1 (full SQL console) |
| `site/manifest.webmanifest`, `site/sw.js`, `site/icons/` | Install-as-app and offline support |
| `site/_headers`, `netlify.toml` | Security headers (Content-Security-Policy lists every outside host); Netlify publishes `site/` only |
| `site/assets/stats.js`, `site/privacy/` | Cookie-free visit counts and the privacy note |
| `site/404.html`, `site/robots.txt`, `site/sitemap.xml`, `site/favicon.*` | Not-found page, crawler files, favicons |
| `tools/selftest.html` | Generator self-test (not published) |
| `PILOT.md`, `VISION.md` | Pilot plan and thresholds; where this could go |

## Play-test log

| Date | Player | Result | Change |
| --- | --- | --- | --- |
| 2026-11-15 | Author | Case 1: Q1–Q3 right first time; stuck on Q4 ("yesterday" was ambiguous). Solved after the fix | Q4 names the date; specific feedback for common wrong answers; fourth hint |


## Changes and contributing

What changed in each version is in [CHANGELOG.md](CHANGELOG.md). How to work on it (branches, commits, tests, releases) is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT: see [LICENSE](LICENSE). Fonts (Fraunces, Lato) are SIL Open Font License; sql.js is MIT.
