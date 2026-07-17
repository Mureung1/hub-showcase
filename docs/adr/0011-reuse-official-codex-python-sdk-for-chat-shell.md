# Official Codex Python SDK를 Chat Shell runtime baseline으로 재사용한다

분류: 활성

성숙도: 채택

대체한 결정: 기존 `HeadlessCodexClientHost` 제품 seam과 community TypeScript fork 기반 자체 runtime 계획

## 맥락

AY-PLE의 첫 장기 실행 Codex client를 설계하는 동안 App Server protocol에서 TypeScript client semantics를 새로 만들고, 이후 community TypeScript client 전체를 fork해 발전시키는 경로를 시도했다. 그러나 exact official source에는 process lifecycle, initialize/initialized, sole reader, response routing, notification queue, native thread·turn API, streaming, interrupt와 close를 이미 구현한 Python SDK가 있다.

격리 prototype `prototype/codex-python-sdk-reuse@3b3fa9e0`은 official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`과 runtime `0.144.4` 조합에서 nominal turn, native identity·stream, same-thread 후속 turn, interrupt, normal close, Node child supervision과 package 재현성을 검증했다. 다만 exact source에는 response 전 terminal 유실과 unbounded notification queue가 남아 있어 이 증거를 production conformance 완료로 해석하지 않는다. Safe disposable auth/provider가 없어 live provider gate도 실행하지 않았다.

## 결정

- Chat Shell의 App Server client mechanics는 community TypeScript fork나 새 generic Host state machine 대신 official `openai-codex` Python SDK의 source structure와 public conversation API를 기준선으로 직접 재사용한다.
- Source authority는 `references/openai-codex`의 exact commit `8c68d4c87dc54d38861f5114e920c3de2efa5876` (`rust-v0.144.4`)이며 실행 runtime은 exact `openai-codex-cli-bin==0.144.4`다.
- Pinned checkout의 Python package metadata는 과거 runtime을 가리키므로 그대로 배포하지 않는다. Official generator로 `generated/*`와 `api.py`의 generated convenience-method block을 다시 만들고 runtime dependency와 artifact lock을 `0.144.4`에 맞춘다. Public signature drift를 검토·테스트하며, handwritten client/router는 아래 exact compatibility gate가 증명한 blocker에만 좁고 upstream-followable한 source patch를 허용한다.
- Node는 Python bridge process를 supervise하고 Python SDK가 exact `codex app-server --listen stdio://` child를 소유한다. Bridge는 native `threadId`, `turnId`, item identity와 notification stream을 remap하지 않으며 authoritative `turn/completed`만 terminal로 취급한다.
- 첫 vertical slice는 Chat UI에서 native thread를 만들고 text turn을 stream하며 오류·terminal, interrupt, same-thread 후속 turn과 deterministic close를 end-to-end로 확인한다.
- 이전 `CodexRuntimeAdapter → CodexRawClient` Harness와 `HeadlessCodexClientHost → ProductRuntimeLayout → CodexStdioTransport`는 이 baseline을 대체하지 못했다. [ADR 0012](0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 hard cutover는 두 legacy 경로와 package를 current tracked graph에서 제거하며 compatibility alias를 남기지 않는다.
- Community donor submodule, vendored fork, AI SDK public surface와 fork patch ledger는 production lineage에서 제거한다. Prototype branch는 실행 증거 archive로만 보존하고 merge하거나 전체 cherry-pick하지 않는다.

## Exact-pin compatibility gate

Exact Python SDK의 `CodexClient.turn_start()`는 `turn/start` response를 받은 뒤에야 turn notification queue를 등록한다. 그 전에 matching `turn/completed`가 오면 `MessageRouter`는 staged event와 terminal을 모두 버린다. Exact Rust App Server의 response dispatch와 per-thread notification forwarding은 서로 다른 async path이므로 response-before-terminal barrier가 있다고 추론할 근거가 없다.

따라서 첫 compatibility gate는 regenerated artifact와 runtime lock을 갖춘 exact package baseline을 만든 뒤 AgentMessage event와 `turn/completed`를 response보다 먼저 보내는 deterministic actual-child fake로 현재 실패를 재현한다. 이어 event FIFO와 authoritative terminal이 한 번 보존되고, 누락 시 conformance deadline이 전체 process tree를 정리하며, pending call이 영구 대기하지 않음을 검증한다. Exact upstream source가 이를 통과하지 못하면 먼저 upstream fix를 제안하고, production artifact에는 동일 동작만 고치는 최소 router patch와 official suite 회귀를 포함한다. 이 gate 전에는 direct reuse 결정을 T0 완료로 표현하지 않는다.

Exact `MessageRouter`의 login, active turn, pending turn과 global notification queue도 unbounded다. Node egress queue만 제한해서는 Python reader/router의 메모리를 제한할 수 없다. Production bridge는 SDK 내부 queue에 유한한 package-private bound를 두고 overflow를 silent eviction이나 unrelated queue blocking이 아닌 bridge terminal과 bounded process-tree cleanup으로 드러내야 한다. 구체 cap과 payload budget은 implementation spec이 소유하고 exact burst·stalled-consumer fake로 검증한다.

## Approval과 sandbox 경계

첫 Chat Shell은 trusted exact App Server, explicit `ApprovalMode.deny_all + Sandbox.read_only`, effective approval policy와 sandbox 검증을 전제로 하며 interactive approval을 제공하지 않는다. `deny_all`은 escalation prompt를 만들지 않는다는 뜻이지 모든 command를 비활성화한다는 뜻은 아니다.

Official SDK의 low-level default handler는 예상 밖의 schema-valid command/file approval request에 `accept`를 응답한다. Exact adversarial fake에서도 같은 native thread의 unexpected request가 이 결과를 냈다. 따라서 현재 baseline은 client-side fail-closed defense가 아니라 trusted App Server의 effective policy에 의존한다.

Approval 정책, 사용자 결정과 UI는 AY-PLE product layer가 소유한다. Interactive approval이 실제 use case가 될 때 upstream public extension을 먼저 검토하고, public seam이 여전히 없을 때만 prototype의 original `RequestId` lease patch를 재평가한다. Monkey patch나 private override는 production 대안으로 취급하지 않는다.

## Runtime baseline과 배포 packaging 책임

현재 local companion Chat Shell의 production runtime baseline은 다음을 구현·검증한다.

- Exact Python SDK/generated model/runtime artifact lock과 Apache-2.0 `LICENSE`·`NOTICE` provenance
- Python process와 native child-of-child의 bounded cancellation, kill와 reap
- Request·stream deadline, stdout/stderr drain과 Node-side watchdog
- SDK 내부 queue와 Node egress의 bounded backpressure, overflow terminal과 hard-crash settlement
- Unit·actual-child fake gate와 안전한 disposable auth/provider가 준비된 경우의 live gate

Safe live gate를 실행할 명시적 provider/auth가 없으면 `blocked`로 기록하며 baseline 거절 근거로 삼지 않는다. Fake 성공, 명시적으로 승인한 Harness-managed auth를 사용한 manual live smoke와 disposable-auth 자동화 gate를 같은 evidence로 표현하지 않는다.

배포 가능한 packaged Desktop App은 이 runtime baseline과 별도 readiness 범위다. 채택한 지원 platform별 Python/runtime artifact, native payload의 third-party notice audit, signing·notarization, atomic update/rollback과 distribution smoke는 Desktop packaging을 시작할 때 함께 검증한다. 첫 macOS local web app tracer가 구현됐다는 사실만으로 이 배포 준비가 끝났다고 해석하지 않는다.

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| Community TypeScript client를 계속 fork한다 | 거절 | Official external client가 같은 mechanics와 native conversation API를 이미 소유하며 기존 fork에는 production consumer가 없다. |
| Protocol에서 TypeScript runtime을 새로 설계한다 | 거절 | First-party behavior를 다시 발명하고 기존 theoretical contract가 upstream semantics를 제약한다. |
| Interactive approval을 위해 지금 SDK를 fork한다 | 보류 | 초기 Chat Shell에 필요하지 않으며 product policy와 upstream extension 가능성을 먼저 결정해야 한다. |
| 기존 Host를 새 Chat Shell 계약으로 확장한다 | 거절 | 현재 generation ref와 global event state machine을 native identity·stream 위에 다시 새긴다. |

## 결과

Production Chat Shell 경로는 official SDK behavior와 native identity·stream을 보존하는 runtime·Server·UI tracer로 구현됐다. 현재 구현과 conformance 결과는 [runtime package README](../../packages/codex-chat-runtime/README.md)와 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)가 소유한다. Provider live gate는 explicit disposable state에서만 실행하고 deterministic fake·exact-local 결과와 분리한다.

Legacy cutover 결정은 첫 tracer 완료만으로 자동 추론한 결과가 아니라 consumer·survivor·recovery 경계를 별도로 검토한 ADR 0012가 소유한다. Assignment, `ModelingRun`, Review Workspace, multi-thread sidebar, `thread/read`·`thread/resume`, interactive approval, disposable-auth automation과 packaging은 [개발 백로그](../product/ay-ple-development-backlog.md)의 별도 작업으로 결정한다.
