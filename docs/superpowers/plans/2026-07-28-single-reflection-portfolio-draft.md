# Single Reflection Portfolio Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the post-analysis reflection to one concise answer and generate a structured portfolio draft using repository evidence, the selected challenge, and an LLM validation rubric.

**Architecture:** Reuse the existing `memorableProblem` field as the single reflection answer to preserve stored draft compatibility. Extend `ReflectionAnalysis` with an optional structured portfolio draft, generate it in the existing reflection analyzer, persist it with the existing JSON column, and render it in the step-2 reflection screen.

**Tech Stack:** React, TypeScript, NestJS, OpenAI-compatible Chat Completions API, Supabase JSON persistence, Jest, Vite.

## Global Constraints

- Keep existing reflection drafts readable and writable.
- Do not copy the user's sentence directly as the portfolio output.
- Never invent technical facts, metrics, ownership, or evidence not present in the repository data or user answer.
- Mark the result for user review when the answer and repository evidence do not align or the AI provider is unavailable.
- Keep the API response JSON-only and validate every generated field.

---

### Task 1: Define the structured portfolio draft contract

**Files:**
- Modify: `packages/contracts/src/reflection.ts`
- Modify: `apps/api/src/reflection/reflection.alignment.ts`
- Test: `apps/api/src/reflection/reflection.alignment.spec.ts`

- [x] Add `PortfolioDraft` with `title`, `background`, `problem`, `solution`, `contribution`, `evidenceSummary`, and `requiresUserReview`.
- [x] Add `portfolioDraft: PortfolioDraft | null` to `ReflectionAnalysis`.
- [x] Extend the parser to reject missing or invalid portfolio fields.
- [x] Preserve existing alignment-only responses by normalizing a missing portfolio draft to `null` in tests and fallback paths.

### Task 2: Generate the portfolio draft with an explicit rubric

**Files:**
- Modify: `apps/api/src/reflection/reflection.alignment.ts`
- Test: `apps/api/src/reflection/reflection.alignment.spec.ts`

- [x] Change the prompt to use the selected challenge and the single `memorableProblem` answer as inputs.
- [x] Require the model to produce a concise Background-Problem-Solution-Contribution draft.
- [x] Require evidence-first writing: PR, Issue, Discussion, Project, then Commit; include only evidence supplied in the input.
- [x] Require `requiresUserReview` when evidence is weak, ownership is uncertain, or the answer differs from candidates.
- [x] Keep alignment statuses and generate `portfolioDraft: null` for mismatched, no-evidence, provider-unavailable, or invalid responses.

### Task 3: Simplify the reflection UI to one answer

**Files:**
- Modify: `apps/web/src/features/reflection/ReflectionWorkspace.tsx`
- Modify: `apps/web/src/pages/AnalysisPage.tsx`
- Test: `apps/web/src/features/reflection/reflection.test.ts`

- [x] Remove the per-candidate three-question follow-up UI from the step-2 screen.
- [x] Render one Poppy-centered white card with the question: `이 프로젝트에서 가장 해결하기 어려웠던 문제는 무엇이었고, 이를 해결하기 위해 본인이 어떤 작업을 했나요?`
- [x] Bind the answer to `draft.memorableProblem` and disable duplicate saves while a request is in progress.
- [x] Pass the latest `reflectionAnalysis` into the reflection screen and render the generated portfolio draft after a successful save.
- [x] Keep the selected candidate summary visible and keep the existing step navigation behavior.

### Task 4: Verify the end-to-end behavior

**Files:**
- Modify: `apps/api/src/reflection/reflection.service.spec.ts` if the new response shape requires fixture updates.
- Modify: `apps/api/src/reflection/reflection.controller.spec.ts` if response assertions require fixture updates.

- [x] Test valid structured portfolio output parsing.
- [x] Test mismatched or missing evidence produces no portfolio draft and requires review.
- [x] Run API and web type checks, tests, build, and `git diff --check`.

### Task 5: Expand the document-style portfolio output

**Files:**
- Modify: `apps/api/src/repository-analysis/infrastructure/github/github-repository.client.ts`
- Modify: `apps/api/src/repository-analysis/application/technical-challenge/technical-challenge.prompt.ts`
- Modify: `apps/api/src/reflection/reflection.alignment.ts`
- Modify: `packages/contracts/src/repository-analysis.ts`
- Modify: `packages/contracts/src/reflection.ts`
- Modify: `apps/web/src/features/reflection/ReflectionWorkspace.tsx`

- [x] Extract only image URLs directly attached to the selected PR body.
- [x] Extend the generated draft with technical challenge, key decisions, result, and learnings.
- [x] Render the draft as a document-like Background-Problem-Solution-Result flow.
- [x] Render linked PR images only when they are available from the selected evidence.
- [x] Show a clear image recommendation placeholder instead of inventing an unrelated image.
