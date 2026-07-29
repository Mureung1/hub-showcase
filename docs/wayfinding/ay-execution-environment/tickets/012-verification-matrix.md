# 012 — 실행 환경 verification matrix를 설계한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [AY Python work environment의 구조를 검증한다](007-python-work-environment.md), [AY Node·common CLI work environment의 구조를 검증한다](008-node-cli-work-environment.md), [Turn 중 dependency install과 sandbox 정책을 결정한다](009-install-mutation-sandbox-policy.md), [Work environment artifact의 lifecycle·비용을 확정한다](010-artifact-lifecycle-economics.md), [AY work environment의 observability feedback loop를 정한다](011-environment-observability.md)

## Question

Environment profile의 provenance, 실제 AY discoverability, 대표 학기 작업의 마찰 감소와 post-run integrity를 어떤 unit·actual-child·Product E2E·clean materialization gate로 나누어 검증해야 하는가?

## Expected evidence

- manifest/materializer synthetic test와 complete-tree verifier gate
- actual child `PATH`·version·import·module-resolution contract
- known-present와 known-absent tool을 함께 쓰는 negative control
- 현재 PDF·PPTX Fixture를 이용한 representative task trace와 fallback 횟수·오류 관찰
- Runtime·workspace·global environment post-run non-mutation
- dev host 차이와 future clean-machine packaging smoke의 분리
