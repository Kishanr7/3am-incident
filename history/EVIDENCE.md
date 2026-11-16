# EVIDENCE (3 a.m. Incident entries)

Copied from the shared worktree (branch claude/github-account-check-97a498, commits ac43fdf..1af6265). Only the game's rows.

| ID | Claim | Label | Source |
| --- | --- | --- | --- |
| E44 | No browser game about data pipelines silently producing wrong numbers was found (neighbours: YouBrokeProd, The Incident Challenge, SQL Murder Mystery) | PUBLIC_EVIDENCE (2 searches, 2026-11-15) | dev.to/cdnsteve/how-i-turned-my-worst-on-call-nightmare-into-a-browser-game-36fa; chatgate.ai/post/the-incident-challenge; mystery.knightlab.com |
| E45 | 3 a.m. Incident case 1 is solvable from the data, works at 375 px and in both themes, meets AA contrast | ASSISTANT_TESTED | games/3am-incident/README.md |
| E46 | Players find it fun / share it | UNKNOWN | Nobody has played it |
| E47 | First real player (owner) solved Q1–Q3 first time, stalled on Q4 due to "yesterday" ambiguity | OWNER_TESTED (2026-11-15, screenshot in chat) | games/3am-incident/README.md play-test log |
| E48 | One friend liked the idea ("could get popular") and the colours, but found the home page dense, the copy hard to read and AI-sounding, and missing a simple "what is this game" line | INDEPENDENT_TESTED (qualitative, n=1, a friend, relayed by owner screenshot 2026-11-15; not a confirmed data engineer; not pilot-threshold data) | Owner chat screenshot |
| E49 | Same friend after the simplified home: "much better"; suggested a 2-3 step onboarding tour for first-time visitors | INDEPENDENT_TESTED (qualitative, n=1, same friend as E48, owner screenshot 2026-11-16; not pilot-threshold data) | Owner chat screenshot |
| E50 | All 107 cases (every check opened), tour, stats, streak code, own SQL, case 1 pass on 11 setups: Windows Chrome/Edge, Mac WebKit/Chrome, iPhone SE/13 mini/15 Pro Max/320 px (WebKit, touch), Android Pixel 7/Galaxy S9+ (Chrome, touch), iPad Mini; offline works with the server switched off (WebKit, Chrome); daily case correct in 5 time zones; self-test 1100 cases | ASSISTANT_TESTED (Playwright 1.61.1 on Windows 11, 2026-11-16; WebKit is Playwright's Windows build, not Safari on real Apple devices) | game repo tools/xbrowser |
| E51 | Works on real iPhones/Android phones and in Firefox | UNKNOWN | Not run on real devices; Firefox build would not start |
| E52 | Before this batch, the exact numeric answer was printed by a ready-made check in 6 of the last 7 dailies and 29 of 107 cases (late, fanout templates every time) | ASSISTANT_TESTED (2026-11-16, script over all 107 cases) | Chat |
| E53 | After the batch: answer query verified for 1100 generated cases; no medium/hard check shows the incident-day answer (240 checked); all 107 cases pass on 11 setups; live site passes on iPhone SE/Pixel 7 setups | ASSISTANT_TESTED (2026-11-16) | game tools/selftest.html, tools/xbrowser |
| E54 | Target times per level (easy 3–5, medium 6–10, hard 12–20 min) suit players | INFERENCE (secondary sources on daily puzzle and mobile session lengths) | Needs players' share lines (time, queries) |
