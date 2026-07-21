# 체크인 삭제 기능 — 설계서

상태: 설계 완료, 구현 전. 코드는 아직 없음.

## 1. 관련 파일과 역할

| 파일 | 역할 | 변경 여부 |
|---|---|---|
| `server/routes/checkins.js` | 라우터. GET/POST만 있음, DELETE 핸들러 추가 대상 | 수정 |
| `server/services/checkinService.js` | `getCheckins`/`createCheckin`만 있음, `deleteCheckin` 추가 대상 | 수정 |
| `server/tests/checkinService.test.js` | 존재하지 않음, TDD로 신규 작성 | 신규 |
| `server/index.js` | 중앙 에러 미들웨어, 라우터 마운트 | 변경 없음 |
| `server/supabase/schema.sql` | checkins 테이블 정의 | 변경 없음 |
| `client/src/pages/RecordDetail.jsx` | 상세 화면, 삭제 버튼 추가 대상 | 수정 |
| `client/src/App.jsx` | `checkins` state, `requestJson` 호출, 삭제 콜백 추가 대상 | 수정 |

## 2. 화면 변경 요소

- `RecordDetail.jsx`의 `.result-actions`에 "목록으로" 버튼 옆 삭제 버튼 추가
- 확인은 `window.confirm` 사용 — 새 라이브러리, 새 모달 컴포넌트 안 씀
- 삭제 성공 시 기존 `onBack` 콜백으로 목록 화면 복귀
- 목록/캘린더(`RecordCard`, `CalendarView`)는 `checkins` state 갱신되면 자동 반영, 컴포넌트 자체는 안 건드림

## 3. 데이터 및 DB 변경 여부

스키마 변경 없음. `checkins` 테이블에 `deleted_at` 같은 컬럼을 추가하지 않고 실제 행을 지우는 hard delete로 간다. 필요한 값은 프론트가 이미 갖고 있는 `checkin.id` 뿐.

## 4. API 명세

- **메서드/경로**: `DELETE /api/checkins/:id`
- **요청값**: URL 파라미터 `id` (uuid), body 없음
- **성공 응답**: `204 No Content`
- **실패 응답** (`{ error: { message } }` 포맷 그대로):
  - `404` — 해당 id 기록 없음
  - `503` — Supabase 삭제 실패

## 5. 데이터 흐름

```
RecordDetail 삭제 버튼 클릭
  → window.confirm 확인
  → onDelete(checkin.id) 콜백 (App.jsx로 위임)
  → App.jsx: requestJson(`/api/checkins/${id}`, { method: 'DELETE' })
  → Express: DELETE /api/checkins/:id (asyncHandler)
  → checkinService.deleteCheckin(id)
  → supabase.from('checkins').delete().eq('id', id)
  → 성공: setCheckins(current => current.filter(c => c.id !== id)) + onBack()
  → 실패: 기존 error state에 메시지 세팅, 화면 유지
```

## 6. 구현 방법 비교

| | A. Hard delete | B. Soft delete (`deleted_at`) | C. 프론트 상태만 삭제 |
|---|---|---|---|
| 스키마 변경 | 없음 | `ALTER TABLE` 필요 | 없음 |
| 기존 코드 영향 | `checkinService`만 추가 | `getCheckins`의 select 조건도 다 고쳐야 함 | 없음 |
| 복구 가능 | 불가 | 가능 | - |
| 완료 기준 충족 | 충족 | 충족 (더 넓게) | 미충족 — 새로고침하면 다시 나타남 |
| 오늘 범위 | 맞음 | 초과 | - |

## 7. 추천 방법

A. Hard delete. 사용자 시나리오에 복구 요구가 없고, 기존 서비스 레이어 구조에 함수 하나만 더하면 되어 변경 파일이 최소화됨. Soft delete는 복구 요구가 실제로 생기면 그때 컬럼을 추가해도 늦지 않음.

## 8. 예외 상황

- 존재하지 않는 id → Supabase delete 영향 0건 → 서비스에서 404
- 연속 클릭 → confirm 창이 이중 클릭을 사실상 막지만, 재클릭 시 두 번째 요청은 404로 처리해도 사용자 경험엔 문제 없음
- 빈 값/uuid 아닌 id → 별도 형식 검증 안 하고 Supabase가 던지는 에러를 그대로 503으로 매핑
- Supabase 장애 → 기존 패턴과 동일하게 503

## 9. 완료 기준

- [ ] 상세 화면에 삭제 버튼 노출
- [ ] 삭제 버튼 클릭 시 확인창 표시
- [ ] 확인하면 목록 화면으로 이동
- [ ] 삭제된 기록이 목록/캘린더에서 사라짐
- [ ] 새로고침해도 다시 안 나타남 (Supabase Table Editor에서도 행 삭제 확인)
- [ ] 존재하지 않는 id 요청 시 404 + 화면에 에러 메시지
- [ ] `[검증테스트]` 더미 행 정리 완료
- [ ] `checkinService.test.js`에 `deleteCheckin` 테스트 통과

## 10. 작업 단위 분리 (반나절 이내)

1. 서비스 레이어 — `deleteCheckin(id)` + 테스트 먼저 작성 (TDD)
2. 라우터 — `DELETE /api/checkins/:id` 연결
3. 프론트 — 삭제 버튼 + confirm + `App.jsx` 상태 갱신
4. 정리·검증 — `[검증테스트]` 더미 행 삭제, 전체 흐름 수동 확인

## 11. 각 작업 확인 방법

1. `node --test server/tests/checkinService.test.js` 통과
2. devtools/curl로 `DELETE http://localhost:3001/api/checkins/<실제id>` 호출 → 204 확인, Supabase Table Editor에서 행 사라짐 확인
3. 브라우저에서 실제 클릭 → 확인창 → 목록 복귀 → 새로고침해도 안 나타남
4. Supabase Table Editor에서 `[검증테스트]` 검색 → 결과 없음

## 12. GitHub 이슈 초안

제목: 체크인 삭제 기능 추가 (DELETE /api/checkins/:id)

```
## 배경
Week 3 backlog 항목. 상세 화면에서 기록을 삭제하고, 삭제한 기록은
새로고침해도 다시 나타나지 않아야 한다. 검증 중 생긴 [검증테스트]
더미 행도 이 기능으로 정리한다.

## 완료 기준
- [ ] 상세 화면에 삭제 버튼 노출
- [ ] 삭제 시 확인창 표시
- [ ] 확인 시 DELETE /api/checkins/:id 요청, 성공하면 목록 화면으로 이동
- [ ] 삭제된 기록이 목록/캘린더에서 사라짐
- [ ] 새로고침해도 다시 나타나지 않음 (Supabase에서도 행 삭제 확인)
- [ ] 존재하지 않는 id 요청 시 404 + 에러 메시지
- [ ] [검증테스트] 더미 행 정리
- [ ] checkinService.test.js에 deleteCheckin 테스트 통과 (TDD)

## 작업 목록
1. [ ] 서비스: deleteCheckin(id) + 테스트 (TDD)
2. [ ] 라우터: DELETE /api/checkins/:id
3. [ ] 프론트: 삭제 버튼 + confirm + 상태 갱신
4. [ ] 더미 행 정리 + 전체 흐름 수동 검증

## 참고
- 스키마 변경 없음 (hard delete)
- 새 라이브러리 없음 (window.confirm)
```

## 계획 자체의 약점

- 작업1 테스트 전략이 아직 안 정해짐. `checkinService.js`는 실제 Supabase에 의존하는데, 기존 유일한 테스트(`summaryService.test.js`)는 순수 로직 테스트라 DB를 안 건드림. `deleteCheckin`을 어떻게 테스트할지를 착수 전에 먼저 정해야 함.
- 204 응답을 프론트 `requestJson`이 문제없이 처리하는지는 확인함: `response.json().catch(() => ({}))` 구조라 body 없는 204도 `{}`로 떨어져 안전함.
