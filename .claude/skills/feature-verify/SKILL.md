---
name: feature-verify
description: Verify that a just-implemented feature or vertical slice (screen → server → DB/index → response → screen) actually works as specified, not just that the code compiles. Traces the real request path end-to-end, checks for the specific bug classes this project has repeatedly hit (import/export mismatches, JSX casing, env var gaps, template-literal typos, effect ordering, leftover dead code, incomplete error handling), and reports concrete pass/fail per stage. Use after finishing a feature's code, before considering it done.
---

이 Skill은 "코드가 문법적으로 돌아가는가"가 아니라 "요구사항대로 실제로 동작하는가"를 검증한다. 미션 취지("기능 검증 전용 Agent — 요구사항대로 동작하는지 점검")를 따르며, `design-check`가 디자인 규칙을 검증하듯 이 Skill은 기능 동작을 검증한다.

## 검증 절차

1. **요구사항 원문 확인.** 검증 대상 기능이 원래 뭘 하기로 했는지(이슈 본문, `docs/tasks.md`, 커밋 메시지 등) 먼저 읽는다. 이 프로젝트의 수직슬라이스 정의는 항상 **화면 → 서버 → DB/인덱스 저장·조회 → 응답 → 화면갱신** 한 사이클이다.
2. **코드 경로를 끝까지 따라간다.** FE 컴포넌트 → service 함수 → BE 라우트 → 외부 서비스(DB/검색엔진) → 응답 형태 → FE state 반영 → 렌더링 분기까지, 실제로 호출되는 순서대로 파일을 열어서 추적한다. 중간에 어느 한 단계라도 "이게 호출되긴 하는지" 확인 없이 넘어가지 않는다.
3. **아래 체크리스트로 자주 나오는 버그 클래스를 훑는다** (이번 프로젝트에서 실제로 반복 발생한 것들 — 코드 리뷰하듯 하나씩 확인):
   - **import/export 짝 맞는지**: `export default`인데 `import { X }`로 받고 있진 않은지, 반대로 named export인데 default로 받고 있진 않은지. 패키지 이름(`from '...'`)의 대소문자가 실제 설치된 패키지/모듈 이름과 정확히 일치하는지 (예: `meilisearch` vs `Meilisearch`는 다른 것으로 취급됨).
   - **JSX 대소문자**: 직접 만든 컴포넌트를 JSX에서 쓸 때 변수명이 대문자로 시작하는지 (`<searchResultList>`처럼 소문자면 React가 HTML 태그로 오인해 조용히 안 뜬다).
   - **환경변수 이름 일치**: `.env`에 실제로 설정된 키 이름과 코드에서 `process.env.X`로 읽는 이름이 대소문자까지 정확히 같은지. `.env.example`에 있던 항목(`PORT`, `CORS_ORIGIN` 등)이 실제 `.env`에도 전부 있는지(부분 복사로 누락된 항목 없는지).
   - **문자열 vs 템플릿 리터럴**: `${...}` 치환이 필요한 곳에 작은따옴표/큰따옴표가 아니라 백틱(`` ` ``)을 썼는지.
   - **변수 선언 순서**: `useEffect`의 의존성 배열이나 클로저에서 참조하는 값이, 실제 실행 시점보다 코드상 아래에서 선언되고 있진 않은지(TDZ 에러 가능성).
   - **지우다 만 죽은 코드**: 주석 처리하다가 일부만 남아서, 살아있는 코드가 이미 지워진/주석 처리된 것을 참조하고 있진 않은지.
   - **에러 처리 3분기 완비**: 로딩 중 / 에러(연결 실패 vs 서버 에러 구분 필요한 경우 둘 다) / 성공 렌더링이 전부 실제로 트리거되는 경로가 있는지, 하나라도 "코드는 있는데 도달 불가능"하지 않은지.
4. **실제로 브라우저/터미널에서 확인한다.** 코드만 읽고 "될 것 같다"고 끝내지 않는다 — 최소 아래 두 경로를 직접 실행해서 확인:
   - **성공 경로**: 정상 입력 → 기대한 결과가 실제 화면/응답에 나타남
   - **실패 경로**: 의도적으로 실패시켜서(서버 끄기, 잘못된 입력 등) 의도한 에러 처리가 실제로 발동하는지
5. **결과를 표로 보고한다.** 컬럼: `단계 | 확인 내용 | 결과(통과/실패) | 실패 시 원인·수정 방향`. `design-check`와 같은 톤으로, 문제를 억지로 만들지 않고 전부 통과하면 "전 단계 통과"라고 명시한다.

## 스킬 업데이트 방법

검증 중 새로운 버그 패턴을 발견하면(오늘 겪은 것 외의 새로운 종류), 3번 체크리스트에 그 패턴을 추가한다. 이 프로젝트에서 반복적으로 나온 실수일수록 체크리스트에 남겨서, 다음 기능 검증 때도 같은 실수를 놓치지 않게 한다.
