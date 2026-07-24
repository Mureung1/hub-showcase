# Codex Python SDK patch stack 축소 연구

| 항목 | 값 |
| --- | --- |
| 작성일 | 2026-07-23 |
| 분류 | 기술 참고 |
| 성숙도 | 채택 |
| 감사 기준 | `d6c4b26af` |
| 기준 commit | `d6c4b26afe2d51c117a994ae687026f5ed0a4e09` |
| 조사 범위 | 제안된 `0010` native context read와 ordered patch `0001`–`0009` |

## 구현 반영 현황

| 항목 | 현재 결과 |
| --- | --- |
| Patch ceiling | Ordered patch는 `0001`–`0009` 아홉 개로 유지했고 `0010`은 만들지 않았다. Patched-source digest와 patch-stack digest는 감사 기준과 같다. |
| Native context | Reviewed correction tip `93897411b`에서 verified native App Server one-shot probe, strict Runtime-private pinned-schema decoder, caller-signal별 atomic coordinator와 full process-group reap을 구현했다. |
| Product boundary | `CodexManagedRuntime`이 frozen `CodexNativeContextPort`를 구현하고 Server boundary는 high-level config·Skill projection만 소비한다. Server production source에는 raw method·CLI config literal이 없다. |
| Spawn integrity | Persistent Runtime과 sidecar는 workspace·controlled root overlap을 native spawn 전에 거절한다. Sidecar는 verifier-issued frozen bundle capability를 보존하고 매 spawn 직전 complete tree를 다시 검증하며, drift는 native spawn·protocol write 0건으로 닫는다. |
| Evidence | Runtime unit 138개, native-context actual 23개, Node actual 91개와 Server native/action focused 28개가 green이다. 12회 반복 oracle은 fd·task·process group·route·temp retention 0을 확인하고, exact native provider-free smoke는 empty marker, workspace Skill, official system Skill 제외와 full reap을 확인한다. |
| Independent review | Standards는 P0–P2 finding 0건, parent Spec은 P0–P3 finding 0건이다. Persistent bridge와 one-shot probe의 중복 launch primitive는 release blocker가 아닌 bounded P3 debt로 두고 다음 관련 규칙 변경 때 pure validation primitive부터 추출한다. |
| 남은 integration | Account transition lease, first-run setup transaction과 `Semester Ready` commit은 구현되지 않았다. Probe 결과를 실제 action start까지 같은 lease로 bind하는 일은 후속 A1/C1 composition 책임이다. |

## Coordinator 실행 권고

1. **`0010`을 만들지 않는다.** `config/read`와 `skills/list`는 supported public Python SDK surface에 없으며, import 가능한 `CodexClient`·`AsyncCodexClient`와 `.request()`는 official public API가 아니다.
2. **`@ay-ple/codex-chat-runtime` 소유의 좁고 bounded한 App Server stdio context probe를 쓴다.** Exact native executable을 별도 one-shot process로 띄워 `initialize → initialized → config/read → skills/list`만 수행하고, frozen `CodexNativeContextPort` 결과로 매핑한 뒤 process tree를 완전히 reap한다.
3. **patch ceiling을 현재 9개에서 즉시 동결한다.** 중간 숫자를 release deadline으로 먼저 고정하지 않고, replacement capability가 기존 acceptance를 통과해 production 의존이 실제로 사라질 때마다 ceiling을 낮춘다. 최종 목표는 0개다. Patch file을 합치는 것은 개수 축소로 세지 않는다.
4. **Replacement 이후의 축소 우선순위는 `0009 → 0008 → 0007 → 0004 → 0006 → (0001, 0003, 0005) → 0002`다.** Control-plane login adapter로 `0009`, workspace-local Skill action migration으로 `0008`을 먼저 줄인다. `0001`–`0007`은 product seam 변경이나 full conversation adapter 없이는 현재 graph에서 제거할 수 없다.
5. **새 SDK patch의 기본값을 금지한다.** Demonstrated upstream defect, 최소 failing oracle, upstream issue/PR 또는 제출 불가 사유, 제거 조건, patch-budget 예외 승인이 모두 있을 때만 허용한다.

이 결론은 “low-level class를 import할 수 있다”와 “지원되는 public SDK surface다”를 구분한다. 현재 Python SDK 내부로 reach-through하는 방식은 patch를 파일에서 호출부로 옮길 뿐이며 유지보수 위험을 줄이지 않는다.

## 1. 감사 기준과 upstream snapshot

### 1.1 Exact local baseline

| 항목 | 값 |
| --- | --- |
| Upstream repository | `openai/codex` |
| Export commit | `8c68d4c87dc54d38861f5114e920c3de2efa5876` |
| Export tag | `rust-v0.144.4` |
| Native runtime | `openai-codex-cli-bin==0.144.4` |
| Python distribution | `openai-codex==0.0.0.dev0` |
| Bundle Python | CPython `3.10.18`, macOS arm64, `20250818` |
| Unpatched manifest SHA-256 | `ad3deefc4d2ea29dc289e226059d84155d1d8e2e43d4399da610a569737fec17` |
| Ordered patch stack SHA-256 | `2cb3dcc9bdf7f81136b21ac16cb1afe161e5676e3800e85265653c2795fbbcbd` |
| Patched source patch roster | 9 files, 130,835 bytes, 3,217 lines |

Baseline authority와 reproduction contract는 `packages/codex-chat-runtime/upstream/UPSTREAM.md:1` 및 `packages/codex-chat-runtime/upstream/PATCHES.md:1`에 있다. 이 연구는 patch ledger의 설명뿐 아니라 각 patch diff, patched/unpatched source, official tests, package actual-child scripts와 Server/Runtime acceptance를 대조했다.

### 1.2 Upstream 상태를 판정한 시점

Upstream의 움직이는 branch와 release를 같은 것으로 취급하지 않았다.

| 기준 | 감사 시점의 exact 값 | 용도 |
| --- | --- | --- |
| Pinned source | [`8c68d4c8`](https://github.com/openai/codex/tree/8c68d4c87dc54d38861f5114e920c3de2efa5876), `rust-v0.144.4` | Local preimage |
| 최신 Python SDK tag | [`python-v0.144.4`](https://github.com/openai/codex/tree/5354e4951a8d10567ab2e43f8e483331f9ffe49e) (`5354e495…`) | Python SDK release 계열 확인 |
| 최신 stable Codex release | [`rust-v0.145.0`](https://github.com/openai/codex/releases/tag/rust-v0.145.0) (`25af12f7…`, 2026-07-21 공개) | Stable release 확인 |
| Moving `main` 최종 snapshot | [`7d748d3b`](https://github.com/openai/codex/tree/7d748d3bbcbd640988813de962455f27c918abdf) (2026-07-23T15:32:36Z) | Current-source 확인 |

감사 중 `main`은 `34b935e3…`에서 `7d748d3b…`로 이동했다. 따라서 이 문서의 “current main” 판정은 branch 이름이 아니라 위 exact SHA에 한정한다.

Patch가 만지는 핵심 handwritten Python source의 Git blob은 pinned source, stable `rust-v0.145.0`, 최종 `main` snapshot에서 모두 동일했다.

| Source | 세 기준에서 동일한 blob |
| --- | --- |
| `_message_router.py` | `c979c8c8ddb07e924654748c8cebac43590cf62e` |
| `_login.py` | `377c9489ec4068b4458cc033940e473d1638ba67` |
| `__init__.py` | `2829958dc1fd77a73831c090948298a98386efbe` |
| `api.py` | `6fc9a8243d63d6885e987fcb3b9bd622af91f744` |
| `async_client.py` | `07e7d0d4053428af3255bec267ab5fa0ecc70407` |
| `client.py` | `ab5390ae52bbdf203cf6a7e66d2be9d41f4eb67c` |
| `errors.py` | `db3e7238d32c6c6d4996cb2f0f16ddcf04e48be2` |
| `models.py` | `d9d15dc684eec0763ce377dd36e54c8c29c3384a` |
| `types.py` | `ae4b769db4e5ac444d183a705619fc9f8a314c7f` |

그러므로 `0001`–`0009` 중 어느 것도 최신 Python tag, 최신 stable Codex release 또는 감사 시점 `main`에 이미 반영됐다고 볼 수 없다. Generated artifact가 바뀌었는지는 handwritten behavioral fix의 upstream 여부를 대신하지 않는다.

## 2. `0010`보다 먼저 비교할 patch-free 대안

### 2.1 보존해야 하는 semantic contract

현재 제품 계약은 “파일이 존재한다”가 아니라 **action을 수행할 exact native launch가 관찰하는 effective context**를 검증한다.

- `config/read(cwd, includeLayers=true)`에서 `projectRootMarkers=[]`와 `globalInstructionsFile=null`을 확인한다.
- `skills/list(cwds=[workspace], forceReload=true)`에서 enabled Skill 하나와 canonical workspace-local source를 확인한다.
- Ready 이전에는 `thread/start`, `thread/resume`, `turn/start`와 `SkillInput`이 0이어야 한다.
- Context 결과는 `CodexEffectiveConfig`, `CodexEffectiveSkill`과 `CodexNativeContextPort`의 frozen high-level contract로만 Server에 전달한다.
- Probe와 action Runtime은 같은 manifest-attested native executable, version, environment policy, cwd, config override와 workspace transition lease를 사용한다.
- Failure, timeout, malformed/oversize response 또는 early EOF는 Ready를 만들지 않고 fail closed한다.

Owning local evidence는 `packages/codex-chat-runtime/src/account-contract.ts`, `apps/server/src/setup/native-project-boundary.ts`, `docs/specs/2026-07-23-public-npx-first-release.md`와 Ticket 008이다. 감사 기준 `d6c4b26af`의 Server raw query adapter는 임시 seam이었고, 위 구현 반영에서 Runtime-owned raw mapping과 high-level Server consumer로 교체됐다.

### 2.2 Public surface 판정

Official SDK의 package root export는 supported public surface를 의도적으로 제한한다. Official negative test는 `CodexClient`, `AsyncCodexClient`와 generated protocol types가 root public API에 없어야 한다고 고정한다. [`__init__.py`](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/sdk/python/src/openai_codex/__init__.py#L1-L93), [public API negative test](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/sdk/python/tests/test_public_api_signatures.py#L244-L266), [official API reference](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/sdk/python/docs/api-reference.md#L1-L115)를 함께 보면 다음을 구분할 수 있다.

| 관찰 | 판정 |
| --- | --- |
| `openai_codex.client.CodexClient`를 import할 수 있다 | Python module 내부 구현에 접근 가능하다는 뜻이다. Supported public contract가 아니다. |
| `CodexClient.request()`와 `AsyncCodexClient.request()`가 존재한다 | [`client.py`](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/sdk/python/src/openai_codex/client.py#L311-L321), [`async_client.py`](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/sdk/python/src/openai_codex/async_client.py#L124-L137)의 internal mechanism이다. API reference와 curated root에는 없다. |
| `ConfigReadParams`, `SkillsListParams` generated type을 import할 수 있다 | Protocol artifact를 reach-through하는 것이다. Product-facing compatibility promise가 아니다. |
| Public `Codex`·`AsyncCodex`에 `config_read`·`skills_list`가 없다 | Existing supported SDK graph 안에서 patch-free native context read는 불가능하다. |

따라서 “public low-level SDK request를 사용한다”는 대안은 성립하지 않는다. 그 방식은 local patch를 unsupported import와 private lifecycle dependency로 바꾼다.

### 2.3 대안 비교

Official App Server는 rich client를 위한 JSON-RPC interface이며 stdio JSONL transport, `initialize`/`initialized`, schema generation과 notification opt-out을 문서화한다. [Official App Server README](https://github.com/openai/codex/blob/7d748d3bbcbd640988813de962455f27c918abdf/codex-rs/app-server/README.md)와 pinned protocol의 [`SkillsListParams`/`SkillsListResponse`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L18-L36), [`SkillMetadata`/`SkillsListEntry`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L413-L496), [`ConfigReadParams`/`ConfigReadResponse`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/v2/config.rs#L347-L369)가 두 read의 authoritative wire contract다.

| 대안 | Process topology | Public API 상태 | Typed mapping owner | Private internal dependency | Protocol leakage | Lifecycle·cleanup | Acceptance evidence | 유지비 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Existing high-level `Codex`/`AsyncCodex` | SDK가 persistent App Server child 소유 | Supported이지만 두 method 없음 | SDK | 없음 | 낮음 | 기존 close/reap 재사용 | Required read를 만들 수 없어 불충분 | 사용할 수 없음 |
| B. `CodexClient.request()` reach-through | SDK-owned child의 private client 접근 | Import 가능, **supported public 아님** | Generated type과 caller에 분산 | 높음 | Raw method가 Bridge/Server로 번질 위험 | Private reader/router/child ownership과 결합 | 호출 성공만 보이며 compatibility oracle 부재 | 겉보기 낮음, 실제 높음 |
| C. AY-PLE primary App Server adapter | Python SDK 대신 Runtime이 persistent App Server child 직접 소유 | Official documented App Server protocol 사용 | `@ay-ple/codex-chat-runtime` | 없음 | Package-private로 봉쇄 가능 | Router, server request, login, bounds, close/reap을 모두 소유 | 모든 현재 SDK/Bridge actual-child gate를 재구현해야 함 | 초기 매우 높음, 장기 낮음 |
| D. AY-PLE one-shot context probe | 기존 SDK Runtime과 별도 bounded App Server child | Official documented App Server protocol 사용 | `@ay-ple/codex-chat-runtime`의 두-method decoder | 없음 | 두 method를 package-private로 제한 | Deadline, byte cap, kill/reap을 작은 state machine으로 고정 | Context-only negative/positive trace를 정밀하게 증명 가능 | **중간** |
| E. Contract 축소 또는 deferral | 추가 process 없음 | Public SDK만 사용 | Server static scan | 없음 | 없음 | 추가 lifecycle 없음 | Native effective context를 증명하지 못함 | 낮지만 adopted guarantee 상실 |

### 2.4 Decision matrix

5점이 가장 유리하다. “현재 구현 가능성”은 지금의 supported surface와 target contract를 함께 만족하는지를 뜻한다.

| 대안 | 현재 구현 가능성 | 호환성 안전성 | Contract 충족 | 격리·정리 용이성 | 장기 전략성 | 합계 / 25 | 결정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A. High-level SDK | 1 | 5 | 1 | 5 | 3 | 15 | 두 read가 없어 기각 |
| B. Internal reach-through | 3 | 1 | 4 | 2 | 1 | 11 | 금지 |
| C. Primary adapter | 2 | 4 | 5 | 3 | 5 | 19 | 장기 target |
| D. One-shot probe | 5 | 4 | 5 | 5 | 4 | **23** | 즉시 권고 |
| E. Contract 축소 | 5 | 5 | 1 | 5 | 2 | 18 | 별도 product/architecture 결정 없이는 기각 |

### 2.5 권고하는 patch-free context probe

`@ay-ple/codex-chat-runtime` 내부에 두 method만 이해하는 one-shot adapter를 둔다.

```text
workspace transition lease 취득
  → exact manifest-attested native executable spawn
  → initialize(capabilities.experimentalApi=true) / initialized
  → config/read(cwd, includeLayers=true)
  → skills/list(cwds=[cwd], forceReload=true)
  → narrow strict decode
  → frozen CodexNativeContextPort result
  → stdin close + deadline-bounded process-group reap
  → 동일 launch attestation으로 action Runtime admission
```

`config/read` method는 문서화돼 있지만 필요한 `config` response field는 pinned protocol에서 experimental로 표시된다. Probe는 initialize에서 `capabilities.experimentalApi=true`를 명시해야 하며, “documented protocol”이라고 해서 moving-version compatibility를 가정해서는 안 된다. Exact native pin과 schema fixture가 필요하다. `skills/list` 등록은 pinned [`common.rs`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/common.rs#L663-L667), `config/read` 등록은 같은 파일의 [method registration](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/common.rs#L1110-L1114)에 있다.

Probe는 다음 acceptance를 모두 가져야 한다.

| 영역 | 필수 oracle |
| --- | --- |
| Exact child | Production bundle의 manifest-attested executable, version, cwd, env allowlist와 `project_root_markers=[]` override를 journal로 증명 |
| Positive | Hostile parent/user context에서도 `projectRootMarkers=[]`, `globalInstructionsFile=null`, enabled Skill 정확히 하나, canonical workspace-local source |
| No action | Journal에 `initialize`, `config/read`, `skills/list`만 있고 `thread/start`, `thread/resume`, `turn/start`, `SkillInput`은 0 |
| Strict input | Wrong id, duplicate response, malformed envelope, schema-invalid field, unknown required enum, oversize line/aggregate를 fail closed |
| Boundedness | Startup/read/close deadline, line·aggregate byte cap, stderr cap, pending request cap |
| Cleanup | Success, App Server error, timeout, EOF, partial line, child crash에서 worker와 process group이 모두 사라짐 |
| Freshness | Ready/action admission 직전에 새 probe를 실행하고, 같은 workspace transition lease와 launch attestation이 아니면 결과 폐기 |
| Repetition | 반복 probe에서 fd, task, process, route와 temporary artifact 누수 0 |

별도 process라는 점은 숨기지 않는다. Existing SDK가 child를 private하게 소유하므로 같은 OS process에 supported surface로 read를 주입할 방법이 없다. 대신 exact binary/config/env/cwd identity, 같은 transition lease, fresh-before-admission을 증명해 semantic equivalence를 만든다. 이 equivalence가 충분하지 않다는 product 결정이 내려지면, 해법은 `0010`이 아니라 C안인 primary App Server adapter다.

### 2.6 `0010` no-go

- `openai_codex.client`, `openai_codex.async_client`, `_client` 또는 generated protocol module을 product path에서 직접 import하지 않는다.
- Generic `request(method, params)`를 Runtime 밖으로 export하지 않는다.
- Probe의 raw JSON-RPC shape를 Server contract, Browser payload 또는 product model에 넣지 않는다.
- Probe result와 action Runtime의 exact launch attestation·workspace transition lease가 다르면 재사용하지 않는다.
- Probe child를 완전히 reap하기 전에 Ready를 만들지 않는다.
- Static scan만으로 native effective-context guarantee를 조용히 낮추지 않는다.
- 두 read를 위해 SDK patch `0010`을 추가하지 않는다. Upstream이 curated high-level API를 제공하면 그 release를 별도 검증한다.

## 3. Ordered patch `0001`–`0009` audit

분류 값은 다음 뜻으로 쓴다.

| 분류 | 뜻 |
| --- | --- |
| `remove now` | 현재 supported surface와 acceptance를 보존하며 즉시 제거 가능 |
| `retain temporarily` | 현재 product/runtime에 필요하고 replacement가 아직 없음 |
| `migrate to AY-PLE-owned code` | OpenAI SDK fork보다 Runtime-owned App Server boundary가 적절한 정책/adapter |
| `needs spike` | 제거 전 별도 설계·actual-child 증명이 필요 |
| `already upstream` | 감사한 official release 또는 exact `main` snapshot에 반영됨 |

현재 `remove now`와 `already upstream`인 patch는 **0개**다. 아래 “현재 필요”는 existing SDK/Bridge topology 기준이며, “분류”는 장기 소유권을 포함한다.

### 3.1 `0001`–`0005`

| Patch | Actual diff와 성격 | 현재 필요 | Upstream 상태 | 제거 시 깨지는 failing evidence | Patch-free replacement·제거 조건 | 분류 | 유지비 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0001-response-last-router` | `turn/start` response보다 먼저 온 terminal을 pending FIFO에 보존하고, registration lock 안에서 replay 뒤 active route를 공개한다. SDK ordering/correctness defect다. | 예 | `_message_router.py` blob 동일. Latest Python/stable/`main@7d748d3b` 모두 defect 유지. | `scripts/test_response_last_router.py`의 unpatched bounded hang/reap, early delta·item·terminal FIFO, official replay test, `runtime.actual.test.ts` response-last | Upstream released fix 또는 AY primary adapter가 response-last FIFO·terminal·reap oracle을 통과 | `retain temporarily` | 중간 |
| `0002-bounded-notification-routing` | Item/byte/route/aggregate budgets, nonblocking routes, sticky overflow와 complete accounting을 SDK router에 넣는다. 대부분 AY-PLE operational safety policy다. | 예 | `_message_router.py` blob 동일. Official router의 active/pending/global queue는 여전히 unbounded. | `scripts/test_bounded_router.py` default 4,096/4,097 boundary, 14-limit matrix, unrelated-route liveness, multi-waiter terminal, exact zero usage | AY primary adapter가 모든 ingress에 동등하거나 더 엄격한 budget, nonblocking reader, sticky terminal과 zero-usage oracle을 소유 | `migrate to AY-PLE-owned code` | 매우 높음; 1,122 patch lines |
| `0003-router-review-corrections` | Malformed response decode 전에 waiter를 제거하지 않도록 ownership을 보존하고 complete-zero accounting oracle을 추가한다. SDK settlement defect다. | 예 | `_message_router.py` blob 동일. Current code도 decode 전에 waiter를 `pop`한다. | `test_reader_response_decode_failure_settles_the_registered_waiter`, current/future waiter 동일 terminal, 16-field usage zero | Upstream released fix 또는 AY primary adapter가 decode-before-release와 failure settlement를 증명 | `retain temporarily` | 중간 |
| `0004-notification-opt-out-config` | `CodexConfig.opt_out_notification_methods`를 initialize capability로 전달한다. App Server capability에 대한 SDK convenience gap이다. | 예 | `client.py` blob 동일. Rust/App Server에는 capability가 있지만 Python curated API에는 없음. | Official exact forwarding/key-omission test, Bridge의 known notification partition과 global-route nonaccumulation | AY App Server adapter가 initialize capability를 package-private typed config로 소유하거나 upstream curated API가 공개되고 actual-child partition gate 통과 | `migrate to AY-PLE-owned code` | 낮음 |
| `0005-strict-response-classification` | Correlated response에서 `result` xor `error`, error object, non-bool integer `code`, string `message`를 waiter release 전에 검증한다. SDK protocol validation과 unknown-outcome policy가 결합돼 있다. | 예 | `_message_router.py` blob 동일. Current router는 malformed envelope를 엄격히 거부하지 않음. | Official malformed matrix, `scripts/test_python_bridge.py` malformed mutation fatal, Runtime의 unknown-outcome/process-terminal gate | Upstream strict classifier 또는 AY primary adapter가 raw envelope 단계에서 같은 fail-closed semantics를 소유 | `retain temporarily` | 중간 |

### 3.2 `0006`–`0009`

| Patch | Actual diff와 성격 | 현재 필요 | Upstream 상태 | 제거 시 깨지는 failing evidence | Patch-free replacement·제거 조건 | 분류 | 유지비 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0006-plan-user-input-seam` | Plan `collaborationMode` convenience와 deferred `request_user_input` route, 32 pending cap, direct settlement writer, 1,024 resolution tracker, same-Turn continuation barrier, interrupt/close/transport races를 함께 추가한다. 작은 API gap과 큰 AY interaction policy가 한 patch에 결합됐다. | 예 | `__init__`, `api`, `async_client`, `client`, `errors`, `models`, `types` blob 모두 동일. Public deferred request seam은 없음. | `scripts/test_plan_interaction.py` 18-test actual-child matrix, official signature test, Runtime answer/cancel/interrupt/settlement/cleanup product tests | 별도 spike로 convenience와 policy를 분리한 뒤 AY primary adapter가 server request lane과 모든 race/bound oracle을 통과하거나 upstream public async seam 채택 | `retain temporarily` | 매우 높음; 979 patch lines와 가장 넓은 lifecycle 결합 |
| `0007-thread-start-settings` | `ThreadStartResponse.model`과 `reasoning_effort`를 high-level `Thread` handle에 보존한다. SDK convenience gap이다. | 예 | `api.py` blob 동일. High-level `Thread`는 effective settings를 계속 버림. | Official runtime behavior, advertised model list 0/다수/failure에서도 native effective setting을 쓰는 Runtime actual test | Explicit requested model/reasoning ownership이 native-effective fallback을 대체할 수 있는지 spike. 불가하면 upstream curated field 또는 primary adapter 필요 | `needs spike` | 낮음 |
| `0008-standalone-skill-extra-roots` | `skills/extraRoots/set` typed sync/async wrapper와 validation을 추가한다. SDK convenience와 기존 managed external-root topology를 지원한다. | 현재 topology에서는 예 | `api`, `async_client`, `client` blob 동일. App Server method는 있지만 curated Python API는 없음. | Official sequence/signature/invalid-input test, Bridge journal의 replacement, Server managed Skill actual-child | B1b workspace-local `.agents/skills` cutover 후 native `skills/list` probe가 exact one enabled Skill을 증명하고 journal의 `skills/extraRoots/set`이 0 | `migrate to AY-PLE-owned code` | 중간; 가장 먼저 제거 가능한 topology patch |
| `0009-managed-chatgpt-login` | `LoginAppBrand.codex`, hosted success page, unexpected route cleanup, `account/login/completed` opt-out reservation을 묶는다. SDK convenience와 AY-PLE managed-login policy가 결합됐다. | 예 | `_login.py`, `client.py` blob 동일. Official high-level login은 해당 options와 reservation을 노출하지 않음. | Official hosted options/start-failure/route cleanup, Bridge account lifecycle, Runtime delayed matching completion | Account-scoped AY App Server adapter 또는 upstream curated login options가 exact attempt isolation, opt-out coupling, failure/reap oracle 통과 | `migrate to AY-PLE-owned code` | 중간 |

### 3.3 Audit에서 드러난 공통 문제

- 9개 patch 모두 ledger의 `Upstream issue/PR`가 “아직 없음”이다. Exact local evidence는 강하지만 removal feedback loop는 없다.
- `0002`와 `0006` 두 파일만 전체 patch lines의 약 65%를 차지한다. Patch count보다 lifecycle policy가 upstream source 안에 들어간 비율이 더 큰 위험이다.
- `0001`, `0003`, `0005`는 upstream에 제안하기 좋은 최소 correctness defect다. 서로 같은 router preimage에 순서 의존하므로 하나씩 upstream화하되 combined actual-child oracle을 유지해야 한다.
- `0004`, `0007`, `0008`, `0009`는 App Server가 이미 가진 값을 curated high-level SDK가 감춘 convenience gap이다. Internal client reach-through가 아니라 upstream curated API 또는 AY-owned App Server boundary가 올바른 seam이다.
- `0002`, `0006`, `0009`에는 AY-PLE 정책이 섞여 있다. Upstream에 그대로 밀어 넣기보다 protocol-neutral defect와 product policy를 먼저 분리해야 한다.

## 4. 단계별 축소 계획

### 4.1 Patch ceiling

| Checkpoint | Behavioral patch ceiling | 통과 조건 |
| --- | ---: | --- |
| 즉시 | **9** | `0010` 금지, 새 patch는 예외 승인 필요 |
| 첫 capability replacement | 실제 제거 수만큼 감소 | Control-plane login adapter의 `0009` 또는 workspace-local Skill action migration의 `0008`이 해당 exact gate를 통과하고 production bundle에서 제거됨 |
| 두 capability replacement 완료 | **최대 7** | `0009`와 `0008`이 모두 production bundle에서 제거됨. 이 수치는 release deadline이 아니라 두 replacement가 완료됐다는 결과값임 |
| Conversation boundary 전환 | 고정 중간 숫자 없음 | Patch별 removal oracle을 통과할 때마다 ceiling을 낮춤. 일정 때문에 acceptance를 낮춰 숫자를 맞추지 않음 |
| 최종 | **0** | Upstream released fixes 또는 complete primary App Server adapter로 exact gates 통과 |

Behavioral capability가 그대로인데 patch file만 squash한 경우 수치는 줄이지 않는다. Generated baseline adaptation도 behavioral patch로 재분류해 숨기지 않는다.

### 4.2 순서와 의존성

| 단계 | 작업 | 선행 조건 | 제거 gate | Rollback |
| --- | --- | --- | --- | --- |
| 0 | Stack을 9개로 freeze하고 `0010` 대신 context probe 결정 | 이 연구 승인 | Probe spec/test가 raw method를 Runtime 밖에 노출하지 않음 | 기존 9-patch immutable bundle 유지 |
| 1 | One-shot `config/read`·`skills/list` probe 구현 | Exact launch attestation과 transition lease 정의 | §2.5 acceptance 전체, exact native actual-child, leak/reap 반복 | Probe feature를 Ready gate에서 제거하고 old context guard로 복귀; patch stack은 변하지 않음 |
| 2 | `0009` 제거 | Narrow control-plane App Server login adapter | Login attempt isolation, hosted options, delayed completion, account notification reservation, close/reap 전체 | 이전 9-patch manifest와 bundle digest 복원. Conversation child의 `0004`는 유지 |
| 3 | `0008` 제거 | Workspace-local Skill materialization 완료 | `skills/extraRoots/set=0`, `skills/list` exact one enabled Skill, text/product Turn 모두 green | `0008`이 포함된 8-patch bundle 복원 |
| 4 | `0007` disposition spike 후 제거 시도 | Explicit model/reasoning policy 결정 | Model catalog 0/다수/failure, resume와 Plan Turn에서 effective-setting contract green | `0007`이 포함된 7-patch bundle 복원 |
| 5 | Full conversation adapter에서 `0004`와 `0006` 이전 | Primary adapter design 및 separate interaction spike | Notification partition과 18-test Plan matrix, 32/33 cap, 1,024/1,025 tracker, cancel/interrupt/EOF/half-close races | Complete `0004`·`0006` patch 복원 |
| 6 | `0001`·`0003`·`0005` upstream화 또는 primary adapter 이전 | Raw response/notification router를 AY-PLE가 소유할 준비 | Response-last, decode-before-release, malformed mutation unknown-outcome exact gates | 세 patch의 ordered group 복원 |
| 7 | `0002` 마지막 제거 | 모든 ingress가 primary adapter를 통과 | Item/byte/route/aggregate matrix와 complete-zero accounting | `0002` 포함 직전 immutable bundle 복원 |

`0002`를 마지막에 두는 이유는 다른 patch가 아니라 **전체 ingress memory bound**를 소유하기 때문이다. 먼저 제거하면 기능 test가 green이어도 stalled consumer나 burst에서 retained memory가 다시 unbounded가 된다.

### 4.3 각 제거 checkpoint의 공통 gate

1. 같은 pinned source와 native wheel에서 old patched bundle과 candidate bundle을 각각 reproducible하게 만든다.
2. `validate:exact-sdk`, complete official Python suite, Ruff와 deterministic source/wheel digest를 실행한다.
3. 해당 patch가 소유한 purpose-built failing oracle을 **unpatched/candidate 경계에서 먼저** 실행한다.
4. `@ay-ple/codex-chat-runtime` actual-child tests, production bundle validation과 Server product actual-child tests를 실행한다.
5. Success뿐 아니라 malformed response, timeout, EOF, cancellation, close와 process-group reap를 검사한다.
6. 한 checkpoint에는 한 behavioral ownership change만 넣는다. 실패하면 이전 immutable production manifest, wheel, bridge roster와 patch digest를 통째로 복원한다.
7. Old wheel source와 new adapter를 섞는 partial rollback은 금지한다.

## 5. Target owner boundary

| 책임 | Owner |
| --- | --- |
| `config/read`, `skills/list` raw method, strict decoder, exact pin schema fixture | `@ay-ple/codex-chat-runtime` package-private adapter |
| App Server process spawn, deadline, byte/item cap, process-group reap | `@ay-ple/codex-chat-runtime` |
| Effective config/Skill semantic policy와 Ready/action admission | Server setup boundary |
| Frozen `CodexNativeContextPort`와 product-facing error vocabulary | Runtime/Server public contract |
| Raw JSON-RPC envelope, native request id, generated protocol type | Runtime 내부에만 제한 |
| Browser payload, product UI | High-level context outcome만 소비; raw protocol 0 |
| SDK patch | Demonstrated upstream correctness defect의 temporary carrier만 허용 |

장기적으로 C안의 primary App Server adapter를 택하면 현재 Python bridge가 소유한 thread/turn/login/interaction 기능을 한 번에 옮기지 않는다. Context probe처럼 좁은 read-only slice부터 protocol boundary와 operational envelope를 검증하고, account, interaction, conversation 순으로 이동한다.

## 6. 금지선과 재검토 조건

### 금지선

- Supported public API가 아닌 import를 “public”이라고 부르지 않는다.
- Patch 제거를 line count, method presence 또는 `main` blob 변화만으로 승인하지 않는다.
- 해당 patch의 최초 failing oracle 없이 제거하지 않는다.
- Queue/item/byte cap, sticky terminal, unknown-outcome 또는 exact context guarantee를 조용히 낮추지 않는다.
- Raw App Server method string과 generated type을 Browser 또는 product contract에 전파하지 않는다.
- Upstream report/removal condition 없이 10번째 patch를 추가하지 않는다.

### 재검토 trigger

- Official Python SDK가 curated root와 API reference에 `config_read`·`skills_list`를 추가한 release
- `0001`, `0003`, `0005`에 대응하는 upstream release note 또는 merged fix
- App Server protocol에서 `ConfigReadResponse.config`의 experimental 표기가 바뀌는 release
- Product가 “같은 OS child”를 semantic requirement로 채택해 separate probe equivalence를 거부하는 결정
- Workspace-local Skill discovery 또는 explicit model/reasoning policy가 acceptance를 통과하지 못하는 경우

재검토 때도 moving `main`을 직접 production contract로 삼지 않는다. Exact release/tag/commit, blob 또는 semantic diff, official tests와 local actual-child gate를 함께 기록한다.

## 7. 결론

제안된 `0010`은 두 native read를 편하게 노출하지만, supported public SDK 부재를 local ordered patch 하나로 더 덮는 선택이다. 현재 stack의 가장 큰 문제는 patch 적용 기술이 아니라 **upstream correctness defect, SDK convenience gap, AY-PLE operational policy가 같은 fork layer에 계속 축적되는 소유권**이다.

즉시 가장 작은 안전한 조치는 patch 9개를 동결하고 official documented App Server stdio 위에 context-only one-shot probe를 두는 것이다. 이 seam은 raw protocol을 Runtime 내부에 가두면서 required native evidence를 만들고, `0010`을 피하며, 이후 primary adapter로 가는 실제 학습도 남긴다. 첫 감소 후보는 control-plane login adapter 뒤의 `0009`와 workspace-local Skill cutover 뒤의 `0008`이며, 그다음 `0007` disposition을 결정한다. Router correctness와 global bounds는 replacement evidence가 가장 강해질 때까지 유지하고 `0002`를 마지막에 제거한다.
