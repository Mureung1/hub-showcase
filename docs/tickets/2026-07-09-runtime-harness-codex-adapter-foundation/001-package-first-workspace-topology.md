## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent

`docs/specs/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

Runtime Harness를 제품 layer와 분리해서 키울 수 있도록 repository를 package-first workspace topology로 정리한다. 기존 starter app의 health/dev/build/typecheck 흐름은 보존하면서, 이후 Runtime Inspector와 runtime package들이 `apps/*`와 `packages/*` 경계에서 자랄 수 있는 최소 기반을 만든다.

이 slice는 package만 나열하고 끝나는 구조 변경이 아니라, 새 topology에서도 기존 앱이 실행/검증 가능한 상태를 유지하는 prefactor다. AY-PLE product package는 placeholder 이상으로 구현하지 않는다.

## Acceptance criteria

- [x] npm workspace가 `apps/server`, `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex`를 포함하는 구조를 인식한다.
- [x] 기존 Express health API와 Vite React 화면에 해당하는 기능이 새 topology에서도 동작하거나, 새 app 이름으로 동일한 smoke path가 제공된다.
- [x] root `dev`, `build`, `typecheck` 계열 명령이 새 workspace 이름을 기준으로 동작한다.
- [x] root `README.md`에는 `docs/tickets/` 산출물을 인덱싱하지 않는다.
- [x] AY-PLE product package가 생성되더라도 behavior 구현 없이 boundary reservation 수준에 머문다.

## Blocked by

None - can start immediately
