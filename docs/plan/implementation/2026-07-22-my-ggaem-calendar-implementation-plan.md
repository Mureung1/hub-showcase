# 나의 깸 캘린더 구현 계획

> **For agentic workers:** 태스크별로 TDD와 구현 코드리뷰를 수행한다. 다음 태스크의 production 코드를 미리 작성하지 않는다.

**Goal:** 월별 캘린더에서 최초 미션 유형 스탬프를 확인하고, 날짜를 선택해 해당 날짜의 사고 기록을 캘린더 하단에서 조회하는 나의 깸 화면을 완성한다.

**Architecture:** 기존 FastAPI 월별·날짜별 API를 확장하고 React App의 로컬 화면 전환 구조를 유지한다. App의 나의 깸 컨테이너가 표시 월·선택 날짜·API 상태를 소유하고, `MyGgaem` 화면은 전달받은 상태와 콜백을 렌더링한다.

**Tech Stack:** FastAPI, Pydantic, Supabase Python client, React 19, TypeScript, Vite, Vitest, Testing Library

## 전체 제약

- 날짜와 월 경계는 `Asia/Seoul` 기준이다.
- 최초 미션은 `created_at asc`, 같은 시각이면 `id asc`로 결정한다.
- 페이지네이션과 무한 스크롤은 추가하지 않는다.
- 새 라우터·캘린더·날짜 라이브러리를 추가하지 않는다.
- 전역 상태나 범용 캘린더 계층을 만들지 않는다.
- 같은 article의 기록을 합치지 않는다.
- 기존 API와 App의 로컬 화면 전환 방식을 재사용한다.

---

### Task 1: 월별 캘린더에 최초 미션 유형 추가

**Files:**

- Modify: `backend/app/api/routes/mission_records.py`
- Modify: `backend/app/schemas/mission_record.py`
- Modify: `backend/tests/test_mission_records_calendar_api.py`
- Modify: `docs/plan/engineering/api-spec.md`

**Interfaces:**

- Produces: `MissionRecordCalendarDay.first_mission_type: MissionType`
- Produces response field: `firstMissionType`
- Calendar DB select: `id,created_at,mission_type`

- [ ] 캘린더 응답에 `firstMissionType`이 없어서 실패하는 테스트를 추가한다.
- [ ] focused test를 실행해 RED를 확인한다.
- [ ] 월별 조회가 `id`, `created_at`, `mission_type`만 선택하도록 수정한다.
- [ ] KST 날짜별 `recordCount`를 계산하면서 `(created_at, id)`가 가장 작은 행의 `mission_type`을 저장한다.
- [ ] 같은 날짜에서 더 늦은 기록이 최초 유형을 바꾸지 않는 테스트를 추가한다.
- [ ] 같은 `created_at`이면 작은 `id`의 유형이 선택되는 테스트를 추가한다.
- [ ] 네 미션 유형이 응답 스키마의 `MissionType` 계약을 재사용하는지 검증한다.
- [ ] `docs/plan/engineering/api-spec.md`의 월별 응답 예시와 설명에 `firstMissionType`을 반영한다.
- [ ] 캘린더 focused test와 전체 backend test를 실행한다.
- [ ] `implementation-code-reviewer`로 리뷰하고 P0/P1을 수정·재검증한다.

**Verification:**

```bash
cd backend
.venv/bin/python -m unittest tests.test_mission_records_calendar_api -v
.venv/bin/python -m unittest -v
cd ..
git diff --check
```

---

### Task 2: 프론트 나의 깸 API 타입과 클라이언트 추가

**Files:**

- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.test.ts`

**Interfaces:**

- Produces: `MissionRecordListItem`
- Produces: `MissionRecordCalendarDay`
- Produces: `MissionRecordCalendarResponse`
- Produces: `api.getMissionRecords(date: string)`
- Produces: `api.getMissionRecordsCalendar(month: string)`

- [ ] 날짜별 기록 요청의 정확한 경로를 검증하는 실패 테스트를 추가한다.
- [ ] `GET /api/mission-records?date=YYYY-MM-DD` 메서드를 최소 구현한다.
- [ ] 월별 캘린더 요청의 정확한 경로를 검증하는 실패 테스트를 추가한다.
- [ ] `GET /api/mission-records/calendar?month=YYYY-MM` 메서드를 최소 구현한다.
- [ ] 날짜와 월 값에 `encodeURIComponent`가 적용되는지 검증한다.
- [ ] 응답 타입이 백엔드 camelCase 계약과 일치하는지 typecheck로 확인한다.
- [ ] client focused test와 전체 frontend 검증을 실행한다.
- [ ] `implementation-code-reviewer`로 리뷰하고 P0/P1을 수정·재검증한다.

**Verification:**

```bash
cd frontend
npm test -- src/api/client.test.ts
npm test
npm run typecheck
npm run lint
npm run build
cd ..
git diff --check
```

---

### Task 3: 나의 깸 캘린더와 기록 카드 화면 구현

**Files:**

- Create: `frontend/src/screens/MyGgaem.tsx`
- Create: `frontend/src/screens/MyGgaem.css`
- Create: `frontend/src/screens/MyGgaem.test.tsx`
- Reference only: `docs/prototype/prototype/my.html`
- Reference only: `docs/prototype/prototype/styles.css`

**Interfaces:**

- Consumes: `MissionRecordCalendarResponse`, `MissionRecordListItem`, `MissionType`
- Produces: `MyGgaem` component
- Produces props for displayed month, selected date, calendar state, record state, month navigation, date selection, retry, Today tab navigation

- [ ] 현재 월과 선택 날짜를 표시하는 실패 테스트를 추가한다.
- [ ] 새 라이브러리 없이 `Date.UTC` 기반 월 계산으로 일요일 시작 7열 월간 그리드를 렌더링한다.
- [ ] 날짜 셀 전체가 접근 가능한 `button`인지 검증한다.
- [ ] `firstMissionType` 네 유형별 기능색 스탬프를 렌더링한다.
- [ ] `recordCount`가 스탬프의 접근 가능한 설명에 포함되는지 검증한다.
- [ ] 날짜 클릭 시 `onSelectDate(YYYY-MM-DD)`가 호출되는지 검증한다.
- [ ] 선택 날짜의 기록을 `createdAt desc`, `id desc`로 받은 순서 그대로 각각 별도 카드로 렌더링한다.
- [ ] 카드에 제목, 출처, 관심사, 미션 유형·문구, 답변, 작성 시각을 표시한다.
- [ ] `active` 원문은 새 탭 링크, 나머지 상태는 안내와 disabled 버튼으로 표시한다.
- [ ] 캘린더와 기록의 loading/error/empty/success 상태를 각각 검증한다.
- [ ] 실패한 영역만 재시도하는 버튼을 검증한다.
- [ ] 하단 탭의 활성 상태와 `onGoToToday` 호출을 검증한다.
- [ ] focused test와 전체 frontend 검증을 실행한다.
- [ ] `implementation-code-reviewer`로 리뷰하고 P0/P1을 수정·재검증한다.

**Verification:** Task 2의 frontend 검증 명령과 동일하다.

---

### Task 4: App 상태와 실제 API 연결

**Files:**

- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/screens/Today.tsx`
- Modify: `frontend/src/screens/Today.test.tsx`

**Interfaces:**

- Consumes: `api.getMissionRecordsCalendar`, `api.getMissionRecords`, `MyGgaem`
- Produces: Today와 MyGgaem을 오가는 App 로컬 탭 상태

- [ ] Today의 나의 깸 탭 클릭으로 화면이 전환되는 실패 테스트를 추가한다.
- [ ] App에 `today | myGgaem` 탭 상태를 추가하고 기존 article intro 흐름을 유지한다.
- [ ] `Intl.DateTimeFormat`의 `timeZone: 'Asia/Seoul'`로 KST 오늘 문자열을 만들고 최초 표시 월과 선택 날짜로 사용한다.
- [ ] 캘린더와 오늘 기록 API를 호출하고 각 상태를 독립 관리한다.
- [ ] 날짜 변경 시 날짜별 기록만 다시 호출하는지 검증한다.
- [ ] 월 이동 시 같은 일자를 선택하고 캘린더와 기록을 다시 호출하는지 검증한다.
- [ ] 31일이 없는 달에서는 마지막 날로 보정하는 테스트를 추가한다.
- [ ] Today로 돌아왔을 때 기존 Today 목록을 불필요하게 재조회하지 않는지 검증한다.
- [ ] API 실패 후 해당 재시도 요청만 다시 호출되는지 검증한다.
- [ ] App·Today focused test와 전체 frontend 검증을 실행한다.
- [ ] `implementation-code-reviewer`로 리뷰하고 P0/P1을 수정·재검증한다.

**Verification:** Task 2의 frontend 검증 명령과 동일하다.

---

### Task 5: 브라우저 통합 QA와 상태 보강

**Files:**

- Modify only if a failure is reproduced: `frontend/src/screens/MyGgaem.tsx`
- Modify only if a failure is reproduced: `frontend/src/screens/MyGgaem.css`
- Modify only if a failure is reproduced: related focused tests

- [ ] 실제 FastAPI와 frontend dev server를 실행한다.
- [ ] 현재 월·오늘 기본 선택과 캘린더/기록 동시 로딩을 확인한다.
- [ ] 월 이동, 같은 일자 유지, 월 마지막 날 보정을 확인한다.
- [ ] 최초 미션 유형별 스탬프 색상을 확인한다.
- [ ] 날짜 셀 클릭 후 하단 카드 교체를 확인한다.
- [ ] 같은 article 복수 기록, 원문 상태, 빈 날짜와 빈 월을 확인한다.
- [ ] 320px와 375px에서 텍스트·버튼·달력 오버플로우를 확인한다.
- [ ] 실제 Supabase 데이터에서 본인 기록만 보이는지 확인한다.
- [ ] 발견한 문제만 focused test RED 후 최소 수정한다.
- [ ] 전체 frontend와 backend 검증을 실행한다.
- [ ] 최종 `implementation-code-reviewer` 리뷰를 실행한다.

## 선후 관계

```text
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
```

Task 1은 스탬프 계약의 선행 조건이다. Task 2는 화면이 사용할 타입과 I/O 경계를 확정한다. Task 3은 API 호출 없이 화면의 사용자 관찰 결과를 검증하고, Task 4에서 실제 App 상태와 연결한다. Task 5는 mock 테스트로 확인할 수 없는 브라우저·Supabase 경계를 검증한다.
