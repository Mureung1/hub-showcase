# 002 — stdio transport에서 네 protocol direction을 왕복한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: implementation agent

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

실제 child process와 stdio JSONL을 통과하는 Codex transport가 Client request, Client notification, Server request와 Server notification을 정확히 분류한다. Server request를 Host-facing caller에게 전달하고 원래 `RequestId` type과 value로 typed response를 한 번 돌려보낼 수 있으며, 반대 방향에서 같은 ID를 동시에 사용해도 pending Client response와 혼동하지 않는다.

이 slice는 이후 Host가 exact identity를 소유할 수 있게 하는 필수 prefactor다. 기존 `CodexRawClient`와 `CodexRuntimeAdapter`의 공개 동작은 확장 옆에서 계속 작동해야 하며 repository는 이 ticket만 적용된 상태에서도 green이어야 한다.

## Spec Traceability

- User stories: 3, 7
- Implementation contract: `Module Responsibilities and Seams`의 Codex protocol transport, `Identity and event contract`, `Testing Decisions`의 Identity routing

## Slice-Specific Constraints

- Inbound message는 `id + method` Server request, `method only` Server notification, `id + result/error` Client request response로 분류한다.
- Transport correlation은 direction과 `typeof id` 및 exact value를 보존한다. Host generation은 다음 lifecycle slice에서 추가한다.
- 숫자 `1`과 문자열 `"1"`을 합치거나 request key를 `String(id)`만으로 만들지 않는다.
- Server response writer는 generated schema를 package 내부에서 사용하되 generated protocol type을 새 public 제품 계약으로 export하지 않는다.
- Child `error`, exit, stdout EOF, stdin write failure와 malformed/unsafe message를 Host가 구분할 수 있는 connection observation으로 전달한다.
- Runtime Harness의 raw/debug evidence는 보존하지만 새 Host-facing transport 결과에 raw stdio payload나 secret을 기본 노출하지 않는다.
- Actual-child fixture는 success, assertion failure와 transport failure 모두에서 child close, deadline 뒤 force-kill과 temporary journal cleanup을 소유한다.
- Generic transport가 method를 읽었다는 사실만으로 `codex-method-decisions.json` integration을 승격하지 않는다.
- Package-internal `start()`는 actual child `spawn` event에서 resolve하고 async spawn error에서 reject하는 coalesced Promise다. Concurrent `close()`도 첫 cleanup Promise를 함께 기다린다.
- Server request identity는 active 동안만 예약하고 response write 또는 internal-only `dismiss()` 뒤 해제한다. Client request lifecycle은 tombstone을 evict하지 않는 bounded registry가 소유한다.

## Acceptance Criteria

- [x] Actual deterministic fake child를 사용한 test가 네 message direction을 모두 stdio JSONL로 왕복한다.
- [x] Outbound Client request의 numeric ID와 같은 numeric ID를 가진 inbound Server request가 동시에 존재해도 각 방향의 response가 정확히 연결된다.
- [x] Numeric ID와 같은 값을 가진 string ID가 서로 다른 identity로 유지된다.
- [x] Server request caller가 original ID type/value를 보존한 typed success 또는 protocol-level error response를 정확히 한 번 쓸 수 있다.
- [x] Unknown, duplicate 또는 conflicting response가 다른 pending request를 resolve하지 않는다.
- [x] Malformed JSON, ambiguous message와 process/stream loss가 조용히 notification으로 사라지지 않고 안전한 protocol/transport observation으로 끝난다.
- [x] Fixture-owned journal이 spawn, outbound protocol과 Server response를 관측하며 제품 Interface의 debug log에 의존하지 않는다.
- [x] Actual-child test가 정상 완료, assertion failure와 transport failure에서 child를 close하거나 deadline 뒤 force-kill하고 temporary process·journal directory를 항상 정리한다.
- [x] 기존 `CodexRawClient` wrapper, `CodexRuntimeAdapter`와 관련 테스트가 변경 없이 또는 호환 확장으로 계속 통과한다.
- [x] Raw `1.0`과 `1e3`처럼 수학적으로 exact safe integer인 JSON number 표기를 허용하면서 precision loss, underflow와 negative zero는 parse 전에 거부한다.
- [x] Terminal protocol/transport observation 뒤 같은 stdout buffer의 notification이나 Server request를 더 publish하지 않는다.
- [x] Successful spawn Promise가 concurrent start를 한 child spawn으로 coalesce하고 async spawn failure와 initialize 전 단계를 구분할 수 있다.
- [x] Server request response/error 또는 `dismiss()` 뒤 같은 ID의 순차 reuse는 허용하고 동시에 active인 reuse는 fatal duplicate로 거부한다.
- [x] Client request lifecycle은 `pending | completed | timed_out` registry 하나가 소유하며 hard cap에서 tombstone eviction 없이 새 wire write 전에 connection을 안전하게 닫는다.
- [x] Concurrent `close()` caller가 graceful deadline과 force-kill을 포함한 같은 cleanup 완료를 기다린다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — 실제 child process로 실행한 deterministic fake App Server가 가장 높은 test seam이다.

검증 결과:

- `npm run test -w @ay-ple/runtime-codex` — 통과, actual-child transport와 기존 Raw Client·Adapter 회귀 포함
- `npm test` — 통과, Inspector desktop Playwright 6개 포함
- `npm run typecheck` — 통과
- `npm run build` — 통과
- `npm run lint -w @ay-ple/inspector` — 통과
- `npm run generate:codex-methods -w @ay-ple/runtime-codex` 뒤 generated diff 확인 — 통과
- Manual/live smoke — 티켓 결정에 따라 실행하지 않음

2026-07-13 follow-up review 수정 검증:

- `npm run test -w @ay-ple/runtime-codex` — 통과, 67개 test와 네 actual-child 회귀 포함
- `npm test` — 통과, Inspector Playwright 6개 test 포함
- `npm run typecheck` — 통과
- `npm run build` — 통과
- `npm run lint -w @ay-ple/inspector` — 통과
- `npm run generate:codex-methods -w @ay-ple/runtime-codex` — 통과, aggregate response schema 재생성 전후 SHA-256 동일, 예상 밖 generated inventory diff 없음

## Result

`CodexStdioTransport`가 네 protocol direction을 stdio JSONL에서 분리하고 direction·ID type·exact value로 Client response와 Server request를 독립적으로 연결한다. Pinned Codex가 생성한 Server request JSON Schema와 response type을 package 내부에서 검증·사용하며 one-shot success/error writer, sanitized protocol/transport observation과 request-scoped timeout을 제공한다. Actual-child fixture journal은 spawn과 outbound protocol을 독립 관측하고 success, assertion failure와 transport failure의 child reaping·temporary directory cleanup을 소유한다. 기존 `CodexRawClient`와 `CodexRuntimeAdapter` 경로는 그대로 유지했다.

Follow-up review의 첫 네 finding도 actual-child seam에서 보강했다. Raw numeric ID는 `Number()` 변환 전에 unsafe precision loss·underflow와 duplicate top-level protocol key를 차단한다. Timed-out Client identity는 completed response와 별도 state로 보존해 known late response만 폐기하며 다른 pending request와 connection은 유지한다. Shared internal response contract가 10개 Server request method의 generated response type과 schema name을 한 roster에서 소유하고, generator가 만든 aggregate response schema로 success result를 wire write 전에 검증한다. Invalid result는 one-shot 상태를 소비하지 않으며 fixture journal에도 기록되지 않는다.

전체 review 재대조 hardening은 수학적으로 같은 safe integer value인 decimal/exponent JSON 표기를 수용하고 terminal observation 뒤 publication을 차단했다. Actual child `spawn`과 concurrent close는 각각 하나의 Promise로 coalesce한다. Active Server request는 tokenized lifecycle과 `dismiss()`를 사용해 response 또는 native resolution 뒤 identity를 안전하게 해제하고, Client request lifecycle은 tombstone을 evict하지 않는 65,536-entry hard cap으로 memory를 제한한다.

구현 commits:

- `ec849def` — bidirectional stdio transport와 actual-child contract fixture 추가
- `cc40a492` — request timeout을 connection loss와 분리하고 fixture journal read를 보강
- `6f7139d4` — timeout identity fencing, malformed params와 cleanup 검증을 강화
- `00dc5792` — Server request params와 transport-failure PID cleanup 검증 추가
- `6ef7f49f` — pinned generated JSON Schema로 nested Server request params validation을 일원화
- `3329f5b9` — unsafe numeric ID를 parse 전 거부하고 Server request params를 untrusted 상태로 유지
- `346af09e` — raw envelope, late response fencing과 generated Server success response 검증을 보강

## Blocked By

None — can start immediately.

## Starting Points

- `packages/runtime-codex/src/raw-client.ts`의 `pendingResponses`, `handleStdoutLine`과 process lifecycle handling
- `packages/runtime-codex/src/raw-client.test.ts`
- `packages/runtime-codex/src/testing/fake-codex-app-server.ts`
- Generated `RequestId`, `ServerRequest`, `ServerNotification`, `ClientRequest`와 `ClientNotification` type
