# 010 — 재개 가능한 setup과 workspace instruction/Skill bundle의 authority를 정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다](009-semester-workspace-admission.md)

## Question

App code가 `SemesterWorkspace` schema, scaffold와 validation의 canonical authority를 유지하면서 first-run setup을 재개 가능하게 만들려면 Browser wizard, App Module, workspace instruction/Skill bundle과 repository-only reusable script 사이의 책임을 어떻게 나눌 것인가? 어떤 생성 승인·durability boundary와 ownership evidence가 중단 후 resume·safe discard를 허용하며, setup을 Codex Turn이나 generic migration workflow에 의존시키지 않고 `Semester Ready`까지 닫으려면 어떤 금지 경계가 필요한가?

## Answer

상세 current evidence, Design It Twice 비교, authority matrix와 failure outcome은 [재개 가능한 setup과 workspace instruction/Skill bundle authority 설계](../assets/resumable-setup-authority-design.md)에 기록했다.

채택안은 Browser-facing `SetupJourney`와 Ticket 009의 deep `SemesterWorkspaceAdmission.inspect/apply`를 조합하는 **C + A**다. Browser는 학년·학기·parent location, editable suggested folder name, 최종 확인·생성 승인과 recovery 선택만 소유한다. `SetupJourney`는 first-run·최종 확인·resume·recovery의 제품 순서를 숨기고, admission Module만 canonical path, workspace ID, exclusive scaffold, v3 aggregate, validation과 owned cleanup을 수행한다. Reusable script는 같은 App facade에 explicit test input을 넣는 repository-only dev/smoke adapter이며 public bin도 별도 schema authority도 아니다.

학생이 학년, 학기, 생성 위치와 folder name을 최종 확인하고 `학기 공간 만들기`를 누르기 전에는 durable setup state를 만들지 않는다. 승인한 exact setup plan만 transaction이 되며, 중단 뒤 plan·target·ownership evidence가 모두 같으면 재승인 없이 자동 resume한다. Matching `owned_incomplete`에는 명시적 safe discard를 제공할 수 있지만 known app-created file의 no-follow 개별 제거와 empty-only directory removal만 허용한다. Drift, unknown entry, user file이나 mismatched digest가 있으면 overwrite·recursive delete 없이 manual recovery로 수렴한다. Exact receipt field, sync와 phase transition은 Ticket 011이 소유한다.

Fresh workspace에는 exact application package가 선언한 `AGENTS.md`와 `.agents/skills/` built-in Skill root로 구성된 workspace instruction/Skill bundle을 no-clobber로 설치한다. Verifier는 `AGENTS.md`와 각 declared Skill root의 exact complete tree를 검사하고 descriptor 밖 sibling root를 소유하지 않는다. 이 bundle은 workspace identity나 v3 schema authority가 아니지만 `Semester Ready`와 같은 exact application version의 relaunch에 필요한 digest gate다. Missing declared file은 workspace data를 보존하고 Codex action을 막은 뒤 explicit no-clobber recovery만 허용한다. Modified byte나 declared Skill root의 undeclared entry는 App이 overwrite·move·delete하지 않는 `manual_recovery_required`로 수렴한다. Workspace-local `AGENTS.override.md`, `.codex/` 또는 descriptor 밖 Skill entry도 보존하되 first-preview effective-native-context gate가 Codex action을 막는다.

Production host는 ambient repository root가 아닌 dedicated package resource subtree의 bundle descriptor·declared complete tree를 workspace mutation 전에 검증하고 그 identity를 approved setup transaction에 bind한다. Admitted workspace와 valid bundle은 pending result이며, fixed `project_root_markers=[]`, controlled `HOME`과 global instruction이 없는 app-managed `CODEX_HOME`으로 workspace Runtime을 만들고 fresh account read를 마친 뒤에만 active Ready pointer를 commit한다. Runtime·thread 생성 전과 각 product Codex action admission에서 declared bundle을 다시 검증하고, hostile parent repository의 ancestor `AGENTS.md`·`.codex/`·Skills가 섞이지 않는 actual native discovery smoke를 요구한다.

Mandatory setup에는 Codex `Thread`·live Turn·setup Skill이 없다. 별도의 “학기 시작 Skill”도 만들지 않는다. Initial defaults는 선택한 year-level·term metadata와 workspace instruction/Skill bundle뿐이며 default Course, timezone, locale, model·reasoning setting을 추가하지 않는다. Cross-version setup migration, generic `ImportSource` coordinator와 concrete production implementation은 이번 first-public-release decision 범위 밖이다.
