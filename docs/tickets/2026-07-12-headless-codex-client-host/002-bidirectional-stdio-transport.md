# 002 — stdio transport에서 네 protocol direction을 왕복한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

## Acceptance Criteria

- [ ] Actual deterministic fake child를 사용한 test가 네 message direction을 모두 stdio JSONL로 왕복한다.
- [ ] Outbound Client request의 numeric ID와 같은 numeric ID를 가진 inbound Server request가 동시에 존재해도 각 방향의 response가 정확히 연결된다.
- [ ] Numeric ID와 같은 값을 가진 string ID가 서로 다른 identity로 유지된다.
- [ ] Server request caller가 original ID type/value를 보존한 typed success 또는 protocol-level error response를 정확히 한 번 쓸 수 있다.
- [ ] Unknown, duplicate 또는 conflicting response가 다른 pending request를 resolve하지 않는다.
- [ ] Malformed JSON, ambiguous message와 process/stream loss가 조용히 notification으로 사라지지 않고 안전한 protocol/transport observation으로 끝난다.
- [ ] Fixture-owned journal이 spawn, outbound protocol과 Server response를 관측하며 제품 Interface의 debug log에 의존하지 않는다.
- [ ] Actual-child test가 정상 완료, assertion failure와 transport failure에서 child를 close하거나 deadline 뒤 force-kill하고 temporary process·journal directory를 항상 정리한다.
- [ ] 기존 `CodexRawClient` wrapper, `CodexRuntimeAdapter`와 관련 테스트가 변경 없이 또는 호환 확장으로 계속 통과한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — 실제 child process로 실행한 deterministic fake App Server가 가장 높은 test seam이다.

## Blocked By

None — can start immediately.

## Starting Points

- `packages/runtime-codex/src/raw-client.ts`의 `pendingResponses`, `handleStdoutLine`과 process lifecycle handling
- `packages/runtime-codex/src/raw-client.test.ts`
- `packages/runtime-codex/src/testing/fake-codex-app-server.ts`
- Generated `RequestId`, `ServerRequest`, `ServerNotification`, `ClientRequest`와 `ClientNotification` type
