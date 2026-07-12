# 001 — 제품 runtime layout을 spawn 전에 검증한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: implementation agent

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

제품 실행 caller가 명시적인 `packageRoot`, `appDataRoot`, `workspaceRoot`를 전달하면 package-owned pinned Codex binary, 하나의 app-managed runtime-home pair와 정확한 workspace `cwd`를 포함한 검증된 layout을 얻는다. 잘못되거나 겹치는 root와 pin 불일치는 child process를 만들기 전에 결정적인 typed failure로 거부된다.

이 slice는 이후 Host lifecycle이 암묵적인 `process.cwd()`, 전역 `PATH` 또는 developer-only Harness 기본 경로에 의존하지 않게 하는 독립적인 product layout seam을 제공한다. 기존 Runtime Harness의 경로와 override 동작은 바꾸지 않는다.

## Spec Traceability

- User stories: 1, 7
- Implementation contract: `Product runtime layout`, `Failure Behaviour`의 root·binary failure, `Compatibility and Migration`

## Slice-Specific Constraints

- 세 root는 absolute·normalized path여야 하며 canonical target을 기준으로 pairwise distinct이고 서로 ancestor·descendant 관계가 아니어야 한다.
- Existing path와 symlink는 실제 target을 기준으로 비교한다. lexical path가 다르다는 이유로 overlap을 허용하지 않는다.
- `workspaceRoot`는 caller가 명시한 existing directory여야 한다. `process.cwd()` fallback을 만들지 않는다.
- `packageRoot`에서 package-owned Codex binary를 찾고 package pin과 version을 확인한다. 전역 `PATH` fallback은 없다.
- `CODEX_HOME`과 `CODEX_SQLITE_HOME`은 `appDataRoot` 아래의 분리할 수 없는 pair로 계산한다. 한쪽만 바꾸는 product override를 추가하지 않는다.
- 이 ticket은 child process, Host lifecycle, thread·turn과 browser adapter를 구현하지 않는다.
- Layout만 구현했다는 이유로 method integration을 `client-host`로 승격하지 않는다.
- Root·binary의 canonical inspection과 package metadata read/parse·pin lookup을 포함한 모든 internal failure는 stable `ProductRuntimeLayoutError`로 wrapping한다.

## Acceptance Criteria

- [x] Valid한 세 root가 canonical layout, package-owned binary, `codexHome`, `codexSqliteHome`과 exact `workspaceRoot`를 반환한다.
- [x] Relative path, missing/non-directory `packageRoot` 또는 `workspaceRoot`, missing/non-executable binary와 pin mismatch가 spawn 이전의 typed failure로 거부된다.
- [x] 같은 root, 직접 containment와 양방향 ancestor·descendant 관계가 모두 거부된다.
- [x] Symlink 또는 다른 lexical spelling으로 숨긴 overlap도 canonical comparison으로 거부된다.
- [x] Runtime-home pair 준비 실패는 configuration을 바꾸기 전 재시도할 수 없는 failure class로 분류할 수 있다.
- [x] Product layout API 어디에도 `process.cwd()`, 전역 `PATH`, 독립적인 home override fallback이 없다.
- [x] 기존 `CodexRawClient`와 Runtime Harness의 default/override 동작과 테스트가 회귀하지 않는다.
- [x] 구현된 현재 동작을 관련 package README 또는 구현 지도에 반영하되 미래 Host 동작을 구현된 것처럼 기록하지 않는다.
- [x] Root·binary의 `realpath()` 뒤 `stat()` failure와 package metadata read/parse 또는 dependency pin 누락이 plain `Error`로 빠지지 않는다.

## Verification

- Targeted test: `npm run test -w @ay-ple/runtime-codex` — 통과, 46 tests.
- Repository test: `npm test` — 통과. `runtime-core` 50 tests, `runtime-codex` 46 tests, server 53 tests와 Inspector Playwright 6 tests가 모두 통과했다.
- Repository checks: `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector` — 모두 통과.
- Code review: fixed point `a4b77aea144d90d30a3581ca1fff01348649f79b` 기준 Standards 2건과 Spec 2건을 확인했고 `1b15599e`에서 모두 반영했다.
- Manual or live smoke: 없음 — temporary roots와 fake package binary를 사용하는 결정적 contract test가 소유한다.

## Result

`prepareProductRuntimeLayout()`과 `ProductRuntimeLayoutError`를 `@ay-ple/runtime-codex` 공개 API로 추가했다. 이 seam은 명시적인 세 root를 canonical 대상으로 검증하고, package 안의 실행 가능한 Codex binary가 정확한 package pin과 일치하는지 확인하며, `appDataRoot` 아래에서 빠져나갈 수 없는 `codex/home`·`codex/sqlite` pair를 준비한다. 모든 구성 실패는 `recoverable: false`인 안정적인 code로 분류된다.

Follow-up hardening은 root·binary의 canonical target을 읽은 뒤 발생하는 filesystem inspection failure도 기존 stable code로 wrapping하고, package metadata read/parse와 `@openai/codex` dependency pin 누락을 `package_pin_unreadable`로 분류한다.

기존 `CodexRawClient`와 Runtime Harness의 repository-local default, 독립 override와 단일-run 동작은 변경하지 않았다. 현재 구현 범위와 아직 연결하지 않은 Host lifecycle은 package README와 Runtime Harness 구현 지도에 구분해 기록했다.

구현 커밋:

- `e13807b3` — `feat: validate product runtime layout`
- `eb0230ff` — `docs: record product runtime layout preflight`
- `1b15599e` — `fix: harden product layout preflight`

## Blocked By

None — can start immediately.

## Starting Points

- `packages/runtime-codex/src/raw-client.ts`의 binary/runtime-home resolver와 기존 Harness defaults
- `packages/runtime-codex/src/status.ts`의 package pin 관측
- `packages/runtime-codex/src/raw-client.test.ts`와 `packages/runtime-codex/src/status.test.ts`
- `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md`
- `docs/architecture/codex-runtime-isolation.md`
