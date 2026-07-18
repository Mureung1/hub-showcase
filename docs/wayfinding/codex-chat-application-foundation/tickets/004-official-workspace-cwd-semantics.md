# 004 — Native workspace와 cwd semantics를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

`thread/start`, workspace-filtered `thread/list`, `thread/read`, cold·running `thread/resume`와 `turn/start`에서 native `cwd`는 어떻게 저장·override·검증되며, current process-fixed workspace와 달리 한 local companion이 workspace-scoped conversation을 안전하게 운영하는 데 어떤 제약을 주는가?

## Resolution evidence

- Exact SDK/App Server signature와 primary test의 cwd·resume matrix
- Canonical path, mismatch, missing path, symlink와 thread sticky cwd semantics
- Runtime spawn 시 workspace 고정과 per-thread cwd 대안의 confirmed fact 구분
- Workspace filter만으로 다른 workspace conversation 혼입을 막을 수 있는지 판정
- Chooser UX와 target Interface 결정을 제외한 `assets/official-workspace-cwd-semantics.md`
