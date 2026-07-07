# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**잔소리봇 (Nagging-bot)** — an "AI Agent Challenge" project. College students procrastinate on starting tasks for different reasons — not knowing where to start, not feeling like it, wanting to keep playing — but existing reminder apps only fire a generic "it's time" notification and can't offer a solution tailored to *why* the user is stuck, so the same avoidance repeats.

The core idea is **tailored intervention matched to the specific reason for avoidance**: the agent detects why the user hasn't started and proposes a fitting first action (a microtask) to help them actually begin. This is not just "reminder + AI + character" — the differentiator is diagnosing the avoidance reason and responding to it specifically, not merely delivering nudges in a chat-like UI.

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
