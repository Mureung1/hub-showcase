# 003 — Runtime-neutral project MCP seam

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

`@ay-ple/codex-chat-runtime`이 capability 의미를 알지 않고 bounded child environment를 same persistent generation에 전달하며, native project config의 bounded effective MCP declaration을 high-level shape로 투영한다. 이미 준비된 SemesterWorkspace의 target thread는 exact Git root `cwd`와 project config만으로 built Adapter를 시작하고, thread-start private MCP override나 candidate permission 확장을 사용하지 않는다. Live Adapter readiness와 loss는 Runtime status 조회가 아니라 Server의 Broker lifecycle channel이 소유한다.

## Spec Traceability

- User stories: 8, 10
- Implementation contract: `Project declaration과 capability-neutral Runtime seam`, `Runtime startup assumption`, `Failure Behaviour`

## 완료 당시 Slice-Specific Constraints

- `CodexChildEnvironment`의 entry 수, key pattern, value·aggregate byte bound를 적용하고 `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `TMPDIR`, `PATH`, `PYTHON*`, dynamic-loader와 Runtime-owned key override를 spawn 전에 거절한다.
- Sanitized child environment는 bridge child와 `CodexConfig.env`에 같은 값으로 전달된다. Sanitized `PATH`에는 current AY-PLE Node executable directory가 포함되며 ambient authority를 통째로 상속하지 않는다.
- `CodexMcpReadinessPort`는 same persistent generation의 official status를 high-level `serverName + tool roster`로만 축소한다. Raw App Server envelope와 generated SDK type을 package 밖으로 내보내지 않는다.
- Exact SDK 변경이 필요하면 generic child environment·readiness에 필요한 최소 범위에서 repository의 ordered patch·generation·provenance discipline을 지키고 public high-level seam과 bridge test를 함께 갱신한다.
- Target Workspace path는 project config를 MCP declaration authority로 사용한다. `StartThreadInput.mcp`, `CodexPrivateMcpServerInput`, literal capability allowlist와 high-precedence thread-start override는 새 path에서 받지 않는다.
- Runtime public contract와 exact SDK patch stack에 Bootstrap candidate root, additional `writableRoots` 또는 structured permission policy를 추가하지 않는다. 쓰기 권한은 exact prepared Git-root `cwd`의 native project policy를 따른다.
- Current public vertical의 matching legacy path는 expand 단계에서 계속 green으로 유지하고, public/testing contract와 구현 제거는 ticket 009가 소유한다.
- Runtime은 environment key의 제품 의미, `propose_state_patch` schema, Broker route와 Browser lifecycle을 해석하지 않는다.
- Native project discovery, exact Git-root cwd와 permission/trust behavior는 blocker ticket의 authority를 재사용한다.

## 완료 당시 Acceptance Criteria

- [x] Valid generic child environment가 bridge와 native Codex child에 exact 전달되고 entry/key/value/aggregate bound 및 모든 protected-key override가 pre-spawn rejection으로 고정된다.
- [x] Same-generation readiness operation이 expected server와 exact tool roster에서만 성공하며 missing, starting, failed, wrong roster, ignored project config와 abort를 bounded failure로 반환한다.
- [x] Raw native status, generated SDK shape와 interaction-specific constant가 Runtime public contract에 노출되지 않는다.
- [x] Temporary Git project의 tracked declaration과 exact root cwd가 built `ay_ple_interaction` Adapter를 시작하고 `["propose_state_patch"]` readiness를 통과한다.
- [x] Target thread start trace에 private MCP URL·token input, literal capability allowlist와 thread-start config override가 없다.
- [x] Runtime public contract, Python bridge와 exact SDK patch stack에 candidate-specific root나 additional `writableRoots` 전달 경로가 없다.
- [x] Existing current path와 Runtime package의 exact SDK, bridge, Node actual tests가 expand 단계 동안 green이다.

## 완료 당시 Verification

- Targeted: `npm run test:bridge -w @ay-ple/codex-chat-runtime`, `npm run test:node-actual -w @ay-ple/codex-chat-runtime`, `npm run test:runtime-local-provider` — 각각 bridge 23/23, Node actual 106/106, exact native local-provider 4/4 green. Root-owned local-provider gate가 built Adapter를 먼저 만들고 temporary trusted Git root의 tracked project config에서 readiness 성공과 wrong roster failure를 확인했다.
- Exact SDK: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` — deterministic source·wheel reproduction, router actual-child, official suite 160 passed/38 skipped, Ruff와 provenance 17/17 green.
- Production Runtime: `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` — bundle manifest 25/25, bridge 23/23, pre/post bundle verification과 Ruff green. Native `0.144.4`, Python `3.10.18`, 7-wheel roster와 bundle digest `19828344cdca52aa3b9e5788b2f3bb3078f49a0963c70ca02d74c510bdb08e24`를 확인했다.
- Repository: `npm run typecheck && npm run build && npm test && npm run lint -w @ay-ple/chat-shell` — 최종 코드 기준 전체 green.
- Review: Fixed point `cafc20dcae92062c41b641b38f9115efcdf23ec1` 기준 Standards 4건, Spec 0건이었다. Cross-workspace test orchestration과 patch ledger 위치를 `dd9b0aef1`에서 수정하고, production/testing readiness validation drift를 `1611d9575`의 shared helper와 회귀 테스트로 제거했다. Public interface consumer fixture 누락은 repository typecheck에서 발견해 `6a3d9f901`에서 보완했다. Private protocol의 다중 언어 변경은 exact Node/Python protocol tests로 고정하며 이번 slice에 code generation을 추가하지 않았다.

## 완료 당시 Result

`@ay-ple/codex-chat-runtime`이 최대 16-entry의 bounded generic child environment를 bridge와 native Codex child에 같은 generation으로 전달하고 protected authority override를 spawn 전에 거절한다. Public `CodexMcpReadinessPort`는 exact server/tool roster만 관찰하며 raw App Server·generated SDK shape를 숨긴다. Ordered SDK patch 0008은 official thread-scoped MCP status를 high-level seam으로 제공하고, real exact native trace는 tracked project declaration과 exact Git-root `cwd`만으로 built `ay_ple_interaction` Adapter를 시작해 readiness를 증명한다.

Implementation commits:

- `74c2904f8` — `feat: pass bounded runtime child environment`
- `ba1a85de0` — `feat: verify project MCP readiness`
- `7b89b4065` — `chore: align MCP SDK patch provenance`
- `c125187c3` — `test: cover MCP status patch provenance`
- `1611d9575` — `refactor: share MCP readiness validation`
- `dd9b0aef1` — `chore: align MCP verification ownership`
- `6a3d9f901` — `test: preserve runtime fixture compatibility`

## 검토 후 정정 (현재 결과)

완료 뒤 실제 process graph를 재검토한 결과, official `mcpServerStatus/list` 요청은 Product thread의 live Adapter를 관찰하지 않고 요청마다 별도 MCP manager와 임시 Adapter를 만들었다. 따라서 `CodexMcpReadinessPort`, `waitForMcpServerReady`, MCP status bridge command와 1초 polling을 live health 근거로 유지할 수 없었다. Ordered SDK patch `0008-thread-mcp-status`도 제거했으며 Runtime patch stack은 다시 일곱 단계다. 위 readiness 구현 commit과 당시 test 수치는 역사적 증거로 보존하지만 current public contract로 해석하지 않는다.

현재 유지되는 Runtime seam은 다음 두 가지다.

- 최대 16-entry의 bounded generic child environment를 bridge와 native child의 같은 generation에 전달하고 protected authority override를 pre-spawn 거절한다.
- Native sidecar의 effective MCP declaration을 `name`, `command`, `args`, name과 nullable `local | remote` source를 보존하는 `envVars`, `cwd`, `toolTimeoutSec`, static `env`, `enabled`, `required`, `enabledTools`, `disabledTools`의 bounded frozen shape로 투영하며 raw App Server·generated SDK shape를 package 밖으로 내보내지 않는다. 다른 user MCP의 sourced env var는 허용하고 Required Interaction declaration의 세 env var만 unsourced exact match한다.

Server는 이 projection으로 exact project declaration을 검증한다. Actual Adapter는 authenticated handshake 뒤 Broker가 accept한 held lifecycle channel을 열어 startup readiness를 증명하고, Broker의 synchronous `isLost()`와 `lost` signal이 registry acceptance와 active continuity를 닫는다. Runtime은 `@ay-ple/interaction-mcp`, capability 의미, Broker lifecycle과 live MCP health를 알지 않는다.

## Blocked By

- `./001-interaction-contract-and-built-adapter-foundation.md` — Interaction contract와 Built Adapter foundation
- `../2026-07-27-user-owned-semester-workspace-lifecycle/004-prepared-git-project-context-and-native-trust.md` — Prepared Git project context와 native trust

## Starting Points

- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/src/testing.unit.test.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/scripts/test_python_bridge.py`
- `packages/codex-chat-runtime/src/local-provider.actual.test.ts`
