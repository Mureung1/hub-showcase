# 005 — 채택한 pending interaction을 typed response로 왕복한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

App Server가 시작한 command approval, file change approval, permission approval과 user-input request가 정확한 thread·turn·item에 연결된 product-safe pending interaction으로 Host snapshot과 event에 나타난다. Caller는 current-generation `interactionRef`와 variant별 좁은 answer만 전달하며 Host는 원래 Server request에 typed response를 정확히 한 번 쓴다.

Command approval tracer를 먼저 end-to-end로 green으로 만든 뒤 같은 interaction registry와 response path 위에 나머지 세 variant를 확장한다. Approval UI나 제품 sandbox policy 없이도 request identity, answer mapping과 race semantics가 Host boundary에서 완성된다.

## Spec Traceability

- User stories: 3
- Implementation contract: `Pending interaction contract`, `Identity and event contract`의 request namespace, `Failure Behaviour`의 stale·duplicate·unsupported request

## Slice-Specific Constraints

- Pending interaction은 opaque `interactionRef`, normalized kind, correlated refs, timestamp와 variant별 allowlisted display data만 공개한다.
- 같은 item의 여러 callback을 허용한다. Raw request identity와 필요한 `approvalId`는 내부 correlation에 보존하되 public DTO로 내보내지 않는다.
- Command과 file answer `accept_once`, `decline`, `cancel`은 각각 generated `accept`, `decline`, `cancel`에 mapping한다. Session accept와 policy amendment는 노출하지 않는다.
- Permission answer는 `grant_requested_for_turn`만 허용한다. 요청받은 non-null profile만 복사하고 scope는 `turn`으로 고정하며 arbitrary permission, session scope와 `strictAutoReview`를 거부한다.
- User input은 opaque `questionRef`와 string value 목록만 받고 current interaction의 raw question ID로 역mapping한다.
- Unknown, stale, already-resolved, duplicate response와 invalid variant는 raw response를 쓰기 전에 stable typed error로 거부한다.
- `serverRequest/resolved`가 먼저 오면 pending interaction을 resolved로 닫고 이후 caller answer를 보내지 않는다.
- `serverRequest/resolved`가 먼저 오면 Ticket 002의 package-internal `dismiss()`로 exact active request handle을 닫는다. 이전 handle token이 이후 같은 raw ID로 온 새 request registry entry를 제거하지 않아야 한다.
- Unsupported Server request는 자동 승인하거나 conversation text로 바꾸지 않고 protocol-level unsupported response와 sanitized Host warning/failure로 끝낸다.
- Generation 종료와 restart fencing은 ticket 006이 소유한다. Browser UI와 approval policy는 범위 밖이다.

## Acceptance Criteria

- [ ] Command approval이 pending snapshot/event로 나타나고 세 허용 answer가 exact request ID로 one-shot typed response를 만든다.
- [ ] File change approval이 같은 mechanism을 사용하면서 session accept를 노출하지 않는다.
- [ ] Permission grant가 requested non-null profile과 `turn` scope만 사용하고 browser/caller가 권한 shape를 확장할 수 없다.
- [ ] User-input answer가 opaque question refs를 raw question IDs로 역mapping하고 unknown·duplicate question과 허용 cardinality 위반을 response 전에 거부한다.
- [ ] 같은 item의 서로 다른 request/approval callbacks를 만들고 역순으로 답해도 각각의 typed response가 정확하다.
- [ ] Opposite direction의 같은 ID, numeric/string ID, duplicate answer와 unknown interaction이 다른 pending state나 Client response를 변경하지 않는다.
- [ ] `serverRequest/resolved` race가 pending state를 한 번만 terminal로 만들고 late caller answer를 App Server에 보내지 않는다.
- [ ] Response/error write 또는 native resolved에 따른 `dismiss()` 뒤 raw Server request ID를 active registry에서 해제해 순차 reuse를 허용하고, 동시에 active인 reuse는 fatal duplicate로 유지한다.
- [ ] Subscriber가 끊겨도 Host pending state는 유지되고 새 Host subscriber snapshot에 다시 나타난다.
- [ ] 실제 Host mapping이 생긴 네 Server request와 `serverRequest/resolved`만 sparse method decision에서 `client-host`로 승격한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — 실제 approval 유발은 비결정적이므로 actual fake child와 fixture journal이 exact response를 증명한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/004-long-lived-correlated-work.md` — 한 process에서 thread·turn·activity를 정확히 연결한다

## Starting Points

- Ticket 002의 Server request delivery/response seam
- Ticket 004의 thread·turn·item ref registry와 Host snapshot/event reducer
- `packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ServerRequest.ts`
- Generated command/file/permission/user-input request와 response types
- Generated `ServerRequestResolvedNotification` type
