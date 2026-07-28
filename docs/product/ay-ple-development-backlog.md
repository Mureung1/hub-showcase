# AY-PLE 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 분류 | 활성 |
| 성숙도 | 초안 |

## 문서 목적

이 문서는 AY-PLE의 실제 작업 순서와 완료 상태를 날짜 없는 Markdown task list로 관리한다. 초기 First Assignment에서 검증한 native action composition과 MCP round trip을 역사 근거로 보존하고, app-owned academic workflow는 user-owned Git SemesterWorkspace와 protocol-driven AY–App Interaction Layer로 교체한다. 과거 캠프 제출 일정과 당시 판단은 [과거 캠프 제출 백로그](../archive/2026-07-ay-ple-4-week-submission-backlog.md)에 역사 기록으로 보존한다.

제품 목표와 범위는 [AY-PLE Product Brief](ay-ple-product-brief.md), 도메인 용어는 [CONTEXT.md](../../CONTEXT.md), 양방향 AY↔App mapping은 [Interaction Layer 아키텍처](../architecture/ay-app-interaction-layer.md), 구현된 MCP 상세는 [InteractionCapability 아키텍처](../architecture/ay-app-interaction-capabilities.md)가 소유한다. Official SDK Runtime baseline은 [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), single maintained graph·no-alias 경계는 [ADR 0012](../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), current durable v2 보존 정책은 [ADR 0013](../adr/0013-adopt-product-only-public-surface-and-v2-store-compatibility-baseline.md), user-owned workspace는 [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md), pre-App Bootstrap owner는 [ADR 0020](../adr/0020-bootstrap-semester-workspaces-before-app-startup.md), 전체 Interaction Layer는 [ADR 0021](../adr/0021-adopt-a-protocol-driven-ay-app-interaction-layer.md), MCP InteractionCapability는 [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)을 따른다. Current account와 root 배치는 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md)가 소유한다. 제거한 app-owned workspace·public distribution·managed account 결정은 historical ADR 0014·0016·0017에 보존한다.

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

완료 항목은 당시 구현과 검증 증거를 보존한다. ADR 0018·0019·0021이 대체한 app-owned workspace·Recipe/Run·durable patch/confirmation을 current target contract로 다시 해석하지 않는다.

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

- [x] 역사적 구현 근거: 첫 Assignment vertical에 필요한 Codex runtime sufficiency를 증명한다.
  - [x] [Runtime sufficiency envelope](../wayfinding/codex-chat-application-foundation/tickets/004-first-assignment-runtime-envelope.md)에 따라 explicit first-vertical workspace root와 두 TXT `SourceSelection`으로 Skill 기반 `ModelingInvocation`을 실행해 `ModelingRun` receipt를 남기는 경로와, 같은 native Turn에서 `ModelingRun`과 독립적인 EvidenceRef 연결 Assignment `StatePatch`를 `propose_state_patch`로 제안해 exact Plan mode Review·`UserConfirmation`을 거쳐 다시 열 수 있는 `SemesterModel`로 반영하는 흐름의 observable runtime contract를 역산한다.
  - [x] Exact App Server·official SDK·first-party surface와 current `CodexChatRuntime`·Server·Browser tracer가 required outcome을 어디까지 소유하는지 확인하고, 일반 Chat capability를 requirement로 자동 승격하지 않는다.
  - [x] Additive `CodexProductCapableRuntime`이 native work 없는 Account Readiness, exact `SkillInput` 하나와 bounded `TextInput` 하나, Plan mode의 `auto_review + workspace_write`, curated Skill·Plan·`propose_state_patch` MCP·user-input activity와 opaque answer/cancel을 제공한다. Existing text tracer의 `deny_all + read_only`는 final cutover 전까지 유지한다.
  - [x] UI 없는 representative trace가 검증한 explicit `cwd`, exact `SkillInput`·selected source Markdown path를 담은 `TextInput`, native acceptance·terminal과 bounded failure settlement를 보존한다. Product action seam은 `propose_state_patch` MCP의 canonical input·stable patch result, exact Plan mode의 built-in `request_user_input` same-Turn request·answer와 opaque execution correlation을 함께 검증한다.
  - [x] Versioned fixture와 fresh isolated roots로 deterministic contract·exact actual-child gate를 반복해 current adapter가 product Browser vertical을 시작하기에 충분함을 증명했다. Complete Browser semantics를 요구하는 final exact/local/live product trace는 아래 제품 vertical의 후반 conformance gate가 소유하며, credential 부재는 pass·skip이 아니라 blocked로 보고한다.
  - [x] Account readiness, interrupt, process crash·restart, retry와 unknown outcome은 deterministic representative failure가 요구하는 범위에서 검증하고, 실제 child/provider conformance는 final conformance gate에 남긴다.
  - [x] Official Python SDK·ordered patches·Node supervision·Python bridge·네 Chat route와 fixed `deny_all + read_only` tracer를 `keep | adapt | replace | frozen limitation`으로 판정하고, official SDK와 supervised thin local-web integration을 product path로 유지한다.
  - [x] 제품 caller는 raw JSON-RPC, generated protocol type, secret과 bridge 내부 process 계약을 직접 사용하지 않으며, native execution state·Codex permission과 `ModelingRun`·Review·`UserConfirmation`의 학업 상태 소유권을 분리한다.

- [x] 역사적 구현 근거: 검증된 runtime seam 위에 AY-PLE 학업 제품 layer의 첫 수직 흐름을 완성한다.
  - [x] First Assignment vertical의 pre-public seam에서 명시적인 local path를 작업 root로 열고 `Course`를 식별한 뒤 같은 학기 상태를 다시 열 수 있으며 기존 사용자 파일을 임의로 바꾸지 않는다. 이 구현 증거는 임의 폴더를 canonical `SemesterWorkspace`로 채택하는 public admission 계약을 뜻하지 않는다.
  - [x] `RawMaterial`의 원본 또는 참조를 보존해 목록과 preview에 표시하고, 사용자가 다음 작업에 사용할 `SourceSelection`을 명시적으로 고를 수 있다.
  - [x] Versioned `ModelingRecipe`와 검증된 arguments, `SourceSelection`, 활성 workspace 맥락으로 일회성 `ModelingInvocation`을 만들고 native Codex input으로 번역하며, 각 실행 시도를 얇은 `ModelingRun` receipt로 남긴다. raw: `turn/start`.
  - [x] 첫 Assignment 작업이 호출한 좁은 `propose_state_patch` MCP의 canonical structured input을 검증해 필드별 `EvidenceRef`가 있는 독립 `StatePatch`로 제안하고, Review 전에는 `SemesterModel`의 확인된 값을 바꾸지 않는다.
  - [x] 사용자가 exact Plan mode의 built-in `request_user_input`을 통해 같은 native Turn에서 제안을 수락·수정 요청·거절할 수 있다. App은 exact active patch binding을 검증해 수락·거절만 settled `UserConfirmation`으로 기록하고 수락한 값만 확인된 `SemesterModel`에 반영하며, 수정 요청은 unsettled feedback으로 replacement patch Review를 이어간다.
  - [x] 이 proposal-only 제품 효과를 Codex `Sandbox.read_only`, network 차단이나 command/file approval과 동일시하지 않고, 실제 action에 필요한 native permission은 별도 설정·request 흐름으로 다룬다.
  - [x] Recipe rendering, Codex 실행, `StatePatch` proposal·evidence validation과 제품 상태 반영 실패를 구분해 원본과 확인된 상태를 손상하지 않는 재시도 행동을 제공한다.
  - [x] 대표 TXT 자료의 선택부터 `propose_state_patch` Assignment 제안, exact Plan mode의 built-in `request_user_input` same-Turn Review, settled confirmation과 새로고침 뒤 확인된 상태 조회까지 deterministic Browser E2E를 닫았다. Revision·recovery semantics 고정 뒤 exact actual-child·local-provider와 명시적 isolated auth·fresh roots를 쓴 live-provider product trace가 complete action을 수동 복구 없이 통과했고, 답변 전 Browser·Server/runtime continuity loss는 `interrupted`·no-apply·명시적 retry로 정산했다. Canonical product-only cutover와 current v2 first durable compatibility baseline도 확정했다.

- [x] 역사적 구현 근거: 첫 vertical이 요구한 product-bound companion interaction만 완성한다.
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

- [x] User-owned Git SemesterWorkspace에서 AY-originated InteractionCapability vertical을 완성한다.
  - [x] [InteractionCapability 기반 Semantic Review Spec](../specs/2026-07-27-interaction-capability-semantic-review.md)에 따라 app-neutral Review seam과 joint cutover를 완성한다.
    - [x] Current First Assignment의 MCP→Browser Review→same-Turn continuation을 characterization test로 고정하고, app-owned academic apply와 결합된 부분을 target contract로 승격하지 않는다.
    - [x] Private workspace package `@ay-ple/interaction-mcp`를 추가해 built STDIO executable, `InteractionCapability<Request, Result>` schema·codec와 authenticated Adapter↔Broker transport contract를 소유하게 한다. `apps/server`는 package의 server-side Interface로 production Broker·Browser Adapter를 조합하고 in-memory Adapter로 exact binding, correlation, held lifecycle status, generation별 단일 pending slot, once-only answer, Turn interrupt·disconnect·terminal MCP failure settlement를 독립 검증한다.
    - [x] `@ay-ple/codex-chat-runtime`은 bounded generic child environment 전달과 bounded effective native config projection만 제공하고 `@ay-ple/interaction-mcp`, capability schema, Broker lifecycle과 live MCP health에 의존하지 않게 한다. Browser는 계속 `@ay-ple/product-contract`만 사용하고 raw MCP·private transport를 받지 않는다.
    - [x] Browser API와 같은 pre-bound loopback HTTP listener에 Server-private Broker route를 두고 Workspace Runtime generation마다 fresh token·opaque binding을 발급한다. Loopback peer·constant-time token·active binding을 모두 검사하고 route·credential을 Browser contract와 log에서 제외하며 별도 listener·port·daemon, WebSocket과 Unix domain socket을 만들지 않는다.
    - [x] Adapter startup은 authenticated handshake 뒤 Broker가 accept하는 한 held lifecycle channel을 열어야 initialize를 성공시킨다. 이후 capability call 하나는 Broker HTTP POST 하나로 유지해 Browser의 once-only result를 같은 MCP call에 반환한다. Runtime generation마다 pending slot 하나만 두고 후속 authenticated request는 Browser projection·queue·preemption 없이 즉시 `busy` MCP error로 끝낸다. Unexpected lifecycle EOF·Adapter HTTP abort·STDIO EOF, Turn interrupt와 MCP·Browser·Runtime interruption은 정상 result가 아닌 MCP failure path로 terminal 정산하고, duplicate·late answer, `202`+poll, callback, durable outbox·response replay를 만들지 않으며 delivery ambiguity를 성공이나 workspace apply로 추정하지 않는다. Expected Runtime replacement·App shutdown은 lifecycle loss로 오인하지 않는다.
    - [x] `propose_state_patch` input에서 caller-supplied `requestKey`, workspace·Course identity, store revision과 native identity를 제거하고, 설명·순서 있는 semantic before/after change·선택적 evidence만 받는 도메인 중립 capability contract로 축소한다. Assignment schema와 raw Git diff를 공개 contract에 넣지 않는다.
    - [x] `hub/skills/ay-ple-first-assignment/`에 actual file read, pre-mutation Review, result 해석과 AY-owned next action을 지시하는 built-in Skill source를 만든다. Workspace 설치·update는 lifecycle Spec이 소유한다.
    - [x] Optional `EvidenceRef`를 active Runtime binding의 exact SemesterWorkspace에서 workspace-relative path로만 on-demand resolve한다. Root containment·regular file·bounded read·exact digest·locator를 Browser projection 전에 atomic preflight하고 하나라도 invalid면 partial card 없이 MCP call 전체를 실패시킨다. Browser에는 bounded safe projection만 전달하고 `RawMaterial` registry, source copy·reusable cache·snapshot과 durable evidence history를 만들지 않는다.
    - [x] Review UI를 AY Chat transcript의 inline card 하나로 표시하고 pending 동안 composer·새 Turn·steer를 잠근다. Card에는 `accept | revise | reject`와 optional feedback만 두어 custom MCP call 하나의 closed normal result로 반환하고, 전체 Turn interrupt만 별도 native control로 유지한다. Settled card는 control 없는 read-only outcome으로 남기고 `revise` 뒤 fresh proposal은 새 call·새 card로 append하며 이전 card를 교체·reopen하지 않는다. Modal·별도 approval page·card dismiss·입력 queue와 App-owned settled Review ledger를 만들지 않으며 interrupt, `busy`, timeout, disconnect와 Runtime terminal은 네 번째 `cancel` result가 아니라 MCP failure path로 끝내고, 같은 결정을 built-in `request_user_input`에 다시 걸지 않는다.
    - [x] Interaction result 뒤 App은 accepted result를 대신 적용하지 않고 AY가 같은 Turn에서 actual file action을 소유하게 한다.
    - [x] App-owned `Course`, material registry·copy·snapshot·refresh mutation·durable selection, old First Assignment route/retry, `RawMaterial`, `ModelingRecipe`·`ModelingInvocation`·durable `ModelingRun`, durable `StatePatch`·`UserConfirmation`과 revision-bound academic apply transaction을 current product contract와 persistence에서 제거한다. 이 contraction은 active SemesterWorkspace의 read-only source explorer·preview나 ADR 0021의 새 typed ActionInvocation을 영구 거절한다는 뜻이 아니다.
    - [x] 과잉 Chat-only contraction을 교정해 exact active root의 bounded source list·text/PDF preview와 3-pane explorer·preview·AY Chat workbench를 복구했다. App-owned material authority와 old academic workflow는 복구하지 않았고 실제 2학년 1학기 workspace에서 folder-relative 자료 목록, 63-page PDF 렌더링과 Chat 공존을 검증했다.
    - [x] Capability contract test, deterministic Browser E2E와 exact local-provider trace로 inline card pending 중 composer·새 Turn·steer가 닫히고 accept·revise·reject만 정상 result이며 Adapter abort·STDIO EOF, Turn interrupt·disconnect·timeout·Runtime terminal과 concurrent request의 `busy`는 MCP failure임을 고정한다. Valid evidence 전체가 한 card에 투영되고 path escape·missing·oversized·digest/locator drift가 Browser projection 전에 whole-call failure가 되는지 검증한다. Settled card의 control이 사라지고 revise→fresh call이 기존 card mutation 없이 새 card를 append하는지, partial Review·Modal·별도 page·card dismiss·App Review ledger·허위 apply·duplicate result·숨은 queue가 없는지도 검증한다.
  - [x] [User-owned SemesterWorkspace lifecycle과 canonical local roots Spec](../specs/2026-07-27-user-owned-semester-workspace-lifecycle.md)에 따라 pre-App Bootstrap, prepared-root startup과 Git authority를 완성한다.
    - [x] Canonical `hub/`, sibling `../.ay-ple/`, global Codex home와 optional external workspace root를 분리하고 verified Runtime·controlled state를 external appData에서 시작한다.
    - [x] Root v4 identity codec과 durable `WorkspaceRegistry` v1 CAS·fresh reopen seam을 canonical prepared-workspace startup에 연결했다.
    - [x] Process-local `ProductOperationCoordinator`가 product Turn을 non-preemptive하게 admit하고 native terminal·completed Runtime close만 release authority가 되게 했다. Candidate/bootstrap union과 `workspace_init` eligibility는 ADR 0020 정정에 따라 제거하고 generic coordinator만 유지했다.
    - [x] App-owned Bootstrap Runtime, `BootstrapCandidate`, init Product Turn과 candidate route/UI를 target contract에서 제거하고 generic coordinator survivor만 유지한다.
    - [x] Runtime의 fixed `project_root_markers=[]`와 process-wide managed Skill override를 제거하고, exact Git root의 native project config·`AGENTS.md`·Skill discovery를 사용한다. Persistent Runtime과 context probe가 같은 effective project boundary를 관측하고 hostile ancestor를 넘지 않는지 검증한다.
    - [x] Initial Bootstrap Skill은 repository 개발 harness와 함께 `hub/.agents/skills/`에 두고 사용자가 App 실행 전 Codex CLI 같은 native client에서 직접 실행한다. Skill이 Git, 최소 root files와 선택한 `hub/skills/` source의 workspace-local `.agents/skills/` copy를 준비하며 App Runtime과 SDK permission profile은 이 실행을 소유하지 않는다.
    - [x] Native Bootstrap이 exact SemesterWorkspace root에서 built Adapter까지 계산한 relative command와 Interaction Spec 소유의 env 이름·capability allowlist·`required = true` declaration을 `.codex/config.toml`에 no-clobber로 설치한다. MCP server `args`·`cwd`·`tool_timeout_sec`·static `env`·`disabled_tools`는 비워 두고 endpoint·token·binding value는 App이 child environment로만 공급한다. Startup은 effective `command`·`args`·`env_vars`·`cwd`·`tool_timeout_sec`·static `env`·`enabled`·`required`·`enabled_tools` 전체가 이 contract와 exact match하고 `disabled_tools=[]`인지 확인한다.
    - [x] Current pinned local STDIO launcher가 server `cwd` 미지정 시 exact Workspace Runtime `cwd`에서 relative command를 resolve하는 동작을 regression test로 고정한다. Absolute user path, `npx`·global install과 appData Adapter copy를 만들지 않고, root 이동 시 Bootstrap Update가 path를 재계산해 Git checkpoint를 남긴다.
    - [x] 첫 open·학기 변경은 launch-time `--workspace <absolute-prepared-git-root>`, 이후 실행은 registry active pointer로 root를 resolve한다. Explicit root와 valid pointer가 모두 없으면 Browser·Runtime을 열지 않고 actionable error로 fail closed한다.
    - [x] Shared listener와 Interaction Broker 준비 뒤에만 exact-root Workspace Runtime을 spawn한다. Native thread start가 trust·project config reload를 성립시킨 뒤 exact effective declaration과 actual Adapter의 authenticated held lifecycle readiness를 확인하고, Broker의 synchronous loss latch가 닫히지 않았을 때만 active registry pointer를 commit한다. Runtime에는 `waitForMcpServerReady`, official status polling과 1초 monitor를 두지 않으며 Broker 준비·Runtime start·declaration·Adapter lifecycle 또는 ignored project config failure를 MCP 없는 degraded AY-PLE mode로 낮추지 않는다.
    - [x] Current pinned App Server에서 exact Git-root `cwd`와 standard `workspace-write` thread start가 unset trust를 native user config에 기록하고 같은 start에서 project MCP를 reload하며, explicit `untrusted`와 parent-only trust를 덮어쓰거나 상속하지 않는지 regression test로 고정한다. Readiness를 통과한 이 startup thread를 정상 Product Turn에도 재사용해 별도 health-only thread와 두 번째 Product thread를 만들지 않는다.
    - [x] Native Bootstrap과 AY가 actual file을 직접 변경하고 의미 있는 checkpoint에서 Git commit하게 한다. App은 Git command를 실행하거나 clean working tree를 startup 선행조건으로 요구하지 않고 additional `writableRoots` SDK patch도 만들지 않는다.
    - [x] Runtime payload·`WorkspaceRegistry`·cache·temp와 cross-workspace 운영 metadata·config는 `../.ay-ple/`에 둔다. Pending product operation·InteractionCapability와 Broker-owned Adapter lifecycle status는 workspace별 durable file을 만들지 않고 process-local Runtime generation memory에서 terminal 정산하며, restart 뒤 결과를 추정하지 않는다.
    - [x] 새 canonical layout의 Runtime·global Codex account·active workspace·InteractionCapability smoke가 성공한 뒤에만 legacy dogfood appData, managed development workspace와 package-local Runtime artifact를 scoped cleanup한다.

- [x] Protocol-driven AY–App Interaction Layer의 첫 ActionInvocation을 end-to-end로 완성한다.
  - [x] `AY–App Interaction`, `ActionInvocation`과 AY-originated `InteractionCapability`를 구분하고 Skill·MCP를 양방향 제품 확장 protocol로 사용하는 ADR·아키텍처·Product Brief를 채택했다.
  - [x] Chat과 분리된 closed ActionInvocation contract를 만들고 unknown action, raw Skill/native input, absolute path와 implicit Chat material 결합을 거절한다. App action definition은 active SemesterWorkspace의 request-scoped file reference를 fresh 검증하고 expected workspace-local Skill을 effective catalog에서 resolve한다.
  - [x] `organize_sources`를 첫 action으로 연결한다. Source explorer에서 preview kind와 독립적인 safe regular-file multi-selection과 action control을 제공하되 preview·selection 자체는 Turn을 시작하지 않고, action 실행 시에만 선택을 동결해 기존 Product operation stream에 연결한다.
  - [x] Capability-neutral Runtime 입력과 Python bridge가 optional Skill과 current file-reference text를 전달하게 하고 기존 SDK patch stack은 늘리지 않았다. Exact native mapping과 `MentionInput` 경계는 [AY–App Interaction Layer](../architecture/ay-app-interaction-layer.md)가 소유한다.
  - [x] Action-started Turn이 기존 Interaction MCP·inline Review를 그대로 사용하고, AY가 actual workspace file mutation과 Git checkpoint를 소유하는 Browser E2E·deterministic Runtime·exact local-provider actual workspace trace를 닫는다. Durable `ModelingRun`, source registry·copy와 App-owned apply는 복원하지 않는다.

- [x] Fresh built-in Skill catalog와 SemesterModeling vocabulary를 current product path에 반영한다.
  - [x] Workspace mutation 전에 `hub/skills/`의 complete catalog를 generic하게 발견하고 [Runtime 격리 문서의 minimal catalog contract](../architecture/codex-runtime-isolation.md#minimal-catalog-validation-contract)로 검증한다. Invalid Skill root가 하나라도 있으면 valid subset이나 다른 managed file을 쓰지 않은 채 전체 Bootstrap을 fail closed한다. 검증된 모든 complete Skill root는 descendant layout과 content를 해석하지 않고 fresh SemesterWorkspace의 `.agents/skills/`에 복사한다. Existing divergent destination은 원본을 보존한 채 no-clobber로 중단하며 refresh·replace·merge·stale prune과 별도 content lint를 추가하지 않는다. App startup은 source roster·bytes를 다시 대조하지 않고, missing required Skill은 해당 ActionInvocation만 `action_unavailable`로 닫으며 normal Chat·source explorer를 유지한다.
  - [x] `ay-ple-first-assignment` source와 installed fixture identity를 model-invoked `ay-ple-semester-modeling`으로 rename하고, Skill body를 특정 첫 Assignment가 아니라 Course·Assignment·Exam·ScheduleEvent 학업 사실을 root `workspace-state.json.snapshot`의 `SemesterModel` slot에 incremental하게 reconcile하는 workflow로 확장한다. `SemesterWorkspaceState` envelope identity와 작업에 무관한 기존 사실을 보존하고, conflict는 hidden overwrite보다 `ambiguous`·설명·근거와 Review로 드러내는 guardrail을 둔다. Source 신뢰도·최신성·관련 범위는 AY가 실제 문맥에서 판단하며 exhaustive merge policy를 만들지 않는다. Explicit file refs가 있으면 작업 맥락으로 활용하고, 없으면 대화·SemesterWorkspace 문맥에서 자연스럽게 범위를 정한다. Action marker·file arguments를 required signature로 파싱하거나 부재만으로 종료·clarification하는 guard를 만들지 않는다. Snapshot mutation 전 `propose_state_patch`와 result별 행동은 Skill·tool description으로 harness하고 representative conformance로 검증하되 Hook, write interceptor나 App-owned diff ledger를 추가하지 않는다.
  - [x] 기존 `organize_sources` public discriminator·Product contract, Server action module file·export·wiring, Browser 호출·control copy, native input marker, package README·구현 지도와 verification fixture를 adopted `model_semester`로 함께 rename한다. `model-semester-action` definition 한 곳이 required `ay-ple-semester-modeling` identity를 소유하고 별도 generic Skill registry나 공용 action→Skill mapping Module은 만들지 않는다. External compatibility contract가 없는 development 단계이므로 old action·Skill alias를 남기지 않는다. `First Assignment`가 실제 대표 시나리오를 뜻하는 conformance provider와 완료·역사 문서는 당시 이름을 보존한다.
  - [x] `hub/skills/` 변경·추가·rename 뒤 `../fixtures/**`에서 disposable SemesterWorkspace를 재생성하고 Bootstrap을 fresh 실행하는 development flow를 검증한다. Git 밖 fixture path를 tracked utility에 hard-code하지 않는다.

- [ ] 확인된 사용자 필요에 따라 나머지 post-Ready capability를 순서대로 추가한다.
  - [ ] 두 번째 실제 action 또는 MCP capability를 추가할 때 기능별 contract만 더하고 workspace binding·Turn lifecycle·nested interaction settlement를 다시 구현하지 않는 extension test를 고정한다.
  - [ ] 여러 대화를 다시 찾고 이어가는 행동이 확인되면 workspace-scoped `thread/list`·`thread/read`·`thread/resume`, 선택 상태와 최소 catalog UX를 추가한다. Rename·archive·pagination은 각각의 need가 있을 때만 포함한다.
  - [ ] Accepted work의 Browser disconnect가 실제 product journey를 막으면 native status·read를 우선 사용해 honest unknown-outcome 또는 rejoin을 추가한다. Snapshot·cursor·replay journal은 관찰된 gap 없이는 만들지 않는다.
  - [ ] 같은 local companion을 여러 Browser client가 동시에 제어해야 하는 사용 흐름이 확인되면 client ownership·isolation을 별도 capability로 검증한다.
  - [ ] 채택한 Plan mode의 built-in `request_user_input` 외에 실제 command·file·network·다른 additional-input request가 발생하면 해당 native request family와 first-party behavior를 먼저 흡수하고 필요한 policy·UI만 추가한다.
  - [ ] Account plan, rate limit, token usage나 model 상태가 사용자 action에 실제로 필요해지면 읽기 전용 status surface를 추가한다.
  - [x] 개인 사용에서 확인된 Model 선택 필요에 따라 Browser-session→다음 Product Turn 경계의 설정 UX를 추가했다. Official `model/list`의 visible catalog와 advertised reasoning effort 순서를 사용하고 지원 모델에만 Fast를 노출하며 current normal Chat이 같은 선택을 재사용한다. 새로고침은 catalog default로 돌아가고 `config/read`·`config/value/write`나 전역 `config.toml` mutation은 도입하지 않았다. Future ActionInvocation도 별도 설정 저장소 없이 이 Turn 설정 contract를 재사용한다.
  - [ ] 즉시 정정이 새 turn보다 나은 대표 case와 correlation 규칙을 확인하면 active turn 정정 UX를 추가한다. raw 후보: `turn/steer`.
  - [ ] 실제 context 부족이나 history 편집 case를 확인하면 manual compact와 fork를 각각 평가한다. raw 후보: `thread/compact/start`, `thread/fork`. Deprecated `thread/rollback`은 지원되는 대체 method가 생길 때까지 제외한다.
  - [ ] PDF text extraction과 page/range 근거를 지원하고, Assignment 전략을 재사용하는 Exam Skill을 추가한다.
  - [ ] 대표 Assignment·Exam SemesterModeling 사례에서 required·optional field와 `known | unknown | ambiguous` guardrail을 포함한 exact `SemesterModel` schema를 정한다. 실제 App·Skill consumer가 생기면 `workspace-state.json.snapshot`을 validated model로 확장하고, Skill lifecycle과 독립된 product-owned Module의 lint Interface와 workspace-level CLI Adapter를 평가하되 package ownership·migration을 미리 고정하지 않는다.
  - [ ] 실제 사용자가 한 SemesterWorkspace를 장기 보존하면서 새 AY-PLE built-in Skill을 받아야 할 때 update adoption gate를 다시 연다. 그 전에는 disposable fixture→fresh Bootstrap을 사용하고 refresh·replace mode, local edit merge, stale Skill prune, hash manifest·lock·bundle version과 기존 workspace migration을 만들지 않는다.
  - [ ] Workspace-local 구조화 snapshot이 안정되면 `MarkdownProjection`, derived timeline, 학생 할 일 표면과 학기 상태 질의를 source of truth와 분리해 추가한다.
  - [ ] 학생에게 checkpoint, diff와 rollback 의미가 필요해지면 Git history를 이해하기 쉬운 `WorkspaceHistory` UI로 투영한다.
  - [ ] 실제 자료에서 필요성이 확인되면 HWP/HWPX parsing과 OCR을 추가한다.
  - [ ] 여러 workspace를 반복해서 바꾸는 사용 흐름이 확인되면 launch-time handoff와 registry 경계 위에서 최근 workspace 목록과 one-click 전환 UX를 별도 설계한다.
  - [ ] macOS packaged Desktop App을 채택하면 bundled native payload의 third-party notice를 감사하고 signing·notarization, atomic update/rollback과 clean-machine packaging smoke를 완료한다. Windows·Linux 지원은 별도 사용자 필요와 artifact·QA 범위를 승인한 뒤에만 추가한다.
  - [ ] Runtime·bridge diagnostic evidence를 제품 기록에 재사용하기 전에 제품용 allowlist, redaction과 retention 경계를 설계한다.
  - [ ] ActionInvocation의 Markdown current-path carrier가 부족한 실제 case가 확인되면 먼저 필요한 보장—content version, byte delivery, reader access 또는 다른 resource identity—을 구체화한다. 그 보장에 맞는 official carrier만 검증하고 generic local file carrier가 아닌 `MentionInput`을 기본 대안으로 가정하지 않는다. Experimental context delivery, background terminal, realtime과 기타 raw capability도 각각 별도 사용자 case가 생길 때만 검증한다.
  - [ ] 여러 학기에 걸친 사용에서 필요성이 확인되면 built-in Memories의 consent, eligibility, rollover와 reset UX를 설계한다.

## 현재 범위에서 제외하는 항목

다음 항목은 raw method가 존재하거나 기술적으로 가능하다는 이유만으로 백로그에 승격하지 않는다. 새로운 사용자 case와 완료 조건이 생기면 후속 capability로 다시 검토한다.

- 공식 Landing, public `npx`, Runtime publication, clean-machine release와 public repository publication 자동화. 2026-07-23까지의 계획과 구현 증거는 [public npx 첫 출시 Wayfinder](../wayfinding/public-npx-first-release/map.md)와 관련 Spec·ticket에 historical context로 보존한다.
- ACP adapter 또는 다른 Agent engine과의 동작 일치, 범용 engine 분류와 선택 UI
- API key 입력, external token host, device-code·Bedrock login과 여러 account 전환 UI
- 모든 App Server event를 제품에 노출하는 범용 event bus·router와 raw item의 1:1 UI 재현
- `SemesterWorkspace`·`Course`별 고정 Codex thread topology와 native Turn을 복제하는 별도 run ledger
- 외부 memory framework 또는 AY-PLE 전용 memory engine
- Codex UI와 동일한 Git diff·review, background terminal, Goals와 MCP 관리 화면
- Raw prompt, JSON-RPC payload와 runtime·bridge 진단 evidence를 제품 감사 기록이나 `SemesterModel`의 source of truth로 사용하는 방식
- LMS login 자동화, cloud account·sync, 외부 calendar 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화
