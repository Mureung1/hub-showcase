# 001 — 현재 runtime capability와 ownership을 한 장에 고정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: None

## Question

Runtime Harness (`AgentRuntimeKernel`·`CodexRuntimeAdapter`), legacy `HeadlessCodexClientHost` 경로, Codex Chat 경로(`CodexChatRuntime`·Server·Chat Shell)는 현재 각각 누가 호출하고 어떤 state와 lifecycle을 소유하며, capability별 고유 가치·중복·운영 의무·삭제 비용은 무엇인가?

## Resolution evidence

- 각 경로의 actual repository caller와 외부 consumer 여부를 구분한 dependency graph
- Thread, turn, transcript, runtime health, persistence, diagnostic history, bidirectional request와 process lifecycle의 owner·cardinality·수명 표
- Capability를 구현 코드, test, 문서, exact pin과 연결한 evidence matrix
- 각 module의 deletion test와 재사용 가능한 asset을 포함하되 유지·이관·제거 verdict는 내리지 않은 조사 결과
- 확인할 수 없는 실제 Inspector 운영 사용처나 외부 package consumer는 추정하지 않고 open evidence로 표시

## Answer

[현재 runtime capability와 ownership 조사](../assets/001-runtime-capability-ownership.md)에 actual caller graph, state owner·cardinality·lifetime, capability별 코드·test·문서·pin evidence, deletion precondition과 open evidence를 고정했다.

- Runtime Harness는 Server·Inspector에 실제 연결된 developer diagnostic 경로이고, legacy `HeadlessCodexClientHost`는 repository production caller가 확인되지 않은 별도 lifecycle 경로다.
- Codex Chat bridge는 내부적으로 live thread 32개와 active turn 32개를 수용하지만, 현재 Server `CodexChatService`가 모든 browser에 공유되는 thread 1개·active turn 1개로 축소한다.
- Browser transcript, native Codex history와 Runtime Harness diagnostic history는 owner·수명·retention이 서로 다르며, repository 밖 consumer와 실제 Inspector 운영 사용량은 아직 확인되지 않았다.

이 ticket은 현재 facts만 확정한다. Capability의 유지·이관·제거 판정은 후속 architecture·disposition ticket에 남긴다.
