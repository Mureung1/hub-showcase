# 007 — Required prepared-workspace startup

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

W-006이 선택한 prepared SemesterWorkspace를 AY-PLE의 유일한 Workspace Runtime으로 연다. Shared listener, Interaction Broker binding, exact Git-root native project context, project MCP Adapter handshake와 required tool readiness를 순서대로 검증한 뒤에만 registry authority와 정상 AY Chat을 연다.

## Spec Traceability

- User stories: 1, 3, 4, 5
- Implementation contract: Required Interaction readiness, Data and State Flow, Failure Behaviour

## Slice-Specific Constraints

- Startup sequence의 첫 단계에서 resolved root의 canonical path, exact Git marker와 v4 identity를 fresh read한다. Prepared-workspace startup은 product operation lease를 claim하지 않으며 Bootstrap Skill final text, stale registry snapshot과 agent assertion을 readiness proof로 사용하지 않는다.
- Exact ordering은 prepared-root validation → shared loopback listener bind → Broker generation binding 준비 → exact-root Workspace Runtime spawn → native project config load → Adapter authenticated handshake → exact required MCP tool roster readiness → thread `cwd`·root identity 재확인 → explicit root의 registry transaction commit → active public surface open이다.
- Listener 또는 Broker 준비가 실패하면 Runtime child를 만들지 않는다. Runtime, config, Adapter, roster, identity 또는 registry 단계가 실패하면 active Chat을 열지 않고 bounded teardown한다.
- Workspace Runtime과 native-context probe는 같은 exact Git root를 fixed `cwd`로 사용한다. Hub-rooted Bootstrap Runtime, Bootstrap thread/transcript, cross-workspace resume와 Runtime cwd mutation은 없다.
- Project `.codex/config.toml`의 static `required = true` Interaction server가 missing, disabled, ignored되거나 Adapter generation·binding과 tool roster가 일치하지 않으면 degraded mode 없이 startup을 실패시킨다.
- Explicit root의 registry known entry와 active pointer는 required readiness 뒤 한 transaction으로 commit한다. Reopen은 matching registry identity를 fresh 재확인하며 어느 failure도 prior active pointer를 덮어쓰지 않는다.
- First open failure는 active reference가 없는 honest startup failure다. Explicit switch failure는 user-owned files·Git history와 previous registry pointer를 보존해 다음 no-argument launch가 이전 학기를 reopen할 수 있게 한다.
- Broker/Adapter continuity failure, Runtime terminal과 shutdown은 generation credential revoke, pending Interaction settlement와 bounded Runtime teardown을 요구하며 stale binding을 다음 startup에 재사용하지 않는다.
- Startup Browser projection에는 safe workspace summary와 lifecycle만 포함하고 absolute root, token, binding, native thread와 registry detail을 노출하지 않는다.

## Acceptance Criteria

- [ ] Valid prepared root가 exact ordering으로 Workspace Runtime과 required Interaction MCP를 준비한 뒤에만 active lifecycle과 explicit-root registry pointer를 얻는다.
- [ ] Root validation, listener, Broker bind, Runtime spawn, project config load, Adapter handshake, MCP roster, thread cwd/identity와 registry write 각각의 failure가 no-new-active-commit으로 검증된다.
- [ ] Required server가 missing/disabled/ignored, wrong roster 또는 stale generation이면 startup은 safe failure이고 normal Chat이 열리지 않는다.
- [ ] Success 후 Runtime, thread, native context와 registry가 같은 canonical Git root와 `workspaceId`를 가리킨다.
- [ ] Explicit first open과 registry reopen이 같은 readiness gate를 통과하고 failed explicit switch가 previous active pointer를 byte-for-byte 보존한다.
- [ ] Runtime·Adapter·Broker credential이 failure·terminal·shutdown마다 bounded하게 정리되고 다른 workspace의 transcript나 generation이 교차하지 않는다.
- [ ] Browser-safe active/recovery projection에 private Runtime, MCP credential, absolute path와 registry bytes가 없다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/server`
  - `npm test -w @ay-ple/product-contract`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - Required prepared-workspace startup ordering과 every pre-commit fault의 focused integration test
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Real built Adapter와 temporary prepared Git workspace를 explicit `--workspace`로 열어 MCP readiness, exact thread cwd, registry bytes와 bounded process teardown을 확인한다.

## Blocked By

- `004-prepared-git-project-context-and-native-trust.md` — Prepared Git project context와 native trust
- `006-prepared-workspace-launch-contract.md` — Prepared workspace launch contract
- `../2026-07-27-interaction-capability-semantic-review/002-broker-evidence-held-round-trip.md` — Broker·Evidence held round trip
- `../2026-07-27-interaction-capability-semantic-review/003-runtime-neutral-project-mcp-seam.md` — Runtime-neutral project MCP seam

## Starting Points

- `apps/server/src/server-application.ts`
- `apps/server/src/server-listener.ts`
- `apps/server/src/server-listener.test.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/product-development.ts`
- `apps/server/src/workspace-registry.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/native-context-coordinator.ts`
- `docs/architecture/ay-app-interaction-capabilities.md`
