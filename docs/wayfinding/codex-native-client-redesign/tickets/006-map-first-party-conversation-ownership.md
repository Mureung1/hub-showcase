# 006 — Core·TUI·exec conversation ownership pattern을 지도화한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

Pinned `openai/codex`의 core, TUI와 exec에서 native thread/task identity, per-thread ownership, input routing, turn lifecycle, terminal·history backfill과 multi-thread 진행을 어떤 module과 task가 소유하며, AY-PLE의 conversation use case가 채택할 pattern·제품 adapter에서 달라질 지점·따라 하면 안 되는 UI 구현 편의를 어떻게 구분할 것인가?

기존 research의 결론을 복사하지 말고 pinned checkout의 source와 tests에서 재검증해 architecture evidence asset으로 남긴다.

## Answer

[Pinned Codex production conversation ownership map](../assets/006-first-party-conversation-ownership.md)에 `codex-core`, App Server per-thread listener, production TUI와 exec의 native identity, collection·task ownership, input routing, history·terminal·background process lifetime을 exact pin source와 tests로 추적했다.

핵심 판정은 다음과 같다.

- First-party production에는 TUI와 exec가 공유하는 별도 generic conversation kernel이 없다. `ThreadManager`·`CodexThread`·`Session`이 engine conversation의 deep Module이고 App Server가 이를 protocol로 노출하며, TUI와 exec는 서로 다른 surface projection을 직접 소유한다. 이는 AY-PLE package/seam을 확정하지 않고 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)가 검증할 ownership locality만 제공한다.
- Successful same-thread resume는 native `ThreadId`를 유지하고 fork는 새 ID와 lineage를 만든다. 다만 ephemeral·fresh unmaterialized thread는 cross-process durable resume source가 없을 수 있으므로 identity equality와 restart recoverability는 다르다. 별도 `SessionId`는 root와 descendant thread가 공유하지만 TUI projection은 이 field를 drop한다. Live turn/item ID와 `thread/read` replay가 합성하는 `rollout-N`·`item-N`도 항상 같지 않다. Typed representation, 관찰 경로별 authority와 product mapping은 [Identity authority와 product reference 정책을 결정한다](009-decide-identity-and-authority.md)가 소유한다.
- Core command queue, active task, pending input과 App Server event drain은 thread-local이다. TUI는 tracked inactive thread도 native scope로 진행시키지만 pre-primary staging은 extracted routing key를 버리고 eventual primary 아래 강제 replay하는 unbounded surface convenience다. Scope/bound/retention은 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)가 결정한다.
- Idle `turn/start` response ID는 running turn과 연결되지만 active `T1` 중 두 번째 start는 response `T2`를 반환하고 input을 `T1`로 steer할 수 있다. T2는 running lifecycle이 없어도 settings side effect나 T2-scoped `error`를 만들 수 있다. Cached active ID가 없는 실제 interrupt command는 empty-`turnId` startup sentinel을 사용해 normal interrupt의 terminal barrier와 다른 authority를 가진다. Product queue/steer/reject/startup-cancel policy는 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)가 소유한다.
- Start/resume response, live notification, 조건부 `thread/read(includeTurns: true)` snapshot과 terminal은 서로 다른 authority다. Exact pin은 ephemeral, fresh unmaterialized와 paginated history의 full-history read를 지원하지 않고 Exec의 backfill도 non-ephemeral primary에서만 best-effort로 동작한다. Legacy history reducer의 synthesized identity와 unmatched terminal fallback은 replay convenience이지 live invariant가 아니다.
- Turn terminal, late/background observation drain, subscriber set, delayed thread unload와 process shutdown은 서로 다른 lifetime이다. No-subscriber listener도 core event를 drain하며 unload와 `thread/closed`는 partial outcome을 가진다. Connection/unknown-outcome policy는 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

따라서 AY-PLE이 가져갈 것은 single ingress, method-specific request completion, native identity와 typed scope의 보존, per-thread ownership, response·live·snapshot 및 terminal·drain·cleanup의 분리다. Core/TUI의 unbounded queue, pre-primary scope loss, synthesized replay identity fallback, string error parser, detached overflow task, weak persistence outcome과 Exec의 single-run exit·conditional backfill·server-request 정책은 Codex-native client contract로 복사하지 않는다.

Upstream Rust tests는 실행하지 않고 attested exact commit의 source와 checked-in tests를 정적 검토했다. Empty startup interrupt, A/B pre-primary interleaving, overflow ordering, unload failure/reattach와 persistence gap의 executable oracle은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

Exact-pin source conformance, repository Standards와 architecture decision boundary를 독립적으로 재리뷰했고 최종 P1/P2/P3 finding은 모두 0건이었다. Source citation의 파일·line range와 Wayfinder local link도 pinned checkout과 현재 tree에서 검증했다.
