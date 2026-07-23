# 재개 가능한 setup과 workspace instruction/Skill bundle authority 설계

조사일: 2026-07-23

대상: [재개 가능한 setup과 workspace instruction/Skill bundle의 authority를 정한다](../tickets/010-resumable-setup-authority.md)

## 판정

첫 public preview의 mandatory setup은 **Browser wizard와 App code만** 수행한다. Codex `Thread`·live Turn·setup Skill은 이 경로에 참여하지 않는다. Browser-facing `SetupJourney`가 입력, 최종 확인, 승인된 작업의 재개와 recovery projection을 하나의 작은 interface로 제공한다. [Ticket 009](../tickets/009-semester-workspace-admission.md)의 app-owned `SemesterWorkspaceAdmission.inspect/apply`만 root reservation, workspace schema와 required directory mutation을 수행하고, app-owned bundle implementation은 descriptor에 선언된 instruction path만 다루는 disjoint authority다.

학생이 최종 확인 화면에서 학년, 학기, 생성 위치와 folder name을 확인하고 `학기 공간 만들기`를 누른 뒤에만 exact setup plan을 durable하게 기록하고 mutation을 시작한다. 승인 전 입력 draft는 저장하지 않는다. 중단 뒤 filesystem·ownership evidence와 승인한 plan이 정확히 같으면 같은 작업을 자동 재개하고, 하나라도 달라지면 overwrite 없이 recovery로 전환한다.

Fresh workspace에는 package-owned `AGENTS.md`와 descriptor가 선언한 `.agents/skills/` 아래 built-in Skill root로 구성된 **workspace instruction/Skill bundle**을 설치한다. Verifier는 `AGENTS.md`와 각 declared Skill root를 exact complete tree로 검사하고 `.agents/skills/` container의 sibling root를 bundle authority로 흡수하지 않는다. Bundle integrity와 effective native context는 별도 gate다. 첫 preview에서 workspace-local `AGENTS.override.md`, `.codex/` 또는 descriptor 밖 Skill entry가 있으면 bytes를 보존하고 Codex action을 막는다. 이 bundle은 workspace identity나 schema authority가 아니지만 `Semester Ready`와 같은 exact application version의 relaunch에 필요한 검증 대상이다. 별도의 “학기 시작 Skill”이나 setup Skill은 만들지 않는다.

## Current evidence

| 관찰 | 근거 | 결정에 주는 제약 |
| --- | --- | --- |
| Pre-workspace Runtime은 account operation만 허용하며 thread·turn·학업 action을 열 수 없다. | [ADR 0017](../../../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md) | Mandatory setup을 Codex Turn이나 Skill orchestration에 의존시킬 수 없다. |
| Workspace schema·ID·exclusive scaffold·fresh validation과 owned cleanup은 `SemesterWorkspaceAdmission.inspect/apply`가 숨기도록 이미 결정했다. | [Ticket 009](../tickets/009-semester-workspace-admission.md), [schema·scaffold 조사](semester-workspace-schema-scaffold-research.md) | Browser, script와 Skill이 `mkdir`, JSON, ID, validation 순서를 다시 조립하면 안 된다. |
| 현재 dogfood helper는 fixture와 process composition을 소유하고 materializer는 fixture tree 교체와 recursive removal을 사용한다. | [`scripts/product-dogfood.mts`](../../../../scripts/product-dogfood.mts), [`scripts/semester-workspace-materializer.mts`](../../../../scripts/semester-workspace-materializer.mts) | 둘 다 production setup authority로 승격하지 않고, 새 smoke adapter는 같은 App Module만 호출해야 한다. |
| Public npm tarball은 dogfood·materializer·development script를 제외하고 package-owned resource만 positive allowlist로 싣는다. | [Ticket 006](../tickets/006-npx-production-composition.md) | Reusable script는 repository-only test aid이고 public bin이나 별도 installer가 아니다. Built-in bundle byte는 application resource로 명시적으로 pack해야 한다. |
| 현재 managed product Skill은 App이 app-data resource의 exact version·digest를 검증하는 선례가 있지만 workspace native discovery를 검증하지는 않는다. | [`apps/server/src/assignment-recipe.ts`](../../../../apps/server/src/assignment-recipe.ts) | Workspace bundle도 prompt가 아니라 package resource와 digest가 authority가 되어야 하며 actual discovery conformance는 별도 smoke가 필요하다. |
| Official Codex는 기본적으로 project root까지 상위 `AGENTS.md`·project config를 탐색하고 repository Skills도 working directory부터 repo root까지 찾는다. Empty `project_root_markers`는 current working directory에서 parent search를 멈춘다. | [Project root detection](https://learn.chatgpt.com/docs/config-file/config-advanced.md#project-root-detection), [Skill discovery](https://learn.chatgpt.com/docs/build-skills.md#where-to-save-skills) | 사용자가 다른 Git repository 아래에 workspace를 만들어도 ancestor context가 섞이지 않도록 fixed Runtime config·controlled `HOME`과 actual native discovery smoke가 필요하다. |

## Design It Twice

| 대안 | Interface | 장점 | 판정 |
| --- | --- | --- | --- |
| A. Admission 두 operation을 Browser가 직접 사용 | Browser가 `inspect`와 `apply`를 순서대로 호출하고 화면 state를 직접 조립한다. | Module 수가 가장 적고 schema mutation authority가 명확하다. | 일부 채택. 내부 mutation seam으로 유지하지만 Browser에 resume·recovery 순서를 노출하지 않는다. |
| B. Generic approval coordinator | Setup, `ImportSource`, migration을 모두 plan/approve/apply journal 하나로 일반화한다. | 장기적으로 비슷한 승인 흐름을 재사용할 가능성이 있다. | 거절. 아직 concrete import operation도 없고 first release에 generic workflow engine과 추상 receipt를 만든다. |
| C. Browser-facing `SetupJourney` | Browser는 setup command 하나를 보내고 projection 하나를 받는다. Module이 admission과 bundle operation을 조율한다. | UI가 filesystem phase를 알지 않아도 되고 launch·최종 확인·resume·recovery가 한 경계로 수렴한다. | 채택. A의 깊은 admission Module 위에 얇지만 응집된 제품 journey를 둔다. |
| D. Setup Skill이 journey를 조율 | Codex가 app-owned operation을 호출해 input·확인·apply를 진행한다. | 대화형 확장은 쉽다. | 거절. OAuth 직후 mandatory path에 live model dependency를 넣고 product setup의 상태·copy authority를 prompt로 옮긴다. |

채택안은 **C + A**다. `SetupJourney`는 Browser가 알아야 할 제품 상태만 소유하고, `SemesterWorkspaceAdmission`은 path·schema·filesystem 복잡성을 계속 숨긴다. 후속 `ImportSource`가 실제로 등장하기 전에는 둘을 generic coordinator로 합치지 않는다.

## Authority allocation

| 주체 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| Browser wizard | 학년·학기·parent location 입력, editable folder name, 최종 확인과 명시적 생성 승인, recovery 선택, Browser-safe status·copy | Absolute canonical target, workspace ID 발급, schema byte, filesystem 순서, setup journal, OAuth credential |
| `SetupJourney` App Module | First-run·최종 확인·approved resume·recovery의 제품 순서, opaque setup-plan/recovery ID, admission과 bundle operation 조합, Ready 전 prerequisite projection | Workspace schema codec, raw filesystem mutation, credential lifecycle, generic import workflow |
| `SemesterWorkspaceAdmission` | Side-effect-free inspect, authority-bound apply, canonical path·exclusive create, workspace ID·v3 aggregate·required directory seam, fresh validation, owned incomplete 분류·schema-controlled safe cleanup | Browser copy, Codex Turn, instruction file 내용·경로, active account 판단 |
| App-owned bundle implementation | Dedicated package resource subtree, exact `AGENTS.md`, declared `.agents/skills/` built-in Skill root별 complete-tree roster·digest, no-clobber install·fresh verification·drift outcome | Root reservation·workspace schema, `.agents/skills/` container의 descriptor 밖 sibling root, ambient repository-root instruction, 사용자 파일 임의 교체 |
| Effective-native-context gate | Root `AGENTS.override.md`, workspace-local `.codex/`, descriptor 밖 `.agents/skills/` entry와 declared Skill root 내부 undeclared entry의 first-preview action eligibility | 발견한 사용자 byte의 수정·삭제, bundle·workspace identity, 후속 user Skill 지원 policy |
| Repository-only dev/smoke adapter | Explicit test input을 같은 `SetupJourney` 또는 그 app-owned facade에 전달하고 결과를 검증 가능한 형태로 출력 | 별도 schema·defaults·`mkdir`·cleanup, public bin, npm consumer install surface |
| Codex Skill | `Semester Ready` 이후 반복 가능한 학업 action의 처리 전략 | First-run setup, workspace 생성·판정, “학기 시작” ceremony, setup resume·recovery |

## SetupJourney seam

아래 shape은 책임 경계를 보여 주는 설계 sketch다. Exact TypeScript type·HTTP endpoint·reason enum은 resulting implementation spec이 고정한다.

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
}
```

- `launch`는 durable approved transaction이나 active workspace를 조사해 input, automatic resume, recovery 또는 ready-relaunch projection으로 수렴한다.
- `prepare`는 mutation 없이 admission inspection을 수행한다. 기본 folder name은 학년·학기에서 `AY-PLE-2학년-1학기`처럼 제안하되 학생이 수정할 수 있다. Target collision에는 자동 suffix를 붙이지 않고 다른 이름·위치를 확인하게 한다.
- 최종 확인 projection은 학년, 학기, parent location, folder name과 사람이 확인할 display path를 보여 준다. Canonical path는 계속 Server의 mutation authority이며 Browser가 보낸 path string을 다시 authority로 신뢰하지 않는다. Workspace ID나 authority token도 Browser에 내보내지 않는다.
- `approve`만 exact setup plan을 durable setup transaction으로 승격하고 mutation을 시작한다. 같은 승인 요청의 반복은 중복 scaffold를 만들지 않는다.
- `recover`는 App이 제시한 허용 action만 받는다. Browser가 path나 삭제 목록을 제출하지 않는다.

`launch`의 automatic resume는 read가 아니라 mutation-capable reconciliation이다. 기존 read-only bootstrap GET에 숨기지 않고 single-instance host startup 또는 exact-Origin guard를 통과한 command에서만 실행한다. 여러 Browser tab과 반복 command는 같은 durable transaction에 join해야 하며 이 transport·concurrency protocol은 Tickets 011·014가 고정한다.

## First-run sequence

1. Production host가 ambient repository root가 아닌 dedicated package resource subtree의 bundle descriptor와 package complete tree를 workspace mutation 전에 검증한다. Descriptor는 `AGENTS.md`와 각 built-in Skill root의 exact complete-tree roster·digest를 선언한다. Missing·corrupt package resource는 setup을 시작하지 않는다.
2. Official managed ChatGPT account가 fresh하게 확인되면 Browser가 setup input을 연다.
3. 학생이 학년, 학기와 existing parent location을 고른다. App이 folder name을 제안하고 학생은 필요하면 수정한다.
4. `SetupJourney`가 side-effect-free inspect를 수행하고 최종 확인 화면을 보여 준다.
5. 학생이 `학기 공간 만들기`를 누르면 승인한 exact setup plan을 durable transaction으로 먼저 기록한다.
6. Admission Module이 exclusive scaffold와 v3 aggregate fresh validation을 수행한다.
7. App-owned bundle implementation이 verified package descriptor에 선언된 `AGENTS.md`와 `.agents/skills/` built-in Skill complete tree를 no-clobber로 설치하고 exact digest를 다시 확인한다. 별도 public Interface나 physical Module split은 이번 결정이 고정하지 않는다.
8. Workspace aggregate·required directory seam·workspace instruction/Skill bundle과 effective native context를 모두 fresh verify하고 pending setup result로 기록한다. 아직 active Ready pointer를 commit하지 않는다.
9. Auth-only bootstrap Runtime을 완전히 닫고 fixed `project_root_markers=[]`, exact workspace `cwd`, controlled `HOME`과 global instruction이 없는 app-managed `CODEX_HOME`으로 새 Runtime을 만든다.
10. 새 Runtime의 fresh ChatGPT account read까지 성공한 뒤 active Ready pointer를 commit하고 `학기 공간 준비 완료`를 표시한다.

`Semester Ready`는 live model turn을 요구하지 않는다. Initial defaults는 선택한 year-level·term metadata와 workspace instruction/Skill bundle뿐이다. Default Course, timezone, locale, model, reasoning effort와 service tier는 만들지 않는다.

## Durability와 recovery boundary

승인 전 draft는 process memory의 UI 편의 state일 뿐이다. Browser나 Server가 종료되면 input부터 다시 시작한다. Durable setup state는 사용자가 승인한 exact setup plan에서만 시작하며 최소한 setup request identity, input·plan digest, expected target의 server-private identity, expected workspace identity, package bundle identity와 lifecycle phase를 서로 bind해야 한다. Exact field, encoding, sync, journal transition과 registry commit protocol은 [Ticket 011](../tickets/011-bootstrap-and-setup-recovery.md)이 소유한다.

| 관찰 | 제품 outcome |
| --- | --- |
| 승인 전 종료 | Durable state 없이 input 화면에서 다시 시작한다. |
| 승인한 plan, transaction과 ownership evidence가 모두 exact match | 재승인 없이 같은 operation을 자동 resume한다. |
| Target·plan·bundle identity 또는 filesystem evidence가 달라짐 | Mutation을 멈추고 recovery를 보여 준다. |
| Matching `owned_incomplete`와 known app-created entry만 존재 | `resume`과 명시적 safe `discard`를 제공할 수 있다. Discard는 개별 no-follow 제거와 empty-only directory removal만 사용한다. |
| Unknown entry, user file, symlink, mismatched marker·digest가 있음 | 자동 resume·discard·overwrite를 금지하고 bytes를 보존한 manual recovery로 수렴한다. |
| Admission이 끝났지만 bundle setup이 완료되지 않음 | Workspace data를 보존하고 exact bundle recovery로 수렴한다. Admitted workspace 전체를 cleanup 대상으로 확대하지 않는다. |
| Ready workspace의 declared `AGENTS.md` 또는 built-in Skill이 missing | Workspace와 학업 data를 보존하고 Codex action을 막는다. Explicit recovery는 target이 여전히 absent일 때만 no-clobber recreate할 수 있다. |
| Ready workspace의 declared `AGENTS.md` 또는 built-in Skill byte가 modified | Workspace와 학업 data를 보존하고 Codex action을 막은 `manual_recovery_required`로 수렴한다. App은 기존 byte를 overwrite·move·delete하지 않는다. Exact 안내와 재검증 interaction은 Tickets 011·012가 고정한다. |
| Declared built-in Skill root 안에 undeclared file·directory가 있음 | Root의 exact complete-tree digest drift다. 모든 byte를 보존하고 Codex action을 막은 `manual_recovery_required`로 수렴한다. |
| Root `AGENTS.override.md`, workspace-local `.codex/` 또는 descriptor 밖 `.agents/skills/` entry가 있음 | App-owned bundle digest에는 포함하지 않고 보존한다. 다만 Codex가 실제로 읽는 context를 바꿀 수 있으므로 first-preview Runtime·thread·product Codex action을 막는다. User-added Skill 지원 policy는 후속 결정이다. |
| Bundle까지 valid하지만 auth-only close, workspace Runtime start 또는 fresh account read가 실패 | Workspace·bundle과 pending transaction을 보존하고 Ready·active pointer·Codex action을 금지한다. Process cleanup 뒤 Runtime transition retry, provider-unavailable 또는 reauth outcome으로 수렴하며 workspace discard를 제안하지 않는다. |
| Same exact application version의 ready-relaunch | Aggregate, required seam, workspace instruction/Skill bundle, effective native context와 fresh account를 다시 확인한 뒤 wizard 없이 연다. |

Safe `discard`는 matching incomplete setup에서 App이 생성했다고 증명한 entry에만 적용한다. Committed·Ready workspace, broad parent directory, unknown entry와 사용자 자료를 삭제하는 operation은 이 Interface에 없다.

## First-release scope boundary

이번 결정은 fresh first-public-release setup과 **같은 exact application version의 relaunch**만 다룬다. 아직 첫 version도 배포하지 않은 제품에 미리 bundle update·workspace migration·cross-version resume framework를 넣지 않는다.

| 범위 밖 | 이유 |
| --- | --- |
| “학기 시작 Skill” 또는 setup Skill | Mandatory setup은 Browser + App code로 닫혔고 별도 학업 action이 아니다. |
| Cross-version bundle update·merge | 이번 release는 fresh setup과 같은 exact application version의 relaunch만 다룬다. |
| Current v2·`ImportSource` migration coordinator | Ticket 009가 first preview migration set을 비웠고 concrete operation이 없다. |
| Default Course·timezone·locale·model·reasoning settings | `Semester Ready`에 필요하지 않고 별도 사용자 결정을 선취한다. |
| Script의 독립 production entrypoint | Public path는 Landing → npx → Browser wizard 하나다. |

## Downstream input

| Ticket | 이 설계에서 고정한 입력 | 남겨 둔 결정 |
| --- | --- | --- |
| [Ticket 011](../tickets/011-bootstrap-and-setup-recovery.md) | Approved-only durable boundary, exact-match auto-resume, safe discard·manual recovery, bundle verification gate | Exact journal·registry schema, sync·crash phase, repeat-launch observable contract |
| [Ticket 012](../tickets/012-semester-ready-first-action.md) | 최종 확인 항목, editable suggested leaf, Course-free Ready, bundle drift action block | Exact Browser state·copy·recovery interaction과 post-Ready first action |
| [Ticket 014](../tickets/014-final-parallel-delivery-contracts.md) | `SetupJourney`, Admission, bundle resource·materializer와 thin smoke adapter의 ownership seam | File-level implementation lanes와 integration order |
| Resulting spec | C + A interface, mandatory Browser/App path, workspace instruction/Skill bundle와 no-Skill boundary | Exact types, endpoints, file roster, tests와 implementation ticket graph |

## Testability boundary

`SemesterWorkspaceAdmission`, app-data transaction store와 bundle filesystem behavior는 local-substitutable dependency다. Resulting implementation은 temp directory integration과 phase별 fault injection으로 setup-plan 준비의 무변경성, 승인 전 no-write, duplicate approve, crash resume, preverified resource requirement, pending-vs-Ready commit, unknown-entry preservation, missing/modified declared bundle, declared Skill root의 extra entry, workspace-local native-context conflict와 empty-only discard를 검증한다. Repository-only smoke adapter도 이 same facade를 사용하며 production logic을 복제하지 않는다.

Mandatory setup graph에는 Codex Skill adapter나 mock 자체가 없다. Codex Runtime test double은 OAuth account projection과 post-admission Runtime transition을 검증할 때만 필요하고, workspace setup-plan·scaffold·bundle setup의 성공 조건으로 사용하지 않는다.

Pinned native Runtime integration은 parent Git fixture에 conflicting `AGENTS.md`, `.codex/`와 `.agents/skills/`를 두고 nested workspace를 `cwd`로 시작해 ancestor project entry가 발견되지 않고 package-declared workspace instruction·Skill이 존재하는지 검증한다. 별도 negative fixture는 workspace-local `AGENTS.override.md`, `.codex/`, descriptor 밖 Skill entry와 declared Skill root 내부 extra file이 각각 action gate를 닫는지 검증한다. `Semester Ready`뿐 아니라 Runtime·thread 생성 전과 각 product Codex action admission에서 bundle과 effective context를 다시 확인해 Browser UI를 우회한 stale action도 닫는다.

## Formal owner와 domain 영향

- Workspace admission·identity, `SetupJourney` authority와 workspace instruction/Skill bundle의 workspace 역할은 [ADR 0014](../../../adr/0014-create-app-owned-normalized-semester-workspaces.md)가 소유한다.
- Package가 exact bundle byte와 descriptor를 싣는 distribution 책임은 [ADR 0016](../../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)이 소유한다.
- Current와 target layout·Runtime action gate는 [Codex Runtime 격리](../../../architecture/codex-runtime-isolation.md)가 소유하고, 구현 순서와 completion gate는 [Development Backlog](../../../product/ay-ple-development-backlog.md)가 소유한다.
- `SetupJourney`, setup plan, transaction과 bundle materializer는 implementation Module·protocol 이름이지 학업 domain noun이 아니다. [CONTEXT.md](../../../../CONTEXT.md)에 새 glossary term을 추가하지 않는다.
