## 작업 내용

`docs/rules/subTasks.md`의 화면7(가능한 시간 선택)·화면8(선호 시간 선택)·화면9(투표 확정 전 모달)을 다루는 묶음. 7·8은 같은 그리드 컴포넌트를 공유하므로 7일 단위 페이지네이션을 먼저 만들고 두 단계 모두에 적용한다. 선호 시간 화면에는 현재 "가능한 시간" 셀이 회색으로 표시되는 스타일 버그도 함께 고친다.

## 확정된 설계 결정

- 7일 단위 페이지네이션: 화살표 클릭으로 날짜 범위를 7일씩 이동, 그리드는 현재 페이지의 7일치 슬롯만 렌더링(원래 계획했던 방식으로 복귀).
- 선호 시간 단계에서 "가능한 시간" 셀은 회색이 아니라 1단계에서 칠했던 연한 파랑을 그대로 유지 — 클릭(토글) 시 연한 파랑(가능)↔진한 파랑(선호)으로 전환.
- 7일 페이지네이션은 훅(`client/src/lib/usePagedDateRange.ts`)으로 통일한다 — `dateStart`/`dateEnd` 문자열이 아니라 `slots: ScheduleSlot[]`을 받아 내부에서 정렬된 날짜 목록의 첫/마지막 값으로 날짜 경계를 계산한다(`ScheduleEditor.tsx`의 `candidateSlots`, subTask4의 `ResultPage.tsx`가 이미 갖고 있는 `candidateSlots`를 그대로 넘기면 됨 — `useScheduleResponse.ts`/`useScheduleResult.ts`/`SchedulePage.tsx`/`ScheduleEditorProps`는 변경 불필요). `pageStartDate` 상태를 내부에서 소유하고 `{ visibleDates, canGoPrev, canGoNext, goPrev, goNext }`를 반환한다. **`useScheduleResponse.ts`/`useScheduleResult.ts`가 매 렌더링마다 `candidateSlots`를 `useMemo` 없이 새로 생성하므로, 리셋 판단용 effect 의존성은 `slots` 배열 자체가 아니라 그 첫/마지막 날짜 문자열(`firstDate`/`lastDate`)로 둔다** — 배열 참조로 판단하면 내용이 같아도 매 렌더링마다 리셋되어 페이지네이션이 동작하지 않는다. `firstDate` 또는 `lastDate` 둘 중 하나라도 바뀌면 `pageStartDate`를 새 `firstDate`로 리셋한다.

## 완료 기준

- [x] 1. `ScheduleGrid`/`ScheduleEditor` 7일 페이지네이션
- [x] 2. `usePagedDateRange` 훅 유닛 테스트(정확히 7일=1페이지·다음이동 불가, 8일=2페이지·마지막 1일, 14~15일=페이지 경계, slots 변경 시 pageStartDate 리셋)
- [x] 3. 가능한 시간 선택 화면 — 안내문구 신설·적용
- [x] 4. 선호 시간 선택 화면 — 안내문구 + 색상 범례
- [x] 5. 선호 시간 선택 화면 — 색상 버그 수정(연한파랑 유지, 토글 시 연한↔진한)
- [x] 6. 투표 확정 전 모달 UI 개선
- [x] 7. 통합 확인

## 우선순위

- 1번(페이지네이션)이 3·4·5번의 전제이므로 반드시 먼저 끝낸다(엄밀히는 논리적 의존이라기보다, 5번도 `ScheduleGrid.tsx`를 건드리므로 같은 파일을 두 번 손대는 걸 피하기 위함)
- 색상 버그 수정(5번)은 작지만 사용자가 명시적으로 지적한 부분이라 누락 없이 확인

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 확인한 뒤 다음 묶음으로 넘어간다.

### 1. 그리드 페이지네이션
1. `ScheduleEditor.tsx`(또는 상위 상태)에서 신규 훅 `usePagedDateRange(candidateSlots)` 적용 — 첫 페이지 시작일은 항상 `candidateSlots`의 첫 날짜, 다음 페이지 시작일은 `pageStartDate + 7일`, 마지막 페이지는 7일 미만이어도 허용, 현재 페이지 범위에 마지막 날짜가 포함되면 다음 화살표 비활성화(이전 화살표는 `pageStartDate`가 첫 날짜와 같을 때 비활성화). 화살표 버튼은 아이콘만 쓰더라도 `aria-label`("이전 7일"/"다음 7일")과 `disabled` 상태를 처음부터 적용한다.
2. `ScheduleGrid.tsx`가 전체 슬롯이 아니라 훅이 반환한 `visibleDates` 기준 7일치 슬롯만 렌더링하도록 필터링
3. 시간 축은 기존처럼 세로 전체 나열 + 스크롤 유지(변경 없음)
4. `SchedulePage.tsx`가 `ScheduleEditor`를 렌더링하는 부분에 `key={appointmentId}` 추가 — `step`/`availableKeys`/`preferredKeys`/페이지네이션 상태 전부가 약속이 바뀌면 한 번에 리마운트되어 초기화되도록(개별 상태마다 리셋 로직을 따로 안 만들어도 됨)

이 묶음이 끝나면: `usePagedDateRange` 훅의 유닛 테스트(정확히 7일=1페이지·다음이동 불가, 8일=2페이지·마지막 1일, 14~15일=페이지 경계, slots 변경 시 pageStartDate 리셋)를 작성해 통과시키고, 그리드에서 화살표 클릭 시 7일 단위로 날짜가 바뀌고 클릭 선택한 슬롯이 페이지를 넘나들어도 유지되는지 확인한다.

### 2. 가능한 시간 선택(1단계)
5. 1단계 제목을 "가능한 시간을 선택해주세요"에서 "가능한 시간을 먼저 선택해주세요"로 교체(별도 `ScreenHint` 없이 제목 문구 자체로 안내)

이 묶음이 끝나면: 1단계 화면에서 안내문구와 페이지네이션이 함께 정상 동작하는지 확인한다.

### 3. 선호 시간 선택(2단계)
6. 안내 문구("가능한 시간 중 특히 더 선호하는 시간대가 있으신가요?") + 색상 범례(진한 파랑=선호, 연한 파랑=가능(선택)) 컴포넌트 추가 — 1단계와 마찬가지로 별도 `ScreenHint` 없이 제목 문구 자체로 안내
7. `ScheduleGrid.tsx`/`ScheduleGrid.css`의 "가능한 시간" 셀 스타일을 현재 회색 계열에서 1단계와 동일한 연한 파랑으로 수정 — 클릭 시 연한 파랑(가능)↔진한 파랑(선호)으로 정확히 토글되는지 로직/스타일 확인

이 묶음이 끝나면: 2단계 화면에서 범례와 실제 셀 색상이 일치하고, 클릭할 때마다 연한↔진한 파랑이 정확히 토글되는지 확인한다.

### 4. 투표 확정 전 모달
8. 상단에 체크 아이콘(원형 배지) 추가
9. "입력을 확정할까요?" 제목 + "아래와 같이 제출됩니다" 설명 + 가능한 시간 n건/선호 시간 n건 선택 요약 표시(건너뛰기로 확정하는 경우엔 `preferredKeys.size`가 아니라 실제 제출값인 0건으로 표시 — `ScheduleEditor.tsx`의 `handleConfirm`이 `confirmIntent === 'skip'`일 때 `preferredSlots`를 빈 배열로 보내는 것과 일치시켜야 함)
10. "제출 후에도 투표 마감 전까지 수정할 수 있어요" 안내 문구 추가
11. "확정하기"/"돌아가기" 버튼 스타일 정리 — 트랜지션(fade-in/slide-up)은 `Modal.tsx`가 이미 모든 모달에 공통 적용 중이라(`ScheduleEditor`도 이 `Modal`을 사용 중) 이 화면도 자동으로 적용된 상태, 추가 작업 불필요. 버튼 스타일만 점검.

이 묶음이 끝나면: 확정 모달에서 실제 선택한 슬롯 개수가 요약에 정확히 반영되는지 확인한다.

### 5. 통합 확인
12. 신규 참여자로 1단계(페이지네이션 넘나들며 선택) → 2단계(선호 선택, 색상 확인) → 확정 모달 → 제출까지 전체 워크스루
13. 재접속 시나리오 — 페이지 이동 후에도 기존 선택이 유지된 채로 그리드에 표시되는지 확인

## 이슈/커밋 전략

- 이슈: "2주차 UIUX-3: 일정 입력 화면(가능/선호) + 확정 모달 개선"
- 브랜치: `feat/week2-uiux-3-schedule-grid`
- 커밋: 페이지네이션 → 1단계 안내 → 2단계 범례/색상수정 → 확정모달 — 묶음별로
- PR: 범위에서 제외 — 사용자가 직접 진행

## 참고 사항

- `docs/rules/subTasks.md` — 화면7~9 상세판
- `docs/rules/plan/plan.md` "선호 시간 투표 기획" — 가능/선호 규칙 원본
- `client/src/components/ScheduleGrid.tsx`/`.css`, `ScheduleEditor.tsx` — 수정 대상
- `subTask1.md`에서 만든 `ScreenHint`/트랜지션 유틸 재사용
