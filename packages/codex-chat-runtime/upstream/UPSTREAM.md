# Official OpenAI Codex Python SDK provenance

이 package의 Python SDK baseline은 [openai/codex](https://github.com/openai/codex)의 Apache-2.0 source에서 materialize한다.

| 항목 | 값 |
| --- | --- |
| Repository | `https://github.com/openai/codex` |
| Local oracle | `references/openai-codex` |
| Commit | `8c68d4c87dc54d38861f5114e920c3de2efa5876` |
| Tag | `rust-v0.144.4` |
| Exported source root | `sdk/python/` |
| Runtime contract | `openai-codex-cli-bin==0.144.4` |
| SDK distribution version | `0.0.0.dev0` |
| Reproduction tool | `uv 0.8.13` |

`references/openai-codex`는 generation과 review oracle이다. Production code와 built artifact는 이 checkout을 import하거나 runtime fallback으로 사용하지 않는다. Materializer는 exact commit의 committed files만 export한다. Tracked drift와 untracked input은 거부하고 ignored input은 export에서 제외하며, absolute path contamination을 거부한다.

## Exact baseline adaptation

Pinned source의 Python SDK metadata와 generated output은 과거 native runtime을 가리킨다. Ticket 001 materializer는 다음 adaptation만 occurrence-count guard 아래 수행하고 official generator를 실행한다.

1. `openai-codex-cli-bin==0.137.0a4` dependency를 exact `0.144.4`로 정렬한다.
2. Native runtime resolver의 fixed historical cutoff와 그에 정렬된 official test expectation을 exact pin에 맞춘다.
3. Build isolation이 같은 backend를 쓰도록 `uv_build==0.11.19`를 exact pin한다.
4. 새 schema에 맞춰 `thread/fork` signature expectation과 enum normalization expectation을 occurrence guard 아래 정렬한다.
5. Upstream이 선언한 Python `>=3.10`에서 official tests가 동작하도록 두 test file에만 `tomli` fallback을 둔다. Production SDK source는 바꾸지 않는다.
6. `update_sdk_artifacts.py generate-types`로 `generated/v2_all.py`, `generated/notification_registry.py`, `api.py`의 generated convenience-method block을 모두 갱신한다.
7. Exact dependency lock과 deterministic SDK wheel을 재생성한다.

이 adaptation은 SDK distribution version을 `0.144.4`로 바꾸거나 handwritten conversation lifecycle을 수정하지 않는다. Behavioral source patch는 [PATCHES.md](PATCHES.md)에 별도 순서와 regression oracle을 기록하고 unpatched snapshot의 temporary copy에만 적용한다.

## Tracked provenance

| 경로 | 내용 |
| --- | --- |
| `../python/openai-codex/` | Exact export와 generated output을 포함한 immutable unpatched source snapshot |
| `../manifests/unpatched.json` | Source/tag, runtime·tool pin, generated/lock/wheel digest를 담은 canonical baseline |
| `patches/0001-response-last-router.patch` | Response-last terminal과 replay ordering만 고치는 첫 reviewed behavioral diff |
| `../manifests/patched-source.json` | Unpatched manifest digest, ordered patch digest와 derived source roster를 담은 source-only evidence |
| `LICENSE` | Exact source root Apache-2.0 license copy |
| `NOTICE` | Exact source root notice copy |

`LICENSE`와 `NOTICE`는 placeholder를 수동 작성하지 않는다. Exact materializer가 source root에서 복사하고 verifier가 source digest와 일치하는지 검사한다.

## 재현과 검증

Repository root에서 다음을 실행한다.

```bash
npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime
npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime
```

첫 명령만 tracked snapshot과 patched-source manifest를 의도적으로 갱신한다. 기존 unpatched manifest와 clean regeneration이 다르면 immutable baseline을 덮어쓰지 않고 실패한다. `verify:exact-sdk`는 clean build 두 개에서 patch derivation까지 재현하고, router와 official SDK tests는 temporary copy를 사용하므로 실패해도 tracked source를 수정하지 않는다. Caller의 package-index/Python/Codex home 설정은 controlled isolation environment로 대체한다. Provider/auth와 live Codex session은 이 gate에 포함하지 않는다.
