# Skill catalog admission seam 조사

## 결론

- Exact `0.144.4` App Server는 `skills/list`와 loaded path·enabled state를 authoritative하게 소유하지만, package-owned official Python SDK의 high-level `Codex`·`AsyncCodex`에는 이를 읽는 public method가 없다. `SkillInput`을 public하게 전달할 수 있다는 사실과 native catalog를 public하게 읽을 수 있다는 사실은 다르다.
- Internal `CodexClient.request`·`AsyncCodexClient.request`와 generated `SkillsListParams`·`SkillsListResponse`를 조합하면 exact wire call은 가능하다. 그러나 package root와 public `types`가 이 client·type을 의도적으로 export하지 않으며 public API test가 internal client의 비노출을 고정한다. 따라서 이는 current high-level **direct reuse**가 아니다.
- Exact first-party TUI는 startup에 `skills/list(cwds=[cwd], forceReload=true)`를 호출하고, response의 `enabled` Skill만 mention catalog에 넣은 뒤 선택한 exact path를 structured `UserInput::Skill`로 제출한다. 새 catalog semantics를 발명할 이유가 없으며 이 behavior가 conformance donor다.
- 2026-07-19에 확인한 latest official Python SDK release `python-v0.144.4`와 official `main` snapshot에도 high-level `skills_list`는 없다. 둘 다 current gap을 지우는 newer Python SDK upgrade candidate가 아니다.
- 009가 loaded·enabled preflight를 유지한다면 durable target은 **upstream-compatible public extension**, current exact pin에서 즉시 진행해야 할 때의 bounded fallback은 그 shape를 그대로 따르는 **exact-pin narrow port**다. App-managed file·digest receipt만으로 requirement를 낮추는 선택은 native discovery·disablement·cache drift에 대한 fail-fast를 잃으므로 권고하지 않는다.

## 조사 범위와 source provenance

이 조사는 broad App Server inventory나 runtime 재평가가 아니다. `SkillInput` turn 전에 canonical `SKILL.md`가 native catalog에 loaded·enabled인지 확인하는 한 seam만 비교했다.

| Oracle | Exact provenance | 이 조사에서의 역할 |
| --- | --- | --- |
| Current primary pin | `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4`; package-owned SDK distribution `0.0.0.dev0`, native contract `openai-codex-cli-bin==0.144.4` ([provenance ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L5-L16)) | 현재 제품 경로가 실제로 소비하는 native·SDK authority |
| Package-owned SDK | Exact source export와 generated output을 담은 immutable unpatched snapshot. Production wheel의 ordered patch `0001`–`0005`는 catalog method를 추가하지 않는다. ([tracked provenance](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L18-L45)) | Current public surface와 internal/generated boundary 판정 |
| Latest Python SDK release | Official tag [`python-v0.144.4`](https://github.com/openai/codex/tree/5354e4951a8d10567ab2e43f8e483331f9ffe49e), commit `5354e4951a8d10567ab2e43f8e483331f9ffe49e` | Latest released official Python surface에 public catalog seam이 생겼는지 확인 |
| Current official source | 2026-07-19에 관찰한 official `main` HEAD [`0fb559f0f6e231a88ac02ea002d3ecd248e2b515`](https://github.com/openai/codex/tree/0fb559f0f6e231a88ac02ea002d3ecd248e2b515) | Stable tag 이후 public seam 변화 확인. Current pin 사실을 덮어쓰지 않는 point-in-time comparator |
| First-party client | 같은 primary checkout의 TUI App Server session·composer | `skills/list`와 explicit Skill selection의 실제 소비 pattern |

## Exact `0.144.4` Python SDK boundary

### High-level public surface

Package root는 `Codex`, `AsyncCodex`, `SkillInput` 등을 curated export하지만 `CodexClient`, `AsyncCodexClient`, generated request·response model은 export하지 않는다. Public API test도 두 internal client와 raw protocol type이 root에 없어야 한다고 명시한다. ([root exports](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/__init__.py#L15-L93), [public API negative assertion](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_public_api_signatures.py#L247-L269))

`AsyncCodex`는 account, thread start/list/read/resume/fork/archive와 model list를 high-level method로 감싸지만 `skills_list`를 제공하지 않는다. 그 내부 `_client`는 `AsyncCodexClient`이며 public support contract가 아니다. ([AsyncCodex lifecycle](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L289-L371), [generated high-level methods](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L373-L530))

Public `openai_codex.types`도 curated protocol type만 export하고 `SkillsListParams`·`SkillsListResponse`를 내보내지 않는다. ([public types](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/types.py#L1-L81))

### Internal capability

| Internal seam | Source fact | Support 판정 |
| --- | --- | --- |
| `CodexClient.request` | Method string, JSON params와 Pydantic response model을 받아 typed JSON-RPC request를 수행한다. ([sync request](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L311-L340)) | Wire call에 충분하지만 internal client method다. |
| `AsyncCodexClient.request` | Sync generic request를 worker thread에서 async하게 감싼다. ([async request](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/async_client.py#L124-L137)) | Wire call에 충분하지만 root에서 의도적으로 비노출된 internal client다. |
| Generated `SkillsListParams` | `cwds`와 alias `forceReload`를 가진 Pydantic request model이 생성돼 있다. ([params](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L3900-L3914)) | Exact schema evidence지만 public type export가 아니다. |
| Generated response | Entry는 `cwd`, `errors`, `skills`; Skill metadata는 `name`, absolute `path`, `scope`, `enabled` 등을 가진다. ([metadata and response](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L7033-L7066)) | Exact response validation에 충분하지만 public type export가 아니다. |

따라서 `codex._client.request("skills/list", ...)` 또는 `openai_codex.async_client`·`openai_codex.generated` 직접 import는 **behaviorally possible**하지만 **official high-level direct reuse**가 아니다. Private object reach-through와 generated module path를 AY-PLE product contract로 고정하게 된다.

## Native App Server authority

### Catalog contract와 processor

App Server protocol은 `skills/list`를 typed `SkillsListParams → SkillsListResponse` request로 선언한다. Params는 비어 있으면 session cwd를 사용하고, `forceReload`가 true이면 disk cache를 우회한다. Response는 요청 cwd별 loaded Skill과 load error를 반환한다. ([request registration](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L663-L667), [params and response](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L18-L36), [entry shape](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L481-L496))

Processor는 current config를 다시 읽고, cwd별 config layer와 effective Skill roots를 계산하고, `force_reload`를 그대로 Skill service snapshot에 전달한다. Response의 `path`는 loaded `SKILL.md` absolute path이고 `enabled`는 해당 path가 effective disabled set에 없는지에서 계산된다. Cwd resolution 실패와 Skill parsing failure는 response `errors`로 남는다. ([enabled mapping](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/catalog_processor.rs#L18-L61), [cwd/config/snapshot processing](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/catalog_processor.rs#L488-L573), [protocol metadata](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/plugin.rs#L413-L432))

Primary tests는 다음 behavior를 직접 고정한다.

| Behavior | Primary evidence |
| --- | --- |
| Returned Skill의 path와 `enabled=true` | Installed Skill의 returned path가 canonicalize했을 때 기대 경로와 같고 enabled state가 true인지 확인한다. ([path·enabled assertion](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/skills_list.rs#L406-L445)) |
| 여러 cwd의 response ordering | Concurrent load 뒤에도 requested cwd order를 보존한다. ([order test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/skills_list.rs#L601-L639)) |
| Cache와 `forceReload` | Cache seed 뒤 새 Skill은 normal list에 보이지 않고 `forceReload=true`에서만 나타난다. ([force reload test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/skills_list.rs#L642-L721)) |
| File change invalidation | Watched Skill 변경 뒤 `skills/changed`가 오고 다시 list한 metadata가 갱신된다. ([change notification test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/skills_list.rs#L876-L993)) |

### `SkillInput`은 admission failure를 보고하지 않는다

Official SDK의 public `SkillInput`은 `name`과 `path`만 wire의 structured `type: "skill"` item으로 만든다. ([input type and wire conversion](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_inputs.py#L29-L60)) Valid path가 loaded catalog에 있으면 exact SDK integration test에서 Skill body가 한 번 model input에 주입된다. ([valid injection test](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_app_server_inputs.py#L81-L126))

반대로 native resolver는 structured Skill path가 invalid, missing 또는 disabled이면 선택 목록에서 그냥 건너뛴다. 같은 name의 plain text mention이 있어도 structured path가 invalid·disabled이면 fallback을 막는다. ([resolver](../../../../references/openai-codex/codex-rs/core-skills/src/injection.rs#L138-L205), [missing-path negative test](../../../../references/openai-codex/codex-rs/core-skills/src/injection_tests.rs#L172-L191), [disabled-path negative test](../../../../references/openai-codex/codex-rs/core-skills/src/injection_tests.rs#L193-L213))

즉 `SkillInput`을 전달했다는 receipt만으로 Recipe body가 실제 injected됐다고 판정할 수 없다. Resolver 자체가 missing·disabled selection을 admission error로 반환하지 않으므로, native turn 전에 catalog membership을 확인하지 않으면 product layer는 Recipe 적용 여부를 제출 receipt만으로 구분하지 못한다.

## First-party consumption pattern

Pinned TUI는 startup frame을 막지 않는 background task에서 current cwd로 `skills/list`를 호출하고 `forceReload=true`를 사용한다. ([startup refresh](../../../../references/openai-codex/codex-rs/tui/src/app/background_requests.rs#L190-L206), [typed request](../../../../references/openai-codex/codex-rs/tui/src/app/background_requests.rs#L828-L845))

Response를 받은 Chat widget은 cwd entry 전체를 보존하되 `enabled=true` Skill만 mention catalog에 공급한다. ([response projection](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/skills.rs#L154-L207)) Composer submission은 mention binding의 exact Skill path를 loaded catalog에서 다시 찾아 `UserInput::Skill { name, path }`를 만든다. Duplicate name이 있어도 selected path를 보존하는 primary TUI test가 있다. ([structured selection](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/input_submission.rs#L185-L230), [duplicate-name path test](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/tests/composer_submission.rs#L511-L593))

Adoption할 first-party sequence는 다음처럼 좁다.

`explicit cwd + forceReload → returned exact path + enabled state → selected path binding → structured SkillInput`

AY-PLE는 이 semantics를 다시 정의할 필요가 없다. 차이는 TUI의 Rust App Server client에는 typed `SkillsList` request가 있지만, adopted high-level Python SDK에는 같은 public method가 없다는 한 seam뿐이다.

## Latest official Python SDK 비교

Official Python SDK stable comparator는 Rust release가 아니라 `python-v0.144.4` tag다. Source `pyproject.toml`은 release workflow용 `0.0.0-dev` placeholder를 유지하지만 tag와 native dependency가 Python SDK `0.144.4` release boundary를 고정한다. Official `main`의 relevant SDK files는 이 release snapshot과 같으며, current pin보다 높은 public Python catalog surface는 확인되지 않았다.

| Official snapshot | Python SDK fact | Catalog 판정 |
| --- | --- | --- |
| Python release `python-v0.144.4`, commit `5354e4951a8d10567ab2e43f8e483331f9ffe49e` | Source project placeholder는 `0.0.0-dev`, native dependency는 `openai-codex-cli-bin==0.144.4`다. ([release pyproject](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/pyproject.toml#L5-L25)) Public API reference는 account, thread와 model method만 열거하며 catalog read가 없다. ([release API reference](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/docs/api-reference.md#L53-L115)) Root export·public types에도 `SkillsList*`가 없고 internal clients는 non-root다. ([release root](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/src/openai_codex/__init__.py#L15-L93), [release public types](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/src/openai_codex/types.py#L1-L81), [release public negative test](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/tests/test_public_api_signatures.py#L244-L266)) | Same `0.144.4` public release surface이므로 current gap을 없애는 `verified upgrade candidate`가 아니다. |
| Official `main` snapshot `0fb559f0f6e231a88ac02ea002d3ecd248e2b515` | Project version은 계속 `0.0.0-dev`이고 binary dependency는 `0.144.4`다. ([main pyproject](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/pyproject.toml#L5-L25)) Root export·public type·`AsyncCodex`에도 catalog read가 없으며 public test는 internal clients 비노출을 유지한다. ([main root](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/__init__.py#L15-L93), [main public types](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/types.py#L1-L81), [main async API](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/api.py#L287-L530), [main public negative test](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/tests/test_public_api_signatures.py#L244-L266)) | Latest source에도 high-level gap이 남아 있다. Main branch 자체를 production pin이나 verified upgrade로 채택하지 않는다. |

두 snapshot 모두 internal generic request와 generated `SkillsList*` model은 갖지만 public high-level support contract는 아니다. ([release internal request](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/src/openai_codex/async_client.py#L124-L137), [release generated types](https://github.com/openai/codex/blob/5354e4951a8d10567ab2e43f8e483331f9ffe49e/sdk/python/src/openai_codex/generated/v2_all.py#L3906-L3920), [main generated response](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/generated/v2_all.py#L7047-L7080)) Latest source를 가져오는 것만으로 current residual이 사라진다는 evidence는 없다.

## Assumption delta와 disposition

### Product receipt가 native catalog를 대체하지 못하는 이유

App-managed Recipe path·version·digest와 config receipt는 “AY-PLE가 어떤 bytes를 어디에 배치하려 했는가”를 증명한다. 그러나 다음 native fact는 증명하지 못한다.

| Native fact | Receipt-only에서 남는 blind spot |
| --- | --- |
| Discovery | Effective cwd·config layer·Skill root에서 App Server가 그 path를 실제 loaded했는지 알 수 없다. |
| Enablement | User/session/config rule이 exact path를 disabled로 만들었는지 알 수 없다. |
| Parse/load health | `SKILL.md` parsing error가 response `errors`에 들어갔는지 알 수 없다. |
| Cache freshness | File 배치 이후 stale catalog snapshot을 사용 중인지 알 수 없다. |
| Invocation binding | Receipt의 canonical path가 native resolver가 선택할 exact path와 같은지 알 수 없다. |

Final schema·source·quote validation은 결과가 제품 규칙에 맞는지는 확인하지만 Recipe body가 실제 injected됐다는 증거는 아니다. 우연히 schema-valid한 결과도 만들 수 있으므로 catalog admission의 대체 oracle이 되지 못한다.

### 후보 판정

| Candidate | 판정 | Evidence에 맞는 사용 범위 |
| --- | --- | --- |
| `direct reuse` | `unavailable` | Current high-level `AsyncCodex`와 public types에 method·response type이 없다. Internal reach-through를 direct reuse라고 부르지 않는다. |
| `verified upgrade candidate` | `none found` | Latest Python release `python-v0.144.4`와 current `main` 모두 public gap을 닫지 않는다. |
| `upstream extension` | `recommended durable target` | Native protocol, generated model과 first-party usage가 이미 있으므로 high-level sync/async `skills_list`와 curated response type export만 추가하면 된다. 새 catalog semantics나 new protocol을 만들 필요가 없다. Upstream release·pin 뒤에는 full existing conformance를 다시 통과해야 한다. |
| `narrow port` | `viable immediate fallback` | 009가 fail-fast를 유지하고 upstream release를 기다릴 수 없을 때 exact `skills/list` 한 method만 current pin에 투영한다. Request/response는 native names·types를 보존하고, generic App Server gateway나 broad raw-method inventory로 확장하지 않는다. |
| `requirement relaxation` | `not recommended` | Receipt-only로 낮추면 missing·disabled·load error·stale cache를 native start 전에 차단한다는 guarantee를 포기한다. 이 손실을 사용자가 명시적으로 승인할 때만 가능하다. |

### 009가 승인할 precise assumption

022가 권고하는 disposition은 **upstream-compatible exact-pin narrow port를 first-vertical의 bounded residual로 허용하고, official high-level extension이 release·conformance되면 삭제하는 것**이다. Final tradeoff 승인은 009가 소유한다.

Port가 필요한 경우 acceptance boundary는 다음으로 제한한다.

1. Adopted `AsyncCodex` lifecycle 안에서 exact current cwd와 `forceReload=true`로 native `skills/list`를 한 번 호출한다.
2. Target Recipe의 canonical `SKILL.md` path가 해당 cwd entry에 존재하고 `enabled=true`인지 확인한다. Missing entry, target-related load error, disabled 또는 path mismatch이면 `thread/start`·`turn/start` 전에 product admission failure로 끝낸다.
3. 통과한 exact name·path만 public `SkillInput`에 전달한다. Recipe version·digest·arguments·selected source receipt는 별도 product evidence로 유지하되 native membership을 대체하지 않는다.
4. Port는 generic `request(method, params)`를 product-facing surface로 노출하지 않는다. Exact params/response validation과 one-method conformance test를 소유한다.
5. Canonical Skill/config를 preflight와 native start 사이에 바꾸지 않는 app-managed lifecycle assumption을 명시한다. Persistent hot-reload가 product need가 되면 `skills/changed` invalidation을 별도로 admission한다.
6. Official high-level method가 release되면 같은 native trace와 existing runtime conformance를 통과시킨 뒤 port를 제거한다. Main snapshot 또는 method 존재만으로 automatic upgrade하지 않는다.

`upstream extension`은 이 same shape를 official SDK의 `Codex`·`AsyncCodex`와 public `types`에 올리는 retirement path다. Upstream review·release가 first vertical 일정과 맞지 않을 때만 exact-pin narrow port가 먼저 사용된다.

## Prototype 필요성

별도 wire prototype은 필요하지 않다.

- Native protocol·processor와 cache/forceReload/path behavior는 primary App Server tests로 고정돼 있다.
- Missing·disabled structured Skill의 silent skip은 resolver source와 negative unit test가 일치한다.
- Internal Python generic request와 generated request/response type이 exact wire call을 표현할 수 있다.
- First-party TUI가 같은 typed request와 enabled-path selection sequence를 실제로 소비한다.
- Python release·main public surface 부재도 source와 public API test가 일치한다.

이 판정은 future implementation test를 생략한다는 뜻이 아니다. Narrow port를 선택하면 exact cwd·`forceReload`, enabled path, malformed response, missing·disabled target과 native-start-0을 검증하는 focused conformance test가 필요하다. 022에서는 prototype, production patch, runtime test와 build를 실행하지 않았다.
