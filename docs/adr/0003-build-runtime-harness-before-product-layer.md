# AY-PLE 제품 계층보다 Runtime Harness를 먼저 구축한다

분류: 완료·역사 기록

AY-PLE는 제품별 SourceSelection, StatePatch, Review와 TrustedState를 구현하기 전에 Runtime Inspector, AgentRuntimeKernel, FakeRuntimeAdapter와 CodexRuntimeAdapter로 구성한 Runtime Harness를 먼저 만들기로 했다. Fake와 실제 Codex가 동일한 단일 실행 lifecycle을 만족하는지 확인해 raw Codex 제약을 너무 늦게 발견하는 위험을 줄이는 결정이었다.

## 완료 기준

- 실제 `apps/server` HTTP/SSE 경계를 통과해 prompt 완료와 adapter-confirmed cancellation을 반복 검증한다.
- 결정적인 fake app-server와 Playwright browser gate로 streaming, cancellation, failure, history와 restart hydration을 검증한다.
- pinned Codex의 공식 문서와 생성 schema를 protocol source로 사용하고, raw type은 `packages/runtime-codex` 내부에 격리한다.
- Runtime Inspector capability는 engine-inspection affordance이며 학생용 제품 약속으로 해석하지 않는다.

이 gate와 뒤이은 Runtime Harness hardening은 1주차에 완료됐다. 당시 언급한 `packages/ay-ple-modeling`, `packages/ay-ple-review` 같은 이름은 가능한 boundary 예시였을 뿐 현재 제품 package topology를 요구하지 않는다. Runtime Harness의 `AgentRuntimeKernel`과 RuntimeRun은 계속 developer-only 진단 기반이며, 제품의 ModelingRun이나 이어지는 Codex session 계약으로 확대하지 않는다.

현재 제품 연결 방향은 [ADR 0005](0005-use-codex-app-server-as-first-class-mvp-runtime.md)와 [ADR 0007](0007-use-native-codex-composition-for-product-actions.md)이 소유한다.
