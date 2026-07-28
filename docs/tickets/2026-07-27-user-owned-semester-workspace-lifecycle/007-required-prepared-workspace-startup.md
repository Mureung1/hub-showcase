# 007 — Required prepared-workspace startup

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

W-006이 선택한 prepared SemesterWorkspace를 AY-PLE의 유일한 Workspace Runtime으로 연다. Shared listener, Interaction Broker binding, exact Git-root native project context, full effective MCP declaration과 actual Adapter held lifecycle을 순서대로 검증한 뒤에만 registry authority와 정상 AY Chat을 연다.

## Spec Traceability

- User stories: 1, 3, 4, 5
- Implementation contract: Required Interaction readiness, Data and State Flow, Failure Behaviour

## 완료 당시 Slice-Specific Constraints

- Startup sequence의 첫 단계에서 resolved root의 canonical path, exact Git marker와 v4 identity를 fresh read한다. Prepared-workspace startup은 product operation lease를 claim하지 않으며 Bootstrap Skill final text, stale registry snapshot과 agent assertion을 readiness proof로 사용하지 않는다.
- Exact ordering은 prepared-root validation → shared loopback listener bind → Broker generation binding 준비 → exact-root Workspace Runtime spawn → native project config load → Adapter authenticated handshake → exact required MCP tool roster readiness → thread `cwd`·root identity 재확인 → explicit root의 registry transaction commit → active public surface open이다.
- Listener 또는 Broker 준비가 실패하면 Runtime child를 만들지 않는다. Runtime, config, Adapter, roster, identity 또는 registry 단계가 실패하면 active Chat을 열지 않고 bounded teardown한다.
- Workspace Runtime과 native-context probe는 같은 exact Git root를 fixed `cwd`로 사용한다. Hub-rooted Bootstrap Runtime, Bootstrap thread/transcript, cross-workspace resume와 Runtime cwd mutation은 없다.
- Project `.codex/config.toml`의 static `required = true` Interaction server가 missing, disabled, ignored되거나 Adapter generation·binding과 tool roster가 일치하지 않으면 degraded mode 없이 startup을 실패시킨다.
- Explicit root의 registry known entry와 active pointer는 required readiness 뒤 한 transaction으로 commit한다. Reopen은 matching registry identity를 fresh 재확인하며 어느 failure도 prior active pointer를 덮어쓰지 않는다.
- First open failure는 active reference가 없는 honest startup failure다. Explicit switch failure는 user-owned files·Git history와 previous registry pointer를 보존해 다음 no-argument launch가 이전 학기를 reopen할 수 있게 한다.
- Broker/Adapter continuity failure, Runtime terminal과 shutdown은 generation credential revoke, pending Interaction settlement와 bounded Runtime teardown을 요구하며 stale binding을 다음 startup에 재사용하지 않는다.
- Startup Browser projection에는 safe workspace summary와 lifecycle만 포함하고 absolute root, token, binding, native thread와 registry detail을 노출하지 않는다.

## 완료 당시 Acceptance Criteria

- [x] Valid prepared root가 exact ordering으로 Workspace Runtime과 required Interaction MCP를 준비한 뒤에만 active lifecycle과 explicit-root registry pointer를 얻는다.
- [x] Root validation, listener, Broker bind, Runtime spawn, project config load, Adapter handshake, MCP roster, thread cwd/identity와 registry write 각각의 failure가 no-new-active-commit으로 검증된다.
- [x] Required server가 missing/disabled/ignored, wrong roster 또는 stale generation이면 startup은 safe failure이고 normal Chat이 열리지 않는다.
- [x] Success 후 Runtime, thread, native context와 registry가 같은 canonical Git root와 `workspaceId`를 가리킨다.
- [x] Explicit first open과 registry reopen이 같은 readiness gate를 통과하고 failed explicit switch가 previous active pointer를 byte-for-byte 보존한다.
- [x] Runtime·Adapter·Broker credential이 failure·terminal·shutdown마다 bounded하게 정리되고 다른 workspace의 transcript나 generation이 교차하지 않는다.
- [x] Browser-safe active/recovery projection에 private Runtime, MCP credential, absolute path와 registry bytes가 없다.

## 완료 당시 Verification

- Targeted test or command:
  - `NODE_OPTIONS=--experimental-strip-types npx tsx --test apps/server/src/prepared-workspace-startup.test.ts apps/server/src/workspace-registry.test.ts` — startup ordering, every pre-commit fault, terminal race, bounded teardown와 actual SIGKILL registry recovery 32개 test green
  - `npm test -w @ay-ple/server` — 192개 test green
  - `npm test -w @ay-ple/product-contract` — 21개 test green
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime` — 106개 test green
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - `npm run test:runtime-local-provider` — exact Codex production bridge, tracked trusted Git project의 real built Interaction Adapter, exact-root trust reload와 explicit untrusted preservation 4개 actual test green
  - Temporary prepared Git workspace와 real shared listener/Broker를 사용하는 focused integration에서 authenticated generation, required tool roster, exact thread `cwd`, registry bytes와 bounded process teardown을 확인했다.
  - `/code-review 00df93abf6c1ed9230b804bd24a7873a8ef76340`의 Standards와 Spec 축 모두 final finding 0개였다.

## 완료 당시 Result

Internal `PreparedWorkspaceStartupCoordinator`가 fresh prepared-root validation부터 shared listener·Broker generation, exact-root Runtime·native config, authenticated Adapter와 required tool roster, thread `cwd`·identity, registry transaction, coordinator-owned active projection까지 하나의 fail-closed 순서로 묶는다. Runtime terminal 또는 어느 readiness failure도 normal active를 열지 않으며 Broker → Runtime → listener teardown을 하나의 5초 deadline 안에서 모두 시도한다.

Registry active commit은 final replace 직전 root identity를 다시 확인하고 synchronous acceptance 전 terminal이면 이전 authority를 복원한다. Durable `pending | accepted` writer phase와 commit proof가 first-open·switch process death를 구분하며, no-argument authoritative reopen도 read 전에 dead pending writer를 reconcile해 unaccepted target을 active로 관찰하지 않는다. 주요 구현 commit은 `92b4c0fad`, `55db94e97`, `433d7d514`, `8a630314d`, `360d93e69`이다. Current public startup composition 전환은 downstream joint public cutover ticket이 소유한다.

## 검토 후 정정 (현재 결과)

완료 당시 `CodexMcpReadinessPort`와 same-thread status polling은 실제 Product Adapter 대신 status 요청이 만든 임시 Adapter를 관찰했다. Current coordinator는 이 seam과 active monitor를 제거하고 다음 순서로 fail closed한다.

1. Prepared root의 canonical path·exact `.git` marker·v4 identity를 fresh 검증한다.
2. Shared listener와 Broker generation을 준비한 뒤 exact-root Workspace Runtime을 spawn한다.
3. Native workspace thread를 먼저 시작해 exact-root trust와 project config reload를 성립시킨다.
4. Effective `ay_ple_interaction` declaration의 root-relative `command`, 빈 `args`, source 없는 exact 세 `env_vars`, 생략된 `cwd`·`tool_timeout_sec`, 빈 static `env`, `enabled=true`, `required=true`, exact `enabled_tools`, empty `disabled_tools`를 확인한다. 다른 user MCP의 valid sourced env var는 projection에서 보존한다.
5. Actual Adapter가 authenticated handshake 뒤 Broker에 연 held lifecycle channel의 acceptance를 기다린다.
6. Fresh root identity와 thread context를 다시 확인하고 Broker `isLost()`가 false일 때만 registry transaction을 acceptance한다.

Startup에서 검증한 native thread는 Product Turn에도 그대로 재사용한다. Broker의 lifecycle status가 readiness와 active Adapter loss의 authority이며, synchronous `isLost()`가 registry final acceptance race를 닫는다. Registry acceptance는 되돌릴 수 없는 cutover라서 acceptance 전 loss는 previous pointer를 복원하고, acceptance 뒤 loss는 새 pointer를 유지한 immediate recovery로 정산한다. Unexpected lifecycle EOF는 pending Interaction을 `transport_failed`로 정산하지만 Runtime terminal은 `runtime_terminated`로 구분하며, expected shutdown은 false Adapter loss를 만들지 않는다. 위 구현 commit과 완료 당시 검증 수치는 durable registry transaction·startup coordinator의 역사적 evidence로 보존하며, current lifecycle tests가 교정된 sequencing과 settlement를 추가로 고정한다.

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
