## Agent triage

- State: completed
- Surface: local-issue
- Next actor: none

## Parent

`docs/prds/2026-07-10-runtime-harness-hardening.md`

## What to build

Real server와 FakeRuntimeAdapter를 사용하는 deterministic Playwright gate를 만든다. Browser에서 prompt streaming, cancellation, deterministic failure, normalized event, debug evidence와 현재 process의 history를 실제 HTTP/SSE 경계로 검증한다. 이 slice는 persistence를 추가하기 전 현재 Runtime Inspector behavior를 잠그고, 이후 restart와 degraded scenario가 재사용할 browser harness를 제공한다.

대상 user stories: 35, 36, 37, 39.

## Acceptance criteria

- [x] `npm run test:e2e` 한 명령으로 browser gate를 실행할 수 있고, test runner가 real server와 Inspector의 startup 및 cleanup을 소유한다.
- [x] Playwright는 기존 root dependency를 사용하고 Chromium desktop `1440x900` viewport를 기본 대상으로 한다.
- [x] Test runtime은 FakeRuntimeAdapter만 사용하며 live Codex auth, network model behavior, global Codex home에 의존하지 않는다.
- [x] Prompt scenario가 browser에서 run을 시작하고 SSE `started`, 하나 이상의 `output_delta`, `completed`와 completed transcript를 확인한다.
- [x] Cancellation scenario가 진행 중인 Fake run을 취소하고 terminal `cancelled` 상태와 history를 확인하며 `running` 또는 `cancelling` residue를 남기지 않는다.
- [x] Failure scenario가 deterministic Fake failure를 실행하고 normalized `failed` event, error display와 failed history item을 확인한다.
- [x] Browser에서 normalized event list, selected run log와 debug evidence가 실제 server response에 맞게 표시되는지 검증한다.
- [x] Test가 사용하는 port, process와 temporary state는 성공과 실패 모두에서 정리되며 다음 실행에 영향을 주지 않는다.
- [x] 기존 unit/server test, typecheck, build와 Inspector lint가 계속 통과한다.

## Implementation outcome

| 항목 | 결과 |
| --- | --- |
| 완료일 | 2026-07-11 |
| 구현 | 실제 Express child process와 Vite Inspector를 임시 port에서 실행하고 prompt, cancellation, deterministic failure, normalized events, debug evidence와 in-process history를 검증한다. |
| 커밋 | `6306d27`, `47d3c6e` |
| 검증 | 현재 `npm test`에 포함된 Chromium desktop Playwright 6개 시나리오와 root typecheck/build, Inspector lint 통과 |
| 리뷰 | Standards 및 Spec actionable finding 0건 |

## Blocked by

None - can start immediately
