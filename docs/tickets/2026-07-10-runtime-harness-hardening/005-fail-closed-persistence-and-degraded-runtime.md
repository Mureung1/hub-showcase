## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent

`docs/specs/2026-07-10-runtime-harness-hardening.md`

## What to build

Runtime Diagnostic History의 startup integrity failure와 mid-run persistence failure를 fail-closed behavior로 완성한다. Invalid configuration이나 canonical record corruption은 server readiness를 막고, 실행 중 save failure는 해당 adapter를 중단하고 kernel을 degraded로 전환한다. HTTP와 Runtime Inspector는 storage outage를 validation error나 단순 API disconnect와 구분하며, existing in-memory diagnostic read는 유지한다.

대상 user stories: 23, 25, 27-30, 34, 36, 39.

## Acceptance criteria

- [x] Malformed JSON, invalid envelope, unsupported schema version와 filename/run ID mismatch가 record path를 포함한 startup error를 만들고 server는 listen하지 않는다.
- [x] Numeric retention setting이 positive integer가 아니거나 history directory를 준비할 수 없으면 startup이 실패하며 production memory fallback을 사용하지 않는다.
- [x] Startup은 canonical JSON만 hydrate하고 stale temporary file을 best-effort로 정리하며, cleanup warning을 canonical history로 읽지 않는다.
- [x] 단일 envelope가 configured byte limit보다 크면 explicit save failure가 되며 newest record 예외나 silent deletion으로 성공 처리하지 않는다.
- [x] Write, flush 또는 rename failure를 주입해도 이전 canonical snapshot이 손상되지 않는 atomicity regression test가 있다.
- [x] Initial save failure는 adapter를 실행하지 않고 run start가 HTTP `503`과 `{ error, code: "runtime_persistence_unavailable" }`를 반환한다.
- [x] Streaming, cancelling 또는 terminal save failure는 adapter run을 abort하고 kernel을 degraded로 전환한다.
- [x] Mid-run failure 뒤 current process의 run은 normalized `failed` event와 kernel `persistence_error` debug evidence를 가져 subscriber와 Inspector가 running에 남지 않는다.
- [x] Emergency in-memory failed event는 durable success로 주장하지 않으며, subsequent restart는 마지막 valid snapshot을 normal recovery rule로 처리한다.
- [x] Degraded kernel은 새 run, cancellation mutation과 history clear를 동일한 HTTP `503` error code로 거부한다.
- [x] Existing run history와 full log read endpoint는 degraded 상태에서도 current in-memory diagnostic evidence를 반환한다.
- [x] Health endpoint가 persistence `ready` 또는 `degraded`를 구분하고 degraded 상태에서 HTTP `503`과 마지막 persistence error를 제공한다.
- [x] Inspector가 persistence degraded를 API unavailable과 구분해 표시하고 새 run과 destructive history control을 disabled 처리한다.
- [x] Playwright가 fault-injected mid-run save failure에서 failed transcript/history, degraded indicator, mutation rejection과 readable run log를 검증한다.
- [x] Failure-path test는 live Codex auth를 요구하지 않으며 전체 deterministic browser suite와 기존 live parity command가 유지된다.

## Implementation outcome

| 항목 | 결과 |
| --- | --- |
| 완료일 | 2026-07-11 |
| 구현 | Startup corruption/configuration failure를 listen 이전에 차단하고, mid-run persistence failure를 non-durable emergency `failed`, sticky degraded health와 stable mutation `503`으로 노출한다. Inspector는 degraded와 unavailable을 구분한다. |
| 커밋 | `dd8fa41`, `673e318`, `0b9c33b` |
| 검증 | Atomic write/sync/rename fault test, startup process test, initial/checkpoint/cancelling/terminal/clear fault test, degraded HTTP read/mutation test, fault-injected Playwright와 live Codex parity 통과 |
| 리뷰 | Adapter exception과 terminal save가 함께 실패할 때의 unhandled rejection P1을 `0b9c33b`에서 수정한 뒤 Standards 및 Spec actionable finding 0건 |

## Blocked by

- `docs/tickets/2026-07-10-runtime-harness-hardening/004-bounded-history-and-terminal-clear.md`
