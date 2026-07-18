# Account/config adoption surface

이 문서는 Wayfinder ticket `003`의 bounded lookup 결과다. Account Readiness와 controlled
`HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`의 authority/lifecycle만 판정하며, capability 간
최종 disposition은 ticket `009`가 계속 소유한다.

## 결론

- Account 사실의 authority는 App Server `account/read`이고, browser login·cancel·logout은
  official Python SDK public seam을 그대로 쓸 수 있다. Startup `Account Readiness` gate와
  pending UI state는 얇게 adapt한다. 다만 login completion이 auth reload보다 먼저 오고
  high-level SDK가 `account/updated`를 노출하지 않아 post-login readiness convergence는
  confirmed public-seam residual이다.
- Current bridge의 `ready`는 SDK 초기화 완료일 뿐 account 준비 완료가 아니다. 현재 Browser는
  이 runtime readiness만으로 대화를 열기 때문에 account-aware gate가 필요하다.
- Controlled child environment와 ambient-secret 차단은 유지한다. 다만 `sqlite_home` config가
  `CODEX_SQLITE_HOME`보다 우선하고 auth store mode도 config가 정하므로, env path만으로
  persistence authority를 선언할 수 없다.
- Effective config의 read/write authority는 App Server에 이미 있고 first-party TUI도 이를 쓴다.
  Exact Python SDK에는 대응 public convenience method가 없으므로 required effective-read
  seam은 confirmed residual이다. Direct App Server adapter와 upstream extension 중 하나를
  이 ticket에서 선택하지 않으며 직접 `config.toml`을 새로 소유하지 않는다.
- OpenCode는 XDG root와 provider-keyed credential file을 직접 소유하는 반대 가정의
  comparator일 뿐 Codex auth/config authority나 donor가 아니다.

## Source와 provenance

| 조사 순서 | 고정 근거 | 용도 |
| --- | --- | --- |
| 1. Pinned App Server | `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4`, Apache-2.0 ([pin ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L3-L16)) | protocol, processor, primary tests, native root/config authority |
| 2. Official Python SDK | 위 commit의 immutable SDK snapshot과 generated output; production SDK wheel SHA-256 `0642fd61b9461399c9a9223aed61f6bb6b364d20c7f4a4add5608bae513cdd97`, native wheel SHA-256 `05db505a9c7f020f58b70837a94e00d32a50086986c267bcc44ea97b573d4a05` ([artifact ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L61-L74)) | public account/login/logout seam과 generated notification/type coverage |
| 3. First-party TUI | 같은 pinned checkout의 `codex-rs/tui` ([account bootstrap](../../../../references/openai-codex/codex-rs/tui/src/lib.rs#L1376-L1405), [config owner](../../../../references/openai-codex/codex-rs/tui/src/config_update.rs#L1-L5)) | first-party consumption pattern |
| 4. OpenCode comparator | `anomalyco/opencode@d0ba5389248e05546849b9f69b7bc417aa5fd5d7`, package `v1.17.18` ([package](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/package.json#L1-L7)), [MIT license](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/LICENSE#L1-L21) | root/config/credential assumption 차이만 비교 |
| 5. Current bridge | repository current source와 controlled-environment primary test ([bridge config](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L89-L118), [environment test](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L89-L168)) | keep/replace/delete 후보 판정 |

실사용자 credential, 실제 `~/.codex`, 실제 OAuth login은 읽거나 실행하지 않았다. Native 근거는
upstream의 `TempDir` 기반 primary tests와 source signature만 사용했다.

## Ordered findings

### 1. Pinned App Server

- `account/login/start`, `account/login/cancel`, `account/logout`, `account/read`는 모두
  `account-auth` global serialization을 갖는 typed protocol이다
  ([method registry](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L1001-L1018),
  [account/read](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L1149-L1153)).
- `account/read`는 `account: Option<Account>`와 `requires_openai_auth`를 반환한다. Browser start는
  `login_id`와 `auth_url`, cancel은 `canceled | notFound`, completion은 같은 `login_id`와
  `success/error`를 반환한다
  ([types](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/account.rs#L120-L174),
  [read/notification](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/account.rs#L479-L495)).
- Browser login의 active attempt는 processor memory에 있고 10분 timeout
  ([bound](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L8-L10)) 뒤
  `success: false`, `error: "Login timed out"` completion으로 끝난다. 성공일 때만 auth reload와
  `account/updated`를 보낸다
  ([processor](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L421-L501),
  [success path](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L708-L752)).
- `account/login/completed`는 auth manager reload와 `account/updated`보다 먼저 전송된다.
  그러므로 `success: true` completion 하나만으로 Account Readiness를 확정할 수 없다
  ([ordering](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L717-L752)).
- Empty store read, cancel notification, logout 후 store 삭제와 account `None`, persisted ChatGPT
  auth를 가진 새 App Server의 account read가 각각 controlled `TempDir` test로 고정돼 있다
  ([empty](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1737-L1770),
  [cancel](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1383-L1450),
  [logout](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L197-L258),
  [cold read](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1955-L2001)).

### 2. Official Python SDK public seam

- `Codex`와 `AsyncCodex`는 public `login_chatgpt()`, `account()`, `logout()`을 제공한다
  ([sync](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L115-L129),
  [async](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L353-L371)).
- Browser login handle은 `login_id`, `auth_url`, `wait()`, `cancel()`을 소유하고, wait는 matching
  `account/login/completed`만 correlation한다
  ([handle](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py#L101-L152),
  [route](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L703-L719)).
- Generated registry/type에는 `account/login/completed`, `account/updated`, cancel status,
  `GetAccountResponse`가 이미 포함된다
  ([registry](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/notification_registry.py#L77-L80),
  [completion type](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L36-L43),
  [updated type](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L5085-L5092),
  [cancel status](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L345-L350),
  [account response](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L6296-L6302)).
- Lower-level `CodexClient.next_notification()`은 global notification을 읽을 수 있지만 public
  package export와 high-level `Codex`/`AsyncCodex`에는 이 accessor가 없다
  ([lower-level accessor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L342-L363),
  [public exports](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/__init__.py#L15-L93)).
- Exact high-level `Codex`/`AsyncCodex` surface에는 config convenience method가 없지만 App Server에는
  typed `config/read`, `config/value/write`, `config/batchWrite`가 있다
  ([high-level classes](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L77-L540),
  [config methods](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L1110-L1140)).

### 3. First-party TUI behavior

- TUI는 auth가 필요한 provider에서 startup `account/read(refresh_token: false)` 결과를
  `Authenticated | NotAuthenticated`로 adapt하고, unauthenticated일 때만 onboarding을 연다
  ([read](../../../../references/openai-codex/codex-rs/tui/src/app_server_session.rs#L385-L400),
  [gate](../../../../references/openai-codex/codex-rs/tui/src/lib.rs#L1860-L1884)).
- TUI의 pending state는 `login_id/auth_url`을 보관하고 matching completion만 소비한다. 실패는
  protocol의 `error`를 보여 주고, browser 자동 열기는 in-process App Server에서만 한다
  ([start](../../../../references/openai-codex/codex-rs/tui/src/onboarding/auth.rs#L859-L905),
  [completion](../../../../references/openai-codex/codex-rs/tui/src/onboarding/auth.rs#L917-L945),
  [browser boundary](../../../../references/openai-codex/codex-rs/tui/src/onboarding/auth.rs#L1008-L1015)).
- Config mutation은 직접 file write가 아니라 App Server `config/batchWrite`를 쓰며 기본 user
  config와 hot reload를 요청한다
  ([write/read](../../../../references/openai-codex/codex-rs/tui/src/config_update.rs#L147-L188)).

### 4. OpenCode assumption comparator

- OpenCode는 XDG data/cache/config/state roots를 직접 계산하고 module load 때 directory를 만든다
  ([global roots](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/core/src/global.ts#L10-L43)).
- Credential은 OpenCode data root의 `auth.json`에 provider key별 schema와 `0o600` mode로
  저장하며, `OPENCODE_AUTH_CONTENT`가 file보다 우선한다
  ([auth store](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/auth/index.ts#L10-L88)).
- Config는 global/project/home `.opencode`와 explicit environment/content를 자체 merge한다
  ([path candidates](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/config/paths.ts#L23-L40),
  [merge order](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/config/config.ts#L398-L475)).

따라서 OpenCode의 적용 가능한 교훈은 “root·credential·config precedence를 명시적으로
검증한다”뿐이다. Provider-keyed store, multi-provider schema, XDG ownership은 Codex-owned
App Server authority와 충돌하므로 port하지 않는다.

### 5. Current bridge와 Browser

- Server와 runtime은 네 controlled directory를 모두 pre-existing, writable, non-symlink,
  pairwise-distinct absolute directory로 검증하고 exact allowlist child env만 만든다
  ([server validation](../../../../apps/server/src/codex-chat-config.ts#L109-L204),
  [runtime allowlist](../../../../packages/codex-chat-runtime/src/runtime.ts#L1165-L1238)).
- SDK 자체는 `os.environ.copy()` 뒤 caller env를 merge한다. Current Node sanitization을 제거하면
  ambient authority가 다시 들어온다
  ([SDK spawn](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L238-L269)).
- Bridge는 known notifications 중 네 chat notification만 남기므로
  `account/login/completed`와 `account/updated`를 wire에서 opt out하고, private protocol도 chat
  5-command만 가진다
  ([opt-out](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L102-L118),
  [commands](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py#L26-L67)).
- Current status의 `ready`는 runtime object 존재를 뜻하고 Browser는 `configured | ready`만으로
  conversation을 허용한다
  ([service](../../../../apps/server/src/codex-chat-service.ts#L75-L89),
  [Browser gate](../../../../apps/chat-shell/src/use-chat-shell.ts#L83-L91),
  [Browser E2E](../../../../apps/chat-shell/e2e/chat-shell.spec.ts#L9-L29)).

## Account Readiness lifecycle matrix

| 순간 | Native/SDK authority와 검증 | Current 상태 | 판정 |
| --- | --- | --- | --- |
| Account 조회 | `account/read`가 `account`와 `requires_openai_auth`를 반환; empty controlled store는 `account: None` ([type/test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1737-L1770)) | command/API 없음 | Read 자체 `direct reuse`; product gate `adapt` |
| Login 시작 | SDK `login_chatgpt()`가 live handle의 `login_id/auth_url`을 반환 ([public handle](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py#L101-L115)) | command/API 없음 | `direct reuse` |
| Pending | Active attempt는 App Server process memory, client는 `login_id`를 보관 ([processor](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L19-L64)) | state/notification 모두 없음 | SDK wait `direct reuse`; app pending state `adapt` |
| Completed | matching completion을 먼저 보내고 성공일 때 auth reload와 `account/updated`가 뒤따름 ([completion](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L708-L752)) | 두 notification 모두 억제 | Login terminal은 `direct reuse`; readiness convergence는 `confirmed residual` |
| Cancelled | cancel은 `canceled | notFound`; primary test는 failure completion과 no account update를 고정 ([cancel test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1383-L1450)) | command/API 없음 | SDK handle cancel `direct reuse`; UI state `adapt` |
| Expired | 10분 뒤 generic `success:false/error` completion; typed `expired` variant는 없음 ([bound](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L8-L10), [timeout](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L465-L487)) | 표현 없음 | Generic timeout failure terminal은 `direct reuse`; 별도 expiry state/lifecycle은 `unproven`이며 채택하지 않음 |
| Logout | SDK public logout; native는 active login cancel, credential 제거, account update ([SDK](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L368-L371), [test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L197-L258)) | command/API 없음 | `direct reuse`, 이후 read/gate `adapt` |
| Process restart: persisted auth | Default File store와 prewritten auth를 읽은 새 App Server의 account read가 검증됨 ([store mode](../../../../references/openai-codex/codex-rs/config/src/types.rs#L87-L100), [cold read](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1955-L2001)) | startup account/read 없음 | Startup read `adapt`; persistence는 effective store mode에 조건부 |
| Process restart: pending login | Active attempt/handle persistence 또는 rejoin protocol의 primary evidence 없음; processor owner는 process-memory `ActiveLogin` ([owner](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L19-L64)) | recovery 없음 | Restart re-read는 `adapt`; same-attempt rejoin은 `unproven`이며 required residual로 승인하지 않음 |

Startup `Account Readiness`는 새 engine state가 아니라 `runtime ready`와 `account/read`의 결과를
product가 조합하는 adaptation이다. `requires_openai_auth == false`인 provider까지 강제로
login시키지 않고, auth가 필요할 때 `account != None`인지 확인하는 first-party pattern을 따른다.
반면 login 직후 convergence는 completion 뒤 `account/updated`를 볼 high-level SDK seam이 없으므로
같은 adaptation으로 숨기지 않는다.

## Controlled root authority와 lifecycle

Current runtime은 검증된 세 root를 각각 같은 이름의 exact allowlist child env로 전달한다
([child environment](../../../../packages/codex-chat-runtime/src/runtime.ts#L1203-L1238)). 아래 표는
그 전달 이후 native precedence와 저장·restart lifecycle을 root별로 비교한다.

| Root | Native authority·precedence | 생성·저장·restart | Current bridge와 delta |
| --- | --- | --- | --- |
| `HOME` | `CODEX_HOME`이 없을 때만 OS home의 `~/.codex` fallback에 관여 ([resolver](../../../../references/openai-codex/codex-rs/utils/home-dir/src/lib.rs#L5-L18)) | Codex credential/config의 직접 authority가 아님; same external root를 다시 주는 lifecycle은 app-owned | Controlled `HOME`을 exact child env로 주는 ambient 차단은 `keep` ([test](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L89-L168)) |
| `CODEX_HOME` | Non-empty env가 fallback보다 우선하며, env path는 이미 존재하는 directory여야 하고 canonicalize됨 ([resolver/tests](../../../../references/openai-codex/codex-rs/utils/home-dir/src/lib.rs#L20-L63)) | User `config.toml`; default `File` auth는 `auth.json`. Store는 `File | Keyring | Auto | Ephemeral` config에 따라 restart lifecycle이 달라짐 ([modes](../../../../references/openai-codex/codex-rs/config/src/types.rs#L87-L100), [backend select](../../../../references/openai-codex/codex-rs/login/src/auth/storage.rs#L498-L524)) | Pre-existence/canonical safety는 `keep`; effective store-mode assertion은 `adapt` |
| `CODEX_SQLITE_HOME` | `config.toml sqlite_home` → `CODEX_SQLITE_HOME` → `CODEX_HOME`; relative env는 resolved cwd 기준 ([precedence](../../../../references/openai-codex/codex-rs/core/src/config/mod.rs#L275-L287), [resolution](../../../../references/openai-codex/codex-rs/core/src/config/mod.rs#L3669-L3674)) | Effective directory는 StateRuntime이 `create_dir_all` 후 DB들을 연다 ([runtime](../../../../references/openai-codex/codex-rs/state/src/runtime.rs#L167-L205)); 같은 effective root면 restart 지속 | Existing env validation은 `keep`; config override까지 포함한 effective assertion은 `adapt` |

Config layer는 system/enterprise/user/project/session/legacy managed precedence를 App Server가 계산하고,
`config/read`가 effective config·origin·optional layers를 반환한다
([layers](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/config.rs#L28-L118),
[read response](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/config.rs#L350-L369)).
따라서 directory creation owner와 effective `sqlite_home`/auth store mode를 확인하는 startup contract가
필요하지만, 이 ticket은 store mode를 선택하지 않는다.

## Current bridge candidate ledger

| 책임 | 후보 | 근거 |
| --- | --- | --- |
| Ambient env 제거와 exact controlled child allowlist | `keep` | SDK는 ambient env를 복사하므로 current boundary가 실제 authority 차단을 제공 ([SDK/current](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L254-L267), [current](../../../../packages/codex-chat-runtime/src/runtime.ts#L1203-L1238)) |
| Existing `configured/starting/ready/failed` | `keep` as Runtime Readiness | Contract가 runtime lifecycle만 표현함 ([contract](../../../../packages/codex-chat-runtime/src/contract.ts#L95-L111)) |
| Runtime readiness를 Browser의 유일한 대화 gate로 사용 | `replace` | Browser gate에 account fact가 없음 ([gate](../../../../apps/chat-shell/src/use-chat-shell.ts#L83-L91)) |
| Account notifications까지 포함한 blanket opt-out | `adapt` | Existing bounded notification policy는 유지하되 required account notifications를 허용해야 함 ([generated registry](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/notification_registry.py#L77-L80), [bridge opt-out](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L102-L118)) |
| Chat-only five-command private protocol의 account command 부재 | `adapt` | Existing chat commands는 유지하되 account command가 구조적으로 없는 부분을 official SDK seam으로 보완해야 함 ([protocol](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py#L26-L67)) |
| `CODEX_CHAT_SQLITE_HOME` env validation만으로 effective SQLite authority를 판정 | `adapt` | Existing path validation은 유지하되 native config value가 env보다 우선하므로 effective config assertion이 필요 ([precedence](../../../../references/openai-codex/codex-rs/core/src/config/mod.rs#L3669-L3674)) |

003 범위에서는 adopted owner가 같은 required outcome을 완전히 대체해 통째로 제거할 수 있는
current custom unit을 확인하지 못했다. 따라서 evidence-backed `delete` 후보는 없고, 009가 다른
capability와 함께 최종 disposition을 정한다.

## Required surface disposition

| Required surface | 판정 | 좁은 경계 |
| --- | --- | --- |
| Account read, browser login start/wait/cancel, logout | `direct reuse` | Official `AsyncCodex`와 login handle public API만 사용 ([API](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L353-L371)) |
| Startup Account Readiness, pending/error Browser projection과 logout 이후 re-read | `adapt` | Native account/login ID를 보존한 product state와 gate만 추가; raw protocol shape를 product contract로 노출하지 않음 ([startup read](../../../../references/openai-codex/codex-rs/tui/src/app_server_session.rs#L385-L400), [logout](../../../../references/openai-codex/codex-rs/tui/src/app_server_session.rs#L992-L1004)) |
| Matching login ID, completion과 account update의 분리 | `narrow port` | First-party TUI의 작은 reducer behavior만 옮기고 TUI UI·architecture는 port하지 않음 ([TUI precedent](../../../../references/openai-codex/codex-rs/tui/src/onboarding/auth.rs#L917-L962)) |
| Post-login `account/updated` convergence와 effective config read | `confirmed residual` | Native method/notification은 있지만 high-level SDK public seam이 없다. Direct App Server adapter와 upstream extension 중 선택은 후속 판단에 남김 ([native methods](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L1110-L1140), [high-level classes](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L77-L540), [public exports](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/__init__.py#L15-L93)) |
| Login timeout failure terminal | `direct reuse` | Native generic failed completion을 보존한다. 별도 typed expiry state는 `unproven`이므로 required surface로 만들지 않음 ([notification type](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/account.rs#L664-L670)) |
| Pending login의 process-restart reconciliation | `adapt` | Restart 뒤 process-local handle을 폐기하고 `account/read`로 재판정한다. Same-attempt rejoin은 `unproven`이며 required residual로 승인하지 않음 ([process owner](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/account_processor.rs#L19-L64), [cold read](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/account.rs#L1955-L2001)) |
| Effective root/store-mode startup assertion | `confirmed residual` | Current env validation만으로 config override와 keyring/ephemeral lifecycle을 증명하지 못함 ([config/store](../../../../references/openai-codex/codex-rs/core/src/config/mod.rs#L3828-L3833)) |

## Exclusions

- In-app OAuth는 App Server lifecycle만 확인했다. URL을 누가·어떻게 여는지, 화면·callback UX는
  결정하지 않는다.
- Device-code, API key, Amazon Bedrock, external token auth, multi-provider abstraction은
  `out-of-scope`다. Protocol/type에 존재한다는 사실을 채택 결정으로 해석하지 않는다.
- `File | Keyring | Auto | Ephemeral` 중 production credential store mode를 선택하지 않는다.
- Missing public seam을 direct App Server adapter로 채울지 upstream SDK extension으로 채울지
  선택하지 않는다.
- Production API/schema/type/code 변경, live login probe, real user root migration은 수행하지 않는다.
- 이 문서의 `keep | replace | delete`와 disposition은 ticket-local evidence다. Cross-capability
  최종 선택과 implementation order는 ticket `009`가 소유한다.
