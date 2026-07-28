# 학업 사실은 first-class 객체에 두고 운영 view는 파생한다

분류: 활성

성숙도: 채택

AY-PLE은 `Assignment`와 `Exam`을 first-class 학업 객체로 다룬다. 마감 일시, 시험 시간, 요구사항, 범위, 장소, 주의사항과 근거 같은 구조화 학업 사실은 SemesterWorkspace의 이 객체와 `SemesterModel`이 소유한다.

## 결정

- 일정표, 할 일 목록, Markdown 문서 같은 운영 view는 `SemesterModel`에서 파생한다. 파생 view가 `Assignment`나 `Exam`의 마감·시험 사실을 다시 소유하지 않는다.
- `ScheduleEvent`는 `Assignment`나 `Exam`이 소유하지 않는 수업, 보강, 휴강 같은 독립 시간 사실에만 사용한다. 과제 마감이나 시험 일시를 복제하지 않는다.
- timeline과 학생 할 일 같은 운영 view의 이름과 저장 형태는 실제 사용 사례가 필요로 할 때 정하며 MVP의 필수 도메인 모델로 미리 확정하지 않는다.
- 사용자가 파생 view에서 사실을 고치더라도 AY는 원본 학업 객체에 대한 변경을 제안하고, 필요한 Review result를 받은 뒤 실제 workspace file에 반영해 view를 다시 생성한다.
- `Course`, `Assignment`, `Exam`과 `ScheduleEvent`의 required·optional field는 `SemesterModel`의 domain contract가 소유한다. `SemesterModeling`을 수행하는 Skill은 이 contract를 소비하며 canonical field roster를 자체적으로 정의하거나 복제하지 않는다.
- `SemesterModel`의 canonical serialization slot은 SemesterWorkspace root `workspace-state.json`의 `snapshot`이다. 파일 전체는 format과 workspace·semester identity를 함께 보존하는 `SemesterWorkspaceState` envelope이므로 `SemesterModel`과 동일한 객체로 부르지 않는다. `SemesterModeling`은 accepted 학업 사실을 `snapshot`에 반영하고 envelope identity를 보존한다.
- `SemesterModeling`의 Review-before-write는 Skill이 소유하는 workflow contract다. `propose_state_patch`의 tool description과 representative conformance가 이 행동을 harness하지만 App Hook이나 filesystem mutation gate로 강제하지 않는다. Runtime-level enforcement가 실제로 필요해지면 accepted proposal과 실제 snapshot diff를 결합하는 별도 결정으로 다룬다.
- `SemesterModel`의 schema evolution과 기존 학기 상태 migration은 Skill 설치·갱신 lifecycle과 분리한다.
- Assignment의 deadline과 Exam의 schedule처럼 객체를 학업적으로 성립시키는 핵심 사실은 현재 값이 확인되지 않았더라도 모델에서 생략하지 않는다. 해당 사실이 `known`, `unknown`, `ambiguous` 중 어떤 지식 상태인지 구분하고 자유로운 설명과 근거를 함께 보존할 수 있게 한다.
- 이 지식 상태는 AY가 핵심 사실을 빠뜨리거나 값을 지어내지 않게 하는 modeling guardrail이다. 모든 학업 의미를 닫힌 type 분기로 환원하거나 AY의 설명·질문·판단을 대신하는 exhaustive state machine으로 사용하지 않는다.
- `SemesterModeling`은 기본적으로 기존 snapshot과 새 학업 사실을 incremental하게 reconcile한다. 작업과 무관한 기존 객체·사실을 보존하고, 근거가 충돌할 때는 단순 overwrite보다 `ambiguous` 상태와 Review로 불확실성을 드러낸다. 다만 source의 신뢰도·최신성, 실제 관련 범위와 사용자의 목적은 AY가 현장 문맥에서 판단하며 exhaustive merge policy나 고정 우선순위표를 만들지 않는다. 전체 rebuild는 사용자가 그 범위를 명시한 작업에서만 선택한다.
- 향후 Modeling lint는 핵심 사실 자체의 누락, `known` 상태의 유효한 값 누락과 구조적으로 모순된 표현을 차단한다. `unknown`과 `ambiguous`는 설명·근거와 함께 보존할 수 있는 유효한 학기 상태이며 diagnostic과 Review에 드러내되 저장·checkpoint를 자동으로 차단하지 않는다.
- 모든 사실을 범용 task/event로 평탄화하거나, 반대로 모든 가능성을 범용 facet 체계로 먼저 추상화하지 않는다. 구체적인 학업 사용 사례가 생길 때 필요한 객체와 view를 추가한다.

## 결과

- 같은 마감이나 시험 정보를 여러 모델에 중복 저장하며 발생하는 검토·정정 불일치를 피한다.
- `Assignment`와 `Exam`의 학업 의미를 유지하면서도 일정표, 할 일 목록, 요약 문서 같은 화면을 필요에 따라 추가할 수 있다.
- 아직 구현하거나 검증하지 않은 운영 view의 이름과 수명주기를 핵심 도메인 계약에 고정하지 않는다.

## 후속 설계 후보

현재 `workspace-state.json.snapshot`은 `SemesterModel`의 canonical serialization slot이지만 값은 opaque JSON이고 exact field schema나 Modeling lint 구현은 없다. 대표 Assignment·Exam modeling 사례로 schema와 실제 consumer가 생기면 이 slot을 validated `SemesterModel` contract로 확장하고, schema와 lint logic을 Skill lifecycle과 독립된 product-owned Module—후보 이름 `@ay-ple/semester-model`—의 작은 Interface 뒤에 두는 방향을 우선 검토한다. Workspace-level CLI는 그 Interface의 Adapter 후보이며, package ownership·exact Interface·Adapter 설치 방식과 migration은 그때 별도로 결정한다.
