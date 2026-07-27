# 007 — Required Interaction activation

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

사용자가 initialized candidate를 explicit activation하면 AY-PLE이 Bootstrap Runtime을 닫고 exact Git root에서 fresh Workspace Runtime을 시작한다. Interaction Broker, project MCP, Adapter handshake와 required tool readiness가 모두 확인된 뒤에만 registry known entry와 active pointer가 commit되어 정상 AY Chat으로 전환된다.

## Spec Traceability

- User stories: 1, 4, 5
- Implementation contract: Native project context와 Interaction readiness consumption, Data and State Flow, Failure Behaviour

## Slice-Specific Constraints

- Activation은 transition lease 아래 candidate ID, completed init, root Git marker와 v4 identity를 fresh read한다. Agent final text와 stale in-memory snapshot을 proof로 사용하지 않는다.
- Exact ordering은 shared loopback listener bind → Broker binding 준비 → Bootstrap Runtime·thread close → Workspace Runtime spawn → native project config load → Adapter handshake → exact MCP tool roster readiness → thread `cwd`·root identity 확인 → registry transaction commit이다.
- Workspace Runtime은 candidate Git root를 fixed `cwd`로 사용하고 Bootstrap thread/transcript를 resume하거나 이어 붙이지 않는다.
- Project `.codex/config.toml`의 expected required Interaction server가 ignored되거나 Adapter/Broker binding과 tool roster가 일치하지 않으면 degraded mode 없이 activation을 실패시킨다.
- Registry known entry와 active pointer는 required readiness 뒤 한 transaction으로 commit한다. 어느 pre-commit failure도 prior pointer를 바꾸지 않는다.
- Activation failure는 candidate와 user-owned files·Git history를 보존한다. Bootstrap 재시작이 실패하면 `recovery_required/runtime_unavailable`이며 first activation의 active reference는 null이다.
- Endpoint는 exact `{}`를 받고 full terminal까지 기다려 `{status:"activated", workspace}`를 반환한다. Same-process lost response retry는 bounded last receipt로 동일 결과에 수렴한다.
- Broker/Adapter continuity failure, Runtime terminal과 shutdown은 generation credential revoke와 bounded Runtime teardown을 요구하며 stale binding을 다음 activation에 재사용하지 않는다.

## Acceptance Criteria

- [ ] Valid initialized candidate가 exact ordering으로 Workspace Runtime과 required Interaction MCP를 준비한 뒤에만 active lifecycle과 registry pointer를 얻는다.
- [ ] Listener, Broker bind, Runtime spawn, project config load, Adapter handshake, MCP roster, thread cwd/identity와 registry write 각각의 failure가 no-active-commit으로 검증된다.
- [ ] Required server가 missing/disabled/ignored, wrong roster 또는 stale generation이면 activation은 safe failure이고 normal Chat이 열리지 않는다.
- [ ] Success 후 Runtime, thread, native context와 registry가 같은 canonical Git root와 `workspaceId`를 가리킨다.
- [ ] Activation response loss와 duplicate retry가 Runtime/registry를 중복 생성하거나 다른 receipt를 합성하지 않는다.
- [ ] Bootstrap Runtime·thread와 credential이 success·failure·shutdown마다 bounded하게 정리되고 Workspace Runtime에 transcript가 교차하지 않는다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/server`
  - `npm test -w @ay-ple/product-contract`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - Required activation ordering과 every pre-commit fault의 focused integration test
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Real built Adapter와 temporary Git workspace로 initialize→activate를 실행하고 MCP readiness, exact thread cwd, registry bytes와 Bootstrap process reap을 확인한다.

## Blocked By

- `006-candidate-lifecycle-vertical.md` — Candidate lifecycle vertical
- `../2026-07-27-interaction-capability-semantic-review/002-broker-evidence-held-round-trip.md` — Broker·Evidence held round trip
- `../2026-07-27-interaction-capability-semantic-review/003-runtime-neutral-project-mcp-seam.md` — Runtime-neutral project MCP seam

## Starting Points

- `apps/server/src/server-application.ts`
- `apps/server/src/server-listener.ts`
- `apps/server/src/server-listener.test.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/native-context-coordinator.ts`
- `docs/architecture/ay-app-interaction-capabilities.md`
