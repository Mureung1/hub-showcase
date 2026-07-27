# AY-PLE 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 분류 | 활성 |
| 성숙도 | 초안 |

## 문서 목적

이 문서는 AY-PLE의 실제 작업 순서와 완료 상태를 날짜 없는 Markdown task list로 관리한다. Current First Assignment의 interaction round trip은 보존하되, app-owned academic workflow는 user-owned Git SemesterWorkspace와 InteractionCapability seam으로 교체한다. 과거 캠프 제출 일정과 당시 판단은 [과거 캠프 제출 백로그](../archive/2026-07-ay-ple-4-week-submission-backlog.md)에 역사 기록으로 보존한다.

제품 목표와 범위는 [AY-PLE Product Brief](ay-ple-product-brief.md), 도메인 용어는 [CONTEXT.md](../../CONTEXT.md), AY↔App mapping은 [Interaction Capability 아키텍처](../architecture/ay-app-interaction-capabilities.md)가 소유한다. Official SDK Runtime baseline은 [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), single maintained graph·no-alias 경계는 [ADR 0012](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), current durable v2 보존 정책은 [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), user-owned workspace는 [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md), InteractionCapability 경계는 [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)을 따른다. Current account와 root 배치는 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 소유한다. 제거한 app-owned workspace·public distribution·managed account 결정은 historical ADR 0014·0016·0017에 보존한다.

## 운영 규칙

- 목록에서 위에 있는 상위 todo를 먼저 진행한다. 별도 우선순위 label은 사용하지 않는다.
- 동시에 진행 중인 상위 todo는 하나로 제한한다. 막히면 local issue에 원인과 해제 조건을 기록하고 다음 독립 todo로 이동한다.
- 상위 todo는 사용자가 얻는 capability, 하위 todo는 독립적으로 검증할 수 있는 동작이다. 파일, 타입, endpoint, 세부 구현 순서는 [local implementation ticket](../tickets/)에서 관리한다.
- `raw:` 표기는 해당 동작의 근거가 되는 Codex App Server method다. Raw method 자체를 최상위 작업 단위로 사용하지 않는다.
- 완료한 작업은 `[x]`, 남은 작업은 `[ ]`로만 표현한다. 새 정보로 우선순위가 바뀌면 label을 추가하지 않고 목록 순서를 옮긴다.
- 외부 제출 시점이 필요하면 별도 milestone으로 관리하며, 백로그의 구조나 ID에 반영하지 않는다.

## 공통 완료 조건

하위 todo는 다음 조건을 모두 만족할 때 완료한다.

- 적힌 사용자 또는 개발자 동작을 end-to-end로 확인할 수 있다.
- 정상 흐름과 중요한 실패 흐름을 변경 위험에 맞는 자동화 테스트로 검증한다.
- 코드, 관련 package README, 구현 지도와 제품 문서가 현재 동작과 일치한다.
- 변경 범위에 필요한 test, typecheck, build와 lint를 통과한다.
- UI 변경은 데스크톱 workspace에서 정보 밀도, loading·empty·error 상태와 핵심 상호작용을 직접 확인한다.

## 작업 목록

완료 항목은 당시 구현과 검증 증거를 보존한다. ADR 0018·0019가 대체한 app-owned workspace·Recipe/Run·durable patch/confirmation을 current target contract로 다시 해석하지 않는다.

- [x] 제품·Codex 실행 기반을 준비한다.
  - [x] 제품 문제, 핵심 사용자와 MVP 경계를 [Product Brief](ay-ple-product-brief.md)로 정리하고, 자료 선택부터 Review까지의 사용자 흐름을 [prototype scenario](ay-ple-review-workspace-scenario.md)로 검증했다.
  - [x] App Server package, app data와 사용자 workspace의 소유 경계를 분리하고 pinned Codex protocol을 제품 계약 밖에 격리했다. 근거: [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md).
  - [x] 초기 Runtime Harness로 단일 run lifecycle, streaming·취소·실패와 진단 이력 격리를 검증했다. 이 executable graph는 역할을 마친 뒤 Chat-only cutover에서 제거했으며 당시 기준선은 [ADR 0003](../adr/0003-build-runtime-harness-before-product-layer.md)과 완료 spec에 역사 기록으로 남겼다.
  - [x] 제품 작업의 `ModelingRecipe → ModelingInvocation → ModelingRun` 조합과 official Python SDK direct reuse 기반 Chat Shell을 서로 다른 결정으로 채택했다. 근거: [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md), [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md).
  - [x] 첫 제품 경로를 macOS-first local web app으로 한정하고 active runtime source와 package fixture의 Windows compatibility branch를 제거했다. 근거: [ADR 0009](../adr/0009-use-a-macos-first-local-web-app-product-path.md).

- [x] Official SDK 기반 Codex-native Chat Shell의 첫 수직 흐름을 완성한다.
  - [x] Official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`과 direct reuse 결정을 채택하고, 격리 prototype `prototype/codex-python-sdk-reuse@3b3fa9e0`으로 native identity·stream, same-thread turn, interrupt와 close 가능성을 확인했다.
  - [x] Official generated model과 `api.py` generated block, Python SDK/runtime dependency를 exact `0.144.4`에 맞춘 reproducible package baseline으로 만들고 public signature drift, Apache-2.0 provenance와 artifact lock을 검증한다. 같은 tracer의 exact actual-child fake는 AgentMessage event와 `turn/completed`를 `turn/start` response보다 먼저 보내 현재 terminal 유실을 재현하되 deadline과 process-tree cleanup으로 영구 대기를 막는다.
  - [x] 확인된 early-terminal blocker를 upstream fix 또는 최소 router patch로 고쳐 FIFO·once-only terminal을 official suite와 response-last fake에서 증명한다.
  - [x] Python SDK의 login, active/pending turn과 global notification queue에 package-private item·payload bound를 두고 stalled consumer나 burst overflow를 silent drop 없이 bridge terminal과 cleanup으로 정산한다.
  - [x] Native thread·turn·item identity와 stream을 보존하는 supervised Node↔Python bridge를 만들고 deadline, bounded queue, crash settlement와 child-of-child close/reap을 검증한다.
  - [x] Server에 browser-safe session·NDJSON stream endpoint, native thread/turn identity, authoritative terminal·error, local Origin guard와 disconnect/shutdown 정산을 연결한다.
  - [x] 데스크톱 Chat UI를 Server endpoint에 연결해 native thread 생성, text turn, AgentMessage streaming과 authoritative terminal·error를 표시한다.
  - [x] 진행 중 turn interrupt, 같은 thread의 후속 turn과 deterministic bridge close를 end-to-end로 검증한다.
  - [x] Exact fake와 root test·typecheck·build·Chat Shell lint를 통과시키고, official local-provider conformance를 green으로 확인했다. 완료 뒤 cutover 전에 명시적으로 승인한 격리 인증 상태를 사용한 manual live-provider T0도 green으로 확인했으며, 이 point-in-time 증거는 전용 disposable auth 자동화와 구분한다.

- [x] Tracked repository를 Codex Chat-only graph로 전환한다. 이 항목은 product-only cutover 이전의 완료된 역사적 단계다.
  - [x] 당시 `@ay-ple/codex-chat-runtime`, Chat-only Server와 Chat Shell만 maintained runtime workspace로 남기고 이전 executable runtime·Inspector graph와 generated inventory를 compatibility alias나 redirect 없이 제거했다.
  - [x] 당시 root `npm run dev`는 exact Chat Origin과 함께 Server+Chat Shell만 시작하고 Server의 application API를 네 `/api/codex-chat/*` route로 닫았다. 후속 제품 bootstrap에서 이 진입점을 잠시 `npm run dev:chat-only`로 옮겼고, 최종 [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md) cutover에서 route와 script를 alias 없이 제거했다.
  - [x] Current navigation, product·architecture·package 문서를 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md)와 [ADR 0012](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)로 전환했다.
  - [x] Native identity, AgentMessage FIFO, terminal, interrupt, disconnect와 listener/runtime shutdown contract를 survivor test에서 보존했다.

- [x] Chat-only cutover candidate와 local cleanup gate를 destructive action 없이 rehearsal한다.
  - [x] Clean `candidate_ready_sha`에서 install·test·typecheck·build·browser·camp·exact native·Server process·entrypoint·docs·residual matrix를 red·blocked·skipped 없이 통과한다.
  - [x] Exact local residue allowlist를 검사하는 residual checker와 permanent-delete operator를 candidate-specific Git-directory artifact로 독립 review하고 hash를 고정하되 delete mode는 실행하지 않는다.

- [x] Current canonical clone의 승인된 local legacy residue를 영구 삭제하고 Chat-only handoff를 확정한다.
  - [x] Completed rehearsal을 confidence evidence로 유지하고, claim commit 뒤 clean tracked state, exact root shape·tracked-zero, effective Chat path 비중첩과 관련 process 부재를 다시 확인한 뒤 승인된 exact roots만 literal serial command로 삭제한다.
  - [x] 삭제 뒤 bundle protection, repository PR-ready checks, canonical `npm run dev`와 root absence를 검증하고 no-migration·no-data-rollback·필요 시 fresh isolated Chat roots 재로그인 경계를 handoff에 기록한다.

- [x] 첫 Assignment vertical에 필요한 Codex runtime sufficiency를 증명한다.
  - [x] [Runtime sufficiency envelope](../wayfinding/codex-chat-application-foundation/tickets/004-first-assignment-runtime-envelope.md)에 따라 explicit first-vertical workspace root와 두 TXT `SourceSelection`으로 Skill 기반 `ModelingInvocation`을 실행해 `ModelingRun` receipt를 남기는 경로와, 같은 native Turn에서 `ModelingRun`과 독립적인 EvidenceRef 연결 Assignment `StatePatch`를 `propose_state_patch`로 제안해 exact Plan mode Review·`UserConfirmation`을 거쳐 다시 열 수 있는 `SemesterModel`로 반영하는 흐름의 observable runtime contract를 역산한다.
  - [x] Exact App Server·official SDK·first-party surface와 current `CodexChatRuntime`·Server·Browser tracer가 required outcome을 어디까지 소유하는지 확인하고, 일반 Chat capability를 requirement로 자동 승격하지 않는다.
  - [x] Additive `CodexProductCapableRuntime`이 native work 없는 Account Readiness, exact `SkillInput` 하나와 bounded `TextInput` 하나, Plan mode의 `auto_review + workspace_write`, curated Skill·Plan·`propose_state_patch` MCP·user-input activity와 opaque answer/cancel을 제공한다. Existing text tracer의 `deny_all + read_only`는 final cutover 전까지 유지한다.
  - [x] UI 없는 representative trace가 검증한 explicit `cwd`, exact `SkillInput`·selected source Markdown path를 담은 `TextInput`, native acceptance·terminal과 bounded failure settlement를 보존한다. Product action seam은 `propose_state_patch` MCP의 canonical input·stable patch result, exact Plan mode의 built-in `request_user_input` same-Turn request·answer와 opaque execution correlation을 함께 검증한다.
  - [x] Versioned fixture와 fresh isolated roots로 deterministic contract·exact actual-child gate를 반복해 current adapter가 product Browser vertical을 시작하기에 충분함을 증명했다. Complete Browser semantics를 요구하는 final exact/local/live product trace는 아래 제품 vertical의 후반 conformance gate가 소유하며, credential 부재는 pass·skip이 아니라 blocked로 보고한다.
  - [x] Account readiness, interrupt, process crash·restart, retry와 unknown outcome은 deterministic representative failure가 요구하는 범위에서 검증하고, 실제 child/provider conformance는 final conformance gate에 남긴다.
  - [x] Official Python SDK·ordered patches·Node supervision·Python bridge·네 Chat route와 fixed `deny_all + read_only` tracer를 `keep | adapt | replace | frozen limitation`으로 판정하고, official SDK와 supervised thin local-web integration을 product path로 유지한다.
  - [x] 제품 caller는 raw JSON-RPC, generated protocol type, secret과 bridge 내부 process 계약을 직접 사용하지 않으며, native execution state·Codex permission과 `ModelingRun`·Review·`UserConfirmation`의 학업 상태 소유권을 분리한다.

- [x] 검증된 runtime seam 위에 AY-PLE 학업 제품 layer의 첫 수직 흐름을 완성한다.
  - [x] First Assignment vertical의 pre-public seam에서 명시적인 local path를 작업 root로 열고 `Course`를 식별한 뒤 같은 학기 상태를 다시 열 수 있으며 기존 사용자 파일을 임의로 바꾸지 않는다. 이 구현 증거는 임의 폴더를 canonical `SemesterWorkspace`로 채택하는 public admission 계약을 뜻하지 않는다.
  - [x] `RawMaterial`의 원본 또는 참조를 보존해 목록과 preview에 표시하고, 사용자가 다음 작업에 사용할 `SourceSelection`을 명시적으로 고를 수 있다.
  - [x] Versioned `ModelingRecipe`와 검증된 arguments, `SourceSelection`, 활성 workspace 맥락으로 일회성 `ModelingInvocation`을 만들고 native Codex input으로 번역하며, 각 실행 시도를 얇은 `ModelingRun` receipt로 남긴다. raw: `turn/start`.
  - [x] 첫 Assignment 작업이 호출한 좁은 `propose_state_patch` MCP의 canonical structured input을 검증해 필드별 `EvidenceRef`가 있는 독립 `StatePatch`로 제안하고, Review 전에는 `SemesterModel`의 확인된 값을 바꾸지 않는다.
  - [x] 사용자가 exact Plan mode의 built-in `request_user_input`을 통해 같은 native Turn에서 제안을 수락·수정 요청·거절할 수 있다. App은 exact active patch binding을 검증해 수락·거절만 settled `UserConfirmation`으로 기록하고 수락한 값만 확인된 `SemesterModel`에 반영하며, 수정 요청은 unsettled feedback으로 replacement patch Review를 이어간다.
  - [x] 이 proposal-only 제품 효과를 Codex `Sandbox.read_only`, network 차단이나 command/file approval과 동일시하지 않고, 실제 action에 필요한 native permission은 별도 설정·request 흐름으로 다룬다.
  - [x] Recipe rendering, Codex 실행, `StatePatch` proposal·evidence validation과 제품 상태 반영 실패를 구분해 원본과 확인된 상태를 손상하지 않는 재시도 행동을 제공한다.
  - [x] 대표 TXT 자료의 선택부터 `propose_state_patch` Assignment 제안, exact Plan mode의 built-in `request_user_input` same-Turn Review, settled confirmation과 새로고침 뒤 확인된 상태 조회까지 deterministic Browser E2E를 닫았다. Revision·recovery semantics 고정 뒤 exact actual-child·local-provider와 명시적 isolated auth·fresh roots를 쓴 live-provider product trace가 complete action을 수동 복구 없이 통과했고, 답변 전 Browser·Server/runtime continuity loss는 `interrupted`·no-apply·명시적 retry로 정산했다. Canonical product-only cutover와 current v2 first durable compatibility baseline도 확정했다.

- [x] 첫 vertical이 요구한 product-bound companion interaction만 완성한다.
  - [x] 선택한 surface에서 필요한 Account Readiness와 first-vertical explicit root activation만 제공하고 자체 account center나 generic conversation workspace를 만들지 않는다.
  - [x] 사용자가 대표 action의 준비·실행·중단·완료·실패·결과 불명을 이해할 수 있게 하되, 모든 native activity를 transcript에 1:1로 노출하지 않는다.
  - [x] Browser reload나 local process restart 뒤 transcript나 unanswered `request_user_input` prompt를 복원하지 않고, settled `UserConfirmation`·apply outcome·확인된 `SemesterModel`의 사실 상태를 다시 연다. 답변 전 continuity loss는 `interrupted`·no-apply로 표시하고 명시적 retry를 제시한다.
  - [x] 첫 action이 실제로 발생시키는 Codex approval과 일반 Plan clarification은 원래 request identity로 처리하고 학업 상태를 바꾸지 않으며, `StatePatch` Review의 built-in `request_user_input` 답변은 같은 native Turn을 이어가되 settled `UserConfirmation`만 apply authority가 되게 한다.
  - [x] 자료 선택·근거·변경 제안·Review와 오른쪽 companion이 같은 desktop product flow에서 이해 가능하게 동작하는지 1440px~1920px에서 검증했다.

- [x] public release lane에서 추가된 구현을 감사하고 현재 제품에 필요한 범위를 다시 판정한다.
  - [x] Landing·public host·managed account lifecycle은 제거하고, v3 `SemesterWorkspace` kernel은 adopted future workspace authority로 유지하며, 관련 ADR·Spec·ticket·Wayfinder는 historical evidence로 보존한다고 분류했다.
  - [x] Runtime resolver와 public application host는 repository-local 실행의 consumer가 없음을 확인하고 tracked graph에서 제거했다.
  - [x] Current dev·dogfood의 isolated Codex auth profile을 제거하고 caller의 전역 `CODEX_HOME`을 항상 재사용한다.
  - [x] Public-preview Server·Browser graph, Account coordinator, OAuth/setup UI와 shared wire contract를 제거하고 `/api/product/*` current-v2 product graph만 남겼다.
  - [x] Runtime managed account·`auth-only` primitive는 제거하고 fresh Account Readiness만 workspace Runtime에 유지했다. 당시 `@ay-ple/semester-workspace` v3 admission·setup kernel은 ADR 0014 target의 구현 증거로 남겼고, 이후 ADR 0018이 그 target을 대체했다.
  - [x] 감사 결과를 구현 지도, Runtime 격리 문서와 이 backlog에 반영했다.

- [ ] First Assignment를 user-owned Git SemesterWorkspace와 InteractionCapability seam으로 재구성한다.
  - [ ] Current First Assignment의 MCP→Browser Review→same-Turn continuation을 characterization test로 고정하고, app-owned academic apply와 결합된 부분을 target contract로 승격하지 않는다.
  - [ ] `InteractionCapability<Request, Result>` deep Module과 production Browser Adapter·in-memory test Adapter를 만든다. Module 내부가 exact Turn binding, correlation, once-only answer, cancel·disconnect·terminal settlement를 소유한다.
  - [ ] `propose_state_patch` input에서 caller-supplied `requestKey`, workspace·Course identity, store revision과 native identity를 제거하고, 설명·순서 있는 semantic before/after change·선택적 evidence만 받는 도메인 중립 capability contract로 축소한다. Assignment schema와 raw Git diff를 공개 contract에 넣지 않는다.
  - [ ] Review UI의 `accept | revise | reject`와 optional feedback을 custom MCP call 하나의 closed result로 반환한다. 같은 결정을 built-in `request_user_input`에 다시 걸지 않는다.
  - [ ] AY가 interaction result 뒤 SemesterWorkspace의 실제 file을 변경하고 의미 있는 checkpoint에서 Git commit하게 한다. App은 accepted result를 대신 적용하거나 clean working tree를 선행조건으로 요구하지 않는다.
  - [ ] App-owned `RawMaterial` registry·snapshot, `ModelingRecipe`·`ModelingInvocation`·durable `ModelingRun`, durable `StatePatch`·`UserConfirmation`과 revision-bound academic apply transaction을 current product contract와 persistence에서 제거한다.
  - [ ] Capability contract test, deterministic Browser E2E와 exact local-provider trace로 accept·revise·reject·cancel·disconnect·Runtime terminal에서 허위 apply나 duplicate result가 없음을 검증한다.

- [ ] User-owned SemesterWorkspace lifecycle과 canonical local roots를 완성한다.
  - [ ] Sibling `../.ay-ple/`에 known·active repository path만 소유하는 durable `WorkspaceRegistry`를 두고, 사용자가 선택한 한 학기 Git root를 exact Codex `cwd`로 전환한다.
  - [ ] Instruction-based init Skill로 Git 초기화, 최소 `AGENTS.md`, root `workspace-state.json`과 첫 checkpoint를 준비한다. Existing bytes와 dirty working tree를 존중하고 별도 scaffold script는 deterministic 필요가 확인될 때만 추가한다.
  - [ ] Runtime payload를 verified `../.ay-ple/runtime/`에서 시작하고 workspace별 transient operation state를 Git 밖 `../.ay-ple/state/workspaces/<workspaceId>/`에 둔다.
  - [ ] 새 canonical layout의 Runtime·global Codex account·active workspace·InteractionCapability smoke가 성공한 뒤에만 legacy dogfood appData, managed development workspace와 package-local Runtime artifact를 scoped cleanup한다.

- [ ] 확인된 사용자 필요에 따라 나머지 post-Ready capability를 순서대로 추가한다.
  - [ ] 여러 대화를 다시 찾고 이어가는 행동이 확인되면 workspace-scoped `thread/list`·`thread/read`·`thread/resume`, 선택 상태와 최소 catalog UX를 추가한다. Rename·archive·pagination은 각각의 need가 있을 때만 포함한다.
  - [ ] Accepted work의 Browser disconnect가 실제 product journey를 막으면 native status·read를 우선 사용해 honest unknown-outcome 또는 rejoin을 추가한다. Snapshot·cursor·replay journal은 관찰된 gap 없이는 만들지 않는다.
  - [ ] 같은 local companion을 여러 Browser client가 동시에 제어해야 하는 사용 흐름이 확인되면 client ownership·isolation을 별도 capability로 검증한다.
  - [ ] 채택한 Plan mode의 built-in `request_user_input` 외에 실제 command·file·network·다른 additional-input request가 발생하면 해당 native request family와 first-party behavior를 먼저 흡수하고 필요한 policy·UI만 추가한다.
  - [ ] Account plan, rate limit, token usage나 model 상태가 사용자 action에 실제로 필요해지면 읽기 전용 status surface를 추가한다.
  - [x] 개인 사용에서 확인된 Model 선택 필요에 따라 Browser-session→다음 Product Turn 경계의 설정 UX를 추가했다. Official `model/list`의 visible catalog와 advertised reasoning effort 순서를 사용하고 지원 모델에만 Fast를 노출하며 Chat·Assignment·retry가 같은 선택을 재사용한다. 새로고침은 catalog default로 돌아가고 `config/read`·`config/value/write`나 전역 `config.toml` mutation은 도입하지 않았다.
  - [ ] 즉시 정정이 새 turn보다 나은 대표 case와 correlation 규칙을 확인하면 active turn 정정 UX를 추가한다. raw 후보: `turn/steer`.
  - [ ] 실제 context 부족이나 history 편집 case를 확인하면 manual compact와 fork를 각각 평가한다. raw 후보: `thread/compact/start`, `thread/fork`. Deprecated `thread/rollback`은 지원되는 대체 method가 생길 때까지 제외한다.
  - [ ] PDF text extraction과 page/range 근거를 지원하고, Assignment 전략을 재사용하는 Exam Skill을 추가한다.
  - [ ] Workspace-local 구조화 snapshot이 안정되면 `MarkdownProjection`, derived timeline, 학생 할 일 표면과 학기 상태 질의를 source of truth와 분리해 추가한다.
  - [ ] 학생에게 checkpoint, diff와 rollback 의미가 필요해지면 Git history를 이해하기 쉬운 `WorkspaceHistory` UI로 투영한다.
  - [ ] 실제 자료에서 필요성이 확인되면 HWP/HWPX parsing과 OCR을 추가한다.
  - [ ] 여러 workspace를 반복해서 바꾸는 사용 흐름이 확인되면 current chooser 경계에서 최근 workspace 목록과 명시적 전환 UX를 설계한다.
  - [ ] macOS packaged Desktop App을 채택하면 bundled native payload의 third-party notice를 감사하고 signing·notarization, atomic update/rollback과 clean-machine packaging smoke를 완료한다. Windows·Linux 지원은 별도 사용자 필요와 artifact·QA 범위를 승인한 뒤에만 추가한다.
  - [ ] Runtime·bridge diagnostic evidence를 제품 기록에 재사용하기 전에 제품용 allowlist, redaction과 retention 경계를 설계한다.
  - [ ] Native `TextInput`·`SkillInput` 조합으로 해결되지 않고 resource mention 필요성이 확인되면 `MentionInput`을 먼저 검증한다. 그 뒤에도 남는 구체적인 case에만 exact official SDK/native contract의 experimental context delivery, background terminal, realtime과 기타 raw capability를 별도로 검증한다.
  - [ ] 여러 학기에 걸친 사용에서 필요성이 확인되면 built-in Memories의 consent, eligibility, rollover와 reset UX를 설계한다.

## 현재 범위에서 제외하는 항목

다음 항목은 raw method가 존재하거나 기술적으로 가능하다는 이유만으로 백로그에 승격하지 않는다. 새로운 사용자 case와 완료 조건이 생기면 후속 capability로 다시 검토한다.

- 공식 Landing, public `npx`, Runtime publication, clean-machine release와 public repository publication 자동화. 2026-07-23까지의 계획과 구현 증거는 [public npx 첫 출시 Wayfinder](../wayfinding/public-npx-first-release/map.md)와 관련 Spec·ticket에 historical context로 보존한다.
- ACP adapter 또는 다른 Agent engine과의 동작 일치, 범용 engine 분류와 선택 UI
- API key 입력, external token host, device-code·Bedrock login과 여러 account 전환 UI
- 모든 App Server event를 제품에 노출하는 범용 event bus·router와 raw item의 1:1 UI 재현
- `SemesterWorkspace`·`Course`별 고정 Codex thread topology와 native Turn을 복제하는 별도 run ledger
- 외부 memory framework 또는 AY-PLE 전용 memory engine
- Codex UI와 동일한 Git diff·review, background terminal, Goals, plugin·MCP 관리 화면
- Raw prompt, JSON-RPC payload와 runtime·bridge 진단 evidence를 제품 감사 기록이나 `SemesterModel`의 source of truth로 사용하는 방식
- LMS login 자동화, cloud account·sync, 외부 calendar 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화
