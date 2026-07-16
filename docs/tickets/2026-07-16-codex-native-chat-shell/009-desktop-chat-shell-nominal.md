# 009 — Render the nominal native conversation in a desktop Chat Shell

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: /implement Ticket 010

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

- [x] Unavailable/configured/starting/ready/failed status와 loading/empty/error state가 구분된다.
- [x] New conversation이 native `threadId`를 유지하고 diagnostic metadata로 안전하게 보여준다.
- [x] Prompt submit 뒤 user row와 streamed AgentMessage가 같은 turn/item identity로 표시된다.
- [x] `completed`와 `failed` terminal이 distinct UI state로 끝나고 active residue가 없다.
- [x] Fake `turn.error(willRetry=true) → delta → turn.completed(completed)`에서 error observation은 active turn을 끝내지 않고 matching terminal에서만 종료된다.
- [x] Invalid/malformed HTTP stream은 safe runtime failure로 표시된다.
- [x] Fake-backed real Server Playwright가 nominal streaming, nonterminal error와 terminal failure를 통과한다.
- [x] Root test/typecheck/build/test:e2e가 새 runtime/app workspace를 실제 호출하고 Inspector gate도 유지한다.
- [x] Chat Shell lint와 Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Chat Shell component/reducer/parser tests and Playwright nominal/error scenarios
- Repository checks: new app test/typecheck/build/lint plus root orchestration, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: desktop visual QA at 1440–1920 px with deterministic fake

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 구현 checkpoint | `ba264c70`에서 별도 `@ay-ple/chat-shell` app, shared browser decoder, exact identity reducer와 real-Server Playwright를 추가했다. `35d4d358`, `68574ac7`에서 terminal residue, unfinished stream cancellation, process-wide status convergence와 사용자-facing copy·module ownership review findings를 닫았다. |
| Browser contract | Production source는 `@ay-ple/codex-chat-runtime/contract`만 소비한다. Status/thread/stream frame을 shared exact decoder로 검증하고, partial UTF-8, coalesced line, final EOF와 unfinished invalid body cancellation을 처리한다. Raw protocol, Node runtime과 legacy Host surface는 import하지 않는다. |
| Conversation UI | Unavailable/configured/starting/ready/failed와 loading/empty/error를 구분하고 native Thread/Turn/Item ID를 diagnostic metadata로 유지한다. AgentMessage delta를 item별로 append한 뒤 completed text로 reconcile하며, terminal 전 끝난 partial message는 `completed`로 꾸미지 않고 `미완료`로 닫는다. |
| Failure behavior | Retryable `turn.error`는 matching terminal 전까지 nonterminal이다. Failed turn과 process-wide `runtime.failed`를 구분하고, 후자는 status를 다시 읽어 새 mutation을 비활성화한다. 사용자 본문은 한국어 제품 문구만 사용하며 safe upstream message와 code는 닫힌 진단 정보에 둔다. |
| Verification | Chat Shell unit 9 tests와 actual Server + deterministic public runtime 기반 `1440x900` Playwright 8 scenarios가 통과했다. Root `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, Inspector/Chat Shell lint, local Markdown link check와 `git diff --check`가 green이다. |
| Review | Fixed point `ff6d3f151345cc1d5a29ca2e5e010997ce70a934` 대비 Source 0, Standards 0, Spec 0 findings다. Partial AgentMessage residue, stale ready status, user-facing implementation wording, controller/presentation ownership과 harness cleanup findings를 환류한 뒤 최종 delta까지 재검토했다. |
| Visual QA | Deterministic fake를 사용한 `1440x900` desktop 화면에서 sidebar, runtime state, transcript, composer, native metadata와 terminal card의 배치·가독성을 확인했다. |
| Residual | Ticket 009 의도대로 interrupt와 same-thread follow-up은 구현하지 않았으며 Ticket 010이 소유한다. Exact Python/live-provider 재실행은 이 UI slice가 아니라 기존 runtime conformance gate에 의존한다. |

## Blocked By

- [008-server-chat-transport.md](008-server-chat-transport.md) — Expose one native chat stream through the AY-PLE Server

## Starting Points

- `apps/inspector` workspace conventions, not its state model
- Product design-system direction
- `@ay-ple/codex-chat-runtime/contract`
