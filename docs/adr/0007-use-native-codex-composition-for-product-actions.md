# 제품 작업을 native Codex 조합으로 실행한다

분류: 활성

성숙도: 채택

AY-PLE는 Codex 위에 별도 workflow runtime이나 범용 interaction framework를 만들지 않는다. 앱이 제공하는 학업 기능은 native Codex의 Skill, prompt, source mention, 구조화 출력과 `turn` 제어를 조합하고, AY-PLE만의 가치는 학기 상태와 Review·UserConfirmation 경계에 집중한다.

## 결정

- 반복 가능한 학업 작업은 [CONTEXT.md](../../CONTEXT.md)의 versioned `ModelingRecipe`로 정의한다. Recipe는 실행별 입력을 소유하지 않는 정적 정의다.
- 학생에게 보이는 action은 Recipe를 선택하고 입력을 모으는 UI 명령이다. 별도 영속 `ProductAction` 객체로 만들지 않는다.
- 앱은 선택한 Recipe version에 검증된 arguments, SourceSelection과 활성 SemesterWorkspace 맥락을 결합해 일회성 `ModelingInvocation`을 만든다. SourceSelection은 명시적인 작업 입력이지 파일 접근 권한 경계가 아니다.
- Codex 통합은 ModelingInvocation을 native Skill, rendered prompt text, source mentions와 output schema로 번역한다. 기존 대화를 이어갈 명시적 이유가 없다면 새 thread를 시작하고, 기존 thread를 선택할 때는 그 workspace가 현재 SemesterWorkspace와 같은지 검증한 뒤 하나의 turn을 시작한다.
- 실행 시도마다 하나의 `ModelingRun`을 만들고 Recipe version, 검증된 입력의 제품 참조, opaque execution reference, 상태와 결과를 연결한다. retry는 같은 입력을 다시 사용하더라도 새 ModelingRun이다. raw thread/turn identifier는 Codex 통합 내부에 두며 ModelingRun이 thread나 여러 turn을 소유하지 않는다.
- 진행 중 정정, 중단, 승인과 사용자 질문은 실제 기능이 요구하는 의미에 따라 각각 `turn/steer`, `turn/interrupt` 또는 정확한 server request 응답 등으로 연결한다. 모든 App 변경을 AY에 전달하는 전역 기본값이나 하나의 범용 event router는 두지 않는다.
- raw Codex `thread`·`turn`·`item`·`request` 형식과 experimental capability는 Codex 통합 내부에 둔다. 제품 상태에는 검증된 구조화 결과와 필요한 correlation만 남긴다.

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| 모든 GUI·대화·server request를 `ProductInteraction`과 `AYDeliveryIntent`로 통과시키는 범용 Module | 거절 | 아직 존재하지 않는 기능까지 transaction, routing, reconciliation 계약으로 고정한다. |
| 학기·과목·ModelingRun마다 고정 Codex thread를 할당 | 거절 | raw Codex에서도 ad-hoc thread와 학기 `cwd`로 충분했던 사용 경험에 불필요한 session 정책을 추가한다. |
| AY-PLE 전용 workflow·memory·Skill 체계 구축 | 거절 | Codex 자체 업데이트의 이점을 잃고 4주 MVP보다 큰 플랫폼을 만들게 된다. |
| 제품 caller가 raw Codex method를 직접 선택 | 거절 | protocol 세부사항과 실패 처리가 UI와 제품 기능에 퍼진다. |

## 결과

- 제품 실행 경계는 `ModelingRecipe → ModelingInvocation → ModelingRun`으로 나뉜다. Recipe는 재사용 정의, Invocation은 일회성 요청, Run은 한 시도의 receipt다.
- `turn/steer`, `turn/interrupt`, Hook, item injection과 server request 같은 capability는 기능별 필요가 생길 때 검증하고 채택한다.
- App이 소유하는 핵심 계약은 사용자 소유 원본의 RawMaterial 참조·metadata, EvidenceRef, StatePatch, UserConfirmation과 SemesterModel이며 Codex session이나 Memory가 아니다.
- Runtime Harness의 `RuntimeRun` 계약을 ModelingRun의 제품 계약으로 확대하지 않는다.

이 결정은 [ADR 0005](0005-use-codex-app-server-as-first-class-mvp-runtime.md)의 Codex-first 방향을 제품 실행 조합으로 구체화한다. package, app data와 SemesterWorkspace의 소유권은 [ADR 0006](0006-separate-package-app-data-and-semester-workspace-roots.md), 현재 native mapping은 [Codex-native 제품 작업 조합](../architecture/codex-native-product-composition.md)이 소유한다. 저수준 capability 근거는 [Codex App Server context delivery 조사](../spikes/codex-app-server-context-delivery/research.md), session과 memory의 조사 기록은 각각 [Codex session topology 조사](../spikes/codex-session-topology/research.md)와 [Codex local Memories 조사](../spikes/codex-memory-architecture/research.md)에 보존한다.
