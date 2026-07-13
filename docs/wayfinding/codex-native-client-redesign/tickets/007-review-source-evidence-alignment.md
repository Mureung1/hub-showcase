# 007 — Protocol·Rust source evidence의 정렬 상태를 리뷰한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: tickets/004-build-method-lifecycle-fact-table.md, tickets/005-map-first-party-rust-architecture-patterns.md, tickets/006-map-first-party-conversation-ownership.md

## Question

Method fact table과 first-party architecture pattern asset이 exact pin에 추적 가능하고, 공개 protocol contract·version-specific implementation fact·live observation·product policy를 혼동하지 않으며, module seam 결정을 내리기에 충분한가?

Source conformance와 repository evidence/문서 Standards를 병렬 리뷰하고, finding이 있으면 owning research ticket을 다시 open한다.

## 진행 메모

2026-07-13 병렬 source conformance·architecture·Standards/Spec review 결과, P1은 0건이지만 설계 입력을 바꾸는 P2 finding이 남아 이 ticket을 resolve하지 않았다. Finding 소유자인 [Pinned method lifecycle fact table을 만든다](004-build-method-lifecycle-fact-table.md), [Connection·App Server ingress architecture pattern을 지도화한다](005-map-first-party-rust-architecture-patterns.md), [Core·TUI·exec conversation ownership pattern을 지도화한다](006-map-first-party-conversation-ownership.md)를 다시 열었다.

통합 판정은 다음과 같다.

- P2 6건: `initialized` ordering의 evidence-tier 오분류, active second `turn/start`의 선행 thread-settings mutation 누락, public/exact-pin JSON-RPC 명칭 혼합, ephemeral `thread/read(includeTurns: true)` failure 누락, startup interrupt 누락, readable title 없는 후속 ticket 참조.
- P3 2건: `thread/start` 실패 뒤 state DB 미등록 citation 부족, 한국어 문서의 영어 일반 설명 heading·table label.
- Standards review는 P2 1건·P3 1건, 문서 Spec review는 0건이었다. 나머지 single ingress, native scope correlation, active second-start identity split, terminal과 drain의 분리, package/seam 결정을 후속으로 남긴 경계는 exact pin과 정렬됐다.
- Exact-pin source `blob` link 244개와 현재 Wayfinder tree의 local Markdown link 48개는 대상 파일·line range 또는 local target 존재 여부를 확인했고, trailing whitespace와 fixed-point diff check는 통과했다.
- Upstream Rust test suite는 실행하지 않았고 live probe는 active regular non-empty branch 하나뿐이다. 보정 뒤 executable oracle 범위는 [Source conformance verification을 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

## Answer

Ticket을 resolve할 때 작성한다.
