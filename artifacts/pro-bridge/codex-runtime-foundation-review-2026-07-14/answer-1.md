## 1. Overall verdict

**`not implementation-ready`**

Preparation–Connection–ConversationRuntime의 방향 자체는 유지할 수 있으며, global raw-wire order나 제품 adapter를 다시 넣을 필요도 없다. 그러나 현재 계약에는 writer admission, approval lease, thread-local failure drain, process terminal의 선형화 지점이 닫혀 있지 않아 동일한 trace에 대해 서로 다른 두 구현이 모두 spec-conformant가 될 수 있다. 특히 timeout을 반환한 mutation이 나중에 실제로 write되는 trace와, application writer capacity 때문에 same-ID Server response를 보내지 못하는 trace가 허용된다. 또한 live binary만으로 arbitrary unsupported Server request와 모든 legal interleaving을 증명하도록 읽히는 verification contract는 실행 가능하지 않다. 아래 P1을 계약 수준에서 수정한 뒤에 implementation slice를 시작해야 한다.

---

## 2. Findings-first table

**P0: 0 findings.**

| ID   | Severity | Owning artifact                                                                                                                                                                                                    | Broken or missing contract                                                                                                                                                                                                                                     | Reproduction                                                                                                                                                                                                             | Evidence class                                                                  | Minimal correction                                                                                                                                                                                                                                                                                                                                       | Test implication                                                                                                                                                                                                                  |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | **P1**   | `2026-07-14-codex-native-runtime-foundation.md` — `CodexAppServerConnection`의 serialized writer, phase deadline, `acceptance_unknown` / `accepted_execution_unknown` contract                                      | `enqueue`, `write-attempted`, Node stream handoff, write callback, response 수신 사이의 선형화가 정의되지 않았다. 따라서 deadline으로 settle된 mutation frame이 queue에 남아 있다가 나중에 write될 수 있다.                                                                                        | `C1`이 backpressure로 writer를 점유 → `C2 turn/start` enqueue → C2 deadline → caller settle → writer 재개 → C2 write → `turn/started(T2)` 수신.                                                                                   | TS hardening                                                                    | Writer frame을 immutable encoded bytes로 만들고 `QUEUED_CANCELABLE → HANDED_TO_STREAM → RESPONSE_ACCEPTED → SEMANTIC_TERMINAL` 상태를 둔다. `QUEUED_CANCELABLE` timeout은 frame을 제거하며 known-not-sent로 끝낸다. handoff 이후 timeout/error는 `acceptance_unknown`이며 connection을 terminal로 만들어 뒤따르는 frame을 계속 쓰지 않는다. response가 write callback보다 먼저 오면 response가 우선한다.       | Unit: writer 상태 전이와 once-only settlement. Actual-child fake: stdin backpressure, queue timeout 후 drain, write callback/response 역전, stream error.                                                                                 |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-02 | **P1**   | 같은 spec — finite-resource caps, inbound Server request response lease, T0.1                                                                                                                                        | 하나의 bounded writer queue가 outbound mutation과 inbound Server response를 함께 받는다면, application frames가 queue를 채운 상태에서 approval response 또는 unsupported-method error를 보낼 수 없다. “bounded”는 그 자체로 deadlock 방지 계약이 아니다.                                                | writer application lane이 cap 도달 → ingress `S9 item/commandExecution/requestApproval` → caller `decline` → response enqueue 거절 → server는 S9 응답을 기다려 turn을 진행하지 못함. 동시에 B의 terminal도 지연될 수 있다.                             | TS hardening + source-based inference                                           | 별도의 bounded control-response lane 또는 명시적 reserved count/byte budget을 둔다. inbound lease는 response capacity를 확보한 경우에만 active로 admit한다. 최소한 한 개의 same-ID error를 보낼 emergency budget이 있어야 한다. Control 우선순위와 application starvation 방지 규칙도 명시한다.                                                                                                              | Actual-child fake: stdin을 막은 채 stdout으로 Server request 송신. application queue가 가득 차도 same-ID response가 write되고 B notification 처리가 계속되는지 검증.                                                                                        |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-03 | **P1**   | 같은 spec — method-specific early-event FIFO, pre-response `thread/started`; TS hardening의 “unbound pre-response `thread/started`가 ingress 시점 active waiter cohort만 실패” 정책. `0010-...md` — adopted ordering boundary | response 전 identity가 없는 동일 method request가 둘 이상 active일 때 FIFO 또는 ingress-time cohort failure는 sound하지 않다. Generated shape는 같은 method 요청들의 response/notification 순서를 보장하지 않는다.                                                                                 | `C1 thread/start`, `C2 thread/start` write → `thread/started(T2)` → `R(C2,T2)` → `thread/started(T1)` → `R(C1,T1)`. FIFO는 T2를 C1에 붙이고, cohort policy는 C1·C2를 함께 실패시킬 수 있다.                                               | **missing evidence**. Exact-pin source/test가 동일-method 동시성의 순서를 보장한다는 증거가 필요하다. | T0 단계에서는 connection당 pre-identity `thread/start`를 serialize하는 것이 최소 수정이다. 동시성을 유지하려면 early event를 native `ThreadId`로 보관하고 response가 같은 ID를 반환할 때만 convergence한다. “unbound” 판정은 ingress 시점이 아니라 response/deadline까지 가능한 binding을 소진한 뒤 내려야 한다.                                                                                                            | Unit: 두 waiter와 response 역전. Actual-child fake: 위 순서와 duplicate `thread/started(T2)`. Live oracle은 지원 가능한 concurrency를 확인하되 legality의 유일한 증거로 사용하지 않는다.                                                                           |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-04 | **P1**   | 같은 spec — T0.1 approval lifecycle, active command approval, `serverRequest/resolved`, command terminal, turn terminal                                                                                              | lease에 대해 local decision, remote resolution, turn terminal, disconnect가 경쟁할 때의 원자적 승자와 writer 취소 가능 시점이 정의되지 않았다. 특히 approval은 `turn/start` response보다 먼저 올 수 있는데, 이 경우 provisional native scope의 취급도 빠져 있다.                                                   | `C10 turn/start` write → `turn/started(T1)` 및 command item → Server request `S9` → `serverRequest/resolved(S9)` → caller가 동시에 `approve_once(S9)` → 뒤늦게 `R(C10,T1)` 및 canceled terminal.                                  | source-based inference; 일부 disposition은 product policy                          | Lease에 connection-bound nonce를 두고 `ACTIVE → LOCAL_RESPONSE_QUEUED/HANDED                                                                                                                                                                                                                                                                                 | REMOTE_RESOLVED                                                                                                                                                                                                                   | TURN_TERMINATED | CONNECTION_LOST`를 CAS로 전이한다. 첫 committed transition만 write 권한을 가진다. queued-but-not-handed response는 remote resolution 시 취소한다. handed 이후에는 `acceptance_unknown`일 수 있다. Pre-response lease는 native IDs를 담은 provisional scope로 유지하되 committed `TurnHandle`로 승격하지 않는다. | Unit: 모든 두 사건 permutation과 stale handle. Actual-child fake: approval-before-turn-response, resolved-before-decision, terminal-before-decision, disconnect-after-handoff. Live oracle: exact response value와 normal ordering. |
| F-05 | **P1**   | 같은 spec — Runtime FIFO capacity와 thread-local failure scope. `0010-...md` — “permanent actor poison/sink”, process-lifetime actor retention을 채택하지 않는다는 조항                                                          | permanent sink를 거부하는 것은 타당하지만, local capacity/validation failure 뒤 늦은 이벤트를 어디로 보낼지에 대한 **temporary failed-draining state**가 없다면 failed turn이 재생성되거나 connection-wide failure로 확대된다.                                                                             | A의 FIFO byte cap 초과 → A projection 제거/settle → B `turn/completed` → 늦은 A delta와 A `turn/completed` → A2 admission. A의 늦은 delta가 새 early FIFO를 만들거나 unknown-event fault를 일으키면 B 또는 A2가 영향을 받는다.                           | TS hardening                                                                    | `(ThreadId, TurnId) → FAILED_DRAINING` 최소 상태를 authoritative turn terminal 또는 connection terminal까지 유지한다. 이 상태는 late item/delta/approval을 drop하고 terminal만 소비한다. drain deadline까지 terminal이 없으면 계속 보존하지 말고 connection을 incompatibility terminal로 닫는다. 즉 permanent poison은 필요 없지만 bounded temporary sink는 필요하다.                                            | Unit: overflow 후 late events, duplicate terminal, A2 admission. Fake: A flood 중 B completion. Live: 정상 terminal 후 marker가 해제되는지 확인.                                                                                               |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-06 | **P1**   | 같은 spec — Connection의 sole JSONL reader와 serialized dispatch queue; T0-C                                                                                                                                           | dispatch queue가 Runtime handler, approval callback 또는 public subscriber의 Promise를 await할 수 있는지 금지되어 있지 않다. 이를 허용하면 A의 pending interaction 하나가 모든 thread의 ingress를 head-of-line block한다.                                                                        | ingress `A requestApproval(S1)` → dispatch가 handler completion을 await → ingress `B turn/completed`가 queue 뒤에 위치 → 사용자 결정이 없으므로 B terminal deadline.                                                                      | TS hardening + inference                                                        | Connection dispatch의 책임을 parse/validate/route/lease-register/Runtime-queue-admit까지로 제한하고, 사용자 또는 Runtime semantic completion을 절대 await하지 않는다고 명시한다. Runtime은 per-thread queue를 사용하며 public callbacks도 queue 밖에서 전달한다.                                                                                                                                    | Unit: handler가 never-resolving Promise를 반환해도 dispatch가 계속되는지. Fake: A approval pending 동안 B completion과 unrelated RPC response 처리.                                                                                                |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-07 | **P1**   | 같은 spec — child/process lifecycle, disconnect settlement, close/reap deadline                                                                                                                                      | process `exit` 관찰을 transport terminal로 취급할지, stdout EOF와 parser/dispatch drain을 기다릴지 명확하지 않다. exit 직전에 기록된 authoritative response/terminal을 잃을 수 있다.                                                                                                           | child가 `R(C1,...)`, `turn/completed` 두 줄을 write한 직후 exit → process exit callback이 먼저 pending을 reject → stdout data/end 및 dispatch가 뒤늦게 수행됨.                                                                              | TS hardening                                                                    | 새 admission을 freeze하되, terminal settlement는 `stdout EOF + partial-frame 판정 + dispatch drain + child close/reap observation`의 barrier 뒤에서 한다. bounded drain deadline이 지나면 그때 connection failure로 settle한다. stderr도 항상 drain해야 한다.                                                                                                                         | Actual-child fake process: final frame write 직후 exit, stdout을 작은 chunk로 분할, descendant가 pipe를 열어 둔 경우. Linux/Windows process test.                                                                                                |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-08 | **P1**   | `0010-...md` — process-lifetime `RequestId` tombstone 미채택. Spec — direction-aware exact active `RequestId` routing                                                                                                 | Tombstone을 없애려면 outbound client ID의 **connection-lifetime non-reuse**와 inbound lease handle의 connection epoch/nonce가 필수인데 해당 invariant가 명시되지 않았다. Active map만으로는 늦은 old response가 재사용된 ID의 새 request를 settle할 수 있다.                                            | old outbound `id=17` settle → 같은 connection에서 새 request도 `id=17` → old duplicate response `id=17` 도착 → 새 promise가 잘못 settle. 별도 trace로 reconnect 뒤 stale approval handle이 새 connection의 동일 numeric ID를 대상으로 response 시도. | TS hardening; JSON-RPC correlation semantics                                    | Outbound ID는 package-owned non-repeating string을 사용한다. Counter를 쓴다면 connection lifetime 내 wrap/reset을 금지한다. Inbound ID는 완료 후 재사용을 금지하지 말고, lease object에 private connection token과 nonce를 넣어 stale handle을 차단한다. 동일 direction에서 duplicate-active ID가 들어오면 기존 lease를 절대 교체하지 않는다고 정한다.                                                                    | Unit: outbound nonreuse, outbound/inbound same lexical ID 동시 사용, active duplicate inbound ID, stale lease after reconnect.                                                                                                        |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-09 | **P2**   | 같은 spec — phase별 mutation response/semantic terminal deadline                                                                                                                                                      | deadline callback과 already-accepted ingress event가 서로 다른 executor에서 경쟁할 때의 tie-break가 없다. bytes가 이미 reader에서 validation까지 끝났지만 Runtime queue가 밀린 경우 timeout이 먼저 public terminal을 만들 수 있다.                                                                      | t=999: `turn/completed` parse·validate 후 Runtime queue에 enqueue. t=1000: semantic timer callback이 직접 state를 timeout으로 변경. t=1001: reducer가 completed를 처리.                                                                | TS hardening                                                                    | 모든 operation deadline을 owner queue에 **timer event**로 enqueue한다. 같은 ThreadId에서는 validated message admission과 timer admission의 순서가 결과를 정하며, timer가 reducer state를 queue 밖에서 직접 변경하지 못하게 한다. 물리적 pipe 도착 시간이 아니라 validated owner-queue admission을 선형화 지점으로 명시한다.                                                                                            | Fake timers + deterministic scheduler. terminal/deadline의 모든 enqueue 순열과 duplicate timer 검증.                                                                                                                                      |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-10 | **P2**   | 같은 spec — JSONL frame count/UTF-8 byte cap, duplicate-member pre-scan, exact ID parser                                                                                                                             | byte cap이 어느 단계에 적용되는지 불명확하다. `readline` 또는 비-fatal 문자열 decode 뒤에 검사하면 newline 없는 frame이 cap 이상 메모리를 점유하고, invalid UTF-8가 replacement character로 변환된 뒤 validation될 수 있다.                                                                                       | child가 newline 없이 cap+1 bytes 송신하거나, multibyte UTF-8를 chunk 경계에서 분할하고 invalid continuation을 삽입. string-based reader는 이미 큰 문자열을 만들거나 U+FFFD로 치환한다.                                                                        | TS hardening                                                                    | Buffer 기반 incremental line splitter를 사용하고 decode 전에 raw byte cap을 적용한다. UTF-8 decoder는 fatal이어야 한다. `LF`, 선택적 preceding `CR`, blank line, BOM, EOF의 partial frame 처리도 normative하게 정의한다. Duplicate-key 검사는 bounded complete frame 위에서만 수행한다.                                                                                                              | Property/unit: 모든 UTF-8 chunk boundary, invalid sequence, CRLF, blank line, BOM, cap±1, EOF partial frame, escaped duplicate key (`"id"`와 `"i\\u0064"`).                                                                          |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-11 | **P2**   | 같은 spec — generated inventory/coverage ledger, unsupported inbound Server request, disconnect failure policy                                                                                                       | malformed envelope, exact-pin inventory에는 있으나 미채택인 notification, inventory 밖 notification, unsupported inbound request, unknown response ID의 failure scope가 하나의 표로 닫혀 있지 않다. 구현마다 ignore, thread fail, connection close가 달라질 수 있다.                             | A/B active 중 known-but-unadopted global notification `M` 수신. 구현 1은 drop, 구현 2는 unsupported로 connection close. 양쪽 모두 현재 문구와 양립할 수 있다.                                                                                     | missing evidence + TS hardening                                                 | Method-class × direction × shape-validity × adoption-state matrix를 추가한다. 최소값: known/unadopted notification은 bounded drop+safe metric, unsupported inbound request는 same-ID error, malformed JSON-RPC envelope는 connection-fatal, unknown response는 nonreuse invariant와 결합한 deterministic late/violation policy.                                          | Generated inventory 기반 table-driven unit test. Fake child로 각 cell 검증. Live oracle은 exact pin이 보내는 known global notifications만 확인.                                                                                                 |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-12 | **P1**   | `0010-...md` — Evidence authority. Spec의 provenance/generation/verification contract. `map.md` — 001/003/004                                                                                                       | exact source commit, npm top-level package, platform-specific packaged binary가 불일치할 때 어느 authority가 승리하는지와 gate 실패 조건이 없다. 또한 arbitrary unsupported Server request와 모든 adversarial interleaving을 live binary 하나로 “증명”하는 것은 deterministic하지 않다.                 | source-generated validator는 shape X를 기대하지만 npm platform binary가 Y를 송신 → fake/unit 모두 통과하고 첫 live run에서 disconnect. 반대로 live child가 unsupported request를 자발적으로 발생시키지 않아 required gate가 영원히 실행되지 않거나 test hook에 의존한다.      | **missing evidence**                                                            | 설치 artifact manifest에 top-level tarball integrity, platform package integrity, resolved binary path/hash/version, source commit, generated inventory fingerprint를 기록한다. 불일치는 source/binary 중 하나를 선택하지 말고 certification failure로 한다. Verification authority를 unit / scripted child / exact-package live oracle로 분리한다.                                     | Install된 tarball에서 직접 spawn하는 provenance test. Fake는 arbitrary method/order/backpressure/exit, live는 nominal compatibility와 source가 legal이라고 한 관측만 담당.                                                                            |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-13 | **P2**   | 같은 spec — public `CodexConversationRuntime` Interface와 lifecycle                                                                                                                                                   | Runtime의 cardinality가 “한 connection당 하나”, “한 thread당 하나”, “여러 thread를 소유” 중 무엇인지 public contract에서 충분히 고정되지 않으면 향후 `thread/read`·`thread/resume`, multi-turn, interrupt/steer가 breaking change가 된다. Fresh `thread/start`가 constructor side effect라면 특히 문제가 된다. | 현재 caller가 `new Runtime(...); runTextTurn()`만 사용한다고 고정 → 나중에 기존 `ThreadId` attach가 필요하지만 constructor가 이미 새 thread를 생성 → resume를 추가하려면 constructor 의미나 반환형을 변경해야 함.                                                       | source-based inference / interface design                                       | Public constructor에서 native mutation을 시작하지 않는다. Runtime lifecycle과 Thread lifecycle을 분리하고 opaque `ThreadHandle`, active `TurnHandle`, connection-bound `ApprovalHandle`을 둔다. T0에서 `startThread`만 구현해도 되지만 future factory/attach가 추가될 수 있는 ownership shape를 보존한다. Streaming/activity는 per-thread ordered observer로 추가하고 global causal sequence는 약속하지 않는다. | Type-level/API snapshot test: A2 multi-turn, runtime close와 thread close 구분, stale turn/approval handle rejection, future attach method가 기존 signature를 깨지 않는지 검증.                                                                 |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-14 | **P2**   | `map.md` — `003 → 004 → 005`, `006 → 007 → 008 → 009` 및 branch/join graph                                                                                                                                          | Same-pin runtime 구현이 pin-upgrade transaction에 막혀 있고, actual-child executable proof가 router와 전체 finite-resource hardening 뒤로 너무 늦게 배치되어 있다. 잘못된 protocol assumption을 6–8개 ticket 뒤에 발견할 수 있다.                                                                   | 001–006의 generation/router fake gate 통과 → 007에서 실제 packaged child가 launcher/env/initialize shape 불일치 → 선행 ticket의 설계와 tests를 다시 작성.                                                                                      | inference                                                                       | 004는 pin 변경 및 final promotion만 block하고 005를 block하지 않게 한다. 006과 007의 최소 부분을 합쳐 exact packaged child를 spawn/initialize하는 vertical slice를 만든다. 008은 write/terminal correctness와 security/cap tuning으로 나눠 전자를 T0보다 앞에 둔다.                                                                                                                                   | CI에 earliest exact-tarball smoke. 각 hardening ticket은 이미 동작하는 vertical trace를 깨지 않는 regression 형태로 진행.                                                                                                                            |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-15 | **P1**   | `map.md` — 014 Host/layout removal, 015 legacy transport removal, 016 certification. `README.md` — current `HeadlessCodexClientHost` claims                                                                        | T0/T0-C/T0.1 branch join은 기존 Host를 compatibility 없이 제거할 충분조건이 아니다. README는 current claim일 뿐이고, 실제 exported selector·consumer·failure policy의 reachability proof가 graph에 없다.                                                                                    | repository consumer가 Host의 sanitized event 또는 layout export를 직접 import하고 있으나 T0/T0.1은 통과 → 014에서 Host 삭제 → compile failure 또는 더 나쁘게 런타임 product-policy 손실.                                                               | missing evidence                                                                | 014 앞에 current-code reachability gate를 둔다. 모든 Host selector를 `replacement implemented+integration`, `consumer deleted`, `explicitly unsupported breaking removal` 중 하나로 분류하고, repository-wide consumer가 0이거나 migration됐음을 검증한다. Cutover와 dead-code deletion을 서로 다른 checkpoint로 나눈다.                                                                      | Import/reachability scan, public export snapshot, downstream build, installed artifact smoke, rollback artifact install test. Product adapter는 foundation blocker가 아니지만 실제 남아 있는 product-layout consumer는 Host deletion blocker다. |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |
| F-16 | **P3**   | `0010-...md` — Ticket 004 diagnosis와 Decision rationale                                                                                                                                                            | Ticket 004의 근본 원인을 monolithic Host와 global ordering contract에 동등하게 돌리면 원인 설명이 부정확하다. Holdback을 필연적으로 만든 것은 “response-authoritative identity”와 “generation-wide publication order”의 동시 요구이며, monolith는 blast radius와 testability를 악화했을 뿐이다.                     | 동일한 두 계약을 Connection과 Runtime으로 분리한 뒤에도 `A event → B event → A response`에서 B를 publish하려면 A response를 기다려야 한다. Module split만으로 journal은 사라지지 않는다.                                                                         | source-based inference                                                          | ADR rationale을 “invalid global-order contract가 causal root, monolith는 amplification factor”로 수정한다. 새 Runtime 또는 tracer가 diagnostic ingress sequence를 semantic publication order로 다시 승격하지 못하게 한다.                                                                                                                                                         | Contract test: cross-thread event observer에 total-order/cross-thread causality assertion이 존재하지 않는지 확인. Documentation assertion test 또는 API review gate.                                                                           |                 |                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                              |

### Standards-level constraints supporting F-01, F-07, F-08

JSON-RPC의 `id`는 request와 response를 연결하는 값이지, process lifetime 동안의 uniqueness나 notification ordering을 제공하는 값이 아니다. 그러므로 tombstone을 두지 않는 결정은 가능하지만, outbound non-reuse를 별도의 local invariant로 닫아야 한다. ([JSON-RPC][1])e child lifecycle에서는 process exit 관찰과 stdio closure가 별도 사건이며, `close`는 stdio stream들이 닫힌 뒤 발생한다. 따라서 `exit`를 곧바로 reader terminal과 동일시하면 final stdout frame을 잃을 수 있다. ([Node.js][2]) stream의 backpressure와 write callback은 local stream의 처리 상태일 뿐 peer app-server가 JSONL frame을 parse하거나 mutation을 수락했다는 증거가 아니다. `acceptance_unknown`은 이 경계를 기준으로 정의해야 한다. ([Node.js][3])ndings`

다음 omission 자체에는 finding이 없다.

* Generation-wide/global raw-wire causal order를 제거한 것: **0 findings**.
* Contradiction lattice를 만들지 않은 것: **0 findings**. 단, first-authoritative-terminal과 late duplicate 처리 규칙은 명시되어야 한다.
* Native identity를 generation-scoped UUID로 remap하지 않은 것: **0 findings**.
* Automatic reconciliation 또는 mutation replay를 하지 않는 것: **0 findings**.
* AY-PLE adapter와 UI를 foundation readiness blocker로 두지 않은 것: **0 findings**.
* Process-lifetime inbound `RequestId` tombstone을 두지 않은 것: **0 findings**, 단 F-08의 outbound non-reuse와 connection-bound lease가 전제다.
* Three-root validation과 launcher `cwd`/workspace `cwd` 분리라는 boundary intent: **0 findings**. 구현 시 symlink·resolved binary provenance는 별도 검증 대상이다.

---

## 3. Counterexample traces

아래 표기에서 `W+`는 writer queue admission, `W!`는 underlying stream handoff, `I`는 parse·shape validation이 끝난 ingress, `D`는 owning Runtime reducer commit, `P`는 public outcome이다. `C*`는 client-originated request ID, `S*`는 server-originated request ID다. Params는 exact-pin generated fixture를 사용한다고 가정한다.

### Trace A — timeout 뒤 실제 mutation 실행

```text
W! C0: large frame
   stdin backpressure; C0 callback pending

W+ C1: turn/start(thread=A)
   C1 is QUEUED, not handed to stream

deadline(C1)

P  C1 => timeout / failed

stdin drains
W! C1: turn/start(thread=A)

I  R(C1, turn=T1)
I  N(turn/started, A, T1)
I  N(item/agentMessage/delta, A, T1, ...)
```

**현재 spec이 허용하는 결과**

C1 promise는 deadline으로 끝났지만 frame cancellation 규칙이 없으므로 writer가 C1을 나중에 전송한다. Runtime은 response를 unknown/late로 버리거나 orphan turn을 만든다. Caller가 retry하면 두 turn이 실행될 수도 있다.

**올바른 결과**

C1이 아직 `QUEUED_CANCELABLE`이면 deadline이 frame과 pending entry를 원자적으로 제거하고, 실제 write는 없어야 한다. 이미 `W!`가 일어났다면 public outcome은 `acceptance_unknown`이어야 하며 automatic retry가 금지된다. Writer timeout이나 partial handoff가 발생했다면 해당 connection을 계속 사용해서는 안 된다.

---

### Trace B — bounded writer가 approval response를 막음

```text
W+ C1 ... Cn: outbound application frames
writer application capacity == full
stdin is backpressured

I  Q(S9, item/commandExecution/requestApproval,
     scope=(A,T1,I1))

API decline(S9)

W+ R(S9, decline)  => rejected because writer is full

I  N(turn/completed, B, TB)
```

**현재 spec이 허용하는 결과**

S9는 active lease지만 response가 queue cap에 막힌다. Server는 A turn을 진행하지 못하고, dispatch가 lease completion을 기다리는 구현이라면 B terminal도 처리되지 않는다.

**올바른 결과**

S9를 active로 만들 때 response budget이 이미 예약되어 있어야 한다. `R(S9, decline)`은 control lane에서 exactly once write된다. A의 approval waiting과 무관하게 B terminal은 per-thread queue에서 commit된다.

---

### Trace C — 두 `thread/start`와 pre-response notification

```text
W! C1: thread/start
W! C2: thread/start

I  N(thread/started, T2)
I  R(C2, thread=T2)
I  N(thread/started, T1)
I  R(C1, thread=T1)
```

**현재 spec의 가능한 결과 1 — method FIFO**

첫 notification T2를 첫 waiter C1에 붙인다. R(C2,T2)가 오면 C2에는 notification이 없고, R(C1,T1)가 오면 C1에 identity contradiction이 생긴다.

**현재 spec의 가능한 결과 2 — ingress-time waiter cohort failure**

첫 notification 시점에 C1·C2를 모두 실패시킨다. 이후 두 response가 정상적으로 와도 이미 public failure가 확정됐다.

**올바른 결과**

T0에서는 C1 response 또는 failure 전까지 C2를 write하지 않는 serialization이 가장 작은 수정이다. 동시 start가 요구되면 notification은 T2로 보관하고 `R(C2,T2)`와 ID equality가 확인된 뒤 C2에 귀속한다. Response가 오기 전에는 public committed ThreadHandle을 만들지 않는다.

---

### Trace D — pre-response approval과 remote resolution

```text
W! C10: turn/start(A)

I  N(turn/started, A, T1)
I  N(item/started, A, T1, I1)
I  Q(S9, commandExecution/requestApproval, A, T1, I1)

I  N(serverRequest/resolved, S9)
API approve_once(S9)

I  R(C10, turn=T1)
I  N(item/completed, A, T1, I1, status=cancelled)
I  N(turn/completed, A, T1, status=cancelled)
```

**현재 spec이 허용하는 결과**

`approve_once` admission과 `serverRequest/resolved`의 선형화가 없으므로 이미 resolved된 S9에 accept response를 쓸 수 있다. 또는 turn/start response를 기다리기 위해 approval 자체를 dispatch queue에 hold하여 server와 B를 함께 막을 수 있다.

**올바른 결과**

`serverRequest/resolved`가 lease CAS를 먼저 commit했다면 `approve_once`는 `superseded`를 반환하고 아무 response도 쓰지 않는다. Local decision이 먼저 response handoff를 얻었다면 response는 exactly once 쓰고 뒤의 resolved는 informational late event로 소비한다. Turn response convergence, approval response submission, command terminal, turn terminal은 서로 다른 상태다.

---

### Trace E — local overflow 뒤 actor 재생성

```text
I  N(delta, A, TA) x (fifoByteCap + 1)

D  A/TA => local capacity failure
P  A/TA => failed

I  N(turn/completed, B, TB)
D  B/TB => completed
P  B/TB => completed

I  N(delta, A, TA)             // late
I  N(item/completed, A, TA)
I  N(turn/completed, A, TA)

API startTurn(A, "A2")
```

**현재 spec이 허용하는 결과**

A projection을 즉시 제거하면 late A delta가 새 unknown/early actor를 만들 수 있다. 반대로 unknown event를 connection-fatal로 취급하면 정상 완료된 B까지 영향받는다. A terminal을 소비하지 못하면 A2 admission 여부도 구현별로 달라진다.

**올바른 결과**

A/TA를 `FAILED_DRAINING`으로 유지하여 late nonterminal events를 버리고 authoritative terminal만 소비한다. B는 즉시 완료된다. A terminal 후 marker를 해제하고 A2를 admit한다. Terminal이 drain deadline 안에 오지 않으면 connection을 닫아 boundedness를 지킨다.

---

### Trace F — exit와 final stdout drain 경쟁

```text
child stdout write:
  R(C1, result=...)
  N(turn/completed, A, T1)

child exits immediately

process "exit" observed
connection rejects C1 and active T1

stdout "data"/"end" observed
dispatch receives valid R(C1) and terminal
```

**현재 spec이 허용하는 결과**

Process loss settlement가 exit callback에 연결되어 있으면 C1/T1은 unknown failure다. 뒤늦은 valid terminal은 late event로 버려진다.

**올바른 결과**

Exit는 new admission freeze만 시작한다. stdout EOF, final partial-frame 판정, parser/dispatch drain, process close/reap이 모두 완료된 뒤 terminal settlement를 한다. 위 trace에서는 C1과 T1이 정상 완료되어야 한다.

---

### Trace G — terminal이 deadline보다 먼저 admit됐지만 reducer가 늦음

```text
t=999
I  N(turn/completed, A, T1)
   validated and enqueued to A queue

t=1000
semantic-terminal timer callback fires
   directly marks T1 timed_out

t=1001
D  turn/completed
```

**현재 spec이 허용하는 결과**

Timer가 queue 밖에서 state를 변경하면 public timeout이 먼저 확정된다. 이미 받아들인 terminal은 late duplicate가 된다.

**올바른 결과**

Timer도 A queue에 하나의 event로 enqueue해야 한다. `turn/completed` admission이 먼저였으므로 reducer에서 terminal이 먼저 commit되고 timer는 no-op이 된다. 물리적 pipe arrival가 아니라 validated owner-queue admission이 선형화 지점이다.

---

### Trace H — ID 재사용과 late response

```text
W! C17: request Old
I  R(C17, result=OldResult)
P  Old => settled

ID generator resets or wraps

W! C17: request New

I  R(C17, result=OldResult)   // delayed duplicate
P  New => incorrectly settles with OldResult
```

**현재 spec이 허용하는 결과**

Active-only map은 late response가 어느 generation의 C17인지 구별하지 못한다. Tombstone이 없고 non-reuse도 없으면 misrouting이 가능하다.

**올바른 결과**

같은 connection에서는 C17이 다시 생성되지 않아야 한다. Reconnect 후 ID가 다시 나타나는 것은 가능하지만 이전 pipe의 response가 새 pipe로 넘어올 수 없으며, 모든 lease/handle은 private connection token으로 stale 여부를 확인한다.

---

## 4. Over-engineered vs under-specified

### Over-engineered

| 항목                                                                               | 판정                                                                                                                                                                                                                                                                    | 구현·upgrade 비용                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Hand-written top-level duplicate-member scanner                                  | **목표는 타당하지만 제안된 구현 방식은 과도하다.** `"id"`와 `"i\\u0064"`를 같은 key로 보려면 완전한 JSON string escape 처리가 필요하고, string 내부 brace·escape·surrogate를 정확히 처리해야 한다. 잘못 만든 scanner는 hardening처럼 보이면서 우회된다. 검증된 tokenizer/parser를 쓰거나 local pinned child threat model에서 이 항목을 후순위로 내려야 한다. | 초기 **중~상**, parser dependency와 JSON edge-case upgrade마다 반복 비용 **중**. |
| Runtime의 recursive no-raw retention 검사                                           | **과도하다.** object graph 순회는 closure, native `Error`, getter, cycle, third-party object를 완전하게 증명하지 못한다. Runtime hot path에서 수행하면 비용과 false positive가 크다.                                                                                                                 | 초기 **중**, 새 error type마다 회귀 비용 **상**.                                |
| Safe A/B generation과 authenticated pin-upgrade를 same-pin runtime의 직렬 blocker로 배치 | 기능 자체는 유용하지만 **graph placement가 과도하다**. Exact same pin의 vertical runtime proof와 pin upgrade machinery는 독립적이다.                                                                                                                                                         | 일정 비용 **상**. Runtime source feedback을 여러 ticket 뒤로 미룬다.              |
| Constant allowlisted public message만을 진단 계약으로 사용                                 | Stable code와 safe structured metadata가 없다면 과도한 redaction이다. 서로 다른 phase·retry safety·acceptance state가 같은 message가 되어 운영과 recovery가 불가능해진다.                                                                                                                           | 초기 **하**, 이후 모든 장애 분석과 upgrade 비용 **상**.                             |
| 모든 phase deadline을 완성한 뒤 첫 actual-child execution을 허용하는 순서                       | Deadline 개념은 필요하지만 구현 순서가 과도하다. Spawn/initialize/write/terminal의 최소 state만 먼저 만들고 actual child로 깨뜨린 뒤 나머지 timer를 추가해야 한다.                                                                                                                                             | 재작업 가능성 **상**.                                                       |

적절한 대안은 no-raw를 포기하는 것이 아니다. Public error를 생성 시점부터 `{code, phase, retrySafety, acceptanceClass, safeNativeScope?}`의 allowlisted 구조로 만들고, raw frame·child stderr·validator dump·native `Error.cause`가 public serializer에 들어갈 타입 경로 자체를 없애야 한다. Recursive scanner는 CI의 defense-in-depth property test 정도로 한정할 수 있다.

### Under-specified

| 항목                                                      | 누락 효과                                                  | 구현·upgrade 비용                                     |
| ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Writer의 cancelable/handoff/response 상태                  | timeout 뒤 mutation 실행, duplicate settlement            | **중**. Router와 writer를 함께 수정하지만 지금 정의하면 국소적이다.    |
| Control-response reserved capacity                      | approval/unsupported request deadlock                  | **중**. Writer scheduler와 cap 산정에 영향.              |
| Lease CAS와 stale handle                                 | resolved/terminal 뒤 approval write                     | **중**. T0.1 전에 반드시 필요.                            |
| `FAILED_DRAINING` temporary sink                        | thread-local failure가 재생성 또는 connection failure로 확대    | **하~중**. Per-active-turn 최소 state만 추가.            |
| Process exit–EOF–dispatch drain barrier                 | 정상 final response/terminal 손실                          | **중~상**. OS별 fake process test가 필요.               |
| Timer와 ingress의 공통 owner queue                          | timeout/terminal race가 nondeterministic                | **중**. Fake-clock infrastructure 필요.              |
| Byte-oriented fatal UTF-8 JSONL reader                  | cap 우회, invalid byte 치환, partial-frame 모호성             | **중**. Connection 내부에 국한.                         |
| Outbound RequestId lifetime non-reuse                   | late response misrouting                               | **하**. String ID generator와 invariant test.       |
| Known/unadopted/unknown/malformed method failure matrix | 구현마다 ignore 또는 connection close                        | **하~중**. Inventory-driven table로 해결 가능.           |
| Runtime–Connection–Thread cardinality                   | resume/read/interrupt를 추가할 때 public API break          | 지금은 **하**, 구현 후 수정하면 **상**.                       |
| Per-thread와 global capacity의 관계 및 fairness              | A가 global budget을 고갈시켜 B 진행을 막음                        | **중**. Hierarchical cap 또는 admission fairness 필요. |
| Approval lease expiry disposition                       | timeout 시 `decline`, `cancel`, JSON-RPC error 중 구현이 갈림 | 구현 **하**, 제품·안전 의미 결정 비용 **중**.                   |
| stderr drain와 diagnostic retention                      | stderr pipe가 차서 child가 block되거나 no-raw 위반              | **하~중**.                                          |
| Fake/source/live verification authority                 | 실행 불가능하거나 flaky한 conformance gate                      | **중**. Harness는 일찍 만들수록 비용이 낮다.                   |

### 개별 hardening 판정

* **Exact ID parser:** 유지해야 한다. 다만 outbound ID를 string으로 제한하면 대부분의 JS numeric ambiguity를 제거할 수 있다. Inbound unsafe number와 negative zero reject는 upstream guarantee가 아니라 `TS compatibility restriction`으로 ledger에 기록해야 한다. Exact-pin server가 더 넓은 numeric domain을 합법적으로 사용할 수 있다면 raw numeric lexeme를 보존하는 parser가 필요하다.
* **Count·byte caps:** 유지해야 한다. 과도한 것은 cap의 존재가 아니라 control reserve, owner별 failure scope, accounting transfer가 없이 cap 개수만 늘리는 것이다.
* **Phase deadlines:** 유지해야 한다. 문제는 각 deadline의 clock start, cancelability, tie-break, public acceptance class가 빠진 점이다.
* **No-raw contract:** 유지하되 construction-by-type으로 구현해야 한다.
* **Safe generation:** 유지하되 same-pin runtime 개발과 병렬화한다.
* **Three-root validation:** 유지한다. 실제 package tarball에서 resolved binary와 runtime-home pair를 검증하는 provenance test가 필요하다.
* **Unbound waiter cohort failure:** 단순 hardening이 아니라 legal concurrency를 실패시킬 수 있는 semantic policy다. `TS hardening` label만 붙이는 것으로 충분하지 않고, serialize 또는 keyed convergence 중 하나를 선택해야 한다.

---

## 5. Implementation graph audit

### 잘못된 blocking edge

| Current edge                                                                                         | 판정                                         | 수정                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `003 safe same-pin generation → 004 authenticated pin-upgrade transaction → 005 runtime preparation` | **잘못된 blocker**                            | 004는 pin 변경과 final artifact promotion만 block한다. Exact pin `7678224…`로 005를 구현하는 데 선행할 이유가 없다.                                                          |
| `002 coverage ledger v2 → 003 generation`                                                            | **부분적으로 과도함**                              | Pin과 generated inventory selector의 최소 skeleton만 있으면 generation과 ledger 상세화를 병렬 진행할 수 있다. Ledger promotion은 gate지만 code generation 시작의 blocker일 필요는 없다. |
| `006 router → 007 actual-child bootstrap`                                                            | **source feedback가 늦음**                    | 006에서 최소 router와 actual packaged child spawn/initialize를 같이 실행해야 한다. Fake-only router를 먼저 완성하지 않는다.                                                    |
| `008 full finite-resource/terminal hardening → 009 T0 nominal`                                       | **잘못된 순서**                                 | Write/terminal의 최소 correctness는 T0 전에 필요하지만, 모든 cap·security hardening을 첫 T0보다 먼저 완성하면 실제 protocol mismatch를 너무 늦게 발견한다.                               |
| `010 T0 completion → 011/012`                                                                        | **final gate로는 타당, 개발 blocker로는 과도할 수 있음** | T0-C scheduler와 T0.1 lease state machine은 T0 terminal skeleton이 생긴 뒤 병렬 개발할 수 있다. 승격만 010을 기다리면 된다.                                                    |
| `011 + 013 → 014 Host removal`                                                                       | **불충분한 join**                              | Current Host reachability/export/consumer migration gate가 추가되어야 한다.                                                                                    |
| `015 legacy transport removal → 016 final certification`                                             | **certification이 너무 늦음**                   | Cutover 직전 pre-removal certification과 deletion 후 installed-artifact certification이 모두 필요하다.                                                            |

### 합치거나 나눌 ticket

**합칠 것**

* `006 exact bidirectional router`와 `007 actual-child bootstrap`의 최소 부분을 하나의 vertical ticket으로 합친다.
* `009 T0 nominal`은 위 vertical ticket의 acceptance test로 당겨야 한다. “Initialize까지만 성공”은 너무 약하다.
* `012 T0.1 nominal`과 `013 T0.1 completion`을 파일 단위로 합칠 필요는 없지만, coverage ledger의 `implemented/integration` 승격은 둘을 모두 통과한 뒤 한 번만 수행한다. Approval response를 write했다는 것만으로 nominal implementation을 완료 처리하면 안 된다.

**나눌 것**

* `008`을 다음 둘로 나눈다.

  1. **Correctness-critical terminal/write hardening:** F-01, F-02, F-04, F-06, F-07, F-08, F-09.
  2. **Resource/security hardening:** cap tuning, duplicate-key parser, no-raw property checks, workload budgets.
* `014`를 나눈다.

  1. Consumer cutover와 public export 변경.
  2. Host/layout dead-code deletion.
* `016`의 certification을 pre-cutover와 post-deletion으로 나눈다.

### 가장 이른 executable proof

최소 선행 조건은 다음이다.

```text
001 provenance pin의 최소 manifest
+ 003 exact-pin generated artifacts
+ 005 runtime preparation의 binary/home/cwd resolution
+ 006의 최소 router/writer/reader
```

이 시점에 바로 다음을 실행해야 한다.

```text
exact installed npm tarball의 packaged child spawn
→ initialize response
→ initialized notification write
→ thread/start 한 번
→ process close
```

그 다음 같은 ticket 또는 바로 다음 ticket에서 T0 한 turn의 terminal까지 확장한다. `unsupported inbound Server request`는 live binary가 임의의 unknown request를 발생시키기를 기다리는 gate가 아니라 scripted child의 deterministic gate여야 한다. Live oracle은 package/source compatibility를 증명하고, fake child는 ordering·backpressure·disconnect·malformed frame을 증명하며, exact-pin method source/test는 그 fake ordering이 legal한지를 증명한다.

### 권장 graph의 최소 수정

```text
001 provenance pin
├─→ 002 coverage ledger v2 ───────────────────────────────┐
├─→ 003 exact same-pin generation ─→ 005 preparation ─┐   │
└─→ 004 pin-upgrade transaction (parallel; pin change only)│   │
                                                        ↓   │
006 router + actual-child initialize/thread-start vertical │
→ 007 writer/terminal/lease linearization                  │
→ 008 T0 nominal + completion                              │
   ├─→ 009 T0-C + FAILED_DRAINING/cap isolation ─────┐     │
   └─→ 010 T0.1 lease CAS + completion ──────────────┤     │
                                                     ↓     │
011 current Host selector/reachability closure ←───────────┘
→ 012 installed-artifact pre-cutover certification
→ 013 consumer/export cutover
→ 014 Host/layout dead-code deletion
→ 015 legacy transport deletion
→ 016 post-deletion certification + rollback install proof
```

### Legacy contraction을 시작해도 되는 exact join condition

다음 conjunction이 모두 참일 때만 consumer cutover를 시작한다.

```text
J =
  provenance_manifest_attested
  AND exact_pin_generated_inventory_matches_installed_binary
  AND writer_linearization_tests_pass
  AND control_response_capacity_tests_pass
  AND process_eof_close_drain_tests_pass
  AND request_id_nonreuse_and_stale_lease_tests_pass
  AND T0_live_exact_package_pass
  AND T0_completion_fake_and_live_pass
  AND T0_C_independence_pass
  AND T0_1_lease_and_terminal_races_pass
  AND every_reachable_HeadlessCodexClientHost_selector IS ONE OF (
        replacement_implemented_and_integration_proven,
        consumer_deleted,
        explicitly_approved_breaking_removal
      )
  AND repository_and_downstream_consumers_are_migrated_or_zero
  AND public_export_snapshot_is_intentional
  AND rollback_artifact_installs_and_smokes
```

`J`는 **cutover 시작 조건**이다. Host와 legacy transport의 physical deletion은 cutover build가 installed-artifact smoke를 통과한 다음 단계다.

Future AYPLE adapter는 `J`의 무조건적인 항목이 아니다. 다만 current repository에 Host의 product layout/sanitized event를 실제로 소비하는 코드가 남아 있다면, 그 소비자를 삭제하거나 별도 migration하는 것은 Host 삭제의 조건이다. 이것은 adapter를 foundation blocker로 만드는 것이 아니라 reachable dead-code 여부를 확인하는 것이다.

---

## 6. Human decisions still required

| 실제 결정                                  | 선택지                                                                                            | 권장 default                                                                                          | Source 확인만으로 끝나지 않는 이유                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Pre-identity `thread/start` 동시성        | connection당 serialize / keyed concurrent convergence                                           | **T0에서는 serialize**                                                                                 | Upstream이 우연히 serialize하더라도 public runtime이 어떤 concurrency를 약속할지는 설계 선택이다.          |
| Runtime cardinality                    | Runtime당 독립 child/Connection / 한 Connection에 여러 public Runtime / 한 Runtime이 여러 ThreadHandle 소유 | **한 public Runtime이 하나의 private Connection과 여러 ThreadHandle을 소유**                                   | Process isolation, resource sharing, close semantics, future resume 전략의 trade-off다. |
| Response 전 approval 처리                 | provisional approval을 caller에 노출 / response까지 hold / 자동 cancel                                 | **connection-bound opaque provisional approval을 노출하고 outcome을 unknown-capable로 유지**                 | Source는 legal order를 말할 수 있지만, identity commitment 전 side effect를 허용할지는 안전 정책이다.    |
| Approval lease expiry                  | `cancel` / `decline` / protocol error / connection close                                       | Exact response semantics를 확인한 뒤 **no-execution 의미의 disposition**                                    | 각 값이 server와 제품에서 갖는 의미와 사용자 동의 정책이 다르다.                                            |
| Unknown outcome의 public representation | typed exception / discriminated return / event-only                                            | **discriminated outcome**: `not_sent`, `acceptance_unknown`, `accepted_execution_unknown`, terminal | Retry 안전성을 caller가 검사할 수 있어야 하는 API 선택이다.                                           |
| Capacity failure isolation             | thread-local drain 후 계속 / 즉시 connection close / configurable                                   | Validated thread-local overflow는 **FAILED_DRAINING 후 계속**, drain terminal 부재는 connection close      | Availability와 bounded-memory 안전성 사이의 선택이다.                                          |
| Cap/deadline configuration             | 완전 고정 / 전부 public option / internal defaults + test override                                   | **internal defaults + package-private test override**, 운영 근거가 생긴 뒤 제한적 public config                | 수치는 source가 아니라 workload와 SLO가 결정한다.                                                |
| Duplicate-key threat model             | pinned local child를 trusted / corruption만 방어 / malicious child까지 방어                            | 최소한 corruption 방어. Malicious child까지 포함한다면 vetted tokenizer 채택                                      | 요구되는 parser 복잡도와 dependency 허용 여부는 보안·운영 결정이다.                                      |
| Legacy breaking removal 방식             | 한 번에 삭제 / cutover 후 별도 dead-code 삭제 / compatibility shim                                       | Compatibility를 제공하지 않더라도 **cutover와 deletion을 분리**                                                  | Source는 consumer를 찾을 수 있지만 rollback window와 release 위험 허용치는 사람이 정한다.                |

다음은 human decision으로 올리면 안 된다. Exact approval response shape, `serverRequest/resolved` payload, exact-pin method ordering source, packaged binary path, generated inventory membership, 현재 Host import consumer 수는 source/code/probe로 답해야 하는 검증 항목이다.

---

## 7. Residual uncertainty

1. **Concurrent `thread/start` ordering evidence:** Exact-pin method source 또는 test가 동일 connection에서 복수 `thread/start`의 notification/response 순서를 serialize한다고 증명하는지 확인 자료가 필요하다. Generated TypeScript/Schema는 이 질문에 답하지 않는다.

2. **Approval-before-response legality와 `serverRequest/resolved` precedence:** Ticket 004의 early event 사례로 보아 pre-response activity는 현실적인 반례지만, exact pin에서 command approval이 `turn/start` response보다 먼저 노출될 수 있는지와 resolved notification의 정확한 발생 시점은 method source/test 또는 controlled live trace가 필요하다.

3. **npm artifact와 source commit의 provenance:** `@openai/codex@0.144.0` top-level tarball, 실제 resolve된 platform package, embedded binary가 commit `7678224…`와 동일 protocol implementation이라는 attestation 또는 reproducible manifest가 첨부되지 않았다. 이 관계가 닫히기 전에는 source를 live artifact의 동작으로 승격할 수 없다.

4. **Current AY-PLE reachability:** 첨부 `README.md`는 current implementation claim의 근거지만, AY-PLE baseline `ec4849…`의 source/import graph가 없으므로 `HeadlessCodexClientHost`, layout, sanitized events와 failure policy의 실제 consumer를 판정할 수 없다. 따라서 014 removal gate의 sufficiency는 현재 증명되지 않았다.

5. **Live probe corpus:** Exact packaged binary에 대한 initialize, early turn event, disconnect-after-final-frame, approval/resolved permutations의 timestamped JSONL trace가 없다. Live probe는 legality 전체를 증명하지 못하지만 source/build mismatch를 발견하는 데 필요하다.

6. **Cap과 deadline 수치:** Frame 크기, 평균/최대 delta rate, 동시 active thread/lease 수, npm child startup distribution, semantic turn duration의 측정치가 없다. 현재는 cap/deadline의 존재만 평가할 수 있고 값의 적절성은 판정할 수 없다.

7. **Cross-platform process behavior:** Linux/macOS/Windows에서 packaged launcher가 직접 binary를 spawn하는지, process tree를 만드는지, stderr 양과 reap 방식이 어떤지는 actual package probe가 필요하다. Close/reap policy는 이 자료 없이 완결할 수 없다.

8. **Future method admission matrix:** `turn/interrupt`, steer 계열, `thread/read`, `thread/resume`가 active turn과 동시에 합법적인지, 어떤 response/notification convergence가 필요한지는 exact-pin source로 확인해야 한다. 현재 foundation은 opaque Thread/Turn handle과 per-thread control lane을 보존하면 확장을 막지 않지만, 해당 methods의 lifecycle을 지금 추측해 spec에 넣어서는 안 된다.

[1]: https://www.jsonrpc.org/specification "https://www.jsonrpc.org/specification"
[2]: https://nodejs.org/api/child_process.html "https://nodejs.org/api/child_process.html"
[3]: https://nodejs.org/api/stream.html "https://nodejs.org/api/stream.html"
