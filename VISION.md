# Vision: a daily data mystery

*Draft, 2026-11-15. Ideas, not commitments. Each stage starts only when the one before it shows real players want more.*

## The idea in one line

**A short daily case for people who work with data:** something broke, the numbers are wrong, and you find out why. Fun like Wordle or the LinkedIn daily games; useful because every case is a real failure pattern, so daily players get faster and calmer at root-cause analysis (RCA) when it happens for real.

## Why it could work

- **Daily puzzles are a habit** for a lot of professionals (NYT Games, LinkedIn's daily games, Murdle-style logic mysteries). There is no daily puzzle *for data people*: SQL practice sites are drills, not stories.
- **Two reasons to come back:** the streak, and real skill. "I play 3 a.m. Incident every morning" can also be a sentence on a CV.
- **Every case teaches a pattern** that causes real incidents: partial files, inner joins on incomplete dimensions, timezone boundaries, double-counting joins, late partitions, silent schema drift, overwritten backfills, units mixed up. Large public outages are usually several small, ordinary failures lining up. That's exactly what these cases train you to look for.

## The hard problems (and the plan for each)

| Problem | Why it's hard | Plan |
| --- | --- | --- |
| **Content: 100+ good cases** | Each case needs a dataset, a believable bug, red herrings and a verified solution. Hand-writing 365 a year doesn't scale | **Case templates.** One failure pattern = one generator with parameters (company, tables, which currency or region breaks, dates, red herrings). One template can produce many distinct, verified puzzles. Every generated case is solved automatically before it ships |
| **Phones** | Daily games are played on phones; typing SQL on a phone is painful | Two modes. **Daily (easy–medium):** tap-to-investigate, choosing the next query from 3–4 options, filters and drill-downs, 5–10 minutes. **Case files (medium–hard):** full SQL console, desktop |
| **Fun, not homework** | SQL tools feel like work | Story first: a warm cast, short dialogue, time pressure, one satisfying "aha" per case, and a share line like Wordle's |
| **Difficulty** | Too easy is boring, too hard and people quit | Play-test every template; feedback that explains wrong answers (already in case 1); hints that cost time, not progress |

## A friendly cast (first sketch)

- **Maya**, the CFO: sharp, impatient, fair. Wants one number and one sentence.
- **Sam**, growth lead: panics first, apologises later.
- **Byte**, the on-call office cat: walks across your keyboard; delivers hints.
- **Old Gus**, the legacy cron job: nobody knows what he does, but everything breaks without him.
- **The Vendor**: never on time, always "investigating".

Warm palette, hand-drawn touches, gentle sound. A cosy mystery, not a terminal.

## Stages

| Stage | What | Proceed when |
| --- | --- | --- |
| **0. Pilot** (now) | Case #1, 5–8 data engineers, file shared privately | PILOT.md thresholds met |
| **1. Daily prototype** | 7 short tap-to-investigate cases from 3 templates; streaks kept on the device; the same share line | ≥ 60% of pilot players come back on 3+ days of the week without reminders |
| **2. Public launch** | Free static hosting, your name on it, write-up + Show HN / LinkedIn / r/dataengineering | Stage 1 retention holds |
| **3. Library** | 100 cases tagged easy/medium/hard, from ~15 templates; one free daily case | Steady daily players after launch |
| **4. Accounts** | Sign-in (Google/GitHub/email), progress synced across devices, streak rewards, team leaderboards | People ask for it, *and* a privacy and security plan is ready |

## Where it stands (2026-11-15)

By the owner's decision, stage 1 was built before pilot feedback arrived, together with a 100-case practice library (easy/medium/hard). Both are installable on iPhone and Android as a web app and work offline. **The gates are unchanged:** the public launch (stage 2) still waits for pilot results (`PILOT.md`) and stage-1 retention.

Known gap: the library's 100 cases come from **3 templates**, so players will see the same three patterns many times. The cases differ in company, numbers and red herrings, but not in the lesson. More templates (timezone boundary, late backfill, units in cents, unannounced dedupe change, partition overwrite…) matter more than more cases.

## Why accounts come last

Wordle grew to millions of players with no login: the streak lived in the browser. Accounts add a server, a database, password and SSO security, data-protection duties (GDPR and India's DPDP Act), running costs and support. They also put a sign-up wall in front of a first-time player. Add them only when players ask for cross-device streaks or team play. By then the design will be clear, and the cost will be justified.

## What would make us stop

- Pilot players finish but don't want another case.
- Daily-prototype players don't come back without reminders.
- Templates can't produce cases that feel different from each other.
