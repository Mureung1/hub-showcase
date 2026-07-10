# 4주 제품 수직 흐름의 우선 지원 실행 엔진으로 Codex App Server를 사용한다

상태: 채택

AY-PLE는 4주 캠프 동안 Codex App Server 직접 통합을 유일한 우선 지원 실행 엔진으로 사용한다. 초기부터 ACP나 다중 엔진의 최소공배수에 맞추기보다 이어지는 세션, 상세한 작업 활동, 진행 중 `turn/steer`, 실제 `turn/interrupt` 완료, Codex 실행 권한·사용자 입력 요청, Codex 업데이트의 이점 흡수를 먼저 검증한다.

## 결정

- 첫 제품 수직 흐름은 AY-PLE와 Codex 사이에 ACP를 넣지 않고, 앱이 소유하고 버전을 고정한 Codex App Server 경로를 사용한다.
- AY-PLE는 사용자·앱·AY 사이의 CoControl 정책과 제품 상태로의 변환을 소유한다. Codex의 `thread`, `turn`, `item`, `request` 형식은 Codex 통합 내부에 두고 SemesterModel 계약으로 사용하지 않는다.
- Codex 통합은 `thread`/`turn`/`item`/`request` 식별자를 보존하고 알 수 없는 새 Codex 이벤트를 텍스트 중심 실행 수명주기로 조용히 축소하지 않는다. 필요한 내용만 제품 활동과 상태로 변환하며, 원본 프로토콜은 제품 계약이나 SemesterModel·WorkspaceHistory의 영속 상태로 사용하지 않는다.
- `AgentRuntimeKernel`, `RuntimeRunEvent`, `FakeRuntimeAdapter`, Runtime Diagnostic History는 단일 실행 Runtime Harness 진단과 결정적 테스트에 계속 사용한다. 이들은 제품 전체 상호작용 계약이 아니며, `FakeRuntimeAdapter`는 두 번째 제품 실행 엔진의 근거가 아니다.
- Built-in Skills, MCP, 파일, 스크립트는 이식성을 지향하는 공통 작업 표면으로 유지한다. 두 번째 제품 실행 엔진으로 검증하기 전까지 탐색, 설정, 인증, `elicitation` 동작은 실행 엔진별 차이로 취급한다. 캠프 기간에 중립성을 주장하기 위해 Codex가 직접 제공하는 제어와 이벤트를 ACP로 평탄화하지 않는다.
- ACP, OpenCode, Claude Code, 범용 기능 분류, 다중 엔진 설정 UI는 캠프 이후 또는 두 번째 제품 실행 엔진을 명시적으로 승인한 시점까지 미룬다.

## 결과

- 4주 개발의 실행 엔진 예산을 어댑터 동작 일치와 프로토콜 추상화 대신 하나의 Codex 기반 CoControl 수직 흐름에 집중할 수 있다.
- Codex의 정확한 버전 고정, 생성 스키마 검사, 업그레이드 스모크 테스트가 필수 안전장치가 된다.
- 제품 모듈은 생성된 Codex 프로토콜 형식을 `import`하지 않고 ModelingRun 시작, 진행 중 정정, 중단, 작업 중 요청 응답, StatePatch 검토 같은 AY-PLE 제품 기능을 사용해야 한다.
- 향후 중립화는 실제 두 번째 실행 엔진과 의미를 비교한 뒤 추출한다. ACP는 다른 실행 엔진을 붙일 때 비교할 후보이며 현재 Codex 기능의 기준이 아니다.

이 결정은 [ADR 0003](0003-build-runtime-harness-before-product-layer.md)의 1주차 Runtime Harness 검증 단계를 이어받는다. [Codex Runtime Isolation](../architecture/codex-runtime-isolation.md)에서는 앱이 소유한 실행 파일, 전역 설치와 분리된 `CODEX_HOME`, 학기 작업공간과 실행 상태의 분리 원칙만 채택한다. [에이전트 실행 엔진 재사용 후보 조사](../spikes/agent-runtime-reuse-landscape/research.md)의 후보 조사 사실은 보존하지만 ACP 우선 권고는 이 결정으로 대체한다. [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)는 Runtime Diagnostic History에만 계속 적용되며 제품 세션이나 상호작용 이력을 결정하지 않는다.
