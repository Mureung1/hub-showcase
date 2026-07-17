# Codex Chat Shell cutover readiness

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

확장이 가능한 Chat Shell의 product conversation seam과 state ownership을 결정하고, Runtime Harness·legacy `HeadlessCodexClientHost`·Codex Chat 경로의 capability별 유지·이관·제거 판정과 검증 gate를 implementation-ready spec으로 넘길 수 있는 상태에 도달한다.

## Notes

- [Codex-native Chat Shell spec](../../specs/2026-07-16-codex-native-chat-shell.md)은 additive first tracer를 완료했으며 legacy cutover는 명시적으로 별도 checkpoint에 남겼다.
- 현재 topology와 gap은 [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md), 작업 순서는 [AY-PLE 개발 백로그](../../product/ay-ple-development-backlog.md), official SDK direct reuse 결정은 [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)이 소유한다. 판정은 문서만으로 내리지 않고 현재 코드와 테스트를 함께 확인한다.
- 이 map에서 `cutover`는 즉시 삭제를 뜻하지 않는다. Primary product path, 보존할 developer surface, migration evidence와 rollback 조건을 승인하는 architecture checkpoint다.
- Module 평가는 `Interface`의 `Depth`, `Leverage`, `Locality`, `Seam` 위치, `Adapter` 비용, observable conformance와 deletion test를 사용한다. 코드 양이나 package 수만으로 판정하지 않는다.
- Conversation resume, activity family와 interactive approval은 제품 feature를 완성하기 위한 backlog가 아니라 서로 다른 change pressure로 seam을 검증하는 최소 evolution probe다.
- Wayfinder 단계에서는 production 기능을 구현하거나 legacy 코드를 제거하지 않는다. Prototype ticket은 throwaway evidence만 만들며 채택 구현은 후속 `/to-spec`과 `/to-tickets`가 소유한다.
- 한 세션에는 frontier ticket 하나만 claim하고 resolve한다. 사람의 제품·운영 결정을 요구하는 `grilling` ticket은 질문을 하나씩 확인한다.

## Decisions so far

- [현재 runtime capability와 ownership을 한 장에 고정한다](tickets/001-current-runtime-capability-ownership.md) — Harness는 실제 developer diagnostic 경로, legacy Host는 production caller가 확인되지 않은 asset 경로이며, Chat의 내부 32/32 cardinality는 현재 Server에서 process-global 1/1로 축소된다.

## Not yet specified

- Capability disposition 뒤에야 정할 수 있는 migration slice와 제거 순서
- Public SDK research와 pending-interaction 전략 결정이 lease prototype 필요성을 확인할 경우에만 구체화할 prototype 범위

## Out of scope

- AY-PLE 학업 product adapter와 `ModelingRecipe → ModelingInvocation → ModelingRun` 수직 흐름 구현
- Multi-thread sidebar, 모든 activity family, 실제 approval UI와 account/config UX의 production 완성
- Raw App Server event를 1:1로 노출하는 generic event bus
- 이 checkpoint 승인 전 legacy package·endpoint·public export 제거 또는 실제 Codex pin upgrade
- Mobile, packaged Desktop App distribution, signing과 notarization

## Resulting spec

아직 없다.
