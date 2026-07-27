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
| `patches/0002-bounded-notification-routing.patch` | 0001 postimage 위에서 adopted login·turn·global notification route를 item·canonical UTF-8 byte 양쪽으로 제한하고 sticky overflow settlement를 추가하는 두 번째 reviewed diff |
| `patches/0003-router-review-corrections.patch` | 0002 postimage 위에서 malformed response decode 중 waiter ownership을 보존하고 retained usage의 complete-zero oracle을 추가하는 review correction |
| `patches/0004-notification-opt-out-config.patch` | Rust first-party client와 같은 initialize notification opt-out config를 Python SDK에 노출해 bridge가 소비하지 않는 exact known method를 wire에서 억제하는 좁은 public seam |
| `patches/0005-strict-response-classification.patch` | Correlated response의 result/error 배타성과 error code/message type을 waiter release 전에 검증해 malformed mutation을 sticky SDK failure로 분류하는 좁은 router correction |
| `patches/0006-plan-user-input-seam.patch` | Typed Plan `collaborationMode`와 request-local user-input answer·cancel seam을 public high-level API에 추가한다. |
| `patches/0007-thread-start-settings.patch` | Native `thread/start`의 effective model·reasoning setting을 high-level Thread에 보존한다. |
| `../manifests/patched-source.json` | Unpatched manifest digest, ordered patch digest와 derived source roster를 담은 source-only evidence |
| `../python/bridge/` | Official public conversation API를 소비하는 AY-PLE-owned private worker; upstream SDK patch가 아님 |
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

## Production runtime artifact provenance

`manifests/production-runtime-darwin-arm64.json`은 source snapshot이나 patch ledger를 대체하지 않고, complete ordered patch stack에서 처음 build한 production SDK wheel과 external runtime closure를 연결한다.

| Input | Exact evidence |
| --- | --- |
| Build backend | `pyproject.toml`의 `uv_build==0.11.19`; reviewed macOS arm64 wheel SHA-256 `7033cf1398d05293dca9d2265730ae35ffd49631fea844c75742f0f332c4f45b`만으로 `--no-index --offline` build |
| Patched SDK wheel | `0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007` source에서 source epoch로 두 번 build한 `openai_codex-0.0.0.dev0-py3-none-any.whl`, SHA-256 `0cca6e81ed5086b9b11b79c66d9eaf6ddfec5c7cf768643b9b6c07f07fb34cb9` |
| Native Codex wheel | Exact SDK lock의 macOS arm64 `openai_codex_cli_bin-0.144.4-py3-none-macosx_11_0_arm64.whl`, SHA-256 `05db505a9c7f020f58b70837a94e00d32a50086986c267bcc44ea97b573d4a05` |
| Standalone Python | Astral `python-build-standalone` release `20250818`, CPython `3.10.18` macOS arm64 `install_only_stripped`, SHA-256 `f38f5fcbe39e657742e21a12c890f9f12d20d2c0eefaa2e6cd4a975f3f7f9dcd` |
| Dependency closure | Exact 7-wheel production roster와 installed distribution/tree digest는 canonical production manifest가 소유한다. |
| AY-PLE bridge | `python/bridge` exact 5-file roster를 `bundle/bridge`에 복사하며 source/installed digest, `bundle/bridge/worker.py` entrypoint와 non-mutating Python `-B` argument를 canonical manifest가 소유한다. |

Standalone CPython과 `uv_build` wheel은 OpenAI source가 아니라 별도 third-party binary input이다. `python/bridge`도 OpenAI source를 수정한 것이 아니라 official public `AsyncCodex` surface를 소비하는 AY-PLE source이며 ordered SDK patch digest에 포함하지 않는다. Materializer는 외부 artifact의 download URL, filename, byte size와 SHA-256을 고정하고, build backend는 final bundle 설치 roster와 분리된 build-only evidence로 보존한다. CPython archive의 PSF 및 bundled dependency license tree는 그대로 유지한다. OpenAI Apache-2.0 `LICENSE`와 `NOTICE`는 runtime wheel에 의존하지 않고 source oracle의 tracked copy를 bundle에 별도로 넣는다. Native wheel이 포함한 `rg`, `zsh` 등 third-party payload의 배포 notice completeness는 최종 distribution 전 별도 audit가 필요하다.
