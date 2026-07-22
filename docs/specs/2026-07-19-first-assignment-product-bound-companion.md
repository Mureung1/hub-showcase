# First Assignment Product-bound Codex Companion

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets
- Source: [AY-PLE 첫 학업 vertical의 Codex runtime sufficiency](../wayfinding/codex-chat-application-foundation/map.md)

## Problem Statement

AY-PLE에는 Codex와 대화할 수 있는 integration tracer, explicit `SemesterWorkspace`·`Course`·TXT `RawMaterial` registry와 자료 중심 3-pane workbench가 있다. Exact official Python SDK, private bridge·Node Runtime와 Server product path는 Account Readiness, structured Skill input, product permission, Plan·MCP activity, pending interaction, durable `ModelingRun`·`StatePatch`·`UserConfirmation`과 execution guard까지 구현했다. 그러나 Browser는 아직 이 product operation stream과 settled history를 소비하지 않으므로, 학생이 자료를 선택해 근거가 연결된 과제 정보를 검토하고 확인된 학기 상태로 남기는 end-to-end 제품 흐름은 닫히지 않았다.

이 상태에서 범용 Chat 기능이나 새 workflow runtime을 먼저 만들면 이미 Codex와 current product Server가 제공하는 `SkillInput`, Plan mode, `request_user_input`, MCP와 native lifecycle을 다시 구현하게 된다. 반대로 legacy Chat tracer를 Browser 제품 surface로 계속 사용하면 fixed `deny_all + read_only`, four-route projection과 tab-memory transcript가 첫 학업 vertical의 public contract로 남고, current product action과 3-pane workbench가 서로 분리된다.

첫 구현은 기존 Codex runtime 기반을 보존하면서, 두 TXT `RawMaterial`에서 하나의 근거 있는 `Assignment` 변경을 제안하고 학생의 명시적 결정 뒤에만 `SemesterModel`에 반영하는 end-to-end product slice를 닫아야 한다. Codex 실행 권한과 AY-PLE 제품 확인 권한, native execution state와 durable academic state, Chat transcript와 confirmed product state를 서로 대신하지 않게 유지해야 한다.

## Solution

macOS-first local web app에 desktop 3-pane workbench를 만든다. 학생은 왼쪽 자료 pane에서 explicit `SemesterWorkspace`와 `Course`의 TXT 자료 두 개를 선택하고, 중앙 pane에서 실제 원문과 근거를 확인하며, 오른쪽의 toggleable AY Chat sidebar에서 `선택한 자료 정리하기` action과 결과를 이어 본다.

Action은 app-managed versioned `ModelingRecipe`의 exact `SKILL.md`를 official SDK `SkillInput`으로 요청하고, 선택 자료의 실행 snapshot과 arguments를 `TextInput`으로 전달한다. Native Turn은 exact Plan mode에서 실행되며, AY는 좁은 custom MCP `propose_state_patch`를 호출해 App이 검증한 pending `StatePatch`를 만든다. 이어 built-in `request_user_input`이 같은 Turn에서 `수락 | AY에게 수정 요청 | 거절` Review를 연다.

`request_user_input`은 대화를 이어가는 carrier일 뿐 학업 상태 변경 권한이 아니다. App이 exact active patch, evidence와 base revision을 다시 검증하고 `UserConfirmation`과 apply outcome을 atomic하게 정산한 경우에만 confirmed `SemesterModel`을 바꾼다. 수정 요청은 settled decision이 아니라 같은 Turn으로 전달되는 feedback이며 replacement `StatePatch`를 다시 검토하게 한다.

Runtime은 official Python SDK, exact native identity, acceptance-first ordering, authoritative terminal, bounded process lifecycle을 계속 사용한다. Ordered patch `0006`의 Plan collaboration mode와 non-blocking deferred `request_user_input` response seam은 private bridge·Node·Server까지 얇게 projection됐으며, Browser는 package-owned product wire contract를 통해서만 이를 소비한다. General Chat completeness, 별도 job dashboard, generic workflow engine과 raw App Server gateway는 만들지 않는다.

## User Stories

1. 학생으로서, 내가 선택한 학기 폴더를 명시적으로 활성화하고 싶다. 그래야 AY가 다른 폴더나 실행 당시 `process.cwd()`를 작업공간으로 오해하지 않는다.
2. 학생으로서, 한 과목과 이번 작업에 사용할 TXT 자료 두 개를 직접 고르고 싶다. 그래야 AY가 어떤 원문을 우선 입력으로 사용했는지 알 수 있다.
3. 학생으로서, `선택한 자료 정리하기`를 눌러 반복 가능한 학업 action을 시작하고 싶다. 그래야 긴 prompt를 매번 다시 작성하지 않아도 된다.
4. 학생으로서, AY의 Skill·도구 사용·질문·응답을 익숙한 Chat 안에서 보고 싶다. 그래야 별도 job 화면을 해석하지 않고도 작업의 흐름을 이해할 수 있다.
5. 학생으로서, AY가 제안한 과제명·마감·제출 방식과 각 값의 원문 근거를 함께 보고 싶다. 그래야 AI 결과를 원자료와 대조할 수 있다.
6. 학생으로서, 변경 제안을 수락하거나 거절하거나 자연어로 수정을 요청하고 싶다. 그래야 내 판단이 학기 상태 반영을 통제한다.
7. 학생으로서, 수정 요청 뒤 AY가 같은 대화 흐름에서 새 제안을 만들길 원한다. 그래야 직접 필드를 편집하는 별도 workflow 없이 근거를 다시 검토할 수 있다.
8. 학생으로서, 내가 수락하기 전에는 원본 자료와 확인된 학기 상태가 바뀌지 않길 원한다. 그래야 Codex의 파일 작업 권한과 제품 반영 권한이 섞이지 않는다.
9. 학생으로서, Chat sidebar를 닫았다 다시 열어도 진행 중인 Turn이 중단되지 않길 원한다. 그래야 화면 배치 조작이 작업 취소로 해석되지 않는다.
10. 학생으로서, 실행이 중단되거나 결과를 확정할 수 없을 때 성공한 것처럼 표시되지 않길 원한다. 그래야 명시적으로 다시 실행할지 판단할 수 있다.
11. 학생으로서, 수락한 과제 정보는 Browser reload나 Server restart 뒤에도 다시 열고 싶다. 그래야 Chat transcript가 사라져도 확인된 학업 상태는 남는다.
12. 개발자로서, exact Codex SDK/native behavior와 제품 state authority를 분리해 검증하고 싶다. 그래야 provider-dependent 성공 한 번이 전체 제품 E2E를 대신하지 않는다.

## Current State and Constraints

### Pre-implementation baseline

다음 표는 이 spec을 ticket으로 분해하기 직전의 출발 상태를 기록한다. 완료 뒤의 current topology와 capability status는 owning architecture/package 문서와 아래 Completion에서 확인한다.

| Layer | Current fact | First-vertical consequence |
| --- | --- | --- |
| Runtime | `@ay-ple/codex-chat-runtime`은 exact bundle·official SDK·native App Server child를 supervise하고 structured `SkillInput`·`TextInput`, `auto_review + workspace_write`, MCP server, Plan activity와 deferred typed `request_user_input` answer/cancel을 product-capable public seam으로 제공한다. Browser-safe Chat contract와 Node-only workspace·MCP input은 분리돼 있다. | Exact lifecycle과 identity seam은 보존한다. Browser는 private Runtime input을 재선언하지 않고 product-local contract만 소비해야 한다. |
| Python bridge | Product thread/turn start, account readiness, advertised default model resolution, interaction answer/cancel과 curated Skill·Plan·MCP·Agent activity를 projection한다. Ordered patch `0006`은 sole-reader를 막지 않는 pending request collector와 bounded settlement를 소유한다. | First-party와 다른 unique-default model assumption은 final conformance에서 disposition하되 product UI가 SDK lifecycle을 다시 구현하지 않는다. |
| Server | Existing four-route `/api/codex-chat/*` tracer와 별도로 `/api/product/*` bootstrap, workspace·Course·material, Assignment action, free-form Chat, Review, general Plan interaction과 interrupt operation을 제공한다. Product operation은 process-global active lease 하나를 공유한다. | Browser product vertical은 `/api/product/*`와 그 curated stream으로 이동하고 legacy Chat route와 같은 transcript를 혼합하지 않는다. Tracer 제거는 final cutover가 소유한다. |
| Browser | SourceSelection·자료 preview·workspace activation을 소유하는 3-pane workbench와 오른쪽 toggleable legacy Chat이 구현됐다. Product bootstrap의 workspace만 hydrate하며 product action stream, settled history, Account Readiness, Review와 general Plan interaction은 아직 표시하지 않는다. | Current layout과 visibility owner를 유지하면서 product bootstrap·operation stream을 한 Chat transcript에 연결해야 한다. |
| Product state | Current canonical v2 workspace store가 `SemesterWorkspace`, one `Course`, `RawMaterial`, confirmed `SemesterModel`, settled `ModelingRun`·`StatePatch`·`UserConfirmation`, apply outcome와 execution guard를 한 serialized transaction authority로 소유한다. Pre-release legacy decoder와 migration은 없다. | Browser는 settled projection만 hydrate한다. Revision replacement, negative recovery UX와 first durable cutover baseline은 후속 slice가 소유한다. |

### Adopted constraints

| Constraint | Contract |
| --- | --- |
| Runtime selection | Official Python SDK와 exact native bundle을 유지한다. First-party TUI·App Server는 conformance donor이며 별도 host 후보가 아니다. |
| Root ownership | `packageRoot`, `appDataRoot`, `workspaceRoot`를 분리한다. `CODEX_HOME`·`CODEX_SQLITE_HOME`은 appDataRoot의 app-managed pair이며 workspace는 explicit selection만 허용한다. |
| Native identity | `Thread`·`Turn`·`Item` identity, acceptance와 authoritative terminal semantics를 임의 ID나 local success state로 대체하지 않는다. |
| Product authority | Codex permission, MCP action과 AY-PLE `UserConfirmation`은 서로 다른 결정이다. `UserConfirmation` 없는 proposal은 confirmed `SemesterModel`을 바꾸지 않는다. |
| Skill admission | Exact managed `SKILL.md` path를 `SkillInput`으로 요청한다. `skills/list`와 private catalog port는 구현하지 않으며 receipt는 `requested Skill`만 기록한다. |
| Chat-first surface | Skill, Plan, MCP, Review와 terminal activity를 오른쪽 AY Chat의 한 cumulative transcript에 표시한다. 별도 workflow/job UI를 만들지 않는다. |
| Desktop scope | 1440–1920px macOS desktop workspace가 validation target이다. Mobile과 small-screen layout은 제외한다. |

### Explicitly deferred

General Chat completeness, conversation catalog·rename·archive, generic transcript persistence·replay, two-client synchronization, unanswered Review hydration, manual native approval center와 packaged Desktop lifecycle은 이 spec의 선행조건이 아니다. 첫 vertical은 한 active Chat conversation과 same-process live interaction만 요구하며, 복원되지 않은 transcript나 pending prompt를 복원된 것처럼 표시하지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Responsibility | Owns | Does not own |
| --- | --- | --- |
| Workspace and product-state owner | Explicit `SemesterWorkspace` activation, `Course`, `RawMaterial` registry, confirmed `SemesterModel`, `StatePatch` history, settled `UserConfirmation`, apply outcome와 workspace-local recovery | Codex credential, native transcript, raw protocol, arbitrary user file relocation |
| Academic action coordinator | `ModelingRecipe`, ephemeral `ModelingInvocation`, native admission, run-scoped source snapshot·scratch, `ModelingRun` receipt와 explicit retry | `StatePatch` lifecycle, generic job scheduling, background workflow engine |
| Codex integration boundary | Official SDK lifecycle, typed native input, exact permission, native identity, acceptance·terminal·interrupt, bounded pending interaction route와 process cleanup | Product patch validation, academic state apply, Browser copy |
| Proposal MCP boundary | `propose_state_patch` 한 tool의 canonical payload validation, request-scoped idempotency와 stable patch identity | `UserConfirmation`, direct `SemesterModel` mutation, generic state CRUD, MCP elicitation |
| Review coordinator | Active pending patch와 exact Plan `request_user_input` 결합, answer validation, revision feedback, one-settlement와 interruption reconciliation | Codex technical approval, durable generic inbox, multiple concurrent patch arbitration |
| Browser-safe product contract | Product bootstrap·workspace·settled history·material preview, public request/response와 curated operation frame의 dependency-free TypeScript type·exact decoder | HTTP fetch·NDJSON byte framing, React state, Server domain object, persistence schema·native protocol |
| Browser-safe local application | Account/workspace readiness, product commands, curated activity stream, Review response·interrupt와 snapshot read | Absolute path·credential·raw JSON-RPC·private patch correlation 노출 |
| Desktop workbench | 왼쪽 자료 selection, 중앙 TXT/evidence preview, 오른쪽 toggleable AY Chat와 settled product-state reload | 가짜 IDE capability, 별도 progress dashboard, direct canonical field editor |

각 책임은 behavior seam이다. 구현 ticket은 기존 workspace에 가장 가까운 owner를 선택하되, 새로운 generic `ChatApplication`, runtime abstraction, raw event bus 또는 workflow framework를 만들지 않는다.

### Interfaces and Invariants

#### Workspace activation and material admission

- Workspace activation은 사용자가 macOS local companion을 통해 선택한 canonical absolute directory 하나를 받는다. Browser가 임의 absolute path를 신뢰 경계 밖에서 조립하지 않으며 cancel은 상태 변경 없이 끝난다.
- 활성 workspace는 readable directory여야 하고 symlink 자체와 missing path를 거절한다. Canonical `packageRoot`, `appDataRoot`, `workspaceRoot`는 서로 달라야 하며 어느 root도 다른 root의 ancestor·descendant일 수 없다. Native `cwd`는 canonical `workspaceRoot`와 정확히 일치하며 다른 경로로 fallback하지 않는다.
- Product store는 workspace 안에 app-owned format version과 confirmed revision을 갖는다. 저장 library와 physical schema는 contract가 아니지만 appDataRoot를 잃은 뒤 workspace만으로 settled state를 다시 열 수 있어야 한다.
- Empty product store는 학생이 non-empty display name으로 `Course` 하나를 만들거나 기존 Course 하나를 선택하게 한다. App이 opaque stable Course ID를 발급하며 Course를 폴더 identity와 동일시하지 않는다.
- Material refresh는 existing folder tree를 바꾸지 않고 workspace 아래 regular `.txt` file을 bounded하게 발견한다. App-owned product/scratch subtree, symlink와 workspace escape는 제외하고, 등록 시 stable opaque material ID, canonical relative path, byte digest, media type과 size를 기록한다. 같은 registered path의 content change는 identity를 유지하며 digest를 갱신하되 active action 중에는 source conflict로 처리한다.
- First vertical은 active Course와 registered UTF-8 `.txt` `RawMaterial` 두 개를 `SourceSelection`으로 요구한다. Symlink, unreadable file, unsupported encoding과 configured per-file·aggregate size bound 초과를 native start 전에 거절한다.
- `RawMaterial` 원본 bytes와 위치를 source of truth로 유지한다. Browser와 product event에는 opaque material ID와 workspace-relative display path만 노출한다.
- Material preview는 Server가 material ID를 current registry·digest에 다시 결합한 뒤 bounded UTF-8 text와 display metadata를 no-store로 반환한다. Browser가 local absolute path를 직접 읽지 않으며 evidence preview도 같은 registered bytes를 사용한다.

#### Development and E2E workspace materialization

- First vertical의 canonical tracked seed는 `apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace/`에 둔다. Seed에는 selected `lms-outline-notice.txt`, selected `problem-solving-syllabus.txt`와 거짓 과제 정보를 가진 unselected negative-control TXT를 포함한다.
- Tracked seed는 immutable test input이며 `SemesterWorkspace`, product store 또는 native `cwd`가 아니다. Development launcher와 E2E harness는 seed를 실제 workspace로 복사한 뒤 그 materialized canonical directory만 local companion activation과 Runtime에 전달한다. Native Codex가 repository fixture를 직접 읽거나 쓰게 하지 않는다.
- Manual development의 기본 materialized root는 repository 밖의 `<dirname(packageRoot)>/.ay-ple-dev-workspaces/first-assignment-semester-workspace`다. 이는 `packageRoot`와 형제인 inspectable location이며 materializer가 발급한 ownership marker가 있는 exact leaf만 초기화·reset할 수 있다. Broad parent, unmarked directory와 사용자 지정 workspace를 자동 삭제하지 않는다.
- Existing `CODEX_CHAT_WORKSPACE`가 명시되면 manual development bootstrap에서 위 기본 위치를 override할 수 있다. Override는 canonical absolute readable directory이고 다른 managed root와 겹치지 않아야 한다. Launcher는 이를 caller-owned workspace로 취급해 seed copy, reset 또는 cleanup을 수행하지 않는다. 이 env는 development wiring일 뿐 Browser API, `SemesterWorkspace` identity 또는 장기 product selection contract가 아니다.
- Browser E2E는 ambient `CODEX_CHAT_WORKSPACE`와 persistent development workspace를 상속하지 않는다. 매 실행 `mkdtemp`로 OS temp 아래 unique run root를 만들고 seed를 그 안의 `semester-workspace`에 복사하며, public workspace activation boundary가 그 canonical path를 선택한 것처럼 구동한 뒤 exact run root만 bounded cleanup한다.
- Representative deterministic Browser E2E, actual-child conformance와 opt-in live-provider trace는 같은 tracked seed와 selected/unselected membership을 사용한다. Unit test는 더 작은 synthetic temp workspace를 사용할 수 있지만 representative vertical의 source fact를 별도로 복제하지 않는다.
- Launcher와 harness는 선택된 canonical `workspaceRoot`를 시작 시 명시적으로 보고해야 한다. Verification은 native `cwd === workspaceRoot`, managed roots의 non-overlap, tracked seed digest 불변, fresh E2E 간 product state·scratch·native session 비누출을 증명한다.

#### Account and native start admission

- 각 product action 직전에 official `AsyncCodex.account()`로 Account Readiness를 확인한다. Authentication이 필요하지만 account가 없으면 actionable `not ready`를 반환하고 `thread/start`·`turn/start` 호출 수는 0이다.
- In-app OAuth, logout, account switching과 provider abstraction은 이 spec에 포함하지 않는다. App-managed `CODEX_HOME`에 pre-provision된 Codex account만 사용한다.
- Workspace, Recipe version, arguments, selected source membership·digest와 protected execution guard가 모두 valid한 뒤에만 native start를 허용한다.
- Admission이 모두 통과하면 App은 native call 전에 unique action ID, invocation fingerprint와 source baseline을 가진 durable `ModelingRun(starting)`을 기록한다. Admission failure처럼 native call을 시도하지 않은 요청은 `ModelingRun`을 만들지 않는다.
- Explicit native pre-accept failure는 같은 Run을 `not_accepted`로 정산한다. Native acceptance가 확인되면 opaque native correlation을 결합해 `running`으로 전환한다.
- Native call 이후 acceptance 결과 또는 `running` transition을 확인하지 못하면 Runtime을 interrupt/close하고 같은 Run을 `acceptance_unknown`으로 표시한 뒤 next open에서 `unknown`으로 정산한다. 별도 receipt를 만들거나 Turn success·failure를 추정하거나 자동 retry하지 않는다.

#### Modeling input and receipt

- `ModelingRecipe`는 exact managed Skill path, Recipe version, bounded argument contract와 first-vertical action 지침을 소유한다.
- `ModelingInvocation`은 Recipe/version, active workspace·Course, selected two-source snapshot과 arguments를 결합한 일회성 request다. Durable academic state가 아니다.
- App은 선택한 TXT를 run-scoped appDataRoot staging area에 byte-preserving snapshot하고 original byte digest와 mapping을 guard journal에 기록한다. Codex에는 staged paths를 Markdown link/path convention의 `TextInput`으로 주고 exact Recipe path를 public `SkillInput`으로 한 번 전달한다.
- StatePatch payload는 `outputSchema`나 final Agent message에 중복하지 않는다. `outputSchema`는 이후 side-effect-free structured result에서만 optional capability로 남는다.
- `ModelingRun`은 invocation fingerprint, requested Skill path/version, selected source digests, available opaque native correlation, settlement와 product validation outcome만 기록한다. Lifecycle은 `starting | not_accepted | acceptance_unknown | running | completed | failed | interrupted | unknown`이며 raw protocol, credential, complete prompt와 generated SDK type은 저장하지 않는다.
- 한 accepted product action과 한 `ModelingRun`은 1:1이다. Explicit retry는 새 `ModelingInvocation`, native Turn과 `ModelingRun`을 만들며 이전 receipt를 덮어쓰거나 자동 retry하지 않는다.
- `StatePatch`는 `ModelingRun`과 독립이다. 하나의 Run에서 0개 또는 여러 patch가 나올 수 있고 일반 Chat Turn에서도 patch를 제안할 수 있다. Origin thread/turn/run correlation은 opaque optional provenance일 뿐 mandatory FK가 아니다.
- First vertical은 활성 workspace의 app lifecycle 안에서 native Chat `Thread` 하나와 active `Turn` 최대 하나를 사용한다. Free-form composer와 Assignment action은 같은 transcript와 `Thread`를 사용하지만 동시에 두 Turn을 시작하지 않는다. `Thread`는 workspace, Course, Run 또는 confirmed state의 identity가 아니며 Server restart 뒤 resume을 보장하지 않는다.

#### Protected execution guard

- First vertical은 explicit `ApprovalMode.auto_review + Sandbox.workspace_write`를 사용한다. 이 permission은 Python·command·workspace tool 실행을 허용하는 Codex technical boundary이며 AY-PLE apply 권한이 아니다.
- 모든 native Turn은 `workspaceRoot` 안의 app-owned transient scratch directory와 product guard를 사용한다. Assignment action은 여기에 appDataRoot의 read-only selected-source snapshots를 추가한다. `Sandbox.workspace_write`가 실제로 보장하는 writable boundary는 native `cwd`인 workspace이므로 scratch를 appDataRoot의 writable root라고 가정하지 않는다. Skill과 prompt는 original `RawMaterial`이나 confirmed product store를 write target으로 제공하지 않는다.
- Workspace-local scratch는 registered `RawMaterial`과 product store 경로와 겹치지 않는 reserved subtree이며 Turn ID 또는 pre-accept action ID별로 새로 만든다. Terminal·interrupt·unknown settlement 뒤 bounded cleanup하고, next workspace open은 stale scratch를 guard journal과 reconcile한 뒤에만 허용한다.
- App은 native start 전 모든 registered source의 canonical digest와 current confirmed-state revision을 durable guard journal에 기록하고 Turn 동안 registered source에 exclusive product lease를 표시한다. Product action의 selected source 두 개는 byte snapshot도 보존한다. `propose_state_patch`, Review settlement, native terminal과 next workspace open 전에 다시 검증한다.
- RawMaterial digest drift가 발견되면 active Turn을 interrupt하고 available baseline과 drifted bytes를 conflict recovery evidence로 보존한다. App은 어느 쪽이 student edit인지 Codex write인지 추정하거나 original path를 자동 overwrite하지 않는다. Workspace는 `source_conflict` recovery-required 상태가 되고 proposal·apply·새 native action을 금지하며, 학생이 외부에서 원본을 정리하고 material refresh로 새 baseline을 명시적으로 채택해야 한다.
- Active in-memory authority 또는 execution guard가 있는 동안 persisted product-state bytes가 그 authority와 다르면 mutation을 중단하고 현재 bytes를 덮어쓰지 않는다. Workspace open에서 current canonical format으로 exact decode되지 않는 store는 원본 bytes를 보존한 `incompatible` read-only workspace로 열고 새 native action을 금지한다. Cold restart 뒤 exact current format으로 decode되는 bytes는 durable provenance·signature·snapshot이 없는 current store authority이며, App은 그 bytes가 외부에서 바뀌었는지 추측하지 않는다. Current store는 previous revision backup이나 restore journal을 소유하지 않는다.
- 미완료 execution guard는 workspace를 다시 열기 전에 settled product records와 app-managed scratch를 reconcile한다. Source conflict는 학생이 외부 원본을 정리한 뒤 explicit material refresh로 새 baseline을 채택하기 전까지 recovery-required로 유지한다.
- 수락된 patch만 App-owned atomic transaction으로 confirmed state를 바꾼다. Codex가 만든 filesystem diff나 MCP result를 academic state로 채택하지 않는다.
- 이 guard는 product-authority와 observable before/after invariant다. Current public `Sandbox.workspace_write`가 `cwd` 전체를 writable root로 삼으므로, 실행 중 transient physical write가 절대 불가능하다는 adversarial security guarantee로 표현하지 않는다. Strict path-level immutability가 실제 requirement가 되면 staged `cwd`, fine-grained native permission profile 또는 별도 OS isolation을 새 residual로 조사한다.

#### Canonical `propose_state_patch` contract

First vertical에서 tool input은 아래 semantic envelope 하나를 정본으로 사용한다. Exact programming-language type와 database column은 implementation detail이다.

- StatePatch를 제안할 수 있는 native Turn은 App-issued proposal context를 먼저 가진다. 이 context는 active workspace·Course, selected material IDs와 baseline digests, base model revision과 single-use `requestKey`를 묶는다.
- Assignment action은 its `SourceSelection`으로 proposal context를 만들고, free-form Chat은 send 시 함께 전달된 current material selection이 valid할 때만 context를 만든다. Source selection이 없는 일반 Chat은 대화할 수 있지만 `propose_state_patch`는 `proposal_context_missing`으로 거절한다.
- Coordinator는 exact key를 app-owned Turn instruction과 MCP session binding에 함께 주입한다. Browser나 model이 임의 key를 발급할 수 없고 MCP server는 active binding과 일치하지 않는 key를 거절한다. Revision feedback 뒤에는 fresh key 하나를 같은 방식으로 발급한다.

| Field | Contract |
| --- | --- |
| `requestKey` | App이 현재 proposal attempt에 발급한 opaque key. 같은 key와 같은 canonical payload는 같은 patch outcome을 반환하고, 같은 key의 다른 payload는 conflict다. |
| `workspaceId`, `courseId` | Active tool session과 정확히 일치해야 하는 opaque product identity다. |
| `baseRevision` | Proposal이 읽은 confirmed `SemesterModel` revision. Current revision과 다르면 pending patch를 만들지 않는다. |
| `summary` | 학생이 이해할 수 있는 bounded 변경 설명. canonical changes를 대신하지 않는다. |
| `changes` | Exactly one `assignment.upsert` operation. Optional `assignmentId`가 없으면 create, 있으면 current workspace·Course의 existing target update이며 `values`는 `title`, `dueAt`, `submissionMethod`만 포함한다. Generic JSON Patch나 arbitrary state path를 허용하지 않는다. |
| `evidence` | 각 변경 field와 하나 이상의 selected `RawMaterial` locator를 연결한다. |
| `origin` | Optional opaque thread/turn/run provenance. Product authority나 dedupe key가 아니다. |

- TXT `EvidenceRef`는 `rawMaterialId`, source byte digest와 exact quote를 최소 locator로 사용한다. Quote는 UTF-8 BOM만 제외하고 newline이나 whitespace를 normalize하지 않은 decoded source의 exact substring이어야 한다. Line range는 UI 탐색을 위한 derived hint일 수 있지만 authority가 아니다.
- `changes.assignmentId`가 absent이면 App이 apply 시 stable Assignment ID를 발급하고, present이면 current workspace·Course에 속한 ID만 허용한다. `values.title`과 `values.submissionMethod`는 non-empty bounded text이고 `values.dueAt`은 explicit UTC offset을 가진 RFC 3339 timestamp다. First vertical Recipe는 `Asia/Seoul` context를 명시하며 모호한 날짜·시간은 추정 적용하지 않고 Review 전 validation failure 또는 user clarification으로 돌린다.
- 변경하는 각 Assignment field에는 적어도 하나의 valid `EvidenceRef`가 있어야 한다. 같은 quote를 여러 field에 쓸 수 있지만 file 전체 link 하나로 field-level evidence를 대신하지 않는다.
- 모든 evidence source는 active proposal context의 selected material IDs에 속해야 하고 current original digest가 그 context의 baseline digest와 같아야 한다. Assignment action에서는 이 context가 `SourceSelection`에서 오고 free-form Chat에서는 Turn-scoped material selection에서 온다. Unselected path, quote mismatch와 field 없는 evidence는 MCP tool failure다.
- MCP server가 stable `patchId`를 발급하고 최초 valid call에서 `pending` proposal만 저장한다. Native `toolCallId`는 provenance일 수 있지만 request idempotency key로 사용하지 않는다.
- 같은 `requestKey`와 canonical payload가 replay되면 새 proposal을 만들지 않고 같은 `patchId`, current lifecycle status와 bound base revision을 반환한다. 따라서 settlement 뒤 delayed replay가 patch를 `pending`으로 되돌리지 않는다. Tool은 confirm, apply, `UserConfirmation` 생성 또는 confirmed `SemesterModel` write를 수행하지 않는다.
- Validation을 통과하지 못한 payload는 valid `StatePatch` record를 만들지 않고 product validation failure로 projection한다. Native Turn failure로 재분류하지 않는다.

#### Durable state and atomic apply

| Record | Minimum durable contract |
| --- | --- |
| `ModelingRun` | Invocation fingerprint, requested Skill/version, source digests, available opaque native correlation, settlement와 validation outcome |
| `StatePatch` | Stable ID, workspace/Course, canonical payload/evidence, base revision, request key, optional provenance, lifecycle status |
| `UserConfirmation` | Exact patch ID, `accepted | rejected`, decision idempotency key, settled time, resulting revision 또는 no-apply outcome |
| `SemesterModel` | Current confirmed revision과 canonical Assignment state |

`StatePatch` lifecycle은 `pending | superseded | applied | rejected | interrupted`로 제한한다.

- `pending`만 active Review에 결합할 수 있다.
- 수정 feedback 자체는 settled `UserConfirmation`이 아니다. Replacement proposal이 성공할 때 old `pending → superseded`와 new patch 생성 `→ pending`을 한 transaction으로 처리한다.
- Replacement 전에 Turn이 completed·failed·cancelled·interrupted로 끝나거나 replacement proposal validation이 실패하면 old patch는 `interrupted`가 되고 resumable Review로 hydrate하지 않는다. Active native binding 없이 `pending` record를 남기지 않는다.
- 수락 transaction은 exact active patch, live interaction binding과 base revision을 compare-and-set으로 검증하고, `UserConfirmation(accepted)`, canonical apply, model revision 증가, patch `applied`와 resulting revision을 한 atomic commit으로 기록한다.
- 거절 transaction은 `UserConfirmation(rejected)`와 patch `rejected`를 한 atomic commit으로 기록하고 `SemesterModel`을 바꾸지 않는다.
- 같은 decision key의 동일 retry는 기존 outcome을 반환한다. 상충 decision, stale base, duplicate·late answer는 conflict이며 두 번째 apply를 만들지 않는다.
- Atomic commit이 성공한 뒤 Codex answer 전송이나 Turn continuation이 유실돼도 product state가 authority다. 같은 patch를 다시 적용하지 않고 continuation loss만 표시한다.

#### Plan `request_user_input` adaptation

- Native Core의 exact Plan collaboration mode, built-in `request_user_input` schema, same-Turn pause·function output·continued sampling과 `serverRequest/resolved` ordering을 재사용한다.
- Exact Python SDK의 ordered patch `0006`은 high-level Turn input에 Plan `collaborationMode`를 추가하고 exact `item/tool/requestUserInput`만 typed pending request로 surface한다. Generic server-request handler나 raw App Server gateway를 노출하지 않는다.
- SDK reader는 request를 bounded pending route로 넘긴 뒤 Browser answer를 기다리며 block하지 않고 response·notification을 계속 drain한다. Raw JSON-RPC request ID와 response-before-acceptance race는 patch 내부에 숨긴다.
- Runtime/bridge는 Browser-safe opaque `interactionId`, `user_input.requested`, `user_input.resolved`와 answer/cancel operation만 노출한다. `interactionId`는 runtime-lifetime correlation이며 durable product identity가 아니다.
- 한 native Turn당 pending interaction은 최대 1개다. Runtime global pending capacity는 existing active-turn bound와 같은 32이고, first-vertical product composition은 active Turn 1개만 허용한다.
- Queue overflow나 같은 Turn의 두 번째 pending request는 자동 응답하거나 덮어쓰지 않고 affected Turn을 interaction failure로 interrupt한다. Answer/cancel은 saturation 중에도 사용할 control reserve를 가진다.
- 첫 valid answer 또는 cancel만 pending entry를 consume한다. Duplicate·late answer는 deterministic `interaction_not_pending` conflict다. Interrupt, terminal, Runtime close/loss는 pending route를 한 번 정산하고 모두 해제한다.
- Product Review는 exactly one question과 `수락 | AY에게 수정 요청 | 거절` options를 사용하고 bounded free-form revision feedback을 허용한다. `autoResolutionMs`, timeout default와 silent answer를 사용하지 않는다.
- App은 같은 Turn에서 MCP가 반환한 exact active `patchId`가 하나 있을 때만 native question을 product Review에 bind한다. 그 외 `request_user_input`은 일반 Chat clarification이며 academic state를 바꾸지 않는다.
- Bound Review를 Browser에 보낼 때 App은 one-settlement용 opaque `decisionKey`를 함께 발급한다. Browser는 interaction·patch·decision key를 모두 echo하고 Server는 세 binding이 일치할 때만 product transaction을 시작한다.
- Accept/reject는 product transaction을 먼저 commit한 뒤 App이 native answer를 구성해 Codex에 보낸다. Revision은 새 `requestKey`와 user feedback을 같은 Turn으로 보내고 replacement proposal을 기다린다.

#### Browser-safe product operations and activity

Local Server는 exact URL이나 transport library보다 아래 operation behavior를 public contract로 제공한다. Server producer와 Browser consumer는 dependency-free shared product contract의 closed types와 exact decoder를 사용하며 서로의 app source를 import하거나 별도 field roster를 유지하지 않는다.

| Operation | Required behavior |
| --- | --- |
| Bootstrap/read snapshot | Account readiness, active workspace·Course, material registry, confirmed model revision와 settled product history를 no-store response로 반환한다. Generic transcript나 pending native prompt를 복원하지 않는다. |
| Activate workspace | Server-owned macOS directory chooser의 explicit selection을 canonicalize·validate하고 workspace-local store를 연다. Cancel과 invalid path는 기존 activation을 바꾸지 않는다. |
| Create/select Course | Active workspace 안에서 one Course를 생성하거나 선택하고 opaque Course ID를 반환한다. Directory name을 Course identity로 사용하지 않는다. |
| Refresh material registry | Eligible TXT를 bounded scan하고 stable material ID·relative path·digest metadata를 갱신한다. Active source lease와 충돌하면 변경하지 않는다. |
| Read material preview | Material ID를 current registry/digest에 재검증하고 bounded UTF-8 text와 evidence navigation metadata를 반환한다. |
| Start Assignment action | Course, exactly two material IDs와 Recipe version을 검증하고 accepted-first product activity stream을 연다. Invalid admission은 native start 0이다. |
| Send Chat message | 같은 active workspace·Thread에 bounded user text와 optional current material IDs를 전달한다. Valid selection이면 Turn-scoped proposal context를 만들고 MCP proposal을 허용하지만 `ModelingRun`은 만들지 않는다. Selection이 없어도 일반 Plan clarification은 가능하다. Active Turn이 있으면 busy로 거절한다. |
| Submit Review response | Opaque interaction ID, exact patch ID와 decision key, `accept | revise | reject`, optional bounded feedback을 받아 product transaction과 native answer ordering을 보존한다. |
| Interrupt action | Active native Turn을 명시적으로 interrupt하고 acknowledgement를 terminal로 합성하지 않는다. |

Mutation은 existing loopback socket와 exact/absent Origin guard를 유지한다. Absolute paths, secret, raw child payload, traceback, private request ID와 complete MCP arguments를 Browser에 노출하지 않는다.

Product stream은 raw App Server event의 1:1 mirror가 아니라 다음 curated activity family를 ordering과 native item identity를 보존해 전달한다.

- action preparing·accepted와 terminal
- Agent message delta·completed
- requested Skill activity. Catalog-verified injection이라고 표시하지 않는다.
- Plan delta·completed
- MCP `propose_state_patch` started·completed·failed와 stable pending patch projection
- `request_user_input` requested·resolved와 Review outcome
- interrupt acknowledgement, nonterminal error와 honest unknown outcome

Browser transcript는 한 app lifecycle 안에서 누적된다. 오른쪽 sidebar hide/show는 component와 active controller를 unmount·abort하지 않고 visibility만 바꾼다.

### Data and State Flow

1. App이 explicit `SemesterWorkspace`를 활성화하고 workspace-local product store, one `Course`와 eligible TXT `RawMaterial` registry를 연다.
2. 학생이 TXT 두 개를 선택하고 `선택한 자료 정리하기`를 누른다.
3. App이 Account Readiness, workspace, Recipe/arguments, source membership·digest를 검증하고 source snapshots, scratch와 guard journal을 준비한다. 실패하면 native start count는 0이다.
4. App이 durable `ModelingRun(starting)`을 먼저 commit하고 `SkillInput(exact SKILL.md)`과 Recipe arguments·staged source Markdown paths를 가진 `TextInput`으로 Plan-mode native Turn을 시작한다.
5. Native acceptance 뒤 같은 Run을 `running`으로 전환하고 Chat activity를 만든다. Acceptance/transition 결과를 잃으면 그 Run 하나를 unknown으로 reconcile한다. Skill은 requested로만 기록하고 catalog injection을 추정하지 않는다.
6. AY가 `propose_state_patch`를 호출한다. App이 canonical payload, selected evidence, exact quote, request key와 base revision을 검증해 stable pending `StatePatch`를 반환한다.
7. AY가 built-in `request_user_input`을 호출한다. App은 same-Turn request를 exact active patch와 bind하고 Browser Chat에 원문 근거, proposal과 세 Review option을 표시한다.
8. 학생이 응답한다.
   - 수락: atomic confirmation/apply 뒤 native answer를 보낸다.
   - 거절: atomic no-apply confirmation 뒤 native answer를 보낸다.
   - 수정 요청: feedback과 fresh proposal key를 같은 Turn에 보내고 replacement MCP call을 기다린다.
9. Replacement가 오면 old patch를 supersede하고 new patch 하나를 active Review에 표시한다. Product decision이 끝나면 Codex가 같은 Turn에서 결과를 설명한다.
10. Authoritative native terminal이 `ModelingRun`을 한 번 정산한다. Guard를 재검증하고 scratch를 bounded cleanup한다.
11. Reload·restart 뒤 app은 settled confirmations, patch history, apply outcomes와 confirmed `SemesterModel`을 workspace store에서 다시 연다. 이전 transcript와 unanswered native prompt는 복원하지 않는다.

### Failure Behaviour

| Failure or interruption | Observable outcome |
| --- | --- |
| Account not ready | Actionable not-ready, native start 0, no `ModelingRun` |
| Invalid workspace·Recipe·arguments·source | Field-specific admission failure, native start 0, no fallback |
| Native acceptance failure | Existing `ModelingRun(starting) → not_accepted`; accepted activity·native correlation·second receipt 없이 pre-accept failure로 끝냄 |
| Native call과 `ModelingRun(running)` transition 사이 process/store loss | Same Run을 `acceptance_unknown`으로 보존하고 Runtime을 close한 뒤 unknown으로 reconcile. No second receipt·no automatic retry |
| Accepted Turn completed·failed·interrupted | Matching native identity의 authoritative terminal로 exactly once 정산 |
| Accepted process/transport loss without terminal | Opaque correlation을 남기고 `unknown` outcome. Success·failure를 합성하거나 retry하지 않음 |
| Interrupt acknowledgement | `stopping`만 표시하고 matching terminal 또는 honest unknown까지 기다림 |
| Malformed MCP payload, unselected source, quote mismatch | Product validation failure. Valid patch·confirmation·apply 없음 |
| RawMaterial guard drift | Turn interrupt, proposal/apply 차단, baseline·drift evidence 보존. Original path는 자동 overwrite하지 않고 학생이 명시적으로 정리·refresh할 때까지 recovery-required |
| Active authority와 persisted store가 불일치 | Mutation 중단, persisted bytes 보존, automatic overwrite·retry 없음 |
| Invalid·unsupported store bytes | 원본 bytes를 보존한 `incompatible` read-only workspace. Automatic restore·reset·migration과 새 native action 없음 |
| Stale base revision or wrong active patch | Conflict, no confirmation, no apply, native answer를 product decision으로 취급하지 않음 |
| Duplicate or late Review answer | Same decision retry는 기존 outcome, 다른/late decision은 `interaction_not_pending` 또는 conflict, no second apply |
| Revision feedback before replacement then continuity loss | Old patch `interrupted`, no `UserConfirmation`, no apply, explicit retry가 new Turn/Run을 시작 |
| Browser/Server/runtime loss before Review answer | Turn `interrupted`, pending patch는 historical record일 뿐 resumable Review가 아님, no auto-resolution·no apply |
| Atomic apply after which Codex continuation is lost | Confirmed model remains authoritative, continuation loss를 표시하고 no reapply |
| Sidebar hide/show | No lifecycle change, no interrupt, same Turn과 transcript 유지 |
| Cleanup deadline exceeded | Runtime을 closed/failed로 정산하고 orphan 방지를 우선하며 다음 action은 fresh runtime에서만 시작 |

### Compatibility and Migration

- Product cutover 전에는 current canonical v2 store만 지원하고 pre-release v1·legacy-v2 decoder나 migration을 유지하지 않는다. Current decoder를 통과하지 못한 store는 original bytes를 보존한 `incompatible/readOnly`로 열며 사용자 원본 파일을 이동·rename·rewrite하지 않는다.
- Existing `CODEX_HOME`, native session, Runtime Harness history와 deleted legacy runtime graph를 import하거나 복구하지 않는다. Final product cutover 전까지 app-owned root pair와 official SDK 기반 Codex Chat Runtime graph를 유지한다. Cutover는 이 Runtime을 대체하지 않고 caller를 product seam으로 이동한 뒤 tracer-only `dev:chat-only`·HTTP·Browser surface를 함께 제거한다.
- Runtime contract는 기존 text-only tracer behavior를 유지한 채 structured input, interaction response와 curated activity를 additive product seam으로 확장했다. Existing deterministic/actual gates가 green인 상태에서 product Browser를 새 seam으로 cut over한 뒤 tracer-only route와 fixed permission copy를 제거한다.
- Ordered SDK patches `0001`–`0008`은 exact source preimage, original oracle, patch ledger와 conformance tests를 유지한다. `0007`은 native `thread/start`가 정한 effective model·reasoning을 high-level SDK Thread에 보존하고, `0008`은 standalone managed Skill을 위해 typed `skills/extraRoots/set` adaptation만 추가한다. `skills/list` preflight와 private catalog port는 채택하지 않는다. Pin upgrade 때 각 patch를 개별 재검증하고 upstream이 같은 behavior를 제공할 때만 제거한다.
- Product rollout rollback은 new product surface를 비활성화해도 workspace-local confirmed state와 history를 삭제하지 않아야 한다. 지원하지 않는 newer store version은 write하지 않고 actionable read-only/incompatible 상태로 멈춘다.
- Final product cutover가 current v2를 첫 durable compatibility baseline으로 확정한다. 이후 physical schema change는 explicit version bump와 migration 또는 fail-closed rejection을 요구하며 silent reset을 허용하지 않는다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| General Chat보다 first Assignment vertical을 먼저 구현 | 실제 학업 action이 필요한 runtime·FE gap을 드러내며 speculative Chat completeness를 피한다. |
| Official Python SDK + current Node supervision 유지 | Exact pin과 representative trace가 acceptance, terminal, process cleanup과 Skill/source input을 이미 증명했다. |
| Plan mode와 `request_user_input`을 bounded ordered patch로 adaptation | Native same-Turn interaction을 재사용하면서 sole-reader blocking과 private handler reach-through를 피한다. |
| `propose_state_patch` custom MCP 한 tool | Skill polishing과 future MCP+Skill 확장을 허용하면서 product proposal schema·authority를 App에 둔다. |
| StatePatch payload는 MCP input 한 곳만 정본 | `outputSchema`, Agent final message와 별도 job result 사이의 중복·불일치를 피한다. |
| `StatePatch`와 `ModelingRun` 독립 | Proposal은 일반 Chat에서도 생기고 한 Run에서 여러 proposal이 나올 수 있으므로 execution receipt가 product interaction cardinality를 소유하지 않는다. |
| Accept/reject만 settled `UserConfirmation` | 수정 요청은 decision이 아니라 same-Turn feedback이며 replacement patch를 다시 검토한다. |
| App transaction이 apply authority | Native question answer, permission approval, MCP completion이나 filesystem write가 confirmed academic state를 직접 바꾸지 못하게 한다. |
| `auto_review + workspace_write`와 product guard 병행 | Codex가 Python·command를 쓸 수 있게 하면서 staged sources, digest guard와 atomic apply로 proposal-only 제품 효과를 유지한다. |
| `skills/list` preflight 제외 | Exact managed Skill의 native silent-skip는 typed `skills/extraRoots/set` adaptation과 exact local-provider conformance로 닫는다. `skills/list` preflight와 private catalog port는 채택하지 않으며 official public seam이나 새 provenance need가 생길 때만 다시 검토한다. |
| Tracked seed와 materialized workspace 분리 | Repository fixture를 native `cwd`로 사용하지 않는다. Manual dev는 repository 밖의 predictable sibling root와 explicit override를, E2E는 같은 seed의 fresh temp copy를 사용해 inspectability와 isolation을 함께 보장한다. |
| 3-pane workbench + right Chat sidebar | Camp demo의 공간 구조를 유지하면서 Skill·MCP·Review를 familiar Chat interaction에 누적한다. 중앙 pane은 real TXT preview만 구현하고 IDE를 가장하지 않는다. |
| One active Chat limitation | First vertical의 product flow를 닫는 데 충분하며 catalog·multi-client·generic replay를 미리 설계하지 않는다. |
| Pre-cutover automatic store restore 제외 | Previous revision snapshot/journal authority가 없는 상태에서 성공을 합성하지 않는다. Active authority 불일치는 overwrite하지 않고 invalid·unsupported store는 bytes-preserving read-only로 닫는다. Cold-open valid store의 외부 변경을 감지하는 backup·provenance framework는 실제 compatibility need 뒤에 결정한다. |

Prototype branch `prototype/first-vertical-runtime-trace`의 `fbc9efd` evidence는 exact `cwd`, SkillInput, selected TXT paths, strict structured result, unselected-source negative control, settlement와 3회 fresh-root live run을 증명했다. 그 throwaway schema와 harness는 production module이나 final `Assignment` schema로 복사하지 않는다.

## Testing Decisions

### Highest practical seam

가장 높은 deterministic product seam은 **real Chromium Browser → real Vite/Express local app → product store와 injectable deterministic Codex runtime**이다. 이 seam에서 1440px desktop layout, public Browser operations, Chat streaming, MCP proposal, Plan Review, atomic apply와 reload를 검증한다. Live model 문구나 provider 상태에 의존하지 않고 모든 loss branch를 재현할 수 있어야 한다.

이 Browser seam은 exact Python/native conformance를 대신하지 않는다. 별도의 actual-child/local-provider gate가 Plan request round trip, effective permission, process cleanup과 SDK patch liveness를 검증한다. 두 seam을 모두 통과해야 first vertical이 완료된다.

### Required automated gates

| Layer | Required proof |
| --- | --- |
| Product/domain unit | StatePatch schema·evidence validation, request-key idempotency, lifecycle transition, base-revision CAS, accept/reject transaction, revision replacement와 no-reapply |
| Workspace/guard integration | Tracked seed materialization, default dev root·override ownership, explicit root validation, exact native cwd, source staging, digest conflict, valid canonical store reopen, invalid bytes의 read-only 보존과 scratch cleanup |
| SDK patch unit/conformance | Plan collaboration mode mapping, sole-reader liveness, max 1 pending/Turn·32 global bound, overflow, request-before-acceptance race, duplicate/late response, interrupt/close cleanup |
| Runtime deterministic | Account/invalid admission native-start-0, typed Skill/source input, acceptance-first, nonterminal interrupt ack, terminal/unknown, no automatic retry |
| Actual child/local provider | Exact bundle and cwd, question → Browser-equivalent answer → second sampling → same-Turn terminal, MCP/Plan item projection, `auto_review + workspace_write`, representative Python/command use와 bounded process cleanup |
| Server integration | Loopback/Origin, exact product command validation, curated stream ordering, opaque identity, backpressure/control reserve, unknown outcome와 product store fault injection |
| Browser Playwright | Full representative traces와 desktop layout/accessibility at 1440×900 or wider |

Browser Playwright는 최소한 다음 trace를 검증한다.

1. Two TXT selection → accepted action → evidence-linked pending patch → accept → confirmed Assignment → reload reopen.
2. Review revision feedback → same Turn continues → replacement patch supersedes old → second Review.
3. Reject → settled no-apply outcome.
4. Answer 전 stream/Server/runtime continuity loss → interrupted, no confirmation, no apply, explicit retry only.
5. Atomic apply 직후 Codex answer/response loss → confirmed revision 유지, no duplicate apply.
6. Sidebar hide/show during running and Review → same Turn/controller remains active.
7. Unselected source, quote mismatch, stale base와 duplicate/late answer → fail closed without product mutation.
8. RawMaterial before/after digest, explicit source rebaseline, invalid product-store bytes-preserving read-only outcome, staged scratch cleanup와 no raw protocol/absolute path leakage.
9. Tracked seed digest는 실행 전후 동일하고, 두 fresh E2E run의 workspace·product state·scratch·native session은 서로 겹치지 않으며 ambient development workspace를 읽지 않는다.

### Existing and final commands

Implementation tickets must preserve the relevant existing gates:

- `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`
- `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
- `npm run test:node-unit -w @ay-ple/codex-chat-runtime`
- `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime`
- `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
- `npm run test:local-provider -w @ay-ple/codex-chat-runtime`
- `npm run test -w @ay-ple/server`
- `npm run test:e2e -w @ay-ple/chat-shell`

PR-ready final verification은 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, full Browser E2E와 docs link check를 포함한다. Opt-in live-provider trace는 exact selected fixtures로 complete successful vertical을 검증하되 deterministic failure coverage를 대신하지 않는다. Credential이 없으면 pass로 가장하지 않고 blocked로 보고한다.

## Out of Scope

- 범용 Chat completeness, multi-conversation catalog, rename·archive·pagination
- Generic transcript persistence·replay, active Turn late attach와 two-client synchronization
- Unanswered Review의 reload·restart hydration, durable Review inbox와 며칠 뒤 same-call resume
- 여러 StatePatch의 동시 Review, direct field editor와 generic workflow/job state machine
- 별도 action bar·progress dashboard·approval center와 모든 App Server event의 1:1 projection
- Manual Codex technical approval UI, custom approval-handler fork와 AY-PLE `UserConfirmation`의 permission 재사용
- `skills/list` exact-pin narrow port, broad App Server method inventory와 speculative provider/runtime abstraction
- PDF·image·audio parser, `Exam`, calendar/timeline/task manager, MarkdownProjection과 WorkspaceHistory
- LMS sync, cloud sync, remote multi-user, auto-submit와 background unattended mutation
- Packaged Desktop app, signing·notarization·updater, Windows·Linux, mobile·small-screen UI
- 중앙 pane의 fake IDE/editor capability와 3-pane 밖의 product feature polishing

## Open Questions

None.

## Further Notes

- Product/domain authority: [AY-PLE Product Brief](../product/ay-ple-product-brief.md), [Review Workspace Scenario](../product/ay-ple-review-workspace-scenario.md), [CONTEXT.md](../../CONTEXT.md)
- Root and runtime authority: [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)
- Native composition and UI authority: [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md), [Codex-native 제품 작업 조합](../architecture/codex-native-product-composition.md), [AY-PLE Design System](../product/ay-ple-design-system.md)
- Current implementation map: [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)
- Representative runtime evidence: [Current adapter representative trace](../wayfinding/codex-chat-application-foundation/assets/current-adapter-representative-trace.md)
- Permission decision evidence: [Codex 실행 권한과 AY-PLE 제품 확인 경계](../wayfinding/codex-chat-application-foundation/assets/codex-execution-permission-boundary.md)
- Plan interaction evidence: [StatePatch Review interaction donor](../wayfinding/codex-chat-application-foundation/assets/state-patch-review-interaction-donor.md)

이 spec은 current implementation이 완료됐다는 기록이 아니다. Local implementation tickets가 위 behavior contract를 end-to-end tracer-bullet slices로 나누며, 각 ticket이 current seam을 유지·확장·교체하는 exact 범위와 verification을 소유한다.
