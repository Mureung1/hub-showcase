---
name: vertical-slice-validator
description: 정보 입력 화면에서 study_plans 저장과 단건 조회 후 학습 계획 화면 표시까지 이어지는 수직슬라이스를 검증할 때 사용하는 기능 검증용 서브에이전트입니다.
argument-hint: "[검증할 수직슬라이스 또는 관련 파일]"
user-invocable: true
---

# vertical-slice-validator

Use this skill to validate the study plan vertical slice without modifying application code.

## Goal
Verify that the frontend connects to the existing Express and Supabase-backed `study_plans` APIs correctly:
1. The user enters study plan values in the information input screen.
2. The frontend sends `POST /api/study-plans`.
3. The saved `id` from the POST response is used for `GET /api/study-plans/:id`.
4. The data returned by GET is displayed in the learning plan screen.
5. The saved study plan can be restored after an initial render or browser refresh by reading `studyPlanId` from `localStorage`.

## Scope
- Inspect frontend code, especially `src/components/ProjectIntro.jsx`.
- Inspect frontend tests related to the study plan save and restore flow.
- Inspect only enough server code to confirm the API contract.
- Inspect README documentation only when validating the week 3 documentation requirement.
- Do not change `server` files, database schema documents, environment files, or application behavior.
- Do not treat behavior as passed when it requires runtime confirmation and has not been executed.

## Validation Items
Classify each item as one of:
- `통과`
- `실패`
- `직접 실행 확인 필요`

Validation checklist:
1. `currentScore`, `targetScore`, `examDate`, `dailyStudyMinutes` are managed in React state.
2. Daily study time is converted to a number before being sent.
3. `isFirstAttempt` is set correctly based on whether `currentScore` is empty.
4. `POST /api/study-plans` matches the server API contract.
5. After POST succeeds, the returned `id` is used for a GET request.
6. DB values returned by GET are displayed in the learning plan screen.
7. The save button prevents duplicate clicks while saving.
8. A user-facing error message is shown when requests fail.
9. Supabase keys or environment variables are not exposed in frontend code.
10. Existing menu navigation and screen behavior are not broken.
11. After a successful save, `studyPlanId` is stored in `localStorage`.
12. On initial render or browser refresh, a saved `studyPlanId` triggers `GET /api/study-plans/:id`.
13. When the restore GET succeeds, `savedStudyPlan` and the visible learning plan screen state are restored.
14. When the restore GET returns 404, an invalid UUID error, or another failure, `studyPlanId` is removed from `localStorage`.
15. Restore failure shows a user-facing message.
16. Vitest and Testing Library are configured for the frontend test environment.
17. Tests exist for saved study plan restore success and restore failure cleanup.
18. The relevant Vitest tests pass, or any inability to run them is clearly reported.
19. There is evidence of TDD flow: a failing test was created or observed before implementation.
20. README includes the week 3 Mermaid service structure diagram.
21. README includes the week 3 Mermaid save and refresh restore sequence diagram.

## Failure Reporting
For each failed item, include:
- Cause
- Smallest reasonable fix

## Runtime Boundary
If an item depends on a real browser interaction, running both dev servers, real Supabase credentials, or actual network/database behavior, mark it as `직접 실행 확인 필요` unless that exact behavior was executed during the validation.

## Output
Produce a concise validation report with:
1. A summary of files inspected.
2. A checklist table with status, evidence, and notes.
3. Failures and smallest fixes, if any.
4. Manual test steps for any item marked `직접 실행 확인 필요`.
