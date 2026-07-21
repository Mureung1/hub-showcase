## 작업 내용

`docs/rules/subTasks.md`의 "추가 개선 제안" 중 "최종결과 화면의 히트맵 클릭 시 근거 표시" 기능을 구현한다. subTask4에서 결과 화면에 이미 "칸을 클릭하면 상세 근거를 볼 수 있어요"라는 `ScreenHint` 문구를 미리 넣어뒀지만(문구만, 실제 클릭 동작은 없음), 이번 묶음에서 실제 클릭 인터랙션을 구현한다.

## 확정된 설계 결정

- `SlotResult`(shared)에 `availableNames: string[]`, `preferredNames: string[]`을 **추가**한다(기존 `availableCount`/`preferredCount`는 그대로 유지) — `resultRanking.ts`(순위 계산)와 그 테스트가 이미 `availableCount`/`preferredCount`에 의존하고 있어 안 건드리는 쪽이 안전. 개수와 이름 배열 길이가 항상 같아 약간의 중복이 생기지만, 기존 로직 무변경을 우선한다.
- `ResponseRow`(server) 타입에 `name: string`을 추가하고, `getAppointmentResponseRows`의 참여자 조회 쿼리를 `select('id')` → `select('id, name')`로 바꿔서 응답 행마다 이름을 붙여 반환한다. `aggregateSlotCounts`는 시그니처 변경 없이 이미 받는 `rows`에서 `row.name`을 그대로 쓰면 된다 — 별도의 이름-맵 조회를 라우트에 새로 추가할 필요가 없다.
- 상세 근거는 기존 `Modal` 컴포넌트로 표시한다(신규 트랜지션·라이브러리 불필요 - `Modal.tsx`가 이미 fade-in/slide-up을 모든 모달에 공통 적용 중).
- `result-cell`을 `<div>`에서 `<button>`으로 바꾼다(`ScheduleGrid.tsx`의 클릭 가능 셀과 동일 패턴) — 키보드 접근성/`aria-label`을 자연스럽게 확보.
- 클릭 가능 여부는 `resultMap.has(key)`(= `levelMap`에 값이 있음 = 응답 1건 이상)로 판단한다 — 응답이 아예 없는 칸(회색, heat-0)은 클릭 비활성화.
- `client/src/lib/useScheduleResult.ts`가 이미 계산해두고 `ResultPage.tsx`가 안 쓰고 버리던 `resultMap`(slotKey → SlotResult)을 그대로 연결해서 쓴다 — 새로 계산할 필요 없음.

## 완료 기준

- [ ] 1. `SlotResult`/`ResponseRow`에 이름 필드 추가 + `GET /:id/results` 응답에 실제로 채워서 반환
- [ ] 2. `ResultPage.tsx` → `ResultHeatmap.tsx`로 `resultMap` prop 연결
- [ ] 3. 셀 클릭 시 상세 근거 모달(가능자 이름·선호자 이름) 표시, 응답 없는 칸은 클릭 비활성
- [ ] 4. 통합 확인

## 우선순위

- 1번(서버 데이터)이 2·3번의 전제이므로 반드시 먼저 끝낸다
- 2번은 이미 계산돼 있는 값을 연결만 하는 작업이라 매우 가볍다

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 확인한 뒤 다음 묶음으로 넘어간다.

### 1. 서버 데이터 확장
1. `shared/src/results.ts`: `SlotResult`에 `availableNames: string[]`, `preferredNames: string[]` 추가
2. `server/src/lib/results.ts`: `ResponseRow`에 `name: string` 추가, `getAppointmentResponseRows`가 참여자 조회 시 `id, name`을 select해서 각 응답 행에 이름을 붙여 반환하도록 수정. `aggregateSlotCounts`가 `row.name`을 각 슬롯의 `availableNames`/(선호면)`preferredNames`에 채우도록 수정.
3. `server/src/routes/results.test.ts`의 `/:id/results` 관련 테스트 갱신(참여자 mock에 `name` 추가, 기대값에 이름 배열 추가)

이 묶음이 끝나면: `GET /:id/results` 응답에 각 슬롯의 `availableNames`/`preferredNames`가 정확히 포함되는지 확인한다.

### 2. FE 데이터 연결
4. `ResultPage.tsx`가 `useScheduleResult`의 `resultMap`을 받아 `ResultHeatmap`에 새 prop으로 전달

이 묶음이 끝나면: 결과 화면에서 `resultMap`이 실제로 내려가는지 확인한다.

### 3. 클릭 → 상세 근거 모달
5. `ResultHeatmap.tsx`: `result-cell`을 `<button>`으로 변경, `resultMap`에 있는(응답 1건 이상) 칸만 클릭 가능하도록(나머지는 `disabled`), 클릭 시 그 슬롯의 `date`/`time`을 state로 저장
6. 클릭된 슬롯이 있으면 `Modal`을 열어 `formatDateLabel(date)` + `time`을 제목으로, "가능 (N명): 이름, 이름..." / "선호 (N명): 이름..."(0명이면 "선호로 표시한 사람이 없어요") 형태로 표시
7. 클릭 가능한 셀에 `aria-label`(예: "7/21(화) 09:00 상세보기") 추가

이 묶음이 끝나면: 응답 있는 칸을 클릭하면 모달에 정확한 이름 목록이 뜨고, 응답 없는 칸은 클릭해도 반응 없는지 확인한다.

### 4. 통합 확인
8. 참여자 여러 명이 서로 다른 조합으로 응답 제출 → 마감 → 결과 화면에서 여러 칸을 클릭해보며 이름 목록이 실제 제출 내용과 일치하는지, 페이지 이동 후에도 클릭이 정상 동작하는지 전체 워크스루

## 이슈/커밋 전략

- 이슈: "결과 화면 히트맵 클릭 시 상세 근거 표시"
- 브랜치: `feat/result-heatmap-detail`
- 커밋: 서버 데이터 확장 → FE 데이터 연결 → 클릭 모달 → 통합 확인 — 묶음별로
- PR: 범위에서 제외 — 사용자가 직접 진행

## 참고 사항

- `docs/rules/subTasks.md` "추가 개선 제안" — 이 기능의 원본 출처
- `client/src/lib/useScheduleResult.ts` — 이미 계산해두고 안 쓰던 `resultMap` 활용
- `client/src/lib/resultRanking.ts` — 순위 계산 로직(안 건드림)
- `client/src/components/Modal.tsx`, `client/src/components/ScheduleGrid.tsx`(버튼 클릭 셀 패턴) — 재사용 대상
