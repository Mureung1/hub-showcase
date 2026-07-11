# 4주 제품 수직 흐름의 우선 지원 실행 엔진으로 Codex App Server를 사용한다

상태: 채택

AY-PLE는 4주 캠프 동안 Codex App Server 직접 통합을 유일한 우선 지원 실행 엔진으로 사용한다. AY-PLE가 별도의 범용 에이전트 프레임워크를 만드는 대신, 일반적인 Codex 사용 위에 학기 작업공간 선택, 반복 가능한 작업 조합, 학업 상태 검토 같은 얇은 제품 계층을 더한다.

## 결정

- 첫 제품 수직 흐름은 AY-PLE와 Codex 사이에 ACP를 넣지 않고, 앱이 소유하고 버전을 고정한 Codex App Server 경로를 사용한다.
- 사용자가 선택한 학기 작업공간을 Codex의 `cwd`로 사용한다. 기존 과목 폴더가 있으면 그대로 두고 Course가 관련 폴더와 자료를 참조할 수 있지만 별도 과목 트리를 요구하지 않는다. 학기·과목·`ModelingRun`도 특정 Codex `thread`와 일대일로 대응시키지 않으며, `thread`는 일반적인 Codex 사용처럼 작업마다 새로 시작하거나 필요할 때 재개한다.
- Codex가 제공하는 `AGENTS.md`, Skills와 built-in Memories의 로딩·사용 방식을 그대로 활용한다. 앱은 별도의 지시문 상속기나 memory engine을 만들지 않는다. built-in Memories는 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair에서 명시적으로 opt-in하고 eligibility를 확인한 뒤 사용하는 비결정적 장기 맥락이며, `SemesterModel`이나 사용자가 확인한 학업 사실의 source of truth가 아니다.
- 반복 가능한 제품 작업은 `ModelingRecipe`로 표현한다. 이는 Skill, 매개변수화한 `PromptTemplate`, argument 계약과 `outputSchema`를 묶은 실행 조합이다. 실행할 때 새 thread를 시작하거나 기존 thread를 선택해 필수 `threadId`를 얻고, argument를 prompt text로 렌더링하며, 사용자가 선택한 자료를 Codex mention 입력으로 더한 뒤 `turn/start(threadId)`에 전달한다.
- `ModelingRun`은 위 조합으로 시작한 한 번의 Codex turn 시도와 그 결과를 연결하는 얇은 receipt다. 세션 관리, 학업 workflow 또는 자체 에이전트 실행기를 뜻하지 않는다.
- 진행 중 입력, 중단, App Server 요청 응답은 각 제품 상호작용의 즉시성·방해 가능성·사용자 의도를 기준으로 `turn/steer`, `turn/interrupt`, server request/response 같은 native capability에 case-by-case로 매핑한다. 모든 상호작용을 먼저 통과시키는 범용 CoControl router나 고정 delivery policy는 MVP 선행 조건이 아니다.
- Codex 통합은 관측과 correlation에 필요한 `thread`/`turn`/`item`/`request` 식별자를 통합 내부에서 보존한다. 필요한 결과만 제품 의미로 변환하며, 생성된 protocol type과 raw event는 `SemesterModel`, 제품 API 또는 `WorkspaceHistory`의 계약으로 노출하지 않는다.
- `AgentRuntimeKernel`, `RuntimeRunEvent`, `FakeRuntimeAdapter`, Runtime Diagnostic History는 단일 실행 Runtime Harness 진단과 결정적 테스트에 계속 사용한다. 이들은 `ModelingRecipe` composer나 제품 전체 상호작용 계약이 아니며, `FakeRuntimeAdapter`는 두 번째 제품 실행 엔진의 근거가 아니다.
- ACP, OpenCode, Claude Code, 범용 capability taxonomy와 다중 엔진 설정 UI는 캠프 이후 또는 실제 두 번째 제품 실행 엔진을 승인한 시점까지 미룬다.

## 결과

- 4주 개발은 Codex가 이미 제공하는 작업공간, 지시문, Skills, opt-in Memories와 thread/turn 실행을 재사용하면서 AY-PLE 고유 가치인 학업 상태 추출·근거·검토에 집중한다.
- 첫 제품 연결의 핵심 gap은 영속적인 자체 세션 계층이 아니라 `ModelingRecipe`를 native Codex input으로 조합하는 경계다. 현재 text prompt 중심 Runtime Harness와 이 제품 composer를 구분한다.
- Codex의 정확한 버전 고정, 생성 schema 검사와 업그레이드 smoke test는 계속 필수 안전장치다.
- 제품 모듈은 raw Codex protocol을 직접 사용하지 않고, recipe 실행, 결과 receipt, `StatePatch` 검토 같은 제품 기능을 사용한다.
- 향후 실행 엔진 중립화는 실제 두 번째 엔진과 같은 제품 시나리오를 수행해 본 뒤 추출한다. ACP는 그때 비교할 후보이며 현재 Codex 기능의 기준이 아니다.

이 결정은 [ADR 0003](0003-build-runtime-harness-before-product-layer.md)의 Fake/Codex parity gate와 그 뒤 완료된 Runtime Harness hardening을 폐기하지 않는다. `AgentRuntimeKernel`, `RuntimeRunEvent`, Runtime Diagnostic History는 검증된 developer-only 단일 실행 진단 기반으로 유지한다. 다만 그 실행 생명주기를 학기·과목·작업 세션의 제품 도메인 모델로 확장하지 않는다.

[Codex Runtime Isolation](../architecture/codex-runtime-isolation.md)에서는 앱이 소유한 실행 파일, 전역 설치와 분리된 하나의 `CODEX_HOME`·`CODEX_SQLITE_HOME` pair, 학기 작업공간과 실행 상태의 분리 원칙을 구체화한다. [에이전트 실행 엔진 재사용 후보 조사](../spikes/agent-runtime-reuse-landscape/research.md)의 후보 조사 사실은 보존하지만 ACP 우선 권고는 이 결정으로 대체한다. [ADR 0004](0004-split-runtime-history-semantics-from-workspace-storage.md)는 Runtime Diagnostic History에만 계속 적용되며 제품 thread나 상호작용 이력을 결정하지 않는다.
