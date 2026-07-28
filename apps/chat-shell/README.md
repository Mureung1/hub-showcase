# @ay-ple/chat-shell

App 시작 전에 준비한 user-owned Git SemesterWorkspace에서 read-only source explorer·preview, 명시적 `organize_sources` ActionInvocation, Official OpenAI Codex Python SDK 기반 normal AY Chat과 inline Semantic Review를 제공하는 desktop AY-PLE shell이다. Browser는 absolute workspace path, source registry·copy, private Broker credential, native identity와 apply ledger를 소유하지 않는다.

Default Browser route는 `/api/product/bootstrap`의 `starting | active | recovery_required` lifecycle을 표시하고 `active`에서 actual workspace file의 자료 explorer·preview와 normal AY Chat을 함께 연다. First open과 학기 변경은 App 밖의 explicit prepared-root launch가 소유하며 Browser chooser·init·candidate·activate/change control은 없다. OAuth/setup wizard, app-owned scaffold와 `WorkspaceManifest`도 public path가 아니다.

`WorkspaceLifecycleView`는 Workspace/Runtime/registry recovery, no-root 안내와 failed explicit relaunch 뒤 previous-workspace reopen을 1440px·1920px desktop Chromium에서 검증한다. Browser entry는 production `index.html` 하나이며 prepared-workspace lifecycle 뒤 source workbench와 AY Chat을 시작한다.

## 현재 구현

| 영역 | 현재 동작 |
| --- | --- |
| Workspace lifecycle | Bootstrap의 `starting | active | recovery_required`와 coarse `operationStatus`만 보존한다. `workspace_unavailable`, `registry_incompatible`, `runtime_unavailable`을 path-free recovery로 표시하고 active 전 Chat mutation을 닫는다. |
| Source explorer·preview | Active exact root의 Browser-safe relative source list를 읽어 folder별로 표시한다. Bounded UTF-8 text와 PDF는 중앙 preview에 열고 unsupported file은 실제 file을 바꾸지 않은 채 명시적 미지원 상태로 남긴다. Preview focus와 action selection은 서로 독립적인 transient Browser state이며 Course·`RawMaterial`·copy·snapshot·watcher·durable selection을 만들지 않는다. |
| Source action | Source list의 safe regular file을 preview kind와 무관하게 source-list order로 최대 16개 선택하고 `선택한 자료 정리하기`를 눌렀을 때만 exact ordered path refs와 현재 Codex settings를 동결해 `/api/product/actions`의 `organize_sources`를 시작한다. Preview content·digest는 동결하거나 action request에 넣지 않는다. PDF와 앱에서 preview할 수 없는 source도 선택할 수 있고, limit 초과 선택만 accessible reason과 함께 닫는다. Successful reload 뒤에는 current safe source와의 교집합을 보존한다. Action은 별도 transcript entry로 표시하고 기존 Product operation stream·Review·clarification·interrupt·terminal controller를 재사용하며 terminal 뒤 selection을 자동으로 지우지 않는다. |
| Semantic Review | Product Turn decoder와 transcript reducer는 `review.requested | review.resolved | review.failed`만 public Review wire로 사용한다. Pending card는 ordered change·bounded evidence와 `accept | revise | reject`만 표시하고 composer·새 Turn을 잠근다. Bodyless `204`는 held call 전달 ACK일 뿐이며 resolved frame이 settlement authority다. Settled·failed card는 controls 없이 남고 `revise` 뒤 fresh call은 새 card로 append한다. Browser는 ledger·credential·Runtime binding을 소유하지 않는다. |
| Product Chat | Free-form composer는 `/api/product/chat/messages`만 사용하고 explorer action selection을 암묵적으로 전송하지 않는다. 일반 Plan clarification은 Review와 별도 binding 및 answer/cancel route로 같은 Turn을 이어가며, active operation 중 conflicting send는 닫는다. |
| Codex Turn 설정 | Composer 아래 control은 `/api/product/codex-settings`의 visible model과 advertised reasoning effort 순서를 그대로 사용한다. Fast는 선택 모델이 `fast` service tier를 광고할 때만 켤 수 있다. 선택은 현재 Browser session의 다음 Chat에 적용하고 전역 `config.toml`을 수정하지 않는다. |
| Lifecycle | Sidebar hide/show는 mounted controller와 stream을 유지한다. Accepted operation interrupt는 public operation binding으로 요청하고 authoritative terminal까지 stream을 소비한다. Reload는 transient transcript나 unanswered Review를 복원하지 않는다. |
| Failure boundary | Invalid JSON·UTF-8·contract shape, operation/activity 또는 Review binding mismatch, invalid evidence, missing terminal과 post-terminal frame은 raw payload 없이 safe stream failure로 닫는다. Wrong·late·stale Review response를 성공처럼 투영하지 않는다. |
| Workbench | 1440–1920px desktop에서 자료 explorer와 action control, 가장 넓은 source preview, mounted AY Chat dock을 3-pane으로 제공한다. Action 시작은 닫힌 Chat dock을 열고, Review evidence에서 현재 text source와 exact digest가 일치하면 근거 quote로 이동한다. Chat dock을 다시 접어도 controller와 stream을 유지한다. |

App production source는 `@ay-ple/product-contract`만 shared package contract로 import한다. Product contract는 dependency-free이고 Node Runtime, Express, Server domain module과 private Python bridge는 browser bundle에 들어오지 않는다. Native text tracer contract, `/api/codex-chat/*` adapter와 legacy full-screen Chat owner는 product-only cutover에서 제거됐다.

## 실행

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev
```

이 canonical development 명령은 explicit `--workspace` prepared root 또는 registry active pointer를 resolve하고 Server와 Chat Shell을 `127.0.0.1:3000`, `127.0.0.1:4173`에서 함께 시작한다. Server는 listener·Broker, exact-root Runtime, project config·Adapter·required MCP readiness를 검증한 뒤에만 registry와 Browser를 active로 연다. Fresh clone에서는 [Runtime README](../../packages/codex-chat-runtime/README.md)에 따라 ignored production bundle을 먼저 materialize한다. 정확한 startup·workspace 제약은 [Server README](../server/README.md)가 소유한다.

## 검증

```bash
npm run test -w @ay-ple/chat-shell
npm run test:e2e -w @ay-ple/chat-shell
npm run typecheck -w @ay-ple/chat-shell
npm run build -w @ay-ple/product-contract
npm run build -w @ay-ple/codex-chat-runtime
npm run build -w @ay-ple/chat-shell
npm run lint -w @ay-ple/chat-shell
```

Unit suite는 target-only operation decoder, lifecycle·source projection, preview kind와 독립적인 ordered action selection, exact Semantic Review binding과 Browser NDJSON parser를 검증한다. Default Playwright trace는 실제 Vite·target Express composition과 deterministic Runtime에서 active prepared lifecycle, source list·text/PDF/unsupported preview, PDF·unsupported file까지 포함한 explicit `organize_sources` selection·frozen request·action transcript, operation lock·retry, evidence navigation, normal AY Chat 격리, 일반 clarification·interrupt와 semantic proposal의 accept·revise·reject settlement를 검증한다. Action workbench와 Workspace lifecycle E2E는 1440px·1920px desktop을 검증하며, 후자는 registry reopen·explicit relaunch recovery와 no-root/Runtime failure를 닫는다. Root `test:prepared-workspace-product-actual`은 같은 public action contract를 fresh Bootstrap workspace의 exact Runtime·selected-only read·same-Turn Review·AY-owned checkpoint와 full process cleanup으로 보완하고, `test:product-entrypoint`는 canonical OS process graph·SIGINT를 독립 검증한다.

## 후속 경계

Browser/client별 session isolation, thread persistence/read/resume, multi-thread sidebar, interactive approval과 disposable-auth live 자동화는 이 app의 현재 지원 범위가 아니다. 작업 상태와 순서는 [AY-PLE 개발 백로그](../../docs/product/ay-ple-development-backlog.md)가 소유한다.
