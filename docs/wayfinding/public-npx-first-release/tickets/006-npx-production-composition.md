# 006 — npx production composition을 고른다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md)

## Question

현재 React·Express·TypeScript ESM·supervised Python/Codex Runtime을 public npm executable로 제공하면서 repository·system Python 없이 product-only HTTP contract, exact Origin guard, three-root invariant와 child-process cleanup을 보존하려면 npm package/bin, built Server·UI inclusion, exact supported lane인 macOS arm64 13.5+·Node `>=22.12 <23`·npm 10.x·Chrome/Chromium preflight, loopback port·same-origin static serving, app data default, browser open, duplicate invocation과 signal shutdown을 어떤 production composition이 소유해야 하는가?

## Answer

하나의 public application package와 하나의 foreground Node host로 고정한다. 조사 근거와 현재 코드 audit은 [npx production composition 공식 근거 조사](../assets/npx-production-composition-research.md)에 기록했다.

```text
npx ay-ple@<release-version>
└─ ay-ple foreground Node supervisor
   ├─ preflight·three-root·single-instance authority
   ├─ Ticket 007의 verified Runtime resolver
   └─ 127.0.0.1:<OS-assigned-port>의 Express listener 하나
      ├─ built Chat Shell
      ├─ /api/product/*
      ├─ token-guarded private /api/product-mcp/*
      └─ supervised Python bridge → native Codex app-server
```

Vite·`concurrently`·workspace npm script·repository checkout·system Python은 production process tree에 들어가지 않는다. Browser는 이 tree의 child나 lifetime owner가 아니며, `npx`/npm은 invocation wrapper이고 그 아래의 foreground `ay-ple` bin Node process가 listener와 Runtime의 유일한 supervisor다.

### Public package와 명령

| 항목 | 결정 |
| --- | --- |
| Distribution unit | 새 public application workspace 하나를 npm package `ay-ple`로 배포한다. 내부 `@ay-ple/*` workspace는 build input이지 별도 public package나 `file:` runtime dependency가 아니다. |
| Executable | `#!/usr/bin/env node`인 `ay-ple` bin 하나만 공개한다. Package와 bin 이름을 같게 해 `--package` plumbing을 만들지 않는다. |
| Landing command | Landing과 public README는 release manifest의 실제 version을 넣은 `npx ay-ple@<release-version>`을 보여준다. `<release-version>`은 사용자가 복사하는 literal이 아니라 예를 들어 `0.1.0` 같은 immutable exact version 자리다. `@latest`와 bare package name은 supported public command로 제시하지 않는다. Exact spec은 다른 release가 별도 npx install directory를 쓰게 해 실행 중 host의 package asset을 moving tag reification이 바꾸지 못하게 한다. 같은 exact version의 local dependency가 선택될 가능성까지 없애지는 않으므로 npm project 밖 terminal에서 실행하도록 안내한다. `--yes`는 넣지 않는다. Interactive remote install 때의 conditional npm prompt는 UX confirmation일 뿐 security boundary가 아니다. |
| Release smoke command | 자동화와 RC 증거는 같은 version의 `npx --yes ay-ple@<release-version>`을 사용한다. Landing, packed artifact와 publication evidence가 모두 한 immutable version을 가리켜야 한다. |
| Registry identity | 2026-07-22 조사 시 `ay-ple`은 npm registry에서 `E404`였지만 이는 예약이 아니다. Publication 직전에 ownership·availability를 다시 확인하고, 사용할 수 없으면 임의의 fallback 이름으로 publish하지 않고 distribution 결정을 다시 연다. |

Package metadata는 `private: false`, `type: module`, single `bin`, positive `files`, `engines.node: ">=22.12 <23"`, `engines.npm: ">=10 <11"`, `os: ["darwin"]`, `cpu: ["arm64"]`, `license: "Apache-2.0"`, `repository`·`homepage`·`bugs`를 명시한다. Normal unsupported OS·CPU의 첫 거절은 npm metadata가 bin 실행 전에 소유한다. Bin의 재검사는 `--force`, direct execution, tampered/cached install을 방어하고, launcher가 실제로 실행된 경우에만 AY-PLE의 발견값·지원값·다음 행동 진단을 보장한다. `engines` warning만으로 Node/npm compatibility를 강제하지 않는다.

Consumer install에는 `preinstall`·`install`·`postinstall`을 두지 않는다. TypeScript와 React build는 publisher가 끝내며 Runtime download는 package installation에 숨기지 않고 launcher의 observable first-run phase로 실행한다. First-party Server·Runtime adapter·product contract code는 하나의 prebuilt Node application graph로 package에 조립하고, Express 같은 실제 Node runtime dependency만 exact registry dependency와 published `npm-shrinkwrap.json`으로 잠근다. Public tarball이 local workspace symlink나 source build에 기대지 않게 한다.

Tarball의 positive allowlist는 다음 논리 표면만 포함한다.

- `package.json`과 published `npm-shrinkwrap.json`
- bin과 prebuilt Node application host
- built Chat Shell의 `index.html`과 hashed static asset
- launcher가 읽는 compatibility·package resource descriptor
- package 자체의 `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES`, original license tree, SBOM·provenance evidence

Python/native Runtime bytes, `.artifacts/**`, TypeScript source·source map, test·fixture, dogfood·materializer·development script, Vite·Playwright·`tsx`·`concurrently`, vendored source checkout은 제외한다. Exact legal roster와 pack/publication gate는 Tickets 003a·015가 소유한다.

### 하나의 깊은 production host

Public bin은 여섯 개 Runtime path나 Server 내부 bootstrap을 아는 얕은 shell이 아니다. Production host module 하나가 preflight, root resolution, Runtime resolver 호출, listener, browser open, instance ownership과 shutdown을 감추고 `run`/`close` 수준의 작은 interface를 제공한다. 현재 `createServerApplication()`의 bounded `close()`, product-only router, exact Origin guard, Runtime process-group reap과 three-root validator는 donor로 재사용한다.

반대로 다음 development behavior는 production host에서 제거한다.

- import 시점의 ambient `dotenv.config()`와 `process.cwd()` 기반 authority
- fixed `3000`/`4173`, Vite proxy·preview server와 `concurrently`
- repository-relative `.artifacts`·fixture·sample workspace 자동 선택
- workspace가 없다는 이유로 OAuth/setup용 host 자체를 시작하지 못하는 bootstrap

Application factory는 environment loading과 CLI main에서 분리한 pure composition이어야 한다. Public execution은 caller의 `.env`, cwd, `PORT`, `PATH`의 system Python이나 repository-relative path를 설정 authority로 읽지 않는다. Test/support용 root override가 필요하면 명시적인 CLI option으로만 받고 정상 product command의 implicit fallback으로 쓰지 않는다.

### Three-root와 preflight

| Root | Authority와 기본값 |
| --- | --- |
| `packageRoot` | 실행 중인 ESM module의 `import.meta.url`을 `fileURLToPath()`로 바꾸고 package directory를 `realpath()`해 구한다. 모든 resource path는 이 canonical root containment를 다시 검사한다. Exact-version npx install을 process lifetime 동안 read-only resource로 취급한다. |
| `appDataRoot` | caller-controlled `$HOME`이 아니라 effective OS user record의 `os.userInfo().homedir`를 기준으로 canonical default `~/Library/Application Support/AY-PLE`을 계산하고 owner-only `0700`으로 생성한다. Runtime state, app-managed Codex home, setup state, workspace registry와 instance coordination은 여기 아래에서 서로 분리한다. |
| `workspaceRoot` | 첫 setup 전에는 없다. 이후에도 app이 scaffold하고 `WorkspaceManifest`로 검증한 registry selection만 받으며 cwd나 기존 arbitrary folder를 workspace로 암묵 채택하지 않는다. |

Launcher는 persistent mutation과 Runtime download 전에 다음을 한 번에 검사하고, 발견값·지원값·다음 행동을 terminal에 출력한다.

- `process.platform === 'darwin'`, `process.arch === 'arm64'`
- `/usr/bin/sw_vers -productVersion` 기준 macOS 13.5 이상
- 실행 중인 Node `>=22.12 <23`
- `npm_config_user_agent`가 명시적으로 보고하는 npm 10.x. 이 값은 조작 가능한 launch hint이지 실제 parent executable의 security proof가 아니다. Public `npx` path에서는 누락·불일치를 unsupported invocation으로 진단하고 arbitrary `PATH` npm을 대신 실행하지 않으며, 실제 npm 10.x 지원 주장은 outer `npx` clean smoke가 증명한다.
- package의 compatibility descriptor가 허용하는 Google Chrome 또는 Chromium bundle과 version

`최신 browser`와 온라인으로 동일한지 launcher가 매번 판정한다고 약속하지 않는다. Package release가 tested minimum major를 descriptor에 고정하고 Ticket 015가 당시 current stable clean smoke를 기록한다. 사용자는 최신 Chrome/Chromium을 prerequisite로 안내받고, launcher는 설치된 supported bundle identity와 최소 version을 검증한다.

첫 preview의 non-mutating Browser discovery는 general LaunchServices search로 넓히지 않는다. 같은 `os.userInfo().homedir`의 OS user root를 사용해 `/Applications/Google Chrome.app`, `<home>/Applications/Google Chrome.app`, `/Applications/Chromium.app`, `<home>/Applications/Chromium.app` 순서의 exact candidate만 canonicalize한다. `/usr/bin/plutil -extract`로 각 `Contents/Info.plist`의 `CFBundleIdentifier`와 `CFBundleShortVersionString`을 읽어 expected ID·minimum major와 일치하는 첫 bundle을 선택한다. 다른 위치는 unsupported로 진단한다.

### Single-origin listener와 Browser

- Production host는 bind-first two-phase composition을 소유한다. 먼저 bootstrap delegate가 아직 ready가 아닌 요청을 `503`으로 닫는 bare HTTP server를 explicit `127.0.0.1`과 port `0`으로 한 번만 bind한다. 실제 port를 읽어 `http://127.0.0.1:<actual-port>`를 만든 뒤 그 exact Origin으로 Runtime source·product router·static app을 조립하고 같은 listener의 delegate를 atomic하게 교체한다. Port를 probe한 뒤 닫고 다시 bind하는 race는 허용하지 않는다.
- Listen 뒤 얻은 exact origin을 유일한 Browser URL, instance receipt와 mutation Origin authority로 고정한다. 이 refactor 때문에 현재 `createServerApplication()`은 listener 생성과 pure Express/application composition을 분리해야 한다.
- Built UI와 `/api/product/*`를 이 listener에서 제공해 CORS를 만들지 않는다. Workspace-bound Codex tool loop에 필요한 `/api/product-mcp/*`도 별도 public contract가 아니라 현재 random token·loopback guard를 보존한 private route로 같은 listener에 둔다. Unexpected `Host`/authority는 모든 route에서 거절하고 기존 loopback socket·absent-or-exact `Origin` product mutation guard를 유지한다.
- Hashed asset은 immutable cache, `index.html`은 `no-store`로 응답한다. SPA fallback은 `/api/*`를 절대 삼키지 않으며 removed `/api/codex-chat/*`와 raw engine protocol은 계속 `404`다.
- Host는 validated workspace가 없어도 OAuth/setup UI를 열 수 있다. Ticket 007의 Runtime artifact verification은 Browser open 전에 끝내되 Python/native Runtime process readiness를 요구하지 않는다. Supervisor는 active Runtime을 0개 또는 1개만 허용하고 OAuth 요청 때 lazy start하거나 workspace admission 뒤 serial close→recreate할 수 있어야 한다. Pre-workspace Runtime cwd와 workspace admission 뒤 전환 contract는 Ticket 008이 결정하며, 임시 directory를 `SemesterWorkspace`로 위장하지 않는다. Product thread 생성, private MCP binding과 workspace-bound Codex turn은 validated active workspace 전에는 허용하지 않는다.
- Verified Runtime artifact와 product host readiness가 성공한 뒤 `/usr/bin/open -a <verified-canonical-app-path> <exact-origin>`을 shell 없이 실행한다. 선택 순서는 Google Chrome, Chromium이다. 검증한 bundle path와 실제 open target을 같게 하며 Chrome 자체를 spawn·kill하거나 Browser/tab close를 app shutdown으로 해석하지 않는다.
- Browser open이 실패하면 exact URL과 해결 행동을 terminal에 남기되 startup을 성공으로 합성하지 않는다. 이미 시작한 listener·Runtime·lease를 닫고 non-zero로 종료해 orphan local server를 남기지 않는다.

### `appDataRoot` 단위 single instance

동시에 여러 invocation이 같은 OAuth·Runtime·setup state를 수정하지 못하도록 canonical `appDataRoot`마다 active instance 하나만 허용한다.

1. 첫 실행의 coordination bootstrap으로 canonical `appDataRoot`를 owner-only로 idempotent create·validate한다. Symlink·다른 owner·broader permission은 fail closed한다. 그 뒤 다른 persistent state mutation 전에 그 root 아래 owner-only lease directory를 atomic하게 획득한다.
2. Receipt는 format version, random nonce, PID와 process-start identity, launcher version, lifecycle phase를 기록하고 listen 뒤 exact origin을 추가한다. Receipt file은 owner-only다.
3. 같은 version의 두 번째 invocation이 `starting` owner를 만나면 bounded wait한다. `running` owner의 private loopback nonce handshake가 성공하면 새 Runtime을 만들지 않고 기존 origin만 Browser에서 연다. Secondary의 `/usr/bin/open`이 성공할 때만 0으로 끝나며, 실패하면 primary의 listener·Runtime·lease는 건드리지 않고 non-zero로 끝난다.
4. 다른 launcher version이면 silent in-place update나 두 번째 instance 대신 running-version conflict와 종료·재실행 안내를 낸다.
5. Stale recovery는 descriptor digest·nonce가 일치하는 lease를 compare-and-rename해 quarantine한 뒤에만 진행한다. Age나 PID만으로 stale을 선언하거나 다른 PID에 signal을 보내지 않는다. Malformed receipt, live-but-unresponsive owner, unknown version은 fail closed한다.
6. Primary는 전체 listener·Runtime cleanup 뒤 자신이 획득한 nonce가 여전히 일치할 때만 lease를 제거한다.

Abrupt primary death 뒤 Python/native process tree가 pipe EOF로 사라지고 PID/start identity도 owner 부재를 증명한 뒤 stale lease를 안전하게 회수하는 macOS smoke가 통과하기 전에는 automatic stale reclaim을 켜지 않는다. 그 전의 ambiguous state는 `recovery_required`로 남기며 arbitrary process를 죽이지 않는다.

### Foreground lifecycle과 종료

`SIGINT`, `SIGTERM`, `SIGHUP`, startup exception, fatal Runtime exit는 하나의 idempotent bounded shutdown promise로 합류한다.

1. 새 HTTP admission과 새 product operation을 막는다.
2. Listener를 닫고 active connection을 bounded drain한 뒤 필요하면 force-close한다.
3. 현재 Server `close()`를 통해 Runtime의 `SIGTERM → grace → SIGKILL` process-group reap과 stdio close를 끝까지 확인한다.
4. Matching instance lease를 마지막에 제거한다.
5. `SIGINT=130`, `SIGTERM=143`, `SIGHUP=129`의 conventional status 또는 fatal failure의 non-zero status를 보존한다.

Signal handler를 설치하고 즉시 `process.exit()`하거나 cleanup 뒤 self-signal하지 않는다. Bounded cleanup 완료 후 `process.exitCode`로 위 status를 내고 event loop를 정상 drain하며 `process.on('exit')`에서 async cleanup을 시작하지 않는다. 두 번째 signal도 같은 bounded cleanup에 join하고 이를 우회한 hard exit를 만들지 않는다. `/usr/bin/open`은 짧게 기다리는 helper일 뿐이고 Runtime child는 `unref()`하지 않는다.

### 후속 ticket에 넘기는 seam

| Ticket | Ticket 006이 고정 입력으로 넘기는 것 | 다시 열지 않을 것 |
| --- | --- | --- |
| 007 | Thin npm host가 `appDataRoot`와 cancellation/reporting을 주고 verified immutable `runtimeRoot`·Runtime identity를 받는 resolver seam | npm package composition, public command, listener·browser·instance lifecycle |
| 008 | Workspace 없이 시작 가능한 single-origin host, verified-but-not-yet-started Runtime과 app-managed state, dynamic exact Origin. OAuth용 lazy Runtime의 non-workspace cwd와 workspace admission 전환을 결정한다. | AY-PLE-owned 별도 OAuth web server·port 또는 global `~/.codex` authority. Official Codex가 managed browser login 내부에서 여는 loopback callback listener는 Ticket 008의 runtime dependency다. |
| 009–010 | app-created workspace만 registry에 들어가는 three-root host | cwd/existing folder를 workspace로 채택하는 bootstrap |
| 011 | Foreground supervisor와 `appDataRoot` instance lease를 process-level baseline으로 사용 | duplicate process ownership과 signal protocol |
| 013 | Release manifest의 exact version을 넣는 Landing command `npx ay-ple@<release-version>`, conditional npm prompt, foreground terminal과 local dynamic URL | package/bin 이름, moving tag 사용 여부와 `--yes` 여부 |
| 014–016 | One package/one host/one Runtime tree의 file·process·pack smoke surface | production topology 자체 |

Runtime archive URL·version pin·size·hash·download/cache·atomic extraction·corrupt repair·offline/yank/rollback은 Ticket 007이 소유한다. OAuth state machine은 008, Workspace scaffold는 009–010, setup durability는 011, publication ordering과 cross-artifact evidence는 015, clean Mac 전체 여정은 016이 소유한다.

Exact public `npx` command 자체의 offline resolution은 보장하지 않는다. npm cache는 AY-PLE의 durable state가 아니며 map이 npm registry network를 prerequisite로 둔다. Ticket 007의 `offline rerun`은 npm이 package/bin을 이미 resolve해 실행한 뒤 verified Runtime cache를 재다운로드 없이 재사용하는 범위다.

### 구현 시 blocking evidence

- `npm pack` tarball만 isolated temp에 설치해 repository·system Python·consumer build 없이 실행한다.
- Positive pack roster와 exact production dependency closure를 검사한다.
- Caller cwd의 hostile `.env`와 occupied unrelated port가 authority가 되지 않음을 검증한다.
- UI와 product API의 same-origin, exact Host/Origin guard와 legacy API `404`를 검증한다.
- Concurrent invocation이 Server·Runtime 한 tree만 만들고 기존 origin을 다시 여는지 검증한다.
- Unsupported platform/version/browser와 Browser-open failure가 persistent mutation·orphan 없이 끝나는지 검증한다.
- Direct bin뿐 아니라 outer `npx` command에 보낸 `SIGINT`·`SIGTERM`·`SIGHUP`의 observed status, startup failure와 primary Node `SIGKILL` 뒤 listener·Python·native·lease의 소멸 및 safe relaunch를 실제 process evidence로 검증한다.
