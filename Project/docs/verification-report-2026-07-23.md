# 기능 검증 Agent 실행 보고서 — 2026-07-23

`vertical-slice-auditor` Agent의 체크리스트로 **마이페이지 공동구매 상태 필터**를 검증했다. 이 Agent는 코드를 수정하지 않고 화면부터 API, DB, 테스트까지 연결을 확인하는 역할이다.

## 판정: 완료

| 단계 | 결과 | 근거 | 보완 작업 |
| --- | --- | --- |
| 화면 입력 | 확인 | `frontend/src/pages/MyPage.jsx`에서 전체·진행 중·마감 버튼이 `activityFilter` 상태를 바꾸고 `filterPurchasesByActivity`를 호출한다. | 없음 |
| API 연결 | 확인 | 마이페이지의 `getMyGroupPurchaseActivities()`가 `GET /group-purchases/mine`을 요청한다. | 없음 |
| DB 저장·조회 | 확인 | Express controller가 service를 호출하고, service가 `GroupPurchase`, `UserGroupPurchase`, `User` Sequelize 모델을 조회한다. | 없음 |
| 화면 반영 | 확인 | React Query의 `myGroupPurchaseActivities` 데이터를 방장 작성 목록 또는 참여 목록으로 나눈 뒤 필터 결과와 개수를 함께 표시한다. | 없음 |
| 자동 테스트 | 통과 | Vitest: 필터 함수 7개 + 1인 금액 계산 5개, 총 12개 통과. Jest/Supertest: 공동구매 API 13개 통과. | 없음 |

## 확인한 흐름

1. 로그인한 사용자가 마이페이지를 연다.
2. React가 내 활동 API를 요청한다.
3. 서버가 현재 사용자 기준으로 `hosted`와 `joined` 목록을 MySQL에서 읽어 반환한다.
4. 화면이 선택한 탭과 상태 필터를 적용해 목록과 건수를 다시 보여 준다.

## 한계와 다음 검증

브라우저에서 실제 버튼을 클릭하는 E2E 테스트는 아직 없다. 다음 기능인 `픽업 정보 변경 알림`을 만들 때는 상태 변경 API 테스트와 함께 실제 화면 상호작용 테스트도 후보로 검토한다.
