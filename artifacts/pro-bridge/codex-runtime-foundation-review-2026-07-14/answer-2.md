## 1. Revised overall verdict

**`ready with required corrections`**

1차의 `not implementation-ready` 판정은 과도했다. Exact-pin source는 F-03의 pre-response matching `thread/started` trace를 배제하고, 전체 repository는 F-04·F-05·F-08·F-12·F-13·F-15에서 누락이라고 본 계약과 consumer audit을 이미 갖고 있다. 구현 전 실제 P1 blocker로 남는 것은 queued frame의 취소·handoff 선형화, required Server response capacity reservation, unexpected child-exit의 stdout/dispatch drain barrier다. Deadline tie-break와 pre-decode framing은 P2 보강이며 기존 module boundary나 public Interface를 바꿀 필요가 없다. 따라서 foundation은 유지하되 아래 최소 correction을 spec과 ticket graph에 먼저 반영해야 한다.

> **검증 범위:** exact AY-PLE ref의 개별 파일, package/import/export, exact upstream source/test와 commit comparison은 확인했다. 다만 private repository에 대해 connector로 독립적인 recursive tree listing 및 `git grep` 재실행은 **NOT VERIFIED**다. F-15는 committed audit의 재현 가능한 검색 결과, audit fixed point `898ab728...`에서 review commit `ec484901...`까지의 exact compare에서 production/test code 변경이 0개였다는 사실, 그리고 현재 package/import/export 파일의 직접 조회를 결합해 판정했다. Audit 자체는 durable consumer 0과 사용한 정확한 검색 명령·결과를 기록한다.

---

## 2. Finding disposition table

| ID       | Verdict      | Revised severity | Repository evidence                                                                                                                                                                                                                                                                         | Upstream evidence                                                                                                                                                                                   | Trace verdict                                                                                                                                                                                                                                | Minimal correction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Reason for change                                                                                                                                                                                                                |
| -------- | ------------ | ---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-01** | **NARROW**   |           **P1** | `docs/specs/2026-07-14-codex-native-runtime-foundation.md:295, 396-403, 411-415`. Spec은 serialized writer, callback의 제한된 의미, `known_not_sent`와 post-attempt unknown을 이미 구분하지만 queue entry를 제거하는 atomic point는 정의하지 않는다.                                                                     | Exact-pin Python client는 lock으로 writer를 serialize하지만 cancelable queue 상태는 제공하지 않는다. Node `write()` callback은 chunk가 stream에서 처리된 시점이며 `drain`도 OS delivery admission일 뿐 peer parse/acceptance가 아니다. | **underspecified.** `known_not_sent`가 immutable하므로 timeout 뒤 실제 write는 의미상 허용되지 않아야 하지만, 현재 문구만으로 deadline과 writer dequeue 사이의 승자를 구현할 수 없다.                                                                                                 | Writer frame에 `QUEUED_CANCELABLE → HANDED → CALLBACK_SETTLED`를 둔다. `HANDOFF`는 single writer가 `stdin.write(encodedFrame)`를 호출하는 순간이다. Queue deadline은 `QUEUED_CANCELABLE`만 CAS 제거한다. Matching valid response가 callback보다 먼저 오면 response가 operation authority이며 callback은 writer bookkeeping만 끝낸다. Response deadline만 잃은 경우에는 operation-local `acceptance_unknown`; Connection terminal은 callback/write fault, handed frame의 writer-completion deadline 상실, partial-frame 가능성처럼 writer trust/progress를 잃은 경우로 한정한다. | 원 finding의 core race는 유효하다. 다만 “handoff 후 response timeout이면 항상 Connection terminal”은 지나쳤다. Response authority timeout과 writer 자체의 progress/trust loss를 분리해야 한다.                                                                 |
| **F-02** | **UPHOLD**   |           **P1** | `...foundation.md:295, 297, 379-381, 444`. 하나의 writer를 쓰고 required Server response reserve 실패를 Connection terminal로 정했지만, active lease admission 전에 reserve를 획득하는 알고리즘이 없다.                                                                                                                 | Exact-pin Rust remote client는 command channel과 하나의 writer worker를 통해 resolve/reject를 쓰지만, application saturation에서 response capacity를 미리 보존한다는 보장은 없다.                                              | Inbound Server request는 **legal**하다. Saturated application queue에서 lease는 만들었지만 response를 enqueue하지 못하는 결과가 **underspecified**이며 deadlock 가능성이 남는다.                                                                                          | 별도 physical writer는 필요 없다. Inbound request를 active map에 넣기 전에 `1 frame + maxEncodedAllowedResponseBytes`를 writer control budget에서 atomic reserve한다. T0.1은 exact ID를 포함한 `accept/decline/cancel` 및 deterministic error 중 최댓값, fallback은 사전 인코딩한 error 크기를 예약한다. Claim은 reservation을 concrete control frame으로 전환하고, resolved/transition/terminal은 reservation을 반환한다. Same active replay는 새 reservation을 만들지 않는다.                                                                                                    | Spec이 “reserve 실패” 결과만 정하고 reserve acquisition과 queue scheduling을 닫지 않았다. Count/byte reserve와 control priority가 실제로 구현되어야 한다.                                                                                                    |
| **F-03** | **WITHDRAW** |         **none** | `...foundation.md:321, 333, 431, 441`은 matching pre-response `thread/started`를 legal convergence가 아니라 pinned compatibility violation으로 분류하고, 당시 write-attempted cohort만 fail-closed한다.                                                                                                      | Exact pin은 같은 task에서 `send_response_with_thread_originator(...).await` 후 `ThreadStarted` notification을 enqueue한다. First-party test도 response를 먼저 읽은 뒤 corresponding notification을 읽는다.              | Trace C의 matching pre-response `thread/started(T2)`는 exact pin에서 **illegal**하다.                                                                                                                                                              | **none.** Concurrent `thread/start`를 이를 이유로 serialize하지 않는다. Cohort failure는 impossible-at-pin observation의 fail-closed TS compatibility policy로 유지한다.                                                                                                                                                                                                                                                                                                                                                            | 1차 답변은 generated shape만으로 ordering을 열어 두고 exact method source를 보지 못했다. 모든 current candidate가 RequestId 없이 모호하므로 established threads를 보존하면서 active cohort만 실패시키는 현재 scope도 과도하다고 볼 근거가 없다.                                        |
| **F-04** | **WITHDRAW** |         **none** | Public approval status는 `submitted/already_answered/stale/delivery_unknown`을 이미 구분한다. T0.1은 pre-response request를 sanitized lease로만 stage하고, response-confirm 후에만 handler를 호출하며, atomic claim·resolved/turn/connection revocation·post-attempt delivery unknown을 명시한다.                      | Exact-pin TUI pending map은 response operation에서 entry를 먼저 remove한 caller만 wire resolution을 만들고, resolved notification도 remove-only이며 miss는 no-op다.                                                  | 1차 Trace D처럼 response 전 caller가 public handle을 받아 `approve_once`하는 경로는 현재 Interface에서 **illegal**하다. Handler activation 뒤의 resolved/decision race는 이미 정해져 있다. Claim 후 아직 handed되지 않은 frame의 cancellation만 F-01에 종속된 **underspecified** 부분이다. | **none independent of F-01.** F-01 correction에서 queued approval frame이 resolved/transition에 의해 취소되면 해당 `respond()`가 `stale`, handoff 뒤 cut이면 `delivery_unknown`으로 끝난다고 명시하면 충분하다.                                                                                                                                                                                                                                                                                                                                 | 1차 답변은 pre-response staging, atomic claim과 stale rules를 누락으로 잘못 보았다. Public request는 opaque closure/object이며 original ID를 노출하지 않으므로 reconnect epoch/nonce는 normative contract가 아니라 선택적 private defensive token이다.                |
| **F-05** | **WITHDRAW** |         **none** | Outcome 뒤 operation route를 해제하고 late response는 map miss, late notification은 operation-route miss no-op라고 직접 명시한다. T0-C의 A2는 새 admission이며 same-thread second turn은 out of scope다.                                                                                                           | Exact-pin Python routing도 registered turn route를 제거하고, response는 active map에서 pop한 뒤 miss를 no-op로 처리한다. First-party port audit 역시 TUI projection에서 permanent sink/poison을 도출하지 않는다.                 | Trace E에서 late A event가 새 actor/FIFO를 자동 생성한다는 전제는 current contract에서 **illegal**하다.                                                                                                                                                         | **none.** Operation-local overflow 뒤 route를 제거하고 late events를 no-op하는 현재 계약을 유지한다.                                                                                                                                                                                                                                                                                                                                                                                                                                | Actor recreation 경로가 repository contract에 없다. Authoritative terminal이 오지 않았다는 이유만으로 healthy Connection을 닫거나 temporary drain actor를 보존할 필요도 T0/T0-C에서 증명되지 않는다.                                                                   |
| **F-06** | **NARROW**   |           **P3** | Sole reader와 bounded dispatch를 소유하고, T0-C는 A의 approval·terminal 지연이 B의 response/fallback/validation/outcome을 막지 않아야 한다고 이미 요구한다.                                                                                                                                                            | Exact-pin Python reader는 Server request handler를 동기 호출하지만, 이는 Promise 기반 public handler를 가진 TS deployment의 cross-thread liveness guarantee가 아니다.                                                    | A handler를 기다리는 ingress는 legal이지만, 그 때문에 B를 block하는 결과는 current T0-C상 **illegal**하다.                                                                                                                                                         | Architecture 변경은 없다. Connection dispatch 완료를 “parse/validate 후 bounded owning-route enqueue 성공”으로 정의하고, public handler·operation terminal·semantic Promise는 await하지 않는다는 ticket-level acceptance 문장과 never-resolving handler fake를 추가한다.                                                                                                                                                                                                                                                                          | 1차 답변은 이를 새 P1 architecture finding으로 과대평가했다. Observable independence contract와 required tests가 이미 존재하므로 남는 것은 direct implementation clarification이다.                                                                            |
| **F-07** | **UPHOLD**   |           **P1** | Bootstrap은 exit·EOF·read/write fault·explicit close를 같은 terminal arbiter로 보낸다. 그러나 complete-frame drain 순서는 explicit `close()`에만 자세히 있고, unexpected `exit`에서 pending settlement가 stdout/dispatch drain 전인지 후인지 닫혀 있지 않다.                                                                    | **not applicable — governing fact is Node process semantics.** Node의 `exit` 시점에는 stdio가 아직 열려 있을 수 있고, `close`는 process 종료와 stdio closure 뒤에 발생한다. 여러 process가 pipe를 공유할 수도 있다.                     | Child가 final response/terminal을 쓰고 즉시 exit하는 trace는 **legal**하며 현재 terminal settlement order는 **underspecified**다.                                                                                                                           | 첫 terminal signal은 admission만 freeze한다. Pending semantic settlement는 `stdout EOF 또는 bounded drain cut → partial-frame 판정 → validated dispatch drain` 뒤에 수행한다. Direct child exit/reap observation은 별도로 보존한다. Descendant가 pipe를 열어 둔 경우 dedicated drain deadline에서 streams를 cut하고 남은 pending만 stage별 unknown으로 settle한다.                                                                                                                                                                                            | 1차 finding이 그대로 남는다. 그렇지 않으면 exit 직전 기록된 authoritative response/terminal을 transport loss로 잘못 분류할 수 있다.                                                                                                                           |
| **F-08** | **WITHDRAW** |         **none** | Client ID는 1부터 증가하고 Connection lifetime 내 재사용하지 않으며 exhaustion은 pre-wire failure라고 이미 명시한다. Active response는 first settlement에서 제거되고 late response는 miss no-op다. Approval public handle에는 original ID가 없고 close는 active lease를 revoke한다.                                                    | Exact-pin Rust client도 active map에서 duplicate를 확인하고 첫 response/error에 remove하며 disconnect 시 현재 pending만 실패시킨다.                                                                                      | 같은 Connection에서 ID가 재사용되는 Trace H는 **illegal**하다. Old public approval handle이 새 Connection의 같은 numeric ID를 대상으로 삼는 public API trace도 존재하지 않는다.                                                                                               | **none.** Private object identity 또는 epoch token은 구현 방어 수단으로 사용할 수 있으나 public/normative invariant가 아니다.                                                                                                                                                                                                                                                                                                                                                                                                           | 1차 답변이 이미 존재하는 non-reuse invariant를 놓쳤다. Dedicated Runtime/Connection과 closure-bound lease 때문에 reconnect cross-targeting 경로도 없다.                                                                                                 |
| **F-09** | **UPHOLD**   |           **P2** | Deadline은 route/state를 해제하고 outcome을 immutable하게 만든다고 하지만, validated frame admission과 timer callback이 경합할 때 무엇이 먼저인지 정의하지 않는다.                                                                                                                                                              | **not applicable — TS reducer hardening.**                                                                                                                                                          | Terminal이 owner queue에 먼저 admit됐지만 timer가 state를 먼저 mutate하는 trace는 **legal**한 scheduling race이고 결과는 **underspecified**다.                                                                                                                    | Client response deadline은 Connection waiter route, semantic terminal deadline은 native thread/turn operation route에 timeout marker를 enqueue한다. Timer callback이 owner state를 직접 mutate하지 않는다. 같은 route에서 먼저 admitted된 validated observation 또는 timer marker가 이긴다. Global timer queue는 만들지 않는다.                                                                                                                                                                                                                      | Repository 추가 근거도 이 tie-break를 제공하지 않는다. Original P2와 correction이 그대로 유효하다.                                                                                                                                                      |
| **F-10** | **NARROW**   |           **P2** | Spec은 16 MiB를 actual UTF-8 bytes로 정의하고 malformed UTF-8를 Connection terminal로 만들며 partial/multiple chunk, complete-frame cap test를 요구한다.                                                                                                                                                     | Exact-pin Python external client는 text `readline()`과 `json.loads()`를 사용하지만 finite pre-decode byte hardening을 제공하지 않는다.                                                                              | Oversize/no-newline, invalid UTF-8와 partial EOF injection은 **legal fault traces**다. Failure class는 대부분 이미 정해졌지만 cap을 decoding 전 적용하는 시점은 **underspecified**다.                                                                                | Normative gap만 남긴다: stdout은 bytes로 accumulate하며 LF 전 raw bytes가 cap을 넘는 즉시 terminal; bounded complete frame만 fatal UTF-8 decode; EOF에 nonempty unterminated bytes가 있으면 truncated-frame terminal. Blank frame과 BOM은 malformed JSON으로 처리한다. CRLF를 별도 compatibility feature로 약속하거나 특정 Buffer-splitter class를 고정할 필요는 없다.                                                                                                                                                                                             | 1차 답변은 byte cap과 UTF-8 failure contract 전체가 빠졌다고 과장했다. 남는 것은 pre-decode boundedness와 EOF framing뿐이다.                                                                                                                             |
| **F-11** | **NARROW**   |           **P3** | Validation table은 active response, adopted/tolerated notification, known-unadopted notification, valid/invalid known request, future unknown request와 malformed envelope를 이미 모두 다룬다. inventory 밖 **unknown notification** 한 cell만 직접 적혀 있지 않다.                                              | Exact-pin Rust remote client는 unknown inbound **request**를 same-ID `-32601`로 거절하지만 unknown notification에 대한 normative disposition은 제공하지 않는다.                                                        | Certified exact-pin binary가 inventory 밖 notification을 내는 것은 **illegal compatibility observation**이다. 그 fault의 disposition만 **underspecified**다.                                                                                              | 표에 한 행 추가: `Inventory-unknown notification with classifiable method envelope → params를 typed/retain하지 않고 bounded sanitized no-op diagnostic; projection 0회`. Malformed envelope는 기존 Connection terminal을 유지한다.                                                                                                                                                                                                                                                                                                    | 1차 F-11의 대부분은 이미 spec에 있었다. Exact-pin T0 correctness blocker가 아닌 forward/skew disposition 한 cell로 축소한다.                                                                                                                          |
| **F-12** | **WITHDRAW** |         **none** | Provenance contract는 exact npm version, tag/ref, attested commit, root/platform integrity roster, generated digest를 manifest에 연결하고, preflight에서 lock의 version/resolved/integrity, package-owned launcher/native binary와 `codex --version`을 검증한다. Unit/fake/live/source authority도 분리한다.     | **not applicable.** Artifact-to-source linkage is owned by npm attestation and the exact lock/provenance chain, not another Codex runtime method.                                                   | Source/generated/binary mismatch는 이미 **certification failure**다. Live가 arbitrary unsupported request와 adversarial ordering을 증명해야 한다는 1차 해석은 current contract에서 **illegal**하다.                                                                | **none.** Absolute installed path나 extracted native-file hash를 manifest에 고정하는 것은 local post-install tampering이라는 별도 threat model이다. 현재 supply-chain drift contract에는 root/platform tarball integrity + package-owned resolved path/version이면 충분하다.                                                                                                                                                                                                                                                                | 1차 답변이 Provenance and Safe Generation 및 Oracle ownership을 충분히 읽지 못했다. Fake/unit이 adversarial race를, live가 narrow package compatibility를 소유한다고 명시되어 있다.                                                                           |
| **F-13** | **WITHDRAW** |         **none** | Public API는 dedicated Runtime에서 concurrent `runNewConversation()`을 제공하고 opaque `CodexConversation`을 반환한다. Spec은 future `runTurn/read/resume/activity/control`을 capability 또는 Runtime에 additive하게 추가한다고 명시하며 공개 `Runtime→Thread→Turn` 선고정을 의도적으로 거절했다.                                       | **not applicable — AY-PLE public Interface choice.**                                                                                                                                                | 기존 caller를 깨지 않고 `runtime.runTurn({ conversation, ... })`, `read`, `resume`, `subscribeActivity`, control method를 추가할 수 있다. 구체적 breaking trace는 **없다**.                                                                                      | **none.** 지금 public ThreadHandle/TurnHandle을 도입하지 않는다.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 1차 답변은 future extension point가 이미 opaque capability로 존재한다는 Design It Twice 결과를 놓쳤다.                                                                                                                                              |
| **F-14** | **UPHOLD**   |           **P2** | Current migration order는 safe ledger/generation을 먼저 두고 preparation/Connection, Runtime/T0, sibling T0-C/T0.1로 진행한다. 아직 implementation tickets는 없으며 exact split은 미정이다.                                                                                                                       | **not applicable — implementation planning.**                                                                                                                                                       | Runtime failure trace가 아니라 **dependency risk**다. Authenticated future pin-upgrade transaction이 same-pin preparation과 첫 exact-package feedback을 막아야 할 근거는 없다.                                                                                 | Pin-upgrade transaction을 parallel branch로 옮긴다. Critical writer/response-capacity/terminal-drain correctness를 unit/fake로 닫은 즉시 exact installed package의 `initialize → initialized → thread/start → close` vertical proof를 실행한다. Full cap/security/no-raw hardening은 그 뒤 가능하지만 integration promotion 전에는 모두 완료한다.                                                                                                                                                                                                   | 16-ticket graph의 004→005 edge와 actual-package feedback 지연은 여전히 부당하다. 다만 implementation tickets가 아직 없으므로 graph만 최소 수정하면 된다.                                                                                                       |
| **F-15** | **WITHDRAW** |         **none** | Consumer audit은 repository-wide 검색 명령과 결과를 기록하며 durable Host consumer 0을 확인한다. Package는 private이고, workspace dependency consumer는 server/inspector뿐이다. Server는 Adapter/status/capability만, Inspector는 capability type만 import한다. Host는 root에서 export되지만 dedicated test/fake 외 consumer가 없다. | **not applicable.**                                                                                                                                                                                 | Hidden production consumer가 Host deletion으로 깨지는 1차 trace는 immutable commit에서 **재현되지 않는다**.                                                                                                                                                   | **none beyond existing plan.** T0/T0-C/T0.1, full regression, ledger membership 0, clean build와 default-condition import gate 뒤 root export와 physical source를 같은 atomic implementation checkpoint에서 삭제해도 된다. Separate deprecation/cutover release는 필요 없다.                                                                                                                                                                                                                                                         | 1차 답변의 “reachability proof가 없다”는 잘못이었다. Audit fixed point 이후 review commit까지 exact compare에는 docs·README만 있고 production/test code 변경이 없다. Existing removal plan도 Harness exports를 선별 보존하고 removed symbol의 clean import 검증을 요구한다. |
| **F-16** | **UPHOLD**   |           **P3** | ADR은 Host가 process/RPC, conversation, global state와 product 관심사를 결합했다고 적고 기존 Host 확장을 거절한다. 다만 holdback을 필연화한 직접 원인과 결합이 초래한 확대 효과를 구분하지 않는다.                                                                                                                                               | **not applicable — architecture rationale.**                                                                                                                                                        | 같은 두 module로 분리해도 response-authoritative identity와 generation-wide publication order를 동시에 유지하면 A response 전 B publication을 hold해야 한다. 이 counterfactual은 **legal**하다.                                                                         | ADR rationale을 “global publication-order contract가 causal root이고 monolithic Host는 blast radius와 testability를 악화한 amplification factor”로 한정해 수정한다.                                                                                                                                                                                                                                                                                                                                                                 | Original documentation-only finding은 그대로 유효하다. Module split 자체가 journal 필요성을 제거한 것은 아니다.                                                                                                                                         |

### 재심 집계

| Disposition        | IDs                                      |
| ------------------ | ---------------------------------------- |
| **UPHOLD**         | F-02, F-07, F-09, F-14, F-16             |
| **NARROW**         | F-01, F-06, F-10, F-11                   |
| **WITHDRAW**       | F-03, F-04, F-05, F-08, F-12, F-13, F-15 |
| **NEEDS EVIDENCE** | 없음                                       |

---

## 3. Minimum blocking correction set

아래 여섯 항목만 implementation ticket 생성 전에 반영해야 한다. F-06, F-11, F-16의 P3 clarification은 같은 spec edit에 넣을 수 있지만 implementation-start blocker는 아니다.

### B1. Writer queue cancellation과 handoff 선형화

**Owning section:** `Connection Invariants / Bootstrap과 task ownership`, `Finite Capacity and Deadlines / Deadline defaults`, `Failure Behaviour`.

**필요한 contract 문구:**

> 각 encoded outbound frame은 `QUEUED_CANCELABLE`, `HANDED`, `CALLBACK_SETTLED` 중 하나다. `HANDOFF`는 serialized writer가 해당 frame으로 `stdin.write()`를 호출하는 순간이다. Queue/admission deadline은 `QUEUED_CANCELABLE` entry만 원자적으로 제거할 수 있으며 제거된 frame은 이후 write할 수 없다. `HANDOFF` 뒤 response-authority timeout은 owning operation만 `acceptance_unknown`으로 끝내며 Connection을 자동 terminal 처리하지 않는다. Writer callback error 또는 writer-completion deadline 상실은 writer progress/trust loss이므로 Connection terminal이다. Matching generated-valid response가 writer callback보다 먼저 admit되면 response가 operation outcome을 확정하며 이후 callback은 이를 소급 변경하지 않는다.

Approval response에 대해서는 queued cancellation이 `stale`, handoff 뒤 terminal cut이 `delivery_unknown`이다.

**Deterministic test:**

```text
frame C0 handed and callback blocked
→ C1 mutation queued
→ C1 queue deadline
→ unblock C0
→ assert C1 wire frame count = 0
→ assert known_not_sent
```

추가로:

```text
C1 handoff
→ matching response ingress
→ writer callback success/error
```

두 순서 모두 response outcome을 유지하되 callback error면 Connection만 terminal 처리하는지 검증한다.

---

### B2. Required Server response reservation과 bounded fairness

**Owning section:** `Connection Invariants / Validation tier와 Server request fallback`, `Finite Capacity and Deadlines / Capacity defaults`.

**필요한 contract 문구:**

> Connection은 inbound Server request를 active lease map에 넣기 전에 writer의 control-response count 및 byte capacity를 원자적으로 예약한다. Reservation은 original exact ID를 포함한 허용 response/error 중 최대 encoded frame 크기와 one-frame count를 보존한다. Reservation 획득 실패는 public handler를 호출하지 않고 Connection terminal이다. First local claim은 reservation을 concrete response frame으로 전환하고, remote resolution·turn transition·Connection terminal은 아직 handed되지 않은 reservation/frame을 취소해 반환한다. Exact active replay는 기존 lease와 reservation을 재사용한다.

별도 physical writer는 필요 없다. 하나의 writer 위에 application/control 두 logical class만 있으면 된다.

**가장 작은 scheduling rule:**

> Current handed frame 뒤 control response가 있으면 하나를 먼저 쓴다. 이후 application frame도 ready하면 하나를 쓴다. 양쪽이 계속 ready인 동안 `1 control : 1 application`을 반복한다.

이는 required response가 256개 application frame 뒤에서 무기한 대기하는 것을 막으면서 Server-request flood가 application을 영구 starvation시키는 것도 막는다.

**Deterministic test:**

```text
application budget를 reservation 제외 한도까지 채움
→ inbound valid Server request S9
→ assert lease admission succeeds with one reserved frame
→ respond decline
→ assert next arbitration에서 same-ID response exactly once
→ duplicate respond/resolved는 extra reservation/frame 0
→ queued application도 다음 cycle에서 progress
```

Reserve 자체를 확보할 수 없는 tiny-cap case는 public handler 0회와 Connection terminal을 검증한다.

---

### B3. Unexpected exit의 bounded stdout/dispatch drain barrier

**Owning section:** `Connection Invariants / Bootstrap과 task ownership`, `Failure Behaviour / Failure scope`.

**필요한 contract 문구:**

> Unexpected `exit`, stdout EOF/error, stdin fault 또는 explicit close 중 첫 terminal signal은 new admission을 freeze하지만 pending waiter/operation을 즉시 settle하지 않는다. Sole reader는 stdout EOF 또는 terminal-drain deadline까지 complete frame을 수집한다. EOF의 partial frame은 dispatch하지 않고 transport/protocol terminal evidence로 기록한다. Reader 종료 뒤 validated dispatch queue가 semantic/user callbacks를 기다리지 않는 범위에서 drain된 후 남은 pending만 stage별 unknown으로 settle한다. Direct child exit/reap과 stdout/stderr closure는 별도 observation이며, descendant가 pipe를 유지하면 terminal-drain deadline에서 stream을 cut한다.

**Failure scope:**

* Drain 전에 이미 admitted된 valid response/terminal은 owning operation을 정상 settle할 수 있다.
* Drain deadline 뒤 남은 waiter만 `transport_lost`와 현재 stage effect를 받는다.
* Direct child reap이 확인됐다면 descendant-held pipe timeout 자체를 `runtime_close_failed`로 승격하지 않는다.
* Direct child reap이 확인되지 않은 경우에만 기존 close/reap failure를 유지한다.

**Deterministic tests:**

```text
child writes response + turn/completed
→ exits immediately
→ parent observes exit before stdout data/end
→ expected: response/terminal known outcome
```

```text
child exits
→ descendant keeps stdout pipe open
→ drain deadline
→ expected: bounded settlement, no infinite close, direct-child reap classification preserved
```

---

### B4. Scope-local deadline admission ordering

**Owning section:** `Runtime Lifecycle and Ordering`, `Deadline defaults`.

**필요한 contract 문구:**

> Deadline callback은 owner state를 직접 변경하지 않고 timeout marker를 owning route에 enqueue한다. Client RPC response deadline은 해당 Connection waiter route, turn semantic deadline은 해당 native thread/turn operation route에서 response/notification과 순서화된다. 같은 route에서 먼저 admitted된 validated observation 또는 timeout marker가 승자다. Cross-thread timer와 event를 global causal queue로 합치지 않는다.

Connection dispatch에는 다음 clarification을 함께 둔다.

> Dispatch completion은 bounded owning-route enqueue 완료를 뜻한다. Public approval handler, semantic terminal 또는 operation Promise completion을 await하지 않는다.

**Deterministic test:**

```text
t=999 validated terminal admitted to A route
t=1000 semantic timer callback
reducer delayed until t=1001
→ terminal wins, timer no-op
```

역순에서는 timeout이 이기고 뒤 terminal은 route miss no-op여야 한다. A의 never-resolving approval handler 동안 B response/terminal도 처리되는지 같은 scheduler로 검증한다.

---

### B5. Pre-decode byte bound와 EOF framing

**Owning section:** `Finite Capacity and Deadlines / Capacity defaults`, `Failure Behaviour`.

**필요한 contract 문구:**

> Stdout framing은 raw bytes에 대해 수행한다. LF delimiter 전에 accumulated bytes가 frame cap을 넘으면 string allocation 또는 UTF-8 decode를 더 진행하지 않고 Connection terminal로 전이한다. Cap 이내 complete frame만 strict/fatal UTF-8로 decode한다. EOF에 nonempty unterminated bytes가 남으면 truncated-frame terminal이며 해당 bytes는 JSON으로 dispatch하지 않는다.

다음은 별도 compatibility promise가 아니다.

* Blank line: malformed JSON.
* BOM-prefixed frame: malformed JSON.
* CR before LF: JSON whitespace로 parser가 허용하는 범위 이상을 별도로 약속하지 않음.
* 특정 `BufferSplitter` class나 dependency: implementation detail.

**Deterministic tests:**

* newline 없이 `cap+1` bytes
* `cap-1`, `cap`, `cap+1`
* 모든 위치에서 분할된 multi-byte UTF-8
* invalid continuation byte
* multiple frames in one chunk
* complete frame + partial EOF
* blank and BOM-prefixed frame

---

### B6. Implementation dependency graph correction

**Owning section:** `Compatibility and Migration / Implementation order`와 아직 생성 전인 implementation ticket graph.

**필요한 graph rule:**

> Authenticated pin-upgrade transaction은 future pin 변경과 final upgrade certification을 block하지만, already-attested same-pin preparation·Connection 구현과 exact-package vertical proof를 block하지 않는다. Exact-package mutation proof는 B1/B2/B3/B5의 correctness-critical Connection gate 뒤에만 실행한다. Ledger integration membership은 full T0/T0-C/T0.1과 remaining hardening 전에는 승격하지 않는다.

**Executable proof:**

`@openai/codex@0.144.0`의 actual installed package를 preparation capability로 resolve하여 다음을 한 process에서 실행한다.

```text
spawn
→ initialize response
→ initialized writer settlement
→ thread/start response
→ close/drain/reap
```

이 checkpoint는 implementation integration 승격이 아니라 early compatibility feedback이다.

---

## 4. Revised implementation graph

Implementation tickets가 아직 없으므로 현재 16개 번호를 보존할 이유는 없다. 최소 dependency correction은 다음과 같다.

```text
001 exact provenance manifest + ledger-v2 structural verifier
   ├─→ 002 same-pin read-only verify + A/B safe generation
   ├─→ 003 opaque runtime preparation
   └─→ 004 authenticated pin-upgrade transaction
        [parallel; pin change와 final upgrade certification만 block]

002 + 003
→ 005 Connection correctness core
     - byte-framed sole reader
     - exact active router
     - QUEUED_CANCELABLE → HANDED writer
     - required Server-response reservation
     - unexpected-exit drain barrier
     - unit + actual-child fake

→ 006 earliest exact-package vertical proof
     initialize
     → initialized
     → thread/start
     → close/drain/reap
     [test-only checkpoint; ledger integration 승격 없음]

→ 007 T0 semantic completion
     AgentMessage item/completed
     + authoritative turn/completed
     + safe result

   ├─→ 008 T0-C independence
   │      A pending → B completed → A completed → A2 admission
   │
   └─→ 009 T0.1 approval
          staged lease
          → once-only response
          → resolved/item terminal/turn terminal separation

008 + 009
→ 010 remaining resource/security hardening
      - complete cap matrix
      - duplicate-key/exact-ID parser
      - no-raw retained-state checks
      - deadline boundary permutations
      - generator rollback/failure injection

004 + 010
→ 011 full source/unit/fake/live conformance
      + coverage ledger implemented/integration promotion

→ 012 atomic legacy cutover/removal
      - Host root export + Host source/fake/tests
      - product-named layout export
      - legacy transport/testing re-export
      - Harness exports retained
      - clean build/default-condition imports

→ 013 post-removal final certification
      + docs/code/ledger/inventory alignment
```

핵심 변경은 세 가지다.

1. **004 authenticated pin-upgrade transaction이 003 preparation이나 005 same-pin Connection을 막지 않는다.**
2. **Actual installed package feedback은 T0 전체 완성 전, correctness-critical Connection 직후에 온다.**
3. **Legacy export와 physical source deletion은 별도 compatibility release로 나누지 않고 하나의 atomic removal checkpoint에서 수행하되, 그 뒤 clean-package certification을 실행한다.**

---

## 5. Remaining human decisions

Source나 current repository 조사로 이미 답할 수 있는 사항은 제외했다. Runtime cardinality, outbound ID non-reuse, pre-response approval staging, future Interface extension, Host consumer 수, live/fake oracle 역할은 더 이상 human decision이 아니다.

| Decision                                   | Options                                                                              | Recommended default                             | 이유                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Control-response queue의 물리 표현              | 하나의 tagged deque + reserved slots / control·application 두 logical deque + one writer | **두 logical deque + one serialized writer**     | Reservation·priority·1:1 fairness를 가장 단순하게 검증할 수 있다. Public/module boundary에는 영향이 없다.                                                                                    |
| Unexpected terminal drain deadline         | 기존 close grace와 별도 값 / 기존 5초 phase 재사용                                               | **package-private 5초 dedicated drain deadline** | 정상 final stdout을 받을 시간을 주면서 descendant-held pipe를 bounded하게 끊는다. Unit/fake에서는 tiny injected value를 사용한다. 실제 운영 측정이 생기면 pin-independent TS hardening 값으로만 조정한다.           |
| Inventory-unknown notification disposition | Connection terminal / sanitized no-op diagnostic                                     | **sanitized bounded no-op diagnostic**          | Direction은 신뢰할 수 있고 response obligation이 없으며 exact-pin provenance skew는 certification에서 별도로 실패시킨다. Unknown params를 typed/retained하지 않으면 unrelated T0 progress를 보존할 수 있다. |

다음은 human decision으로 다시 열지 않는다.

* Concurrent `thread/start` serialization: 불필요.
* Connection-lifetime RequestId tombstone: 불필요.
* Approval handle epoch/nonce의 public contract: 불필요.
* `FAILED_DRAINING` actor 또는 permanent sink: 불필요.
* Public `Runtime → Thread → Turn` 계층의 선제 도입: 불필요.
* Host compatibility/deprecation period: 불필요.
* Product adapter/UI의 foundation gate 편입: 범위 밖.

---

## 6. New P0/P1 findings

**0 findings.**
