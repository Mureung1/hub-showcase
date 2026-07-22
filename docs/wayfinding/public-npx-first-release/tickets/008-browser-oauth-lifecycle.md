# 008 — Browser-launched Codex OAuth lifecycle을 설계한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [npx production composition을 고른다](006-npx-production-composition.md)

## Question

[Ticket 006](006-npx-production-composition.md)의 workspace 없이 시작 가능한 dynamic single-origin host, verified-but-not-yet-started Runtime, at-most-one active Runtime supervisor와 app-managed state root를 고정 입력으로 둔다. Official SDK의 ChatGPT browser login start, matching completion wait, cancel·logout과 Account Readiness가 제공하는 실제 상태·failure를 그 한 Runtime·Server·Browser-safe product contract로 어떻게 노출해야 하는가? OAuth 전 Runtime을 lazy start할 non-workspace cwd를 app data 아래 어떻게 격리하고, 이후 admitted `SemesterWorkspace`로 전환할 때 기존 Runtime을 언제 bounded close·recreate해야 하는가? npx가 연 local app이 OAuth credential bytes를 AY-PLE product origin·API·Browser bundle state·storage, workspace와 public log에 노출하지 않으면서 fresh login, expiry, cancel, CLI interrupt, logout, relaunch와 재인증 뒤 같은 app-managed account lifecycle로 수렴하려면 무엇이 durable하고 무엇이 transient해야 하는가? 첫 preview는 별도 AY-PLE-owned OAuth web server·port, API key·access token·device-code login과 전역 `~/.codex` credential import를 제공하지 않는다. Active login attempt에서는 matching completion success와 그 뒤의 fresh `account/read` 없이는 그 attempt의 인증 성공을 합성하지 않고, launch·relaunch에서는 fresh account read가 durable managed session의 유일한 authority다.

## Answer

공식 Codex App Server·pinned `0.144.4` source, current AY-PLE adapter와 공개 third-party 구현을 대조한 근거는 [Codex OAuth integration 조사](../assets/codex-oauth-integration-research.md)에 기록했다. 결론은 **공식 SDK의 Codex-managed ChatGPT browser login만 사용하고, AY-PLE은 token owner가 아니라 lifecycle projection owner가 되는 것**이다. Hermes·OpenCode처럼 OAuth endpoint, PKCE, refresh-token rotation과 token store를 다시 구현하지 않는다. `codex login` shell-out, `chatgptAuthTokens`, API key, device code와 전역 `~/.codex` import도 first preview product path가 아니다.

### Authority와 격리

| 책임 | Authority |
| --- | --- |
| OAuth authorize·callback·token exchange와 refresh, best-effort remote revoke·local credential deletion | Official Codex App Server의 managed `chatgpt` login |
| Credential persistence | Stable AY-PLE-owned `CODEX_HOME`을 받은 Codex. First preview는 `cli_auth_credentials_store = "file"`을 명시해 owner-only `appDataRoot/runtime/codex-home/auth.json`에 `0600`으로 저장한다. |
| Product account truth | 매 process launch·reauth·Runtime 전환 때의 fresh `account/read`; 별도 AY-PLE `authenticated: true` receipt나 file-existence 검사는 authority가 아니다. |
| Login attempt·UI phase | Server가 가진 한 개의 transient auth lease와 Browser-safe projection |
| Workspace·setup truth | App-owned workspace registry·`WorkspaceManifest`; OAuth credential이나 native login state를 넣지 않는다. |

`CODEX_HOME`, `CODEX_SQLITE_HOME`, isolated `HOME`과 temp root는 bootstrap Runtime, workspace Runtime과 relaunch 사이에서 같은 canonical app-data path를 유지한다. `~/.codex`는 읽거나 복사·수정하지 않는다. File store 선택은 deterministic public preview 결정이며 [historical spike ADR 0001](../../../adr/0001-use-file-auth-store-for-runtime-spike.md)을 제품 정본으로 승격시키는 뜻이 아니다. AY-PLE은 `auth.json`을 parse하거나 Browser contract로 투영하지 않고 Codex의 managed account method만 호출한다. macOS Keychain 전환은 별도 보안·migration 결정 없이는 silent하게 하지 않는다.

App Server initialization은 SDK 기본 `codex_python_sdk`로 가장하지 않고 release version을 포함한 AY-PLE `clientInfo`를 보낸다. Enterprise용 known-client 등록은 현재 학생 대상 preview의 blocker가 아니지만, enterprise use를 열 때는 공식 안내에 따라 다시 확인한다.

### Browser-safe product state

Server는 native protocol을 아래 snapshot으로 축소한다. Current UI의 generic `ready/not_ready`는 account type을 잃으므로 이 contract를 충족하지 않는다.

| State | Browser에 보이는 의미 |
| --- | --- |
| `checking` | Runtime lazy start 또는 fresh account reconciliation 중이다. |
| `login_required` | Fresh managed read에 usable ChatGPT account가 없다. First run·signed-out·영구 refresh failure뿐 아니라 pinned Runtime이 store load/parse failure를 null로 숨기는 경우도 제품에서 구분할 수 없다. Safe notice로 cancel·timeout·이전 실패를 한 번 표시할 수 있다. |
| `login_starting` | Login mutation을 받아 official start response와 검증된 auth URL을 기다린다. |
| `login_pending` | 한 login attempt가 Browser 완료를 기다린다. Opaque product `attemptId`, 검증된 `authUrl`, expiry만 transient하게 노출한다. |
| `verifying` | Matching completion은 success였지만 fresh account read를 아직 통과하지 않았다. |
| `connected` | Fresh read의 `account.type`이 정확히 `chatgpt`다. Email, token과 raw native account object는 내보내지 않는다. |
| `unsupported_account` | Fresh read에 account가 있지만 ChatGPT가 아니다. Explicit logout 뒤 ChatGPT reconnect만 제공한다. |
| `unavailable` | Runtime·account RPC가 실패했다. 이를 `login_required`로 추측하지 않는다. 단, pinned Codex가 내부 store load/parse failure를 account null로 투영하는 한계는 `login_required`에서 구분할 수 없다. |

정상 ChatGPT account도 `requiresOpenaiAuth: true`다. 이 필드는 active provider가 OpenAI auth를 요구하는지를 뜻하며 login 성공 판정값이 아니다. `account: null`이면 usable managed account가 없는 `login_required`, `account.type: "apiKey"` 등 다른 type이면 first preview의 `unsupported_account`로 fail closed하고 explicit logout·ChatGPT reconnect만 제공한다. Pinned Codex는 store load/parse failure도 null로 숨기므로 AY-PLE이 signed-out과 corrupt credential을 구분한다고 약속하지 않으며 `auth.json`을 직접 parse하지 않는다. `account/read(refreshToken: true)`는 transient refresh failure도 response에서 구분해 주지 않으므로 `connected`는 managed account record가 있다는 뜻이지 provider network probe의 성공을 과장한 상태가 아니다. 실제 action의 unauthorized는 account reconciliation으로, network failure는 retryable unavailable로 보낸다.

`unavailable`의 Browser action은 retry 하나다. Retry는 Server 내부에서 기존 Runtime 재확인 또는 필요할 때 bounded close 뒤 auth-only Runtime 재시작으로 수렴하지만 별도 public reset mutation을 만들지 않는다. Runtime이 account mutation을 받을 수 있을 때만 user-confirmed official logout으로 local credential을 지울 수 있고, RPC failure만으로 credential file을 자동 삭제하거나 새 login으로 덮지 않는다. Account null에서는 사용자의 explicit login만 managed credential을 새로 만들 수 있다.

Browser operation은 same-origin read/bootstrap, login start, exact-attempt cancel과 explicit logout 네 가지다. Mutation은 Ticket 006의 exact Origin guard를 통과해야 한다.

- Login start 전 fresh read를 한 번 수행한다. 이미 `connected`면 새 login을 만들지 않는다.
- Server auth lease가 이미 있으면 double click·중복 request는 같은 pending snapshot으로 수렴하고, App Server의 implicit “기존 login 교체” 동작을 호출하지 않는다.
- Native `loginId`와 SDK handle은 Python Runtime memory에만 둔다. Server가 random product `attemptId`를 만들고 current Runtime generation과 묶어 Runtime command에 전달하며, Browser에는 그 product ID만 보낸다.
- `authUrl`은 exact HTTPS issuer allowlist, userinfo 부재와 URL parse를 확인한 뒤에만 `Cache-Control: no-store`인 same-origin response로 Browser에 준다. 새 tab은 user gesture로 `noopener,noreferrer`와 함께 열고 copy fallback을 제공한다. URL 전체를 Browser storage·durable state·analytics·public log에 남기지 않는다.
- Python bridge는 start command에서 SDK handle·native `loginId`와 한 개의 background waiter를 소유하고, 검증 가능한 start projection을 normal response deadline 안에 즉시 돌려준다. Waiter의 coarse terminal은 bounded single-attempt slot에만 보관한다. Status read는 non-consuming·idempotent snapshot이라 poll·response retry에도 같은 terminal을 돌려준다. Server가 terminal과 fresh account를 모두 처리한 뒤 별도 idempotent `releaseBrowserLoginAttempt(productAttemptId)` control command를 보내거나 Runtime generation을 close할 때만 slot을 비운다. Release response가 유실돼도 retry할 수 있고, 일반 status read 자체는 clear하지 않는다. Server는 product lease를 유지하면서 이 짧은 typed status command로 poll하므로 pinned 10분 login timeout을 30초짜리 일반 bridge request 하나로 기다리거나 Runtime response deadline을 늘리지 않는다. Raw notification·provider error·native identifier는 Browser로 흐르지 않는다.

### Login, cancel과 logout settlement

```text
verified_stopped
  → checking
  → bootstrap Runtime lazy start
  → account/read(refreshToken=true)
      ├─ ChatGPT account → connected
      ├─ null            → login_required
      ├─ other account   → unsupported_account
      └─ RPC failure     → unavailable

login_required
  → login_starting
  → login_pending
  → matching account/login/completed
      ├─ success=false → fresh read → connected | unsupported_account | login_required | unavailable
      └─ success=true  → verifying → fresh read → connected | unsupported_account | login_required | unavailable
```

Official App Server는 browser completion notification을 auth cache reload보다 먼저 보낼 수 있다. 따라서 matching `success: true` 뒤 한 번의 즉시 read가 null이어도 실패·성공을 합성하지 않고, Server가 bounded reconciliation window에서 fresh read를 retry한다. Window 끝에도 account가 null이면 `login_verification_failed`와 `login_required`, 다른 account type이면 `unsupported_account`, RPC가 안정적으로 읽히지 않으면 `unavailable`로 수렴한다. 다음 retry의 fresh read가 다시 authority를 확인하며 `account/updated`는 wake-up hint일 수 있지만 success authority가 아니다.

Cancel은 Server의 product attempt·Runtime generation이 current lease와 일치할 때만 해당 Runtime command를 보낸다. Python bridge가 그 product ID에 매핑한 native `loginId`·SDK handle이 여전히 current인지 확인한 뒤 `cancel()`을 호출한다. Native `canceled`는 control acknowledgement이고 `notFound`는 completion과 race했을 수 있으므로 둘 다 matching completion/fresh read 뒤에 settle한다. Cancel과 success가 경합해 credential이 이미 저장됐다면 fresh ChatGPT account가 이기며 연결된 상태를 취소로 덮지 않는다. User cancel만 `login_cancelled`, app-owned deadline만 `login_expired`, 나머지 native completion string은 parse하거나 그대로 노출하지 않고 coarse `login_failed`로 projection한다.

OAuth tab close와 전체 Chrome 종료는 foreground `ay-ple` process의 shutdown signal이 아니며 App Server도 reliable tab-close signal을 받지 않는다. UI는 명시적 `취소` action을 제공하고, tab close만으로 cancel을 합성하지 않는다. Attempt는 matching completion 또는 pinned 10분 timeout까지 남고, Browser를 다시 열면 같은 in-memory pending state·완료 state를 보여준다. CLI `SIGINT`·정상 shutdown은 pending handle cancel을 bounded 시도한 뒤 Runtime process tree를 close한다. Crash·forced kill에서는 pending attempt를 복구하지 않고 다음 invocation의 fresh account read가 이미 저장된 success인지 signed-out인지 정한다.

Logout은 user가 명시적으로 요청할 때만 수행한다. Auth lease와 product turn을 직렬화하고 새 turn을 막은 뒤, active turn을 bounded interrupt·settle하고 live thread handle을 release한다. Pending login이 있으면 exact cancel 뒤 matching completion까지 bounded settle한다. 그 bound 안에 terminal이 없으면 callback과 old turn handle을 가진 Runtime process tree의 complete close가 이전 generation의 settlement를 대체하며, 이후 old Runtime에는 어떤 command도 보내지 않는다. 같은 `CODEX_HOME`의 auth-only Runtime을 새로 시작해야 stale callback이 logout 뒤 credential을 다시 저장할 수 없다. Pending login이 정상 settle됐으면 같은 Runtime에서, fallback이면 새 auth-only Runtime에서 official `logout()`을 호출한다. Remote revoke는 best-effort이며 product logout 성공은 managed local credential deletion 뒤 fresh read의 `account: null`로만 확인한다. Logout failure는 credential을 지웠다고 추측하지 않고 `logout_failed`와 fresh state를 보여주며 `SemesterWorkspace`, registry와 academic data는 삭제하지 않는다.

### Bootstrap cwd와 workspace transition

첫 account call이 필요할 때 `appDataRoot/runtime/bootstrap-cwd`를 owner-only `0700` empty directory로 create·canonicalize한다. Symlink, 다른 owner, broader permission과 unexpected entry는 fail closed한다. 이 path는 `SemesterWorkspace`가 아니며 registry·recent workspace·Skill root에 넣지 않는다. Project instruction, user material, private MCP와 product thread를 attach하지 않고 bootstrap-mode bridge는 account read, browser login, cancel, logout과 close 외의 thread/turn command를 거절한다.

새 `SemesterWorkspace`가 scaffold, schema validation과 registry admission을 모두 통과한 뒤, 그러나 `Semester Ready`를 기록하기 전에 다음 serial barrier를 지난다.

1. Pending auth operation이 없음을 확인한다.
2. Bootstrap Runtime을 bounded close하고 Python/native process tree의 종료를 확인한다.
3. 같은 `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temp를 사용하되 cwd와 execution root가 exact admitted workspace인 새 Runtime을 만든다.
4. Fresh account read가 ChatGPT account임을 다시 확인한다.
5. 그 뒤에만 Ticket 011이 정할 durable setup transaction이 `Semester Ready`를 commit한다.

새 Runtime start·account reconciliation이 실패하면 admitted workspace를 삭제하거나 Ready를 합성하지 않고 setup recovery로 남긴다. Ready relaunch는 registry의 active workspace와 `WorkspaceManifest`를 먼저 validate하고 그 workspace cwd로 Runtime을 바로 lazy start한다. Credential이 만료됐다면 workspace를 보존한 채 같은 account lifecycle의 `login_required`로 돌아간다.

### Official callback와 token boundary

“별도 OAuth server·port를 만들지 않는다”는 AY-PLE이 OAuth HTTP server나 token endpoint client를 구현하지 않는다는 뜻이다. Managed browser login도 pinned Codex 내부에서 `127.0.0.1:1455`, fallback `1457`의 short-lived callback listener를 연다. AY-PLE host의 dynamic product Origin과 합치거나 두 port를 app authority로 예약하지 않는다. 두 callback port 충돌과 다른 Codex login과의 cancellation interference는 login failure·release smoke 대상이다. 이 간섭이 preview에서 허용 불가능하다고 실제 smoke가 판정할 때만 device-code 범위를 다시 연다.

현재 SDK high-level `login_chatgpt()`는 bare `type: "chatgpt"`만 보내 default local success page를 사용하고, pinned native page URL에는 `id_token`이 들어간다. 구현은 official typed option `useHostedLoginSuccessPage: true`, `appBrand: "codex"`를 high-level SDK seam에 additive·upstream-followable하게 열어 normal success를 hosted page로 보낸다. 이 hosted page는 AY-PLE return page가 아니라 OpenAI의 `Open Codex` surface다. First preview는 이 tradeoff를 받아들이고 login card에 `OpenAI에서 완료한 뒤 이 AY-PLE 탭으로 돌아오세요`라고 미리 안내한다. AY-PLE 탭은 별도 완료 버튼 없이 계속 poll해 `connected`를 표시하며 official tab을 자동 close·focus하거나 AY-PLE로 redirect된다고 약속하지 않는다. Organization setup이 필요한 account에는 pinned Codex가 token-bearing local success URL로 fallback한다. 따라서 정직한 보장은 **OAuth credential bytes가 AY-PLE product origin·API, Browser bundle state·storage, workspace, app receipt와 public log를 통과하지 않는다**는 경계다. “어떤 Browser address에도 token이 절대 나타나지 않는다”는 현재 pinned Runtime으로 주장하지 않고 public privacy/trust surface에 official OAuth tab과 이 제한을 기록한다.

### Durable·transient와 현재 gap

| Durable | Transient |
| --- | --- |
| Codex-owned credential file under stable app-managed `CODEX_HOME` | Native `loginId`, SDK handle, product `attemptId`, auth URL, deadline |
| Workspace registry·manifest와 별도의 setup checkpoint | `checking/pending/verifying`, raw completion error, safe one-shot notice |
| Exact Runtime/app identity와 normal local redacted diagnostics | 별도 authenticated boolean, copied token/JWT claim, OAuth success receipt |

Current Runtime은 workspace closure를 launch 전에 요구하고, private bridge가 `read_account`만 제공하며 account type을 generic `ready`로 버린다. Production SDK에 적용되는 ordered patch `0004-notification-opt-out-config`와 bridge의 current retained set을 함께 보면 `account/login/completed`가 initialize opt-out 대상이므로 지금 그대로는 SDK `wait()`가 terminal을 받지 못한다. 구현 slice는 auth-only bootstrap role, typed start/status/cancel/release/logout commands, matching login notification opt-in, bounded pending-operation budget, full ChatGPT account projection, Server auth lease와 Browser contract를 함께 추가해야 한다. Unbounded waiter나 undrained global notification queue를 새로 만들지 않는다.

Release evidence는 fresh login, hosted `Open Codex` 완료 page에서 AY-PLE 탭으로 수동 복귀한 뒤의 자동 reconciliation, cancel/completion race, explicit logout, expired credential·reauth, Browser reopen, pending login 중 `SIGINT`, bootstrap→workspace process reap와 ready relaunch를 포함한다. Callback smoke는 (a) 기존 Codex listener의 `/cancel` interference와 port reclaim, (b) 취소되지 않는 unrelated `1455` occupant에서 `1457` fallback, (c) 두 port가 모두 막혔을 때 fail-closed를 따로 증명한다. Token-shaped byte가 AY-PLE product response·Browser storage·workspace·receipt·public log에 없다는 evidence도 남긴다. Third-party donor에서는 App Server wrapper의 matching completion/cancel UI pattern만 참고하고, Hermes/OpenCode의 direct endpoint·token store·refresh coordinator는 채택하지 않는다.

이 product auth·credential-store 결정을 Wayfinder 밖의 장기 정본에 반영하는 작업은 [Ticket 008a](008a-record-product-auth-decision.md)가 소유한다.
