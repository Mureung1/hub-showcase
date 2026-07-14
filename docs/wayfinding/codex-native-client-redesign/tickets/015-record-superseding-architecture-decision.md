# 015 — ADR 0008을 대체할 architecture decision을 기록한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)

## Question

Pinned generated schema의 wire shape와 Rust source/tests의 method별 observable semantics를 TypeScript external client로 source-guided port하는 원칙과 `CodexAppServerConnection → CodexConversationRuntime` production dependency direction을 어떤 ADR로 기록할 것인가? 기존 all-capability `HeadlessCodexClientHost`를 compatibility target 없이 supersede하고, future chat tracer를 막는 generic Host state machine이나 one-shot product abstraction을 foundation에 넣지 않는다.

ADR은 decisions JSON/generated inventory coverage ledger, lifecycle fact/source-test authority와 fake/live external conformance의 역할을 분리하고, T0·T0-C·T0.1 뒤 multi-turn·streaming·control·resume·activity tracer를 확장할 수 있는 경계를 포함한다. Three-root preparation은 external capability로만 다루고 TUI·Exec surface policy, 사용하지 않는 method와 `AYPLE adapter`를 foundation에 포팅하지 않는다. Product composition correction은 out-of-scope [첫 AY-PLE adapter tracer와 runtime readiness gate](018-decide-first-ayple-adapter-tracer.md)의 future evidence이며 이 ADR의 blocker나 책임이 아니다.

> **Ticket 019 correction:** ADR 0010의 Connection → ConversationRuntime 경계와 Host supersede는 유지한다. 근거 권위는 generated schema·Rust method source/tests뿐 아니라 Python external stdio client, Rust client facade와 TUI projection/pending request까지 확장했고, protocol 기반 자체 정책 대신 first-party behavior의 source-guided TypeScript port로 명시했다. Lifetime tombstone·permanent poison·global semantic arbiter는 baseline에서 제거했다. Current amendment는 [first-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)가 소유한다.

## Answer

[ADR 0010 — Codex App Server 통합을 Connection과 ConversationRuntime으로 분리한다](../../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)를 채택한다. 이 ADR은 모든 capability를 한곳에 둔 `HeadlessCodexClientHost` 경계를 호환성 목표 없이 대체하고, 다음 운영 의존 방향을 foundation 목표로 고정한다.

```text
CodexAppServerConnection → CodexConversationRuntime
```

### Source 기반 책임과 근거 권위를 분리한다

| 경계 | 단일 책임 |
| --- | --- |
| 외부 준비/harness 경계 | 준비된 process·workspace capability, three-root validation과 launcher 정책. 운영 runtime module이나 Codex identity authority가 아니다. |
| `CodexAppServerConnection` | Child·stdio lifecycle, 단일 JSONL ingress, generated validation, 방향과 exact `RequestId`를 구분하는 demux, 직렬화된 outbound writer, transport/process terminal과 pending RPC settlement |
| `CodexConversationRuntime` | Native thread·turn·item identity, `ThreadId`별 process 범위 owner, 채택한 method의 response/notification convergence·correlation·semantic terminal |

Generated schema는 wire shape를, 같은 정확한 pin의 Rust source/tests와 lifecycle fact table은 version별 lifecycle·identity·state transition을 소유한다. Coverage ledger와 generated inventory는 검토한 존재·adoption·semantic owner·verification coverage만 기록하며 lifecycle 의미를 발명하지 않는다. Unit·spawned fake child는 결정적인 외부 port 동작을, pinned live binary는 대표 호환성을 증명하되 live 관찰 순서를 규범적 ordering으로 승격하지 않는다.

이름을 부여한 tracer가 ledger에 `required`로 기록한 해당 gate를 통과한 method/contract만 Connection 또는 Runtime coverage로 승격한다. T0·T0-C·T0.1은 첫 실행 가능한 slice이며 전체 Chat Interface나 제품 abstraction의 상한이 아니다. Multi-turn, streaming, steer/interrupt, thread read/resume, activity와 추가 Server request는 같은 source 기반 원칙으로 후속 tracer에서 확장한다.

### 기존 결정과 문서의 처리 방침을 명시한다

- ADR 0008만 완료·역사 기록으로 전환한다. ADR 0005의 Codex-first/raw isolation, ADR 0006의 root ownership, ADR 0007의 제품 조합, ADR 0009의 macOS-first 제공 결정은 유지한다.
- 기존 Headless Host spec은 `wontfix`로 닫고 완료된 Tickets 001–003은 당시 구현 근거로 보존한다. 미구현 Tickets 004–010은 새 Host 인수 조건으로 실행하지 않으며 후속 runtime spec이 생기면 정확한 대체 문서 연결을 보강한다.
- Package README와 Runtime Harness 구현 지도는 현재 남아 있는 기존 구현을 계속 설명하면서 목표가 아직 구현되지 않았음을 표시한다. 코드 구성은 구현 gate를 통과하기 전에 현재형으로 바꾸지 않는다.
- Development backlog는 미완료 runtime-foundation 구현을 향후 AY-PLE 제품 adapter와 분리한다. Adapter·browser·`ModelingInvocation`/`ModelingRun`·제품 approval/UX는 foundation 준비 조건이 아니다.
- `CodexAppServerConnection`, `CodexConversationRuntime`, native `ThreadId`는 protocol·구현 용어이므로 AY-PLE 도메인 용어집인 `CONTEXT.md`를 변경하지 않는다.

이전 순서와 선별 재사용은 [Ticket 014의 계획](../assets/014-host-removal-and-selective-salvage-plan.md)이, 정확한 lifecycle·용량 경계·검증 인수 조건은 후속 spec/tickets가 소유한다. 이 ADR은 목표 채택을 기록할 뿐 교체 구현이 현재 완료됐다고 주장하지 않는다.

### HITL audit

추가 사용자 결정은 필요 없다. 이 ADR은 사용자가 이미 승인한 Codex-native runtime foundation, Connection → Runtime 방향, runtime 우선 T0·T0-C·T0.1과 제품 범위 유예를 정본화한다. 사용하지 않는 method, 제품 adapter와 browser 정책을 다시 현재 foundation에 끌어들이지 않는다.

### Review checkpoint

- Source: 0 findings. Exact-pin 근거의 과장 없이 generated schema, Rust source/tests, ledger, unit/fake/live의 권위를 분리했고, Connection → Runtime owner와 AY-PLE 강화 계약, T0·T0-C·T0.1 이후 확장 경계가 완료된 source 결정과 일치한다.
- Standards: 0 findings. 문서 정본을 먼저 갱신하고 현재 기존 구현과 채택한 목표를 분리했으며, 일반 설명어를 한국어로 정리했다. 공개 적합성 test는 ConversationRuntime Interface를 사용하되 package 내부 unit test가 reducer·actor·writer invariant를 직접 검증할 수 있는 경계도 유지한다.
- Spec: 0 findings. ADR 0008만 역사화하고 기존 ADR 0005–0007·0009를 보존했으며, 기존 spec/Tickets 004–010, 색인, 개발 백로그, Product Brief, package README와 구현 지도의 처리 방침이 Ticket 015 요구와 일치한다. 제품 adapter는 foundation 차단 조건으로 재유입되지 않았다.

검토 기준점은 `0b29855d4856d1271b90366e91092d043c663c2c`이며 claim 커밋 `332745c0`과 현재 Ticket 015의 미커밋 변경분을 독립 검토했다. 검토 중 발견한 과도한 내부 test 결합 금지와 한국어 문서 규칙 위반은 ADR과 소비 문서에 환류한 뒤 재검토했다. 로컬 Markdown link와 `git diff --check`도 통과했다.

남은 위험은 ADR 0010의 목표가 아직 실행 가능한 코드와 적합성 test로 검증되지 않았고 정확한 대체 spec 연결도 없다는 점이다. 이는 현재 결정을 막는 불확실성이 아니라 Ticket 016 준비 상태 검토와 후속 `/to-spec`·구현 ticket이 소유하는 명시된 작업이다.
