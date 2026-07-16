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
