# Official Codex Python SDK를 Chat Shell runtime baseline으로 재사용한다

분류: 활성

성숙도: 구현됨

대체한 결정: 기존 `HeadlessCodexClientHost` 제품 seam과 community TypeScript fork 기반 자체 runtime 계획

역사적 제품 인증 결정: [ADR 0017 — 제품 account lifecycle에 Codex-managed Browser OAuth를 사용한다](0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md). 이 ADR은 official SDK·process mechanics를 계속 소유한다. ADR 0017의 public-preview managed account lifecycle은 제거됐고 현재 dev·dogfood의 account authority는 전역 `CODEX_HOME`이다.

후속 제품 interaction 결정: [ADR 0021 — Protocol-driven AY–App Interaction Layer](0021-adopt-a-protocol-driven-ay-app-interaction-layer.md), [ADR 0019 — MCP InteractionCapability로 App UI round trip을 제공한다](0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md). 이 ADR은 native permission과 Runtime mechanics를 계속 소유하고, 양방향 제품 seam은 ADR 0021, AY-originated Review·result 경계는 ADR 0019가 소유한다.

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

## Codex 실행 권한과 AY-PLE 확인 경계

현재 Chat tracer는 trusted exact App Server에 `ApprovalMode.deny_all + Sandbox.read_only`를 명시하고 effective policy를 검증한다. 이는 첫 tracer의 고정 구현값이지 first vertical이나 장기 제품의 권한 profile 결정이 아니다. `deny_all`은 escalation prompt를 만들지 않는다는 뜻이지 모든 command나 Python interpreter를 비활성화한다는 뜻은 아니다.

Codex approval은 command·file·network 같은 실행 권한에 대한 native Codex 결정이고, sandbox는 그 실행에 기술적으로 허용되는 capability 경계다. AY-PLE InteractionCapability의 Review result는 사용자의 학업 판단을 같은 AY Turn에 돌려준다. 어느 한쪽의 승인이 다른 쪽을 승인하거나 대체하지 않으며, 두 UI도 같은 approval로 합치지 않는다.

초기 First Assignment의 `read-only extraction`은 app-owned Review가 끝나기 전까지 confirmed store를 바꾸지 않았던 historical 제품 효과다. 현재 First Assignment는 InteractionCapability result를 받은 뒤 AY가 실제 workspace file을 변경한다. 이 workflow 순서는 Codex `Sandbox.read_only`, network 차단 또는 예상 밖 request의 client-side reject를 뜻하지 않는다. 실제 action에 필요한 native permission profile, 설정 소유자와 request projection은 Codex semantics와 public SDK seam을 먼저 따른 뒤 action별로 명시한다.

Exact SDK의 high-level `thread_start` 기본값은 `ApprovalMode.auto_review`, `sandbox=None`이고, current bridge는 exact SemesterWorkspace Git root thread를 `auto_review + workspace_write`로 시작한다. Low-level default handler는 command/file approval request에 `accept`를 반환하며 synthetic harness가 이를 관찰했다. 이는 실행 권한 disposition의 입력이지 AY-PLE 제품 확인 실패나 즉시 patch할 blocker가 아니다. Current maintained patch stack은 direct reuse blocker와 adopted product seam만 좁게 보완하고 approval handler·policy나 AY-PLE managed account lifecycle을 추가하지 않는다. Exact ordered roster와 current package behavior는 [runtime package README](../../packages/codex-chat-runtime/README.md)가 소유한다. Native 설정과 public seam을 검토한 뒤에도 실제 제품 action에 필요한 gap이 확인될 때만 upstream extension 또는 좁은 port를 검토하고, monkey patch나 private override는 production 대안으로 취급하지 않는다.

Product-capable runtime operation은 permission profile을 반드시 명시한다. 현재 prepared SemesterWorkspace에서 실행되는 일반 AY Chat과 InteractionCapability workflow를 포함한 canonical Product Turn은 `permissionProfile: workspace_write`로 `ApprovalMode.auto_review + Sandbox.workspace_write`를 사용한다. 제거된 Course-bound·source-free public 분기는 더 이상 current product mode가 아니며, `permissionProfile: read_only`와 `ApprovalMode.deny_all + Sandbox.read_only` 조합은 runtime의 내부 tracer·회귀 seam으로만 남는다. Native command·file permission 처리는 Codex와 official SDK가 소유한다. Built-in `request_user_input`은 일반 clarification에 사용할 수 있고, capability-specific rich Review는 ADR 0019의 custom MCP가 소유한다. 어느 interaction result도 native permission을 승인하지 않는다.

개인 product UI는 official `model/list`의 visible catalog를 Browser-safe하게 projection하고, 사용자가 고른 model·advertised reasoning effort와 `default | fast` service tier를 다음 Product Turn의 public SDK override로 전달한다. 선택이 없으면 native thread의 effective model·reasoning을 유지한다. Catalog order와 지원 조합은 App Server가 소유하며 app은 모델명을 하드코딩하거나 전역 `config.toml`을 쓰지 않는다.

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
| Low-level default `accept` 관찰만으로 SDK를 fork하거나 reject layer를 추가한다 | 거절 | 먼저 native permission profile과 실제 product action을 정하고 public SDK seam을 확인해야 하며, AY-PLE InteractionCapability result는 이 실행 권한 경계를 대신하지 않는다. |
| 기존 Host를 새 Chat Shell 계약으로 확장한다 | 거절 | 현재 generation ref와 global event state machine을 native identity·stream 위에 다시 새긴다. |

## 결과

Production Chat Shell 경로는 official SDK behavior와 native identity·stream을 보존하는 runtime·Server·UI tracer를 구현한다. 현재 구현과 conformance 결과는 [runtime package README](../../packages/codex-chat-runtime/README.md)와 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)가 소유한다. Provider live gate는 explicit disposable state에서만 실행하고 deterministic fake·exact-local 결과와 분리한다.

Legacy cutover 결정은 첫 tracer 완료만으로 자동 추론한 결과가 아니라 consumer·survivor·recovery 경계를 별도로 검토한 ADR 0012가 소유한다. InteractionCapability 구현 이후의 multi-thread sidebar, `thread/read`·`thread/resume`, 다른 action의 Codex 실행 권한 profile·request UX, disposable-auth automation과 packaging은 [개발 백로그](../product/ay-ple-development-backlog.md)의 별도 작업으로 결정한다.
