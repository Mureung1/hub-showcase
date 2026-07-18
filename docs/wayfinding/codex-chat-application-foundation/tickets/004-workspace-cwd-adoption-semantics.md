# 004 — Workspace와 cwd의 adoption semantics를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, pinned App Server·official SDK의 `thread/start`, workspace-filtered `thread/list`, `thread/read`, cold·running `thread/resume`와 `turn/start`는 native `cwd`를 어떻게 소유하며, Codex first-party client와 성숙한 local Agent·IDE·web companion은 workspace identity·switch·reopen을 어떻게 다루는가? Current process-fixed workspace와 donor assumption의 차이를 비교하고 confirmed residual만 판정한다.

## Resolution evidence

- Exact SDK/App Server signature와 primary test의 cwd·resume matrix
- Codex CLI·first-party client와 relevant OSS donor의 workspace identity·switch·reopen behavior, exact version·license·provenance
- Missing·moved·inaccessible path, mismatch와 native sticky cwd에서 donor assumption과 ADR 0006의 차이
- Current process-fixed workspace와 custom validation의 `keep | replace | delete` 후보
- Required single-workspace `cwd` surface의 `direct reuse | adapt | narrow port | confirmed residual` 판정, optional donor capability의 `deferred | out-of-scope`와 representative trace를 구분한 `assets/workspace-cwd-adoption-semantics.md`
- Chooser UX, target Host topology와 Interface 설계의 명시적 제외
