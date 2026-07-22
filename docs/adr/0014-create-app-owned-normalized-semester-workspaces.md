# SemesterWorkspace를 app-owned normalized scaffold로 생성한다

분류: 활성

성숙도: 채택

부분 대체한 결정: [ADR 0006 — 제품 실행에서 패키지, 앱 데이터, 학기 작업공간의 루트를 분리한다](0006-separate-package-app-data-and-semester-workspace-roots.md)의 사용자가 고른 기존 폴더를 `workspaceRoot`로 직접 채택하는 admission·identity 의미

보존하는 결정: ADR 0006의 `packageRoot`·`appDataRoot`·`workspaceRoot` 분리, [ADR 0013 — Product-only public surface와 durable v2 store baseline을 채택한다](0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md)의 current v2 bytes 보존·explicit migration 원칙

## 맥락

현재 pre-public 구현은 chooser나 development materializer가 넘긴 기존 디렉터리를 열고 `.ay-ple/workspace-state.json`을 만들면 active ready workspace로 취급한다. 이 방식은 이미 있는 자료 폴더를 바로 쓰는 데는 간단하지만, 첫 public setup에서 workspace identity, Course 관계, schema version, validation, 중단 복구와 재실행을 앱이 일관되게 보장할 authority가 없다. Skill이나 폴더명이 구조를 암묵적으로 정하게 두면 앱 버전과 Agent 행동에 따라 같은 학기가 다른 의미로 열릴 수도 있다.

## 결정

- 사용자는 학년·학기와 생성 위치를 고르고, AY-PLE app code가 그 위치 아래에 정규화된 `SemesterWorkspace`를 scaffold한다. 임의의 기존 자료 폴더를 `SemesterWorkspace`로 직접 활성화하지 않는다.
- `WorkspaceManifest`가 workspace identity, Course identity와 관계, workspace format을 소유한다. 폴더명과 디렉터리 배치는 사람이 읽기 위한 projection이며 identity authority가 아니다.
- App code가 `WorkspaceManifest` schema와 version, scaffold, validation과 실제 version change에 필요한 deterministic migration을 소유한다. Setup Skill은 app-owned operation을 호출·조율하거나 migration plan을 제안할 수 있지만 canonical schema를 정의하거나 validation을 우회하지 않는다.
- Directory layout은 `WorkspaceManifest`, 자료 반입을 위한 inbox, Course projection과 app-owned state 같은 오래 유지할 seam만 최소로 고정한다. Exact file name, field roster와 physical state split은 구현 spec이 정하되 authority를 중복시키지 않는다.
- 기존 폴더나 자료 묶음은 workspace 밖의 `ImportSource`다. 후속 import가 분석·mapping plan과 사용자 검토를 거쳐 반입하기 전에는 `RawMaterial`이나 active workspace가 아니다.
- `WorkspaceManifest` validation을 통과한 app-owned `SemesterWorkspace`만 active `workspaceRoot`와 native Codex thread의 `cwd`가 될 수 있다. `appDataRoot`의 workspace registry는 active·recent pointer를 보존할 뿐 workspace identity의 정본이 아니다.
- Current v2 store가 이미 가진 stable workspace ID와 Course identity를 변경 없이 새 `WorkspaceManifest`와 함께 authoritative하게 두지 않는다. 구현은 하나의 versioned format으로 migration하거나, 물리적으로 나눈 format 사이의 비중첩 authority와 migration을 명시해야 한다.
- Existing current v2 bytes는 새 규칙만으로 자동 scaffold·adopt·reset하지 않는다. 지원하는 explicit migration이 없으면 원본 bytes를 보존하고 fail closed한다. App이 migration을 소유한다는 결정은 실제 version change 전에 generic migration framework를 만들라는 의미가 아니다.

## 검토한 선택지

| 선택지 | 판정 | 이유 |
| --- | --- | --- |
| 기존 자료 폴더를 그대로 `SemesterWorkspace`로 연다 | 거절 | 초기 진입은 짧지만 identity·schema·migration과 safe relaunch를 기존 tree의 우연한 shape에 의존시킨다. |
| Setup Skill이 workspace 구조를 생성·판정한다 | 거절 | 앱 버전과 durable state가 따라야 할 authority가 prompt·Skill 구현으로 이동하고 deterministic validation을 우회할 수 있다. |
| App-owned scaffold를 만들고 기존 자료는 `ImportSource`로 반입한다 | 채택 | Workspace lifecycle과 migration은 앱이 통제하면서 Agent의 분석 능력은 검토 가능한 import plan에 사용할 수 있다. |

## 결과

First-run setup과 ready-relaunch는 `WorkspaceManifest` 생성·validation, active registry pointer와 incomplete scaffold recovery를 제품 상태로 다뤄야 한다. `Semester Ready`는 이 setup이 끝났다는 뜻이며 Course·`RawMaterial`·학업 action 완료를 뜻하지 않는다. 현재 chooser/current-v2 vertical은 구현 증거로 유지되지만 이 결정의 public admission contract를 구현한 것으로 보지 않는다.
