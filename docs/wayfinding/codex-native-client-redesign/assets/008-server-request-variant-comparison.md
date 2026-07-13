# 첫 Server request variant 비교

- 분류: 기술 참고
- 성숙도: 초안
- 대상 pin: `@openai/codex@0.144.0`, upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`
- 범위: `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/permissions/requestApproval`, `item/tool/requestUserInput`

이 문서는 Ticket 008이 첫 supported Server request를 선택할 때 사용하는 exact-pin 근거다. 네 method는 committed stable schema와 generated inventory에 모두 존재하지만, first-party source가 제품 도입 순서를 정해 주지는 않는다.

## 근거 등급

| 근거 | 소유하는 사실 | 소유하지 않는 것 |
| --- | --- | --- |
| Committed generated TypeScript와 method inventory | pinned binary가 노출하는 stable method·payload shape | TUI 정책과 AY-PLE 우선순위 |
| Exact-pin App Server·TUI·exec source와 test | request routing, pending callback, response 처리와 surface별 정책 | future compatibility와 제품 UX |
| 이 문서의 추론 | 첫 responder tracer의 상대적 설계 비용 | protocol guarantee |
| Ticket 008 결정 | AY-PLE의 첫 variant와 좁은 acceptance | upstream 구현 사실의 재정의 |

`item/tool/requestUserInput`은 stable generation에 포함되지만 Rust type 주석은 payload를 `EXPERIMENTAL`로 부른다. Exact pin에서 method가 없다는 뜻은 아니며, 향후 shape 안정성이 다른 세 variant보다 약하다는 신호로만 사용한다. ([method 등록](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L1458-L1490))

## Shape와 제품 정책 압력

| Method | Identity·response | First-party handling | 첫 tracer 비용 |
| --- | --- | --- | --- |
| `item/commandExecution/requestApproval` | `requestId`와 `threadId`·`turnId`·`itemId`; subcommand는 별도 nullable `approvalId`; response는 command decision | TUI는 `approvalId ?? itemId`로 pending request를 찾고 exact request ID에 typed response를 보낸다. Exec는 unsupported error로 reject한다. | command·cwd·reason이 request에 있어 비교적 자급적이다. 반면 session approval과 exec/network policy amendment는 제품 보안 정책이다. |
| `item/fileChange/requestApproval` | `requestId`와 thread/turn/item scope; response는 `accept`, `acceptForSession`, `decline`, `cancel` | TUI가 typed response를 지원하고 Exec는 reject한다. | response는 가장 단순하지만 request에 patch 내용이 없어 별도 file-change observation과 thread cwd를 결합해야 한다. |
| `item/permissions/requestApproval` | thread/turn/item scope와 requested permission profile; response는 granted profile, turn/session scope, optional strict review | TUI는 path를 localize·validate한 뒤 응답하고 App Server는 grant를 request와 교집합으로 제한한다. Exec는 reject한다. | filesystem/network grant와 scope를 결정하므로 보안·path 정책이 가장 크다. |
| `item/tool/requestUserInput` | thread/turn/item scope와 questions; response는 question ID별 answer 배열 | TUI는 같은 turn의 복수 request를 FIFO로 보관하고 답하며 Exec는 reject한다. | approval 부작용은 없지만 secret field, free-form answer, multiple questions와 `autoResolutionMs`가 form·privacy·expiry 정책을 요구한다. |

Generated shape는 repo의 `packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/*Request*`가 versioned authority다. Exact Rust shape는 command/file ([source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1431-L1533)), user input ([source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1594-L1646)), permissions ([source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/permissions.rs#L740-L776))에서 대조했다.

## 공통 responder lifecycle

App Server는 네 variant 모두 server-owned `RequestId`를 만들고 pending callback map에 등록한 뒤 request를 보낸다. Matching result/error는 map entry를 제거하고 waiter 하나를 resolve하며 unknown duplicate response는 callback 없음으로 끝난다. ([pending callback과 exact resolution](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L286-L410))

TUI는 네 request 모두 native `threadId`로 route하고 current view와 무관하게 pending state를 보존한다. Command는 `approvalId`, file/permissions는 `itemId`, user input은 같은 turn의 FIFO를 UI correlation key로 사용하지만 wire response authority는 항상 original `RequestId`다. ([thread scope](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_event_targets.rs#L7-L34), [pending과 typed response](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L70-L279))

Exec는 네 variant를 모두 deterministic error로 reject한다. 따라서 Exec 정책은 variant 우선순위의 근거가 아니고, unsupported request를 방치하지 않는 precedent만 제공한다. ([Exec handling](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1655-L1795))

## 권고

`item/commandExecution/requestApproval`이 객관적으로 첫 variant라는 source 결론은 없다. 네 method가 검증하는 transport lifecycle은 같고 실제 선택은 어떤 사용자 결정을 제품이 먼저 지원할지에 달려 있다.

다만 Ticket 008의 후속 **`T0.1` responder tracer**로는 command approval을 조건부 권고한다. 하나의 request가 command·cwd·reason을 제공해 file-change transcript reconstruction, permission-profile 교집합, user-input form/expiry보다 적은 주변 Module로 exact request routing과 once-only response를 검증할 수 있기 때문이다.

`T0.1`은 다음으로 제한한다.

- 한 active turn에서 regular command approval 하나만 받는다.
- `threadId`·`turnId`·`itemId`와 optional `approvalId`를 내부에서 보존하고 original `RequestId`로 한 번만 응답한다.
- 첫 UI decision은 `accept`, `decline`, `cancel`만 허용한다.
- `acceptForSession`, exec/network policy amendment, additional permissions와 remembered approval은 후속 product decision으로 남긴다.
- timeout, auto-resolution과 generic responder registry를 만들지 않는다.
- connection close나 authoritative server-side resolution 뒤 late UI answer는 no-op 또는 typed stale outcome으로 끝내고 두 번째 wire response를 보내지 않는다.

이 권고는 가장 작은 engineering tracer 선택이지 command approval을 AY-PLE의 첫 product capability로 확정하는 결정이 아니다.
