# 006 — Rich environment의 dependency 선정 정책을 정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Agent work environment 구성 패턴을 비교한다](003-agent-environment-prior-art.md), [App host와 AY work environment의 ownership seam을 정한다](005-environment-ownership-seam.md)

## Question

특정 product capability와 1:1로 매핑하지 않으면서도 AY가 실제 학기 작업에서 높은 확률로 먼저 시도할 standard command·library를 어느 기준으로 포함·제외·교체해야 하는가?

## Expected evidence

- 모델의 tool prior, 학기 자료 범용성, deterministic offline use와 observed miss를 포함하는 선정 기준
- familiar command/import name, alias·중복 backend와 custom wrapper의 우선순위
- baseline, optional-heavy, excluded package class와 각 class의 변경 gate
- bundle size, cold start, native dependency, parser attack surface, license·maintenance 비용의 허용선
- package wishlist나 product capability catalog로 변질되지 않는 profile ownership
- 실제 로그와 Fixture를 사용해 profile을 진화시키는 feedback rule
