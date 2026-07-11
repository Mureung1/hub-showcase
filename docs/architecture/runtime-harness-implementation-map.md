# Runtime Harness 구현 지도

작성일: 2026-07-09
최근 검증: 2026-07-11
상태: 활성
관련 문서: [Runtime Harness와 Codex Adapter 기반 PRD](../prds/2026-07-09-runtime-harness-codex-adapter-foundation.md), [Runtime Harness Hardening PRD](../prds/2026-07-10-runtime-harness-hardening.md), [Runtime Harness ADR](../adr/0003-build-runtime-harness-before-product-layer.md), [실행 이력 저장소 ADR](../adr/0004-split-runtime-history-semantics-from-workspace-storage.md), [4주 제품의 Codex App Server 우선 사용 ADR](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), [제품 실행 경로 분리 ADR](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)

## 목적

Runtime Harness와 Codex adapter 기반이 빠르게 구현된 뒤, 현재 코드가 어떤 모듈과 경계로 구성되어 있는지 한눈에 이해할 수 있게 정리한다. 이 문서는 PRD의 요구사항을 다시 쓰는 문서가 아니라, 구현 이후의 실제 지도를 기록하는 기술 구조 문서다.

AGENTS.md는 안정적인 작업 규칙과 이 문서로 향하는 포인터만 유지한다. Runtime Harness의 구성, 엔드포인트, adapter 동작, 생성된 protocol 세부사항, 알려진 gap이 바뀌면 이 문서나 package README를 업데이트하고, 최종 판단은 항상 현재 코드와 테스트를 읽어 확인한다.

## 현재 결론

| 질문 | 현재 답 |
| --- | --- |
| Runtime Harness의 중심 경계는 어디인가? | `packages/runtime-core`의 `AgentRuntimeKernel`이다. 외부는 `RuntimeRunEvent`, `RuntimeRunLog`, 어댑터 설명, 실행 이력을 본다. 이 답은 단일 실행 개발자 Harness 범위이며 제품 전체 상호작용 경계를 뜻하지 않는다. |
| Fake와 Codex는 같은 계약을 만족하는가? | 둘 다 `AgentRuntimeAdapter`를 구현하고 kernel에 `output_delta`, `completed`, `cancelled`, `failed`, `debug_log` adapter event를 전달한다. |
| 브라우저가 Codex app-server와 직접 통신하는가? | 아니다. `apps/server`가 kernel과 adapters를 소유하고, `apps/inspector`는 HTTP와 SSE만 사용한다. |
| raw Codex protocol type이 제품/core로 새는가? | 현재 생성된 Codex type은 `packages/runtime-codex/src/internal/` 아래에 있고 `runtime-core`, server, inspector의 안정 계약으로 다시 export되지 않는다. |
| Runtime Inspector는 제품 UI인가? | 아니다. prompt, transcript, status, events, raw/debug log, history, capability slots를 보는 개발자용 엔진 관측 표면이다. |
| run log는 영속적인가? | server-owned schema v1 per-run JSON snapshot으로 저장된다. Streaming evidence는 run별 최대 100ms fixed-window checkpoint로 저장되며, server restart 때 `running`/`cancelling` record는 ready 이전에 normalized `failed`로 복구된다. Terminal history는 count와 UTF-8 canonical envelope bytes로 제한되고 명시적으로 clear할 수 있다. 실행 중 persistence failure는 affected run을 non-durable `failed`로 닫고 kernel을 degraded로 전환한다. |
| 4주 제품 실행 엔진 방향은 무엇인가? | Codex App Server만 우선 지원한다. ACP와 다중 엔진 동작 일치는 미루고, 이어지는 세션과 세부 제어·이벤트를 CoControl 제품 수직 흐름에 연결한다. |

## 구성

| 위치 | 역할 | 공개 표면 | 중요한 내부 |
| --- | --- | --- | --- |
| `packages/runtime-core` | runtime 생명주기의 안정 계약과 kernel | `AgentRuntimeKernel`, `AgentRuntimeAdapter`, `RuntimeRunEvent`, `RuntimeRunLog`, `RuntimeRunLogPersistence`, persistence state, run summary/history | async hydration/recovery gate, run별 coalesced checkpoint, durability barrier, sticky degraded state, non-durable emergency failure, in-memory read view, subscriber 관리, cancellation mode 처리 |
| `packages/runtime-fake` | 검사용 결정적 adapter | `FakeRuntimeAdapter` | run 시작 debug evidence, 지연된 output 조각, `failNextRun()` 실패 시나리오, abort 기반 즉시 취소 |
| `packages/runtime-codex` | Codex app-server 통합 package | `CodexRuntimeAdapter`, `CodexRawClient` wrapper type, status/smoke helper, capability slots | 생성된 app-server protocol type, stdio JSONL transport, app-owned runtime home, raw/debug log |
| `apps/server` | 브라우저에 안전한 로컬 companion host | `/api/runtime/*`, `/api/runtime/runs/:id/events` SSE, `/api/runtime/codex/*` | fake/codex adapters와 ready kernel 조립, workspace-local per-run JSON snapshot store |
| `apps/inspector` | 개발자용 Runtime Inspector | adapter 선택, prompt, transcript, events, run log, history, Codex status, capability slots를 보는 React UI | server endpoint만 소비하며 app-server stdio와 직접 통신하지 않음 |

## Runtime 흐름

```mermaid
flowchart LR
  Inspector["Runtime Inspector (브라우저)"]
  Server["apps/server Express API"]
  Kernel["AgentRuntimeKernel"]
  History["Runtime Diagnostic History<br/>per-run JSON snapshots"]
  Fake["FakeRuntimeAdapter"]
  CodexAdapter["CodexRuntimeAdapter"]
  RawClient["CodexRawClient"]
  AppServer["Codex app-server stdio"]

  Inspector -->|"POST /api/runtime/runs"| Server
  Inspector -->|"EventSource /events"| Server
  Server --> Kernel
  Kernel -->|"load / save / remove"| History
  Kernel -->|"AgentRuntimeAdapter"| Fake
  Kernel -->|"AgentRuntimeAdapter"| CodexAdapter
  CodexAdapter --> RawClient
  RawClient -->|"JSONL initialize/thread/start/turn/start"| AppServer
  AppServer -->|"알림"| RawClient
  RawClient --> CodexAdapter
  CodexAdapter -->|"normalized adapter event"| Kernel
  Kernel -->|"RuntimeRunEvent SSE"| Server
  Server --> Inspector
```

## Runtime 계약

| 계약 요소 | 의미 |
| --- | --- |
| `RuntimeRunStatus` | `running`, `cancelling`, `completed`, `cancelled`, `failed` |
| `RuntimeRunEvent` | `started`, `output_delta`, `cancelling`, `completed`, `cancelled`, `failed` event를 순서대로 담는 정규화된 생명주기 stream |
| `RuntimeRunLog` | prompt, status, output, error, normalized events, optional debug evidence, timestamp를 담는 run 기록 |
| `RuntimeAdapterEvent` | Adapter가 kernel에 전달하는 event vocabulary. Adapter는 inspector/server state에 직접 쓰지 않는다. |
| `RuntimeAdapterCancellationMode` | `immediate`는 kernel이 취소를 즉시 표시하게 하고, `adapter_confirmed`는 adapter가 종료 확인이나 실패를 내보낼 때까지 `cancelling`에 머무르게 한다. |
| `RuntimeRunLogPersistence` | 전체 log load, single-record save, startup retention 적용과 run ID remove를 표현하는 core-owned async seam이다. Production kernel은 hydration, interrupted-run recovery save와 retention 동기화를 마친 ready instance만 반환한다. |

Codex는 `adapter_confirmed`를 사용한다. 실제 취소는 단순한 `AbortSignal`이 아니며, adapter가 `turn/interrupt`를 보내고 Codex 종료 근거를 관측해야 run이 `cancelled`가 된다.

`RuntimeRunEvent`는 요청 시작부터 종료 상태까지의 진단 생명주기만 표현한다. 이어지는 작업 맥락, AY의 진행 활동, 진행 중 정정, 실행 권한 요청, UserDecisionRequest, 재연결·재개를 포함하는 AY-PLE의 전체 제품 상호작용 계약이 아니다. 새 제품 동작을 이 여섯 가지 이벤트 계약에 억지로 추가하지 않는다.

## Runtime Diagnostic History 저장

| 항목 | 현재 동작 |
| --- | --- |
| 기본 위치 | `.ay-ple/runtime-harness/runs/<uuid>.json`; `RUNTIME_HISTORY_DIR`로 runs directory를 바꿀 수 있다. |
| envelope | `{ schemaVersion: 1, savedAt, log }`; `log`는 normalized events와 `debugLog`를 포함한 self-contained `RuntimeRunLog`다. |
| atomic replace | 같은 directory의 unique temporary file에 UTF-8 JSON을 쓰고 file을 sync·close한 뒤 canonical UUID filename으로 rename한다. 실패한 replacement는 이전 canonical record를 보존한다. |
| hydration | Store-owned stale temporary file을 best-effort 정리하고, canonical JSON의 envelope, UUID filename 일치, required log/event/debug 구조와 lifecycle sequence를 검증한 뒤 `startedAt`, `runId` 순으로 hydrate한다. Hydrated terminal record는 그대로 유지한다. |
| streaming checkpoint | Output delta와 debug evidence는 in-memory view에 즉시 반영되고, output normalized event만 subscriber에 즉시 공개된다. Dirty snapshot은 run별 직렬 queue에서 최대 100ms fixed window마다 최신 revision 하나로 coalesce되며, 지속적인 stream도 timer를 trailing debounce하지 않고 주기적으로 checkpoint한다. |
| transition durability ordering | Cancelling과 terminal transition은 pending timer를 취소하고 in-flight checkpoint를 drain한 뒤 최신 dirty snapshot과 transition snapshot을 순서대로 저장한다. Transition은 저장 뒤 publish되며 terminal waiter는 publish 뒤 resolve되어, 늦은 checkpoint가 terminal snapshot을 덮어쓰지 않는다. |
| restart recovery | Hydrated `running`/`cancelling` record는 adapter 실행, resume 또는 thread 재연결 없이 기존 transcript/events/debug evidence를 보존하고 다음 sequence의 normalized `failed` event를 추가한다. Exact error는 `Runtime interrupted by server restart`이며 recovery snapshot save가 끝나야 kernel과 server가 ready가 된다. |
| retention | 기본 terminal run 100개와 canonical envelope 총 104,857,600 UTF-8 bytes를 유지한다. Terminal completion time, started time, run ID 오름차순으로 prune하며 active record는 두 한도에서 제외한다. |
| terminal clear | `DELETE /api/runtime/runs`가 operation 시작 시점의 terminal record를 disk와 kernel memory에서 제거한다. Active run의 adapter, checkpoint, subscriber와 SSE는 유지한다. |
| persistence failure | Initial save failure는 adapter 실행과 run 공개를 막는다. Checkpoint, cancelling 또는 terminal save failure는 affected adapter를 abort하고 다음 sequence의 normalized `failed` event와 `persistence_error` debug evidence를 memory/subscriber에 공개하되 다시 저장하지 않는다. Kernel은 sticky degraded가 되어 새 run, cancel request와 clear를 거부하고 diagnostic read는 유지한다. |
| startup integrity | Invalid setting, 준비할 수 없는 directory, malformed/invalid/unsupported canonical record는 app/listener 생성 전 startup을 실패시킨다. Stale store-owned temporary cleanup failure만 warning 후 canonical hydration을 계속한다. |

## Codex Adapter 책임

| 단계 | 현재 동작 |
| --- | --- |
| runtime 경로 해석 | `CodexRawClient`는 기본적으로 package가 소유한 Codex binary를 해석하고, override가 없으면 workspace-local `.ay-ple/runtime-codex/*` home을 사용한다. |
| 초기화 | 생성된 계약에 맞춰 `initialize`를 보내고 이어서 `initialized`를 보낸 뒤 raw/debug message를 기록한다. |
| prompt run 시작 | text input으로 `thread/start`와 `turn/start`를 보낸다. |
| output stream | app-server 알림을 읽고, 일치하는 `item/agentMessage/delta`를 normalized `output_delta`로 mapping한다. |
| run 완료 | 일치하는 `turn/completed`의 status가 `completed`이면 normalized `completed`로 mapping한다. |
| run 실패 | failed turn completion, non-retryable `error`, spawn/init/thread/turn 실패, terminal stream loss를 normalized `failed`로 mapping한다. |
| run 취소 | turn scope가 생긴 뒤 abort되면 `turn/interrupt`를 보내고 interrupted completion을 관측할 때까지 알림을 비워 읽은 뒤 `cancelled`를 내보낸다. 확인 timeout은 기본 15초이며 adapter option으로 주입할 수 있다. interrupt request failure, missing confirmation, pre-turn-scope cancellation은 debug evidence가 있는 `failed`가 된다. |

## Capability Slot

`packages/runtime-codex/src/capability-slots.ts`는 의도적으로 broad-shallow하게 둔다. 이 파일은 엔진 capability 근거를 기록하지만, 해당 capability를 AY-PLE 제품 약속으로 바꾸지는 않는다.

| Slot | 상태 | 의미 |
| --- | --- | --- |
| `steering` | raw-callable | `turn/steer` raw wrapper는 있지만 충돌 처리 알고리즘이나 제품 UX는 없다. |
| `thread-session-read` | raw-callable | inspection용 thread list/read wrapper는 있지만 thread data는 core/product contract가 아니다. |
| `thread-session-lifecycle` | reserved | resume/fork/archive는 schema에서 관측됐지만 제품화하지 않았다. |
| `approval` | reserved | approval/guardian review method는 관측됐지만 학생용 review UX로 구현하지 않았다. |
| `profile-settings` | reserved | permission/config/thread settings는 runtime 가시성이며 AY-PLE 의미 체계가 아니다. |
| `attachment-input` | reserved | input/file capability는 schema에 있지만 SourceSelection과 parsing은 product layer 작업으로 남아 있다. |
| `account-profile` | reserved | auth/account 관측은 있지만 계정 관리 UX는 범위 밖이다. |

## 4주 제품 연결 방향

[ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)는 현재 Harness 구현을 폐기하지 않고 역할을 단일 실행 진단으로 좁힌다. 제품은 Codex App Server를 직접 사용하되 생성된 프로토콜 형식을 제품 계약으로 노출하지 않는다. Skills, MCP, 파일, 스크립트는 이식성을 지킬 우선 수단으로 유지하고, ACP와 다중 실행 엔진 추상화는 실제 두 번째 실행 엔진이 필요해질 때 검토한다. 패키지·앱 데이터·학기 작업공간의 경로 소유권은 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)을 따른다.

아래 항목은 2주차 제품 연결을 위해 확인된 구현 차이이며, 새 도메인 정보 모델을 정의하는 표가 아니다.

| 영역 | 현재 Harness | 다음 구현 |
| --- | --- | --- |
| 작업 지속 | 실행마다 새 App Server 프로세스, `Thread`, `Turn`을 만들고 닫음 | 같은 Codex `thread`를 여러 `turn`에 이어 쓰고, 이후에는 저장된 대응 관계로 작업 재개 |
| 이벤트 관측 | `output_delta`, 종료 생명주기, `debug_log` 중심 | 알 수 없는 이벤트를 조용히 버리지 않고 `thread`/`turn`/`item`/`request` 식별자를 보존한 뒤 필요한 내용만 제품 의미로 변환 |
| 진행 중 제어 | 실행 시작, 취소 확인, `raw-callable` 상태의 `turn/steer` 기능 | 현재 작업의 식별자를 검증한 `turn/steer`와 `turn/interrupt`를 CoControl에 연결 |
| App Server 요청 | 현재 `CodexRawClient`가 서버 `request`를 `response`와 구분해 왕복하지 못함 | 요청과 응답의 전달·연결을 먼저 구현하고 실행 권한 요청, Codex 사용자 입력 요청, MCP 기반 UserDecisionRequest를 GUI에서 구분 |
| 실행 상태 위치 | 저장소 작업공간 아래 `.ay-ple/runtime-codex/*`가 Harness의 의도적인 개발 기본값 | `npx ay-ple` 또는 실제 사용자 학기 작업공간 활성화를 구현할 때 학기 작업공간 밖 운영체제 앱 데이터 디렉터리에 `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 두고, 경로 상태 정보와 스모크 테스트로 검증 |

## 검증 표면

| 명령어 | 증명하는 것 |
| --- | --- |
| `npm run test:e2e` | 실제 Express server process와 Inspector를 통과하는 Fake lifecycle browser gate. Terminal clear와 active-run 지속, restart hydration/recovery에 더해 test-only checkpoint failure에서 normalized failed transcript, degraded health, stable mutation `503`, readable history/log와 disabled mutation controls를 검증한다. |
| `npm test` | fake Codex app-server scenario를 포함한 runtime-core, runtime-codex, server 생명주기 테스트 |
| `npm run typecheck` | packages/apps 전반의 TypeScript 계약 호환성 |
| `npm run build` | package 빌드 순서와 app build |
| `npm run lint -w @ay-ple/inspector` | Inspector lint |
| `npm run smoke:codex -w @ay-ple/runtime-codex` | 구성된 runtime home을 대상으로 명시적으로 선택해 실행하는 live Codex app-server initialize smoke |
| `npm run verify:codex-parity -w @ay-ple/server` | package pin과 실제 binary 일치, server HTTP/SSE를 통과하는 live prompt 완료와 adapter-confirmed cancellation |

대부분의 자동화된 Codex 동작 테스트는 `packages/runtime-codex/src/testing/fake-codex-app-server.ts`를 사용한다. 이 fake app-server는 live auth나 model behavior 없이 protocol 형태와 실패 mapping을 검증한다. 실제 인증된 Codex 검증은 CI 밖의 opt-in parity command가 담당하고, 수동 Runtime Inspector demo는 보조 근거로 남는다.

## 남은 Gap

| Gap | 중요한 이유 | 다음 제안 |
| --- | --- | --- |
| 제품 실행 엔진 연결 | Runtime Harness는 의도적으로 SourceSelection, StatePatch, Review, TrustedState가 아니며 여섯 가지 이벤트 실행 계약은 세부 CoControl을 표현하지 못한다. | 이어지는 Codex `thread`, 식별자를 보존하는 이벤트 관측, `turn/steer`, `turn/interrupt`, 진행 중 요청을 첫 제품 수직 흐름에 연결한다. 제품 상태로의 변환은 AY-PLE가 소유한다. |
| App Server 요청 왕복 | 현재 `CodexRawClient`는 App Server가 보낸 `request`를 클라이언트 `response`와 구분해 형식이 지정된 응답을 보내지 못한다. 따라서 `approval`, Codex 사용자 입력, `elicitation`, 동적 도구 왕복의 기반이 없다. | `notification`, `request`, `response` 전달과 연결, 명시적인 `sandbox`·`approval` 정책, 중단·연결 해제 시 안전한 거절을 제품 요청 UI보다 먼저 구현한다. |
| 제품 실행 상태 위치 | 현재 Harness 기본값은 저장소 작업공간 아래 `.ay-ple/runtime-codex/*`이며 개발 환경에서는 그대로 유효하다. | `npx ay-ple` 또는 실제 사용자 학기 작업공간 활성화에 착수할 때 경로 배치 모듈, 명시적인 재정의, 경로 상태 정보와 격리 스모크 테스트를 함께 추가한다. 현재 Harness 데이터를 미리 이전하지 않는다. |

## 이후 Agent 작업 규칙

- `AgentRuntimeKernel`을 단일 실행 Runtime Harness 경계로 취급한다. Harness 생명주기 변경은 이 경계에서 테스트하되, 이어지는 제품 상호작용을 이 경계 하나에 강제로 통과시키지 않는다.
- 생성된 Codex app-server type은 `packages/runtime-codex/src/internal/` 안에 둔다. `runtime-core`, `apps/server`, product package에서 다시 export하지 않는다.
- `CodexRawClient`와 후속 Codex 세션 구현은 `thread`/`turn`/`item`/`request` 식별자를 보존하고 알 수 없는 이벤트도 관측할 수 있게 한다. 필요한 내용만 제품 의미로 변환하며 원본 프로토콜을 제품 계약이나 SemesterModel·WorkspaceHistory의 영속 상태로 사용하지 않는다.
- broad raw capability evidence는 non-productized 상태를 유지할 때만 capability slot에 추가한다.
- `FakeRuntimeAdapter`를 두 번째 제품 실행 엔진의 증거로 사용하지 않는다. ACP 또는 다른 실행 엔진 어댑터 경계는 실제 제품 시나리오를 수행하는 두 번째 엔진이 생긴 뒤 추출한다.
- Restart recovery는 kernel-owned history semantics로 유지한다. Adapter resume, Codex thread 재연결 또는 raw-engine status를 recovery contract에 섞지 않는다.
