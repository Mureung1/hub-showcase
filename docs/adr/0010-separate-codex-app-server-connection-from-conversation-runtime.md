# Codex App Server 통합을 Connection과 ConversationRuntime으로 분리한다

분류: 활성

성숙도: 채택

대체한 결정: [ADR 0008 — Headless Codex Client Host와 제품 UI adapter를 분리한다](0008-separate-headless-codex-client-host-from-product-ui.md)

AY-PLE은 package가 소유한 정확한 Codex pin의 generated protocol과 같은 pin의 Rust source/tests를 함께 근거로 삼아 외부 TypeScript App Server client를 구현한다. 현재 근거가 된 package·source 연결은 [upstream source provenance](../wayfinding/codex-native-client-redesign/assets/003-upstream-source-provenance.md)가 소유하며, 이 ADR은 특정 version을 영구 설계 값으로 고정하지 않고 pin 변경 때 같은 근거 사슬을 다시 검증하도록 결정한다.

기존 ADR 0008은 process/RPC, conversation lifecycle, 전역 Host 상태와 향후 제품/browser 관심사를 모든 capability를 한곳에 둔 `HeadlessCodexClientHost` Interface에 모았다. 실제 지속 소비자가 없는 이 Interface를 호환성 목표로 유지하면 pinned Codex의 method별 lifecycle보다 기존 Host 정책이 새 설계를 지배하게 된다. 따라서 새 foundation은 기존 Host 위에 계층으로 두지 않고 아래 두 운영 module로 교체한다.

```text
CodexAppServerConnection → CodexConversationRuntime
```

## 결정

- `CodexAppServerConnection`은 external child·stdio lifecycle, single JSONL ingress, generated wire validation, direction-aware exact `RequestId` demux, serialized outbound writer/arbiter, transport/process terminal과 pending RPC settlement을 소유한다. Thread active state, conversation projection과 제품 의미는 소유하지 않는다.
- `CodexConversationRuntime`은 native thread·turn·item identity, native `ThreadId`별 process-scoped owner와 채택한 method별 response/notification convergence·correlation·semantic terminal을 소유한다. Codex-owned persistent identity/history가 제공되는 범위가 authority이며 별도 durable alias catalog, Host generation ref와 global publication state를 만들지 않는다.
- Foundation의 공개 계약은 ConversationRuntime Interface를 통해 소비한다. Connection과 thread별 actor는 package 내부 경계이며 제품·하위 caller와 공개 적합성 test가 raw protocol·actor Interface에 결합하지 않는다. Package 내부 unit test는 reducer·actor·writer invariant를 직접 검증할 수 있다.
- 외부 AY-PLE 준비/harness 경계가 준비된 process와 workspace capability를 조합 시점에 공급한다. Three-root validation, launcher `cwd`와 workspace 선택은 [ADR 0006](0006-separate-package-app-data-and-semester-workspace-roots.md)의 외부 실행 정책이며 ConversationRuntime의 protocol 의미나 native identity authority가 아니다.
- Method가 generated schema에 존재한다는 사실은 integration을 자동 채택하지 않는다. 이름을 부여한 tracer가 source 근거와 coverage ledger에 `required`로 기록한 unit·spawned fake child·pinned live gate 중 해당 항목을 통과한 뒤에만 Connection/Runtime coverage로 승격한다. Pin 변경은 영향을 받은 method의 source/test와 conformance를 다시 검토한다.
- T0·T0-C·T0.1은 이 최종 구조의 첫 실행 가능한 conformance slice다. 전체 Chat Interface나 일회성 abstraction의 상한이 아니며 multi-turn, streaming, steer/interrupt, thread read/resume, activity와 추가 Server request는 각각 source 기반 tracer로 확장한다.
- 외부 stdio의 유한 용량, outcome 불명, tombstone과 fail-closed 정책은 upstream의 보편적 보장이라고 주장하지 않는다. AY-PLE 외부 client가 process·pipe 손실에도 의미를 보존하기 위해 채택한 강화 계약이며 정확한 의미와 gate는 후속 spec이 소유한다.

## 근거 권위

| 근거 | 소유하는 사실 | 소유하지 않는 사실 |
| --- | --- | --- |
| 정확한 pin의 generated TypeScript·JSON Schema | 설치한 version의 공개 wire 방향과 shape | Ordering, identity authority와 terminal 의미 |
| 같은 정확한 pin의 Rust source·first-party tests와 [lifecycle fact table](../wayfinding/codex-native-client-redesign/assets/004-method-lifecycle-fact-table.md) | Version별 method ownership, 허용되는 관찰 순서, native identity와 state transition | AY-PLE 외부 stdio 견고성과 제품 정책 |
| 현재 sparse [`codex-method-decisions.json`](../../packages/runtime-codex/codex-method-decisions.json)과 generated [method inventory](../architecture/codex-app-server-method-inventory.md), 안전한 v2 migration 뒤의 coverage ledger | 현재 method 존재·전역 integration/adoption, 이후 이름을 부여한 tracer·semantic owner와 verification coverage | Lifecycle 의미를 도출하는 source |
| Unit test와 spawned fake child | 채택한 reducer, fault, interleaving과 race의 결정적 외부 port 증명 | 설치된 binary가 같은 공개 계약을 실제로 제공하는지 |
| Package가 소유한 pinned live binary | 좁은 외부 stdio 호환성과 대표 경로 | Race 완전성 또는 새로운 규범적 ordering |
| AY-PLE ADR·spec | 외부 client 강화 계약, 채택 범위와 하위 제품 정책 | Upstream 구현 사실 |

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| 모든 capability를 한곳에 둔 기존 `HeadlessCodexClientHost`를 확장한다 | 거절 | Connection, conversation kernel과 제품 정책이 다시 하나의 전역 state machine에 결합되고 지속 호환성 소비자도 없다. |
| `CodexRawClient`·`AgentRuntimeKernel`을 여러 thread용 제품 client로 확장한다 | 거절 | 이 경로는 개발자용 단일 run Harness이며 Server request와 장기 thread별 ownership의 권위가 아니다. |
| Upstream client 설계를 그대로 import하거나 Rust를 줄 단위로 복사한다 | 거절 | Pinned npm package는 재사용 가능한 TypeScript stdio client를 export하지 않고, upstream 표면별 정책과 AY-PLE 외부 process 경계도 다르다. |
| 향후 method와 제품/browser 계약을 한 번에 일반화한다 | 거절 | 사용하지 않는 method와 제품 case를 선제 고정하고 이후 Codex 발전 방향을 흡수하기 어렵게 만든다. |

## 결과와 경계

- ADR 0008의 Host 경계는 호환성 facade 없이 대체한다. [제거·선별 재사용 계획](../wayfinding/codex-native-client-redesign/tickets/014-plan-host-removal-and-selective-salvage.md)에 따라 교체 적합성을 통과한 뒤 기존 Host와 자체 oracle을 한 방향으로 제거한다.
- 기존 Runtime Harness와 native Codex app-data는 보존한다. 완료된 layout·transport 구현은 새 owner의 계약과 일치하는 primitive 근거만 선별 재사용한다.
- TUI UI·키 입력·표현 정책, Exec 전용 정책, 사용하지 않는 App Server method, ACP·다중 엔진 abstraction은 foundation에 포팅하지 않는다.
- `AYPLE adapter`, browser transport, `ModelingInvocation`/`ModelingRun`, 제품별 sandbox·approval 정책과 UX는 foundation의 하위이며 현재 semantic owner나 준비 gate가 아니다. 제품 조합 결정은 [ADR 0007](0007-use-native-codex-composition-for-product-actions.md)이 계속 소유한다.
- [ADR 0005](0005-use-codex-app-server-as-first-class-mvp-runtime.md)의 Codex-first와 raw protocol isolation, ADR 0006의 root ownership, [ADR 0009](0009-use-a-macos-first-local-web-app-product-path.md)의 macOS-first 제공 결정은 유지한다.

이 ADR은 채택한 목표 경계를 기록하며 현재 구현 완료를 주장하지 않는다. 현재 남아 있는 기존 구현과 구현 공백은 [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md)와 package README가, 상세 lifecycle·용량 경계·이전·검증은 활성 [Wayfinder map](../wayfinding/codex-native-client-redesign/map.md)과 후속 spec이 소유한다.
