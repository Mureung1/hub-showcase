# Runtime Harness Hardening

## 기존 에이전트 작업 분류 기록

- State: completed
- Surface: local-spec
- Next actor: none

## Completion

2026-07-11에 Issue 001-005의 구현, 회귀 검증과 후속 code review를 완료했다. 최종 구현 기준점은 `0b9c33b4`이며, 현재 구조와 남은 gap은 [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md)에서 관리한다.

| Slice | 완료 결과 | 구현 근거 |
| --- | --- | --- |
| Issue 001 | Real Express server와 Vite Inspector를 통과하는 deterministic Playwright lifecycle gate | `6306d27`, `47d3c6e` |
| Issue 002 | Schema v1 per-run JSON snapshot, async hydration과 completed-run restart 복원 | `d0bbf18`, `93357a0` |
| Issue 003 | 100ms streaming checkpoint, durability ordering과 interrupted-run recovery | `d8cd251`, `3f22320` |
| Issue 004 | Count/byte retention, terminal history clear와 active-run 보존 | `ff15054` |
| Issue 005 | Fail-closed startup/mid-run persistence, degraded HTTP/UI와 emergency diagnostic failure | `dd8fa41`, `673e318`, `0b9c33b` |

최종 검증에서 `npm test`, `npm run typecheck`, `npm run build`, Inspector lint와 Chromium desktop Playwright 6개 시나리오가 통과했다. 구성된 기존 인증을 사용한 live Codex HTTP/SSE parity도 prompt completion과 adapter-confirmed cancellation을 통과했으며 로그인이나 OAuth는 실행하지 않았다. Standards와 Spec 재검토의 actionable finding은 0건이다.

제품 runtime handoff는 이 PRD의 미완료 항목이 아니라 명시적인 후속 범위다.

## Problem Statement

> 이 절은 구현 기준점 `25c3c45` 당시의 문제 상태를 기록한다. 완료 후 live behavior는 구현 지도와 현재 코드 및 테스트에서 확인한다.

AY-PLE의 Runtime Harness는 FakeRuntimeAdapter와 CodexRuntimeAdapter로 prompt를 실행하고 취소하며, normalized lifecycle과 debug evidence를 HTTP/SSE를 통해 Runtime Inspector에 보여준다. Pinned Codex `0.144.0`을 사용하는 live parity command도 prompt 완료와 adapter-confirmed cancellation을 실제 server 경계에서 증명한다.

하지만 현재 RuntimeRunLog와 run history는 AgentRuntimeKernel의 process memory에만 존재한다. Server를 재시작하면 완료된 진단 기록이 사라지고, 재시작 당시 `running` 또는 `cancelling`이던 run의 의미도 남지 않는다. Runtime Inspector의 History는 영속 history처럼 보이지만 실제로는 현재 process의 memory view에 불과하다. Persistence가 실패했을 때 runtime을 계속 실행해도 되는지, 어떤 상태를 browser에 보여줄지, 저장된 record를 어떻게 제한하고 복구할지도 아직 executable contract로 고정되지 않았다.

Runtime Inspector에는 실제 browser와 real server를 함께 검증하는 테스트도 없다. Package와 server 테스트가 normalized lifecycle을 검증하더라도, prompt streaming, cancellation, failure, debug evidence, history 선택, browser reload, server restart hydration이 UI에서 함께 동작한다는 보장은 없다. 이 상태로 product runtime handoff를 시작하면 제품 기능이 소실 가능한 진단 기록과 검증되지 않은 browser wiring 위에 올라간다.

## Solution

RuntimeRunLog를 workspace-local, restart-surviving, bounded developer diagnostic data인 Runtime Diagnostic History로 만든다. AgentRuntimeKernel은 persistence seam, durability barrier, restart recovery와 degraded lifecycle 의미를 소유한다. Server는 per-run versioned JSON snapshot store, workspace path, retention 설정과 HTTP 조립을 소유한다. FakeRuntimeAdapter와 CodexRuntimeAdapter는 persistence를 알지 못하며 기존 normalized adapter contract를 유지한다.

각 run은 self-contained RuntimeRunLog snapshot으로 저장된다. 정상 lifecycle의 시작, cancellation, terminal 상태는 durability barrier를 통과한 뒤 외부에 공개한다. Streaming output과 debug evidence는 100ms 단위로 최신 snapshot을 coalesce하고 terminal 전에 flush한다. Server restart 때 남아 있는 non-terminal run은 partial output과 debug evidence를 보존한 normalized `failed` run으로 복구한다. Storage failure는 memory-only 정상 실행으로 숨기지 않고 runtime을 degraded로 전환한다.

Runtime Inspector는 hydrate된 history를 조회하고 terminal history를 명시적으로 비울 수 있다. Playwright browser integration은 real server와 FakeRuntimeAdapter를 사용해 prompt, cancellation, failure, debug evidence, history, reload와 restart recovery를 deterministic하게 검증한다. Live Codex parity는 별도의 opt-in gate로 유지한다.

## User Stories

1. AY-PLE 개발자로서, 완료된 RuntimeRunLog가 server 재시작 뒤에도 남기를 원한다. 그래야 이전 run의 parity와 failure evidence를 다시 검사할 수 있다.
2. AY-PLE 개발자로서, Fake와 Codex run이 같은 Runtime Diagnostic History에 저장되기를 원한다. 그래야 adapter별로 다른 history 도구를 배우지 않아도 된다.
3. AY-PLE 개발자로서, 각 저장 record가 prompt, status, output, error, normalized events, debug evidence와 timing을 모두 포함하기를 원한다. 그래야 다른 engine store 없이 run 하나를 독립적으로 진단할 수 있다.
4. AY-PLE 개발자로서, Runtime Diagnostic History가 Codex rollout JSONL이나 SQLite에 의존하지 않기를 원한다. 그래야 Fake run과 host-side failure도 같은 방식으로 보존할 수 있다.
5. AY-PLE 개발자로서, 새 run이 adapter를 실행하기 전에 started snapshot이 저장되기를 원한다. 그래야 process가 즉시 종료되어도 시작된 run의 흔적이 남는다.
6. AY-PLE 개발자로서, completed, cancelled, failed 상태가 저장된 뒤 browser에 공개되기를 원한다. 그래야 UI가 disk에는 없는 terminal 성공을 먼저 보여주지 않는다.
7. AY-PLE 개발자로서, streaming output마다 filesystem write가 발생하지 않기를 원한다. 그래야 긴 response가 과도한 I/O를 만들지 않는다.
8. AY-PLE 개발자로서, streaming checkpoint 사이 crash로 잃을 수 있는 evidence window가 짧고 명확하기를 원한다. 그래야 durability 비용과 손실 범위를 설명할 수 있다.
9. AY-PLE 개발자로서, terminal 전에는 pending output과 debug evidence가 반드시 flush되기를 원한다. 그래야 완료된 기록이 UI와 disk에서 같은 내용을 가진다.
10. AY-PLE 개발자로서, run ID가 process-local counter가 아니라 UUID이기를 원한다. 그래야 재시작 뒤 새 run이 기존 snapshot을 덮어쓰지 않는다.
11. AY-PLE 개발자로서, server가 `running` run을 발견하면 재실행하지 않고 `failed`로 복구하기를 원한다. 그래야 실행되지 않는 adapter 작업을 살아 있는 것처럼 표시하지 않는다.
12. AY-PLE 개발자로서, 재시작 복구가 partial output과 debug evidence를 보존하기를 원한다. 그래야 중단 직전까지 관측한 내용을 잃지 않는다.
13. AY-PLE 개발자로서, `cancelling` run도 재시작 뒤 normalized `failed`로 닫히기를 원한다. 그래야 확인되지 않은 cancellation을 성공으로 오해하지 않는다.
14. AY-PLE 개발자로서, restart recovery가 새로운 `abandoned` 상태를 만들지 않기를 원한다. 그래야 기존 RuntimeRunStatus consumer를 불필요하게 확장하지 않는다.
15. AY-PLE 개발자로서, history가 최신 terminal run 100개로 제한되기를 원한다. 그래야 workspace-local diagnostic data가 무한히 늘지 않는다.
16. AY-PLE 개발자로서, terminal history의 총 저장량이 100 MiB로 제한되기를 원한다. 그래야 verbose debug evidence가 workspace disk를 잠식하지 않는다.
17. AY-PLE 개발자로서, retention이 가장 오래된 terminal run부터 제거하기를 원한다. 그래야 최근 진단 근거를 우선 보존한다.
18. AY-PLE 개발자로서, active run이 retention 때문에 삭제되지 않기를 원한다. 그래야 실행 중인 lifecycle과 snapshot이 중간에 사라지지 않는다.
19. AY-PLE 개발자로서, terminal history를 명시적으로 비울 수 있기를 원한다. 그래야 오래된 diagnostic data를 안전하게 정리할 수 있다.
20. AY-PLE 개발자로서, history clear가 active run은 유지하기를 원한다. 그래야 정리 작업이 실행 중인 adapter를 취소하거나 손상시키지 않는다.
21. AY-PLE 개발자로서, snapshot 교체가 atomic하기를 원한다. 그래야 process crash가 canonical JSON을 반쪽짜리 파일로 만들 가능성을 줄인다.
22. AY-PLE 개발자로서, schema version이 명시되기를 원한다. 그래야 미래 format 변경을 묵시적으로 잘못 읽지 않는다.
23. AY-PLE 개발자로서, malformed record나 알 수 없는 schema version이 조용히 무시되지 않기를 원한다. 그래야 history 손상을 정상 상태로 오해하지 않는다.
24. AY-PLE server 운영자로서, history path와 retention 한도를 environment로 설정할 수 있기를 원한다. 그래야 product UI를 늘리지 않고 개발 환경별 저장 정책을 조정할 수 있다.
25. AY-PLE server 운영자로서, 잘못된 persistence 설정이 startup에서 명확히 실패하기를 원한다. 그래야 fallback memory mode로 몰래 실행되지 않는다.
26. AY-PLE 개발자로서, startup hydration과 recovery가 끝나기 전에 server가 ready가 되지 않기를 원한다. 그래야 초기 HTTP 요청이 불완전한 history를 보지 않는다.
27. AY-PLE 개발자로서, mid-run persistence failure가 해당 run을 중단하고 runtime을 degraded로 표시하기를 원한다. 그래야 저장되지 않는 실행을 성공처럼 계속하지 않는다.
28. AY-PLE 개발자로서, degraded runtime이 새 run을 거부하기를 원한다. 그래야 같은 storage failure 위에 진단 불가능한 run을 더 쌓지 않는다.
29. AY-PLE 개발자로서, persistence failure 뒤에도 현재 process의 in-memory log를 읽을 수 있기를 원한다. 그래야 실패 원인을 Runtime Inspector에서 확인할 수 있다.
30. AY-PLE 개발자로서, persistence error를 stable HTTP status와 error code로 받기를 원한다. 그래야 Inspector가 일반 validation failure와 storage outage를 구분할 수 있다.
31. AY-PLE 개발자로서, Runtime Inspector를 reload하면 server가 hydrate한 history가 다시 나타나기를 원한다. 그래야 browser state가 diagnostic history의 source of truth가 되지 않는다.
32. AY-PLE 개발자로서, hydrate된 history item을 선택해 full run log와 debug evidence를 볼 수 있기를 원한다. 그래야 restart 전 run도 현재 run과 같은 방식으로 검사할 수 있다.
33. AY-PLE 개발자로서, Inspector에서 terminal history를 clear하고 즉시 갱신된 목록을 보기를 원한다. 그래야 disk와 UI가 서로 다른 history를 보여주지 않는다.
34. AY-PLE 개발자로서, persistence degraded 상태가 Runtime Inspector에 명확히 나타나기를 원한다. 그래야 API 연결 성공을 runtime readiness로 잘못 해석하지 않는다.
35. AY-PLE 개발자로서, browser test가 실제 HTTP와 SSE를 통과해 prompt streaming을 검증하기를 원한다. 그래야 React state만 따로 검증하는 테스트에 의존하지 않는다.
36. AY-PLE 개발자로서, browser test가 cancellation과 failure 이후 running residue가 없음을 검증하기를 원한다. 그래야 UI가 terminal run을 계속 실행 중으로 표시하지 않는다.
37. AY-PLE 개발자로서, browser test가 normalized events와 debug evidence 표시를 검증하기를 원한다. 그래야 inspector의 핵심 관측 표면이 회귀하지 않는다.
38. AY-PLE 개발자로서, browser test가 같은 history directory를 사용한 server restart를 검증하기를 원한다. 그래야 Runtime Diagnostic History의 end-to-end 의미가 자동화된다.
39. AY-PLE 개발자로서, deterministic browser gate가 live Codex auth를 요구하지 않기를 원한다. 그래야 기본 test suite와 CI가 계정 상태에 의존하지 않는다.
40. AY-PLE product 개발자로서, hardening 이후에도 product code가 raw Codex history나 protocol type을 보지 않기를 원한다. 그래야 첫 product runtime handoff가 stable runtime contract만 소비한다.

## Implementation Decisions

- 이 PRD는 ADR 0003의 Runtime Harness 우선순위와 ADR 0004의 persistence ownership 결정을 구현한다.
- Runtime Diagnostic History는 developer-facing diagnostic data다. 학생-facing WorkspaceHistory, 영구 audit log, global Codex history가 아니다.
- AgentRuntimeKernel이 primary module seam이다. Kernel은 persistence timing, restart recovery, degraded lifecycle과 in-memory view를 소유한다.
- Server는 concrete per-run JSON store, workspace path, retention 값과 HTTP 조립을 소유한다. 두 번째 production consumer가 생기기 전에는 별도 storage package를 만들지 않는다.
- FakeRuntimeAdapter와 CodexRuntimeAdapter는 persistence interface를 알지 못하고 기존 AgentRuntimeAdapter role만 구현한다.
- RuntimeRunLog shape와 기존 normalized event vocabulary를 유지한다. Restart recovery를 위해 새 `abandoned` status나 raw-engine status를 추가하지 않는다.
- RuntimeRunLog persistence interface는 전체 record load, single record save, 지정 run ID 제거를 제공한다. Save 결과는 retention으로 제거된 run ID를 반환해 kernel memory와 disk view가 같게 유지되도록 한다.
- Runtime-core 테스트는 filesystem을 사용하지 않는 in-memory persistence implementation과 fault-injection implementation을 사용한다.
- AgentRuntimeKernel의 production construction은 async factory를 사용한다. Factory는 load, validation, recovery와 recovery snapshot 저장을 마친 뒤에만 ready kernel을 반환한다.
- Durability barrier를 건너는 `startRun`, `cancelRun`, terminal history clear는 async operation이 된다. `getRunLog`, `listRuns`, `waitForRun`, subscription과 adapter inventory read는 hydration 이후 in-memory read로 유지한다.
- Run ID는 UUID를 사용한다. Process-local sequential ID는 신규 run에 사용하지 않는다.
- Canonical snapshot 경로는 workspace-local `.ay-ple/runtime-harness/runs/<uuid>.json`이다.
- Snapshot envelope는 `schemaVersion`, `savedAt`, `log` 세 필드를 가진다. 최초 schema version은 정수 `1`, `savedAt`은 ISO 8601 UTC string, `log`는 self-contained RuntimeRunLog다.
- Loader는 canonical `.json` file만 읽고 envelope와 RuntimeRunLog의 필수 field, status, event sequence, run ID와 filename 일치를 구조적으로 검증한다.
- Malformed JSON, invalid record, filename mismatch와 지원하지 않는 schema version은 startup error다. 자동 삭제, 부분 복구, silent skip 또는 Codex-owned store fallback을 하지 않는다.
- 같은 directory의 temporary file에 UTF-8 JSON을 쓴 뒤 file을 flush하고 close한 다음 canonical path로 rename한다. Canonical file은 완성된 snapshot으로만 교체한다.
- Startup에서 남은 temporary file은 canonical history로 읽지 않고 best-effort로 정리한다. Temporary cleanup failure는 canonical load failure가 아니면 warning으로 남긴다.
- Started snapshot은 adapter `run`을 호출하기 전에 저장한다. Initial save가 실패하면 adapter를 실행하지 않고 start operation이 실패한다.
- `started`, `cancelling`, `completed`, `cancelled`, `failed` 상태 전이는 snapshot save 성공 뒤 caller와 subscriber에 공개한다.
- Output delta와 debug evidence는 memory와 subscriber에 즉시 반영하되 per-run serialized write queue에서 최대 100ms마다 최신 snapshot 하나를 저장한다. 지속 streaming 중에도 100ms window마다 checkpoint를 만들며 단순 trailing debounce로 무기한 미루지 않는다.
- Cancellation과 terminal transition은 pending streaming write를 먼저 flush한다. Terminal snapshot 저장이 끝나기 전에는 terminal event를 공개하거나 terminal waiter를 resolve하지 않는다.
- 정상 실행에서 crash로 손실 가능한 streaming evidence window의 목표 상한은 약 100ms다. OS와 filesystem 자체의 durability guarantee를 넘어서는 absolute zero-loss를 약속하지 않는다.
- Restart hydration은 stored run을 started time 순으로 memory에 복원한다. `running` 또는 `cancelling` record는 adapter를 재개하지 않는다.
- Non-terminal recovery는 기존 partial output, events와 debug evidence를 보존하고 다음 sequence의 normalized `failed` event를 추가한다. Error message는 `Runtime interrupted by server restart`로 고정한다.
- Recovery는 kernel debug entry에 previous status와 recovery reason을 남기고 recovery 시각을 completed time으로 사용한다. Recovered snapshot을 저장한 뒤에만 kernel이 ready가 된다.
- Production retention 기본값은 terminal run 최대 100개와 terminal envelope 총 104,857,600 bytes다.
- Retention은 terminal record만 대상으로 하고 completed time, started time, run ID 순으로 가장 오래된 record부터 제거한다. `running`과 `cancelling` snapshot은 자동 prune하지 않는다.
- 단일 envelope가 byte limit보다 크면 save failure로 처리한다. Oversized record를 즉시 지워 성공처럼 보이거나 newest terminal record만 예외로 무제한 보존하지 않는다.
- Retention은 startup hydration/recovery 뒤와 terminal save 뒤 적용한다. Store가 제거한 run ID는 같은 durability operation 안에서 kernel memory에서도 제거한다.
- Server setting은 `RUNTIME_HISTORY_DIR`, `RUNTIME_HISTORY_MAX_RUNS`, `RUNTIME_HISTORY_MAX_BYTES` environment variable로 제공한다. 기본 directory는 workspace-local path이고 numeric setting은 positive integer만 허용한다.
- Runtime Diagnostic History 설정은 Runtime Inspector product control로 노출하지 않는다.
- `DELETE /api/runtime/runs`는 terminal run만 disk와 memory에서 제거하고 `{ clearedRunIds }`를 반환한다. Active run은 유지한다.
- Start와 cancel endpoint는 async kernel operation을 await한다. 기존 성공 status와 response shape는 유지한다.
- Persistence unavailable 상태의 HTTP response는 status `503`과 `{ error, code: "runtime_persistence_unavailable" }` shape를 사용한다. Input validation과 unknown run은 기존 `400` 또는 `404` 의미를 유지한다.
- Startup load, validation 또는 recovery save가 실패하면 server는 listen하지 않고 원인과 record path를 stderr에 남긴다. Memory-only production fallback은 없다.
- Mid-run save failure는 kernel을 degraded로 전환하고 해당 adapter run을 abort한다. Subscriber가 running에 남지 않도록 current process memory에는 normalized `failed` event와 kernel `persistence_error` debug entry를 남긴다. 이 emergency terminal event 자체가 durable하다고 주장하지 않는다.
- Degraded kernel은 새 run, cancel mutation과 history clear를 거부하지만 existing in-memory history/log read는 허용한다.
- Health endpoint는 persistence `ready` 또는 `degraded` 상태를 포함한다. Degraded 상태에서는 HTTP `503`을 사용하고 마지막 persistence error를 제공한다.
- Inspector는 server history를 source of truth로 사용한다. Browser reload 때 history와 selected log를 server에서 다시 읽고 client storage에 RuntimeRunLog를 복제하지 않는다.
- Inspector History panel은 terminal history clear command를 제공한다. Familiar trash icon과 tooltip을 사용하고 terminal history가 없을 때 disabled 상태를 보인다.
- Clear 성공 뒤 history와 selected log를 server response에 맞게 갱신한다. Active run이 있으면 transcript와 control은 유지한다.
- Inspector는 persistence degraded health를 API unavailable과 구분해 표시하고 새 run control을 disabled 처리한다.
- Browser가 server restart를 자동으로 투명하게 복구하는 reconnect protocol은 추가하지 않는다. Reload 뒤 hydrate된 history와 recovered failed run을 정확히 보여주는 것을 이번 기준으로 삼는다.
- Playwright는 Chromium desktop viewport `1440x900`을 기본 검증 대상으로 사용한다.
- Playwright test는 real Express server와 FakeRuntimeAdapter를 사용한다. Restart scenario는 같은 temporary history directory로 server process를 다시 시작한다.
- Live Codex parity command는 현재 opt-in verification surface로 유지하며 Playwright나 기본 CI browser gate에 포함하지 않는다.
- Codex package pin, generated protocol, model default policy와 live parity semantics는 이 PRD에서 변경하지 않는다.

## Testing Decisions

- 가장 높은 안정 seam인 AgentRuntimeKernel behavior를 먼저 테스트한다. Store method 호출 횟수나 private queue 구조보다 caller가 관측하는 durability ordering, recovery, degraded state와 history 결과를 검증한다.
- Runtime-core test는 started snapshot이 adapter 실행보다 먼저 저장되는지, terminal state가 save 뒤 공개되는지, streaming write가 coalesce되는지, terminal flush가 pending evidence를 포함하는지 검증한다.
- Runtime-core test는 UUID collision 없이 hydrate된 history에 새 run을 추가하는 behavior를 검증한다.
- Runtime-core recovery test는 stored `running`과 `cancelling` record가 partial output/debug를 보존한 `failed` record로 저장되고 event sequence가 이어지는지 검증한다.
- Runtime-core fault test는 initial save, streaming save, cancelling save, terminal save, clear failure를 각각 주입해 adapter start 방지, abort, degraded transition, mutation rejection과 readable in-memory evidence를 검증한다.
- Runtime-core retention synchronization test는 store가 반환한 pruned run ID가 kernel `listRuns`와 `getRunLog`에서도 사라지는지 검증한다.
- Server storage integration test는 temporary directory를 사용해 schema version 1 round trip, atomic replacement, stale temporary cleanup, UUID filename validation과 deterministic ordering을 검증한다.
- Storage integration test는 malformed JSON, invalid envelope, unknown schema version, filename mismatch와 oversized record가 명시적으로 실패하는지 검증한다.
- Retention integration test는 terminal count 100개, terminal bytes 100 MiB, oldest-first prune와 active record 보존을 작은 injected limit으로 빠르게 검증한다.
- Atomicity test는 write 또는 rename failure를 주입해 이전 canonical snapshot이 손상되지 않는지 검증한다.
- Server API test는 async start/cancel success shape가 유지되는지, history가 restart 뒤 hydrate되는지, clear가 terminal만 제거하는지 검증한다.
- Server API test는 startup persistence failure가 app startup을 막고, mid-run failure 이후 health와 mutation endpoint가 `503` 및 stable error code를 반환하는지 검증한다.
- Server API test는 degraded 상태에서도 existing run log와 history read가 가능한지 검증한다.
- Inspector browser test는 실제 HTTP/SSE를 통해 Fake prompt streaming, completed transcript, normalized event list와 debug evidence를 검증한다.
- Inspector browser test는 Fake cancellation과 deterministic failure가 terminal UI와 history에 반영되고 running residue가 남지 않는지 검증한다.
- Inspector browser test는 browser reload 후 persisted history와 full log가 다시 표시되는지 검증한다.
- Inspector browser test는 same history directory를 사용한 server restart 뒤 이전 non-terminal run이 recovered `failed`로 표시되는지 검증한다.
- Inspector browser test는 terminal history clear와 active-run 보존을 검증한다.
- Browser test는 live Codex, OAuth, global Codex home, network model behavior에 의존하지 않는다.
- Existing fake Codex app-server tests, server HTTP/SSE tests와 live Codex parity command는 회귀 검증으로 계속 유지한다.
- PR-ready verification은 `npm test`, `npm run typecheck`, `npm run build`, Inspector lint, deterministic Playwright suite를 포함한다. Live Codex parity는 auth가 구성된 환경에서 별도 opt-in으로 실행한다.

## Out of Scope

- AY-PLE SourceSelection, StatePatch, EvidenceRef, Review, TrustedState, MarkdownProjection behavior 구현.
- 학생-facing WorkspaceHistory, Git-backed checkpoint, diff, rollback UX 구현.
- Runtime Diagnostic History를 cloud sync, multi-user audit log 또는 permanent archive로 확장.
- Codex rollout JSONL, `history.jsonl`, Codex SQLite schema를 읽거나 AY-PLE history record로 참조.
- AY-PLE-owned SQLite repository 또는 append-only JSONL journal 도입.
- Existing RuntimeRunLog를 normalized relational schema로 분해.
- Non-terminal adapter run resume 또는 process crash 뒤 Codex thread 자동 재연결.
- 새로운 `abandoned` runtime status 추가.
- Runtime Inspector의 transparent server reconnect protocol.
- Live Codex browser automation과 CI authentication setup.
- `gpt-5.6-sol` 또는 다른 model의 명시적 pin, model selection UI, model catalog endpoint.
- Runtime Inspector를 student-facing product UI나 general-purpose chat application으로 전환.
- Mobile 또는 small-screen responsive layout.
- 이 PRD를 위한 GitHub Issue, pull request 또는 upstream camp submission 생성.

## Further Notes

- 이 PRD는 `RuntimeRunLog`를 durable storage guarantee와 혼동하지 않도록 `Runtime Diagnostic History`라는 canonical term을 사용한다.
- ADR 0004가 storage architecture의 source of truth다. 이 PRD는 ADR이 의도적으로 미룬 schema version, batching, retention, failure HTTP contract와 browser acceptance를 구체화한다.
- CodexRuntimeAdapter Parity Gate는 pinned Codex `0.144.0`을 대상으로 이미 repeatable server HTTP/SSE command로 통과했다. Hardening은 parity를 대체하지 않고 그 diagnostic evidence를 restart-surviving하게 만든다.
- 이 PRD의 구현 기준점은 commit `25c3c45`다.
- 최종 구현 기준점은 commit `0b9c33b4`다.
- 작성 시 working branch는 `codex/w1d5`이며 worktree는 clean하다.
- 구현은 여러 session으로 나누고, 이 PRD에서 생성한 각 local issue를 fresh context의 `/implement`에 전달한다.
- Product runtime handoff는 hardening과 deterministic browser gate가 끝난 뒤 별도 `/grill-with-docs`에서 다룬다.
- Matt Pocock local PRD는 camp submission PR template이나 GitHub issue가 아니다.
