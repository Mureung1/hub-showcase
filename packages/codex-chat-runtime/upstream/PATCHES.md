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

없음. Response-last router correction과 bounded notification routing은 각각 후속 Ticket 002와 Ticket 003에서 source evidence와 regression oracle을 갖춘 ordered entry로 추가한다.
