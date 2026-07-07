# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**잔소리봇 (Nagging-bot)** — an "AI Agent Challenge" project. It's an execution-inducing agent for college students who procrastinate: instead of waiting to be asked (like a normal chatbot) or just blocking distractions (like Do Not Disturb), it observes assignment/exam deadlines and a user's procrastination pattern, then proactively intervenes with escalating nudges before the deadline hits.

The repo is currently at the scaffold stage: a Vite + React landing/pitch page (`src/components/ProjectIntro.jsx`) presents the concept (problem statement, service flow timeline, feature groups). No backend, agent logic, or data persistence exists yet.

## Commands

```
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview a production build locally
npm run lint      # run oxlint
```

There is no test suite configured in this repo yet.

## Architecture

- Entry point: `src/main.jsx` mounts `<App />` (`src/App.jsx`) into `#root`, defined in `index.html`.
- `App.jsx` currently just renders `ProjectIntro`, the project pitch page. As real features (onboarding, check-ins, nudges, dashboards) are built, expect `App.jsx` to grow into an actual router/layout rather than a single static page.
- `ProjectIntro.jsx` follows a content-as-data pattern: page copy lives in plain arrays/objects near the top of the file (`PROBLEM_CARDS`, `TIMELINE_ITEMS`, `FEATURE_GROUPS`), and JSX below just maps over them. Follow this pattern for future sections rather than hardcoding repeated JSX blocks.
- Icons are hand-written inline SVG components (no icon library dependency) — keep new icons consistent with this (viewBox 24x24, stroke-based, `aria-hidden`/`focusable="false"`).
- Styling is plain CSS per component (`ComponentName.css` colocated with `ComponentName.jsx`), imported directly into the component file — no CSS-in-JS or Tailwind.
- Linting uses `oxlint` (not ESLint) — config in `.oxlintrc.json`, with the `react` and `oxc` plugins enabled (`react/rules-of-hooks` is an error).

## Repository conventions

- Korean is the working language for commit messages, PR content, and in-app copy.
- PR title format (from `.github/pull_request_template.md`): `[루카스아이디_실명] - 한 줄 요약`, e.g. `[N100_윤솔빈] 주문정보 페이지 개발`.
- PRs are expected to include: a task list (with screenshots), a section explaining one chosen piece of code in the author's own words, a section on what isn't yet understood, and a section on newly learned concepts.
- `.github/workflows/auto-merge.yml` runs daily and auto-merges open PRs unless: they target `main`, they carry a `review` label, the latest review is `CHANGES_REQUESTED`, or they have merge conflicts (conflicting PRs get auto-closed with a comment). Be aware of this when leaving PRs open — they will attempt to merge on schedule.
