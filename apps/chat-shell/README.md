# @ay-ple/chat-shell

활성 `SemesterWorkspace`의 TXT 자료와 Official OpenAI Codex Python SDK 기반 product operation을 함께 사용하는 desktop AY-PLE workbench다. 왼쪽 source explorer, 중앙 bounded 원문 preview, 오른쪽 toggleable AY Chat의 3-pane을 제공한다. Product transcript는 tab memory에만 유지하고, 확인된 Assignment와 settled confirmation·apply outcome은 authoritative bootstrap에서 다시 연다.

## 현재 구현

| 영역 | 현재 동작 |
| --- | --- |
| Account readiness | `/api/product/bootstrap`의 `ready`, `not_ready`, `unavailable`을 workspace 상태와 독립적으로 표시한다. `not_ready`와 `unavailable`에서는 Assignment action과 free-form Chat mutation을 닫되 Course·material·preview는 계속 읽을 수 있다. |
| Product application state | Bootstrap의 Account readiness, active workspace와 settled-only history 전체를 한 owner가 보존한다. Workspace mutation과 settled Review·continuity recovery 뒤 authoritative bootstrap을 다시 읽으며, pending prompt·private correlation·persistence metadata는 Browser 상태로 만들지 않는다. Reject reload는 no-apply confirmation을, recovery reload는 settled Run outcome만 다시 열고 confirmed model과 revision을 임의로 바꾸지 않는다. |
| Source selection | Opaque material ID와 relative display path만 사용해 app lifecycle 동안 최대 두 TXT를 명시적으로 선택한다. Registry에 남은 negative control은 선택되지 않은 상태로 유지한다. |
| Source preview | Selected tab의 material ID·digest로 Server의 bounded no-store preview를 읽으며 Browser가 filesystem path에 접근하지 않는다. |
| Assignment action | 정확히 두 source를 선택한 `선택한 자료 정리하기`가 `/api/product/actions/first-assignment`를 호출한다. Preparing·accepted, requested Skill, Plan·Agent text, MCP proposal, Review·replacement·recovery와 authoritative terminal을 shared decoder와 cross-frame reducer로 한 cumulative transcript에 정산한다. Settled `interrupted | unknown` Run의 `이 자료로 다시 시도`만 historical Course·Recipe·arguments·source snapshot으로 explicit retry route를 호출하며 현재 선택을 재해석하거나 자동 재시도하지 않는다. |
| Review | Pending Assignment의 title·dueAt·submissionMethod와 field-level evidence, `수락 | AY에게 수정 요청 | 거절` control을 한 Chat card에 표시한다. Evidence control은 matching source tab과 exact quote에 focus한다. 수정 요청은 bounded feedback만 Server에 보내고 private proposal key를 소유하지 않으며, replacement frame이 오면 old binding을 resolve하고 새 pending patch 하나로 active Review를 교체한다. 수락은 authoritative bootstrap의 applied state, 거절은 durable no-apply confirmation을 근거로 표시한다. Product commit 뒤 continuation이 유실되면 confirmed revision을 유지한 `continuation_lost`를 표시하고 Review control과 retry CTA를 열지 않는다. Direct canonical field editor나 별도 approval page는 만들지 않는다. |
| Product Chat | Free-form composer는 `/api/product/chat/messages`만 사용한다. 일반 Plan clarification은 Review와 별도 binding 및 answer/cancel route로 같은 Turn을 이어가며 학업 상태를 만들지 않는다. Active operation 중 conflicting action·send·source mutation은 닫는다. |
| Lifecycle | Sidebar hide/show는 mounted product controller와 stream을 유지한다. Abrupt Assignment stream EOF는 bounded bootstrap reconciliation으로 authoritative settled recovery를 먼저 확인하고, reload는 같은 settled bootstrap만 다시 열며 이전 transcript, unanswered prompt나 replacement 대기 상태를 복원하지 않는다. Accepted operation interrupt는 public operation binding으로 요청하고 authoritative terminal까지 stream을 소비한다. |
| Failure boundary | Invalid JSON·UTF-8·contract shape, operation/run/activity 또는 Review replacement binding mismatch, invalid evidence, missing terminal과 post-terminal frame은 raw payload 없이 safe stream failure로 닫는다. Wrong·late·stale Review response는 confirmed state를 성공처럼 갱신하지 않으며 request failure와 active stream control failure는 별도 사용자 상태로 유지한다. |
| Workbench | 1440–1920px에서 세 primary pane을 동시에 사용하며 source selection, evidence navigation, Review·clarification control과 keyboard focus를 desktop 기준으로 제공한다. |

App production source는 `@ay-ple/product-contract`와 `@ay-ple/codex-chat-runtime/contract`만 shared package contract로 import한다. Product contract는 dependency-free이고 Node Runtime, Express, Server domain module과 private Python bridge는 browser bundle에 들어오지 않는다.

## 실행

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev -- --app-data-root /absolute/path/to/ay-ple-app-data
```

이 canonical 명령은 explicit app data와 materialized/override workspace를 product controller에 주입하고 Server와 Chat Shell을 `127.0.0.1:3000`, `127.0.0.1:4173`에서 함께 시작한다. 실제 runtime을 사용하려면 [Server README](../server/README.md)의 bundle materialization과 여섯 absolute `CODEX_CHAT_*` path도 준비해야 한다. 준비되지 않은 경우 source workbench는 계속 동작하고 AY Chat만 `unavailable` 상태를 안전하게 표시한다.

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

Unit suite는 shared product contract decoder, cross-frame operation reducer, exact Review·replacement·recovery binding, 일반 clarification 분리, evidence guard와 browser NDJSON parser를 검증한다. Playwright는 `1440x900`과 1920px-class desktop에서 실제 Vite·Express Server·product store·private hosted MCP와 deterministic product-capable runtime fake를 통과한다. 대표 검증은 source selection·preview·pane geometry, Assignment activity·Review·evidence focus·accept·authoritative reload, revise→replacement→accept, reject→reload, answer 전 stream loss→interrupted/no-apply→한 번의 explicit retry, apply commit 뒤 Review response loss→confirmed revision/no-reapply, 일반 clarification answer/cancel, readiness별 mutation guard와 running/pending Review 중 sidebar hide/show다. Product transcript가 legacy `/api/codex-chat/*` traffic을 만들지 않는 것도 함께 확인한다. 각 harness 실행은 ambient 개발 workspace를 무시하고 Git이 추적하는 first Assignment seed의 새 임시 복사본을 사용하며 자신이 소유한 정확한 실행 root만 정리한다. Provider credential이나 live Codex conversation은 사용하지 않는다.

Runtime package의 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`은 별도로 production Node→bundled Python bridge→official SDK→exact native `0.144.4`를 official local Responses harness에 연결해 같은 conversation contract를 확인한다. 이 exact-local gate와 cutover 전에 명시적으로 승인한 격리 인증 상태로 같은 Server API를 통과한 manual live-provider T0는 green이었다. 이 point-in-time 증거는 현재 setup 지침이나 전용 disposable auth 자동화 gate를 대체하지 않는다.

## 후속 경계

Workspace source/store recovery, Browser/client별 session isolation, thread persistence/read/resume, multi-thread sidebar, interactive approval과 disposable-auth live 자동화는 이 app의 현재 지원 범위가 아니다. 작업 상태와 순서는 [AY-PLE 개발 백로그](../../docs/product/ay-ple-development-backlog.md)가 소유한다. Legacy `/api/codex-chat/*` reducer와 adapter는 Chat-only conformance 표면으로 남아 있지만 product workbench transcript에는 mount하거나 혼합하지 않는다.
