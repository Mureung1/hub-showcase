# 011 — Prove exact Chat Shell conformance and readiness

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

완성된 Chat Shell tracer가 exact source/runtime, deterministic fake와 repository 전체에서 같은 contract를 지키는지 종합 검증하고 current architecture/docs/backlog를 실제 구현에 맞춘다. Safe disposable provider가 있으면 opt-in live smoke를 실행하고, 없으면 fake/exact-local green과 live blocked를 분리해 기록한다.

## Spec Traceability

- User stories: 1–6
- Implementation contract: Testing Decisions, Compatibility and Migration, 전체 first-slice acceptance

## Slice-Specific Constraints

- Exact native child + official local fake-provider harness는 `deny_all + read_only`, native identity, streaming, terminal, interrupt, same-thread second turn과 close를 검증한다.
- Unexpected schema-valid approval default-accept residual을 숨기지 않되 interactive approval/fork patch를 추가하지 않는다.
- Live smoke는 explicit disposable homes/workspace/provider만 사용하고 ambient auth/workspace를 사용하지 않는다.
- Legacy Runtime Harness/Host 제거, pin unification과 product adapter는 이 ticket에서 하지 않는다.
- Implementation fact는 package README와 implementation map에, task status는 development backlog에 owning-document-first로 반영한다.

## Acceptance Criteria

- [x] Exact package/generation/provenance verifier와 complete Python/Node/unit/actual-child fake suites가 green이다.
- [x] Exact local-provider T0가 native thread, AgentMessage, authoritative terminal과 effective `deny_all + read_only`를 증명한다.
- [x] Exact local-provider interrupt 및 same-thread follow-up과 deterministic process-tree close가 green이다.
- [x] Root `npm test`, `npm run typecheck`, `npm run build`, Inspector lint와 Chat Shell lint가 green이며 새 workspaces를 실제 포함한다.
- [x] Docs links, generated/manifest verification, `git diff --check`와 stale donor/theoretical surface searches가 green이다.
- [x] Source·Standards·Spec final reviews가 각각 0 findings다.
- [x] Live provider gate는 `green` 또는 환경 근거가 있는 `blocked`로 기록되고 fake/exact-local 결과와 혼동되지 않는다.
- [x] Parent spec, ADR, package README, implementation map와 backlog가 current implementation·legacy·deferred cutover를 정확히 구분한다.
- [x] Legacy Host와 `packages/runtime-codex`는 별도 cutover 전까지 unchanged current implementation으로 남는다.

## Verification

- Targeted test or command: all runtime package exact/fake/local conformance commands and Chat Shell E2E
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, Inspector lint, Chat Shell lint, docs/link/diff integrity
- Manual or live smoke: disposable provider가 있을 때만 exact live Chat Shell smoke; 아니면 명시적 blocked report

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 구현 checkpoint | `bc2e5355`에서 official `MockResponsesServer`와 exact native `0.144.4`를 production Node supervisor → bundled Python bridge → official SDK 경로에 연결하는 local-provider controller와 actual-child test를 추가했다. Production default는 managed config를 계속 존중하며, package-private test opt-in만 격리된 conformance home에서 이를 차단한다. |
| Exact-local contract | 새 native thread의 text turn이 delta와 동일한 non-empty native `itemId`를 가진 completed AgentMessage 하나로 수렴하고 authoritative `turn/completed`가 마지막에 도착함을 확인했다. 지연 turn을 interrupt해 authoritative `interrupted`를 받은 뒤 같은 `threadId`의 두 번째 turn을 완료했고, close 뒤 Python/native process group이 모두 사라짐을 확인했다. |
| Effective policy | 종료 뒤 같은 격리 home과 native `ThreadId`를 exact `thread/resume`으로 읽어 persisted `approvalPolicy: never`와 `sandbox: { type: readOnly, networkAccess: false }`를 확인했다. 이는 예상 밖의 schema-valid approval에 대한 unmodified SDK low-level default-accept residual을 제거하지 않으며 interactive approval은 채택하지 않았다. |
| Runtime conformance | `validate:production-runtime`은 synthetic 23 tests, bundled bridge actual-child 16 tests, pre/post manifest verification과 Ruff를 통과했다. `validate:node-runtime`은 hardened Node actual-child 45 tests와 exact local-provider를 통과했고, `validate:exact-sdk`는 deterministic generation·router gate, official suite `146 passed, 38 skipped`, provenance 17 tests와 exact source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`/runtime `0.144.4`를 확인했다. |
| Repository gate | Root `npm test`, `npm run typecheck`, `npm run build`, Inspector lint, Chat Shell lint와 Chat Shell Playwright 10 scenarios가 green이다. Server actual-child shutdown gate도 실제 HTTP intake 중단 뒤 bundled worker/native process-tree reap을 통과했다. Non-mutating Markdown link check, generated/manifest verification, stale donor search와 `git diff --check`도 green이다. |
| Live gate | `CODEX_CHAT_*` 6개와 explicit `OPENAI_API_KEY`·base URL·org/project 설정이 없고 repo 전용 `.env`도 없었다. Personal `$HOME/.codex`와 legacy homes는 ambient state라 사용하지 않았다. 따라서 `fake: green`, `exact local-provider: green`, `live provider: blocked — no explicit disposable provider/auth supplied`로 기록한다. |
| Review | Fixed point `eeb1387a58df608cb91abea106492957c22d3089` 대비 Source 0, Standards 0, Spec 0 findings다. Managed-config isolation, auxiliary process-group timeout cleanup, native AgentMessage identity/FIFO 증명, ADR의 current-state ownership과 Overview의 backlog ordering findings를 owning code·docs에 환류한 뒤 최종 delta를 다시 검토했다. |
| 문서와 호환성 | Parent spec을 completed로 닫고 ADR 0011, package README, implementation map, runtime isolation, product overview와 development backlog를 actual implementation에 맞췄다. `packages/runtime-codex`의 source/API/package pin과 legacy Host implementation은 변경하지 않았으며 별도 승인 cutover를 독립 backlog item으로 남겼다. |

## Blocked By

- [010-interrupt-and-follow-up.md](010-interrupt-and-follow-up.md) — Interrupt and continue the same native thread

## Starting Points

- Parent spec Testing Decisions
- `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
- `docs/architecture/runtime-harness-implementation-map.md`
- `docs/product/ay-ple-development-backlog.md`
