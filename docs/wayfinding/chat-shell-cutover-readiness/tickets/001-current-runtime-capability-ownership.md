# 001 — 현재 runtime capability와 ownership을 한 장에 고정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

Runtime Harness (`AgentRuntimeKernel`·`CodexRuntimeAdapter`), legacy `HeadlessCodexClientHost` 경로, Codex Chat 경로(`CodexChatRuntime`·Server·Chat Shell)는 현재 각각 누가 호출하고 어떤 state와 lifecycle을 소유하며, capability별 고유 가치·중복·운영 의무·삭제 비용은 무엇인가?

## Resolution evidence

- 각 경로의 actual repository caller와 외부 consumer 여부를 구분한 dependency graph
- Thread, turn, transcript, runtime health, persistence, diagnostic history, bidirectional request와 process lifecycle의 owner·cardinality·수명 표
- Capability를 구현 코드, test, 문서, exact pin과 연결한 evidence matrix
- 각 module의 deletion test와 재사용 가능한 asset을 포함하되 유지·이관·제거 verdict는 내리지 않은 조사 결과
- 확인할 수 없는 실제 Inspector 운영 사용처나 외부 package consumer는 추정하지 않고 open evidence로 표시
