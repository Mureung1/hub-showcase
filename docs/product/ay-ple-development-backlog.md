# AY-PLE 개발 백로그

| 항목 | 내용 |
| --- | --- |
| 분류 | 활성 |
| 성숙도 | 초안 |

## 문서 목적

이 문서는 AY-PLE의 실제 작업 순서와 완료 상태를 날짜 없는 Markdown task list로 관리한다. 먼저 일반적인 Codex 사용 흐름에 준하는 웹 제품 기반을 닫고, 그 위에 AY-PLE의 학업 제품 기능을 올린다. 과거 캠프 제출 일정과 당시 판단은 [과거 캠프 제출 백로그](../archive/2026-07-ay-ple-4-week-submission-backlog.md)에 역사 기록으로 보존한다.

제품 목표와 범위는 [AY-PLE Product Brief](ay-ple-product-brief.md), 도메인 용어는 [CONTEXT.md](../../CONTEXT.md), 제품 작업의 Codex mapping은 [Codex-native product composition](../architecture/codex-native-product-composition.md)이 소유한다. Codex Chat Shell의 runtime baseline은 [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), macOS-first local web app 경계는 [ADR 0009](../adr/0009-use-a-macos-first-local-web-app-product-path.md)를 따른다. 이 백로그는 해당 결정들을 다시 정의하지 않고 구현 순서와 완료 조건만 관리한다.

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

- [x] 제품·Runtime 기반을 준비한다.
  - [x] 제품 문제, 핵심 사용자와 MVP 경계를 [Product Brief](ay-ple-product-brief.md)로 정리하고, 자료 선택부터 Review까지의 사용자 흐름을 [prototype scenario](ay-ple-review-workspace-scenario.md)로 검증했다.
  - [x] App Server package, app data와 사용자 workspace의 소유 경계를 분리하고 pinned Codex protocol을 제품 계약 밖에 격리했다. 근거: [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md).
  - [x] Fake/Codex adapter가 같은 Runtime Kernel 계약으로 실행, streaming, 취소와 실패를 표현하고 결정적 contract test를 통과한다. 근거: [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md).
  - [x] HTTP/SSE Runtime Inspector에서 실제 browser를 통과해 단일 run lifecycle을 진단할 수 있다.
  - [x] Runtime Diagnostic History가 checkpoint, interrupted-run recovery, retention과 persistence failure를 처리하며 제품 상태와 분리되어 있다.
  - [x] 제품 작업의 `ModelingRecipe → ModelingInvocation → ModelingRun` 조합과 official Python SDK direct reuse 기반 Chat Shell을 서로 다른 결정으로 채택했다. 근거: [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md), [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md).
  - [x] 첫 제품 경로를 macOS-first local web app으로 한정하고 active runtime source와 package fixture의 Windows compatibility branch를 제거했다. 근거: [ADR 0009](../adr/0009-use-a-macos-first-local-web-app-product-path.md).

- [x] App Server raw method의 존재와 AY-PLE의 채택 판단을 빠짐없이 볼 수 있게 한다.
  - [x] Pinned stable schema와 별도 experimental schema에서 client request, client notification, server request와 server notification method를 전부 추출해 [method inventory](../architecture/codex-app-server-method-inventory.md)에 표시한다.
  - [x] [Sparse decision JSON](../../packages/runtime-codex/codex-method-decisions.json)은 검토한 method의 integration, adoption과 note만 소유하고, 미기록 method는 `schema-only / unreviewed`로 표시한다.
  - [x] [Renderer](../../packages/runtime-codex/scripts/render-codex-app-server-methods.ts)가 raw schema와 decision JSON을 합쳐 결정적인 Markdown을 만들고, 존재하지 않는 method와 허용하지 않은 decision 값을 오류로 거부한다.
  - [x] Pinned Codex version을 바꿔 다시 생성하면 새 method와 사라진 method가 inventory에서 드러나며, runtime capability abstraction이나 수동 전체 method registry를 추가하지 않아도 된다.

- [ ] Official SDK 기반 Codex-native Chat Shell의 첫 수직 흐름을 완성한다.
  - [x] Official source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`과 direct reuse 결정을 채택하고, 격리 prototype `prototype/codex-python-sdk-reuse@3b3fa9e0`으로 native identity·stream, same-thread turn, interrupt와 close 가능성을 확인했다.
  - [x] Official generated model과 `api.py` generated block, Python SDK/runtime dependency를 exact `0.144.4`에 맞춘 reproducible package baseline으로 만들고 public signature drift, Apache-2.0 provenance와 artifact lock을 검증한다. 같은 tracer의 exact actual-child fake는 AgentMessage event와 `turn/completed`를 `turn/start` response보다 먼저 보내 현재 terminal 유실을 재현하되 deadline과 process-tree cleanup으로 영구 대기를 막는다.
  - [x] 확인된 early-terminal blocker를 upstream fix 또는 최소 router patch로 고쳐 FIFO·once-only terminal을 official suite와 response-last fake에서 증명한다.
  - [x] Python SDK의 login, active/pending turn과 global notification queue에 package-private item·payload bound를 두고 stalled consumer나 burst overflow를 silent drop 없이 bridge terminal과 cleanup으로 정산한다.
  - [ ] Native thread·turn·item identity와 stream을 보존하는 supervised Node↔Python bridge를 만들고 deadline, bounded queue, crash settlement와 child-of-child close/reap을 검증한다.
  - [ ] Server의 browser-safe session·stream endpoint와 데스크톱 Chat UI를 연결해 native thread 생성, text turn, AgentMessage streaming과 authoritative terminal·error를 표시한다.
  - [ ] 진행 중 turn interrupt, 같은 thread의 후속 turn과 deterministic bridge close를 end-to-end로 검증한다.
  - [ ] Exact fake와 root test·typecheck·build·Inspector lint를 통과시키고, disposable auth/provider가 준비된 경우에만 live gate를 실행해 blocked와 green을 구분한다.
  - [ ] 새 Chat Shell이 green이 된 뒤 별도 cutover checkpoint에서 현재 Runtime Harness와 legacy Host의 교체·제거 범위를 결정한다.

- [ ] 검증된 Chat Shell 위의 AY-PLE 제품 adapter를 별도 제품 goal로 결정한다.
  - [ ] Chat Shell이 실제로 구현·검증된 뒤 browser-safe command·streaming Interface와 제품별 recovery·approval 정책을 결정한다.
  - [ ] 제품 caller는 raw JSON-RPC, generated protocol type, secret과 bridge 내부 process 계약을 직접 사용하지 않는다.
  - [ ] Runtime Inspector는 개발자용 단일 run 진단 도구로 유지되고 제품 session 상태나 transcript를 소유하지 않는다.

- [ ] Account와 활성 workspace를 준비한다.
  - [ ] 비어 있는 app data에서 현재 인증 상태를 확인하고 ChatGPT managed browser login을 완료한 뒤 첫 대화를 시작할 수 있다. raw: `account/read`, `account/login/start`, `account/login/completed`, `account/updated`.
  - [ ] 진행 중인 login을 취소하거나 logout할 수 있고, 실패·만료 시 재인증 행동을 안내한다. raw: `account/login/cancel`, `account/logout`, `account/login/completed`, `error`.
  - [ ] 사용자가 하나의 local folder를 활성 workspace로 명시적으로 열며, 제품 경로가 `process.cwd()`를 암묵적 workspace fallback으로 사용하지 않는다.
  - [ ] 대화 목록은 활성 workspace의 `cwd`로 제한되어 다른 workspace의 thread와 섞이지 않는다. raw: `thread/list`.

- [ ] Conversation workspace에서 일반적인 Codex session lifecycle을 사용할 수 있게 한다.
  - [ ] 활성 workspace에서 새 대화를 만들고 목록에서 선택할 수 있으며 thread 상태 변화가 즉시 반영된다. raw: `thread/start`, `thread/list`, `thread/started`, `thread/status/changed`.
  - [ ] 기존 대화를 열면 저장된 turns를 읽어 transcript를 복원하고 새 turn을 이어갈 수 있다. raw: `thread/read`, `thread/resume`, `turn/start`.
  - [ ] 같은 thread에 여러 `turn/start`를 보내 multi-turn 문맥을 유지하고, 각 turn의 시작·완료·중단·실패 상태를 구분한다. raw: `turn/start`, `turn/started`, `turn/completed`, `error`.
  - [ ] 실행 중이거나 완료된 다른 대화로 전환했다가 돌아와도 선택 상태, transcript와 진행 중 activity가 올바른 thread에 표시된다. raw: `thread/list`, `thread/read`, `thread/resume`, `thread/status/changed`.
  - [ ] 대화 이름을 바꾸고 archive하면 목록과 현재 선택이 일관되게 갱신된다. raw: `thread/name/set`, `thread/name/updated`, `thread/archive`, `thread/archived`.

- [ ] 사용자가 Agent의 작업을 이해하고 안전하게 개입할 수 있게 한다.
  - [ ] Live event와 `thread/read` 복원 결과를 같은 transcript 계약으로 정규화해 사용자 메시지, Agent 응답과 turn lifecycle을 일관되게 표시한다. raw: `item/agentMessage/delta`, `item/started`, `item/completed`, `turn/started`, `turn/completed`.
  - [ ] Command, file change, tool·MCP call과 plan의 핵심 진행 상태를 요약 activity card로 표시하고, 필요한 상세만 펼쳐볼 수 있다. Raw JSON-RPC, debug log, hidden reasoning과 모든 terminal byte는 제품 transcript에 넣지 않는다. raw: `item/commandExecution/outputDelta`, `item/fileChange/patchUpdated`, `item/mcpToolCall/progress`, `turn/plan/updated`, `item/plan/delta`.
  - [ ] Command·file·permission approval과 추가 입력 요청을 원래 request identity로 응답하며, 대기 중인 사용자 행동을 transcript에서 놓치지 않는다. raw: `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/requestUserInput`, `serverRequest/resolved`.
  - [ ] 진행 중인 turn을 중단하면 정확한 thread·turn에 요청이 전달되고 transcript가 중단 terminal 상태로 수렴한다. raw: `turn/interrupt`, `turn/completed`.
  - [ ] 인증, 연결, 실행과 validation 실패를 구분해 warning·error와 가능한 recovery action을 보여주며 확인된 제품 상태를 손상하지 않는다. raw: `warning`, `configWarning`, `error`.

- [ ] 기본 운영 상태를 과하지 않은 toolbar로 제공한다.
  - [ ] 현재 model, thread 실행 상태, 인증과 runtime 연결 상태를 한눈에 확인할 수 있다. raw: `model/list`, `thread/status/changed`, `account/read`, `account/updated`.
  - [ ] 현재 turn과 thread의 token usage 및 model context window 사용률을 표시하고 새 usage event가 오면 갱신한다. raw: `thread/tokenUsage/updated`, `model/list`.
  - [ ] Account plan, rate-limit 사용률과 reset 시점을 표시하고 notification의 부분 갱신을 기존 값에 안전하게 합친다. raw: `account/read`, `account/rateLimits/read`, `account/rateLimits/updated`.
  - [ ] Baseline toolbar는 상태를 읽기 전용으로 정확히 표시하며 model, reasoning effort, service tier, permission과 compact를 임의로 변경하지 않는다.

- [ ] Codex Chat Shell을 복구 가능한 제품 흐름으로 검증한다.
  - [ ] Browser 새로고침 뒤 활성 workspace, 선택한 thread와 transcript를 복원해 같은 대화에 새 turn을 보낼 수 있다. raw: `thread/list`, `thread/read`, `thread/resume`, `turn/start`.
  - [ ] App Server process가 종료된 뒤 같은 app data로 재시작해 기존 thread를 resume하고, 복구할 수 없는 상태는 사용자에게 명확히 알린다. raw: `thread/list`, `thread/read`, `thread/resume`.
  - [ ] Fake 기반 browser E2E가 빈 app data의 login부터 workspace 선택, 대화 생성·전환, multi-turn, interrupt와 기본 status 표시까지 결정적으로 통과한다.
  - [ ] Pinned Codex를 사용한 선택 실행 smoke가 login된 환경에서 기존 대화 resume, multi-turn streaming과 하나 이상의 안전한 Agent interaction을 실제 App Server로 확인한다.

- [ ] Codex Chat Shell 위에 AY-PLE 학업 제품 layer의 첫 수직 흐름을 완성한다.
  - [ ] 사용자가 명시적인 local path를 `SemesterWorkspace`로 열고 `Course`를 식별한 뒤 같은 학기 상태를 다시 열 수 있으며 기존 사용자 파일을 임의로 바꾸지 않는다.
  - [ ] `RawMaterial`의 원본 또는 참조를 보존해 목록과 preview에 표시하고, 사용자가 다음 작업에 사용할 `SourceSelection`을 명시적으로 고를 수 있다.
  - [ ] Versioned `ModelingRecipe`와 검증된 arguments, `SourceSelection`, 활성 workspace 맥락으로 일회성 `ModelingInvocation`을 만들고 native Codex input으로 번역하며, 각 실행 시도를 얇은 `ModelingRun` receipt로 남긴다. raw: `turn/start`.
  - [ ] 첫 Assignment 작업의 구조화 결과를 검증해 필드별 `EvidenceRef`가 있는 `StatePatch`로 제안하고, Review 전에는 `SemesterModel`의 확인된 값을 바꾸지 않는다.
  - [ ] 사용자가 Review에서 제안을 수락·수정·거절할 수 있고, `UserConfirmation`을 거친 값만 확인된 `SemesterModel`에 반영하며 새 제안이 이전 확인 기록을 덮어쓰지 않는다.
  - [ ] Recipe rendering, Codex 실행, output validation과 제품 상태 반영 실패를 구분해 원본과 확인된 상태를 손상하지 않는 재시도 행동을 제공한다.
  - [ ] 대표 TXT 자료의 선택부터 Assignment 제안, Review, 새로고침 뒤 확인된 상태 조회까지 browser E2E와 실제 Codex smoke를 통과한다.

- [ ] 확인된 사용자 필요에 따라 후속 capability를 순서대로 추가한다.
  - [ ] Model 선택이 실제 작업에 필요해지면 app·thread·turn 중 설정 소유 범위를 먼저 정하고 model 변경 UX를 추가한다. reasoning effort와 service tier 변경은 같은 설정 경계를 재사용할 수 있을 때 함께 검토한다. raw 후보: `model/list`, `config/read`, `config/value/write`.
  - [ ] 즉시 정정이 새 turn보다 나은 대표 case와 correlation 규칙을 확인하면 active turn 정정 UX를 추가한다. raw 후보: `turn/steer`.
  - [ ] 실제 context 부족이나 history 편집 case를 확인하면 manual compact와 fork를 각각 평가한다. raw 후보: `thread/compact/start`, `thread/fork`. Deprecated `thread/rollback`은 지원되는 대체 method가 생길 때까지 제외한다.
  - [ ] PDF text extraction과 page/range 근거를 지원하고, Assignment 계약을 재사용하는 Exam `ModelingRecipe`를 추가한다.
  - [ ] 확인된 `SemesterModel`이 안정되면 `MarkdownProjection`, derived timeline, 학생 할 일 표면과 학기 상태 질의를 source of truth와 분리해 추가한다.
  - [ ] 학생에게 checkpoint, diff와 rollback 의미가 필요해지면 Runtime Diagnostic History와 분리된 `WorkspaceHistory`를 설계한다.
  - [ ] 실제 자료에서 필요성이 확인되면 HWP/HWPX parsing과 OCR을 추가한다.
  - [ ] 여러 workspace를 반복해서 여는 사용 흐름이 확인되면 최근 workspace 목록, chooser, macOS app data 기본값과 migration을 포함한 제품 entrypoint를 추가하고 이후 Desktop App packaging으로 확장한다.
  - [ ] Runtime diagnostic evidence를 제품 기록에 재사용하기 전에 제품용 allowlist, redaction과 retention 경계를 설계한다.
  - [ ] Native text·mention·Skill 조합으로 해결되지 않는 구체적인 case가 생기면 experimental context delivery, background terminal, realtime과 기타 raw capability를 [method inventory](../architecture/codex-app-server-method-inventory.md)에서 선택해 별도로 검증한다.
  - [ ] 여러 학기에 걸친 사용에서 필요성이 확인되면 built-in Memories의 consent, eligibility, rollover와 reset UX를 설계한다.

## 현재 범위에서 제외하는 항목

다음 항목은 raw method가 존재하거나 기술적으로 가능하다는 이유만으로 백로그에 승격하지 않는다. 새로운 사용자 case와 완료 조건이 생기면 후속 capability로 다시 검토한다.

- ACP adapter 또는 다른 Agent engine과의 동작 일치, 범용 engine 분류와 선택 UI
- API key 입력, external token host, device-code·Bedrock login과 여러 account 전환 UI
- 모든 App Server event를 제품에 노출하는 범용 event bus·router와 raw item의 1:1 UI 재현
- `Semester`, `Course`, `ModelingRun`에 고정된 Codex thread topology
- 외부 memory framework 또는 AY-PLE 전용 memory engine
- Codex UI와 동일한 Git diff·review, background terminal, Goals, plugin·MCP 관리 화면
- Raw prompt, JSON-RPC payload와 Runtime Diagnostic History를 제품 감사 기록이나 `SemesterModel`의 source of truth로 사용하는 방식
- LMS login 자동화, cloud account·sync, 외부 calendar 자동 업로드
- 과제 정답 생성과 자동 제출
- 모바일·소형 화면 최적화
