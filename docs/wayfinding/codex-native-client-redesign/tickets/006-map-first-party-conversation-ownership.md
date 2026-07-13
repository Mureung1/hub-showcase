# 006 — Core·TUI·exec conversation ownership pattern을 지도화한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

Pinned `openai/codex`의 core, TUI와 exec에서 native thread/task identity, per-thread ownership, input routing, turn lifecycle, terminal·history backfill과 multi-thread 진행을 어떤 module과 task가 소유하며, AY-PLE의 conversation use case가 채택할 pattern·제품 adapter에서 달라질 지점·따라 하면 안 되는 UI 구현 편의를 어떻게 구분할 것인가?

기존 research의 결론을 복사하지 말고 pinned checkout의 source와 tests에서 재검증해 architecture evidence asset으로 남긴다.

## Answer

재검토 finding을 반영한 뒤 다시 작성한다.

### 재검토 메모

[Protocol·Rust source evidence의 정렬 상태를 리뷰한다](007-review-source-evidence-alignment.md)에서 다음 보정이 필요하다고 판정했다.

- Loaded live history를 일반화하지 않고 ephemeral thread의 `thread/read(includeTurns: true)` failure와 Exec의 no-backfill branch를 명시한다.
- TUI가 cached active turn이 없을 때 사용하는 empty-`turnId` startup interrupt를 일반 interrupt와 분리하고 pending-start race의 실제 routing을 바로잡는다.
- 후속 결정의 소유자를 readable title relative link로 바꾸고 일반 설명 heading·table label을 한국어화한다.

### 재검토 전 결론

[Pinned Codex production conversation ownership map](../assets/006-first-party-conversation-ownership.md)에 `codex-core`, App Server per-thread listener, production TUI와 exec의 native identity, collection·task ownership, input routing, history·terminal·background process lifetime을 exact pin source와 tests로 추적했다.

핵심 판정은 다음과 같다.

- First-party에는 TUI와 exec가 공유하는 별도 generic conversation kernel이 없다. `ThreadManager`·`CodexThread`·`Session`이 engine의 deep thread module이고 App Server가 이를 노출하며, TUI와 exec는 surface별 projection을 소유한다. 이는 AY-PLE의 package/seam을 확정하지 않고 Ticket 008이 검증할 ownership locality만 제공한다.
- Native `ThreadId`는 resume 뒤에도 유지되고 fork는 새 ID와 lineage를 만든다. Idle `turn/start`에서는 submission/response ID가 running turn과 연결되지만, active `T1` 중 두 번째 start는 response `T2`를 반환하면서 input을 `T1`로 steer할 수 있어 response ID만으로 active lifecycle을 확정할 수 없다. Exact identity representation과 product mapping은 Tickets 009–010에 남겼다.
- Core와 App Server는 thread당 one drain owner와 thread-local command/task/input state를 둔다. TUI steady state는 inactive thread도 native scope로 계속 진행시키지만, primary가 알려지기 전 모든 scoped event를 primary 아래 staging하는 bootstrap convenience는 general invariant가 아니다.
- Start/resume response, live notification과 `thread/read` snapshot은 서로 다른 authority다. App Server read는 persisted metadata와 loaded live history를 조건별로 결합하며, TUI pending-start barrier와 Exec pre-filter backfill은 각각 surface policy다.
- Turn terminal은 process lifetime이나 observation drain이 아니다. Unified exec watcher는 turn task 밖에 process를 보존하면서 original `Session`·`TurnContext`로 late delta/end를 emit할 수 있고, production test도 `TurnComplete` 뒤 살아 있는 process를 고정한다.
- 가져갈 것은 native-scope correlation, waiter-independent ingress, per-thread ownership, live/snapshot·terminal/drain 구분과 explicit cleanup pressure다. Core/TUI의 unbounded queue·magic capacity·detached overflow, string mismatch parser, widget replay와 Exec의 single-run exit·backfill·auto-cancel/reject 정책은 Codex-native client contract로 복사하지 않는다.

Core/protocol, TUI/exec, architecture/documentation 세 축의 독립 재리뷰를 반복했고 최종 actionable P1/P2 finding은 모두 0건이다. Asset의 111개 source citation은 attested exact commit의 local pinned checkout에서 파일과 line range를 검증했다. Upstream Rust tests는 실행하지 않았고 exact runtime interleaving과 source gap의 executable oracle은 Ticket 013에 남겼다.
