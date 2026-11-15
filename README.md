# 3 a.m. Incident

**A data mystery you solve with SQL.** The CFO's dashboard says yesterday's revenue fell by a third. Every nightly job is green. The board deck goes out at 9. Find out what really happened.

> Status: **private pilot**. Case #1 only. Played by its author; being tested with a handful of data engineers before any public release.

## Play

Open `index.html` in a browser. That's it. A real SQLite engine ([sql.js](https://github.com/sql-js/sql.js)) runs inside the page against a fictional company's warehouse, generated from a fixed seed. It needs an internet connection once, to load the engine from cdnjs. Desktop is recommended.

Nothing you type leaves the page. No account, no tracking.

## What's in case #1

- An incident channel with the CFO and the growth lead.
- A SQL console over nine warehouse tables: raw events, staging, the dashboard table, FX rates, landed files, job logs, deploys and the model SQL.
- A four-question report to the CFO, with feedback that explains *why* a wrong answer is wrong.
- Four hints (each adds 2:00), a spoiler-free result to share, and a debrief on what a senior engineer would change so it never happens again.

Every number in the story is computed from the generated data, so the text and the data cannot disagree.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole game |
| `PILOT.md` | How the private pilot runs: invite, feedback form, continue/stop thresholds, results log |
| `VISION.md` | Where this could go (daily puzzle, case library, accounts), and in what order |

## Play-test log

| Date | Player | Result | Change |
| --- | --- | --- | --- |
| 2026-11-15 | Author | Q1–Q3 right first time; stuck on Q4 ("yesterday" was ambiguous). Solved after the fix | Q4 names the date; specific feedback for common wrong answers; fourth hint |

All rights reserved until a licence is chosen at public release.
