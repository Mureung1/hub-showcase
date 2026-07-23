# AY-PLE public npx 첫 출시

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Node와 npm이 설치된 supported macOS arm64에서 repository·system Python·기존 AY-PLE auth/cache 없이 public landing의 한 명령으로 AY-PLE을 시작하는 첫 public release contract를 확정하고 implementation-ready spec으로 넘긴다. Thin public npm launcher가 versioned·verified Runtime release를 app data에 준비하고 local companion과 browser UI를 연 뒤, ChatGPT browser OAuth를 거쳐 사용자가 고른 학년·학기·위치에 app-owned `SemesterWorkspace`를 scaffold하고 기본값·validation을 완료해 `Semester Ready`에 도달하는 하나의 정직한 release path를 닫는다. Public `AY-PLE` repository의 reviewed lineage·export authority, source·Runtime license와 provenance, publication pipeline, clean-machine evidence와 충돌 없는 병렬 구현 seam도 같은 spec의 선행 결정으로 확정한다. 자료 archive/import와 실제 학업 action은 `Semester Ready` 이후의 독립된 제품 여정이며 이 map의 release-blocking 성공 조건이 아니다.

## Notes

- 2026-07-22 사용자는 Apple Developer 비용이 필요한 signed·notarized public DMG를 첫 release 기준에서 제외하고, `.app`·`.dmg` 전체를 이번 범위에서 내린 뒤 public `AY-PLE` repository, landing, public npm launcher와 GitHub Release payload 경로를 선택했다. 이 사용자 방향은 [Public npx release 경로를 채택한다](tickets/001-adopt-public-npx-release-route.md)에 기록한다.
- `npx`는 zero-prerequisite installer가 아니다. 첫 release는 Node/npm을 명시적 prerequisite로 두는 macOS arm64 public preview이며, 정확한 지원 버전과 사용자 여정은 [첫 public preview의 성공 여정을 고정한다](tickets/004-first-public-preview-success-journey.md)가 결정한다.
- [macOS-first local web app ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md)의 local companion·browser UI 경계를 유지한다. [Public npx distribution ADR 0016](../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)이 exact application package와 immutable verified Runtime release의 장기 authority를 소유하며, 이 map은 그 제품 entrypoint 이후의 release journey를 계속 탐색한다.
- [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 `packageRoot`·`appDataRoot`·`workspaceRoot` 분리, [ADR 0014](../../adr/0014-create-app-owned-normalized-semester-workspaces.md)의 app-owned scaffold·`WorkspaceManifest` authority, [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 official SDK·supervised Runtime, [ADR 0013](../../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)의 product-only public surface와 durable store는 입력 invariant다. OAuth credential bytes는 AY-PLE product origin·API·Browser bundle state·storage, `SemesterWorkspace`, public source와 release manifest에 포함하지 않는다.
- 현재 verified macOS arm64 Runtime bundle, complete-tree verifier, product-only Server composition, First Assignment vertical과 persistent dogfood profile은 재사용 후보다. `scripts/product-dogfood.mts`는 fixture와 개발 process composition을 소유하므로 public launcher의 production implementation으로 자동 승격하지 않는다.
- [ADR 0015](../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)에 따라 public `AY-PLE`은 fixed `hub` SHA의 reviewed positive allowlist로 만든 clean root commit에서 시작한다. Demo Day와 final camp submission까지 `hub`를 canonical로 유지한 뒤 public `main`으로 한 번만 authority를 cutover하며, first-party source·docs·brand는 Apache-2.0, third-party material은 별도 fail-closed evidence gate를 따른다.
- ADR 0015의 Apache-2.0 결정은 third-party material을 재허가하지 않는다. OpenAI Codex source의 `LICENSE`·`NOTICE`도 전체 Runtime 재배포 승인을 대신하지 않으며, [Ticket 003a](tickets/003a-third-party-redistribution-evidence.md)의 native payload·dependency notice·SBOM·provenance·secret gate를 계속 적용한다.
- `/Users/swh/Desktop/code/2nd-1st-semester`는 onboarding 입력이나 첫 release workspace가 아니라 후속 학업 capability·`ImportSource` migration을 발굴하는 실제 사용 evidence다. 6.3GB·22,000-entry 루트를 `SemesterWorkspace`로 열거나 전체 import하는 것을 첫 public release 완료 조건으로 두지 않는다.
- `SemesterWorkspace`는 AY-PLE이 생성하고 schema·validation·deterministic migration을 소유하는 정규화된 학기 공간이다. 기존 자료 폴더는 workspace로 직접 열 대상이 아니라 후속 `ImportSource`로 다룬다. Mandatory setup은 Codex Skill·live Turn 없이 Browser `SetupJourney`와 app-owned admission Module이 수행하고, fresh workspace에는 workspace instruction/Skill bundle을 설치한다. Bundle은 declared built-in Skill root별 exact complete tree로 검증하고, 별도 workspace-local native context는 보존하되 첫 preview Codex action에는 허용하지 않는다. [ADR 0014](../../adr/0014-create-app-owned-normalized-semester-workspaces.md)가 adopted format·admission·setup journey·bundle 역할을 소유한다. [Ticket 010](tickets/010-resumable-setup-authority.md)은 최종 확인·생성 승인과 허용 resume·recovery policy를, [Ticket 011](tickets/011-bootstrap-and-setup-recovery.md)은 exact durability·recovery protocol을 결정한다.
- `Semester Ready`의 학생용 표현은 `학기 공간 준비 완료`이며 Codex account 연결과 app-owned scaffold·기본 설정·validation이 끝난 setup checkpoint다. Course·RawMaterial·live model turn·학업 action이나 AY의 학기 이해를 뜻하지 않는다. [Ticket 012](tickets/012-semester-ready-first-action.md)가 채택한 A → C 전환에 따라 생성 승인 전에는 guided setup을, Ready·same-version relaunch·recovery에는 compact semester status center를 사용한다. 실제 import capability 전의 `첫 자료 가져오기`는 disabled `COMING NEXT` surface이고 자료 pane·Chat composer를 준비된 것처럼 노출하지 않는다.
- 첫 preview의 supported lane은 Apple Silicon Mac의 macOS 13.5 이상, Node `>=22.12 <23`, npm 10.x와 최신 Chrome/Chromium으로 제한하고 npm registry·GitHub Releases·Codex OAuth·provider network access를 prerequisite로 둔다. Node 24·Safari·Intel Mac·다른 OS는 clean smoke 전까지 지원을 약속하지 않는다.
- Public 인증은 AY-PLE `appDataRoot`에 격리한 ChatGPT browser OAuth만 지원하며 API key·access token·device-code와 전역 `~/.codex` credential import를 제외한다. Active login attempt의 matching completion과 fresh ChatGPT account 확인, launch·relaunch의 fresh managed-session 확인은 [Ticket 008](tickets/008-browser-oauth-lifecycle.md)의 contract를 따른다. First-run의 취소·실패는 workspace 생성 전의 재시도 가능한 `login_required`로 수렴하고, pending·active workspace에서 session을 다시 확인할 수 없으면 workspace를 보존한 `account_required/workspace_reauth`로 C의 보호 상태에 진입한다.
- First-run 성공 뒤 같은 exact application version의 public `npx` 명령이 cache·OAuth session·workspace registry를 재사용해 `WorkspaceManifest`, workspace instruction/Skill bundle과 effective native context를 재검증하고 setup wizard 없이 Ticket 012의 compact semester status center를 여는 `ready-relaunch`를 별도 필수 release gate로 둔다. 중단된 setup은 안전하게 재개하거나 recovery로 수렴하고 incomplete state·중복 scaffold·자동 덮어쓰기·삭제를 성공으로 취급하지 않는다.
- Landing은 설치 안내문이 아니라 `한 학기를 함께 관리하는 AY`의 제품 가치, 복사 가능한 public `npx` 명령, 제품 경험·작동 방식, compatibility·trust, Docs·GitHub repository를 잇는 공식 public product homepage다. [Remotion](https://www.remotion.dev/)은 개별 visual을 복제하는 대상이 아니라 homepage를 repository·public 실행 흐름의 entrypoint로 운영하는 방식의 benchmark이며, 실제 OAuth·setup은 `npx`가 여는 local AY-PLE Browser UI가 소유한다.
- Wayfinder 자체는 한 session에 frontier ticket 하나만 resolve한다. [병렬 delivery collision과 초기 lane boundary를 조사한다](tickets/002-parallel-delivery-contracts.md)가 먼저 충돌 표면을 찾고, 주요 seam 결정 뒤 [최종 병렬 delivery contract와 integration protocol을 정한다](tickets/014-final-parallel-delivery-contracts.md)가 implementation DAG의 input을 잠근다. Resulting spec 뒤 `/to-tickets`가 이를 file ownership·blocking edge·merge gate가 있는 ticket graph로 변환한다.
- 2026-07-31은 외부 Demo Day milestone이다. 날짜 없는 작업 순서와 완료 상태는 계속 [AY-PLE 개발 백로그](../../product/ay-ple-development-backlog.md)가 소유한다. Ticket 001은 사용자 방향의 Wayfinder 기록이고 [Ticket 007a](tickets/007a-record-public-distribution-decision.md)가 distribution 결정을 ADR 0016과 각 정본에 owner-first로 반영했다. Resulting spec은 Wayfinder ticket 대신 이 formal owner를 인용한다.
- 이 map은 남은 decision·research·prototype과 resulting spec 전 formal owner 정리만 소유한다. Production code, public repository 생성, npm publish, GitHub Release·Pages publication, implementation ticket과 camp PR은 resulting spec 이후 각 실행 surface가 소유한다.

## Decisions so far

- [Public npx release 경로를 채택한다](tickets/001-adopt-public-npx-release-route.md) — Signed·notarized public DMG를 제외하고 public repository·landing·npm launcher·versioned Runtime release를 첫 배포 경로로 선택했다.
- [병렬 delivery collision과 초기 lane boundary를 조사한다](tickets/002-parallel-delivery-contracts.md) — Wayfinder writer를 한 명으로 유지하고 shared contract·root lockfile·Runtime generated surface·cross-surface E2E를 single-owner seam으로 격리하되 exact writer 수와 protocol은 Ticket 014로 넘겼다.
- [공개 inventory와 provenance gap을 조사한다](tickets/003-audit-publication-inventory-and-redistribution.md) — Fixed revision의 source·npm·Runtime·asset inventory를 고정했으며 public package·first-party license·native notice·clean snapshot·secret/SBOM gate 부재를 owner ticket의 fail-closed blocker로 분류했다.
- [Third-party 재배포 evidence와 release notice gate를 확정한다](tickets/003a-third-party-redistribution-evidence.md) — Source·npm·Runtime을 별도 배포 표면으로 판정하고 exact license·NOTICE·source evidence를 canonical roster에서 생성·대조하며, 누락·unknown·human review 상태는 publication을 자동 차단하도록 고정했다.
- [첫 public preview의 성공 여정을 고정한다](tickets/004-first-public-preview-success-journey.md) — 공식 Landing·public `npx`·ChatGPT browser OAuth·app-owned SemesterWorkspace scaffold·`Semester Ready`를 첫 여정으로, `ready-relaunch`를 별도 필수 gate로 고정하고 자료 import·학업 action을 post-Ready 범위로 분리했다.
- [Public repository authority와 license를 확정한다](tickets/005-public-repository-authority-and-license.md) — Reviewed clean snapshot, pre/post-Demo canonical cutover, Apache-2.0 first-party license와 fail-closed public trust·export 경계를 고정했다.
- [npx production composition을 고른다](tickets/006-npx-production-composition.md) — Public `ay-ple` package/bin 하나가 prebuilt UI·Server를 foreground Node host 하나로 실행하고, dynamic loopback same-origin listener·single instance·bounded Runtime cleanup을 소유하도록 고정했다.
- [Runtime release delivery·integrity·versioning을 정한다](tickets/007-runtime-release-delivery-integrity.md) — Exact npm package의 embedded descriptor가 deterministic GitHub Runtime asset 하나를 pin하고, 단일 `RuntimeResolver`가 complete-tree verification·content-addressed cache·resume·retained-archive offline repair를 fail closed하게 소유하며 rollback 단위를 still-supported 이전 exact app release로 제한했다.
- [Public npx distribution 결정을 formal owner에 채택한다](tickets/007a-record-public-distribution-decision.md) — ADR 0016을 별도 장기 정본으로 채택하고 ADR 0006 root ownership, Product Brief, Runtime 격리, 구현 지도와 Development Backlog에 current·target을 분리해 반영했다.
- [Browser-launched Codex OAuth lifecycle을 설계한다](tickets/008-browser-oauth-lifecycle.md) — Official Codex-managed browser login과 app-data `CODEX_HOME`만 credential authority로 두고, transient single-attempt lease·matching completion+fresh ChatGPT account read, auth-only bootstrap Runtime과 pre-Ready close→workspace Runtime 재생성을 고정했다.
- [Product OAuth lifecycle 결정을 formal owner에 채택한다](tickets/008a-record-product-auth-decision.md) — ADR 0017을 단일 account lifecycle 정본으로 채택하고 Product Brief·Runtime 격리·구현 지도·Development Backlog에 current와 adopted target을 분리해 전파했다.
- [첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다](tickets/009-semester-workspace-admission.md) — Exclusive new leaf와 single v3 aggregate를 채택해 logical WorkspaceManifest만 identity를 소유하게 하고, Course-free admission·fresh validation과 current v2 no-auto-migration을 고정했다.
- [재개 가능한 setup과 workspace instruction/Skill bundle의 authority를 정한다](tickets/010-resumable-setup-authority.md) — Browser `SetupJourney` + deep admission Module, 최종 확인·approved-only transaction, exact-match resume·safe recovery, declared built-in Skill root별 complete-tree bundle·effective-native-context·native project boundary gate를 채택하고 setup Skill을 제외했다.
- [Bootstrap과 setup의 durability·recovery contract를 확정한다](tickets/011-bootstrap-and-setup-recovery.md) — `SetupJourney.reconcile/observe`, owner-only single state envelope, `approved → prepared → active_ready` commit과 durable `discard_requested`, evidence-based cross-root resume·same-version ready-relaunch를 채택했다.
- [Semester Ready 완료와 후속 여정 진입 표면을 검증한다](tickets/012-semester-ready-first-action.md) — 생성 승인 전 A Guided checkpoint에서 Ready·relaunch·recovery의 C Compact status center로 전환하고, Course·RawMaterial-independent Ready truth, capability-gated `첫 자료 가져오기`와 projection-allowlisted recovery action을 채택했다.
- [Landing의 product promise와 install truth를 검증한다](tickets/013-landing-install-truth.md) — C Open field guide의 제품 서사를 골격으로 B의 exact release card·execution path·trust adjacency를 결합하고, release-generated command·size·link와 bounded failure·rollback 표시 경계를 채택했다.
- [최종 병렬 delivery contract와 integration protocol을 정한다](tickets/014-final-parallel-delivery-contracts.md) — 세 commit의 immutable contract spine, coordinator 1명+최대 3명의 exclusive lane writer, A-held transition lease와 B-owned Ready commit·native-context guard, serial Server composition, G-owned RC generator·coordinator-only clean assembly와 fixed-SHA single merge queue를 고정했다. 구현 DAG는 Ticket 015→016 결정 뒤 repository-only deterministic setup→provider-free packed bootstrap→live OAuth→승인 publication gate로 수렴한다.
- [Public source·npm·Runtime publication gate를 확정한다](tickets/015-publication-release-gates.md) — Fixed RC와 detached 사용자 승인 뒤 public source→private application draft staging→immutable Runtime→CI-built exact npm provenance/readback→unconditional publish-credential 폐기→actual public smoke→immutable application binding ledger→Pages current sentinel 순서로만 승격하고, sentinel-backed conditional README와 recoverable receipt epoch로 부분 상태를 정직하게 reconcile하며 실패한 npm version·release identity를 재사용하지 않도록 고정했다.

## Not yet specified

없음. 현재 in-scope fog는 precise한 Wayfinder ticket으로 승격했다.

## Out of scope

- `.app`·`.dmg`, Developer ID signing·notarization·stapling, Mac App Store와 Apple 유료 배포 계정
- Node/npm도 필요 없는 zero-prerequisite installer, background daemon·login item와 OS-level auto-start
- Windows, Linux, macOS Intel·universal binary와 다른 package manager의 동등 지원
- Hosted SaaS, cloud sync, multi-user·multi-client, mobile·small-screen 지원과 외부 calendar·LMS 자동 연동
- In-app·delta auto-updater와 원격 update service. Exact version cache, 명시적 교체·repair·rollback 경계는 in-scope다.
- Custom paid domain, analytics·growth stack과 첫 release에 불필요한 대규모 marketing surface. 첫 Landing의 Hero, public `npx` entrypoint, 제품 경험 설명·demo, 작동 방식, 지원 환경, Docs·GitHub repository·license/trust 연결은 in-scope다.
- 전체 `2nd-1st-semester`의 PDF·PPTX·HWP/HWPX·audio 완전 import, 모든 과목 workflow의 제품화와 generic capability marketplace
- Generic transcript persistence, multi-thread catalog, model·reasoning 설정과 모든 native activity의 1:1 UI
- 이 Wayfinder session에서 production 구현, public GitHub repository·npm package·Release·Pages 생성 또는 GitHub Issue·PR 게시

## Resulting spec

아직 없음.
