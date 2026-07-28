# 007 — Joint public cutover

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

검증된 prepared SemesterWorkspace startup·reopen lifecycle과 InteractionCapability vertical을 AY-PLE의 유일한 public product composition으로 atomic 전환한다. 사용자는 App 실행 전에 준비한 Git workspace에서 일반 AY Chat을 시작하고 inline Semantic Review에 답하며, exact Interaction declaration이나 actual Adapter lifecycle이 준비되지 않으면 registry active pointer가 바뀌거나 workspace가 active처럼 보이지 않는 일관된 Browser experience를 받는다.

## Spec Traceability

- User stories: 1–10
- Implementation contract: `Compatibility and Migration`, `Runtime startup assumption`, `Review round trip`, `Failure Behaviour`

## 완료 당시 Slice-Specific Constraints

- Cutover 전 rollback unit은 current source, matching current store와 Runtime graph 전체다. Target Server만 old Browser와 조합하거나 target Browser를 old academic Runtime과 조합하는 half-state를 만들지 않는다.
- Blocker Workspace vertical의 canonical prepared Git root, registry reopen·prepared-root relaunch recovery와 required startup을 ticket 006의 Interaction trace와 한 public composition에서 결합한다.
- First open과 학기 변경은 explicit `--workspace` prepared root를 사용하고, 인자 없는 후속 실행만 registry active pointer를 reopen한다. App 내부 chooser·init·candidate transition을 public path로 복원하지 않는다.
- Shared listener·Broker preparation → exact-root Workspace Runtime → Adapter handshake → exact MCP readiness → registry active pointer commit ordering을 지킨다. Interaction 없는 degraded Workspace Runtime을 정상으로 열지 않는다.
- Public AY Chat은 project-discovered Skill·MCP와 generic Runtime environment를 사용하고 thread-start private MCP override, managed Skill root와 App-owned academic apply를 사용하지 않는다.
- Inline Review endpoint·NDJSON frame과 Browser card는 ticket 005의 target wire만 사용한다. Old patch/revision/replay/continuation semantics를 compatibility alias로 투영하지 않는다.
- Old academic routes·UI·store 구현은 다음 contraction ticket까지 source에 남을 수 있지만 public router와 Browser composition에서는 target과 동시에 활성화하지 않는다.
- Existing v2/v3 workspace bytes를 target v4로 자동 변환·rewrite하거나 삭제하지 않는다. 선택 실패와 Runtime failure는 previous active workspace와 honest recovery state를 보존한다.
- App shutdown, explicit prepared-root relaunch와 Browser disconnect는 Broker intake, pending call, Runtime credential와 operation lease를 bounded ordering으로 정산한다.

## 완료 당시 Acceptance Criteria

- [x] Production entrypoint와 default Browser route가 pre-App prepared Workspace startup·normal AY Chat·inline Semantic Review composition만 연다.
- [x] Registry active pointer commit은 exact project MCP declaration, authenticated Adapter handshake와 required `propose_state_patch` readiness가 모두 green일 때만 발생한다.
- [x] Browser에서 proposal → accept/revise/reject → same Turn result → AY-owned actual file mutation behavior가 ticket 006과 동일하게 동작한다.
- [x] Missing/stale Adapter, ignored project config, wrong roster, Broker offline과 Runtime terminal이 degraded success나 false active state 없이 target recovery로 나타난다.
- [x] Public Browser가 old Course/material/First Assignment action/retry와 patch/revision Review wire를 target path와 함께 사용하지 않는다.
- [x] Registry reopen·explicit prepared-root relaunch, Browser disconnect와 App shutdown이 cross-workspace thread, stale credential, pending call과 orphan process를 남기지 않는다.
- [x] Atomic cutover 전후의 rollback boundary와 current code의 후속 contraction 대상이 implementation map 또는 owning package 문서에 정확히 기록된다.

## 완료 당시 Verification

| 구분 | 결과 |
| --- | --- |
| Target contract·Server·Browser | `npm test -w @ay-ple/product-contract` 23개, `npm test -w @ay-ple/server` 195개, `npm test -w @ay-ple/chat-shell` 48개 통과. 각 workspace typecheck와 Chat Shell lint 통과 |
| Target desktop E2E | `prepared-public-cutover.spec.ts`, `workspace-lifecycle-target.spec.ts`와 donor entry 1개를 함께 실행해 accept·revise·reject, recovery, registry reopen·explicit relaunch를 1440px desktop에서 확인. 전체 `npm run test:e2e`는 Chat Shell 36개와 camp demo 8개 통과 |
| Actual·process smoke | `npm run test:prepared-workspace-product-actual`이 Bootstrap Git root→built Adapter/Broker→Review→AY-owned checkpoint를 통과. `npm run test:product-entrypoint`가 canonical `npm run dev`의 deliberate missing Adapter `adapter_handshake` recovery, registry non-commit, target Browser, legacy route 차단, SIGINT process-group·port cleanup을 통과 |
| Production bundle exclusion | build 결과에서 old academic route, Review identity, private Broker credential과 `materials` Chat field가 없음을 확인 |
| Repository gate | `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime && npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:docs-links` 최종 재실행 통과. 직전 실행의 local-provider cleanup deadline 1회 transient failure는 해당 gate 단독 재실행과 전체 명령 재실행에서 모두 통과 |
| Code review | fixed point `50c0ed212ad758a268cabeb4fd0a48407cf08a1f` 기준 Standards·Spec 병렬 review와 수정 후 재검토에서 actionable finding 없음 |

## 완료 당시 Result

Prepared Workspace startup/reopen과 InteractionCapability vertical을 canonical Server·Browser·Runtime public graph로 함께 전환했다. Default Browser는 target-only Chat·Semantic Review contract만 사용하고 old academic graph는 별도 donor HTML entry로 격리했다. Canonical host는 Runtime·Adapter failure 뒤에도 listener-backed recovery를 유지하며 registry authority를 readiness 이후에만 commit하고, target Chat wire는 material-free exact contract를 사용한다. Rollback unit과 후속 academic contraction 경계는 owning README와 implementation map에 기록했다.

구현 commit:

- `df8ba94d163d6d83ef63b92e2cb37881611d5cdd` — `feat: cut over prepared workspace product path`
- `8bdfffe2351ee9bda77754202fe209ca61e546c6` — `docs: record prepared workspace public cutover`
- `d83dabed74925e9663e8a0bd7fc41abe0221deb5` — `fix: isolate prepared public product graph`
- `941b3fdf8be4e269c0576bdeab4ea316a6ebe3e3` — `docs: clarify prepared cutover boundaries`
- `f53d82bf0cc761fecb8fe2abe664c53fef24c3df` — `test: verify prepared entrypoint recovery`

## 검토 후 정정 (현재 결과)

Public cutover 자체와 Browser·Router contraction 결과는 유지된다. 다만 완료 당시의 “exact MCP readiness”는 official status polling이 실제 Product Adapter와 다른 임시 Adapter를 관찰한다는 후속 검토 결과로 대체됐다. Current startup ordering은 shared listener·Broker 준비 → exact-root Runtime과 native thread start → full effective MCP declaration 검증 → actual Adapter handshake와 held lifecycle channel acceptance → fresh thread context → registry transaction acceptance다. Acceptance를 통과한 startup thread는 `CodexChatService`의 Product Turn thread로 그대로 전달되며 health-only thread나 두 번째 Product thread를 만들지 않는다.

Broker의 Adapter status가 startup readiness와 active continuity의 단일 authority다. Loss는 `isLost()`에서 동기적으로 latch되어 registry acceptance race를 닫고, active 뒤 unexpected lifecycle EOF는 pending Review를 `transport_failed`로 정산한 뒤 `runtime_unavailable` recovery로 전환한다. Runtime terminal은 `runtime_terminated`, App shutdown은 expected lifecycle close로 구분한다. Exact declaration은 `command`·`args`·`env_vars`·`cwd`·`tool_timeout_sec`·static `env`·`enabled`·`required`·`enabled_tools` 전체와 empty `disabled_tools`를 확인한다. 위 commit·검증 표는 완료 당시 cutover evidence로 보존하며 current lifecycle regression은 Server·Interaction package·canonical entrypoint gate가 소유한다.

## Blocked By

- `./006-prepared-temporary-git-workspace-product-trace.md` — Prepared temporary Git workspace product trace
- `../2026-07-27-user-owned-semester-workspace-lifecycle/008-registry-reopen-prepared-root-relaunch-recovery.md` — Registry reopen·prepared-root relaunch·recovery

## Starting Points

- `apps/server/src/server-application.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/codex-chat.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/server-development.ts`
- `apps/server/src/server-application.test.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-product-chat.ts`
- `apps/chat-shell/src/product-chat-presentation.tsx`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/workspace-recovery.spec.ts`
- `scripts/product-local.mts`
- `docs/architecture/codex-chat-implementation-map.md`
