## 작업 내용

`docs/rules/subTasks.md`의 화면4(약속 생성완료 모달)·화면5(관리자 대시보드)·화면6(참여자 대시보드)를 다루는 묶음. 세 화면 모두 "참여 링크 복사"와 "참여 현황 표시"라는 요소를 공유하므로 `CopyLinkBox`/`ProgressBar` 공용 컴포넌트를 이 묶음에서 먼저 만들고 세 곳에서 재사용한다.

## 확정된 설계 결정

- `CopyLinkBox`: 링크를 드래그 복사하기 쉬운 박스 + 복사 버튼, `navigator.clipboard.writeText`로 자동 복사 + 복사완료 안내는 신규 `Toast` 컴포넌트로 표시.
- `Toast`: Context + `useToast()` 훅으로 앱 어디서든 `showToast(message)` 호출 가능하게 만드는 전역 알림 컴포넌트. 동시에 여러 개 쌓이는 큐는 이 앱 규모엔 불필요 — 메시지 하나만 유지하다가 새로 호출되면 내용/타이머만 갱신, 일정 시간 후 자동으로 사라짐(트랜지션은 1주차 `transition-fade-in` 유틸 재사용).
- `ProgressBar`: `completed`/`total` 기반 막대바 + 퍼센트 표시, 기존 텍스트("N명 중 N명 완료")와 병기.
- 관리자 대시보드 하단 "참여자별 응답 상태" 목록 — **확인 결과 이런 데이터를 주는 API가 전혀 없음(확정)**. 기존 `GET /response-status`(가벼운 카운트 전용, 참여자 대시보드도 같이 씀)를 확장하지 않고, `results.ts`에 `GET /:id/participants`(가칭) 신규 라우트를 추가한다 — 이 프로젝트가 원래 "가벼운 조회/무거운 조회"를 소비 목적에 따라 분리해온 방침과 일치시키기 위함.
- 참여자 "내 응답 상태"의 완료일시 — `responses` 테이블에 이미 `created_at` 컬럼이 있음(DB 마이그레이션 불필요). `GetResponseResponse` 타입과 `GET .../responses` 라우트에 그 값만 추가로 실어 보내면 됨.
- 참여 현황(완료 인원) 조회 로직을 관리자 전용 `useResponseStatus`에서 분리 — "완료 현황 조회 + 약속 제목/기한"만 책임지는 더 작은 훅(가칭 `useCompletionStatus`)을 새로 만들어 관리자/참여자 대시보드가 공통으로 쓰고, `useResponseStatus`는 그 위에 `closeVoting`(관리자 전용 마감 처리)만 얹는 구조로 리팩터링한다. 지금은 `useResponseStatus`가 `headcount`/`completedCount`/`closedAt`/`closeVoting`만 반환하고 `title`/`dateStart`~`timeEnd`는 안 내보내고 있어서, 새 훅에서 이 값들도 같이 반환하도록 확장한다.

## 완료 기준

- [x] 1. `Toast` 공용 컴포넌트(+ `useToast` 훅)
- [x] 2. `CopyLinkBox` 공용 컴포넌트
- [x] 3. `ProgressBar` 공용 컴포넌트
- [x] 4. 약속 생성완료 모달 개선
- [x] 5. `useCompletionStatus` 훅 신설(완료 현황+제목/기한) + `useResponseStatus`를 그 위에 얹도록 리팩터링
- [x] 6. 관리자 대시보드 — 상단 정보/참여현황/링크/마감버튼 색상
- [x] 7. 관리자 대시보드 — 참여자별 응답상태 목록(신규 BE 엔드포인트)
- [x] 8. 참여자 대시보드 — 공용 컴포넌트 재사용 + "내 응답 상태"(완료일시 포함)
- [ ] 9. 통합 확인

## 우선순위

- `useCompletionStatus` 훅 리팩터링(5번)을 관리자 대시보드 작업 전에 먼저 끝내야, 참여자 대시보드(8번)에서 재작업 없이 바로 재사용 가능
- 관리자 대시보드(6~7번)를 먼저 완성한 뒤 참여자 대시보드(8번)에서 그 패턴을 재사용
- BE 신규 엔드포인트(참여자별 완료 여부)는 7번에서, 완료일시는 8번에서 각각 필요할 때 바로 추가(더 이상 "필요할 수도"가 아니라 확정된 작업)

## 작업 순서

아래 순서대로 진행한다. 각 묶음이 끝날 때마다 수동으로 확인한 뒤 다음 묶음으로 넘어간다.

### 1. 공용 컴포넌트
1. `client/src/lib/ToastProvider.tsx`(가칭) + `useToast` 훅 신설 — Context로 `showToast(message)` 전역 제공, 메시지 하나만 유지(큐 없음), 몇 초 후 자동 소멸. `Layout.tsx`(앱 최상위)에 `ToastProvider`/컨테이너를 한 번 마운트
2. `client/src/components/CopyLinkBox.tsx`/`.css` 신설 — 링크 박스 + "복사" 버튼, 클릭 시 `navigator.clipboard.writeText` 호출 후 `showToast('링크가 복사됐어요')` 호출
3. `client/src/components/ProgressBar.tsx`/`.css` 신설 — `completed`/`total` props로 막대바 + 퍼센트 렌더링

이 묶음이 끝나면: 임시로 아무 화면에 세 컴포넌트를 붙여 독립적으로 정상 렌더링되는지, 토스트가 뜨고 자동으로 사라지는지 확인한다.

### 2. 약속 생성완료 모달
4. `AppointmentPage.tsx`의 생성완료 `Modal` 내부 링크 표시를 `CopyLinkBox`로 교체
5. 모달 아이콘/문구 등 시각적 다듬기(1주차 UIUX-1에서 만든 트랜지션 재사용)

이 묶음이 끝나면: 약속을 새로 만들었을 때 뜨는 모달에서 복사 버튼 클릭 시 실제로 클립보드에 링크가 복사되고 토스트 안내가 뜨는지 확인한다.

### 3. 완료 현황 훅 리팩터링
6. `client/src/lib/useCompletionStatus.ts`(가칭) 신설 — `useAppointmentDetail`을 내부적으로 써서 `title`/`dateStart`~`timeEnd`/`headcount`/`completedCount`/`closedAt`을 반환(응답 현황 GET만 추가로 호출). 기존 `useResponseStatus.ts`는 이 훅을 감싸서 `closeVoting`만 추가로 얹는 형태로 리팩터링 — `AdminDashboard.tsx`는 계속 `useResponseStatus`를 씀

이 묶음이 끝나면: `AdminDashboard.tsx`가 리팩터링 후에도 기존과 동일하게 동작하는지(마감 버튼 포함) 확인한다.

### 4. 관리자 대시보드
7. `AdminDashboard.tsx` 상단에 약속 제목 + 기한(날짜/시간 범위) 표시 — `useResponseStatus`가 이제 반환하는 `title`/`dateStart`~`timeEnd` 활용
8. 참여 현황에 `ProgressBar` 추가(기존 텍스트와 병기)
9. `CopyLinkBox` 적용
10. "투표 마감하기" 버튼을 빨간색으로 변경(기존 "약속 투표하기" 버튼은 파란색 유지)
11. `server/src/lib/results.ts`에 참여자 전체 목록(id+name) 조회 함수 추가, `server/src/routes/results.ts`에 `GET /:id/participants`(가칭) 신규 라우트 추가(기존 `/response-status`는 안 건드림) — FE에서 이름 + 완료 여부 목록 렌더링

이 묶음이 끝나면: 관리자 대시보드에서 제목/기한/막대바/링크복사(토스트 포함)/빨간 마감버튼/참여자별 상태 목록이 모두 실제 데이터로 보이는지 확인한다.

### 5. 참여자 대시보드
12. `ParticipantDashboard.tsx`가 `useCompletionStatus`를 써서 제목/기한/`ProgressBar`/`CopyLinkBox`를 4번 묶음과 동일하게 적용 — 마감 버튼은 넣지 않음
13. `shared`의 `GetResponseResponse`에 완료일시 필드 추가, `server/src/routes/responses.ts`의 GET이 `responses.created_at`을 실어 보내도록 수정. 하단을 "내 응답 상태"(완료 배지, 입력 완료일시, "응답을 수정하고 싶다면 다시 접속해주세요" 안내)로 교체

이 묶음이 끝나면: 참여자 계정으로 들어갔을 때 대시보드 상단(제목/기한/막대바)과 하단(내 응답 상태+완료일시)이 올바르게 뜨는지 확인한다.

### 6. 통합 확인
14. 관리자/참여자 두 계정으로 전체 워크스루 — 생성완료 모달(복사+토스트) → 대시보드 진입 → 참여현황/마감버튼(관리자만)/참여자별 상태(관리자)/내 응답 상태(참여자) 확인

## 이슈/커밋 전략

- 이슈: "2주차 UIUX-2: 생성완료 모달 + 관리자/참여자 대시보드 개선"
- 브랜치: `feat/week2-uiux-2-dashboards`
- 커밋: 공용 컴포넌트(Toast+CopyLinkBox+ProgressBar) → 생성완료 모달 → 완료 현황 훅 리팩터링 → 관리자 대시보드 → 참여자 대시보드 — 묶음별로
- PR: 범위에서 제외 — 사용자가 직접 진행

## 참고 사항

- `docs/rules/subTasks.md` — 화면4~6 상세판
- `subTask1.md`에서 만든 `ScreenHint`/트랜지션 유틸 재사용
- `server/src/lib/results.ts`, `server/src/routes/results.ts` — 참여자별 완료 여부 신규 엔드포인트 추가 시 기존 집계 로직(`getAppointmentResponseRows`, `countCompletedParticipants`) 재사용
- `client/src/lib/useResponseStatus.ts`, `client/src/lib/useAppointmentDetail.ts` — `useCompletionStatus` 리팩터링 시 참고/수정 대상
- `server/db/migrations/0003_create_responses.sql` — `responses.created_at` 컬럼 이미 존재(마이그레이션 불필요 확인됨)
