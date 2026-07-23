# AY-PLE public npx 첫 출시

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE에는 이미 Official Codex Python SDK를 사용하는 supervised Runtime, local Express Server, Browser product contract와 First Assignment의 `SourceSelection → StatePatch → Review → confirmed SemesterModel` 수직 흐름이 있다. 하지만 현재 제품은 repository checkout, 미리 materialize한 Runtime, 개발용 fixture workspace와 외부 로그인 helper를 요구한다. 처음 쓰는 학생이 공식 제품 진입점에서 AY-PLE을 실행하고, Codex를 연결하고, 자신만의 학기 공간을 안전하게 만든 뒤 다시 여는 public journey는 아직 없다.

현재 chooser는 임의의 기존 directory를 current v2 store로 열고, Browser root는 곧바로 3-pane First Assignment workbench를 렌더링한다. 이 상태를 public release로 포장하면 다음 문제가 생긴다.

- 기존 자료 폴더와 AY-PLE이 소유하는 정규화된 `SemesterWorkspace`의 경계가 무너진다.
- OAuth credential, Runtime delivery, app data와 workspace의 authority가 public launcher에 명확히 연결되지 않는다.
- setup 중 interruption, duplicate launch, partial scaffold와 Runtime transition failure를 안전하게 복구할 계약이 없다.
- 현재 구현된 학업 kernel을 새 public workspace에서 사용할 수 있는 완성 기능처럼 과장하게 된다.
- exact source, npm application, Runtime asset, Landing command와 clean-machine evidence가 하나의 release identity로 묶이지 않는다.

첫 public preview에는 “모든 학업 기능”이 아니라, 학생이 공식 Landing에서 exact `npx` 명령을 실행해 Codex를 연결하고 app-owned 학기 공간을 준비한 뒤 같은 명령으로 다시 열 수 있다는 하나의 신뢰 가능한 제품 경로가 필요하다.

## Solution

첫 public preview의 공식 경로를 다음으로 고정한다.

```text
Public Landing
→ exact npx application
→ supported-lane preflight
→ exact descriptor가 고른 verified Runtime
→ dynamic loopback local AY-PLE Browser UI
→ Codex-managed ChatGPT Browser OAuth
→ A Guided Setup에서 학년·학기·parent 위치·folder name 확인
→ 승인된 새 v3 SemesterWorkspace scaffold
→ workspace instruction/Skill bundle과 static context conflict 검증
→ auth-only Runtime 완전 종료
→ workspace Runtime 시작
→ private native config/Skill effective-context 검증과 fresh ChatGPT account read
→ C Compact status center의 학기 공간 준비 완료
→ same-version ready-relaunch
```

Public application은 `npx ay-ple@<exact-version>`으로 실행되는 하나의 npm package와 foreground Node host다. Host는 repository, Vite, system Python과 ambient Codex state에 의존하지 않고 prebuilt UI·Server와 exact Runtime descriptor를 조합한다. Official Codex App Server가 OAuth·credential persistence·refresh를 계속 소유하며, AY-PLE은 Browser-safe account lifecycle과 Runtime transition만 중재한다.

사용자가 기존 parent directory를 고르면 Server-owned native picker가 그 선택을 opaque authority로 보관하고 Browser에는 안전한 표시값만 준다. 학생이 최종 확인에서 `학기 공간 만들기`를 승인한 뒤에만 App code가 존재하지 않는 child leaf를 exclusive하게 생성한다. 새 workspace는 single v3 aggregate, `inbox/`, `courses/`, package-owned `AGENTS.md`와 declared built-in Skills만으로 시작한다. Course, 자료, live Codex Turn과 학업 action은 `Semester Ready`의 조건이 아니다.

Ready 화면은 현재 3-pane workbench가 아니라 semester status center다. `첫 자료 가져오기`는 실제 post-Ready journey가 구현되기 전까지 disabled `COMING NEXT`로 표시한다. Public Landing도 같은 경계를 `AVAILABLE`과 `COMING NEXT`로 구분한다.

Public release는 fixed source candidate, application tarball, immutable Runtime release, npm exact version, Landing display와 다섯 evidence class를 하나의 `candidateDigest`로 묶는다. 외부 publication은 별도 사용자 승인 후 read-before-write, one-write, authoritative-readback state machine으로만 진행한다.

## User Stories

1. As a 대학생, I want 공식 AY-PLE Landing에서 제품 가치와 현재 preview 범위를 먼저 이해하고 싶다, so that 설치 전에 무엇이 가능한지 정확히 판단할 수 있다.
2. As a 대학생, I want 복사 가능한 exact-version `npx` 명령 하나로 AY-PLE을 시작하고 싶다, so that repository를 clone하거나 개발 환경을 조립하지 않아도 된다.
3. As a 대학생, I want 내 Mac이 지원 범위 밖이면 workspace나 credential을 건드리기 전에 명확한 안내를 받고 싶다, so that partial install과 불완전한 학기 공간을 남기지 않는다.
4. As a 대학생, I want AY-PLE이 검증된 exact Runtime만 사용하기를 원한다, so that 설치 시점과 다시 실행할 때 서로 다른 Codex 실행 byte가 조용히 선택되지 않는다.
5. As a signed-out 학생, I want official ChatGPT Browser login으로 Codex를 연결하고 싶다, so that API key나 device code를 직접 관리하지 않아도 된다.
6. As a 학생, I want OAuth tab을 닫거나 인증을 취소해도 AY-PLE이 연결 성공을 추측하지 않기를 원한다, so that fresh managed account state만 제품 상태가 된다.
7. As a 학생, I want 학년과 학기를 고르고 Mac의 기존 parent 위치 아래에 새 folder 이름을 확인하고 싶다, so that AY-PLE이 어디에 어떤 학기 공간을 만드는지 승인 전에 알 수 있다.
8. As a 학생, I want 최종 승인 전에는 filesystem에 durable setup state나 workspace가 생기지 않기를 원한다, so that 입력을 둘러보는 것만으로 내 파일이 바뀌지 않는다.
9. As a 학생, I want setup 중 Browser를 닫거나 process가 중단돼도 같은 exact 작업이 안전하게 재개되거나 명확한 recovery로 멈추기를 원한다, so that duplicate workspace나 손상된 partial state를 만들지 않는다.
10. As a 학생, I want AY-PLE이 기존 directory, v2 workspace와 내가 수정한 파일을 자동 채택·덮어쓰기·삭제하지 않기를 원한다, so that 내 자료가 보존된다.
11. As a 학생, I want `학기 공간 준비 완료`가 Codex 연결, workspace, 기본 도움 기능과 실행 환경이 검증됐다는 뜻이기를 원한다, so that Ready의 의미를 과목·자료·학업 action 완료로 오해하지 않는다.
12. As a 학생, I want 같은 exact application version을 다시 실행하면 setup wizard 없이 준비된 학기 공간을 다시 열고 싶다, so that 일상적으로 AY-PLE을 재사용할 수 있다.
13. As a 학생, I want credential이 만료돼도 학기 공간을 보존한 채 Codex만 다시 연결하고 싶다, so that 재인증이 데이터 삭제나 새 scaffold로 이어지지 않는다.
14. As a 학생, I want setup과 Ready 화면의 본문·상태·button을 MacBook의 1440px-class viewport에서도 편하게 읽고 싶다, so that 작은 보조 글자와 불명확한 action hierarchy 때문에 제품을 오해하지 않는다.
15. As a public visitor, I want Landing의 command, version, size, compatibility, Docs·GitHub·Privacy·Security·license link가 실제 release와 일치하기를 원한다, so that marketing copy가 distribution truth와 분리되지 않는다.
16. As a maintainer, I want Runtime, OAuth, workspace setup, UI와 release tooling이 명시적인 authority seam 뒤에서 독립적으로 구현되기를 원한다, so that 빠르게 병렬 개발하면서도 shared contract drift를 막을 수 있다.
17. As a release reviewer, I want source, npm package, Runtime archive, workspace bundle과 smoke evidence가 한 candidate identity로 연결되기를 원한다, so that 서로 다른 candidate의 green 결과를 합쳐 release success로 오인하지 않는다.
18. As a release operator, I want 모든 external write가 detached 사용자 승인과 authoritative readback을 요구하기를 원한다, so that partial publication, credential 잔존과 immutable identity 재사용을 막을 수 있다.

## Current State and Constraints

### Current, target과 deferred 구분

| Surface | Current implementation | 이 spec의 adopted target | Deferred |
| --- | --- | --- | --- |
| Product Runtime | `@ay-ple/codex-chat-runtime`이 exact official SDK, native `0.144.4`, standalone CPython, persistent bridge와 bounded process-tree lifecycle을 제공한다. | 같은 supervisor와 exact SDK graph를 유지하고 managed account lifecycle, auth-only/workspace Runtime role과 release-resolved `runtimeRoot`를 추가한다. | 다른 Agent engine, multi-platform Runtime |
| Runtime delivery | Repository-local ignored production bundle을 canonical manifest로 검증한다. | Exact application descriptor가 immutable GitHub Runtime asset을 pin하고 `RuntimeResolver`가 download·resume·safe extract·cache·repair와 complete-tree verification을 단독 소유한다. | moving channel, auto updater, arbitrary Runtime 선택 |
| Account | Workspace-bound Runtime의 generic `readAccountReadiness()`와 외부 device-auth dogfood helper가 있다. | Official Codex-managed ChatGPT Browser OAuth, app-owned stable `CODEX_HOME`, fresh account read와 auth-only→workspace Runtime transition을 제공한다. | API key, device code, access-token host, multi-account |
| Workspace | Server chooser가 임의 directory를 current v2 aggregate로 열며 controller가 28개 operation과 First Assignment lifecycle을 함께 소유한다. | Deep `SemesterWorkspaceAdmission`과 `SetupJourney`가 nonexistent child leaf, single v3 aggregate, bundle, single-envelope `active_ready` locator와 recovery를 소유한다. Current v2는 bytes-preserving read-only다. | v2 migration, existing folder import, multi-workspace switching |
| Server | `apps/server/src/server.ts`의 `createServerApplication()`이 application/listener와 Runtime·router composition을 만들고, `startConfiguredServerApplication()`이 environment resolution과 current workspace activation을 더한다. | Behavior-preserving composition split 뒤 auth/setup/action router를 직렬 조립하고 public host가 listener-independent application seam을 사용한다. | 별도 cloud service, background daemon |
| Browser | Current v2 activation 뒤 300px/400px fixed side pane의 3-pane workbench를 root로 렌더링한다. 여러 helper가 7–9px다. | Account screen → A Guided Setup → C Compact Ready/recovery root를 구현하고 post-Ready workbench는 숨긴다. | 실제 import/action UI, mobile |
| Landing | Official public homepage가 없다. | Editorial product homepage와 exact release card, first-run guide, compatibility·trust surface를 제공한다. | 큰 marketing site, analytics/growth stack |
| Public package | Root와 네 workspace가 `private`, `0.0.0`이고 public `bin`이 없다. | `ay-ple` application package 하나, foreground host 하나와 prebuilt assets를 public exact SemVer로 배포한다. | `.app`·`.dmg`, global installer |
| Release | Public source export, npm/Runtime/Application release, Pages ledger와 clean-machine recorder가 없다. | Positive-allowlist clean export, legal/provenance gate, resumable publication state machine과 five-class evidence를 추가한다. | General release service, atomic multi-provider transaction |
| Academic kernel | First Assignment vertical과 current v2 durability·Review·recovery가 deterministic Browser, exact local provider와 isolated live provider에서 green이다. | Donor behavior와 regression tests로 보존하되 public Ready claim과 UI에는 포함하지 않는다. | `ImportSource`, Course setup과 첫 실제 학업 action |

### Long-lived authority

이 spec은 다음 owner의 결정을 구현 계약으로 소비하며 다시 정의하지 않는다.

| Authority | 소유하는 결정 |
| --- | --- |
| [Product Brief](../product/ay-ple-product-brief.md) | 제품 가치, first-preview boundary와 `Semester Ready`의 사용자 의미 |
| [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | `packageRoot`·`appDataRoot`·`workspaceRoot` 분리 |
| [ADR 0009](../adr/0009-use-a-macos-first-local-web-app-product-path.md) | macOS-first local web app 제품 경계 |
| [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md) | Official Python SDK와 supervised Runtime 재사용 |
| [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md) | Product-only public surface와 current v2 byte 보존 |
| [ADR 0014](../adr/0014-create-app-owned-normalized-semester-workspaces.md) | app-owned v3 workspace admission, `WorkspaceManifest`, `SetupJourney`와 bundle 역할 |
| [ADR 0015](../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md) | public source lineage, Apache-2.0 first-party license와 trust authority |
| [ADR 0016](../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md) | exact application↔Runtime distribution과 version authority |
| [ADR 0017](../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md) | Codex-managed OAuth, credential와 Runtime transition authority |
| [Codex Runtime 격리](../architecture/codex-runtime-isolation.md) | Runtime roots, native context와 current/target isolation topology |
| [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md) | 현재 Runtime·Server·Browser graph와 current gap |
| [Development Backlog](../product/ay-ple-development-backlog.md) | 날짜 없는 제품 작업 순서와 completion state |

### Supported release lane

첫 preview가 지원한다고 주장하는 환경은 다음 exact lane이다.

- Apple Silicon Mac
- macOS 13.5 이상
- Node `>=22.12 <23`
- npm 10.x
- release smoke에서 고정한 recent Chrome/Chromium minimum
- npm registry, GitHub Releases, OpenAI OAuth와 provider에 대한 network access
- Codex를 사용할 수 있는 기존 ChatGPT account

Node 24, Safari, Intel Mac, Windows, Linux와 다른 package manager는 지원 대상으로 추론하지 않는다. Public command는 `npx ay-ple@<exact-version>`이고 automation에서만 `npx --yes ay-ple@<exact-version>`을 사용한다. `@latest`, bare package, global install과 moving Runtime catalog는 authority가 아니다.

### Existing verification baseline

Spec 작성 직전 HEAD `c2e52690298acc7390ef504009b148121d47cb33`의 root test, typecheck, build, Chat Shell lint, 39개 E2E, docs link check, production Runtime verify, exact local-provider, First Assignment product actual과 shutdown gates는 모두 green이었다. 이는 current kernel의 regression baseline이며 public setup·delivery가 이미 구현됐다는 증거는 아니다.

Current Browser E2E에는 late Review의 read-only behavior가 이미 있다. Invalid evidence·quote mismatch·stale base는 lower seam에서 fail closed하지만 대표 Browser 최고 seam trace가 부분적으로 비어 있다. 이 surviving parent-Spec debt는 새 first-run UI가 current workbench root를 교체하기 전 `Spine S2` stabilization acceptance에서 닫고, 이후 `I0`가 회귀를 소비한다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 단독 책임 | 소비하는 것 | 소유하지 않는 것 |
| --- | --- | --- | --- |
| `@ay-ple/product-contract` | Browser-safe Account·Setup·Ready request/response, strict exact decoder와 test fixtures | App Modules가 만든 safe projection | token, absolute path, native ID, Runtime identity, receipt phase |
| `@ay-ple/codex-chat-runtime` | Official SDK/native process, `CodexAccountLifecycle`, auth-only/workspace role, typed account/config/Skill private port와 complete close | Verified `runtimeRoot`, controlled roots와 role input | Browser DTO, token store 구현, workspace/schema |
| `packages/runtime-release` | `RuntimeReleaseDescriptor`, single `RuntimeResolver`, transport/resume, safe archive, cache/repair와 verified immutable `runtimeRoot` | Embedded exact descriptor·canonical manifest, `appDataRoot` | Host, Browser progress layout, moving catalog |
| `packages/semester-workspace` | v3 codec, `SemesterWorkspaceAdmission`, package bundle source/verifier/materializer, setup envelope store, `SetupJourney`와 native-context policy | Server-owned parent selection authority, release binding, Account transition callback | Browser copy, OAuth credential, generic import workflow |
| `AccountRuntimeCoordinator` | App-wide login/logout/transition lease 하나, auth-only Runtime retirement, workspace Runtime activation과 fresh account read | Runtime account lifecycle, admitted workspace | setup store와 Ready pointer write |
| Server setup adapters | Native parent picker, opaque selection/plan binding, Browser-safe projection, account/setup/action router delegation | Product contract, admission/journey/coordinator | filesystem algorithm 복제, feature state |
| Server application composition | Express application, exact Origin guard, router mount, listener-independent close와 bounded Runtime/stream shutdown | Feature Modules와 host-provided roots | public package preflight, release download |
| `apps/ay-ple` | Public package/bin, preflight, dynamic loopback host, single instance, built SPA/Server/resource composition, Browser open와 signal lifecycle | Verified Runtime, package resources와 application factory | setup/domain logic, release publication |
| Chat Shell product UI | Account → Guided Setup → Compact Ready/recovery state rendering과 allowed command dispatch | `@ay-ple/product-contract` only | raw filesystem, OAuth/native protocol, receipt inference |
| `apps/landing` | Product homepage와 release-generated display artifact rendering | G-owned read-only release display artifact | version·size·URL authority, OAuth/setup mutation |
| Release generator/publication runner | Clean export, legal/provenance roster, RC assembly, binding ledger, publication reconciliation과 evidence indexing | Fixed reviewed source and lane outputs | Product source 수정, approval 합성 |

기존 `CodexChatService`, `ProductOperationCoordinator`와 current v2 controller가 모두 “같은 lifecycle authority”인 것은 아니다. 각각 Runtime/thread/Turn, process-global product operation, durable workspace/action guard라는 다른 scope를 소유한다. 새 `AccountRuntimeCoordinator`는 이들을 합치는 replacement가 아니라 account·Runtime generation 전환만 직렬화하는 상위 lease다.

Current `SemesterWorkspaceController`의 behavior, state-patch validator, private MCP host와 tests는 donor다. 그러나 28-operation current v2 controller를 v3 public admission Interface로 확장하지 않는다. V3 setup은 별도 deep Module이고 future academic actions는 B-owned `WorkspaceActionAdmission`을 통과한 뒤 current action Modules를 사용할 수 있다.

### Interfaces and Invariants

#### Production host와 root

Public application은 다음 invariant를 만족한다.

- Public npm package와 executable `bin`은 각각 하나다.
- Published metadata는 `name: "ay-ple"`, exact SemVer, `private: false`, ESM, single `ay-ple` bin, `engines.node: ">=22.12 <23"`, `engines.npm: ">=10 <11"`, `os: ["darwin"]`, `cpu: ["arm64"]`, `license: "Apache-2.0"`와 actual `repository`·`homepage`·`bugs`를 명시한다.
- Package는 positive `files`와 generated `npm-shrinkwrap.json`으로 exact production closure를 잠그고 `preinstall | install | postinstall` lifecycle hook을 두지 않는다.
- Foreground Node host 하나가 preflight, Runtime resolution, local Server, Browser open와 shutdown을 소유한다.
- Host는 OS가 고른 dynamic `127.0.0.1:<port>`에서 built SPA, `/api/product/*`와 private local surface를 same-origin으로 제공한다.
- `packageRoot`는 immutable application resource만 읽고 사용자 state를 쓰지 않는다.
- `appDataRoot`는 macOS Application Support 아래 owner-only non-symlink root이며 Runtime cache, controlled `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, temp와 active locator variant를 포함한 single setup envelope를 서로 다른 child seam으로 분리한다.
- `workspaceRoot`는 app-owned admission이 발급한 `AdmittedSemesterWorkspace`만 될 수 있다.
- 세 root와 controlled child root는 unsafe ancestor/descendant overlap을 허용하지 않는다.
- Per-`appDataRoot` primary instance는 하나다. Secondary invocation은 authenticated nonce handshake로 primary의 exact Origin을 확인해 Browser를 다시 열고 별도 listener·Runtime·writer를 만들지 않는다.
- Browser tab은 host lifetime owner가 아니다. `SIGHUP`, `SIGINT`, `SIGTERM`은 bounded shutdown 뒤 종료하며 Runtime process group, port와 lease가 남지 않아야 한다.
- Repository checkout, Vite, system Python, ambient `process.cwd()`, global `~/.codex`, legacy env와 development materializer는 production fallback이 아니다.

Workspace mutation 전 package bundle과 Runtime descriptor·canonical manifest를 immutable process snapshot으로 capture하고 complete-tree 검증한다. Unsupported prerequisite, package corruption과 descriptor mismatch는 network·credential·workspace mutation 전에 fail closed한다.

Package-owned `ApplicationCompatibilityDescriptor`가 supported platform·arch, minimum macOS, Node/npm range, allowlisted Chrome/Chromium bundle ID·candidate location·minimum major를 소유하고 exact `WorkspaceBundleDescriptor` identity를 참조한다. 두 descriptor는 `Spine S1`의 frozen contract다. Host는 이를 strict decode해 preflight와 package-resource verification에 사용한다. Landing source나 Server/UI가 같은 값을 다시 hard-code하지 않으며 G-owned release display artifact가 descriptor·package metadata·Runtime manifest와 final publication readback에서 public compatibility·size·link를 파생한다.

#### Runtime release

```ts
interface RuntimeResolver {
  resolve(input: {
    appDataRoot: string
    signal: AbortSignal
    report: (progress: RuntimeResolveProgress) => void
  }): Promise<VerifiedRuntime>
}
```

`RuntimeReleaseDescriptor`는 schema version, exact application name/version, public repository와 application/Runtime tag, `darwin-arm64`, app–Runtime contract, Runtime release ID, archive URL/name/bytes/SHA-256와 canonical manifest resource/bytes/SHA-256를 exact하게 bind한다.

Resolver invariant:

- Embedded descriptor와 package canonical manifest만 Runtime 선택 authority다.
- Valid generation은 매 resolve와 spawn boundary에서 receipt가 아니라 complete-tree verifier로 다시 확인한다.
- Final generation은 version/content addressed이고 in-place 수정하지 않는다.
- Valid retained archive는 network 없는 repair에 사용할 수 있다.
- `200`, exact `206`와 bounded `416`을 구분하고 representation이 불명확한 partial을 append하지 않는다.
- HTTPS redirect마다 secret-bearing header를 전달하지 않고 non-identity content encoding을 거절한다.
- Extract 전 normalized path graph, duplicate/case-fold/prefix collision, entry·expanded-byte bound와 unsafe link/type/mode를 검사한다.
- System `tar`, system Python, repository tree, stale/corrupt cache, mirror와 다른 version으로 fallback하지 않는다.
- Current exact release가 unavailable해도 older cached Runtime을 자동 실행하지 않는다.
- Stable error는 `runtime_cancelled | runtime_incompatible | runtime_network_unavailable | runtime_access_denied | runtime_release_unavailable | runtime_integrity_failed | runtime_archive_unsafe | runtime_storage_unavailable | runtime_cache_unsafe | runtime_recovery_required`로 projection하고 raw URL·path·HTTP body·nested cause를 Browser에 내보내지 않는다.

첫 release에는 public older pair가 없으므로 rollback command를 제공하지 않는다. 이후 실제 `still-supported` whole pair가 생겼을 때만 older exact application command가 rollback unit이 된다.

#### Codex account와 Runtime transition

`CodexAccountLifecycle`은 private Runtime seam으로 fresh account read, browser login start/status/cancel/release, explicit logout과 close를 제공한다. AY-PLE은 OAuth endpoint, PKCE, refresh token과 `auth.json`을 parse하지 않는다.

Account invariant:

- Credential owner는 official Codex App Server다.
- Stable app-owned `CODEX_HOME`에 `cli_auth_credentials_store = "file"`을 고정하고 credential file은 owner-only다.
- App Server initialize의 `clientInfo`는 AY-PLE application name/title과 exact release version을 사용하고 generic SDK client로 가장하지 않는다.
- `~/.codex`, API key, access token host, device code와 direct OAuth 구현은 사용하지 않는다.
- Launch·relaunch authority는 fresh `account/read(refreshToken: true)`다.
- Active attempt success는 matching login completion과 그 뒤 bounded fresh ChatGPT account read를 모두 요구한다.
- `account/updated`와 file existence는 wake-up hint일 수 있지만 success authority가 아니다.
- Browser state는 `checking | login_required | login_starting | login_pending | verifying | connected | unsupported_account | unavailable`만 사용한다.
- Browser에는 transient product `attemptId`, allowlisted HTTPS `authUrl`, expiry와 coarse status만 허용한다. Native `loginId`, raw account, email과 credential은 금지한다.
- 한 pending attempt의 deadline은 pinned 10분이며 Browser reopen은 같은 in-memory attempt/status에 join한다. Deadline 뒤에는 `login_expired` notice와 fresh account read를 거쳐 다시 `login_required | connected | unsupported_account | unavailable`로 수렴한다.
- `connected`는 fresh account type이 `chatgpt`라는 뜻이며 provider request·entitlement success를 과장하지 않는다.
- Unsupported account는 explicit logout 뒤 ChatGPT reconnect만 허용한다.
- Cancel/completion race에서 이미 저장된 fresh ChatGPT account가 이긴다. Tab close만으로 cancel을 합성하지 않는다.
- Logout은 active auth/product operation과 직렬화하고 fresh `account: null`을 확인해야 성공이다. Workspace와 academic state는 지우지 않는다.

Managed login start는 official typed option `useHostedLoginSuccessPage: true`, `appBrand: "codex"`를 사용한다. Local UI는 `OpenAI에서 완료한 뒤 이 AY-PLE 탭으로 돌아오세요`라고 미리 안내하고 matching completion을 poll하며 official tab을 자동 close·focus하거나 AY-PLE로 redirect된다고 약속하지 않는다. Organization setup이 필요한 account에서는 pinned Codex가 token-bearing official local success URL로 fallback할 수 있다. 따라서 public privacy contract는 credential byte가 AY-PLE product Origin·API·Browser storage·workspace·receipt·public log를 통과하지 않는다고만 보장하며, 어떤 Browser address에도 token이 나타나지 않는다고 주장하지 않는다.

| AccountProjection | UI owner와 허용 action |
| --- | --- |
| `checking` | Account screen 또는 C protected frame에서 read-only progress |
| `login_required` | First connection에서는 login start, pending/active workspace에서는 workspace 보존 copy와 reconnect |
| `login_starting` | Start response를 기다리며 duplicate start는 같은 lease에 join |
| `login_pending` | Official tab 안내, exact current-attempt cancel과 same attempt observe |
| `verifying` | Matching completion 뒤 fresh read를 기다리며 다른 setup mutation 차단 |
| `connected` | Fresh first run은 Guided Setup으로 전환, pending workspace는 explicit resume를 제시 |
| `unsupported_account` | Explicit logout → ChatGPT reconnect만 허용 |
| `unavailable` | State를 추측하지 않는 retry만 허용 |

Pre-workspace account call은 owner-only empty `appDataRoot` bootstrap cwd에서 auth-only Runtime을 사용한다. 이 role은 account operation과 close 외 thread, Turn, Skill, private MCP와 workspace operation을 거절한다.

`AccountRuntimeCoordinator`의 transition lease는 다음 전체 구간을 한 scope로 직렬화한다.

```text
pending account operation 없음 확인
→ auth-only Runtime complete close + process-tree disappearance
→ exact admitted workspace cwd의 workspace Runtime start
→ fresh ChatGPT account read
→ B-owned Ready commit callback
→ Ready readback
→ lease release
```

`A`만 lease를 소유하고 `B`만 callback 안에서 Ready를 commit/readback한다. Runtime close가 ambiguous하면 같은 process에서 두 번째 Runtime을 만들지 않고 restart-required로 수렴한다.

#### Parent location selection과 Browser path boundary

Current Server의 macOS `osascript` chooser는 native picker donor로 재사용할 수 있지만 “기존 workspace directory”가 아니라 “새 workspace를 만들 existing parent”를 고른다.

- User gesture가 Server-owned native parent picker를 연다.
- Server는 canonical parent, root identity와 permission observation을 transient owner state에 보관한다.
- Browser에는 opaque `parentSelectionId`, parent display name과 safe display location만 준다.
- Raw absolute path, username, device/inode와 authority token은 DOM, URL, storage와 client log에 없다.
- `prepare`는 `parentSelectionId`, semester input과 editable one-segment leaf만 보낸다.
- Server는 selection을 fresh revalidate하고 authority-bound setup plan을 만든다. Browser가 보낸 display path를 mutation authority로 다시 신뢰하지 않는다.
- Draft·selection은 durable하지 않다. Server restart나 selection expiry 뒤에는 parent를 다시 고른다.

#### SemesterWorkspace admission과 v3 aggregate

```ts
interface SemesterWorkspaceAdmission {
  inspect(intent: WorkspaceIntent): Promise<WorkspaceInspection>
  apply(plan: AuthorityBoundWorkspacePlan): Promise<WorkspaceApplyResult>
}
```

`inspect`는 side effect 없이 parent, computed target, root relation, current bytes와 ownership을 분류한다. `apply`는 Server-held authority-bound plan과 fresh filesystem authority가 같을 때만 plan이 허용한 create, owned resume, owned safe discard 또는 admitted reopen 하나를 수행한다.

첫 v3 aggregate의 exact top-level shape는 다음이다.

```json
{
  "kind": "ay-ple.semester-workspace",
  "formatVersion": 3,
  "manifest": {
    "workspaceId": "workspace_<opaque>",
    "semester": {
      "yearLevel": 2,
      "term": {
        "key": "1",
        "displayName": "1학기"
      }
    },
    "courses": []
  },
  "state": {
    "settings": {},
    "confirmedRevision": 0,
    "materials": [],
    "assignments": [],
    "statePatches": [],
    "userConfirmations": [],
    "modelingRuns": [],
    "executionGuard": null,
    "sourceRecovery": null
  }
}
```

Top-level, `manifest`, `semester`와 `state`는 extra field를 거절한다. First release가 생성·reopen하는 v3 collection은 모두 empty다. Post-Ready capability가 collection element와 Course referential binding을 별도 spec으로 정의하기 전에는 current v2 leaf decoder를 v3 authority로 자동 승격하지 않는다. Authority 중복이 없다고 증명된 value shape만 명시적인 v3 codec 결정 뒤 재사용할 수 있으며 v2 bytes 자체는 자동 migration하지 않는다.

- `WorkspaceManifest`만 workspace, semester와 zero-or-more Course identity·관계를 정의한다.
- `workspaceId`는 기존 opaque safe ID grammar를 사용하고 absolute path를 포함하지 않는다.
- `yearLevel`은 positive safe integer다. UI는 1–4를 기본으로 제공하지만 schema range를 닫지 않는다.
- `term.key`와 `displayName`은 bounded meaningful text이며 UI는 1·2학기를 기본으로 제공한다. 계절학기·custom term을 format bump 없이 표현할 수 있어야 한다.
- `courses`는 비어 있을 수 있고 각 Course identity는 manifest에서만 정의한다.
- `settings`는 first release에 exact empty record다. Timezone, locale, model, reasoning effort와 service tier default를 만들지 않는다.
- Initial post-Ready state arrays는 모두 empty이고 `confirmedRevision`은 0이다.
- Folder name과 `courses/` path는 human-readable projection이며 identity가 아니다.

Minimal directory seam:

```text
<semester-workspace>/
  AGENTS.md
  .agents/skills/<declared-built-in-roots>/**
  .ay-ple/workspace-state.json
  inbox/
  courses/
```

Create intent는 existing canonical parent 아래 nonexistent bounded one-segment leaf만 받는다. Non-recursive exclusive `mkdir`로 final leaf를 reserve하고 existing empty directory도 adopt하지 않는다. Required tree와 v3 aggregate를 no-clobber write·file sync·directory sync·atomic publish한 뒤 disk에서 fresh validation해야 `AdmittedSemesterWorkspace`가 된다.

Inspection outcome은 최소 `new_target | admitted | already_ready | workspace_exists | owned_incomplete | legacy_migration_required | collision | incompatible | unsafe | unavailable`을 구분한다. Valid current v2는 `legacy_migration_required/readOnly`이고 decoder-invalid/future bytes는 `incompatible/readOnly`다. 둘 다 original bytes를 보존한다.

#### Workspace instruction/Skill bundle과 native context

Canonical source는 package의 dedicated `packages/semester-workspace/resources/workspace/**`다. Ambient repository `AGENTS.md`, `.agents/**`, dogfood fixture와 setup Skill을 복사하지 않는다.

- First-release declared bundle roster는 root `AGENTS.md`와 `.agents/skills/ay-ple-first-assignment/SKILL.md` 한 built-in Skill root다.
- `AGENTS.md`는 이 root가 AY-PLE이 만든 `SemesterWorkspace`이고 학생 자료·confirmed academic state를 App Review authority 밖에서 임의 확정·변경하지 않는다는 base guidance를 소유한다.
- `ay-ple-first-assignment`는 current verified evidence-linked Assignment proposal recipe의 package-owned successor다. 설치되어 있다는 사실은 Course·자료·action availability를 뜻하지 않으며 public route/UI는 post-Ready capability가 별도로 활성화할 때까지 닫힌다.
- “학기 시작 Skill”, setup orchestration Skill과 camp engineering Skill은 roster에 없다.
- Descriptor는 `AGENTS.md`와 각 declared `.agents/skills/<root>`의 exact complete-tree roster·digest를 독립적으로 선언한다.
- Package source는 workspace mutation 전에 complete-tree 검증하고 immutable process snapshot으로 capture한다.
- Materializer는 absent target만 no-clobber로 설치한다.
- Missing declared path는 explicit absent-only recovery 뒤 fresh reverify할 수 있다.
- Modified byte, symlink, declared Skill root 내부 extra entry는 보존하고 `manual_recovery_required`로 action을 막는다.
- Descriptor 밖 `.agents/skills/` sibling은 bundle authority로 소유·변경하지 않지만 first preview action eligibility는 막는다.
- Workspace root `AGENTS.override.md`, workspace-local `.codex/`와 descriptor 밖 Skill entry도 byte를 보존한 context conflict다.
- Workspace Runtime은 fixed `project_root_markers=[]`, exact workspace `cwd`, controlled `HOME`과 global instruction file이 없는 app-owned `CODEX_HOME`을 사용한다.
- Static scan과 private native `config/read(cwd, includeLayers=true)`·`skills/list(cwds=[workspace], forceReload=true)`가 모두 green이어야 Ready와 각 product Codex action을 연다.
- Ready 전 `thread/start`, `thread/resume`, `turn/start`와 Skill input count는 0이다.

Bundle은 workspace identity나 schema authority가 아니다. Setup은 Browser + App code이며 live Codex Turn이나 “학기 시작 Skill”을 사용하지 않는다.

#### SetupJourney와 durability

```ts
interface SetupJourney {
  reconcile(
    command:
      | { kind: 'launch' }
      | { kind: 'prepare'; input: SemesterSetupInput }
      | { kind: 'approve'; setupPlanId: string }
      | {
          kind: 'recover'
          recoveryId: string
          action: 'resume' | 'discard'
        },
  ): Promise<SetupProjection>
  observe(): Promise<SetupProjection>
}
```

- Host-only `launch`가 mutation-capable automatic reconciliation을 수행한다.
- Browser GET, poll과 reopen은 read-only `observe()`만 사용한다.
- Browser `prepare | approve | recover`는 exact Origin mutation guard를 통과한다.
- `prepare`는 disk mutation 없이 `confirmation_required` projection을 만든다.
- `approve`만 plan을 durable transaction으로 승격하며 duplicate approve는 같은 terminal promise에 join한다.
- Same-plan repeated launch/tab은 join하고 different plan은 `setup_conflict`다.
- Browser는 opaque `setupPlanId`·`recoveryId`만 돌려주며 path, delete roster와 receipt phase를 제출하지 않는다.

Owner-only durable state는 `appDataRoot/setup/v1/state.json` single envelope 하나다.

```text
logical empty
→ pending/approved
→ pending/prepared
→ active_ready
```

승인 전에는 file absence가 logical `empty`다. `pending`은 setup/plan identity, semester plan digest, server-private parent/target authority, expected workspace ID, scaffold/initial aggregate digest, exact application/Runtime identity와 bundle identity를 bind한다. PID, Runtime handle, OAuth attempt/token, account-success flag와 transient error는 저장하지 않는다.

State Adapter는 owner-only directory/file, no-follow, canonical full write, same-directory exclusive temp, file sync, observed prior-byte compare, atomic rename, parent directory sync와 strict readback을 숨긴다. App data와 workspace가 다른 filesystem일 수 있으므로 cross-root atomic transaction을 주장하지 않는다. Receipt-first ordering, root ownership marker와 idempotent fresh reconcile로 old-or-new complete state에 수렴한다.

`prepared`는 v3 aggregate, required seam, bundle complete tree와 App-side workspace-local conflict scan이 disk에서 fresh valid한 pending 결과다. 이는 native effective context가 확인됐다는 뜻이 아니다. Ready는 transition lease 안에서 workspace Runtime의 private native config/Skill verification과 fresh account read까지 통과한 뒤 `pending → active_ready` atomic replace·readback으로만 commit한다.

Safe discard는 admitted 전 matching `owned_incomplete`에서만 제공한다. `discard_requested`와 captured root identity를 어떤 unlink보다 먼저 durable하게 기록하고 known app-created entry를 no-follow로 개별 제거한 뒤 same-identity empty directory만 제거한다. Recursive delete, broad parent cleanup, admitted/prepared/Ready workspace discard와 unknown/modified/symlink byte 삭제는 Interface에 없다.

#### Browser-safe setup과 Ready projection

Browser projection은 다음 coarse product state만 표현한다.

| Projection | UI owner | 허용 action |
| --- | --- | --- |
| `account_required/first_connection` | Account screen | login start, current attempt cancel |
| `input_required` | A Guided Setup | 학년·학기·parent 선택·leaf 입력 |
| `confirmation_required` | A Guided Setup | 최종 승인, parent 다시 선택 |
| `working` | A Guided Setup | read-only progress 관찰 |
| `account_required/workspace_reauth` | C protected state | Codex reconnect 뒤 resume |
| `transition_blocked` | C protected state | proven-safe resume 또는 restart guidance |
| `release_blocked` | C protected state | required exact application command |
| `recovery_required` | C protected state | projection이 allowlist한 resume/discard/manual guide |
| `ready` | C status center | disabled next-journey surface |

Browser projection에 raw path, workspace/setup/recovery ID의 durable meaning, `approved | prepared | active_ready | discard_requested`, digest, receipt, Runtime generation/PID, native thread/Turn/login identity, `CODEX_HOME`와 credential이 없어야 한다. Opaque command ID는 matching mutation request를 위해 transient하게 사용할 수 있지만 UI copy나 storage authority가 아니다.

Ready 화면은 다음을 학생 언어로 보여 준다.

- Semester label과 `Codex 연결됨`
- `Codex 연결 확인됨`, `학기 공간 확인됨`, `AY 작업 환경 확인됨`
- `학기 공간 준비 완료`
- Leaf folder name과 Server-projected safe display location
- 과목과 자료가 Ready 조건이 아니라는 boundary copy
- Disabled `다음 제품 여정 · COMING NEXT / 첫 자료 가져오기`

Ready 전과 recovery에는 Ready checklist, next journey, current workbench, 자료 pane과 Chat composer를 렌더링하지 않는다. Course·RawMaterial count를 합성하지 않는다.

### Data and State Flow

#### First run

1. Visitor가 Landing에서 product promise, supported lane과 release-generated exact command를 확인한다.
2. `npx`가 exact application tarball을 받고 public `bin`을 foreground로 실행한다.
3. Host가 architecture·OS·Node/npm·Browser·disk·root permission, package bundle과 embedded descriptors를 검증한다. 이 단계까지 workspace mutation은 0이다.
4. `RuntimeResolver`가 exact generation을 검증·reuse하거나 exact immutable Runtime asset을 받아 safe extract·verify한다.
5. Primary host가 dynamic loopback Origin을 bind하고 built UI와 product router를 열며 supported Chrome/Chromium을 연다.
6. Host `launch` reconciliation이 active setup/Ready state를 관찰한다. Fresh state면 auth-only Runtime으로 fresh account read를 수행한다.
7. Signed-out이면 Account screen이 official Browser login을 시작하고 matching completion + fresh ChatGPT read 뒤에만 `connected`가 된다.
8. A Guided Setup에서 학생이 yearLevel, term과 Server-owned native picker의 parent를 고르고 editable leaf를 확인한다.
9. `prepare`가 mutation 없이 fresh inspect하고 safe confirmation을 반환한다.
10. 학생의 `approve`가 complete `pending/approved` envelope를 먼저 durable하게 쓴다.
11. Admission이 exclusive scaffold와 v3 aggregate를 만들고 bundle을 no-clobber 설치한 뒤 schema·bundle·App-side workspace-local conflict scan을 fresh 검증해 `pending/prepared`를 commit한다.
12. `AccountRuntimeCoordinator`가 auth-only Runtime을 완전히 닫고 workspace Runtime을 시작해 private config/Skill guard와 fresh ChatGPT read를 수행한다.
13. B-owned callback이 `active_ready`를 commit·readback한다.
14. Browser는 C Compact status center의 `학기 공간 준비 완료`를 표시한다.

#### Ready relaunch

1. 같은 exact application command가 primary instance 또는 새 primary host를 연다.
2. Resolver가 exact same binding을 검증하고 valid generation 또는 retained archive repair를 사용한다.
3. `active_ready` locator가 가리키는 workspace를 locator가 아닌 v3 aggregate·required seam에서 fresh admission한다.
4. Bundle과 App-side workspace-local conflict scan, exact release binding을 다시 검증한다.
5. Workspace Runtime의 private native config/Skill effective-context verification과 fresh ChatGPT account read를 통과하면 wizard 없이 C `ready`로 간다.
6. Credential 문제면 workspace와 locator를 보존한 C reauth state로 간다. Reconnect만으로 Ready를 합성하지 않고 explicit resume가 다시 전체 transition·validation을 통과한다.

#### Public release

```text
fixed reviewed source
→ clean positive-allowlist export
→ local RC acceptance
→ detached publication authorization
→ public source readback
→ private application draft staging
→ immutable Runtime release readback
→ CI-built exact npm publish + provenance readback
→ every injected npm GAT retirement + explicit rejection
→ exact public clean-machine smoke
→ immutable application release
→ Pages Landing + current sentinel
→ current public preview
```

각 surface는 previous receipt를 digest로 참조한다. Exit code나 HTTP success 한 번이 아니라 external natural identity를 다시 읽은 결과만 state transition authority다.

### Failure Behaviour

| Failure | Observable outcome | Safe next action | 금지 |
| --- | --- | --- | --- |
| Unsupported OS/arch/Node/npm/Browser | supported values와 발견값을 포함한 preflight error | prerequisite 수정 후 같은 exact command | Runtime/OAuth/workspace mutation |
| npm `ay-ple` identity unavailable | Publication blocked | Distribution naming 결정을 다시 연다 | 임의 fallback package name publish |
| Package resource/descriptor mismatch | release/package integrity error | supported exact release 확인 | fallback resource, workspace mutation |
| Runtime network unavailable | `runtime_network_unavailable` | network 확인 뒤 bounded retry | other version/mirror fallback |
| Runtime integrity/unsafe archive | integrity 또는 unsafe error | 새 supported release 확인 | corrupt byte 실행·자동 downgrade |
| Ambiguous Runtime cache ownership | `runtime_recovery_required` | support recovery | appDataRoot 전체 삭제, PID/age 추측 |
| Browser open failure | startup failure와 supported Browser guidance | Browser 설치/위치 확인 뒤 재실행 | fixed localhost URL 추측, orphan host |
| Login cancel/timeout | `login_required` + one-shot safe notice | official login 다시 시작 | Ready 합성, 다른 auth fallback |
| Official callback `1455/1457` interference | Coarse login failure, port reclaim evidence 보존 | Interference 제거 후 managed login retry | 자동 device-code fallback, AY-PLE OAuth server 추가 |
| Login completion 뒤 fresh read 없음 | `verifying` 후 `login_required` 또는 `unavailable` | fresh retry | completion notification만 success 처리 |
| Unsupported account | `unsupported_account` | explicit logout → ChatGPT reconnect | credential 덮어쓰기, API key fallback |
| Account read RPC failure | `unavailable` | retry | outage·logout·token corruption 추측 |
| Parent selection expired | `input_required` | native picker 재실행 | display path를 authority로 사용 |
| Target exists/collision | confirmation/input error | 다른 leaf 또는 parent 선택 | empty directory adopt, auto suffix, overwrite |
| Current v2 | `legacy_migration_required/readOnly` | 후속 migration 안내 | v3 sidecar, automatic migration |
| Approve response loss/duplicate | 같은 transaction observe/join | terminal projection 대기 | second scaffold |
| Different approved plan | `setup_conflict` | current transaction recovery 또는 별도 새 start | first writer state 덮기 |
| Browser/tab close | foreground operation 지속 | exact Origin reopen/observe | implicit cancel |
| Unknown/modified/symlink entry | `manual_recovery_required` | bytes를 보존한 안내와 fresh reverify | overwrite·move·delete·discard |
| Missing declared bundle path | protected state | explicit absent-only no-clobber recovery | unrelated entry 수정 |
| Auth-only Runtime close ambiguous | restart required | host 종료 후 next invocation reconcile | same-process second Runtime |
| Workspace Runtime/account unavailable | pending workspace 보존 | transition retry 또는 reauth | workspace discard, Ready commit |
| Release binding mismatch | `release_blocked` | required exact application command | cross-version resume·silent migration |
| `SIGHUP`/`SIGINT`/`SIGTERM` | bounded safe checkpoint와 shutdown | same exact command relaunch | success receipt 합성 |
| Primary `SIGKILL` | next launch가 durable state에서 reconcile | exact transaction resume/recovery | harness cleanup을 product pass로 계산 |
| External publication timeout | natural identity readback 후 resume/block | matrix가 허용한 one-write 재개 | blind retry, immutable identity reuse |
| npm publish 후 defect | exact version deprecate + `preview` tag 제거 | 새 application version | unpublish 후 version reuse |
| Pages stale/mismatch | not current | same verified Pages artifact redeploy/withdrawal approval | source/npm/Runtime 변경으로 숨기기 |

Deterministic gate failure의 blind retry budget은 0이다. Root cause fix, 새 fixed SHA review와 affected checkpoint 전체 재실행이 필요하다. External transient도 prior remote state를 authoritative readback한 뒤 matrix가 명시적으로 허용한 경우에만 새 attempt로 재시도한다.

Callback interference가 clean I2에서 first preview를 사용할 수 없게 만든다는 evidence가 반복될 때만 별도 사용자 결정으로 device-code scope를 다시 연다. 이 spec의 implementation이 자체 판단으로 auth mode를 넓히지 않는다.

### Compatibility and Migration

- Current decoder-valid v2 store는 serialization을 포함한 original bytes를 보존하고 `legacy_migration_required/readOnly`로 연다.
- Decoder-invalid pre-baseline, malformed current/future store는 `incompatible/readOnly`로 보존한다.
- First release의 supported migration set은 비어 있다. Sidecar Manifest, same-version meaning change, auto adopt와 reset을 만들지 않는다.
- V3 physical shape가 바뀌면 explicit format bump와 concrete migration 또는 bytes-preserving fail-closed rejection이 필요하다.
- First setup과 required relaunch는 같은 exact application version·release binding만 지원한다. Cross-version setup resume, bundle update·merge와 workspace migration framework를 미리 만들지 않는다.
- App/Runtime rollback unit은 exact application package와 그 descriptor가 pin한 Runtime whole pair다. First release에는 older public pair가 없으므로 rollback UI·command를 노출하지 않는다.
- App update, Runtime auto-update, `.app`·`.dmg`, signing/notarization과 other-platform migration은 별도 spec 대상이다.
- `appDataRoot` loss가 workspace-local confirmed academic state를 삭제할 권한을 만들지 않는다. 다만 first release는 missing active locator를 filesystem scan으로 추측하거나 자동 adopt하지 않는다.

## Implementation Decisions

### Donor, refactor와 replacement

| Disposition | Current surface | 적용 |
| --- | --- | --- |
| Direct donor | Node Runtime supervisor·official SDK graph, strict product-contract decoder pattern, Browser NDJSON Adapter, Server Origin guard·neutral NDJSON·bounded shutdown | Existing failure locality와 regression을 유지하며 narrow account/setup contract를 additive하게 연결 |
| Academic behavior donor | Current controller의 Assignment/Review/guard behavior, private MCP validation과 tests | V3 identity/admission authority와 분리해 post-Ready action의 behavior oracle로만 보존 |
| Keep behind admission | `ProductOperationCoordinator` | Existing process-global product operation lease를 유지하고 future action은 B-owned `WorkspaceActionAdmission` 뒤에서만 진입 |
| Adapt composition boundary | `CodexChatService`, `createServerApplication`, `createProductRouter` | Service의 workspace thread/Turn lifecycle을 보존하고 R/A account seam을 별도로 두며, listener/environment/feature router composition만 분리 |
| Algorithm donor | Current production bundle verifier의 hash, containment와 complete-tree verification | Hard-coded package-local selection은 버리고 descriptor-driven Runtime release verifier와 resolver에 적용 |
| Supersede for public journey | Current chooser/v2 activation·store identity semantics, development bootstrap/materializer, first-run `App` root | V3 admission/setup/public host/Guided→Compact root로 대체하되 v2 original bytes와 compatibility/action tests 보존 |
| New | Runtime release package, semester-workspace package, AccountRuntimeCoordinator, public application/host, Landing, clean exporter/RC/publication/evidence tooling | Wayfinder delivery DAG의 exclusive owner가 구현 |

Current `App.css` 전체를 release 전에 broad rewrite하지 않는다. U1이 existing brand token을 선택적으로 재사용하되 새 root의 semantic typography, button과 layout foundation을 먼저 만든다.

### UI와 Landing

Semester Ready prototype의 **A Guided checkpoint → C Compact status center**를 채택한다. U1의 내부 구현 순서는 별도 `U0` ticket 없이 다음 하나의 ownership 아래 둔다.

```text
desktop typography/button/layout foundation
→ account/Guided Setup states
→ Compact Ready/recovery states
→ two-viewport visual acceptance
```

Local UI guardrail:

- Ready title 약 28–36px
- 본문 16px
- helper·status 최소 13–14px
- 11–12px uppercase는 low-density eyebrow/badge에만 사용
- 한 decision의 primary action 하나, neutral secondary와 명확한 destructive hierarchy
- 1440×900과 1920×1080에서 핵심 status/action이 clip·overlap되지 않음
- keyboard focus, loading, empty, error와 recovery state를 같은 semantic token으로 표현

Landing은 C Open field guide의 editorial hierarchy와 B exact release card를 결합한다.

- 한 개의 `h1`: `한 학기를 함께 관리하는 AY`
- Hero 바로 아래 first fold의 release-generated exact command와 copy action
- first-run field guide와 `AVAILABLE`/`COMING NEXT` 구분
- compatibility, Runtime/cache/network/data boundary와 bounded recovery
- 실제 Docs, GitHub, Privacy, Security, Apache-2.0, NOTICE, third-party notice link
- body 16–18px, helper/status 최소 13–14px, keyboard·`aria-live` copy feedback, meaningful alt와 reduced motion
- Prototype version·size·URL과 remote font/asset을 production fallback으로 사용하지 않음

Remotion은 public homepage→command→Docs/repository/trust 운영 방식의 benchmark일 뿐 visual donor가 아니다.

### Parallel delivery contract

Implementation은 하나의 immutable contract spine과 exclusive lane DAG를 따른다. 구현 spine의 `S0–S2`와 publication stage의 `S0–S10`은 반드시 `Spine S*`, `Publication S*`로 namespace 한다.

```text
Spine S0 → Spine S1 → Spine S2
Spine S2 → R1 + B1 + D1 + U1 + L1
R1 → A1 + R2
B1 + A1 → B2
A1 + B2 → C1
C1 + D1 + U1 → H1
H1 → I0
R2 + H1 + L1 → G0
G0 → G1 → I1
I0 + I1 → I2
I2 → P1
```

| Wave | Nodes |
| --- | --- |
| W0 | `Spine S0 → S1 → S2` 직렬 |
| W1 | `R1 + B1 + D1` |
| W2 | `A1 + U1 + L1` |
| W3 | `B2 + R2` |
| W4 | `C1` 직렬 composition mount |
| W5 | `H1` |
| W6 | `I0 + G0` |
| W7 | Coordinator-only `G1` RC assembly/acceptance |
| W8 | `I1` |
| W9 | `I2` |
| W10 | Detached 사용자 승인 아래 `P1` |

| Node | Blocking predecessors |
| --- | --- |
| `R1`, `B1`, `D1`, `U1`, `L1` | `Spine S2` |
| `A1`, `R2` | `R1` |
| `B2` | `B1 + A1` |
| `C1` | `A1 + B2` |
| `H1` | `C1 + D1 + U1` |
| `I0` | `H1` |
| `G0` | `R2 + H1 + L1` |
| `G1` | `G0` fixed-SHA review |
| `I1` | `G1` accepted RC receipt |
| `I2` | `I0 + I1` |
| `P1` | `I2 + detached publication authorization` |

`Spine S0`는 compile-only workspace/lock scaffold, `S1`은 frozen interface·fixtures다. `Spine S2`는 behavior-preserving Server composition/listener split과 surviving parent-Spec Browser stabilization oracle을 함께 닫는다. Existing current-workbench harness에서 unselected evidence·quote mismatch·stale base invalid proposal과 duplicate/late Review decision이 safe failure·confirmed mutation 0으로 수렴하는 consolidated trace를 추가하고 기존 lower-seam exhaustive tests를 유지한다. `S2` SHA가 immutable `spineTipSha`다. 이후 shared contract change는 coordinator의 reviewed serial `contractTipSha` delta로만 진행한다.

Coordinator 1명과 최대 3명의 lane writer만 동시에 active하다. Lane은 exclusive path와 fixed `handoffSha`를 사용하고 sibling branch를 직접 merge하지 않는다. Integration coordinator만 fixed reviewed SHA를 DAG 순서대로 `--no-ff` merge한다. Conflict는 lane owner가 최신 integration head에서 다시 해결·review한다.

| Owner | Nodes | Exclusive authority |
| --- | --- | --- |
| `C` Contract/integrator | `Spine S0`, `S1`, `S2`, `C1` | `@ay-ple/product-contract`, root·workspace manifest/lockfile, TypeScript graph, Server composition과 serial contract delta. S2에 한해 current-workbench Browser stabilization trace를 쓰고 fixed `spineTipSha` 뒤 E2E ownership을 `I`에 handoff |
| `R` Runtime | `R1`, `R2` | `@ay-ple/codex-chat-runtime`의 managed account lifecycle, exact SDK/bridge와 Runtime archive/legal evidence |
| `A` Account transition | `A1` | Server `AccountRuntimeCoordinator`, app-wide account/Runtime transition lease |
| `B` Semester setup | `B1`, `B2` | V3 admission, canonical workspace bundle/context guard, setup envelope와 Ready commit |
| `D` Runtime delivery | `D1` | Descriptor-only `RuntimeResolver` |
| `U` Product UI | `U1` | Account·Guided Setup·Compact Ready의 Chat Shell source |
| `L` Landing | `L1` | Landing rendering과 release-display consumer |
| `H` Host | `H1` | Public application package/bin과 foreground process lifecycle |
| `I` Integration/QA | `I0`, `I1`, `I2` | Repository-only integration adapter, cross-surface fixtures와 deterministic/packed/live smoke |
| `G` Release | `G0`, `P1` | Clean exporter, RC generator, legal/provenance, publication reconciliation |
| Coordinator checkpoint | `G1` | Fixed integration SHA에서 reviewed G0 실행, RC acceptance receipt와 retained artifact |

`U1`은 UI source 전체를 소유하고 별도 U0 writer를 만들지 않는다. `I0`는 S2의 Browser negative oracle을 변경해 debt를 숨기지 않고 새 setup/Ready cross-surface suite에서 regression으로 소비한다. `G1`은 writer ticket이 아니라 reviewed `G0`를 fixed integration SHA에서 실행해 retained RC path/digest와 acceptance receipt를 남기는 coordinator checkpoint다.

### Public source, license와 publication

- Public repository는 fixed `hub` commit tree의 reviewed positive allowlist로 만드는 clean root snapshot이다.
- Camp 종료 전 `hub`가 development canonical이고 public repository는 derived release source다. 이후 한 번의 explicit authority cutover 전까지 public tree를 직접 patch하지 않는다.
- Canonical cutover 전 public repository는 issue·feedback·Private Vulnerability Reporting만 받고 external code PR을 merge하지 않는다. Cutover 뒤 contribution은 DCO 1.1 `Signed-off-by`를 요구하고 별도 CLA를 두지 않는다.
- Public README와 Docs는 한국어가 정본이고 README 상단에 짧은 English product summary를 둔다. 표준 `LICENSE`와 DCO text는 official English 원문을 유지한다.
- GitHub Private Vulnerability Reporting은 `SECURITY.md`의 단일 confidential channel이다. 일반 bug만 public issue로 받고 personal email, response-time SLA와 latest preview 밖 support를 약속하지 않는다.
- First-party source/docs와 text-only prompt로 생성한 세 brand image는 Apache-2.0이고 `NOTICE`는 `Copyright 2026 하성욱`을 포함한다.
- Third-party component는 `REDIST-01..12`가 모두 green이고 original license, NOTICE, source evidence, SBOM와 provenance의 canonical roster set equality가 모두 일치해야 한다. `unknown`, `human_review`, missing license/source는 publication blocker다.
- Public source는 README, Docs, `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES`, original license tree, SBOM/provenance, `SECURITY.md`, `CONTRIBUTING.md`, `PRIVACY.md`와 brand provenance를 포함한다.
- Public export는 root camp `AGENTS.md`, `skills-lock.json`, `.agents/**`, camp `.github/**`, `artifacts/**`, `references/openai-codex` gitlink, `docs/specs/**`, `docs/tickets/**`, `docs/wayfinding/**`, `docs/archive/**`, `docs/spikes/**`, internal backlog·agent-operation docs와 clone-local ignored/untracked state를 hard deny한다. Dedicated package resource 아래의 reviewed product `AGENTS.md`와 built-in Skills만 application resource로 허용한다.
- Local-first는 offline 또는 외부 전송 없음이 아니다. npm/GitHub/OpenAI network와 Agent가 읽은 workspace content·tool result의 provider 전송 가능성, official OAuth hosted-success와 organization setup의 token-bearing local success URL limitation을 Privacy에 명시한다. First preview에는 AY-PLE telemetry·crash upload·cloud backend가 없다.

Publication success path:

```text
Publication S0 LOCAL_RC_ACCEPTED
→ S1 PUBLICATION_AUTHORIZED
→ S2 PUBLIC_SOURCE_VERIFIED
→ S3 APPLICATION_DRAFT_STAGED
→ S4 RUNTIME_RELEASE_VERIFIED
→ S5 NPM_VERSION_VERIFIED
→ S6 NPM_PUBLISH_CREDENTIAL_RETIRED
→ S7 EXACT_PUBLIC_SMOKE_VERIFIED
→ S8 APPLICATION_RELEASE_VERIFIED
→ S9 PAGES_DEPLOYMENT_VERIFIED
→ S10 CURRENT_PUBLIC_PREVIEW
```

외부 write 전 detached 사용자 승인은 candidate intent digest, target과 operation scope를 exact하게 bind한다. 각 operation은 `read-before-write → one write → authoritative readback`이다.

Publication durability와 self-reference는 다음 artifact로 분리한다.

| Artifact | Authority와 binding |
| --- | --- |
| `release-intent.json` | G1이 freeze한 immutable candidate intent와 expected external identities |
| `publication-authorization.json` | Owner-only detached 사용자 승인. Intent digest, target과 허용 operation scope를 bind |
| `prebinding-publication-receipts.jsonl` | Publication S2–S7의 immutable receipt snapshot. 아직 존재하지 않는 application binding ledger를 참조하지 않음 |
| `application-binding-ledger.json` | S8 전에 source, Runtime, npm, credential retirement와 exact public smoke identity를 한 번 freeze한 public ledger. 자신을 실은 future application release ID를 넣지 않음 |
| `publication-receipts.jsonl` | External append-only journal. S8 application activation과 S9 Pages receipt는 binding-ledger digest를 참조 |
| `publication-projection.json` | 위 immutable/append-only evidence에서 파생한 current/blocked/incident projection이며 독립 authority가 아님 |

Ambiguous operation은 Git ref/commit/tree, GitHub release ID/tag와 asset name/digest, npm `name@version`·integrity·tarball, Pages deployment ID/source/artifact/sentinel 같은 natural reconciliation identity를 먼저 읽는다. Missing receipt를 추측해 append하거나 future ID를 prebinding artifact에 넣지 않는다. S8·S9 receipt만 frozen binding ledger를 참조하고, application release activation receipt를 넣기 위해 ledger byte를 다시 쓰지 않는다.

첫 `ay-ple` package publish는 actual registry에서 name availability·ownership을 다시 확인한 뒤 protected GitHub-hosted workflow와 short-lived least-privilege npm GAT를 쓰는 direct publish다. CI가 exact public source에서 재생성한 tarball이 G1 reference와 byte-for-byte 같을 때만 `--access public --tag preview --provenance`로 그 CI byte를 publish한다.

첫 draft 전에 target repository의 immutable releases가 enabled인지 authoritative API로 확인하고 protected application/Runtime tag rules를 검증한다. Publish credential 주입 전에는 credential-free `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_WORKFLOW_SHA`가 expected public repository, protected tag, exact source/workflow commit과 일치해야 한다.

GAT가 주입된 모든 success, failure와 ambiguous branch는 unconditional retirement barrier로 합류한다. Token delete 뒤 exact credential로 authenticated identity probe가 명시적으로 거절돼야 retry, incident closure나 Public S7로 진행한다. S7 guard는 `S5 green ∧ all injected GAT retired`다.

Runtime과 application GitHub Release는 draft asset 전체를 먼저 검증하고 immutable release로 publish한다. Npm/application/Runtime name·version·tag·byte identity는 실패 뒤 수정·재사용하지 않는다. Pages는 application release와 exact public smoke 이후 마지막에 열며 `release/current.json`이 application version/tag/release URL과 immutable binding-ledger digest를 제공할 때만 `current`다.

## Testing Decisions

### Highest practical seam

구현 acceptance의 최고 실용 seam은 existing real Browser→Vite→Express→`@ay-ple/product-contract`→production setup facade→deterministic Runtime Playwright harness다. 별도 end-to-end framework를 만들지 않고 이 seam에 S1 frozen fixtures와 repository-only setup adapter를 추가한다.

`Spine S2`가 current-workbench 최고 seam에서 invalid evidence/unselected source, quote mismatch, stale base와 duplicate/late Review decision family를 consolidated safe-failure/no-mutation trace로 고정한다. Existing lower-seam exhaustive validation은 유지한다. `I0`는 이 oracle을 삭제·완화하거나 fixture를 바꿔 숨기지 않고, 새 setup/Ready integration graph가 old academic kernel regression을 깨지 않았다는 blocking input으로 소비한다.

Release acceptance는 거대한 한 E2E가 아니라 같은 `candidateDigest`를 참조하는 다음 다섯 class의 합성이다.

`candidateDigest`의 minimum binding은 source SHA, npm name/exact version/`dist.integrity`/tarball SHA-256, Runtime release ID/tag/asset name/archive SHA-256/canonical manifest digest와 workspace bundle descriptor/complete-tree digest다. G1 RC, I1 packed, I2 live와 Publication S0 intent는 이 tuple의 같은 expected byte identity를 참조하고, publication readback이 채운 external natural identity를 receipt chain으로 추가할 뿐 candidate를 바꾸지 않는다.

| Evidence class | Required proof |
| --- | --- |
| `resolver_scripted` | `200/206/416`, corrupt cache/archive, unavailable exact asset, redirect/content encoding, synthetic prior no-auto-downgrade와 still-supported prior exact-pair rollback |
| `setup_deterministic(I0)` | Every durable boundary, response loss, duplicate approve, discard replay, lease race, Browser-safe projection와 hostile context |
| `packed_black_box(I1)` | Exact G1 `.tgz`, pre-seeded exact verified Runtime cache와 isolated roots에서 signed-out fresh Account Read/login offer, mutation-before-preflight 0, dynamic host와 signal/process cleanup |
| `prepublication_live(I2)` | Real managed OAuth, actual pinned Codex, hostile ancestor/user context, quarantine control, representative `SIGKILL`, Ready·relaunch |
| `exact_public(Publication S7)` | Actual npm exact version와 immutable Runtime의 clean Mac first run, `Semester Ready`, same-version relaunch와 zero orphan/port/lease |

`I2`가 green이어도 public delivery를 증명하지 않는다. `Publication S7`만 actual public smoke다.
I1은 public network/provider identity를 검증하지 않고 public package에 test hook·fixture를 넣지 않은 black-box host만 사용한다.

### Targeted and integration tests

- Product contract는 valid Account/Setup/Ready fixture와 missing/extra/unknown/private field family를 strict decode한다.
- Server producer와 Browser consumer가 S1의 같은 fixture roster를 exact하게 사용한다.
- Account tests는 fresh read, delayed completion, cancel/completion race, status idempotency, logout, unavailable, auth-only command denial과 transition close를 검증한다.
- Runtime account patch는 generated/official SDK provenance, bounded pending slot, no undrained notification queue와 process-tree cleanup을 유지한다.
- Resolver tests는 descriptor mismatch가 network 전에 실패하고, resume/restart, safe archive, corrupt generation+retained archive repair, ambiguous owner, cancellation과 no-fallback을 검증한다.
- Admission tests는 inspect no-write, exclusive new leaf, existing empty collision, v2/read-only, no-clobber publish, fresh validation, unknown entry preservation과 safe discard를 검증한다.
- Setup fault injection은 temp write, file sync, rename, directory sync와 readback의 직전·직후, response loss와 duplicate command에서 old-or-new complete envelope만 허용한다.
- Bundle/context tests는 package preverification, exact declared tree, missing absent-only recovery, modified/extra/symlink preservation, parent Git/user canary exclusion과 action-time revalidation을 검증한다.
- Host tests는 dynamic same-origin, secondary-instance join, Browser open failure, listener refusal, `SIGHUP`/`SIGINT`/`SIGTERM`, representative primary `SIGKILL`과 full process graph/lock cleanup을 검증한다.
- Landing tests는 release display input valid/missing/mismatch, one `h1`, exact copy, actual links, no placeholder/`@latest`, keyboard·aria-live와 no horizontal overflow를 검증한다.
- Export/pack tests는 two-export identity, tracked source before/after identity, positive allowlist/hard deny, dependency closure, bundle source→staging→tarball complete-tree equality와 legal/SBOM/provenance set equality를 검증한다.
- Publication scripted tests는 ambiguous GitHub/npm/Pages result, GAT retirement, immutable identity, ledger digest chain, retry/incident matrix와 zero-write-on-authorization-mismatch를 검증한다.

모든 integration merge는 clean worktree에서 다음을 직렬 실행한다.

```bash
npm test
npm run typecheck
npm run build
npm run lint -w @ay-ple/chat-shell
```

Contract delta에는 producer/consumer fixture equality와 private-field leak scan을 추가한다. Runtime delta에는 relevant exact SDK, bridge/actual, production manifest before/after verification을 추가한다. Docs 변경에는 `npm run check:docs-links`와 `git diff --check`를 적용한다.

### UI, live와 public acceptance

- U1과 L1은 1440×900, 1920×1080에서 visual review를 받는다.
- A Guided Setup은 final confirmation 전 disk mutation 0과 primary/secondary hierarchy를 보여야 한다.
- C Ready는 Course·RawMaterial·action을 합성하지 않고 recovery에서 Ready/next journey를 숨겨야 한다.
- DOM, URL, Browser storage와 client log에서 raw path, receipt phase, digest, Runtime/native/account private identity를 검사해 0건이어야 한다.
- I2는 actual managed Browser login, hosted success page에서 AY-PLE tab 복귀, callback port interference, cancel/close/reconnect, auth-only close, workspace Runtime, native config/Skills guard, Ready·relaunch와 cleanup을 검증한다.
- I2 post-Ready conformance는 production launch attestation과 exact-match하는 repository-only harness에서 ephemeral `thread/start` 하나의 `instructionSources`만 읽고 Turn·rollout 없이 close한다. 이 harness는 public tarball에 포함하지 않는다.
- Public S7 manual first run은 release card/README의 `npx ay-ple@<exact-version>`을 그대로 사용하고 npm prompt를 사람이 승인한다. Normal close 뒤 automation-only `--yes` command로 relaunch한다.
- S7은 clean Apple Silicon Mac/OS user or reverted VM, default Gatekeeper, repository 밖 cwd와 fresh npm/app/auth/cache/workspace roots를 요구한다. Environment `HOME` override만으로 clean machine을 합성하지 않는다.
- Token, OAuth URL/user code/login ID, account email, raw provider error, absolute credential path와 auth bytes/hash는 owner-only evidence에도 저장하지 않는다.
- `unknown`, inferred source, manual security override, broad cleanup 또는 harness cleanup으로만 process가 사라진 결과는 green이 아니다.

## Out of Scope

- `.app`·`.dmg`, Developer ID signing·notarization·stapling, Mac App Store
- Node/npm도 필요 없는 installer, background daemon, login item와 OS auto-start
- Windows, Linux, Intel/universal macOS와 other package manager support
- In-app/delta updater, moving release channel, remote kill switch와 generic rollback UI
- Current v2 migration, existing folder adoption와 `/Users/swh/Desktop/code/2nd-1st-semester` import
- `ImportSource`, Course setup, RawMaterial archive, 첫 학업 action과 current 3-pane workbench의 public activation
- Default timezone, locale, Course, model, reasoning effort와 service tier
- Setup Skill, “학기 시작 Skill”, generic workflow/migration framework
- Conversation persistence, thread catalog, multi-client/multi-user, generic approval center
- Mobile·small-screen responsive work
- LMS, Calendar, cloud sync, AY-PLE backend, telemetry·analytics·crash upload
- Public source/npm/GitHub Release/Pages를 이 spec 작성 세션에서 실제로 생성·게시하는 일

## Open Questions

None.

## Further Notes

- 이 spec의 source map은 [public npx 첫 출시 Wayfinder](../wayfinding/public-npx-first-release/map.md)다.
- Release 시점에 npm `ay-ple` name·ownership, actual public repository URL, third-party `REDIST-*` closure, OAuth callback port behavior, final version·size·Browser minimum과 public link를 다시 확인해야 한다. 이들은 설계 미결정이 아니라 값이 없거나 mismatch면 fail closed하는 `G1`·`I2`·`P1` release gate다.
- Semester Ready와 Landing의 throwaway prototype은 각각 immutable evidence branch의 verdict만 소비한다. Prototype source, CSS와 fixture release value를 production으로 port하지 않는다.
- 2026-07-31 Demo Day는 external milestone이며 implementation ticket priority field나 domain state가 아니다.
- `/to-tickets`는 위 DAG node 하나당 fresh-context implementation ticket 하나를 기본으로 만들고, 각 ticket에 `handoffSha`, `writablePaths`, predecessor evidence, consumed fixture, required checks, independent review owner와 downstream artifact를 기록한다.
- `G1`은 implementation writer ticket이 아니라 coordinator checkpoint로 유지하고, `P1`은 detached 사용자 승인 없이는 external write 0건이어야 한다.
