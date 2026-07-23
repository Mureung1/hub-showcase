---
name: test-first-generator
description: ThingDong의 React/Vitest 단위 테스트와 Express/Jest/Supertest API 테스트를 Red-Green-Refactor 순서로 진행한다. 검증·계산·변환·상태 전환·공동구매 API처럼 규칙이 분명한 기능을 테스트 먼저 만들 때 사용한다.
---

# 테스트 우선 생성기

## 목적

새 기능을 구현하기 전에 사용자가 실제로 기대하는 동작을 테스트 코드로 고정한다. 이 프로젝트에서는 `backend/src/tests/groupPurchase.test.js`에 API 통합 테스트를 추가하고, 테스트 전용 MySQL 데이터베이스만 사용한다.

## 작업 순서

1. `CLAUDE.md`, 관련 route·controller·service·model·기존 테스트를 읽는다.
2. 기능을 한 문장의 검증 가능한 규칙으로 정리한다. 성공 1개와 가장 중요한 실패 1개를 고른다.
3. 구현 코드를 먼저 바꾸지 않고, 가장 작은 Jest/Supertest 테스트를 작성한다.
4. `backend`에서 `npm test`를 실행해 새 테스트가 실패하는지 확인한다. 실패 이유가 기능 미구현임을 짧게 보고한다.
5. 사용자가 구현까지 요청했거나 계속 진행하라고 하면, 테스트을 통과시키는 최소한의 route·controller·service 변경만 한다.
6. `npm test`와 `npm run check`를 실행해 회귀를 확인한다.

## 테스트 작성 규칙

- 요청은 서비스 함수를 직접 호출하지 말고 Supertest로 실제 API 경로를 호출한다.
- HTTP 상태 코드, `{ success, data }` 또는 `{ success, error }` 응답 형태, DB에 남은 결과를 함께 검증한다.
- `backend/src/tests/setup.js`가 설정한 테스트 DB만 사용한다. 개발 DB를 초기화하거나 `sync({ force: true })`를 추가하지 않는다.
- fixture는 테스트에 필요한 최소 데이터만 만들고, URL·제목은 테스트마다 구별 가능하게 작성한다.
- 인원 수, 참여, 취소, 마감처럼 상태나 수량이 바뀌는 기능은 성공·실패뿐 아니라 동시성 또는 경계값 검토가 필요한지 판단한다.
- 인증이 필요한 API는 테스트용 로그인으로 토큰을 만들고, 다른 사용자의 데이터에 접근하는 실패 케이스를 우선 검토한다.

## 결과 보고 형식

1. 검증 규칙
2. 추가한 테스트와 대상 파일
3. Red 단계 결과(실패 원인)
4. Green 단계에서 바꾼 최소 구현(구현한 경우)
5. 최종 테스트·검사 결과

## 금지 사항

- 테스트가 없는 상태에서 기능이 완성됐다고 말하지 않는다.
- 개발용 `thingdong` DB의 데이터를 테스트 때문에 지우지 않는다.
- 하나의 기능과 무관한 리팩터링·스타일 변경을 끼워 넣지 않는다.

## 프론트엔드 Vitest 규칙

- 계산·필터·변환 로직은 `frontend/src/utils/`의 이름 있는 export로 분리하고 `함수이름.test.js`를 같은 폴더에 둔다.
- 먼저 정상·빈 값·경계값·알 수 없는 입력을 표로 제안하고, 사용자가 확인하기 전에는 코드를 쓰지 않는다.
- 테스트가 import할 수 있도록 최소 스텁을 만들고 Red 결과를 먼저 확인한다.
- Windows PowerShell에서는 `npx` 대신 `npx.cmd vitest run`을 사용한다.
- `setupTests.js`에서는 Vitest의 `expect`에 `@testing-library/jest-dom/matchers`를 연결한다.
- 예: `filterPurchasesByActivity(purchases, filter)`는 전체·진행 중·마감·빈 목록·알 수 없는 필터를 검증한다.

## Red-Green-Refactor 보고

1. 스펙과 테스트 케이스
2. Red 결과와 실패 이유
3. Green 단계의 최소 구현
4. Refactor 여부와 이유
5. 실행 명령과 최종 결과
