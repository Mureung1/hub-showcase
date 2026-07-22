# 띵동 개발·검증 워크플로우

## 1. 기능을 작은 사용자 흐름으로 쪼갠다

기능을 “누가, 어느 화면에서, 무엇을 누르면, DB에 어떤 변화가 남는가”로 한 문장에 정리한다.

예시: `방장이 모집 완료 공구에서 주문 완료를 누르면 상태가 ORDERED로 저장되고 참여자 화면에도 주문 완료가 보인다.`

## 2. 테스트를 먼저 작성한다

`test-first-generator` Skill을 사용해 성공 규칙과 핵심 실패 규칙을 Jest/Supertest 테스트로 먼저 작성한다.

- 성공: 방장이 올바른 다음 상태로 변경한다.
- 실패: 참여자가 방장 상태를 변경하려 하면 403을 받는다.
- 경계: 모든 참여자가 수령 완료하기 전에는 공구를 FINISHED로 바꿀 수 없다.

테스트는 `thingdong_test` DB에서만 실행한다. 개발 DB `thingdong`의 데이터는 테스트로 초기화하지 않는다.

## 3. 화면부터 DB까지 구현한다

1. React API 모듈에 요청 함수를 추가한다.
2. Express route → controller → service 순서로 구현한다.
3. 수량·상태처럼 동시에 바뀔 수 있는 데이터는 Sequelize transaction과 row lock을 사용한다.
4. API 결과를 React Query 또는 컴포넌트 상태에 반영한다.

## 4. 검증한다

```powershell
cd Project
docker compose up -d

cd backend
npm.cmd test -- --runInBand

cd ../frontend
npm.cmd run build
```

구현 뒤에는 `vertical-slice-auditor`로 화면 → API → MySQL → 화면 재조회 흐름을 점검하고, `mock-data-auditor`로 고정 값이 실제 데이터처럼 보이지 않는지 확인한다.

## 5. 작게 커밋한다

테스트, 백엔드, 프론트엔드, 문서를 가능한 한 분리한다. 커밋 메시지는 `<scope>: <한글 명사형 내용>` 형식을 사용한다.
