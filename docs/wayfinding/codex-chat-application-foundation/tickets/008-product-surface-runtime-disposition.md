# 008 — Adopted local-web path의 runtime disposition을 확정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Current integration adapter로 first-vertical representative trace를 검증한다](006-current-adapter-representative-trace.md)

## Question

004–006의 corrected evidence를 종합할 때 이미 채택한 official Python SDK·macOS local-web product path 안에서 current patch·Node supervision·Server·Browser tracer와 bridge의 fixed `deny_all + read_only`를 `keep`, `replace`, `delete` 또는 frozen fallback 중 무엇으로 판정해야 하는가? Native Codex execution permission을 AY-PLE Review·`UserConfirmation`과 분리해 필요한 profile·설정 소유자·request projection을 정하고, 그 뒤 actual public-seam gap으로 확인된 residual만 승인한다.

## Resolution evidence

- 006 representative trace의 product journey coverage, local-first assumption, security·lifecycle와 upstream tracking 비용
- `StatePatch → Review → UserConfirmation → SemesterModel` product mutation과 native command·file·network approval·sandbox의 owner matrix
- Exact SDK의 `auto_review`·`sandbox=None` default, low-level synthetic default `accept`, current bridge override와 patch `0001`–`0005`의 non-approval provenance
- Product state와 native execution state·permission owner를 바꾸지 않는 adopted local-web boundary
- Current custom responsibility별 `keep | replace | delete | frozen fallback` 판정과 adopted owner
- Current fixed permission profile의 `keep | replace | delete | frozen fallback`, desired native configuration·사용자 선택과 request projection 판정
- Required outcome별 `direct reuse | adapt | narrow port | confirmed residual` disposition. Default `accept` 관찰만으로 fail-closed layer를 전제하지 않는다.
- ADR 0006·0009와 ADR 0011의 official SDK reuse·native identity·supervised lifecycle을 입력 제약으로 유지하되 tracer permission hardcode는 재평가하는 판정
- Desired profile과 UX 뒤에도 남는 confirmed public-seam residual만 022+ ticket으로 admission하고 general Chat backlog를 되살리지 않는 decision

## Answer

### 채택한 disposition

[First-vertical runtime overlap](../assets/first-vertical-runtime-overlap.md), [current adapter representative trace](../assets/current-adapter-representative-trace.md)와 [Codex 실행 권한과 AY-PLE 제품 확인 경계](../assets/codex-execution-permission-boundary.md)를 종합하면 first vertical에 새 Codex runtime semantics나 alternate host가 필요하다는 evidence는 없다. Official Python SDK와 exact native bundle이 Account read, explicit `cwd`, `SkillInput`, `outputSchema`, native `Thread`·`Turn` identity, interrupt와 authoritative terminal을 이미 소유한다. Current integration에서 생존할 부분은 이 native seam을 supervised local-web process로 운영하고 product boundary에 lossless하게 전달하는 책임이다.

| Current surface | 판정 | 채택한 경계 |
| --- | --- | --- |
| Official Python SDK | `keep` | Adopted runtime API다. First-party 구현은 conformance donor이며 별도 runtime 후보로 재개방하지 않는다. |
| Exact `0.144.4` SDK·native bundle | active primary | 더 최신 exact pin이 같은 provenance·actual-child·representative conformance를 통과하기 전에는 `frozen fallback`으로 낮추지 않는다. |
| Ordered patch `0001`–`0005` | exact-pin-scoped conditional `keep` | `0001`·`0005`는 current response correctness, `0002`·`0003`은 persistent runtime의 bounded routing·accounting을 함께 보존하고, `0004`는 current notification projection assumption 때문에 유지한다. Upgrade 때 각 original failing oracle를 unpatched SDK에 다시 실행해 통과한 patch부터 개별 삭제하되 `0002`·`0003`은 ordered pair의 oracle를 함께 확인한다. Approval·sandbox를 바꾸기 위해 patch를 추가하지 않는다. |
| Node supervision·bundle verification·process-group cleanup | `keep` | Official SDK·native child의 readiness, bounded settlement와 app-managed root cleanup을 소유한다. |
| Python bridge의 SDK ownership·lifecycle core | `keep` | 한 supervised worker가 official high-level SDK를 소유하는 경계는 유지한다. |
| Five-command text-only bridge projection | `adapt` | `TextInput`, `SkillInput`과 `outputSchema`를 official SDK shape와 native identity를 잃지 않고 전달하는 얇은 private transport로 바꾼다. 새 workflow protocol은 만들지 않는다. |
| Exact validation, acceptance-first ordering와 bounded settlement | `keep` | Native acceptance 전 failure, accepted execution과 authoritative terminal·unknown outcome을 구분하는 conformance boundary다. |
| Deterministic invariant·call-log test seam | outcome `keep`, input shape `adapt` | Native start `0/1`, receipt correlation, terminal·unknown과 retry invariants는 유지하되 current `{ threadId, text }` fake shape는 Skill·schema·product validation input을 표현하도록 adaptation한다. |
| Actual-child·local/live provider gate | `keep` | Runtime regression과 exact bundle provenance를 계속 검증한다. Product Browser E2E의 대체물은 아니다. |
| Current 네 Chat route의 tracer-only product projection | `replace` | 네 route 자체를 target product API로 승격하지 않는다. Product-bound Chat Turn에 필요한 typed input, correlation과 native activity만 좁게 adaptation한다. |
| Browser strict decoder·native item identity reducer | `adapt` | Raw protocol이나 새 event bus가 아니라 Chat transcript에서 native Turn·Item ordering과 terminal을 보존하는 conformance logic으로 재사용한다. |
| Process-global current conversation·turn `1/1`과 tab-memory transcript | first-vertical 한정 frozen limitation | 영구 architecture로 채택하지 않지만 generic persistence를 first vertical의 blocker로 만들지도 않는다. 동일 app lifecycle의 한 active Chat만 지원하고 broader ownership은 후속 Chat Companion Foundation이 조사한다. |
| Browser disconnect 즉시 auto-interrupt | target에서 제외 | Sidebar toggle은 Browser transport를 끊거나 Turn을 중단하지 않는다. 실제 disconnect·reload recovery는 current vertical에서 성공을 가장하지 않는 honest outcome만 요구하고 reconnect semantics는 후속 effort로 넘긴다. |
| Loopback bind, exact Origin guard, explicit root 격리와 bounded shutdown | outcome `keep` | macOS same-user local-web baseline을 유지한다. 이 outcome이 current composition 전체의 영구 생존을 뜻하지 않으며 stronger multi-user authorization을 제공한다고 주장하지 않는다. |

`keep`은 현재 source 전체를 고정한다는 뜻이 아니라 representative trace가 증명한 outcome과 conformance seam을 유지한다는 뜻이다. `replace`와 `adapt`도 Codex semantics를 재구현한다는 뜻이 아니다. Official SDK input·identity·lifecycle을 product-bound Chat과 AY-PLE state에 연결하는 최소 integration work만 허용한다.

### Skill-in-Chat 실행 경계

First vertical과 후속 제품 action은 새 generic workflow runtime을 만들지 않고 native Skill Turn으로 실행한다.

1. 사용자는 Chat composer 또는 자료·날짜·action control로 작업 의도를 표현한다.
2. Product layer가 Recipe version, arguments와 selected source를 검증한다.
3. Runtime에는 validated argument·selected path를 담은 `TextInput`, loaded·enabled catalog에 속한 canonical `SKILL.md` exact path를 가리키는 `SkillInput`과 `outputSchema`를 전달한다. Product preflight는 Skill catalog membership을 native start 전에 확인한다.
4. 같은 visible Chat Turn에서 Agent message, command·tool·MCP activity, interrupt와 terminal을 native ordering에 맞춰 streaming한다.
5. Structured result는 product validator가 JSON·schema·selected source·quote를 다시 확인한 뒤 `StatePatch` proposal로 올린다.

Exact SDK의 `SkillInput` public seam은 `name`과 `path`만 소유하며 `{{PLACEHOLDER}}` argument templating을 제공하지 않는다. 따라서 Skill file을 실행마다 복제·변형하지 않고 arguments를 별도 `TextInput`으로 전달한다. `ModelingInvocation`은 Recipe·version·arguments·sources·schema를 기록하는 product-side 요청 record로 남을 수 있지만 runtime protocol이나 별도 state machine이 아니다. `ModelingRun`은 opaque native correlation, terminal과 validation outcome을 보존하는 product receipt다.

Skill-triggered product action 하나는 visible Chat Turn 하나와 native Turn 하나를 만들고, 필요한 경우 `ModelingRun` 하나가 그 Turn에 1:1로 연결된다. 일반 대화 Turn은 product Skill을 실행하지 않는 한 `ModelingRun`을 만들지 않는다. Explicit retry는 새 native Turn과 새 `ModelingRun`을 만들며 이전 receipt를 덮어쓰지 않는다.

후속 기능도 새 workflow runtime을 만들기 전에 `Skills only` 또는 `custom MCP + Skills` 조합으로 표현할 수 있는지 먼저 평가한다. 채택하는 경우 Skill은 workflow·instructions를, MCP는 외부 system capability와 side effect를 소유하고, AY-PLE는 arguments·durable product state·validation·Review·`UserConfirmation`을 소유한다. Actual product need와 capability evidence가 다른 boundary를 요구하면 다시 결정하며, Skill·MCP 조합을 모든 기능의 선행 architecture로 고정하지 않는다. 채택된 action은 별도 job UI가 아니라 같은 Chat transcript에서 streaming하는 것을 기본 UX로 둔다.

### Chat-first product surface

Chat-first는 ChatGPT형 full-screen application을 뜻하지 않는다. Interaction은 익숙한 Chat을 중심으로 유지하되 공간 구조는 [camp demo의 product workspace 판단](../../../../artifacts/camp-demo/product-flow/design-notes.md)을 이어받은 desktop workbench다.

| Surface | Target outcome |
| --- | --- |
| 왼쪽 pane | 학업 자료 목록과 선택 context를 소유한다. 첫 vertical에서 필요한 좁은 자료 선택부터 구현한다. |
| 중앙 pane | 선택 자료와 이후 workspace·IDE surface를 소유한다. 아직 구현하지 않은 기능을 가짜로 채우지 않는다. |
| 오른쪽 pane | AY Chat companion이다. IDE sidebar처럼 toggle할 수 있고, 닫아도 같은 app lifecycle의 conversation과 실행 중 Turn을 중단하지 않는다. |

Current full-screen Chat Shell의 outer layout은 `replace`한다. Transcript, composer, streaming, interrupt와 native Turn·Item identity 처리는 right Chat sidebar 안으로 `adapt`한다. Skill·MCP activity, `StatePatch` proposal, Review·`UserConfirmation`과 decision receipt도 같은 누적 transcript의 product-specific 항목으로 표현한다. 별도 progress bar, action dashboard나 병렬 job surface는 만들지 않는다.

First vertical은 한 active Chat conversation만 요구한다. Sidebar toggle과 중앙 workspace 조작은 같은 app lifecycle의 transcript와 Turn을 유지한다. Settled `ModelingRun`, pending proposal, Review 결과와 확인된 학업 상태는 product state로 다시 열 수 있어야 하지만, Browser reload·Server restart 뒤 generic transcript·live stream을 복원하는 것은 이번 spec의 prerequisite가 아니다. 복원되지 않은 Chat을 복원된 것처럼 표시하지 않는다. Multi-conversation catalog, rename·archive, generic transcript persistence·replay와 two-client sync는 후속 product need에서 다시 admission한다.

### Native permission과 AY-PLE product confirmation

[Permission boundary 정정](../assets/codex-execution-permission-boundary.md)의 세 owner를 그대로 유지한다.

| Decision | Owner | 채택한 판정 |
| --- | --- | --- |
| `StatePatch`를 확인된 `SemesterModel`로 반영할지 | AY-PLE Review·`UserConfirmation` | 일정 조정·자료 해석처럼 AY의 판단이 제품 state가 되는 지점에서만 명시적 사용자 결정을 받는다. |
| Command·file·network 실행을 허용할지 | Native Codex permission profile | First vertical의 기본 profile은 `ApprovalMode.auto_review + Sandbox.workspace_write`다. Python·command와 workspace 작업을 매번 AY-PLE 확인으로 바꾸지 않는다. |
| Filesystem·network capability 범위 | Native Codex sandbox configuration | Native profile과 향후 사용자 설정이 소유한다. Product `read-only extraction`에서 역으로 고정 `Sandbox.read_only`를 도출하지 않는다. |

Current bridge의 fixed `deny_all + read_only`와 Browser의 `승인 요청 안 함 · 읽기 전용` copy는 `replace`한다. First vertical의 `read-only extraction`은 사용자 자료와 confirmed product state를 Review 전에 바꾸지 않는 제품 효과이며 Codex가 Python interpreter나 workspace tool을 사용하지 못하게 한다는 뜻이 아니다.

초기 integration은 exact SDK가 public하게 표현하는 `ApprovalMode.auto_review + Sandbox.workspace_write`를 명시적으로 사용한다. 이후 사용자 선택도 우선 exact high-level SDK가 제공하는 `ApprovalMode`와 `Sandbox.read_only | workspace_write | full_access` 조합 안에서 제공하며 AY-PLE는 선택 UX만 소유하고 enforcement를 재구현하지 않는다. Named profile, custom writable root·network toggle과 manual user reviewer는 current high-level public seam이 보장하는 선택지로 가장하지 않고 실제 product need가 생길 때 별도로 조사한다.

`workspace_write`가 RawMaterial이나 confirmed product state를 변경할 제품 권한을 뜻하지는 않는다. Product adapter는 Codex가 계산·도구 사용에 필요한 writable work area를 사용하더라도 selected source와 confirmed state가 보존되는 protected execution boundary를 소유해야 한다. Read-only projection, staged copy 또는 integrity verification 같은 exact filesystem mechanism은 resulting spec이 정하되, representative action과 Browser E2E는 실행 전후 RawMaterial·confirmed state 불변과 proposal-only admission을 검증해야 한다. 이는 approval-handler나 SDK public-seam residual이 아니라 AY-PLE product adaptation이다.

이번 first vertical은 Browser에서 command·file change를 하나씩 승인하는 interactive technical approval을 요구하지 않는다. 따라서 high-level SDK의 user-review handler seam을 patch하거나 low-level client로 우회할 근거가 없다. 향후 사용자가 manual technical approval profile을 실제로 요구하면 Codex request identity·결정·result를 AY-PLE proposal과 시각적·상태적으로 분리한 뒤 exact public seam을 다시 조사한다. 현재 synthetic default `accept` 관찰만으로는 confirmed residual이 아니다.

### Required outcome disposition

| Required outcome | Disposition |
| --- | --- |
| Account read, explicit `cwd`, `SkillInput`, `outputSchema`, native identity·terminal·interrupt | `direct reuse` |
| Argument·source validation, `ModelingRun` correlation, final JSON·schema·source-reference validation과 product unknown outcome | `adapt` |
| `workspace_write` 아래 RawMaterial·confirmed product state 보존과 별도 writable work area | product integration `adapt` |
| Supervised process, exact bundle provenance, bounded cleanup와 repeatable runtime gates | current implementation outcome `keep` |
| Chat sidebar, Skill-in-Chat projection, `StatePatch`·Review·decision receipt와 Browser product E2E | product integration `adapt` |
| Fixed `deny_all + read_only`, full-screen Chat Shell와 tracer-only four-route contract | `replace` |
| Generic multi-conversation·transcript recovery·two-client·manual technical approval center | first vertical에서 `deferred` |
| New runtime protocol, generic event bus, alternate first-party host와 permission fork | `out-of-scope` |

Desired first-vertical profile과 Chat UX는 exact official SDK public seam으로 표현할 수 있다. 006은 이전 `deny_all + read_only` profile에서 runtime contract를 actual/live로 검증했으므로 새 `auto_review + workspace_write` profile의 effective policy와 protected-source invariant는 resulting implementation verification에 추가한다. Public representability gap은 아니므로 008에서 승인할 `narrow port`나 `confirmed residual`은 없고 `022+` ticket도 만들지 않는다.

### Verification과 다음 roadmap

Runtime verification은 deterministic contract, exact actual-child, local/live provider와 provenance gate를 유지한다. Resulting first-vertical implementation은 이와 별도로 실제 Browser에서 다음 대표 흐름을 E2E로 통과해야 한다.

`자료 선택 → right Chat에서 Skill Turn 시작 → native activity·result streaming → source-linked StatePatch proposal → Review·UserConfirmation → product state 재열기`

이 E2E는 effective `on-request + auto_review + workspaceWrite` mapping, Python·command를 포함한 representative action, RawMaterial·confirmed state의 실행 전후 불변과 별도 writable work area cleanup도 함께 확인한다.

First vertical과 이 Browser product E2E가 닫힌 직후 별도 `Chat Companion Foundation` Wayfinder를 다음 effort로 시작한다. 이 effort는 current DAG의 blocker가 아니며 실제 product-bound companion에서 관찰한 gap을 입력으로 FE component·state ownership, native thread list·read·resume, reload·accepted disconnect, multi-conversation, Account Readiness, activity·technical permission 표현과 desktop accessibility를 점검한다. 과거 broad Chat ticket을 그대로 reopen하거나 evidence 없이 two-client·replay infrastructure를 선행하지 않는다.

### Domain vocabulary 판정

이번 결정은 기존 `ModelingInvocation`, `ModelingRun`, `StatePatch`, Review·`UserConfirmation`과 `SemesterModel`의 product/runtime 경계를 정밀화했지만 새 AY-PLE 학업 domain term을 만들지 않았다. `SkillInput`, Chat Turn, sidebar, permission profile과 sandbox는 Codex·application vocabulary이므로 `CONTEXT.md`를 변경하지 않는다.
