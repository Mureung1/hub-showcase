---
name: prototype-build
description: Build or update the Vite + React prototype for the MBTI study and stress management webapp. Use when Codex needs to implement screens, survey data, rule-based scoring, recommendations, localStorage records, or browser-verifiable MVP flows without adding new frameworks or external AI APIs.
---

# Prototype Build

## Read First

Read `docs/context.md`, `docs/plan.md`, `docs/checklist.md`, `docs/evidence-data-roadmap.md`, and `AGENTS.md`.

## Current Prototype Flow

Keep the core flow simple:

1. Intro
2. Official MBTI result self-entry or no-official-result path
3. Study preference survey
4. Stress response survey
5. Result
6. Today's routine card
7. Completion and focus/fatigue record
8. Recommendation fit, understanding, and actionability feedback

## Code Structure

Prefer these files for prototype work:

- `src/ProjectIntro.jsx`
- `src/data/questions.js`
- `src/lib/scoring.js`
- `src/lib/recommendations.js`
- `src/lib/storage.js`

Use existing files and patterns before adding new ones.

## Logic Rules

- MBTI may be a weak preference hint.
- Study and stress survey answers must influence recommendations.
- Recommendations must be rule-based.
- Each recommendation should include a reason.
- Store result and routine records in localStorage.
- Keep task/state-only baseline and MBTI-added recommendations separately.
- Do not feed the exploratory four-axis code into the recommendation model.
- Generate recommendation-specific evidence instead of one shared `basedOn` list.
- Keep method scores on a comparable scale and check recommendation exposure distribution.

## UI Rules

- Keep the interface usable in a browser.
- Keep screens focused and not overly complex.
- Show recommendation reasons.
- Show avoid-list and fatigue signals.
- Show 20-30 minute study routine and a recovery routine.

## Forbidden Additions

Do not add sign-up, external AI API calls, community, calendar, notification, payment, comparison, ranking, study proof features, or a Next.js migration. Do not add dependencies without approval.

## Validation

Run:

```bash
npm run build
npm run lint
```

When browser validation is requested, run the Vite dev server and verify the full flow from intro to routine card.
