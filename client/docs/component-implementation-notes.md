# Component Implementation Notes

## 기준

- 이 문서는 UI 구현자가 컴포넌트를 쪼갤 때 참고할 상세 책임 문서다.
- 상위 로드맵은 GitHub Wiki의 [Frontend Priority Roadmap](https://github.com/Tapha-K/hub/wiki/Frontend-Priority-Roadmap)을 기준으로 한다.
- MVP 제품 정책은 `client/docs/product-prd.md`, 화면 흐름은 `client/docs/user-flow.md`, 클릭 단위 동작은 `client/docs/click-unit-ui-spec.md`를 기준으로 한다.
- 스타일이나 시각 디자인이 아니라 props, state, handler, 표시 조건, 사용자 안내 책임을 다룬다.
- `client/docs/click-unit-ui-spec.md`의 클릭 단위 명세를 구현 가능한 컴포넌트 관점으로 보강한다.

## 상태 분류

### Persistent State

- 브라우저 새로고침 후에도 유지된다.
- 저장 위치는 MVP 기준 `localStorage`다.
- 예: `user`, `rooms`, `sessions`, `readingRecords`.

### Draft State

- 폼 작성 중에만 존재한다.
- 저장 전 취소하면 폐기된다.
- 예: `draftNickname`, `draftRoom`, `draftRecord`.

### Ephemeral UI State

- 화면 표시를 위해서만 존재한다.
- 새로고침 후 유지하지 않아도 된다.
- 예: `activeModal`, `toast`, `loadingAction`, `focusedField`, `expandedPanel`.

### View State

- 목록 탐색과 현재 화면 복귀에 사용한다.
- 일부는 새로고침 후 유지할 수 있다.
- 예: `currentScreen`, `selectedRoomId`, `selectedRecordId`, `roomFilter`, `roomSort`, `recordFilter`, `recordSort`, `recentRoomIds`.

## AppShell

### 책임

- 앱 전체의 현재 사용자, 현재 화면, 진행 중 세션, 기록 대기 세션을 읽는다.
- 상단 내비게이션, 진행 세션 배너, 기록 대기 배너의 우선순위를 결정한다.
- 모든 주요 화면이 공통으로 쓰는 토스트와 모달 레이어를 관리한다.

### 주요 props/state

- `user`: 현재 닉네임과 온보딩 상태.
- `currentScreen`: 온보딩, 방 목록, 빠른 시작, 방 생성, 방 상세, 세션 타이머, 완료 기록, 내 기록.
- `activeSession`: `session.status = active`인 세션.
- `pendingRecordSession`: `session.status = readyToRecord`인 세션.
- `toast`: 성공/오류/복구 안내.
- `activeModal`: 초기화, 이탈, 작성 취소, 샘플 덮어쓰기 등.

### 표시 우선순위

1. 데이터 손상/복구 안내
2. active 세션 복귀 배너
3. 기록 대기 배너
4. 주요 내비게이션
5. 현재 화면 본문

### 사용자 안내 책임

- active 세션이 있으면 “진행 중인 세션이 있어요”를 명확히 보여준다.
- 기록 대기 세션이 있으면 “끝난 세션의 기록이 아직 남아 있어요”를 보여준다.
- 샘플 데이터가 있는 경우 목표 진행률과 샘플 제외 기준을 필요한 화면에 전달한다.

## OnboardingScreen

### 책임

- 첫 사용자가 닉네임만으로 앱에 들어오게 한다.
- 샘플 데이터 체험과 실제 시작을 구분한다.
- localStorage 저장이라는 MVP 제약을 과하게 불안하게 보이지 않도록 최소 안내한다.

### 주요 상태

- `draftNickname`
- `nicknameError`
- `showExampleNicknames`
- `isCreatingSample`

### 주요 핸들러

- `onNicknameChange`
- `onSubmitNickname`
- `onSelectExampleNickname`
- `onCreateSampleData`
- `onOpenResetModal`

### 표시 조건

- 최근 사용 닉네임이 있으면 작은 칩으로 표시한다.
- 닉네임이 비어 있거나 20자를 초과하면 시작을 막는다.
- 기존 샘플 데이터가 있으면 샘플 덮어쓰기 확인 모달을 먼저 연다.

### 사용자 안내 책임

- 사용자가 정식 가입 없이 시작 가능하다는 점을 알려야 한다.
- 샘플 데이터는 실제 목표 진행률에 포함되지 않는다는 기준을 안내할 수 있어야 한다.

## RoomListScreen

### 책임

- 사용자가 지금 할 수 있는 최우선 행동을 보여준다.
- 진행 중 세션, 기록 대기 세션, 빠른 시작, 방 만들기, 내 기록으로 이어지는 허브 역할을 한다.

### 주요 상태

- `rooms`
- `roomFilter`
- `roomSort`
- `activeSession`
- `pendingRecordSession`
- `recentRoomIds`

### 표시 우선순위

1. active 세션 복귀 배너
2. 기록 대기 배너
3. 빠른 시작 CTA
4. 방 만들기 CTA
5. 방 카드 목록
6. 샘플 데이터 CTA

### 주요 핸들러

- `onQuickStart`
- `onCreateRoom`
- `onOpenRoom`
- `onResumeActiveSession`
- `onResumePendingRecord`
- `onChangeRoomFilter`
- `onChangeRoomSort`
- `onAddSampleData`

### 사용자 안내 책임

- `기록 대기`와 `진행 중`을 다른 상태로 구분한다.
- 샘플 방에는 항상 샘플 배지를 표시한다.
- 빈 상태에서는 사용자가 막히지 않도록 빠른 시작과 방 만들기 중 하나를 선택하게 한다.

## RoomCard

### 책임

- 방의 핵심 조건을 보여주고 방 상세로 이동시키는 카드다.
- MVP에서는 카드 전체 클릭을 주 액션으로 둔다.
- 시간/태그/감상 수 클릭은 후속 후보로 낮추고, 상단 필터 칩을 주 필터 조작으로 둔다.

### 주요 props

- `room`
- `isSample`
- `isTemplateBased`
- `hasActiveSession`
- `hasPendingRecord`
- `onOpen`
- `onFilterByDuration`
- `onFilterByTone`
- `onPreviewImpressions`

### 표시 정보

- 제목
- 설명
- 세션 시간
- 토론 여부
- 입문자 환영 여부
- 샘플 배지
- 템플릿 기반 배지
- 누적 참여 수
- 최근 완료 기록
- 감상 수

### 사용자 안내 책임

- 사용자가 어디를 눌러야 방 상세로 가는지 명확해야 한다.
- 보조 클릭 요소가 많아질수록 주 액션이 흐려지므로 MVP에서는 카드 전체 클릭을 우선한다.

## QuickStartScreen

### 책임

- 사용자가 세션 조건을 길게 설정하지 않고 템플릿을 고르게 한다.
- 선택 후 바로 타이머가 아니라 `시작 전 확인` 방 상세로 이동한다는 점을 미리 설명한다.

### 주요 상태

- `templates`
- `selectedTemplateId`
- `lastUsedTemplateId`
- `loadingTemplateId`
- `expandedTemplateId`

### 주요 핸들러

- `onSelectTemplate`
- `onUseLastTemplate`
- `onRandomTemplate`
- `onToggleTemplateDescription`
- `onBackToRoomList`

### 사용자 안내 문구

- 화면 제목: `지금 읽을 방을 고르세요`
- 보조 설명: `선택하면 방 상세에서 조건을 확인한 뒤 바로 시작할 수 있어요.`

### 사용자 안내 책임

- 빠른 시작이 “설정을 줄이는 흐름”이지 “즉시 타이머로 보내는 흐름”은 아니라는 점을 숨기지 않는다.
- active 세션이나 기록 대기 세션이 있으면 새 템플릿 방을 만들지 않고 기존 세션 복귀를 우선한다.

## QuickStartTemplateCard

### 책임

- 빠른 시작 템플릿 하나의 시간, 분위기, 추천 상황을 보여준다.
- 선택 시 템플릿 기반 임시 방을 만들고 방 상세로 이동한다.

### 주요 props

- `templateId`
- `title`
- `durationMinutes`
- `discussionEnabled`
- `beginnerFriendly`
- `description`
- `recommendedFor`
- `selected`
- `loading`
- `expanded`
- `recent`
- `onSelect`
- `onToggleDescription`

### 표시 조건

- 최근 사용 템플릿이면 `최근 사용` 배지를 붙인다.
- loading 중에는 다른 템플릿 선택을 막는다.
- 설명이 긴 경우 접고 펼칠 수 있다.

## RoomForm

### 책임

- 사용자가 직접 방을 만드는 폼이다.
- 빠른 시작과 달리 사용자가 제목, 설명, 시간, 분위기를 직접 정한다.

### 주요 state

- `draftRoom.title`
- `draftRoom.description`
- `draftRoom.durationMinutes`
- `draftRoom.discussionEnabled`
- `draftRoom.beginnerFriendly`
- `validationErrors`
- `isSubmitting`
- `dirty`

### 주요 핸들러

- `onChangeTitle`
- `onChangeDescription`
- `onSelectDuration`
- `onToggleDiscussion`
- `onToggleBeginnerFriendly`
- `onApplyTemplate`
- `onSubmit`
- `onCancel`

### 사용자 안내 책임

- 방 생성의 템플릿은 `입력값 자동 채우기`로 설명한다.
- 빠른 시작과 같은 기능처럼 보이지 않게 한다.
- 입력값이 있는 상태에서 취소하면 확인 모달을 연다.

## RoomDetailScreen

### 책임

- 방의 시작 조건을 확인하고 세션을 시작하게 한다.
- 빠른 시작에서 유입된 경우 `시작 전 확인` 화면으로 작동한다.

### 주요 props/state

- `room`
- `source`: manual, quickStart, sample
- `template`
- `linkedSession`
- `isPreStartQuickRoom`
- `showRules`
- `originScreen`

### 주요 핸들러

- `onStartSession`
- `onResumeSession`
- `onOpenPendingRecord`
- `onBackToList`
- `onChooseAnotherTemplate`
- `onToggleRules`

### 빠른 시작 유입 표시

- 상단 문구: `{템플릿명} 방이 준비됐어요. 아래 내용을 확인하고 바로 시작하세요.`
- 배지: `시작 전 확인`, `템플릿 기반`
- CTA: `{durationMinutes}분 읽기 시작`

### 다시 고르기 정책

- 세션 시작 전 템플릿 기반 방은 임시 방이다.
- `다시 고르기`를 누르면 해당 임시 방은 폐기한다.
- 세션 시작 후에는 `다시 고르기`를 숨긴다.

## SessionTimerScreen

### 책임

- 세션 진행 상태를 보여주고, 끝나면 기록 대기 상태로 전환한다.
- active와 기록 대기 상태의 버튼 의미를 다르게 보여준다.

### 주요 props/state

- `session`
- `room`
- `now`
- `remainingSeconds`
- `elapsedSeconds`
- `progressRatio`
- `statusLabel`
- `leaveCount`

### 주요 핸들러

- `onExitActiveSession`
- `onOpenRecordForm`
- `onSaveForLater`
- `onTick`
- `onVisibilityChange`

### 버튼 정책

- active 상태 CTA: `세션 나가기`
- active 상태 완료 기록 버튼: 비활성, `세션이 끝난 뒤 기록할 수 있어요`
- 기록 대기 상태 CTA: `기록 작성하기`
- 기록 대기 상태 보조 CTA: `기록 나중에 작성`

### 사용자 안내 책임

- `readyToRecord`라는 내부 용어를 보여주지 않는다.
- 타이머 종료 후에는 `오늘 읽기는 끝났어요. 기록 대기 중입니다.`를 보여준다.

## SessionExitModal

### 책임

- active 세션 이탈과 기록 대기 상태에서 나가는 행동을 분리한다.

### active 상태 문구

- 제목: `세션을 나가시겠어요?`
- 본문: `지금 나가면 이 세션은 이탈 처리되고 완료 기록을 작성할 수 없어요.`
- 주요 CTA: `계속 읽기`
- 위험 CTA: `이탈하고 나가기`

### 기록 대기 상태 문구

- 제목: `기록을 나중에 작성할까요?`
- 본문: `읽기는 끝났고 기록만 남아 있어요. 방 목록과 내 기록에서 다시 이어서 작성할 수 있어요.`
- 주요 CTA: `기록 작성하기`
- 보조 CTA: `나중에 작성`

## RecordForm

### 책임

- 세션 종료 후 완료 기록을 저장한다.
- 필수값을 유지하되 입력 피로를 줄이는 순서와 문구를 제공한다.

### 주요 props/state

- `sessionSummary`
- `draftRecord`
- `validationErrors`
- `canSave`
- `canSaveLater`
- `focusFirstInvalid`
- `isSubmitting`
- `onSave`
- `onSaveLater`
- `onChangeBookTitle`
- `onChangeStartPage`
- `onChangeEndPage`
- `onChangeImpression`

### 입력 순서

1. 세션 요약
2. 책 제목
3. 감상
4. 페이지 범위
5. 저장 CTA

### 검증 정책

- 책 제목은 공백 제거 후 1자 이상.
- 감상은 공백 제거 후 1자 이상.
- 시작/끝 페이지는 1 이상의 정수.
- 시작 페이지와 끝 페이지가 같아도 저장 가능.
- 끝 페이지가 시작 페이지보다 작으면 저장 불가.
- 첫 번째 오류 필드로 포커스를 이동한다.

### 사용자 안내 책임

- 페이지 입력에는 `정확하지 않아도 괜찮아요. 오늘 읽은 범위를 대략 남겨주세요.`를 표시한다.
- 저장 실패 시 입력값을 유지한다.
- 중복 저장 시 `이미 저장된 기록이 있어요`를 표시한다.

## MyRecordsScreen

### 책임

- 실제 기록, 기록 대기, 샘플 기록을 구분해 보여준다.
- 14일 목표 진행률의 산정 기준을 명확히 표시한다.

### 주요 props/state

- `records`
- `pendingRecordSessions`
- `recordFilter`
- `recordSort`
- `selectedRecordId`
- `goalProgress`
- `sampleCount`

### 목표 카드 정책

- 목표는 최근 14일의 실제 완료 기록만 계산한다.
- `source = sample`은 제외한다.
- `session.status = readyToRecord`는 제외한다.
- `session.status = abandoned`는 제외한다.

### 필터

- 전체
- 작성 완료
- 기록 대기
- 샘플
- 샘플 제외
- 최근 7일
- 이번 달

### 사용자 안내 책임

- 필터 적용 중에는 `현재 목록은 필터된 결과입니다.`를 표시한다.
- 샘플이 보이면 `샘플은 목표 진행률에 포함되지 않아요.`를 표시한다.
- 기록 대기 항목은 한 번의 클릭으로 완료 기록 화면으로 복귀하게 한다.

## RecordCard

### 책임

- 기록 목록에서 하나의 기록 또는 기록 대기 세션을 보여준다.

### 주요 props

- `record`
- `pendingSession`
- `room`
- `isSample`
- `status`
- `onOpenDetail`
- `onOpenPendingRecord`
- `onReenterRoom`

### 표시 조건

- 완료 기록은 책 제목, 페이지 범위, 감상 첫 줄을 보여준다.
- 기록 대기 항목은 `기록 대기` 배지와 `기록 이어쓰기` CTA를 보여준다.
- 샘플 기록은 `샘플` 배지를 보여준다.

### 사용자 안내 책임

- 기록 대기와 완료 기록을 다른 상태로 명확히 보여준다.
- 샘플이 실제 기록처럼 보이지 않게 한다.

## RecordDetailModal

### 책임

- 기록 상세를 모달로 보여주고, 다시 읽기 또는 방 재입장으로 연결한다.

### 주요 props/state

- `selectedRecord`
- `room`
- `originScreen`
- `returnToList`
- `canReenterRoom`
- `onClose`
- `onReenterRoom`
- `onBackToRecords`

### 표시 정보

- 날짜
- 완료 상태
- 방 이름
- 책 제목
- 페이지 범위
- 읽은 페이지 수
- 세션 길이
- 시작/종료 시각
- 감상 전체 본문

### 사용자 안내 책임

- 연결된 방이 없으면 `이 기록의 원래 방을 찾을 수 없어요. 같은 조건으로 다시 시작할 수 있어요.`를 표시한다.
- 방 상세로 이동한 뒤 돌아올 수 있도록 `내 기록으로 돌아가기` 맥락을 유지한다.

## DataRecoveryPanel

### 책임

- localStorage 파싱 실패, 저장 실패, stale tab 충돌을 사용자에게 복구 가능한 방식으로 설명한다.

### 주요 상태

- `errorType`: parseError, quotaExceeded, staleTab, missingRoom, missingRecord
- `recoverableItems`
- `corruptedItems`
- `isRecovering`

### 주요 핸들러

- `onRecoverValidItems`
- `onResetAllData`
- `onCreateSampleData`
- `onReload`

### 사용자 안내 책임

- 복구 가능한 데이터와 버려야 하는 데이터를 구분한다.
- 초기화는 최후의 수단으로 표시한다.
- stale tab에서는 새로고침을 우선 안내한다.
