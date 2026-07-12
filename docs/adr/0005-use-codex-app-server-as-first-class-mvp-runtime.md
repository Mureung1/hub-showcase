# 4주 제품 수직 흐름의 우선 지원 실행 엔진으로 Codex App Server를 사용한다

분류: 활성

성숙도: 채택

AY-PLE는 4주 캠프 동안 Codex App Server 직접 통합을 유일한 우선 지원 실행 엔진으로 사용한다. AY-PLE가 별도의 범용 에이전트 프레임워크를 만드는 대신, 일반적인 Codex 사용 위에 학기 작업공간 선택, 반복 가능한 작업 조합, 학업 상태 검토 같은 얇은 제품 계층을 더한다.

## 결정

- 첫 제품 수직 흐름은 AY-PLE와 Codex 사이에 ACP를 넣지 않고, 앱이 소유하고 버전을 고정한 Codex App Server 경로를 사용한다.
- Codex가 제공하는 workspace, `AGENTS.md`, Skills와 thread·turn을 native 방식으로 사용한다. Built-in Memories는 별도 opt-in 검증 뒤 채택할 수 있지만 AY-PLE 전용 memory engine을 만들지 않는다.
- AY-PLE는 학기 상태와 Review 권한을 소유하고 Codex는 실행을 담당한다. 제품 작업 조합은 [ADR 0007](0007-use-native-codex-composition-for-product-actions.md), runtime root 소유권은 [ADR 0006](0006-separate-package-app-data-and-semester-workspace-roots.md)을 따른다.
- Codex 통합은 관측과 correlation에 필요한 `thread`/`turn`/`item`/`request` 식별자를 통합 내부에서 보존한다. 필요한 결과만 제품 의미로 변환하며, 생성된 protocol type과 raw event는 `SemesterModel`, 제품 API 또는 `WorkspaceHistory`의 계약으로 노출하지 않는다.
- `AgentRuntimeKernel`, `RuntimeRunEvent`, `FakeRuntimeAdapter`, Runtime Diagnostic History는 단일 실행 Runtime Harness 진단과 결정적 테스트에 계속 사용한다. 이들은 `ModelingRecipe` composer나 제품 전체 상호작용 계약이 아니며, `FakeRuntimeAdapter`는 두 번째 제품 실행 엔진의 근거가 아니다.
- ACP, OpenCode, Claude Code, 범용 capability taxonomy와 다중 엔진 설정 UI는 캠프 이후 또는 실제 두 번째 제품 실행 엔진을 승인한 시점까지 미룬다.

## 결과

- 4주 개발은 Codex가 이미 제공하는 작업공간, 지시문, Skills와 thread/turn 실행을 재사용하면서 AY-PLE 고유 가치인 학업 상태 추출·근거·검토에 집중한다.
- 첫 제품 연결은 영속적인 자체 세션 계층이 아니라 [Codex-native 제품 작업 조합](../architecture/codex-native-product-composition.md)의 경계를 구현한다.
- Codex의 정확한 버전 고정, 생성 schema 검사와 업그레이드 smoke test는 계속 필수 안전장치다.
- 제품 모듈은 raw Codex protocol을 직접 사용하지 않고 제품 기능 단위의 좁은 인터페이스를 사용한다.
- 향후 실행 엔진 중립화는 실제 두 번째 엔진과 같은 제품 시나리오를 수행해 본 뒤 추출한다. ACP는 그때 비교할 후보이며 현재 Codex 기능의 기준이 아니다.

이 결정은 [ADR 0003](0003-build-runtime-harness-before-product-layer.md)의 Fake/Codex parity gate와 그 뒤 완료된 Runtime Harness hardening을 폐기하지 않는다. `AgentRuntimeKernel`, `RuntimeRunEvent`, Runtime Diagnostic History는 검증된 developer-only 단일 실행 진단 기반으로 유지한다. 다만 그 실행 생명주기를 학기·과목·작업 세션의 제품 도메인 모델로 확장하지 않는다.

[Codex Runtime Isolation](../architecture/codex-runtime-isolation.md)은 채택한 실행 격리의 현재·목표·후속 배치를 설명한다. [에이전트 실행 엔진 재사용 후보 조사](../spikes/agent-runtime-reuse-landscape/research.md)의 후보 조사 사실은 보존하지만 ACP 우선 권고는 이 결정으로 대체한다. [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)는 Runtime Diagnostic History에만 계속 적용되며 제품 thread나 상호작용 이력을 결정하지 않는다.
