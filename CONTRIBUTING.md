# Contributing

Thanks for helping. A few rules keep the game fair and the site working.

## The game's rules

- **Every fact the answer depends on is visible.** It must be in a check or derivable with SQL, never only mentioned.
- **Every number and claim in a story is true for every generated case.** Compute it from the data; never hard-code
  "tripled", a weekday or "afternoon".
- **Options don't give the answer away.** Every cause option names a concrete mechanism, and all four are about the
  same length.
- **Text changes don't change the data.** Change wording without adding or reordering random draws, and prove that
  answers are unchanged for every case.
- **A published daily never changes.** Level rules are versioned by date (`TAI.LEVEL2_FROM`, `TAI.LEVEL3_FROM`).

## Setup

The site is static: serve the repository root and open `/site/` and `/tools/selftest.html`.

```sh
python -m http.server 8767        # then http://localhost:8767/site/
cd tools/xbrowser && npm i playwright && npx playwright install chromium webkit
```

## Tests

Run before every pull request, on all platforms (see [tools/xbrowser/README.md](tools/xbrowser/README.md)):

- `tools/selftest.html?days=1000`: every daily and practice case. Checks, answers, determinism, option length, story
  integrity, no leaked answer on medium, hard and easy.
- `node xtest.js` (Windows, Mac, Android, iPhone and iPad play-through) and the feature tests in `tools/xbrowser/`,
  including `responsive-test.js` (every screen at 26 sizes).
- After merging, run them again against https://3am-incident-kish.netlify.app.

## Changes

- **One branch per change**, cut from `main`, named by type and version: `feat/v1.5.0-short-name`,
  `fix/v1.4.2-short-name`, `docs/…`.
- **One logical change per commit**, using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `style:`), with a scope where it helps (`feat(cases): …`,
  `fix(home): …`) and a body explaining *why* when it isn't obvious.
- **Every bug fix comes with a test** that fails without it.
- **Every commit leaves the site working** and the tests passing.
- **Bump the version:** add a section to [CHANGELOG.md](CHANGELOG.md), and bump `VERSION` in `site/sw.js` whenever files
  under `site/` change.
- **Open a pull request against `main`**, titled `vX.Y.Z: what changed`. The body says what changed and why, then the
  test results.
- **Merge with a merge commit** (`Merge vX.Y.Z: what changed (#N)`), not squash. Netlify deploys `main`, so merging
  publishes the site.
- **Tag and release:** tag `vX.Y.Z` on the merge commit and publish a GitHub release whose notes are that version's
  changelog section.
