# 조사 결론

## **`extract/fork existing core`**

AY-PLE은 `CodexAppServerConnection → CodexConversationRuntime`을 완전히 새로 구현하기보다, `ai-sdk-provider-codex-cli@fc4a97f`의 package-private App Server core를 추출·fork하는 편이 가장 합리적입니다. 이 core는 persistent child, initialize/initialized, 단일 stdout reader, serialized/backpressure-aware writer, per-thread request context, notification-first staging, AgentMessage projection과 authoritative `turn/completed`를 source와 tests로 입증합니다.

다만 npm public surface는 AI SDK provider만 안정적으로 노출하며, App Server core는 지원되는 subpath export가 아닙니다. AI SDK v7 projection은 native thread/turn/item lifecycle을 generic stream content와 provider metadata로 축약하므로 AY-PLE canonical Runtime으로 직접 채택하기에는 구조적으로 맞지 않습니다.

또한 다음 결함은 fork 단계에서 반드시 보강해야 합니다.

* timeout은 pending callback만 제거하고 이미 writer queue에 들어간 frame을 취소하지 않아, backpressure 해제 후 만료된 요청이 뒤늦게 전송될 수 있습니다.
* inbound Server request에 active-ID lease가 없어 같은 ID의 중복 요청이 handler와 response를 다시 실행할 수 있습니다. same-ID response는 구현돼 있지만 exactly-once authority는 없습니다.
* protocol types와 validators가 exact 0.144 generated schema가 아니라 수동 호환 모델이며, line framing도 raw bytes가 아닌 `readline`/string 기반입니다.
* explicit close는 SIGTERM을 보낼 뿐 direct-child exit를 기다리거나 reap·kill escalation을 보장하지 않습니다.

공식 Python sidecar는 exact source commit과 inspected current main 모두 `openai-codex-cli-bin==0.137.0a4`를 pin해 AY-PLE의 0.144.0과 어긋나며, Server request handler를 reader 경로에서 동기 호출하여 A의 approval handler가 대기하면 B의 ingress까지 막을 수 있습니다.    공식 TypeScript SDK는 여전히 `codex exec --experimental-json` 실행 wrapper이므로 bidirectional App Server client 후보가 아닙니다.

## Architecture 결정 요약

| 선택지                                   |        점수 | 판정                                                  |
| ------------------------------------- | --------: | --------------------------------------------------- |
| Community package public API 직접 채택    |     23/35 | AI SDK projection과 private core 때문에 거절              |
| **Community App Server core 추출/fork** | **29/35** | **권고**                                              |
| Official Python sidecar               |     17/35 | runtime pin·reader blocking·운영 비용 때문에 거절            |
| Custom TypeScript greenfield          |     20/35 | compatibility spike에서 extraction 자체가 깨질 때만 fallback |

권고 구조는 다음과 같습니다.

```text
AY-PLE product adapters
        |
        v
CodexConversationRuntime
  AY-PLE-owned public/native contract
        |
        v
CodexAppServerConnection
  AY-PLE-owned package-private invariants
        |
        v
internal extracted App Server core
  upstream: ben-vargas @ fc4a97f
  retain:
    RPC contexts / per-thread routing
    early event staging
    turn controller/session mechanics
  replace:
    AI SDK projection
    manual protocol schemas
    readline parser
    unbounded writer/staging
  add:
    exact 0.144 generated schemas
    raw-byte framing and exact IDs
    cancel-aware bounded writer
    inbound once lease
    resolved cleanup
    loss settlement and direct reap
        |
        v
@openai/codex@0.144.0 app-server
```

ADR 0010의 seam은 그대로 유지해야 합니다. Connection의 **계약과 tests는 AY-PLE이 소유**하되, 최초 구현은 provenance가 고정된 internal fork 뒤에 숨기는 방식입니다. ADR은 이미 process/RPC 책임과 native conversation 책임을 분리하고 있어, 이번 reuse evidence와 정확히 부합합니다.

## Spec·ticket에 미치는 핵심 영향

기존 spec에서 유지해야 할 것은 exact directional ID, same-ID once response, pre-handoff cancel과 post-handoff delivery-unknown 구분, bounded state, unrelated-thread nonblocking, disconnect settlement, reap, exact generated schema 및 no-raw product boundary입니다.

반면 정확한 `control 1 → application 1` scheduling 비율, 16 MiB를 고정 protocol constant로 두는 규정, timeout marker나 byte-reservation의 구체적인 내부 자료구조는 완화할 수 있습니다. observable contract인 bounded control latency, application non-starvation, pre-handoff cancellation과 Server response capacity만 규범으로 남기는 편이 낫습니다.

수정된 최소 ticket graph는 다음과 같습니다.

```text
R0 exact 0.144 compatibility spike
 ├─ R1 provenance/license manifest + core extraction
 └─ R2 exact 0.144 schema generation
       ├─ R3 Connection hardening delta
       └─ R4 native Runtime adaptation
             └─ R5 T0
                  └─ R6 T0-C
                       └─ R7 T0.1
                            └─ R8 upstream-diff / pin-upgrade gate
```

기존 005/006은 greenfield parser/client 구현이 아니라 extraction과 Connection replacement로 합치고, 011/012는 cancel-aware writer·once lease·loss/reap hardening으로 재편하는 것이 적절합니다. 017은 event router 신규 구현이 아니라 extracted router/controller를 native Runtime으로 전환하는 ticket으로 바뀌어야 합니다. Legacy `HeadlessCodexClientHost`나 `CodexRawClient`를 target으로 확장하는 ticket은 stale 처리해야 합니다.

## Compatibility spike

결정 전 1–2일 spike는 여전히 필요합니다. 단, “어떤 후보를 고를지”가 아니라 **확인된 fork delta가 실제로 국소적인지**를 판정하는 spike입니다.

반드시 workspace에 설치된 `@openai/codex@0.144.0` binary로 다음을 실행해야 합니다.

1. initialize/initialized와 native `thread/start`.
2. `turn/start` response-first와 notification-first 양쪽 ordering.
3. AgentMessage와 authoritative `turn/completed`.
4. A가 approval 대기 중일 때 B 완료, 이후 A 완료와 A2 admission.
5. command approval의 original string/number RequestId same-ID response.
6. answer, `serverRequest/resolved`, item terminal, turn terminal, disconnect race.
7. blocked stdin에서 timeout 후 frame이 나중에 쓰이지 않는지.
8. unexpected exit, stdout EOF, stdin failure 시 RPC와 active-turn waiter가 모두 settle되고 child가 reap되는지.

예상 결과는 Tier 1 core가 handshake, 일반 turn, early staging, A/B routing과 same-ID fallback은 통과하지만, exact large numeric ID, queued-write cancellation, inbound once lease, resolved cleanup, bounded state와 reap에서는 patch가 필요하다는 것입니다. 이 실패가 Connection parser/writer, inbound lease, Runtime staging, close/loss settlement의 약 4개 영역에 국한되면 fork를 확정하고, router/context topology 자체가 exact 0.144에서 성립하지 않을 때만 custom implementation으로 전환해야 합니다.

외부 프로젝트 테스트는 이번 조사에서 source로 읽었지만 실행하지 않았으며, 그 pass 상태를 주장하지 않습니다.

[전체 심층 조사 보고서 다운로드 — screening, source audit, 전체 contract matrix, hardening 분류, 점수 근거, ticket graph와 spike pass/fail 기준](sandbox:/mnt/data/codex-app-server-typescript-reuse-audit.md)
