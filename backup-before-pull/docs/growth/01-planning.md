# 1. 기획 — 무엇을 만들지부터 정했다

회사에서 PM으로 4년쯤 일했다. 기획서 쓰고 우선순위 잡는 건 익숙한데, 코드는 다른 얘기였다. 개발은 거의 주니어 수준이고, 지금은 학교(서울대) 다니면서 다시 배우는 중이다. 이 기록은 Decision Log라는 걸 만들면서 내가 단계마다 뭘 했고 뭘 배웠는지 남기는 거다. 잘 만든 결과물 자랑이 아니라, 일하는 방식이 어떻게 바뀌었는지에 대한 기록에 가깝다.

## ① 진행한 내용

- 문제 정의부터 정리 — 여러 AI에 같은 질문을 던져도 답변 형식이 제각각이라 공통점·충돌점을 눈으로 비교하기 어렵고, 다 읽은 뒤에도 결론을 또 따로 정리해야 함. 이걸 푸는 도구가 Decision Log.
- 서비스 뼈대 용어 분리 — Chat / Question / SourceAnswer / Manager AI / Agenda / FinalAnswer / DecisionNote. 처음엔 "답변·비교 카드·결정 로그"로 뭉뚱그리던 걸 역할·저장 관계에 따라 갈라줌.
- 가치를 단위로 점점 잘게 쪼갬 — Value(가장 큰 가치 문장) → Epic(그걸 이루는 세부 가치, 1~5) → Story(Epic을 이루는 더 작은 단위, Task 규모). 큰 가치를 위→아래로 계속 쪼개 내려가는 방식.
- 이 쪼갠 단위 위에서 MVP 포함/제외를 확정 — 결제·팀 협업·삭제 기능은 제외.

## ② 추가로 배운 개념

- 가치를 단위로 쪼개는 방식(Value–Epic–Story). PM 때도 비슷하게 했는데, 이번엔 이렇게 쪼갠 가치 단위가 그대로 기능 세부 단위(Story = Task 규모)로 내려가고, 그게 다시 개발 순서로까지 이어진다는 걸 처음 체감했다. 큰 가치 한 줄이 결국 구현할 기능 하나하나로 연결됐다.
- "도메인 용어를 먼저 통일한다"는 게 왜 중요한지. 용어가 흔들리면 나중에 나도, AI도 계속 다르게 부르게 된다.

## ③ 꼭 공부할 개념

- 유저 스토리와 Epic·Theme의 관계, INVEST 원칙
- 백로그 분해: Value → Epic → Story → Task로 내려가는 흐름
- MVP(최소 기능 제품)와 스코프(범위) 관리
- 도메인 주도 설계의 유비쿼터스 언어(용어 통일)

**학습 자료**

- [Atlassian — User stories](https://www.atlassian.com/agile/project-management/user-stories) — 스토리·수용 조건 개념
- [Atlassian — Epics, stories, themes](https://www.atlassian.com/agile/project-management/epics-stories-themes) — 가치 단위 계층
- [Martin Fowler — Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html) — 도메인 용어 통일
- [Wikipedia — Minimum Viable Product](https://en.wikipedia.org/wiki/Minimum_viable_product) — MVP 범위

## ④ 참고 링크 — 직접 만든 문서

- `docs/product.md`
- wiki — Main 기획서 / 가치 구조 문서 / Task List
