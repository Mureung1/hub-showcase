# @ay-ple/chat-shell

Official OpenAI Codex Python SDK 기반 runtime을 AY-PLE Server의 browser-safe `/api/codex-chat/*` route로 사용하는 별도 desktop Chat Shell이다. Runtime Inspector를 제품 UI로 바꾸지 않고, transient native conversation의 streaming·interrupt·순차 turn 흐름을 소유한다.

## 현재 구현

| 영역 | 현재 동작 |
| --- | --- |
| Runtime status | `unavailable`, `configured`, `starting`, `ready`, `failed`를 fixed `deny_all + read_only` policy와 함께 구분한다. |
| Conversation | 명시적인 새 대화 action으로 native `threadId` 하나를 만들고 화면의 diagnostic metadata로 유지한다. Authoritative terminal과 HTTP stream settlement 뒤 같은 thread에 새 native turn을 이어간다. Reload 뒤 resume하거나 별도 ref로 remap하지 않는다. Transcript는 browser tab에만 있고, native handle은 Server process의 단일 shared slot이므로 다른 tab/client가 새 thread를 만들면 idle 기존 thread가 교체된다. |
| Turn stream | User text를 Server에 보내고 acceptance-first NDJSON을 partial chunk, 여러 line/chunk와 final newline/EOF 경계에서 읽는다. |
| Transcript | Native `turnId`와 `itemId`를 유지하며 AgentMessage delta를 append하고 completed text로 reconcile한다. |
| Turn control | Accepted active turn에만 exact native `threadId`·`turnId` interrupt를 보낸다. HTTP `202`는 acknowledgement로만 표시하고 matching terminal까지 stream을 계속 소비한다. |
| Terminal | Matching `turn.completed`의 `completed`, `interrupted`, `failed`와 process-wide `runtime.failed`를 구분하며 active turn을 같은 전이에서 비운다. `turn.error`는 terminal이 아닌 observation으로 표시한다. |
| Failure boundary | Interrupt control failure는 active stream을 유지한 별도 safe card로 표시한다. Invalid JSON, UTF-8, contract shape, identity mismatch, duplicate acceptance, missing terminal과 post-terminal frame은 raw payload 없이 safe stream failure로 닫고 process-wide runtime failure와 다른 사용자 문구를 쓴다. |

App production source는 `@ay-ple/codex-chat-runtime/contract`만 import한다. Node runtime, Python bridge, legacy `runtime-core`·`runtime-codex`와 `HeadlessCodexClientHost`는 browser bundle에 들어오지 않는다.

## 실행

Repository root에서 다음 명령을 사용한다.

```bash
npm run dev:chat-shell
```

이 명령은 기존 `npm run dev`를 바꾸지 않고 Server와 Chat Shell을 `127.0.0.1:3000`, `127.0.0.1:4173`에서 함께 시작하며 Server에 exact `CODEX_CHAT_ORIGIN`을 준다. 실제 runtime을 사용하려면 [Server README](../server/README.md)의 bundle materialization과 여섯 absolute `CODEX_CHAT_*` path를 먼저 준비해야 한다. 준비되지 않은 경우 Shell은 `unavailable` 상태를 안전하게 표시하며 legacy runtime으로 fallback하지 않는다.

## 검증

```bash
npm run test -w @ay-ple/chat-shell
npm run test:e2e -w @ay-ple/chat-shell
npm run typecheck -w @ay-ple/chat-shell
npm run build -w @ay-ple/codex-chat-runtime
npm run build -w @ay-ple/chat-shell
npm run lint -w @ay-ple/chat-shell
```

Unit suite는 shared contract decoder, native identity reducer, interrupt HTTP acknowledgement와 browser NDJSON parser를 검증한다. Playwright는 `1440x900`에서 실제 Express Server와 public deterministic runtime fake를 통과해 status lifecycle, nominal streaming, retryable `turn.error`, failed terminal, malformed HTTP stream, interrupt acknowledgement·terminal과 same-thread follow-up을 검증한다. Provider credential이나 live Codex conversation은 사용하지 않는다.

Runtime package의 `npm run test:local-provider -w @ay-ple/codex-chat-runtime`은 별도로 production Node→bundled Python bridge→official SDK→exact native `0.144.4`를 official local Responses harness에 연결해 같은 conversation contract를 확인한다. 이 exact-local gate와 명시적으로 승인한 repository-local Harness-managed `.ay-ple` 인증을 사용해 같은 Server API를 통과한 manual live-provider T0는 green이다. 전용 disposable auth를 준비하는 자동화 gate는 별도 운영 범위다.

## 후속 경계

Browser/client별 session isolation, thread persistence/read/resume, multi-thread sidebar, interactive approval, activity card, AY-PLE 학업 domain mapping, disposable-auth live 자동화와 legacy cutover는 이 app의 현재 지원 범위가 아니다. 작업 상태와 순서는 [AY-PLE 개발 백로그](../../docs/product/ay-ple-development-backlog.md)가 소유한다.
