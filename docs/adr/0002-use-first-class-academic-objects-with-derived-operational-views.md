# 학업 사실은 first-class 객체에 두고 운영 view는 파생한다

분류: 활성

성숙도: 채택

AY-PLE은 `Assignment`와 `Exam`을 first-class 학업 객체로 다룬다. 마감 일시, 시험 시간, 요구사항, 범위, 장소, 주의사항과 근거 같은 구조화 학업 사실은 SemesterWorkspace의 이 객체와 `SemesterModel`이 소유한다.

## 결정

- 일정표, 할 일 목록, Markdown 문서 같은 운영 view는 `SemesterModel`에서 파생한다. 파생 view가 `Assignment`나 `Exam`의 마감·시험 사실을 다시 소유하지 않는다.
- `ScheduleEvent`는 `Assignment`나 `Exam`이 소유하지 않는 수업, 보강, 휴강 같은 독립 시간 사실에만 사용한다. 과제 마감이나 시험 일시를 복제하지 않는다.
- timeline과 학생 할 일 같은 운영 view의 이름과 저장 형태는 실제 사용 사례가 필요로 할 때 정하며 MVP의 필수 도메인 모델로 미리 확정하지 않는다.
- 사용자가 파생 view에서 사실을 고치더라도 AY는 원본 학업 객체에 대한 변경을 제안하고, 필요한 Review result를 받은 뒤 실제 workspace file에 반영해 view를 다시 생성한다.
- 모든 사실을 범용 task/event로 평탄화하거나, 반대로 모든 가능성을 범용 facet 체계로 먼저 추상화하지 않는다. 구체적인 학업 사용 사례가 생길 때 필요한 객체와 view를 추가한다.

## 결과

- 같은 마감이나 시험 정보를 여러 모델에 중복 저장하며 발생하는 검토·정정 불일치를 피한다.
- `Assignment`와 `Exam`의 학업 의미를 유지하면서도 일정표, 할 일 목록, 요약 문서 같은 화면을 필요에 따라 추가할 수 있다.
- 아직 구현하거나 검증하지 않은 운영 view의 이름과 수명주기를 핵심 도메인 계약에 고정하지 않는다.
