# 3 a.m. Incident

**A data-engineering mystery you solve with SQL.** The CFO's dashboard says yesterday's revenue fell by a third. Every nightly job is green. The board deck goes out at 9. Find out what really happened.

> Status: private prototype, `UNVALIDATED`. Not published. Nobody outside this project has played it.

## Play it locally

It is one HTML file. A real SQLite engine ([sql.js](https://github.com/sql-js/sql.js), loaded once from cdnjs) runs inside the browser, against a fictional warehouse generated from a fixed seed.

```
python -m http.server 8766 --directory games/3am-incident
```

Then open http://localhost:8766. (Opening the file directly also works in most browsers; WebAssembly loads from the CDN either way.)

## Case #1: The Missing Revenue

- **You get:** an incident channel, a SQL console, nine warehouse tables (raw events, staging, the dashboard table, FX rates, landed files, job logs, deploys, model SQL), three hints (+2:00 each).
- **You answer:** is the drop real, which orders are missing, the root cause, and the true revenue.
- **You win:** a spoiler-free result to share (time, queries, hints, ■ per question right first time), and a debrief written the way a senior engineer would explain it.

The failure is deliberately *realistic*, not exotic. Two harmless-looking changes combine: a partial vendor file, and a "performance-only" refactor that swapped `LEFT JOIN` + fallback for `JOIN`. Every job reported SUCCESS. Red herrings: a dedupe change, a credential rotation, normal daily duplicates.

**Spoiler-free design check:** every number in the story (the alert, the CFO's message, the answer key) is computed from the generated data at load time, so text and data cannot disagree.

## Why this exists

A daily-style SQL mystery for people who work with data. There are browser games about general production incidents and about learning SQL, but searches on 2026-11-15 found none about *a data pipeline quietly producing a wrong number*, the incident data engineers actually face. This one is aimed at the people who would recognise it.

## Tested (by the agent, 2026-11-15)

| Check | Result |
| --- | --- |
| Clue chain solvable from the data alone | Yes: `rows_in` 947 vs `rows_out` 581 → EUR/GBP missing in `fx_rates` → `source_files` loaded 2 of 4 → v11 vs v12 SQL |
| Natural fallback answer accepted | Previous-day rates give $48,259 vs truth $48,228 (0.07%; tolerance 2%) |
| Wrong report → per-question feedback; right report → case closed, share text, focus on Copy | Yes |
| SQL errors, Ctrl+Enter, hints with penalty, reset | Yes |
| 375 px phone width, light mode | No horizontal page scroll; wide tables scroll inside their box |
| Desktop dark mode | Yes |
| WCAG AA text contrast | Lowest 4.60:1 (light), 6.53:1 (dark) |
| Console errors | None |
| Real players | **None.** Whether it is fun, too easy or too hard is unknown |

## Known limits

- Needs an internet connection once to fetch sql.js from cdnjs.
- Answers are computed client-side; a determined player can read them in the source. Fine for a puzzle.
- Q1–Q3 are multiple choice and can be guessed. The share text shows the query count, which exposes 0-query "solves".
- Typing SQL on a phone is possible but slow; desktop is the intended experience.

## Ideas for later cases (only if case 1 lands with real players)

Late-arriving partition, timezone boundary, fan-out join double-counting, schema drift renaming a column to NULL, a backfill that silently overwrote a day, a currency stored in minor units.

## Play-test log

| Date | Player | Result | Change made |
| --- | --- | --- | --- |
| 2026-11-15 | Kishan (owner, first real player) | Q1–Q3 right on the first report. Stuck on Q4: entered 43,568.90, which is 13 March's dashboard figure, reading "yesterday" as the day before the latest row | Q4 now names the date ("14 March, the incident day"). Wrong Q4 answers get a specific reason (another day's figure, the broken number, local currency, refunds included, duplicate events counted, below the broken number). A fourth hint covers Q4 |
