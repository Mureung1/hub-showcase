# 002 — 기존 Host consumer와 compatibility constraint를 감사한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/001-preserve-evidence-and-establish-fixed-point.md

## Question

Repository의 imports·package exports·HTTP routes·stored state·tests·method inventory·backlog·문서 claim 중 기존 `HeadlessCodexClientHost` Interface와 ref/event semantics에 실제로 의존하는 durable consumer는 무엇이며, clean-slate replacement가 보존해야 할 compatibility constraint와 단순 prototype oracle을 어떻게 구분할 것인가?

## Answer

[감사 결과](../assets/002-host-consumer-audit.md), active redesign tree와 archived Ticket 004 implementation을 함께 확인한 결과 durable `HeadlessCodexClientHost` consumer는 0개다. Private package root export는 존재하지만 app/server/browser/persistence caller가 없고, Host ref/event semantics와 전용 fake/test는 구현 자신에게 닫힌 prototype oracle이다. 따라서 clean-slate replacement에 compatibility adapter·data migration·deprecation period를 두지 않는다.

구분은 다음과 같이 확정한다.

| 분류 | 대상 | 후속 처리 |
| --- | --- | --- |
| 반드시 보존 | ADR 0005–0007과 0009의 pinned/native Codex, raw protocol 격리, three-root ownership, concrete use-case 경계와 macOS local companion/browser 방향 | 새 source-grounded architecture의 invariant로 가져간다. |
| 실제 compatibility | `CodexRawClient`·`CodexRuntimeAdapter`·`AgentRuntimeKernel`·`/api/runtime/*`·Runtime Diagnostic History·Inspector와 기존 native Codex app-data | Host 제거 과정에서 회귀·삭제하지 않는다. 새 product client와 shared abstraction을 강제하지 않는다. |
| 선별 재사용 후보 | Ticket 001/002의 `ProductRuntimeLayout`, `CodexStdioTransport`, schema validation, bounded queue, child cleanup과 tests | 새 Interface와 source-conformance 기준이 확정된 뒤 primitive 단위로 채택한다. |
| 제거·재설계 가능 | Host class/root exports, lifecycle generation/sequence, generated refs, normalized event/subscription, Host-only fake/test oracle | Consumer migration 없이 forward-remove한다. Ignored stale `dist/`도 clean build로 제거 여부를 검증한다. |
| 문서 정합화 필요 | ADR 0008, old Host spec, 미구현 Ticket 004–010, package README·implementation map·backlog/index와 `client-host` method taxonomy/manifest/inventory | Completed Ticket 001–003은 historical evidence로 보존하고, 후속 removal/ADR tickets에서 old claims를 명시적으로 supersede한다. |

이 감사로 새 architecture를 기존 Host Interface에 맞춰야 할 이유는 사라졌다. 제거 순서와 selective salvage는 [Ticket 014](014-plan-host-removal-and-selective-salvage.md), superseding architecture decision은 [Ticket 015](015-record-superseding-architecture-decision.md)가 소유하므로 별도 decision ticket은 추가하지 않는다.
