# Headless Codex Client Host와 제품 UI adapter를 분리한다

분류: 활성

성숙도: 채택

AY-PLE의 Codex client 기능은 headless module로 구현하고 제품 UI는 browser-safe adapter를 통해 사용한다.

## 결정

- Headless `Codex Client Host` module을 제품 실행 통합의 seam으로 둔다. 이 이름은 구현 역할을 설명하며 package명을 고정하지 않는다.
- 이 module의 Interface는 App Server process lifecycle, thread 목록·resume·전환, multi-turn 실행, event subscription, transcript 복원, approval correlation, account·context usage와 restart recovery를 소유한다.
- Raw Codex protocol, stdio process, 인증 정보와 generated type은 module 구현 내부에 둔다.
- 제품 React shell은 local Node host의 browser-safe adapter를 통해 이 Interface를 사용한다. HTTP와 streaming의 정확한 transport 조합은 구현 시 정한다.
- 후속 delivery surface가 필요하면 같은 Interface의 별도 adapter로 추가한다.
- Developer-only `AgentRuntimeKernel`, Runtime Inspector와 단일 실행 진단 계약은 multi-thread 제품 client로 확장하지 않는다.

실행 엔진 선택과 protocol isolation은 [ADR 0005](0005-use-codex-app-server-as-first-class-mvp-runtime.md), root 소유권은 [ADR 0006](0006-separate-package-app-data-and-semester-workspace-roots.md), 제품 작업 조합은 [ADR 0007](0007-use-native-codex-composition-for-product-actions.md)을 계속 따른다.
