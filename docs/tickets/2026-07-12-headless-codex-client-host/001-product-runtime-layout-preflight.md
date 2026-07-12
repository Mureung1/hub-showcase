# 001 — 제품 runtime layout을 spawn 전에 검증한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

## Acceptance Criteria

- [ ] Valid한 세 root가 canonical layout, package-owned binary, `codexHome`, `codexSqliteHome`과 exact `workspaceRoot`를 반환한다.
- [ ] Relative path, missing/non-directory `packageRoot` 또는 `workspaceRoot`, missing/non-executable binary와 pin mismatch가 spawn 이전의 typed failure로 거부된다.
- [ ] 같은 root, 직접 containment와 양방향 ancestor·descendant 관계가 모두 거부된다.
- [ ] Symlink 또는 다른 lexical spelling으로 숨긴 overlap도 canonical comparison으로 거부된다.
- [ ] Runtime-home pair 준비 실패는 configuration을 바꾸기 전 재시도할 수 없는 failure class로 분류할 수 있다.
- [ ] Product layout API 어디에도 `process.cwd()`, 전역 `PATH`, 독립적인 home override fallback이 없다.
- [ ] 기존 `CodexRawClient`와 Runtime Harness의 default/override 동작과 테스트가 회귀하지 않는다.
- [ ] 구현된 현재 동작을 관련 package README 또는 구현 지도에 반영하되 미래 Host 동작을 구현된 것처럼 기록하지 않는다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — temporary roots와 fake package binary를 사용하는 결정적 contract test가 소유한다.

## Blocked By

None — can start immediately.

## Starting Points

- `packages/runtime-codex/src/raw-client.ts`의 binary/runtime-home resolver와 기존 Harness defaults
- `packages/runtime-codex/src/status.ts`의 package pin 관측
- `packages/runtime-codex/src/raw-client.test.ts`와 `packages/runtime-codex/src/status.test.ts`
- `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md`
- `docs/architecture/codex-runtime-isolation.md`
