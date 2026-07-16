---
name: beginner-issue-day-plan
description: Use when the user asks to organize today's development work, daily issue work, or "what should I do today" based on a project plan, weekly todo plan, previous completed issues, recent conversation context, git history, and current repository files. Produces a Korean beginner-friendly task plan that avoids overlap with yesterday's work and explains what to do, how to do it, what files or commands are involved, and how each task connects to prior work and product features.
---

# Beginner Issue Day Plan

## Goal

Create a concise but useful daily development plan in Korean. The plan must be grounded in the user's existing development plan, weekly todo plan, previous conversation, recent commits, and current repository state.

The plan should help a non-engineer understand:

- what was already done
- what should only be verified today
- what should actually be implemented today
- how to do each step
- how today's work connects to previous issues and future product features

## Required Checks First

Before writing the plan, inspect the available evidence. Do not rely only on the user's issue numbers.

Check these sources when they exist:

1. Recent conversation context
   - Note what the user says was done yesterday or earlier.
   - Note if the user says today's list overlaps with prior work.

2. Completed-work history
   - `docs/done-history.md`
   - Treat entries under "Completed" or "Installed" as already done.
   - Treat entries under "Verify Only" as confirmation work, not new implementation.
   - Treat "Do not suggest again" notes as explicit wording to avoid in today's new-work list.

3. Planning documents
   - `week1_todo.md`
   - `checklist.md`
   - `docs/development-tasks.md`
   - `docs/beginner-development-roadmap.md`
   - `docs/DEVELOPMENT.md`
   - `docs/PRODUCT.md`
   - `ARCHITECTURE.md`

4. Repository evidence
   - `git log --oneline --decorate -12`
   - `git status --short --branch`
   - Relevant implementation files, such as:
     - `src/App.jsx`
     - `src/services/supabaseClient.js`
     - `supabase/migrations/`
     - `supabase/seed.sql`
     - `supabase/demo_profiles.template.sql`
     - `supabase/restore_demo_scenario.sql`

## Overlap Rule

Always separate tasks into these meanings:

- **Already done**: implemented or prepared in files/commits.
- **Verify only**: previous work exists, but real environment or manual scenario still needs confirmation.
- **Implement today**: new code or new behavior still missing.

Never present previously completed setup as new work. For example, if migration SQL already exists, say "confirm it is applied to the real Supabase project" instead of "write the migration".

## Done History Update Rule

When a daily work session ends, update `docs/done-history.md` before the final report when the workspace is writable and the completed work is clear.

Add a dated entry that records:

- what was completed
- what was installed
- what should only be verified next time
- related files
- verification commands that passed or could not be run
- "Do not suggest again" notes for completed setup or implementation

Do not mark work as completed just because it was planned. Only record completed, installed, or intentionally deferred work that is supported by conversation context, file changes, git history, or command output.

## Output Format

Use this structure.

### 오늘 전체 작업 흐름

List 8-12 ordered steps. Keep each step short.

Example:

```text
1. 현재 상태 확인
2. Supabase 실제 연결 상태 확인
3. 이슈 3 테이블이 실제 DB에 적용됐는지 확인
...
```

### 1. Step Title

For each step, include these sections when relevant:

- `확인할 것:` for facts to check first
- `실제로 할 것:` for the action
- `비유하면:` for one simple analogy
- `관련 파일:` for local files
- `이전 작업과 연결:` for prior issue/commit/document connection
- `오늘 이슈와 연결:` for why it matters today
- `다음 기능과 연결:` for upcoming feature dependency
- `끝나면:` for the resulting state

Keep each step practical. Aim for about 6-10 short lines per step, not a long essay.

## Style

- Write in Korean.
- Be beginner-friendly but not childish.
- Explain technical terms immediately in plain language.
- Use concrete commands only when useful, and explain what they check before showing them.
- Prefer the user's project vocabulary: "장부", "명찰", "손님 화면", "사장님 화면", "시연 데이터".
- Mention exact issue numbers when possible.
- Keep analogies short.
- Avoid overly broad summaries that do not tell the user what to do.
- Avoid long theoretical explanations.

## Common Analogies

Use these when helpful:

- DB table = 장부
- migration SQL = 장부 설계도
- Supabase CLI = 설계도를 실제 장부로 만드는 도구
- Supabase project = 실제 장부가 들어갈 공간
- Auth user = 로그인 계정
- `profiles` = 손님인지 사장님인지 적힌 명찰
- anon key = 손님용 출입 카드
- service_role key = 매장 전체 금고 열쇠
- customer screen = 손님의 스탬프 지갑
- owner screen = 사장님의 매장 장부 화면

## Completion Checklist

End with a compact checklist:

- 오늘 확인만 할 것
- 오늘 새로 구현할 것
- 오늘 검증할 것
- 오늘 끝나면 가능해지는 것

This checklist should reflect the actual repository state, not just the ideal plan.
