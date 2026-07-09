# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a personal-project repo for the NAVER AI Challenge bootcamp (개인 프로젝트 — no official contest rules, only cohort operating rules: daily PR submissions, week-3 demo day). It is a **research/spike hub**, not a single deployable application: most of the repo is Korean-language planning docs, one Playwright automation spike, and one static HTML prototype. There is no root `package.json`, build system, linter, or test runner configured anywhere in the repo.

Treat `.md` files under `tax-agent/` as living design/research notes, not settled fact — the "tax-agent" direction has changed more than once (see "Current direction" below before acting on `tax-agent/PLAN.md`).

## Repository layout

- `hometax-fincert-spike/` — the only runnable Node.js project. Playwright scripts that probe 홈택스(Korean National Tax Service) login and invoice-issuance automation using a 금융인증서 (financial certificate). Has its own `package.json`; run commands from inside this directory.
- `tax-invoice-agent-prototype/index.html` — a single self-contained HTML/CSS/vanilla-JS file (no build step, no framework) that replays a scripted "tax invoice issuance" demo. Open directly in a browser.
- `NAVER_AIchallenge_hub.wiki/` — a **separate git repository** (its own `.git`, cloned from the GitHub wiki), not tracked by the main repo. Commit/push changes here independently, from inside that directory.
- `tax-agent/` — the design-history trail for the "tax-agent" idea: `PLAN.md`, `tax-agent-architecture.md`, `tax-agent-research.md`, `tax-agent-workflow.pdf`, `인계 프롬프트.md` (see reading order below). Also see `NAVER_AIchallenge_hub.wiki/Tax-Invoice-Agent-Proposal.md`, which lives in the separate wiki repo.
- `notes/` — personal bootcamp class notes (`7-6.txt`, `7-8-특강.md`, `IT서비스_기획부터_배포까지_프로세스.md`, `팔란티어_기획부터_배포까지_프로세스_조사.md`, and dated working-notes files like `7-9.md`) — not part of the tax-agent design trail, just study notes.
- `scientific.html` — a standalone calculator demo from earlier bootcamp coursework, unrelated to the tax-agent work.
- `.github/workflows/auto-merge.yml` — a cohort-wide bot ("PR merge on time") that runs daily. It auto-merges any open PR unless: it targets `main` (skipped, comment only), it's labeled `review` (silently skipped), it's changes-requested (skipped, comment only), or it has merge conflicts (**auto-closed** with a comment — not merely skipped). Check this file's rules before assuming a PR is safe to leave alone.
- `.github/pull_request_template.md` — required PR format for this cohort: title as `[루카스아이디_실명] - 한 문장 요약`, plus body sections "내가 설명할 수 있는 부분" / "아직 이해 못 한 부분" / "새로 알게 된 것".

## Commands

There is no root-level build/lint/test. The only runnable project is `hometax-fincert-spike/`:

```
cd hometax-fincert-spike
npm install
npx playwright install chromium   # first time only

npm run explore         # explore-login.mjs — maps the 홈택스 login screen, no credentials used
npm run login-test      # login-test.mjs — verifies financial-cert session persists via storageState
npm run invoice-check   # invoice-account-check.mjs — checks invoice-issuance menu access / account type
npm run invoice-explore # invoice-explore.mjs — maps invoice-issuance form fields, no submission
npm run invoice-issue   # invoice-issue.mjs — fills the invoice form and gates real submission behind a typed confirmation
npm run personal-explore # personal-tax-explore.mjs — maps which 개인(personal) menus are actually reachable, no submission
npm run refund-check     # refund-check.mjs — fully automates the read-only "환급금 조회" (refund lookup) flow end-to-end
```

`explore-login.mjs` → `login-test.mjs` → `invoice-account-check.mjs` → `invoice-explore.mjs` → `invoice-issue.mjs` are numbered steps in one spike sequence (the 사업자/business invoice-issuance path), each depending on state (`auth/storageState.json`, `reports/`) produced by the previous script — don't run them out of order. `personal-explore` and `refund-check` are a separate, later spike sequence for the 개인(personal)-account path; they only need `auth/storageState.json` from `login-test.mjs`.

## Current direction (read before trusting tax-agent/PLAN.md)

`tax-agent/PLAN.md` reads as a finalized 15-day backend plan (Express+TS, SQLite, mismatch-detection as priority #1, tax-invoice issuance as #2, using **공동인증서** auth). That plan was superseded on 2026-07-08: the user has no access to 공동인증서, mismatch-detection was judged too passive/undifferentiated relative to existing services, and the project moved to spiking **금융인증서**-based automation instead. None of `PLAN.md`'s `server/` structure (Express, SQLite, `matcher.ts`, etc.) has actually been built — no `server/` directory exists in this repo.

For the current state and open questions, read in this order: `tax-agent/인계 프롬프트.md` → `tax-agent/tax-agent-research.md` → `tax-agent/tax-agent-architecture.md`. Several things at different levels of "decided" — don't conflate them:
- **Auth method for any spike work is settled**: 금융인증서 + Playwright `storageState`, not 공동인증서. Verified: the login persists across a fresh browser context on the same machine, and even across days without re-authentication (confirmed 2026-07-08 → 2026-07-09). Cross-machine/long-term expiry behavior still unverified.
- **Business (사업자) invoice issuance is blocked indefinitely for now**: it requires a business financial certificate, and the user could not obtain one from their father as of 2026-07-09 (confirmed blocked for personal accounts via `invoice-account-check.mjs`). Spiking has since moved to what a **personal (개인)** certificate can do instead.
- **Personal-account automation has one fully-confirmed, working candidate**: "환급금 조회" (refund lookup) — a read-only query, fully automated end-to-end by `refund-check.mjs` (login check → navigate → click 조회 → parse results table, no submit action anywhere). Two more candidates (현금영수증 사용내역 조회, 국세증명/소득금액증명 발급) are partially mapped but not yet automated — see `tax-agent/tax-agent-research.md` §1-6 through §1-8.
- **Final product direction is still open.** `tax-agent-research.md` §5 lists mismatch-detection, invoice-issuance, and other candidates as undecided brainstorm seeds; §1-8 adds the personal-account read-only candidates above. Don't state or assume the product direction is settled without checking with the user.

## Safety constraints for anything touching 홈택스

These are hard rules carried through every design doc, not suggestions:
- Certificate PINs/passwords live only in `hometax-fincert-spike/.env` (covered by that directory's own `.gitignore`) or are typed by the user directly — never hardcode, log, or print them. This is a different file from the root `.env` (see "Repo hygiene note" below).
- Any write action against the real 홈택스 site (e.g. actually submitting a tax invoice) must be gated behind an explicit human confirmation — `invoice-issue.mjs` implements this as a typed-string prompt. Never remove or auto-answer that gate. Pure read/query actions (like "조회" buttons) don't need this gate, but never click a "발급"/"신청"/"제출" button without one.
- Prefer `getByRole`/`getByText` selectors over auto-generated DOM ids when touching 홈택스 pages — it's a WebSquare app with dynamic ids and heavy iframe nesting (documented in `tax-agent/tax-agent-research.md` §1-3). When a page has a modal/overlay on top of other content (e.g. the "전체메뉴" sitemap), also verify the matched element is actually topmost at its coordinates (`document.elementFromPoint`) before clicking — text matches can resolve to an occluded duplicate underneath (documented in §1-6).
- Run only one browser/session against a given `storageState.json` at a time — two concurrent Playwright contexts sharing the same session cookies can knock each other's login out (observed and documented in `tax-agent/tax-agent-research.md` §1-6/§1-7).
- Keep real 홈택스 interaction to manual, low-frequency, single-account runs — the tax authority is actively cracking down on automated/scraping access (see `tax-agent/tax-agent-research.md` §2).

## Repo hygiene note

There is no root `.gitignore`. The root `.env` (containing `FINANCE_AUTH_PASSWORD`, unrelated to the hometax-fincert-spike credentials above and not referenced by any code in this repo) is currently untracked but **not** git-ignored — never `git add` it.
