---
name: plan-and-checklist
description: Maintain the planning documents for the MBTI study and stress management webapp. Use when Codex is asked to update docs/plan.md, docs/checklist.md, README project summaries, MVP scope, excluded features, expression rules, user flows, IA, or implementation checklists.
---

# Plan And Checklist

## Read First

Read `docs/context.md`, `docs/plan.md`, `docs/checklist.md`, `docs/evidence-data-roadmap.md`, and `README.md`.

## Plan Document Role

`docs/plan.md` is the product planning document. Keep it focused on one-line definition, problem background, problem reframing, target users, core value, core features, recommendation logic, user flow, IA, MVP scope, data model, and risks.

## Checklist Role

`docs/checklist.md` contains the 4-week MVP plus validation-beta, consent-based-beta, and long-term gates. Keep completed implementation separate from unverified research tasks.

## Expression Rules

- Prefer `선호 탐색`, `피로 신호`, `회복 루틴`, and `주의 패턴`.
- Use possibility-based result wording.
- Avoid type superiority or fixed labels.
- Avoid medical-sounding stress language.

## Scope Rules

Keep MVP centered on preference/status check, cognitive-science study method matching, and today's study/recovery routine.

Exclude sign-up, AI chatbot, external AI API, grade forecasting, medical judgment, community, calendar/notification, comparison/ranking, and payment.

Keep official MBTI result self-entry, original exploratory preference signals, task/state-only baseline, and MBTI-added models distinct. Document satisfaction and learning outcomes separately, and preserve the learning-styles matching falsification criterion.

## Validation

After doc edits, inspect docs and run build when relevant:

```bash
git diff -- README.md docs/plan.md docs/checklist.md
npm run build
```
