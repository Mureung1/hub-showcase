# SemesterWorkspace를 app-owned normalized scaffold로 생성한다

분류: 활성

성숙도: 채택

부분 대체한 결정: [ADR 0006 — 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다](0006-separate-package-app-data-and-semester-workspace-roots.md)의 사용자가 고른 기존 폴더를 `workspaceRoot`로 직접 채택하는 admission·identity 의미

보존하는 결정: ADR 0006의 `packageRoot`·`appDataRoot`·`workspaceRoot` 분리, [ADR 0013 — Product-only public surface와 durable v2 store baseline을 채택한다](0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)의 current v2 bytes 보존·explicit migration 원칙

역사적 account 결정: [ADR 0017 — 제품 account lifecycle에 Codex-managed Browser OAuth를 사용한다](0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md). 이 ADR은 `Semester Ready`의 workspace scaffold·identity 조건을 계속 소유하지만 ADR 0017의 account 연결·pre-workspace Runtime 조건은 current product target이 아니다. 현재 account authority는 Codex Runtime 격리 문서가 소유한다.

## 맥락

현재 pre-public 구현은 chooser나 development materializer가 넘긴 기존 디렉터리를 열고 `.ay-ple/workspace-state.json`을 만들면 active ready workspace로 취급한다. 이 방식은 이미 있는 자료 폴더를 바로 쓰는 데는 간단하지만, 첫 public setup에서 workspace identity, Course 관계, schema version, validation, 중단 복구와 재실행을 앱이 일관되게 보장할 authority가 없다. Skill이나 폴더명이 구조를 암묵적으로 정하게 두면 앱 버전과 Agent 행동에 따라 같은 학기가 다른 의미로 열릴 수도 있다.

## 결정

- 사용자는 학년·학기와 existing parent location을 고르고, AY-PLE app code가 그 아래의 존재하지 않는 child leaf에 정규화된 `SemesterWorkspace`를 exclusive하게 scaffold한다. Existing empty directory도 임의로 adopt·overwrite·delete하지 않으며, valid existing workspace는 별도 reopen·recovery intent로만 연다.
- 첫 normalized workspace format은 current app-owned store seam을 explicit `formatVersion: 3`으로 올린 single atomic aggregate다. Aggregate 안의 logical `WorkspaceManifest`가 workspace identity, semester metadata, zero-or-more Course identity·관계와 projection mapping을 단독 소유하고, dynamic app state는 그 ID를 참조할 뿐 다시 정의하지 않는다. 별도 Manifest sidecar와 state file split은 첫 preview에 만들지 않는다.
- Workspace identity는 학년·학기·path에서 파생하지 않는 opaque ID다. `학년`은 학생이 선택하는 extensible year-level이며 UI가 1–4를 기본 제안한다. Term도 1·2학기를 기본 제안하되 계절학기·custom value를 막는 closed enum으로 두지 않는다. Course가 없어도 workspace admission은 성립한다.
- App code가 workspace aggregate schema·version과 logical `WorkspaceManifest` validation, scaffold와 실제 version change에 필요한 deterministic migration을 소유한다. Mandatory first-run setup은 Browser wizard와 app-owned Module만 수행하며 Codex `Thread`·live Turn·setup Skill은 참여하지 않는다. 후속 `ImportSource` 분석에 Agent를 쓰더라도 app-owned operation과 사용자 검토를 우회할 수 없다.
- Browser-facing `SetupJourney` App Module이 first-run·최종 확인·생성 승인·resume·recovery의 제품 순서를 소유한다. 이 Module은 `SemesterWorkspaceAdmission.inspect/apply`에 schema-controlled root reservation, `.ay-ple` aggregate와 required directory mutation을 위임하고, 별도의 app-owned bundle implementation에는 exact `AGENTS.md`와 descriptor-declared built-in Skill root만 위임한다. 두 mutation authority는 disjoint하며 Browser·script는 어느 filesystem 순서도 조립하지 않는다.
- Browser는 mutation 전에 학년, 학기, 생성 위치와 editable folder name을 최종 확인하게 한다. 승인 전 입력 draft는 durable state가 아니며, 승인한 exact setup plan만 transaction이 된다. 중단 뒤 exact plan·ownership evidence가 일치하면 재승인 없이 resume하고, drift·unknown entry가 있으면 원본을 보존한 recovery로 수렴한다. 이 결정은 허용 policy를 정하며 exact journal·sync·registry와 recovery protocol은 resulting implementation spec이 소유한다.
- Directory layout은 `.ay-ple/workspace-state.json` v3 aggregate, 자료 반입을 위한 `inbox/`와 Course projection을 위한 `courses/`를 최소 schema seam으로 고정한다. Fresh setup은 package-owned `AGENTS.md`와 descriptor가 선언한 `.agents/skills/` built-in Skill root로 구성된 workspace instruction/Skill bundle도 설치하고 exact digest를 검증한다. Bundle authority는 `AGENTS.md` 한 file과 각 declared built-in Skill root의 exact complete tree를 소유한다. `.agents/skills/` container의 descriptor 밖 sibling root는 소유하지 않지만, 첫 preview의 effective-native-context gate는 workspace-local `AGENTS.override.md`, `.codex/` 또는 descriptor 밖 Skill entry가 있으면 bytes를 보존한 채 Codex action을 막는다. 이 bundle은 workspace·Course identity authority가 아니지만 `Semester Ready`와 같은 exact application version의 relaunch에 필요한 Codex action prerequisite다. Missing declared file은 explicit no-clobber recovery 후보이며 modified byte나 declared Skill root 안의 undeclared entry는 App이 overwrite·move·delete하지 않는 manual recovery로 수렴한다. Exact field·bundle roster·encoding은 resulting implementation spec이 정하고, 구현 뒤 package code·README가 current behavior를 소유한다.
- 일반 자료 폴더나 자료 묶음은 workspace 밖의 `ImportSource`다. 후속 import가 분석·mapping plan과 사용자 검토를 거쳐 반입하기 전에는 `RawMaterial`이나 active workspace가 아니다. Current v2 root는 normalized v3 workspace도 `ImportSource`도 아닌 별도 legacy outcome이다.
- Required directory seam과 `.ay-ple/workspace-state.json` v3 aggregate의 fresh validation을 통과한 `SemesterWorkspace`만 active `workspaceRoot`와 native Codex thread의 `cwd`가 될 수 있다. Aggregate publication 전 partial scaffold, stored validation receipt나 `appDataRoot` registry pointer는 admission authority가 아니다. App-owned ownership evidence는 incomplete root의 resume·discard 권한만 제한하며 committed workspace reopen의 필수 조건이 아니다. Owned discard도 known app-created entry를 no-follow로 다시 확인해 개별 제거하고 empty directory만 제거하며 recursive tree delete를 사용하지 않는다.
- Current v2 store가 소유한 stable workspace ID·Course identity 옆에 sidecar를 추가하지 않는다. First preview의 supported v2 migration set은 비워 두고 `legacy_migration_required/readOnly`로 original bytes를 보존한다. 후속 concrete migration은 source identity를 새 ID·reference rewrite로 바꿀지, 아니면 기존 identity를 승계하면서 source retirement·lineage를 어떻게 durable하게 증명할지 별도로 결정해야 하며 registry pointer만으로 두 root의 동일 identity를 정당화하지 않는다. Generic migration framework는 실제 supported source→target pair보다 먼저 만들지 않는다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| 기존 자료 폴더를 그대로 `SemesterWorkspace`로 연다 | 거절 | 초기 진입은 짧지만 identity·schema·migration과 safe relaunch를 기존 tree의 우연한 shape에 의존시킨다. |
| Setup Skill이나 live Turn이 workspace 구조·journey를 생성·판정한다 | 거절 | 앱 버전과 durable state가 따라야 할 authority가 prompt·model availability로 이동하고 deterministic validation을 우회할 수 있다. |
| App-owned scaffold를 만들고 기존 자료는 `ImportSource`로 반입한다 | 채택 | Workspace lifecycle과 migration은 앱이 통제하면서 Agent의 분석 능력은 검토 가능한 import plan에 사용할 수 있다. |
| Current v2 옆에 physical Manifest sidecar를 추가 | 거절 | 같은 workspace·Course ID가 두 authority에 남고 current v2의 의미를 version bump 없이 바꾼다. |
| Manifest와 dynamic state를 별도 versioned file로 분리 | 보류 | 장기 locality는 좋지만 first preview부터 version-pair와 cross-file scaffold·migration recovery가 필요하다. |
| Logical Manifest와 dynamic state를 single v3 aggregate에 배치 | 채택 | Stable·dynamic 책임을 논리적으로 나누면서 current exact-byte aggregate seam과 한 atomic version authority를 유지한다. |

## 결과

First-run setup과 ready-relaunch는 `WorkspaceManifest` 생성·validation, workspace instruction/Skill bundle·effective native context 검증, active registry pointer와 incomplete scaffold recovery를 제품 상태로 다뤄야 한다. `Semester Ready`는 workspace-side setup이 끝났다는 뜻이며 Course·`RawMaterial`·학업 action 완료를 뜻하지 않는다. 구체적인 제품 연결 범위는 Product Brief가 소유한다.

`@ay-ple/semester-workspace` v3 codec·admission·bundle·context·durable setup kernel은 이 adopted target의 기반으로 유지한다. Current Server는 current-v2 compatibility decoder·parity만 소비하고 v3 kernel을 composition하지 않으므로, 현재 chooser/current-v2 vertical이나 package primitive 자체를 app-owned workspace capability로 주장하지 않는다.
