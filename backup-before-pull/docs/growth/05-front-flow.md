# 5. Front Flow — 진짜 API 없이 흐름부터 만들었다

정책이랑 화면 구조가 정리되고 나서 프론트를 만들기 시작했다. 근데 바로 실제 AI API를 붙이지 않았다. 가짜 데이터(Mock)로 전체 흐름을 먼저 끝까지 만들어봤다.

## ① 진행한 내용

- React + Vite + TypeScript 3단 레이아웃 + Astryx 디자인 시스템.
- 핵심 흐름을 전부 Mock으로 구현 — 세 답변(Claude·ChatGPT·Gemini) 3열 비교, Agenda 충돌 해소 4행동(채택 / 직접 입력 / 제외 / 재검토), FinalAnswer, DecisionNote 자동 생성.
- 시나리오 8개 검증 — 정상 / 재검토 / 재시도 성공 / 재시도 실패 제외 / 전부 제외 / 연속 질문 / 단일 소스 / 전부 실패(정책 미정이라 보류). 개발용 `?scenario=`로 전환, 실사용 화면엔 미노출.
- UI 개선 R1~R5 다섯 라운드 — 충돌 팝업 가로 3열, 토스트 2초 자동 소멸, 노트 시간순 정렬 등.

## ② 추가로 배운 개념

- Mock-first. 실제 API 붙이기 전에 가짜 데이터로 흐름을 완성해보는 방식.
- 비동기 화면을 idle / loading / success / empty / error로 나눠 보는 것.
- 파생되는 값은 굳이 따로 state로 저장하지 않는다는 원칙.
- 디자인 시스템과 테마 토큰으로 색·간격을 관리하기(개별 하드코딩 안 하기).

## ③ 꼭 공부할 개념

- React 상태 관리와 파생 상태(불필요한 state 안 만들기)
- 비동기 UI 상태 모델링(idle/loading/success/empty/error)
- 디자인 시스템과 테마 토큰
- Mock·프로토타입 우선 개발과 사용성 테스트

**학습 자료**

- [React — Managing State](https://react.dev/learn/managing-state)
- [React — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) — 파생 상태
- [Nielsen Norman Group — Usability Testing 101](https://www.nngroup.com/articles/usability-testing-101/)
- [Vite — Guide](https://vite.dev/guide/)

## ④ 참고 링크 — 직접 만든 문서

- `docs/specs/SPEC-UI-001-mock-flow.md`
- `docs/DESIGN.md`
- `docs/design-skill.md`
