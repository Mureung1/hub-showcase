# Codex OAuth integration 공식 근거 조사

> 조사일: 2026-07-22
>
> 대상: [Ticket 008 — Browser-launched Codex OAuth lifecycle](../tickets/008-browser-oauth-lifecycle.md)
>
> 결론의 기준 pin: `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876` (`rust-v0.144.4`)

## 결론

첫 public preview의 OAuth는 **official Codex App Server가 소유하는 managed ChatGPT browser login**으로 구현해야 한다. AY-PLE은 OAuth endpoint, PKCE, token exchange, refresh-token rotation, token schema를 재구현하지 않는다. 앱은 official Python SDK의 login attempt를 한 Runtime 안에서 시작·대기·취소하고, App Server가 app-managed `CODEX_HOME`에 저장한 계정 상태를 읽어 제품 상태로 투영한다. Official 문서도 managed `chatgpt`를 권장하고 Codex가 flow, token persistence, refresh를 소유한다고 명시한다. [`app-server` auth surface](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/README.md#L1914-L1934)

다만 “SDK 호출 한 줄을 UI에 붙이면 끝”은 아니다. 현재 AY-PLE에는 다음 구현이 실제로 추가되어야 한다.

1. pre-workspace Runtime cwd와 workspace admission 뒤 bounded close·recreate
2. SDK login handle을 소유하는 Runtime account lifecycle
3. matching completion, cancel, logout, relaunch account check
4. Server가 소유하는 단일 active attempt와 Runtime generation fencing
5. token·OAuth code를 담지 않는 AY product-origin/API/Browser bundle contract와 setup UI
6. normal callback에서 hosted success page를 요청하기 위한 작은 SDK adapter

같은 Runtime process·generation에서 진행 중인 active login attempt를 `connected`로 settle하는 조건은 다음 두 조건의 conjunction이다.

```text
matching account/login/completed(loginId).success === true
AND
그 completion 이후 새로 읽은 account/read.account.type === "chatgpt"
```

이 conjunction은 **active same-process attempt에만** 적용한다. App launch·relaunch에는 matching completion이나 복구한 attempt가 없으므로, stable app-managed `CODEX_HOME`을 사용하는 현재 Runtime의 fresh `account/read.account.type === "chatgpt"`가 단독 authority다. Crash 뒤 이미 credential이 저장된 경우에도 completion을 재현하려 하지 않는다.

`requiresOpenaiAuth`는 provider가 OpenAI 인증을 요구하는지를 나타내므로 **정상 ChatGPT 로그인 뒤에도 `true`**다. 이를 성공/실패 flag로 해석하면 안 된다. Official 예시도 logged-out과 logged-in ChatGPT 모두 `requiresOpenaiAuth: true`이고, pin의 provider projection은 permanent refresh failure가 기록된 credential도 `account: null`로 숨긴다. [`account/read` 예시와 field 의미](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/README.md#L1943-L1968), [`ProviderAccountState` projection](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/model-provider/src/provider.rs#L270-L311)

## 조사 source와 재현 pin

사용자가 제공한 ChatGPT 대화는 조사 가설로만 사용했다. 아래 repository의 실제 source를 commit으로 고정해 대조했다.

| Source | 조사 commit | 이 조사에서 확인한 역할 |
| --- | --- | --- |
| [`openai/codex`](https://github.com/openai/codex/tree/8c68d4c87dc54d38861f5114e920c3de2efa5876) | `8c68d4c87dc54d38861f5114e920c3de2efa5876` | AY-PLE exact Runtime pin, normative contract |
| [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent/tree/9fed768b567cf326d7790a85d417889ceb5c1b7e) | `9fed768b567cf326d7790a85d417889ceb5c1b7e` | direct device flow와 자체 token store |
| [`anomalyco/opencode`](https://github.com/anomalyco/opencode/tree/0a601cf334b9a83cc2854108a2b860f25e6e7e8e) | `0a601cf334b9a83cc2854108a2b860f25e6e7e8e` | direct browser/device flow와 자체 refresh/backend adapter |
| [`openclaw/openclaw`](https://github.com/openclaw/openclaw/tree/685fb849bbf43963107d20d32cac89239fe0e807) | `685fb849bbf43963107d20d32cac89239fe0e807` | App Server external-token handoff |
| [`milisp/codexia`](https://github.com/milisp/codexia/tree/dfe82683734eb3fdf8e07d6ad20cd83021ac11a0) | `dfe82683734eb3fdf8e07d6ad20cd83021ac11a0` | managed App Server browser login donor와 UI gap |
| [`op7418/CodePilot`](https://github.com/op7418/CodePilot/tree/215c8f93d213c904a6903b86e7c0a93dab905a16) | `215c8f93d213c904a6903b86e7c0a93dab905a16` | managed login correlation/cancel/logout donor와 UI gap |

## 제공된 가설의 검증 결과

| 가설 | 판정 | 근거와 보정 |
| --- | --- | --- |
| Hermes는 Codex device flow를 직접 구현한다 | 확인 | device code request, polling, authorization-code exchange를 직접 수행한다. [`_codex_device_code_login`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L7357-L7553) |
| Hermes는 항상 Codex CLI와 완전히 독립된 token chain을 쓴다 | 조건부 | fresh login은 자체 session과 `~/.hermes/auth.json`을 쓰지만, 선택적 `~/.codex/auth.json` import와 refresh 실패 시 CLI token recovery도 존재한다. [`_login_openai_codex`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L7030-L7101), [`CLI token recovery`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L3647-L3722) |
| App Server managed auth가 AY-PLE에 가장 작은 경계다 | 확인 | login start/wait/cancel/logout/account를 제공하고 Codex가 persistence·refresh를 소유한다. [`SDK login handle`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/_login.py#L29-L60), [`SDK account/logout API`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/api.py#L351-L369) |
| “token은 Browser를 전혀 통과하지 않는다” | 너무 강함 | 정상 경로에 hosted success를 요청할 수 있지만 organization setup이 필요하면 official callback은 local success URL로 fallback하며 그 query에 `id_token`을 넣는다. 보장 범위는 token·OAuth code가 **AY-PLE product origin/API, Browser bundle state·storage, workspace, public log**에 들어가지 않는다는 것으로 한정해야 한다. [`success URL composition`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/success_page.rs#L40-L104) |
| 별도 OAuth server를 AY-PLE이 만들어야 한다 | 기각 | App Server가 내부 loopback callback server를 소유한다. AY-PLE의 Express listener나 별도 product port가 아니다. [`login callback server`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/server.rs#L150-L179) |

## Official managed browser flow의 실제 contract

### Start는 성공이 아니다

`AsyncCodex.login_chatgpt()`는 `loginId`와 `authUrl`을 가진 live handle을 반환할 뿐이다. Handle의 `wait()`는 matching completion을 기다리고 `cancel()`은 그 login ID를 취소한다. [`AsyncChatgptLoginHandle`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/_login.py#L136-L152)

Python SDK는 start response에서 login route를 등록하고, waiter 등록 전에 도착한 completion도 pending queue에 보존한다. `wait_for_login_completed()`는 method, payload type, login ID가 모두 일치할 때만 반환하고 `finally`에서 route를 정리한다. 따라서 Python bridge가 start 시 official handle과 bounded background waiter를 소유하고 즉시 safe start projection을 반환해야 한다. Waiter terminal은 active attempt 하나에 대응하는 single-slot state에만 보관하고, Node는 일반 response deadline 안에 끝나는 짧은 typed status command로 이를 읽는다. 10분 OAuth 대기를 하나의 Node↔Python pending RPC로 만들거나 30초 일반 response timeout을 늘려 해결하지 않는다. [`start response route registration`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/client.py#L393-L408), [`early login notification replay`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/_message_router.py#L59-L87), [`matching completion wait`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/client.py#L703-L719), [현재 30초 response deadline](../../../../packages/codex-chat-runtime/src/runtime.ts#L190-L195)

App Server는 한 process에 active login 하나만 보관하고 새 start가 오면 기존 attempt를 교체·취소한다. AY 제품에서는 이 upstream replacement를 사용자-facing policy로 노출하지 말고, active attempt가 있으면 두 번째 start를 같은 pending snapshot으로 idempotently 수렴시켜야 한다. 그렇지 않으면 첫 Browser tab과 두 번째 Runtime attempt가 서로 다른 상태를 보여준다. [`ActiveLogin`과 drop cancellation](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L19-L64), [`browser attempt replacement`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L433-L500)

### Completion 뒤 account read에는 짧은 race가 있다

Exact pin은 `account/login/completed`를 먼저 전송한 다음 성공 branch에서 `AuthManager.reload()`와 `account/updated`를 수행한다. 따라서 handle의 matching success 직후 단 한 번 읽은 `account/read`가 아직 `account: null`을 볼 수 있다. [`completion → reload → updated 순서`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L708-L752)

제품 성공 판정은 다음처럼 bounded convergence로 구현해야 한다.

1. matching completion이 `success: true`인지 확인한다.
2. completion 이후 새 `account/read`를 수행한다.
3. `account.type === "chatgpt"`이면 product auth state를 `connected`로 확정한다.
4. 잠깐 `account: null`이면 짧은 bounded retry를 수행한다.
5. bound 안에 ChatGPT account가 나타나지 않으면 성공을 합성하지 않고 `login_verification_failed`로 남긴다.

`account/updated`는 wake-up hint로 쓸 수 있지만 login ID가 없고 logout 뒤 exact pin 구현이 항상 notification을 내는 것도 아니므로 authority가 될 수 없다. Logout 후에도 fresh `account/read`로 local deletion을 확인해야 한다. [`logout implementation`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L755-L807)

### Callback port와 success page는 Codex 내부 surface다

Managed browser login도 내부적으로 loopback callback listener를 연다. Exact pin은 `127.0.0.1:1455`를 선호하고, 기존 listener cancel을 시도한 뒤 registered fallback `1457`을 사용한다. 두 port가 모두 불가능하면 login start가 실패한다. [`callback port와 fallback`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/server.rs#L57-L60), [`bind/cancel/fallback algorithm`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/server.rs#L614-L671)

이는 Ticket 006의 dynamic AY product origin과 다른 surface다.

```text
AY product UI/API     http://127.0.0.1:<OS-assigned-port>
Codex OAuth callback  http://localhost:1455/auth/callback
                      또는 http://localhost:1457/auth/callback
```

“별도 OAuth web server·port를 만들지 않는다”는 말은 AY-PLE이 별도 listener와 callback protocol을 구현하지 않는다는 뜻이다. Official App Server 내부 callback까지 없다는 뜻은 아니다. Start 실패는 safe product error로 투영하고, 다른 Codex login을 완료·취소한 뒤 retry하도록 안내해야 한다.

기본 high-level Python helper는 `type="chatgpt"`만 보내므로 local success page를 사용한다. Exact protocol은 `useHostedLoginSuccessPage`와 `appBrand`를 지원하며, hosted option을 켜면 일반 성공 경로는 token 없는 `https://chatgpt.com/codex/open-app?...`으로 간다. 다만 platform onboarding이 끝나지 않은 organization owner는 setup을 위해 local success page로 fallback하고, 그 URL query에는 `id_token`이 포함된다. [`hosted option protocol`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/v2/account.rs#L64-L118), [`hosted selection`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L248-L279), [`org setup fallback test`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/success_page_tests.rs#L72-L120)

첫 preview는 official default/provider identity와 맞춰 `useHostedLoginSuccessPage: true`, `appBrand: "codex"`를 요청한다. 이는 AY-PLE return page가 아니라 `https://chatgpt.com/codex/open-app`의 official `Open Codex` surface를 연다. Normal path의 token-bearing local history를 피하는 대신 자동 AY-PLE redirect·tab close가 없다는 UX tradeoff다. Login card는 시작 전에 `OpenAI에서 완료한 뒤 이 AY-PLE 탭으로 돌아오세요`라고 안내하고, 원래 AY-PLE 탭이 별도 “완료” 버튼 없이 status poll로 연결을 자동 확인한다. Bundled public high-level `login_chatgpt()` signature는 이 option을 받지 않으므로 private generated shape를 Browser까지 누출하는 대신 Runtime-owned SDK adapter 또는 작은 ordered upstream patch가 필요하다. 이는 작은 구현이지만 실제 구현 gap이다. [`CODEX_OPEN_APP_URL`과 brand](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/success_page.rs#L7-L30), [현재 bundled high-level helper](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py#L29-L60), [regenerated exact params](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L6445-L6454)

App Server initialize의 `clientInfo`도 SDK 기본값 `codex_python_sdk`로 가장하지 않고 release version을 포함한 AY-PLE identity를 보내야 한다. [`AsyncCodexOptions.client_name` 기본값](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/client.py#L198-L213), [`clientInfo` 전송](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/sdk/python/src/openai_codex/client.py#L289-L305)

### Token persistence와 refresh의 owner

Exact pin의 credential store mode는 `File`, `Keyring`, `Auto`, `Ephemeral`이며 기본값은 `File`이다. File mode는 `$CODEX_HOME/auth.json`에 저장하고 Unix에서 `0600`으로 생성한다. [`AuthCredentialsStoreMode`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/config/src/types.rs#L87-L100), [`FileAuthStorage`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/auth/storage.rs#L150-L224)

첫 preview는 current default에 암묵 의존하지 말고 app-managed `CODEX_HOME`에 대한 `File` mode를 명시적으로 고정하는 것이 재현성이 높다. Ticket 006의 owner-only `appDataRoot`와 single instance가 상위 보호 경계이고, App Server만 token file format을 읽고 쓴다. Keyring/Auto 전환은 credential migration, macOS prompt, clean-machine smoke를 따로 다룰 후속 결정이다.

Codex는 refresh 결과의 새 access/refresh token과 `last_refresh`를 저장하고, refresh를 single-flight semaphore로 직렬화하며, expired/reused/revoked token을 permanent failure로 분류한다. Logout은 remote revoke를 best-effort로 시도한 뒤 local stores를 지우고 cache를 reload한다. [`refresh persistence와 분류`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/auth/manager.rs#L1306-L1403), [`single-flight refresh`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/auth/manager.rs#L2362-L2453), [`logout with revoke`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/auth/manager.rs#L2455-L2488)

`account(refresh_token=True)`의 한계도 기록해야 한다. Permanent refresh failure는 account projection에서 `account: null`로 수렴하지만, transient refresh failure는 cached account가 남을 수 있고 `GetAccountResponse` 자체에는 “refresh verified” field가 없다. Pinned `AuthManager`는 credential store의 load/parse 오류도 `.ok().flatten()`으로 삼켜 account 없음과 구분하지 않는다. AY-PLE은 이를 되찾기 위해 `auth.json`을 직접 parse하지 않고, fresh read의 null을 “usable managed account 없음”인 `login_required`로만 표현한다. 따라서 `connected`는 `account_present` readiness로 다루되, 일시적 network failure까지 “refresh가 확실히 성공했다”고 표시하면 안 된다. 실제 turn의 `unauthorized`는 fresh account reconciliation을 거쳐 `login_required` 또는 `unavailable`로 수렴시키고, connection failure는 retryable `unavailable`로 분리해야 한다. [`refresh request outcome`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L810-L822), [`account response projection`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L897-L918), [`AuthManager` store-load projection](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/login/src/auth/manager.rs#L1836-L1864)

## AY-PLE product surface가 보장할 credential boundary

Browser 전체에 token이나 code가 없다고 주장할 수는 없다. Browser는 AY-PLE product origin 밖에서 official OAuth provider와 loopback callback·success page를 방문하며, 해당 official URL에는 authorization code나 `id_token`이 나타날 수 있다. AY-PLE이 보장할 정확한 경계는 **AY-PLE product origin/API, Browser bundle state·storage, workspace와 logs가 token·OAuth code를 받거나 보관하지 않는다**는 것이다.

| Surface | 허용 | 금지 |
| --- | --- | --- |
| Official OAuth browser navigation | AY product origin 밖의 official `authUrl`, callback와 hosted/local success page | AY code가 callback query, authorization code나 token을 가로채는 것 |
| AY product HTTP | app-owned `attemptId`, coarse state, safe display message, transient `authUrl` | native `loginId`, OAuth code, access/refresh/id token, callback query, raw account payload·upstream error |
| AY Browser bundle state·storage | setup 상태와 transient attempt UI | OAuth code, token, callback query, persisted auth URL, localStorage/sessionStorage credential copy |
| `SemesterWorkspace` | 인증과 무관한 workspace data | credential, account cache, login attempt, OAuth URL |
| app-managed state | stable `CODEX_HOME`, non-secret setup milestone | AY 자체 token schema 또는 global `~/.codex` import |
| log/telemetry | safe product error code, Runtime generation, redacted phase | auth URL query, callback URL query, OAuth code, token, email, raw upstream body |

`authUrl`은 token은 아니지만 state, PKCE challenge, redirect URI를 담은 transient capability다. Product response에는 `Cache-Control: no-store`를 적용하고, Server log·history artifact·setup state에 기록하지 않는다. Browser가 보낸 URL을 다시 열지 않고 verified Runtime에서 받은 URL이 HTTPS, first-preview issuer allowlist, userinfo 부재를 통과할 때만 전달한다.

## 현재 AY-PLE code audit

현재 구현은 좋은 격리 seam을 이미 갖고 있지만 login lifecycle은 없다.

| 현재 상태 | 근거 | Ticket 008 consequence |
| --- | --- | --- |
| Runtime product contract는 `ready` 또는 `authentication_required`만 표현한다 | [`contract.ts`](../../../../packages/codex-chat-runtime/src/contract.ts#L8-L13), [`runtime-contract.ts`](../../../../packages/codex-chat-runtime/src/runtime-contract.ts#L47-L53) | start/status/cancel/logout/account refresh seam 추가 필요 |
| Python bridge는 `account()`를 forced refresh 없이 한 번 읽는다 | [`runtime.py`](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L566-L584) | relaunch/expiry check와 post-completion bounded verification 추가 필요 |
| Bridge initialization은 대부분의 notification을 opt-out하며 현재 allow set에 `account/login/completed`가 없다 | [`cli.py`](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L102-L121) | matching SDK waiter가 동작하도록 completion notification을 retained set에 포함해야 함 |
| Node의 일반 Runtime operation response deadline은 30초이고 timeout은 Runtime failure로 이어진다 | [`runtime.ts`](../../../../packages/codex-chat-runtime/src/runtime.ts#L190-L195), [`sendOperation`](../../../../packages/codex-chat-runtime/src/runtime.ts#L735-L760) | 10분 login waiter를 pending RPC로 노출하지 말고 Python background waiter + 짧은 status command로 분리해야 함 |
| Production Runtime factory는 active workspace가 있어야 만들 수 있다 | [`codex-chat-config.ts`](../../../../apps/server/src/codex-chat-config.ts#L66-L75), [`workspace-bound factory`](../../../../apps/server/src/codex-chat-config.ts#L111-L167) | non-workspace bootstrap cwd를 명시적으로 지원해야 함 |
| 개발 bootstrap도 `AY_PLE_WORKSPACE_ROOT`를 필수로 받는다 | [`product-development.ts`](../../../../apps/server/src/product-development.ts#L36-L93) | public host에서 workspace 없는 첫 실행을 분리해야 함 |
| Server는 readiness read와 Runtime recycle primitive를 이미 갖고 있다 | [`codex-chat-service.ts`](../../../../apps/server/src/codex-chat-service.ts#L151-L175), [`runtime recycle`](../../../../apps/server/src/codex-chat-service.ts#L505-L519) | account controller와 workspace admission transition의 donor로 재사용 가능 |
| Browser contract는 `ready/not_ready/unavailable`이고 UI는 로그인 필요 문구만 보여준다 | [`workspace.ts`](../../../../packages/product-contract/src/workspace.ts#L55-L58), [`ProductReadiness`](../../../../apps/chat-shell/src/product-chat-presentation.tsx#L327-L360) | setup wizard action/state surface 추가 필요 |
| Node→Runtime child environment는 ambient secrets를 복사하지 않고 app-controlled `HOME`, `CODEX_HOME`, SQLite, temp만 전달한다 | [`runtime.ts`](../../../../packages/codex-chat-runtime/src/runtime.ts#L1339-L1374) | global `~/.codex` import 금지를 이미 지킬 수 있는 핵심 seam |

현재 readiness mapping은 `requires_openai_auth && account is None`만 not-ready로 본다. 일반 ChatGPT account에서는 우연히 올바르게 ready가 되지만, 첫 preview 성공 조건은 더 좁게 `account.type === "chatgpt"`를 확인해야 한다. Ambient API key/access token이 child environment에 들어가지 않는 현재 controlled environment를 계속 보존하고, API key/device code/external token mode를 UI와 bridge contract에서 열지 않는다.

## 권장 Runtime·Server·Browser lifecycle

### 하나의 Runtime account controller

```text
Browser setup wizard
  └─ token/OAuth-code-free AY product account API
      └─ Server AccountLifecycleController
          └─ one Runtime generation
              └─ Python bridge owns AsyncChatgptLoginHandle
                  └─ official codex app-server
                      ├─ internal callback 1455/1457
                      ├─ managed token store under app CODEX_HOME
                      └─ managed refresh/revoke
```

Runtime-facing interface는 raw App Server shape를 올리지 않고 다음 의미만 제공하면 된다.

| Operation | Runtime 내부 authority | Product result |
| --- | --- | --- |
| `readAccount(refresh)` | `AsyncCodex.account(refresh_token=...)` | `connected`, `login_required`, `unsupported_account`, safe failure |
| `startBrowserLogin(productAttemptId)` | hosted option을 켠 official login start 후 product ID에 live handle·background waiter를 결합 | native ID 없는 transient `authUrl`, safe pending state를 즉시 반환 |
| `readBrowserLoginAttempt(productAttemptId)` | single-slot pending/terminal state를 읽는 짧은 command. Terminal read는 non-consuming이며 generation close 전까지 clear하지 않음 | `pending` 또는 retry에도 같은 safe terminal; Server가 terminal 뒤 별도 fresh account read를 수행 |
| `cancelBrowserLogin(productAttemptId)` | Python 안에서 결합한 같은 handle의 `.cancel()` | `canceled`, `already_settled`, safe failure |
| `releaseBrowserLoginAttempt(productAttemptId)` | Server가 terminal과 fresh account를 처리한 뒤 보내는 exact-attempt idempotent ack | slot release 또는 이미 release됨; response loss 뒤 retry 가능 |
| `logout()` | stale callback이 없도록 settle한 Runtime의 `AsyncCodex.logout()` 후 fresh account read | local session absent 또는 safe failure |

Native `loginId`, SDK handle과 그 handle을 기다리는 background task는 Python Runtime process 안에만 머문다. Server는 random opaque product `attemptId`를 만들고 current Runtime generation에 묶어 Runtime command에 전달하지만, native ID나 handle을 받거나 저장하지 않는다. Python bridge가 그 product ID를 live handle 및 bounded single-slot terminal에 결합하며 Browser에는 product ID만 보낸다. Raw engine protocol을 product contract로 승격하지 않는다.

### Browser-safe state

| State | 의미 | 허용 action |
| --- | --- | --- |
| `checking` | Runtime lazy start 또는 account read 중 | wait |
| `login_required` | Fresh managed read에 usable ChatGPT account가 없음. Pinned store-load/parse null projection도 구분할 수 없음 | start login |
| `login_starting` | Login mutation을 받고 official start response와 검증된 auth URL을 기다리는 중 | wait |
| `login_pending` | start response를 받았고 matching completion 또는 cancel settlement 대기 중 | auth link 다시 열기, cancel |
| `verifying` | matching success 뒤 fresh account read convergence 중 | wait |
| `connected` | fresh read에서 `account.type === "chatgpt"` | 다음 setup 단계 |
| `unsupported_account` | account가 있지만 ChatGPT가 아님 | explicit logout 뒤 ChatGPT reconnect |
| `unavailable` | Runtime, callback port, transport, transient account check 실패 | retry |

첫 setup의 미연결과 이전 credential의 영구 실패는 모두 `login_required`다. Ticket 011의 non-secret setup milestone은 필요하면 한 번의 safe 안내를 다르게 고를 수 있지만 현재 로그인 증명이나 별도 auth state가 아니다. 현재 Runtime account read가 authority다.

### Authoritative transition

```text
start requested
  → active attempt가 있으면 upstream start 없이 같은 login_pending snapshot 반환
  → login_starting
  → official start response
  → login_pending
  → matching completion failure/cancel/timeout
      → fresh account read
      → login_required | connected(cancel이 늦었음) | unsupported_account | unavailable
  → matching completion success
      → verifying
      → bounded fresh account/read convergence
      → account.type === chatgpt 일 때만 connected
      → account null이면 login_verification_failed + login_required
      → 다른 account면 unsupported_account, RPC failure면 unavailable
```

Cancel과 completion은 race할 수 있다. Cancel response가 `notFound`이면 completion이 먼저 settle됐을 수 있으므로 signed-out을 강제하지 않는다. 반대로 사용자가 cancel을 눌렀어도 matching success와 ChatGPT account가 이미 확정됐다면 “취소가 늦었고 연결됨”으로 보여야 한다. Official cancel은 exact login ID가 active일 때만 `canceled`, 아니면 `notFound`다. [`cancel semantics`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server/src/request_processors/account_processor.rs#L579-L605)

Product mutation endpoint는 Ticket 006의 exact Origin·loopback guard를 그대로 적용한다. Browser는 Server snapshot을 bounded poll하고, Server는 필요할 때 normal response deadline 안의 짧은 typed Runtime status command로 동기화한다. Terminal snapshot은 poll·response retry에서 소비되지 않는다. Server가 terminal과 fresh account를 처리한 뒤 보내는 별도 idempotent `releaseBrowserLoginAttempt(productAttemptId)` acknowledgement 또는 Runtime generation close에서만 제거하며, 일반 status read와 clear를 결합하지 않는다. SDK notification을 Browser SSE로 그대로 중계하거나 10분짜리 Node pending operation을 유지할 이유는 없다.

Logout은 정상적으로 pending attempt와 turn을 settle한 같은 Runtime에서 수행한다. 다만 pending login cancel의 terminal이 bound 안에 오지 않으면 callback-owning Runtime을 먼저 완전히 close하고, same `CODEX_HOME`의 auth-only Runtime을 recreate한 뒤 official logout을 호출해 stale callback의 credential 재저장을 막는다. Official remote revoke는 best-effort이고 managed local effect는 credential store 삭제와 cache reload다. Product는 logout response만 믿지 않고 fresh `account/read.account === null`을 확인하며, RPC·fresh-read failure에서는 local deletion을 추측하지 않는다.

## Pre-workspace cwd와 SemesterWorkspace 전환

OAuth Runtime의 cwd는 다음처럼 고정한다.

```text
<appDataRoot>/runtime/bootstrap-cwd
```

이 directory는 다음 invariants를 갖는다.

- app이 owner-only로 생성하고 symlink를 거절한다.
- `runtime/home`, `runtime/codex-home`, `runtime/codex-sqlite-home`, `runtime/temp`와 canonical path가 모두 다르다.
- user material, imported folder, `WorkspaceManifest`를 넣지 않는다.
- `SemesterWorkspace`라고 부르거나 registry에 등록하지 않는다.
- Runtime이 종료돼도 path는 재생성 가능한 inert app data이며 credential authority가 아니다.

현재 `createCodexChatRuntime({ workspace })` naming은 이 directory를 workspace로 오해하게 만든다. production composition seam은 `cwd` 또는 다음 discriminated input으로 깊게 만드는 편이 안전하다.

```text
{ kind: "bootstrap", cwd: <appDataRoot>/runtime/bootstrap-cwd }
{ kind: "semester_workspace", cwd: validatedWorkspaceRoot }
```

Golden path의 Runtime transition은 다음 순서다.

1. Launcher가 Runtime artifact를 verify하지만 process는 아직 시작하지 않는다.
2. Account status/login action에서 bootstrap cwd로 Runtime generation A를 lazy start한다.
3. Login 성공은 generation A의 matching completion과 ChatGPT account read로 확정한다.
4. 앱이 새 `SemesterWorkspace`를 scaffold하고 manifest·schema를 admit한다.
5. active login attempt가 없음을 확인하고 generation A를 bounded close한다.
6. 같은 `HOME`, `CODEX_HOME`, SQLite, temp를 유지한 채 admitted workspace cwd로 generation B를 만든다.
7. generation B에서 fresh account read를 수행한다.
8. account `connected`와 workspace ready가 모두 확인된 뒤에만 product thread, private MCP binding, `Semester Ready`를 연다.

Credential durability는 stable `CODEX_HOME`이 소유하므로 Runtime recreation에 token copy나 import가 필요 없다. Generation A의 login handle, callback, notification waiter, thread는 generation B로 이월하지 않는다. 늦게 도착한 A의 completion은 generation fence에서 버린다.

## Durable state와 transient state

| State | 위치 | 수명 | Authority |
| --- | --- | --- | --- |
| Managed Codex credential | `<appDataRoot>/runtime/codex-home`의 official store | app update·Runtime recreation·relaunch를 넘어 지속 | Codex App Server만 읽기/쓰기 |
| Non-secret OAuth setup milestone | Ticket 011 setup state | setup resume용 | 현재 auth 증명이 아니며 account read가 override |
| Bootstrap cwd directory | app data | 재생성 가능 | Runtime cwd only |
| Active attempt/SDK handle/native login ID와 single-slot terminal | Python Runtime memory | 한 Runtime generation·한 active attempt | matching SDK background waiter |
| Product `attemptId`, auth URL, cancel state | Server memory | 한 host process 또는 attempt terminal까지 | AccountLifecycleController |
| Browser modal/state | Browser memory | tab lifetime | Server snapshot으로 재동기화 |
| Account email/plan | AY product state로 보관하지 않음 | Browser export·persist 모두 금지 | Codex 내부 account payload |

Host crash나 CLI interrupt 뒤 active attempt를 복구하려 하지 않는다. Setup이 미완료된 relaunch는 새 bootstrap Runtime을 만들고, registry와 `WorkspaceManifest`가 유효한 ready relaunch는 admitted workspace Runtime을 바로 lazy start해 durable official store를 fresh read한다. Callback 전에 죽었다면 새 login을 시작하고, token persistence 뒤 죽었다면 account가 `connected`로 수렴한다.

## 주요 scenario의 수렴 규칙

| Scenario | Required behavior |
| --- | --- |
| Fresh login | `login_starting`→`login_pending`; matching success + bounded ChatGPT account read 뒤에만 `connected` |
| Browser open 실패 | attempt와 auth link를 유지해 retry-open/cancel 가능; 성공 합성 금지 |
| 10분 official timeout | matching failure로 settle하고 active attempt 제거; safe retry 제공 |
| User cancel | exact attempt cancel, completion race settle, fresh account read로 final state 결정 |
| 두 번째 login click | 같은 `login_pending` snapshot을 idempotently 반환하고 upstream start를 다시 호출하지 않음 |
| `SIGINT`/`SIGTERM`/`SIGHUP` | 새 admission 중단, active attempt best-effort cancel, Runtime bounded close; attempt state persist 금지 |
| Relaunch | setup milestone을 auth proof로 쓰지 않고 fresh account read; account null이면 `login_required` |
| Permanent refresh failure | account null → `login_required`; stored token을 Browser나 AY code로 복구하지 않음 |
| Transient refresh/network failure | `unavailable/retry`; invalid credential로 단정하거나 setup milestone을 되돌리지 않음 |
| Logout | 정상 경로는 같은 Runtime에서 pending attempt·turn을 settle하고 handle을 release한 뒤 official logout + fresh account null 확인. Pending cancel terminal이 bound 안에 없으면 callback-owning Runtime을 close하고 same `CODEX_HOME` auth-only Runtime을 recreate한 뒤 logout. Remote revoke는 best-effort이고 local credential delete/cache reload가 managed logout 효과이며, fresh null이 product authority |
| Workspace admission | pre-auth Runtime close 후 same `CODEX_HOME`과 new workspace cwd로 recreate |
| Workspace change | 같은 close→recreate pattern을 재사용; account store는 app-global |
| Stale Runtime completion | generation mismatch면 무시; current Browser state 변경 금지 |

## Third-party public repository 비교

### 요약

| Repository | Auth owner | Storage/refresh owner | Lifecycle completeness | AY-PLE 판단 |
| --- | --- | --- | --- | --- |
| Hermes Agent | Hermes가 device endpoints 직접 호출 | `~/.hermes/auth.json`, Hermes refresh | CLI cancel/timeout과 분류는 상세하지만 custom surface가 큼 | anti-pattern; protocol 이해용 only |
| OpenCode | OpenCode가 browser callback와 device flow 직접 구현 | OpenCode `auth.json`, direct refresh와 Codex backend adapter | 자체 UX에는 통합됐지만 OAuth·backend coupling을 모두 소유 | anti-pattern; 복사 금지 |
| OpenClaw | host auth profile을 App Server external tokens로 주입 | OpenClaw profile/refresh handler | multi-profile 요구에는 맞지만 auth subsystem이 큼 | 첫 preview에서 제외 |
| Codexia | App Server managed browser start | Codex | start/completion UI는 있으나 correlation·cancel·logout이 약함 | managed-flow donor, UI 그대로 복사 금지 |
| CodePilot | App Server managed browser start | Codex | helper는 correlation/cancel/logout을 제공하지만 UI가 manual completion | helper donor, Server authority 강화 필요 |

### Hermes Agent: 직접 구현의 비용을 보여주는 사례

Hermes는 자체 session을 `~/.hermes/auth.json`에 저장한다고 명시하고, refresh-token rotation 충돌 회피를 이유로 든다. 저장층에는 cross-process lock, atomic temporary file, `0600`, fsync까지 들어간다. [`Codex session policy`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L3312-L3316), [`auth store lock`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L983-L1106), [`atomic save`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L1151-L1202)

그 위에 device request 429 backoff, polling, Ctrl+C, 15분 timeout, code exchange, refresh error classification, rotated token save가 추가된다. Optional CLI token import와 self-healing recovery는 공유 refresh token이 만들어내는 결합을 다시 처리해야 함을 보여준다. Logout도 해당 provider의 local state 삭제가 중심이다. [`device polling·cancel·timeout`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L7422-L7504), [`refresh rotation handling`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L3513-L3688), [`local provider clear`](https://github.com/NousResearch/hermes-agent/blob/9fed768b567cf326d7790a85d417889ceb5c1b7e/hermes_cli/auth.py#L1651-L1688)

AY-PLE에는 이미 official App Server가 있으므로 이 복잡성을 가져올 이유가 없다.

### OpenCode: browser flow를 직접 소유해도 범위가 줄지 않는다

OpenCode는 client ID, issuer, PKCE, `1455` callback server, state validation, code exchange와 refresh를 직접 구현한다. Browser flow와 headless device flow를 모두 제공하고 access/refresh token을 자체 `auth.json`에 `0600`으로 저장한다. [`direct OAuth constants와 PKCE`](https://github.com/anomalyco/opencode/blob/0a601cf334b9a83cc2854108a2b860f25e6e7e8e/packages/opencode/src/plugin/openai/codex.ts#L10-L138), [`callback server`](https://github.com/anomalyco/opencode/blob/0a601cf334b9a83cc2854108a2b860f25e6e7e8e/packages/opencode/src/plugin/openai/codex.ts#L140-L260), [`browser/device methods`](https://github.com/anomalyco/opencode/blob/0a601cf334b9a83cc2854108a2b860f25e6e7e8e/packages/opencode/src/plugin/openai/codex.ts#L429-L540), [`auth store`](https://github.com/anomalyco/opencode/blob/0a601cf334b9a83cc2854108a2b860f25e6e7e8e/packages/opencode/src/auth/index.ts#L10-L88)

또한 token refresh 후 store 갱신, account ID 추출, authorization/`ChatGPT-Account-Id` header, Codex backend endpoint rewrite까지 host가 소유한다. [`refresh and request adapter`](https://github.com/anomalyco/opencode/blob/0a601cf334b9a83cc2854108a2b860f25e6e7e8e/packages/opencode/src/plugin/openai/codex.ts#L320-L425) 이 방식은 OpenCode의 provider architecture에는 맞을 수 있지만, AY-PLE에서 official Runtime을 우회하고 비공개 성격의 backend coupling을 다시 만드는 방향이다.

### OpenClaw: external token handoff도 작은 우회로가 아니다

OpenClaw는 auth profile을 `chatgptAuthTokens` params로 변환해 App Server에 주입하고, App Server의 `account/chatgptAuthTokens/refresh` request를 host handler가 받아 다시 profile refresh를 수행한다. [`profile → external token params`](https://github.com/openclaw/openclaw/blob/685fb849bbf43963107d20d32cac89239fe0e807/extensions/codex/src/app-server/auth-bridge.ts#L183-L250), [`login handoff와 account check`](https://github.com/openclaw/openclaw/blob/685fb849bbf43963107d20d32cac89239fe0e807/extensions/codex/src/app-server/auth-bridge.ts#L473-L555), [`refresh handler`](https://github.com/openclaw/openclaw/blob/685fb849bbf43963107d20d32cac89239fe0e807/extensions/codex/src/app-server/client-runtime.ts#L19-L48)

Exact official protocol은 `chatgptAuthTokens`를 unstable OpenAI-internal surface라고 표시한다. [`external token protocol warning`](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/app-server-protocol/src/protocol/v2/account.rs#L87-L107) OpenClaw의 multi-provider/profile 요구에는 이유가 있지만, AY-PLE first preview가 이 경로를 쓰면 OAuth owner를 다시 앱으로 끌어온다.

### Codexia: managed start를 completion으로 오인하는 gap

Codexia backend는 `account/read`와 `account/login/start`를 App Server에 전달한다. Frontend는 ChatGPT login을 시작하고 URL을 열지만, start RPC가 반환되자 상태 문구를 “succeeded”로 바꾸고 `isLoggingIn`을 해제한다. Completion listener도 payload success만 보고 login ID를 현재 attempt와 상관시키지 않는다. [`account commands`](https://github.com/milisp/codexia/blob/dfe82683734eb3fdf8e07d6ad20cd83021ac11a0/src-tauri/src/commands/codex/account.rs#L12-L35), [`CodexAuth UI`](https://github.com/milisp/codexia/blob/dfe82683734eb3fdf8e07d6ad20cd83021ac11a0/src/components/codex/CodexAuth.tsx#L41-L89)

Managed boundary 선택은 donor지만 lifecycle 구현은 AY-PLE 요구보다 얕다. Start와 completion을 분리하고 matching ID를 Server/Runtime에서 소유해야 한다.

### CodePilot: helper가 맞아도 UI가 authority를 우회할 수 있다

CodePilot helper는 refresh option이 있는 account read, matching `loginId` completion wait, cancel, logout을 제공한다. [`account helpers`](https://github.com/op7418/CodePilot/blob/215c8f93d213c904a6903b86e7c0a93dab905a16/src/lib/codex/account.ts#L30-L177) 그러나 production dialog는 사용자가 “I’ve completed login”을 누르면 waiter 결과 없이 account/model을 refetch하고, Browser가 native `loginId`를 cancel endpoint query로 돌려준다. [`ProviderManager login actions`](https://github.com/op7418/CodePilot/blob/215c8f93d213c904a6903b86e7c0a93dab905a16/src/components/settings/ProviderManager.tsx#L755-L818), [`manual completion dialog`](https://github.com/op7418/CodePilot/blob/215c8f93d213c904a6903b86e7c0a93dab905a16/src/components/settings/ProviderManager.tsx#L1545-L1609)

AY-PLE은 helper의 matching/cancel/logout 의미만 donor로 삼고, UI action을 인증 authority로 만들지 않는다.

## 구현·검증에 필요한 evidence

### Contract와 fake Runtime

- start response만으로 `connected`가 되지 않는다.
- matching completion이 아닌 다른 attempt notification은 무시한다.
- completion이 start response 직후 waiter보다 먼저 와도 official pending route가 보존한다.
- `account/login/completed`가 bridge notification opt-out set에 들어가지 않는다.
- Start command는 handle/background waiter를 만들고 normal response deadline 안에 반환하며, status command도 짧게 `pending` 또는 terminal을 반환한다.
- 10분 completion 대기는 Node↔Python pending RPC가 아니고, 30초 일반 response timeout을 변경하지 않는다.
- Status response가 유실돼도 terminal이 유지되고, exact-attempt release acknowledgement의 response가 유실돼도 idempotent retry가 성공한다.
- matching success 뒤 account reload race를 bounded retry로 수렴시킨다.
- cancel-before-completion, completion-before-cancel, cancel `notFound`를 각각 검증한다.
- 두 번째 start는 upstream을 호출하지 않고 기존 `login_pending` snapshot을 idempotently 반환한다.
- stale Runtime generation의 completion이 current state를 바꾸지 않는다.
- logout response 뒤 fresh account read가 null이 아니면 logged-out을 합성하지 않는다.

### Exact Runtime process evidence

- bootstrap cwd와 네 controlled Runtime directory가 canonical sibling으로 분리된다.
- global `~/.codex`의 file roster·digest·mtime이 login/relaunch/logout 동안 바뀌지 않는다.
- app-managed `CODEX_HOME` 외 AY product response·Browser bundle storage·workspace·temp·public log에 token/OAuth-code pattern이 없다.
- normal login request가 hosted success option을 보내며, `Open Codex` page 후 사용자가 AY-PLE 탭으로 돌아오면 별도 완료 action 없이 자동으로 connected에 수렴한다.
- 기존 Codex listener의 `/cancel` interference와 `1455` reclaim, 취소되지 않는 unrelated `1455` occupant에서 `1457` fallback, 두 port가 모두 막혔을 때 safe start failure를 각각 검증한다.
- active login 중 CLI signal이 callback listener, Python, native App Server를 bounded reap한다.
- Runtime A close 뒤 same `CODEX_HOME`을 쓰는 workspace Runtime B에서 account가 유지된다.
- 정상 logout은 같은 Runtime에서 fresh read가 account absent다. Cancel terminal이 오지 않는 fixture에서는 callback Runtime close→auth-only recreate→logout 뒤 absent이며, 후속 relaunch도 absent다.

### Manual live smoke

```text
clean appDataRoot
  → app launch
  → Codex 연결
  → official browser login
  → matching completion
  → account.type === chatgpt
  → app restart
  → account connected
  → new SemesterWorkspace scaffold
  → Runtime close/recreate
  → same account connected
  → logout
  → app restart
  → login_required
```

Live smoke는 token, OAuth code, callback query나 auth URL을 evidence artifact에 남기지 않는다. Timestamp, safe phase, process identity, account type, exit status, forbidden-surface scan 결과만 기록한다.

## 최종 판단

다른 공개 앱들의 구현은 “Codex OAuth가 단순한 HTTP 세 요청”이 아니라는 점을 보여준다. Hermes와 OpenCode는 callback, polling, refresh, secure storage, backend request adapter까지 제품이 소유하게 되고, OpenClaw의 external-token bridge도 별도 auth subsystem을 요구한다. Codexia와 CodePilot은 official App Server managed flow가 올바른 경계임을 보여주지만, start/completion 상관관계와 cancel/logout authority를 UI에 느슨하게 두면 쉽게 잘못된다.

AY-PLE의 가장 작은 확장 가능한 seam은 다음으로 고정할 수 있다.

```text
official managed browser login
+ active attempt에 한정된 Runtime-owned matching handle/background waiter
+ short typed status polling과 app-owned transient attempt state
+ active attempt의 post-completion fresh account verification
+ launch·relaunch의 fresh account read authority
+ stable app-managed CODEX_HOME
+ pre-workspace Runtime → bounded recreate
```

따라서 Ticket 008은 별도 OAuth service를 만드는 티켓이 아니라, 이미 뚫어 둔 official SDK seam을 **제품 수준의 lifecycle과 workspace 전환으로 완성하는 bounded implementation**을 정의하는 티켓이다.
