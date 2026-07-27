# Official Python SDK patch ledger

Upstream base는 `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876` (`rust-v0.144.4`)다. Patch는 이 exact base 위에 아래 순서로만 적용하며, 각 entry는 rationale, changed source path, regression oracle과 upstream issue/PR link가 있으면 그 링크를 기록한다.

## Baseline adaptation

Ticket 001은 exact runtime contract를 materialize하기 위해 아래 package/test metadata만 occurrence guard 아래 정렬한다. Handwritten conversation lifecycle의 behavioral patch는 아니다. Count와 결과 digest는 `manifests/unpatched.json`이 소유한다.

| Source path | Adaptation과 이유 | Regression oracle |
| --- | --- | --- |
| `sdk/python/pyproject.toml`, `sdk/python/uv.lock` | Runtime dependency와 resolver cutoff를 `0.144.4` release에 정렬하고 build isolation을 `uv_build==0.11.19`로 고정한다. | Guarded occurrence counts, locked suite, two-run lock/wheel digest |
| `sdk/python/tests/test_public_api_signatures.py` | Regenerated `thread/fork`의 `last_turn_id`를 sync/async signature expectation에 반영하고 Python 3.10에서만 `tomli` fallback을 쓴다. | Complete official pytest suite와 Ruff |
| `sdk/python/tests/test_artifact_workflow_and_binaries.py` | 7개 runtime pin·staging expectation을 `0.144.4`에 정렬하고, 새 enum normalization expectation을 반영하며, Python 3.10에서만 `tomli` fallback을 쓴다. | Guarded occurrence counts, complete official pytest suite와 Ruff |
| `sdk/python/tests/test_contract_generation.py` | Regeneration test가 installed exact runtime `0.144.4`를 요구하도록 assertion을 정렬한다. | Guarded occurrence count와 contract-generation test |
| `sdk/python/src/openai_codex/generated/v2_all.py`, `generated/notification_registry.py`, `api.py` | Official `update_sdk_artifacts.py generate-types`가 exact runtime schema에서 세 authority를 재생성한다. | Generated file/block digest, contract-generation test, two-run reproduction |

## Ordered behavioral patches

### 0001 — Preserve response-last turn FIFO and terminal

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0001-response-last-router.patch` |
| Exact preimage | `manifests/unpatched.json` SHA-256 `ad3deefc4d2ea29dc289e226059d84155d1d8e2e43d4399da610a569737fec17` |
| Handwritten source | `sdk/python/src/openai_codex/_message_router.py` |
| Aligned official test | `sdk/python/tests/test_client_rpc_methods.py` |
| Derived evidence | `manifests/patched-source.json` |
| Upstream issue/PR | 아직 없음. Local regression과 exact source evidence를 먼저 고정했다. |

Patch file은 outer repository의 `git diff --check`와 양립하도록 zero-context hunk로 저장한다. Applicator는 `--unidiff-zero`를 명시하지만, 먼저 immutable unpatched manifest의 전체 file digest를 검증하고 적용 뒤 declared path·full roster digest를 다시 확인하므로 약한 context를 preimage authority로 사용하지 않는다.

Exact `CodexClient.turn_start()`는 `turn/start` response를 기다린 뒤 response의 native `turn.id`를 route에 등록한다. 그 전 sole reader가 matching notification을 읽을 수 있지만 unpatched router는 early `turn/completed`에서 staged FIFO를 삭제하고, 등록 시에는 active queue를 먼저 공개한 뒤 lock 밖에서 replay해 live event 추월도 허용한다.

Patch는 두 동작만 교정한다.

- 미등록 turn의 terminal을 앞선 observation과 같은 pending FIFO에 보존한다.
- Registration lock 안에서 unbounded queue에 pending을 `put_nowait()`으로 모두 replay한 뒤에만 active route를 공개한다.

Public `Codex`/`AsyncCodex`, `TurnHandle`, native identity authority, process lifecycle과 queue capacity는 바꾸지 않는다. Tombstone, terminal 이후 policing, contradiction policy와 item/byte bound는 추가하지 않는다. Bounded routing은 아래 0002 ordered patch가 별도로 소유한다.

Regression oracle은 다음과 같다.

- `scripts/test_response_last_router.py`가 purpose-built App Server OS child의 `turn/started → AgentMessage delta → item/completed → turn/completed → turn/start response` flush와 response 수신 handshake를 확인한다.
- Unpatched source는 outer deadline에서 expected hang으로 수렴하고 worker·fake process group을 reap한다.
- 같은 base에 patch를 적용한 public `AsyncCodex` route는 native thread·turn·item ID와 ingress FIFO를 보존하고 첫 matching terminal에서 끝난다.
- Patch에 포함된 official router unit test가 early delta/item/terminal replay, pending cleanup과 registration 중 live-event non-overtake를 검증한다.
- `verify:exact-sdk`는 두 clean base에 같은 ordered patch series를 적용해 identical source roster와 `patched-source.json`을 재현한다. `test:exact-sdk`는 patched temporary copy에서 complete official suite와 Ruff를 실행한다.

### 0002 — Bound adopted notification routing and terminalize overflow

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0002-bounded-notification-routing.patch` |
| Exact preimage | 0001 postimage: `_message_router.py` SHA-256 `2221456c042d14d810e3992b7d445cfef1e3a266e14d5aeda88dc39d9130bdc5`, `test_client_rpc_methods.py` SHA-256 `8fdec2f05b422f5a942bcc61b8ca05e39fd74ac07ce2bdd98b2a8589332a9c05` |
| Handwritten source | `sdk/python/src/openai_codex/_message_router.py` |
| Aligned official test | `sdk/python/tests/test_client_rpc_methods.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 2와 final source tree |
| Upstream issue/PR | 아직 없음. Local deterministic conformance와 exact source evidence를 먼저 고정했다. |

Official router의 active/pending login·turn과 global queue는 unbounded이고 기존 `fail_all()`은 backlog 뒤에 exception을 넣으며 terminal을 latch하지 않는다. 따라서 stalled consumer나 burst가 retained memory를 제한 없이 늘릴 수 있고, overflow를 단순 bounded `queue.Queue.put()`으로 바꾸면 sole stdout reader 자체가 block될 수 있다.

Patch는 public conversation signature나 process lifecycle을 바꾸지 않고 다음 package-private mechanics만 추가한다.

- Turn route 4,096 items/16 MiB, active·pending turn route 64개씩, login route 256 items/1 MiB와 active·pending login route 8개씩, global 1,024 items/4 MiB, adopted notification aggregate 8,192 items/64 MiB를 default로 둔다.
- `method`/`params` canonical compact JSON의 UTF-8 bytes를 한 번 계산해 retained notification과 함께 보존한다. Known payload는 wire alias를 사용하고 serialization warning을 stderr로 내보내지 않는다.
- Router lock을 공유하는 deque/Condition route가 producer를 block하지 않고, pending→active 전환은 같은 route object를 옮겨 FIFO와 accounting을 보존한다. Consume, unregister와 failure는 retained item·byte budget을 반환한다.
- 첫 limit 초과는 safe `buffer_overflow`를 sticky terminal로 latch해 outstanding response와 login·turn·global current/future waiter를 깨운다. Repeated transport failure는 첫 terminal을 교체하지 않는다.
- Private goal-operation queues는 첫 Chat Shell adopted-route aggregate에 포함하지 않는다. 다만 process failure settlement 시 기존 goal state도 계속 실패시킨다.

Regression oracle은 다음과 같다.

- Patch-owned official tests가 default와 injected item·byte/route/aggregate limit, canonical unknown·known payload bytes, pending→active no-double-count, A/B 독립성, multi-waiter terminal, unregister race와 goal exclusion을 검증한다.
- `scripts/test_bounded_router.py`는 purpose-built OS child로 A pending route를 default 4,096-item boundary까지 채운 뒤 unrelated B를 완료한다. 별도 response·turn·public login·global waiter가 실제 blocking read에 진입한 것을 private snapshot barrier로 확인하고 A의 4,097번째 event에서 모두 같은 `buffer_overflow`를 관찰한다.
- 같은 harness의 14개 injected-limit matrix는 별도 process tree마다 active/pending turn, login, global, aggregate item·byte와 active/pending turn·login route-count boundary/overflow를 실행한다. Notification candidate는 actual fake child stdout과 sole reader를 통과하며 caller-side active route registration도 같은 sticky terminal과 cleanup path로 수렴한다.
- Worker는 SDK close를 task/generator 정리보다 먼저 unconditional `finally`에서 실행하고 outer harness가 child와 process group을 reap한다.
- `patched-source.json`은 각 patch의 immediate before/after를 기록하고 stage continuity, declared path와 final full-roster digest를 검증한다. 다음 stage에서 되돌린 undeclared intermediate 변경도 거부한다.

### 0003 — Preserve response waiter ownership and complete accounting oracles

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0003-router-review-corrections.patch` |
| Exact preimage | 0002 postimage: `_message_router.py` SHA-256 `8d2f090deced5325b97fb0baf24adb8f03349be7596303df01154ee9e63cbee7`, `test_client_rpc_methods.py` SHA-256 `79973ebe50f7ea8372ec9b53702ccb80c79612a9f4b0feab81e18f59f9548252` |
| Handwritten source | `sdk/python/src/openai_codex/_message_router.py` |
| Aligned official test | `sdk/python/tests/test_client_rpc_methods.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 3와 final source tree |
| Upstream issue/PR | 아직 없음. Ticket 003 Source·Spec review finding을 local regression으로 고정했다. |

0002의 `route_response()`는 response waiter를 map에서 먼저 제거한 뒤 JSON-RPC error code를 변환했다. Malformed code가 예외를 내면 sole reader가 `fail_all()`로 수렴해도 제거된 waiter를 다시 찾지 못해 request caller가 영구 대기할 수 있었다.

0003은 public API나 정상 response ordering을 바꾸지 않고 같은 router lock 안에서 waiter를 `get`한 채 response item 구성을 먼저 끝낸 뒤 `pop`하고 settle한다. Decode가 실패하면 reader의 기존 terminal path가 아직 등록된 waiter와 future waiter를 같은 failure로 깨운다.

Regression oracle은 다음과 같다.

- Reader-loop malformed response test가 non-numeric error code의 decode failure 뒤 current/future waiter가 동일 terminal을 관찰하는지 검증한다.
- Package-private usage helper는 aggregate, turn, login, global item·byte, active/pending route count와 네 waiter count의 16개 필드가 terminal 뒤 모두 0인지 확인한다.
- Pending→active move, dequeue, unregister, global consume와 retained multi-scope `fail_all()` test가 exact byte 반환과 route cleanup을 검증한다.

### 0004 — Expose exact notification opt-out configuration

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0004-notification-opt-out-config.patch` |
| Exact preimage | 0003 postimage: `client.py` SHA-256 `76bdb1e63c62987c3530ea763e9655a06b308cbc4e18cb51958e85b6c23aec3b`, `test_client_rpc_methods.py` SHA-256 `f85e1b733d4a315b63d71ae41234b6ff0aee2009fa93ea692b43703320a21363` |
| Handwritten source | `sdk/python/src/openai_codex/client.py` |
| Aligned official test | `sdk/python/tests/test_client_rpc_methods.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 4와 final source tree |
| Upstream issue/PR | 아직 없음. Ticket 005 Source review finding을 Rust first-party client behavior에 맞춘 local regression으로 고정했다. |

Pinned Rust `codex-app-server-client`는 `opt_out_notification_methods`를 `InitializeCapabilities.optOutNotificationMethods`로 전달하지만 Python `CodexConfig`는 같은 public seam을 노출하지 않았다. Global notification consumer가 없는 persistent bridge에서 정상 `thread/started`와 `thread/status/changed`가 bounded global route에 누적될 수 있었다.

0004는 `CodexConfig.opt_out_notification_methods` tuple을 추가하고 nonempty 값만 JSON array로 initialize capability에 전달한다. Default wire는 기존처럼 key를 생략한다. Bridge는 exact generated `NOTIFICATION_MODELS` 68개를 네 adopted turn method와 64개 opt-out method로 deterministic하게 partition한다. Private `_client` drain이나 새로운 conversation lifecycle은 추가하지 않는다.

Regression oracle은 다음과 같다.

- Patch-owned official test가 empty config의 key omission과 nonempty tuple의 exact JSON array 변환을 검증한다.
- Bridge actual-child journal이 sorted 64-method complement, adopted 네 method 유지와 server-side lifecycle suppression을 검증한다.
- Complete official Python suite, Ruff, deterministic patched source/wheel과 manifest stage continuity가 complete patch stack을 다시 검증한다.

### 0005 — Classify malformed correlated responses before waiter release

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0005-strict-response-classification.patch` |
| Exact preimage | 0004 postimage: `_message_router.py` SHA-256 `b8f904dbd0ffe071530dab666e0d4672a0e3e8fd2562474f688c3927f9f015cb`, `test_client_rpc_methods.py` SHA-256 `2d02b9614ffb4fd0445af70915319eefffd923987787ad1d3ddea46d721164d1` |
| Handwritten source | `sdk/python/src/openai_codex/_message_router.py` |
| Aligned official test | `sdk/python/tests/test_client_rpc_methods.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 5와 final source tree |
| Upstream issue/PR | 아직 없음. Chat Shell malformed mutation regression을 local regression으로 고정했다. |

0004까지의 router는 correlated response에서 `result`와 `error`의 배타성을 확인하지 않았고, error의 누락된 field를 default 또는 문자열 coercion으로 정상 `JsonRpcError`처럼 만들었다. 그 결과 native mutation이 이미 적용됐을 수 있는 malformed response도 bridge가 known rejection으로 분류해 runtime을 유지할 수 있었다.

0005는 matching waiter를 소유한 lock 안에서 다음 JSON-RPC envelope invariant를 먼저 검증한다.

- `result`와 `error` 중 정확히 하나만 존재해야 한다.
- `error`는 object이고, `code`는 boolean이 아닌 integer이며 `message`는 string이어야 한다.
- 위반은 waiter를 pop하기 전에 `CodexError`를 발생시켜 sole reader의 기존 sticky `fail_all()`이 current·future waiter를 같은 terminal로 수렴시킨다.
- Well-formed error만 기존 `map_jsonrpc_error()`를 거쳐 `JsonRpcError` hierarchy로 전달한다. Result schema validation은 기존 public client model의 책임을 유지한다.

Regression oracle은 patch-owned parameterized malformed envelope test, valid result/error 대조군과 bridge actual-child mutation matrix다. Bridge는 well-formed `JsonRpcError`만 `sdk_request_failed` nonfatal로 내보내고, base `CodexError`, result schema validation failure와 malformed response는 `sdk_operation_failed` fatal로 수렴한다. `thread/start`, `turn/start`, `turn/interrupt`의 null·scalar·array·missing result, invalid error envelope와 schema-invalid object를 검증하며 fatal 뒤에는 process tree가 종료된다.

### 0006 — Expose Plan mode and deferred request_user_input

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0006-plan-user-input-seam.patch` |
| Exact preimage | 0005 postimage: `update_sdk_artifacts.py`, `__init__.py`, `api.py`, `async_client.py`, `client.py`, `errors.py`, `models.py`, `types.py`, `test_public_api_signatures.py`의 immediate-before digest는 `manifests/patched-source.json` ordered stage 6이 소유한다. |
| Handwritten source | `sdk/python/scripts/update_sdk_artifacts.py`, `sdk/python/src/openai_codex/{__init__,api,async_client,client,errors,models,types}.py` |
| Aligned official test | `sdk/python/tests/test_public_api_signatures.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 6와 final source tree |
| Upstream issue/PR | 아직 없음. Exact native donor와 package actual-child conformance를 먼저 고정했다. |

Exact SDK의 high-level Turn API는 native `turn/start.collaborationMode`를 전달할 수 없고 sole reader는 모든 server request를 synchronous private approval handler에서 즉시 처리했다. 이 구조에서 Browser answer를 기다리면 unrelated response와 notification까지 멈추고, default handler는 `item/tool/requestUserInput`에 빈 object를 자동 응답했다.

0006은 Rust Core의 Plan behavior나 built-in tool을 다시 구현하지 않고 누락된 client seam만 추가한다.

- `Thread.run/turn`과 async mirror가 typed `CollaborationMode`를 exact `collaborationMode` wire value로 보낸다. Curated `openai_codex.types`는 `CollaborationMode`, `CollaborationModeSettings`, `ModeKind`만 추가하며 raw `TurnStartParams`를 package root에 노출하지 않는다.
- Public flat-method generator도 같은 signature와 serialization helper를 생성하므로 official `generate-types` 재실행이 seam을 되돌리지 않는다.
- Sole reader는 exact `item/tool/requestUserInput`을 typed `AsyncUserInputRequest`로 bounded route에 넘기고 즉시 다음 ingress를 읽는다. JSON-RPC request ID는 private token 뒤에 숨고 caller는 `AsyncCodex.next_user_input()`과 request-local `answer()` 또는 explicit empty-answer `cancel()`만 사용한다.
- Data lane은 global pending 32개와 Turn당 동시 pending 1개로 제한한다. Overflow와 두 번째 concurrent request는 자동 응답 없이 affected Turn의 `UserInputRequestError`로 드러나고 단일 bounded fire-and-forget control writer가 exact `turn/interrupt`를 보낸다. Interrupt response waiter나 failure별 thread를 만들지 않으며 failure/control reserve까지 포화하면 transport를 fail closed한다. 이미 admitted된 answer/cancel은 queue saturation과 독립적으로 direct settlement한다.
- Async waiter는 하나의 in-flight blocking delivery reservation을 직렬 공유한다. Caller cancellation은 collector를 취소하거나 새 worker를 만들지 않고 reservation을 다음 waiter에 남기므로 exact pending object가 유실되지 않으며, 반복 취소도 shared executor를 고갈시키지 않는다. Collector completion은 sync router의 reserved token을 같은 condition lock에서 claim할 때만 전달되므로 terminal settlement가 먼저 제거한 request는 폐기되고 queued failure로 이어진다. SDK close는 collector terminal을 회수해 waiter·task와 child를 함께 정산한다.
- Answer/cancel admission과 explicit interrupt admission은 전용 settlement lock에서 첫 wire write까지 atomic하게 경쟁한다. Interrupt가 먼저면 pending binding을 해제해 answer/cancel이 `interaction_not_pending`으로 끝나고, answer/cancel이 먼저면 그 response가 interrupt보다 wire에서 앞선다. Response writer는 write 완료나 ambiguous `serverRequest/resolved`만으로 settlement success를 만들지 않는다. Matching resolution 뒤 nonterminal same-Turn notification이 이어져야 request-local barrier를 해제하며, resolution 뒤 terminal이면 cleanup으로 판정해 `interaction_not_pending`으로 끝낸다.
- Exact source가 `serverRequest/resolved`를 발행하는 command/file approval, `request_user_input`, MCP elicitation과 permission request method만 1,024-entry tracker에 admission한다. Matching notification은 global route 전에 소비한다. Dynamic tool call, auth refresh, attestation, current-time과 legacy request family는 tracker에 넣지 않는다. Resolving family의 duplicate ID나 tracker overflow는 transport를 fail closed한다.
- Duplicate·late settlement는 `interaction_not_pending`이다. Native resolution 전 `turn/completed`·interrupt가 먼저면 in-flight settlement도 `interaction_not_pending`으로 끝나며 success를 만들지 않는다. SDK close와 transport loss는 각각 stable terminal error로 queued waiter와 in-flight settlement를 한 번 깨우고, internal interrupt·user-input response write failure도 transport-terminal로 승격한다.
- Exact question schema의 thread·turn·item identity, 1–3 questions, option·Other·secret flag와 optional `autoResolutionMs`를 typed read surface에 보존한다. SDK가 timeout default나 silent answer를 만들지는 않는다.

Regression oracle은 다음과 같다.

- Official public signature suite가 새 Plan keyword, curated collaboration types, typed pending object·error와 root raw-request non-export를 고정한다.
- `scripts/test_plan_interaction.py`가 purpose-built OS child를 public `AsyncCodex`로 통과해 request-before-`turn/start` response, pending 중 account response·turn notification liveness, answer/cancel 뒤 same-Turn terminal과 raw ID 비노출을 검증한다. Delayed native resolution trace는 response write와 exact `serverRequest/resolved` 뒤에도 public settlement가 pending이고 subsequent same-Turn evidence 뒤에만 완료되는지 고정한다. Response-written 뒤 `serverRequest/resolved → turn/completed` cleanup은 success 없이 `interaction_not_pending`으로 끝난다. Default command approval과 terminal cleanup 뒤 늦은 user-input resolution은 global usage 0을 검증한다. Repeated non-resolving dynamic request는 tracker usage 0, resolving approval duplicate와 1,024/1,025 boundary는 fail-closed negative control을 제공한다.
- 같은 actual-child matrix가 cancelled waiter 뒤 exact request 재전달, test-owned executor completion barrier 뒤 terminal이 먼저 정산한 stale request 비전달, 64회 연속 waiter cancellation 뒤 unrelated account operation·public close·child reap liveness, duplicate·late conflict, native interrupt response를 늦춘 interrupt↔answer 경쟁, concurrent second request와 exact 32 pending/33번째 overflow의 affected-Turn interrupt, saturated answer/cancel control settlement, resolved-before-answer와 in-flight terminal·interrupt·close·transport cleanup, blocked consumer release와 child reap을 검증한다. 추가 overflow와 interrupt response withholding은 failure/control reserve를 넘겨도 thread·response waiter가 증가하지 않고 transport failure와 close/reap으로 bounded하게 끝나는지 검증한다. Child stdin read side만 닫은 두 half-close trace는 internal interrupt writer와 request-local response writer 실패가 transport-terminal settlement와 close/reap으로 수렴하는지 고정한다.
- Complete official Python suite, Ruff, deterministic ordered derivation과 manifest/provenance gate가 기존 `0001`–`0005` behavior를 함께 재검증한다.

### 0007 — Preserve native effective thread settings

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0007-thread-start-settings.patch` |
| Exact preimage | 0006 postimage의 immediate-before digest는 `manifests/patched-source.json` ordered stage 7이 소유한다. |
| Handwritten source | `sdk/python/scripts/update_sdk_artifacts.py`, `sdk/python/src/openai_codex/api.py` |
| Aligned official test | `sdk/python/tests/test_public_api_runtime_behavior.py` |
| Derived evidence | `manifests/patched-source.json` ordered stage 7과 final source tree |
| Upstream issue/PR | 아직 없음. Exact native response와 product conformance를 먼저 고정했다. |

Pinned first-party client는 `thread/start`에서 `configured → advertised default → first available`로 결정한 effective `model`·`reasoningEffort`를 response에 넣지만 high-level Python Thread는 이 값을 버렸다. 0007은 sync·async high-level Thread에 그 값을 보존하고 generator가 같은 surface를 재생성하게 한다. Product policy disposition은 `adapt`로, Bridge는 caller override나 별도 `model/list`없이 native effective setting을 Plan Turn에 재사용하고 model이 없으면 acceptance 전 fail closed한다. Official runtime behavior test와 bridge actual-child의 zero·multiple·failed advertised model-list condition이 regression oracle다.

### 0008 — Expose thread-scoped MCP inventory

| 항목 | 값 |
| --- | --- |
| Patch | `upstream/patches/0008-thread-mcp-status.patch` |
| 적용 순서 | 8 |
| Disposition | `adapt` |
| 변경 파일 | `sdk/python/src/openai_codex/api.py`, `sdk/python/tests/test_public_api_runtime_behavior.py` |

Pinned App Server의 `mcpServerStatus/list`는 `threadId`를 받아 해당 thread의 project-local config로 MCP server와 tool inventory를 다시 확인하지만 high-level Python API에는 이 요청이 없었다. 0008은 sync·async `Codex.mcp_server_statuses(thread_id)`를 최소 typed seam으로 추가하고 `toolsAndAuthOnly` detail과 exact `threadId` 직렬화를 regression test로 고정한다. Bridge는 이 generated response를 package 밖으로 내보내지 않고 server readiness와 exact tool roster 결과로만 축약한다.

## Production wheel derivation

`manifests/unpatched.json`의 wheel은 behavioral patch 전 reproduction evidence이므로 production wheel로 재사용하지 않는다. Materializer는 immutable snapshot에 위 여덟 patch를 순서대로 적용하고 `manifests/patched-source.json`과 exact 일치를 확인한 뒤, hash-pinned macOS arm64 `uv_build==0.11.19` wheel만 허용하는 `--no-index --offline` environment에서 source epoch wheel을 두 번 build한다. 두 bytes가 동일한 경우에만 `manifests/production-runtime-darwin-arm64.json`이 build-backend evidence, patched SDK wheel digest와 installed source digest를 소유한다. Prototype의 과거 wheel이나 unpatched wheel digest는 production input이 아니다.

## AY-PLE bridge disposition

`python/bridge` 자체는 ordered upstream patch가 아니다. Source review에서 확인된 public SDK seam은 ordered patch가 소유하며 bridge는 complete `0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008` SDK 위의 AY-PLE-owned external process adapter다. Canonical production manifest가 local source roster, installed `bundle/bridge` roster와 entrypoint를 별도 evidence로 기록한다. `scripts/test_python_bridge.py` actual-child gate가 response-last acceptance-first FIFO, exact native identity, fixed workspace-write thread start와 scalar product permission profile, exact notification opt-out, malformed mutation classification, interrupt, local release/LRU, admission/cap rejection, stream·stdout terminal과 close를 검증한다.
