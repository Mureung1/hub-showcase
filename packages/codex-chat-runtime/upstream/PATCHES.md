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

Public `Codex`/`AsyncCodex`, `TurnHandle`, native identity authority, process lifecycle과 queue capacity는 바꾸지 않는다. Tombstone, terminal 이후 policing, contradiction policy와 item/byte bound는 추가하지 않는다. Bounded routing은 Ticket 003의 별도 ordered patch다.

Regression oracle은 다음과 같다.

- `scripts/test_response_last_router.py`가 purpose-built App Server OS child의 `turn/started → AgentMessage delta → item/completed → turn/completed → turn/start response` flush와 response 수신 handshake를 확인한다.
- Unpatched source는 outer deadline에서 expected hang으로 수렴하고 worker·fake process group을 reap한다.
- 같은 base에 patch를 적용한 public `AsyncCodex` route는 native thread·turn·item ID와 ingress FIFO를 보존하고 첫 matching terminal에서 끝난다.
- Patch에 포함된 official router unit test가 early delta/item/terminal replay, pending cleanup과 registration 중 live-event non-overtake를 검증한다.
- `verify:exact-sdk`는 두 clean base에 같은 patch를 적용해 identical source roster와 `patched-source.json`을 재현한다. `test:exact-sdk`는 patched temporary copy에서 complete official suite와 Ruff를 실행한다.
