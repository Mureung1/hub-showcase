# 제품 작업을 native Codex 조합으로 실행한다

상태: 채택

AY-PLE는 Codex 위에 별도 workflow runtime이나 범용 interaction framework를 만들지 않는다. 앱이 제공하는 학업 기능은 native Codex의 Skill, prompt, source mention, 구조화 출력과 `turn` 제어를 조합하고, AY-PLE만의 가치는 학기 상태와 Review·UserConfirmation 경계에 집중한다.

## 결정

- 활성 SemesterWorkspace를 Codex 작업 `cwd`로 사용한다. 기존 사용자 폴더 구조를 존중하며 과목별 `thread`나 고정 `sources/` 트리를 요구하지 않는다.
- 반복 가능한 학업 작업은 `ModelingRecipe`로 정의한다. 하나의 recipe는 사용할 Skill, parameterized prompt template, argument contract와 output schema를 묶는다.
- 사용자가 작업을 실행하면 앱은 recipe에 구체적인 arguments와 SourceSelection을 넣는다. SourceSelection은 Codex `mention` 입력으로 전달하며 파일 접근 권한 경계로 사용하지 않는다.
- 조합된 입력은 기존 thread를 이어갈 명시적 이유가 없다면 `thread/start`로 새 native thread를 만든 뒤 반환된 필수 `threadId`로 `turn/start`한다. 후속 대화는 `thread/resume` 등으로 기존 thread를 선택해 계속할 수 있지만 학기·과목·ModelingRun별 고정 cardinality를 두지 않는다. 기존 thread를 재사용할 때는 sticky `cwd`가 현재 SemesterWorkspace와 같은지 검증한다.
- `ModelingRun`은 recipe 식별자와 버전, 검증된 arguments, source 참조, opaque execution reference, 상태와 구조화 결과를 연결하는 최소 실행 receipt다. raw thread/turn identifier는 Codex 통합 내부에 두며, ModelingRun이 thread를 소유하거나 여러 turn을 조정하지 않는다.
- 진행 중 정정, 중단, 승인과 사용자 질문은 실제 기능이 요구하는 의미에 따라 각각 `turn/steer`, `turn/interrupt` 또는 정확한 server request 응답 등으로 연결한다. 모든 App 변경을 AY에 전달하는 전역 기본값이나 하나의 범용 event router는 두지 않는다.
- raw Codex `thread`·`turn`·`item`·`request` 형식과 experimental capability는 Codex 통합 내부에 둔다. 제품 상태에는 검증된 구조화 결과와 필요한 correlation만 남긴다.
- AY-PLE는 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair로 Codex를 실행하면서 native `AGENTS.md`와 Skills discovery를 따르고, 그 pair의 built-in Memories를 사용한다. 이 기능들을 자체 instruction, plugin 또는 memory framework로 다시 구현하지 않는다.
- built-in Memories는 app-managed `CODEX_HOME`·`CODEX_SQLITE_HOME` pair에서 명시적으로 opt-in하고 eligibility를 확인한 뒤 사용하는 비권위적 편의 계층이다. SemesterModel의 source of truth나 Review·UserConfirmation의 대체물이 아니며 모든 작업의 memory 생성을 보장하지 않는다. 학기 rollover와 memory 정리 UX는 MVP 이후 결정한다.

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| 모든 GUI·대화·server request를 `ProductInteraction`과 `AYDeliveryIntent`로 통과시키는 범용 Module | 거절 | 아직 존재하지 않는 기능까지 transaction, routing, reconciliation 계약으로 고정한다. |
| 학기·과목·ModelingRun마다 고정 Codex thread를 할당 | 거절 | raw Codex에서도 ad-hoc thread와 학기 `cwd`로 충분했던 사용 경험에 불필요한 session 정책을 추가한다. |
| AY-PLE 전용 workflow·memory·Skill 체계 구축 | 거절 | Codex 자체 업데이트의 이점을 잃고 4주 MVP보다 큰 플랫폼을 만들게 된다. |
| 제품 caller가 raw Codex method를 직접 선택 | 거절 | protocol 세부사항과 실패 처리가 UI와 제품 기능에 퍼진다. |

## 결과

- 첫 구현 gap은 `thread/start` 또는 `thread/resume`으로 작업 thread를 선택한 뒤 `Skill + prompt + arguments + mentions + output schema → turn/start(threadId)`를 조합하고 결과 receipt를 남기는 경계다.
- `turn/steer`, `turn/interrupt`, Hook, item injection과 server request 같은 capability는 기능별 필요가 생길 때 검증하고 채택한다.
- App이 소유하는 핵심 계약은 사용자 소유 원본의 RawMaterial 참조·metadata, EvidenceRef, StatePatch, UserConfirmation과 SemesterModel이며 Codex session이나 Memory가 아니다.
- 현재 Runtime Harness의 `AgentRuntimeKernel`과 `RuntimeRun`은 developer-only 실행 진단 기반으로 남고, ModelingRun의 제품 계약으로 확대하지 않는다.

이 결정은 [ADR 0005](0005-use-codex-app-server-as-first-class-mvp-runtime.md)의 Codex-first 방향과 [ADR 0006](0006-separate-package-app-data-and-semester-workspace-roots.md)의 경로 소유권 결정을 구체화한다. 저수준 capability 근거는 [Codex App Server context delivery 조사](../spikes/codex-app-server-context-delivery/research.md), session과 memory의 조사 기록은 각각 [Codex session topology 조사](../spikes/codex-session-topology/research.md)와 [Codex local Memories 조사](../spikes/codex-memory-architecture/research.md)에 보존한다.
