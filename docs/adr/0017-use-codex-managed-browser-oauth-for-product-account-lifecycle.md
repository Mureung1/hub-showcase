# 제품 account lifecycle에 Codex-managed Browser OAuth를 사용한다

분류: 활성

성숙도: 채택

관련 결정: [ADR 0006 — package·app data·SemesterWorkspace root를 분리한다](0006-separate-package-app-data-and-semester-workspace-roots.md), [ADR 0011 — Official Codex Python SDK를 재사용한다](0011-reuse-official-codex-python-sdk-for-chat-shell.md), [ADR 0014 — SemesterWorkspace를 app-owned normalized scaffold로 생성한다](0014-create-app-owned-normalized-semester-workspaces.md), [ADR 0016 — Exact npx application과 verified Runtime release를 분리한다](0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)

역사적 선행 증거: [ADR 0001 — Runtime Ownership Spike에서 file auth store를 사용한다](0001-use-file-auth-store-for-runtime-spike.md). ADR 0001은 당시 격리 증거이며 이 제품 결정을 소유하지 않는다.

## 맥락

현재 development·dogfood 경로는 외부 CLI에서 준비한 격리 credential로 Account Readiness를 읽을 수 있지만, 첫 public preview의 local UI에는 login start·cancel·logout·reauth와 workspace 없는 first-run account lifecycle이 없다. Public `npx` 진입점이 전역 Codex 상태나 별도 수동 CLI setup에 의존하면 같은 application이 사용자 환경에 따라 다른 credential authority를 사용하고, `SemesterWorkspace` 생성 전에는 Runtime을 시작할 안전한 `cwd`도 없다.

OAuth endpoint, PKCE, token exchange, refresh-token rotation과 credential schema를 AY-PLE이 다시 구현하면 official Codex Runtime 옆에 두 번째 auth engine을 만들게 된다. 반대로 global `~/.codex`를 import하거나 함께 쓰면 AY-PLE account 수명, 다른 Codex client와의 token rotation, app update·logout의 책임이 분리되지 않는다. 첫 preview에는 official Codex capability를 보존하면서 Browser에는 학생이 이해할 account lifecycle만 보이는 하나의 제품 seam이 필요하다.

## 결정

### Codex가 OAuth와 credential을 소유한다

- 첫 public preview의 유일한 account 연결 방식은 official Codex App Server의 managed ChatGPT Browser login이다. Codex가 authorize·callback·token exchange, credential persistence·refresh와 logout을 소유한다.
- AY-PLE은 OAuth endpoint나 token file format을 구현·호출·parse하지 않는다. `codex login` shell-out, direct PKCE·device flow, `chatgptAuthTokens`, API key와 global `~/.codex` import를 public fallback으로 제공하지 않는다.
- AY-PLE의 account lifecycle Module은 official Runtime integration을 내부에 숨기고 transient Browser-safe account projection과 명시적 login·cancel·logout 결과만 제품에 투영한다. 실제 두 번째 provider가 생기기 전에는 generic auth-provider interface나 다중 adapter를 만들지 않는다.

### App-scoped credential authority를 Runtime generation과 분리한다

- First preview는 stable `appDataRoot` 아래 app-managed `CODEX_HOME`에 explicit file credential store를 사용한다. Codex만 그 store를 읽고 쓰며 `packageRoot`, `SemesterWorkspace`, ambient home과 분리한다. Product composition은 credential root와 file을 effective OS user에게만 노출되도록 생성·검증하고 unsafe ownership·permission·symlink에서는 fail closed한다.
- 같은 app-managed `CODEX_HOME`은 auth-only bootstrap Runtime, workspace-bound Runtime, relaunch와 supported application update 사이에서 유지한다. Account는 Course나 workspace별 상태가 아니라 한 canonical `appDataRoot` profile의 Runtime account다.
- Keyring·`auto` 같은 backend로의 전환은 prompt, credential migration과 rollback을 함께 다루는 별도 결정 없이는 silent하게 수행하지 않는다. Runtime update·rollback이 current store를 이해하지 못하면 AY-PLE이 credential bytes를 변환하지 않고 explicit reconnect로 fail closed하며 workspace와 학업 상태는 보존한다.

### Fresh managed account read가 제품 authority다

- Process launch·relaunch, reauth, logout과 Runtime generation 전환 뒤 current Runtime의 fresh managed account read가 연결 상태의 authority다. Credential file 존재, 별도 `authenticated` boolean, setup receipt와 Browser action은 account proof가 아니다.
- 같은 process에서 시작한 active login attempt는 matching official completion과 그 뒤 fresh ChatGPT account read가 모두 확인되어야 성공한다. Launch·relaunch에는 복구할 transient completion이 없으므로 fresh account read만 사용한다.
- Login attempt와 native correlation은 한 Runtime generation 내부에만 존재하는 transient state다. Server는 한 active product lease만 직렬화하고 Browser에는 coarse lifecycle projection만 보낸다. Cancel·failure 뒤에도 fresh read로 수렴하고 workspace를 삭제하거나 auth 실패와 학업 state를 결합하지 않는다.
- Explicit logout은 새 operation을 막고 pending login을 정산하거나 callback을 소유한 Runtime generation을 완전히 종료한 뒤, live pending attempt가 없는 generation에서만 official logout을 수행한다. 닫힌 stale generation은 이후 account state를 다시 바꿀 수 없어야 하며 logout 결과도 fresh read로 확인한다.

### Product surface와 official OAuth surface를 분리한다

- Official Runtime의 short-lived loopback OAuth callback은 AY-PLE의 dynamic product Origin이나 별도 AY-PLE OAuth server가 아니다. AY-PLE은 callback query, authorization code와 token을 가로채지 않는다.
- OAuth credential bytes는 AY-PLE product Origin·API, Browser bundle state·storage, `SemesterWorkspace`, product receipt와 public log를 통과하지 않는다. 다만 Browser가 AY-PLE 밖의 official auth·success page를 방문하므로 모든 Browser address가 token·code를 포함하지 않는다고 주장하지 않는다.
- Official auth·success surface는 provider가 소유한다. AY-PLE은 이를 제품 return page로 표시하거나 검증되지 않은 자동 redirect·tab close를 약속하지 않는다. 학생이 보는 결과는 Product Brief가, 선택한 official flow의 exact return behavior와 copy는 resulting implementation spec이 소유한다.

### Workspace 없는 account lifecycle을 별도 Runtime role로 시작한다

- `SemesterWorkspace`가 생기기 전 account read·login·cancel·logout은 owner-only app-data의 inert non-workspace `cwd`를 사용하는 auth-only bootstrap Runtime에서만 수행한다. 이 directory를 workspace나 registry identity로 취급하지 않고 thread·turn·학업 action을 열지 않는다.
- App-owned `SemesterWorkspace`가 scaffold·validation·registry admission을 통과하면 active auth operation을 정산하고 bootstrap Runtime process tree를 완전히 닫는다. 같은 app-managed Runtime homes를 사용하되 admitted workspace를 exact `cwd`로 하는 새 Runtime generation에서 account를 다시 확인한 뒤에만 `Semester Ready`를 허용한다.
- Ready relaunch는 admitted workspace를 먼저 재검증하고 workspace-bound Runtime을 바로 시작한다. Account가 만료되거나 없어도 workspace를 보존한 채 같은 lifecycle의 reconnect로 돌아간다.

Exact Browser state enum·DTO·endpoint, native correlation, callback port, SDK option, poll·retry·deadline, patch 번호와 test fixture는 미구현 target에서는 resulting implementation spec이, 구현 뒤에는 관련 package code·README가 소유한다. 이 ADR은 그 값이 바뀌어도 유지해야 할 authority와 lifecycle만 고정한다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| OAuth·PKCE·refresh와 token store를 AY-PLE이 직접 구현 | 거절 | Official Runtime과 두 번째 auth engine을 만들고 private protocol·rotation·secure storage 책임을 제품이 소유한다. |
| Global `~/.codex` 또는 다른 Codex client credential을 import·공유 | 거절 | App-scoped logout·update·rotation authority가 다른 client와 충돌하고 first-run 격리가 깨진다. |
| CLI shell-out 또는 device/API-key/external-token fallback | 거절 | Browser product lifecycle 밖에 별도 setup·secret 입력·지원 matrix를 만든다. |
| Managed Browser login과 keyring/`auto`를 첫 store로 사용 | 보류 | OS prompt, clean-machine 재현성과 backend migration을 first preview 안에서 동시에 해결해야 한다. |
| Managed Browser login과 app-scoped explicit file store | 채택 | OAuth·refresh는 Codex에 남기면서 account lifecycle, root 수명과 clean-machine evidence를 한 제품 seam에서 검증할 수 있다. |
| 다중 provider용 generic auth abstraction을 먼저 추가 | 거절 | 실제 두 번째 adapter 없이 interface만 넓히고 official managed path의 lifecycle locality를 잃는다. |

## 결과

첫 public preview 구현은 current read-only Account Readiness를 login·cancel·logout·reauth와 pre-workspace Runtime transition까지 확장해야 한다. Product tests는 Browser-safe account lifecycle Module의 observable state를, Runtime tests는 official SDK integration·process generation·credential isolation을 각각 같은 seam에서 검증한다. AY-PLE은 credential migration utility나 자체 OAuth service를 만들지 않는다.

`appDataRoot` 손실은 reconnect와 registry recovery를 요구할 수 있지만 `SemesterWorkspace`와 확인된 학업 상태의 손실을 뜻하지 않는다. Explicit logout도 workspace를 삭제하지 않는다. Public privacy 설명은 local-first가 provider 통신 없는 offline app이라는 뜻이 아니며, official OAuth와 Codex 실행의 OpenAI 전송 경계를 함께 알린다.

이 ADR은 채택한 public target이며 아직 구현되지 않았다. Current Runtime은 workspace-bound factory와 generic Account Readiness read만 제공하고, current dogfood helper는 외부 device-auth login을 안내한다. 정확한 current gap과 구현 후 검증 결과는 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md), 기술 mapping은 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md), 작업 순서와 완료 조건은 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
