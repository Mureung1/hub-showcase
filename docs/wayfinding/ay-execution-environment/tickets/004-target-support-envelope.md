# 004 — 이번 effort의 support envelope와 성공 조건을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 실행 그래프와 우연한 의존성을 고정한다](001-current-execution-graph.md), [Pinned Codex의 environment·sandbox 의미를 확인한다](002-codex-environment-semantics.md), [Agent work environment 구성 패턴을 비교한다](003-agent-environment-prior-art.md)

## Question

이번 설계가 반드시 재현해야 하는 current dev·dogfood 환경과 미래 packaged Desktop 제약은 어디까지이며, 어떤 관찰 결과를 만족하면 “우연히 동작하는 상태”를 벗어났다고 판정할 수 있는가?

## Expected evidence

- current dev·dogfood와 future packaged Desktop의 current·target 분리
- supported macOS·architecture, required host prerequisite와 offline/network 가정
- App host와 AY work environment 각각의 reproducibility 성공 조건
- clean materialization, relaunch, actual Product Turn과 failure-mode acceptance criteria
- public distribution, signing·notarization과 platform expansion의 명시적 비목표
