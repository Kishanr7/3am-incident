# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/): a new case type, level rule or screen is a minor version; a fix is a patch.
Each release also bumps the offline cache version in `site/sw.js` (`tai-vN`), so returning players get the new files.

## [Unreleased]

### Added
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
