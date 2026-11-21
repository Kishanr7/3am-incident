# 3 a.m. Incident

**A daily data mystery.** The dashboard says something terrible happened overnight. Every job says SUCCESS. Find out what really happened before the 9:00 meeting.

> Status: **private pilot**, unlisted (`noindex`). Not yet tested by players outside the author.

## What's in it

| Mode | What | Where |
| --- | --- | --- |
| **Daily case** | A new case every day, 5–10 minutes, tap-to-investigate. Same case for everyone on a given date. Streak kept on the device | Home page |
| **Practice library** | 136 cases: 52 easy, 47 medium, 37 hard. #1–100 cover the first seven types; #101–136 the four production incidents (3 of each per level). Easy has one red herring; hard removes two checks, so you write some SQL yourself | Home page → Practice library |
| **Case files** | Case #1, *The Missing Revenue*: a full SQL console, no query cards, 20–30 minutes, laptop | `/case-1/` |

Every case is a real failure pattern, with a short lesson at the end: what happened, how to spot it, how to prevent it, and where it shows up at real jobs. There are eleven patterns: seven where a dashboard number is wrong, and four production incidents.

| Case type | The failure |
| --- | --- |
| The Late Partition | One source's data landed after the nightly job ran |
| The Best Day Ever | A dimension got duplicate rows; a join double counted |
| The Vanishing Sign-ups | An app release renamed a field; rows lost their country |
| The Hundredfold Day | A new payment provider sends cents; the pipeline reads dollars |
| The Quiet Rename | A provider says "succeeded" instead of "paid"; the model only counts "paid" |
| Who Orders at 3 a.m.? | A new ingest service stamps UTC; evening orders move to the next day |
| The Rewritten Week | A backfill with a test filter left in overwrote three past days |
| The Missing WHERE | A hand-run `UPDATE` meant for one product had no `WHERE`; every price became $0.99 |
| The Double Send | An email job timed out and the retry started from batch 1, so early batches got it twice |
| The Wrong Goodbye | A clean-up job turned a missing login into 1970 and deleted active app users |
| The Expensive Refresh | A new 5-minute dashboard tile filters on `DATE(event_time)`, so every refresh scans the whole table |

Daily #1–#7 used the first three types and are kept exactly as published, dialogue included. Daily #8–#11 cycled through the first seven. From Daily #12 (20 Nov 2026), days cycle through all eleven, with the production incidents mixed in. Practice #1–100 stay on the first seven types, so saved progress keeps pointing at the same cases; #101–136 add the four production incidents.

Each case picks one of several versions of its opening, reactions and closing, so a type reads differently each time it comes round. Cast: Maya (CFO), Sam (growth), Nia (support lead), Theo (CRM and email), Byte, Old Gus and The Vendor.

**Case notes** (📝 in the bottom bar): a panel, closed by default, for keeping track. The – button minimizes it into the Notes button (it shrinks into it), and the Notes button brings it back where it was. On screens 900 px and wider it can be dragged anywhere by its title bar or the ⠿ handle (arrow keys work too) and resized; the position is remembered. On phones it opens above the bottom bar, so Notes, Byte and Report stay reachable. Mark each possible answer ✕ ruled out or ✓ likely (a logic-grid idea, as in Murdle), pin any result with 📌 and jump back to it, and jot numbers in a scratchpad. Saved per case on the device; it never costs game time. Ruled-out answers also look struck through in the report.

**Difficulty by weekday** (dailies from 17 Nov 2026): Mon–Tue easy (pick from options, no SQL needed), Wed–Thu and Sun medium (type the real number; finish a fill-in-the-blank query), Fri–Sat hard (two checks missing; write your own SQL). After two wrong numbers Byte shows the full query. **Bonus ⭐**: write a query that returns the real number.

**Beat my time**: the shared result links to the same case with your finish time; your friend sees it and who won. **Streak protection**: Byte covers one missed day in any 7, automatically; the covered day shows a 🐾 on "This week" and the streak button, with a line saying when the next cover is ready. Solving a missed day later doesn't count for the streak. **Pattern deck**: one card per failure pattern, unlocked by solving that type (★ at 1, 3, 7 solves).

The cast: Maya (CFO), Sam (growth lead), Byte (the on-call cat who gives hints), Old Gus (the legacy cron job) and The Vendor.

## Phones: install it like an app

The site is a Progressive Web App (PWA): it installs to the home screen, opens full screen and works offline after the first visit.

- **iPhone:** open the link in Safari → Share → **Add to Home Screen**.
- **Android:** open the link in Chrome → **Install** (the home page also shows an Install button).

Putting it in the App Store or Google Play would need developer accounts (Apple $99/year, Google $25 once) and a wrapper such as Capacitor or a Trusted Web Activity. It's not needed to play.

## No backend, no accounts

Everything runs in the player's browser: a real SQLite engine ([sql.js](https://github.com/sql-js/sql.js), from cdnjs) runs against a small fictional database generated from a fixed seed. Nothing typed is sent anywhere.

Progress and streaks live in the browser's local storage. To move a streak to another device, use **Stats → Copy streak code** and paste it on the other device. Accounts are deliberately postponed (see `VISION.md`).

## How the cases are made

`site/assets/cases.js` holds **case templates**. A template is a failure pattern with settings: company, which source, country or app version breaks, sizes, timings, red herrings. A seeded random generator turns a date, or a practice number, into one fixed case. Every number in the story is computed from the generated rows, so the story and the data can't disagree.

Each template also ships **self-checks**: SQL that must return the intended answer, for example "the dashboard total equals the truth minus the late partition". If a random draw makes a weak puzzle (say, a drop too small to notice), the generator re-rolls it deterministically.

## Testing

| Test | How | Result (2026-11-15) |
| --- | --- | --- |
| Case generator: 1000 daily dates + 136 practice cases, all 11 types | Serve the repo root, open `tools/selftest.html?days=1000`. Story integrity: every number in a case's teaser, alert, dialogue, closing and wrong-answer notes must be findable in the data (a value, a column total or average, or a row count), and templates check that alert totals match the raw tables. It runs every self-check and every query card, checks there's exactly one right answer per question, distinct options, determinism, and difficulty rules | **All pass** (1100 cases, about 155 per type) |
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
| `site/_headers`, `netlify.toml` | No-index and security headers; Netlify publishes `site/` only |
| `tools/selftest.html` | Generator self-test (not published) |
| `PILOT.md`, `VISION.md` | Pilot plan and thresholds; where this could go |

## Play-test log

| Date | Player | Result | Change |
| --- | --- | --- | --- |
| 2026-11-15 | Author | Case 1: Q1–Q3 right first time; stuck on Q4 ("yesterday" was ambiguous). Solved after the fix | Q4 names the date; specific feedback for common wrong answers; fourth hint |

All rights reserved until a licence is chosen at public release.
