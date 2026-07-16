# 009 — Render the nominal native conversation in a desktop Chat Shell

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Inspector와 분리된 `@ay-ple/chat-shell` desktop app에서 runtime status를 확인하고 native thread를 만든 뒤 user text와 AgentMessage streaming을 transcript로 보며 authoritative completed/failed terminal에 수렴한다.

## Spec Traceability

- User stories: 1, 2
- Implementation contract: Chat Shell Behavior, browser-safe event allowlist

## Slice-Specific Constraints

- App은 `@ay-ple/codex-chat-runtime/contract`만 import하며 Node runtime, `runtime-core`, `runtime-codex`에 의존하지 않는다.
- React/Vite/Playwright convention과 current design-system direction을 따르며 `1440x900` desktop을 검증한다. Mobile work는 하지 않는다.
- Fetch NDJSON parser는 partial chunk, multiple lines/chunk와 final newline/EOF를 안전하게 처리한다.
- AgentMessage delta는 native `itemId`별로 append하고 completed item text로 reconcile한다.
- Raw protocol, stderr, traceback, path/secret과 unadopted activity를 표시하지 않는다.
- Transcript/thread는 transient이며 reload resume/persistence를 구현하지 않는다.
- Existing root `dev`는 유지하고 별도 `dev:chat-shell`을 추가한다.

## Acceptance Criteria

- [ ] Unavailable/configured/starting/ready/failed status와 loading/empty/error state가 구분된다.
- [ ] New conversation이 native `threadId`를 유지하고 diagnostic metadata로 안전하게 보여준다.
- [ ] Prompt submit 뒤 user row와 streamed AgentMessage가 같은 turn/item identity로 표시된다.
- [ ] `completed`와 `failed` terminal이 distinct UI state로 끝나고 active residue가 없다.
- [ ] Fake `turn.error(willRetry=true) → delta → turn.completed(completed)`에서 error observation은 active turn을 끝내지 않고 matching terminal에서만 종료된다.
- [ ] Invalid/malformed HTTP stream은 safe runtime failure로 표시된다.
- [ ] Fake-backed real Server Playwright가 nominal streaming, nonterminal error와 terminal failure를 통과한다.
- [ ] Root test/typecheck/build/test:e2e가 새 runtime/app workspace를 실제 호출하고 Inspector gate도 유지한다.
- [ ] Chat Shell lint와 Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Chat Shell component/reducer/parser tests and Playwright nominal/error scenarios
- Repository checks: new app test/typecheck/build/lint plus root orchestration, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: desktop visual QA at 1440–1920 px with deterministic fake

## Blocked By

- [008-server-chat-transport.md](008-server-chat-transport.md) — Expose one native chat stream through the AY-PLE Server

## Starting Points

- `apps/inspector` workspace conventions, not its state model
- Product design-system direction
- `@ay-ple/codex-chat-runtime/contract`
