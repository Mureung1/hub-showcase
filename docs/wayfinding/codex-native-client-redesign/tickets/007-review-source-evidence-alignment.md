# 007 — Protocol·Rust source evidence의 정렬 상태를 리뷰한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: tickets/004-build-method-lifecycle-fact-table.md, tickets/005-map-first-party-rust-architecture-patterns.md, tickets/006-map-first-party-conversation-ownership.md

## Question

Method fact table과 first-party architecture pattern asset이 exact pin에 추적 가능하고, 공개 protocol contract·version-specific implementation fact·live observation·product policy를 혼동하지 않으며, module seam 결정을 내리기에 충분한가?

Source conformance와 repository evidence/문서 Standards를 병렬 리뷰하고, finding이 있으면 owning research ticket을 다시 open한다.

## 진행 메모

2026-07-13 병렬 source conformance·architecture·Standards/Spec review 결과, P1은 0건이지만 설계 입력을 바꾸는 P2 finding이 남아 이 ticket을 resolve하지 않았다. Finding 소유자인 [Pinned method lifecycle 근거표를 만든다](004-build-method-lifecycle-fact-table.md), [Connection·App Server ingress architecture pattern을 지도화한다](005-map-first-party-rust-architecture-patterns.md), [Core·TUI·exec conversation ownership pattern을 지도화한다](006-map-first-party-conversation-ownership.md)를 다시 열었다.

통합 판정은 다음과 같다.

- P2 6건: `initialized` ordering의 evidence-tier 오분류, active second `turn/start`의 선행 thread-settings mutation 누락, public/exact-pin JSON-RPC 명칭 혼합, ephemeral `thread/read(includeTurns: true)` failure 누락, startup interrupt 누락, readable title 없는 후속 ticket 참조.
- P3 2건: `thread/start` 실패 뒤 state DB 미등록 citation 부족, 한국어 문서의 영어 일반 설명 heading·table label.
- Standards review는 P2 1건·P3 1건, 문서 Spec review는 0건이었다. 나머지 single ingress, native scope correlation, active second-start identity split, terminal과 drain의 분리, package/seam 결정을 후속으로 남긴 경계는 exact pin과 정렬됐다.
- Exact-pin source `blob` link 244개와 현재 Wayfinder tree의 local Markdown link 48개는 대상 파일·line range 또는 local target 존재 여부를 확인했고, trailing whitespace와 fixed-point diff check는 통과했다.
- Upstream Rust test suite는 실행하지 않았고 live probe는 active regular non-empty branch 하나뿐이다. 보정 뒤 executable oracle 범위는 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

## Answer

충분하다. [Pinned method lifecycle 근거표를 만든다](004-build-method-lifecycle-fact-table.md), [Connection·App Server ingress architecture pattern을 지도화한다](005-map-first-party-rust-architecture-patterns.md), [Core·TUI·exec conversation ownership pattern을 지도화한다](006-map-first-party-conversation-ownership.md)의 최종 asset은 exact pin에 추적 가능하고, 현재 public contract·고정 버전 implementation/test·live observation·source inference·AY-PLE product decision을 서로 다른 권위로 유지한다. 따라서 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)가 unsupported protocol 가정 없이 module seam을 결정할 수 있다.

최종 gate의 범위와 판정은 다음과 같다.

| 검토 축 | 범위 | 최종 판정 |
| --- | --- | --- |
| Source conformance | Attested checkout `767822446c7a594caa19609ca435281a9ec67e0d`의 production source·checked-in tests, repo generated shape와 [현재 공식 App Server 문서](https://learn.chatgpt.com/docs/app-server)를 assets 004–006의 design-bearing claim과 대조 | P1 0 · P2 0 · P3 0 |
| Standards | `AGENTS.md`, `docs/README.md`, issue tracker와 Wayfinder의 문서 ownership·한국어 서술·ticket type/size·readable exact-title link·state 규칙을 `e79c7b8e...HEAD` remediation diff와 final worktree에 적용 | P1 0 · P2 0 · P3 0 |
| Spec | 이 ticket의 Question, owner research ticket 004–006, map Destination·Notes와 후속 decision boundary를 비교해 누락·scope creep·premature decision을 검토 | P1 0 · P2 0 · P3 0 |

초기 review에서 발견한 `initialized` evidence-tier, active second `turn/start` settings mutation, JSON-RPC 명칭, ephemeral full-history read, startup interrupt, pre-registration start failure 근거, readable link와 한국어 label 문제는 모두 owning asset에서 닫혔다. 최종 Standards review가 추가로 발견한 두 경계도 다음처럼 보정했다.

- [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)는 AFK research가 아니라 first-tracer notification delivery·bounded retention·history recovery를 함께 결정하는 HITL grilling으로 바로잡았다. Client request의 max-in-flight·pre-admission은 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), accepted waiter의 late·timeout lifecycle은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.
- First supported Server request variant가 정해지기 전 generic responder admission·bound·expiry·once-only policy를 만들지 않는다. [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)가 concrete tracer에서 variant를 선택하거나 실제 후속 tracer와 그때 만들 decision owner를 정한다.

이 gate가 채택한 것은 single connection authority·single ingress, exact direction-aware request demultiplexing, waiter-independent event drain, native scope correlation, per-thread ownership, surface projection과 response·live·snapshot·terminal·drain·cleanup authority의 분리다. Exact package/module Interface, native/product identity mapping, queue/steer/reject, delivery·recovery, timeout/restart와 test matrix는 각각 후속 ticket 008–013의 결정으로 남겼다.

기계적 검증에서는 exact checkout의 commit과 clean state를 확인했고, assets 004–006의 exact-pin `blob` citation 382개는 파일·line range 오류 0개, 현재 Wayfinder tree의 local Markdown link 237개는 broken 0개였다. `git diff --check`도 통과했다. Upstream Rust suite와 추가 live probe는 재실행하지 않았다. Active second-start settings/error matrix, startup interrupt race, A/B pre-primary interleaving, overflow ordering, full stdout pipe·partial spawn·process signal race, unload failure/reattach와 weak persistence는 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 executable oracle과 pin-upgrade gate로 결정한다.
