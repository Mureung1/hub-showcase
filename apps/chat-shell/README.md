# @ay-ple/chat-shell

Current active directory의 TXT 자료와 Official OpenAI Codex Python SDK 기반 product operation을 함께 사용하는 desktop AY-PLE workbench다. 왼쪽 source explorer, 중앙 bounded 원문 preview, 오른쪽 toggleable AY Chat의 3-pane을 제공한다. Product transcript는 tab memory에만 유지하고, 확인된 Assignment와 settled confirmation·apply outcome은 authoritative bootstrap에서 다시 연다.

현재 Browser는 chooser·development materializer가 넘긴 current-v2 directory의 post-activation workbench만 구현한다. OAuth/setup wizard, app-owned scaffold, `WorkspaceManifest`, durable active registry와 `Semester Ready` 화면은 아직 없다. 아래 `ready workspace`는 current wire state이며 [domain glossary](../../CONTEXT.md)의 `Semester Ready`와 같지 않다. Adopted workspace target은 [ADR 0018](../../docs/adr/0018-adopt-user-owned-git-semester-workspaces.md)과 [ADR 0020](../../docs/adr/0020-bootstrap-semester-workspaces-before-app-startup.md)이 소유한다.

## 현재 구현

| 영역 | 현재 동작 |
| --- | --- |
| Account readiness | `/api/product/bootstrap`의 `ready`, `not_ready`, `unavailable`을 current workspace 상태와 독립적으로 표시한다. Browser OAuth lifecycle은 제공하지 않는다. `not_ready`와 `unavailable`에서는 Assignment action과 free-form Chat mutation을 닫되 Course·material·preview는 계속 읽을 수 있다. |
| Product application state | Bootstrap의 Account readiness, coarse `operationStatus`, active workspace와 settled-only history 전체를 한 owner가 보존한다. 정상 Review 수락·거절은 exact response가 decision authority이고 response control을 먼저 해제한다. 뒤따르는 one-shot bootstrap은 `active` 응답도 허용해 settled product state를 hydrate하되 pending·failure가 same-Turn control을 막지 않는다. Finite response loss 때만 같은 one-shot read의 durable confirmation이 fallback authority가 된다. Mount·workspace mutation·stream loss·terminal hydration·reload는 Server drain 시간값을 복사하지 않는 `active → idle` final read를 사용하며, 먼저 시작한 read가 늦게 끝나도 더 최근 hydration을 덮어쓰지 않는다. Pending prompt·private correlation·persistence metadata는 Browser 상태로 만들지 않는다. Reject reload는 no-apply confirmation을, recovery reload는 settled Run outcome만 다시 열고 confirmed model과 revision을 임의로 바꾸지 않는다. |
| Workspace recovery | Ready workspace의 `cleanup_required | source_conflict | store_conflict`를 읽는 동안 자료 선택, Assignment와 Chat mutation을 닫는다. Source conflict는 원본 TXT를 보존한 채 `현재 TXT를 새 기준으로 채택`하는 explicit rebaseline만 열고, cleanup/store conflict는 matching product operation이 `idle`로 release된 뒤 같은 workspace의 명시적 재활성화로 authority를 다시 확인한다. 성공 결과는 일반 refresh와 source rebaseline을 구분해 표시하며 same-root current store가 incompatible이면 원본 entry를 보존한 read-only 안내로 전환한다. |
| Source selection | Opaque material ID와 relative display path만 사용해 app lifecycle 동안 최대 두 TXT를 명시적으로 선택한다. Registry에 남은 negative control은 선택되지 않은 상태로 유지한다. |
| Source preview | Selected tab의 material ID·digest로 Server의 bounded no-store preview를 읽으며 Browser가 filesystem path에 접근하지 않는다. |
| Assignment action | 정확히 두 source를 선택한 `선택한 자료 정리하기`가 `/api/product/actions/first-assignment`를 호출한다. Preparing·accepted, requested Skill, Plan·Agent text, MCP proposal, Review·replacement·recovery와 authoritative terminal을 shared decoder와 cross-frame reducer로 한 cumulative transcript에 정산한다. Settled `interrupted | unknown` Run의 `이 자료로 다시 시도`만 historical Course·Recipe·arguments·source snapshot으로 explicit retry route를 호출하며 현재 선택을 재해석하거나 자동 재시도하지 않는다. |
| Review | Pending Assignment의 title·dueAt·submissionMethod와 field-level evidence, `수락 | AY에게 수정 요청 | 거절` control을 한 Chat card에 표시한다. Evidence control은 matching source tab과 exact quote에 focus한다. 수정 요청은 bounded feedback만 Server에 보내고 private proposal key를 소유하지 않으며, replacement frame이 오면 old binding을 resolve하고 새 pending patch 하나로 active Review를 교체한다. Exact accept/reject response와 stream outcome을 즉시 reconcile하고, 수락의 applied state와 거절의 durable no-apply confirmation은 bootstrap history로 hydrate한다. ACK 뒤에는 terminal을 기다리지 않고 Review response authority를 해제해 같은 Turn의 일반 clarification answer/cancel과 explicit interrupt를 유지한다. Finite Review HTTP response loss만으로 native continuation loss를 합성하지 않고 one-shot durable confirmation, authoritative stream 또는 settled Server recovery만 따른다. Product commit 뒤 실제 continuation이 유실되면 confirmed revision을 유지한 `continuation_lost`를 표시하고 Review control과 retry CTA를 열지 않는다. Direct canonical field editor나 별도 approval page는 만들지 않는다. |
| Internal semantic Review | Product Turn decoder와 transcript reducer는 opt-in internal target의 `review.requested | review.resolved | review.failed`를 old Review와 나란히 받는다. Pending card는 ordered change·bounded evidence와 `accept | revise | reject`만 표시하고 composer·새 Turn을 잠근다. Bodyless `204`는 held call 전달 ACK일 뿐이며 resolved frame이 settlement authority다. Settled·failed card는 controls 없이 남고 `revise` 뒤 fresh call은 새 card로 append한다. Browser는 ledger·credential·Runtime binding을 소유하지 않는다. Current public First Assignment route와 old Review wire는 아직 이 target으로 전환하지 않았다. |
| Product Chat | Free-form composer는 `/api/product/chat/messages`만 사용하며 Account와 ready workspace가 준비되면 Course·ModelingRun 생성 전에도 source-free 일반 대화를 시작할 수 있다. Course 전 선택 자료는 Chat request에 포함하지 않는다. 일반 Plan clarification은 Review와 별도 binding 및 answer/cancel route로 같은 Turn을 이어가며 학업 상태를 만들지 않는다. Active operation 중 conflicting action·send·source mutation은 닫는다. |
| Codex Turn 설정 | Composer 아래 control은 `/api/product/codex-settings`의 visible model과 advertised reasoning effort 순서를 그대로 사용한다. Fast는 선택 모델이 `fast` service tier를 광고할 때만 켤 수 있다. 선택은 현재 Browser session의 다음 Chat·Assignment·retry에 적용하고 새로고침 때 native catalog default로 돌아가며 전역 `config.toml`을 수정하지 않는다. |
| Lifecycle | Sidebar hide/show는 mounted product controller와 stream을 유지한다. Abrupt Assignment stream EOF와 실제 page reload는 status-aware bootstrap reconciliation으로 Server의 authoritative settled recovery를 자동 관찰한다. Reload는 이전 transcript, unanswered prompt나 replacement 대기 상태를 복원하지 않는다. Accepted operation interrupt는 public operation binding으로 요청하고 authoritative terminal까지 stream을 소비한다. |
| Failure boundary | Invalid JSON·UTF-8·contract shape, operation/run/activity 또는 Review replacement binding mismatch, invalid evidence, missing terminal과 post-terminal frame은 raw payload 없이 safe stream failure로 닫는다. Wrong·late·stale Review response는 confirmed state를 성공처럼 갱신하지 않으며 request failure와 active stream control failure는 별도 사용자 상태로 유지한다. Authoritative terminal 뒤 bootstrap hydration 실패는 workspace failure로만 표시하고 operation terminal을 stream failure로 덮어쓰지 않는다. |
| Workbench | 1440–1920px에서 세 primary pane을 동시에 사용하며 source selection, evidence navigation, Review·clarification control과 keyboard focus를 desktop 기준으로 제공한다. |

App production source는 `@ay-ple/product-contract`만 shared package contract로 import한다. Product contract는 dependency-free이고 Node Runtime, Express, Server domain module과 private Python bridge는 browser bundle에 들어오지 않는다. Native text tracer contract, `/api/codex-chat/*` adapter와 legacy full-screen Chat owner는 product-only cutover에서 제거됐다.

## 실행

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev
```

이 canonical development 명령은 persistent local app data와 existing workspace를 product composition에 주입하고 Server와 Chat Shell을 `127.0.0.1:3000`, `127.0.0.1:4173`에서 함께 시작한다. `packageRoot`의 verified Runtime artifact와 `appDataRoot` 아래 controlled directory는 composition이 계산하며 caller가 여섯 Runtime path를 조립하지 않는다. Fresh clone에서는 [Runtime README](../../packages/codex-chat-runtime/README.md)에 따라 ignored production bundle을 먼저 materialize한다. 정확한 current startup·workspace 제약은 [Server README](../server/README.md)가 소유한다.

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

Unit suite는 shared product contract decoder, one-shot active read와 status-aware final bootstrap read, cross-frame operation reducer, exact Review·replacement·operation recovery binding, workspace recovery, 일반 clarification 분리, evidence guard와 browser NDJSON parser를 검증한다. Playwright는 `1440x900`과 1920px-class desktop에서 실제 Vite·Express Server·product store·private hosted MCP와 deterministic product-capable runtime fake를 통과한다. 대표 검증은 source selection·preview·pane geometry, Assignment activity·Review·evidence focus·accept·authoritative reload, revise→replacement→accept, reject→reload, internal semantic Review의 ordered change·evidence·accept/revise/reject·fresh-card append·Turn interrupt failure와 single native interrupt, Review decision 뒤 one-shot hydration pending·failure 중 same-Turn 일반 clarification answer/cancel·nonterminal interrupt ACK·no-reapply, terminal settled hydration 뒤 늦게 도착한 이전 `active` snapshot의 무시, answer 전 stream loss→interrupted/no-apply→한 번의 explicit retry, 기본 disconnect drain 뒤 final recovery read, pending Review 중 실제 reload→settled recovery, apply commit 뒤 Review response loss→confirmed revision/no-reapply, source drift 중 native interrupt→원본 보존→explicit rebaseline→fresh action, active guard store drift→operation release→same-session explicit reactivation→guard·scratch reconciliation→fresh action, invalid store의 exact-byte read-only open, authoritative terminal 뒤 bootstrap failure 격리, 일반 clarification answer/cancel, readiness별 mutation guard와 running/pending Review 중 sidebar hide/show다. Product transcript가 legacy `/api/codex-chat/*` traffic을 만들지 않는 것도 함께 확인한다. 각 harness 실행은 ambient 개발 workspace를 무시하고 Git이 추적하는 first Assignment seed의 새 임시 복사본과 run-scoped native identity를 사용한다. 연속 두 fresh harness가 서로 다른 run/workspace/app-data/product scratch와 native session을 갖고 같은 seed digest에서 시작하며, 각 harness는 자신이 소유한 정확한 실행 root만 정리한다. Provider credential이나 live Codex conversation은 사용하지 않는다.

Existing Playwright harness의 same-root durability trace는 실제 Express `ServerApplication`과 deterministic Runtime generation을 닫고 같은 `appDataRoot`·current fixture directory·API port로 다시 만든 뒤 Browser를 reload한다. Confirmed Assignment·revision·settled history는 다시 열고 transient transcript·unanswered Review는 복원하지 않는 durable boundary를 별도 workflow 없이 검증한다. Root `test:product-entrypoint`의 canonical OS process graph·SIGINT gate와 Server product shutdown actual은 startup·listener·process-tree cleanup을 독립적으로 보완한다.

Runtime package의 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`은 별도로 production Node→bundled Python bridge→official SDK→exact native `0.144.4`를 official local Responses harness에 연결해 internal conversation contract를 확인한다. Current product live evidence는 [Server README](../server/README.md)가 소유하며, isolated auth·fresh roots로 complete Assignment→Review→confirmed outcome과 clean shutdown을 통과했다. 이 point-in-time 증거는 현재 setup 지침이나 전용 disposable auth 자동화 gate를 대체하지 않는다.

## 후속 경계

Browser/client별 session isolation, thread persistence/read/resume, multi-thread sidebar, interactive approval과 disposable-auth live 자동화는 이 app의 현재 지원 범위가 아니다. 작업 상태와 순서는 [AY-PLE 개발 백로그](../../docs/product/ay-ple-development-backlog.md)가 소유한다.
