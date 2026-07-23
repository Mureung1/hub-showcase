# 2. Acceptance Criteria — "됐어요" 말고 증명하기

기획을 정리하고 나니 다음 고민이 생겼다. 만들었다고 치자, 근데 그게 진짜 된 건지 어떻게 알지? 그래서 이번엔 기능마다 "이러면 통과"를 먼저 적기로 했다.

## ① 진행한 내용

- 기능마다 관찰 가능한 통과 조건을 미리 나열 — 예: happy-path는 질문 전송 → 세 AI 순차 성공 → 충돌 2건 해소 → FinalAnswer 생성 → 노트 추가 → 입력창 재활성. 하나씩 눈으로 확인 가능하게 작성.
- 시나리오 분리 — 정상 완료 / 재검토 / 재시도 성공 / 재시도 실패 후 제외 / 전부 제외 / 연속 질문 / 단일 소스. 상황별로 따로 확인하려는 목적.
- 검증 방법 확정 — 코드 검사(typecheck / lint / build) + 브라우저 실측. 둘 다 통과해야 완료로 인정.

## ② 추가로 배운 개념

- Acceptance Criteria라는 개념 자체. 예전엔 "되나 안 되나"로만 봤는데, 이제 "뭘 보면 됐다고 할 수 있나"를 먼저 쓴다.
- 시나리오 기반 검증. 정상만 보는 게 아니라 실패·예외 상황을 미리 목록으로 만들어 각각 확인한다.

## ③ 꼭 공부할 개념

- Acceptance Criteria 작성법(시나리오형·규칙형)
- Definition of Done과 Acceptance Criteria의 차이
- Given–When–Then(Gherkin)으로 조건 기술하기
- 수동 검증 vs 자동 검증, 테스트 피라미드

**학습 자료**

- [Cucumber — Gherkin Reference](https://cucumber.io/docs/gherkin/reference/) — Given/When/Then
- [Scrum.org — What is a Definition of Done?](https://www.scrum.org/resources/what-definition-done)
- [ProductPlan — Acceptance Criteria](https://www.productplan.com/glossary/acceptance-criteria/)
- [Wikipedia — Acceptance testing](https://en.wikipedia.org/wiki/Acceptance_testing)

## ④ 참고 링크 — 직접 만든 문서

- `docs/specs/SPEC-UI-001-mock-flow.md` (11장 Acceptance Criteria)
- 각 Spec 문서의 Acceptance Criteria 절
