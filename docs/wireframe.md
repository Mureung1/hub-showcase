# 잔소리봇 와이어프레임 (화면 단위 정리)

> 현재 구현은 텍스트/기본 UI 중심이며, design-concept.md의 날씨+여정 비주얼은 아직 미반영. 반영 시 이 문서도 갱신 필요.

> plan.md의 User Flow / System Flow(mermaid)를 실제로 구현할 화면 단위로 쪼갠 문서.
> `docs/prototype.html`(정적 프로토타입)이 이미 아래 화면을 전부 구현해서 가설을 검증한 상태 —
> 여기서는 그 화면 구성을 실제 React 앱(라우팅 + 컴포넌트 + 상태) 기준으로 재정리한다.
> 각 컴포넌트는 CLAUDE.md의 content-as-data 패턴(카피/데이터는 배열·객체로 분리, JSX는 매핑만)을 따른다.

## 화면 목록 개요

| # | 화면 | 경로(예정) | User Flow 상 위치 |
|---|---|---|---|
| 1 | 랜딩 | `/landing` | 앱 진입점(마케팅용, 등록 전) |
| 2 | 홈 | `/home` | 할일 등록 후 기본 화면, 대기/개입의 중심 |
| 3 | 할일 등록 | `/register` | User Flow "할일 등록" |
| 4 | 잔소리봇 개입 모달 (Lv1~4) | 오버레이 (경로 없음, 홈 위에 뜸) | User Flow "잔소리봇 자동 팝업" |
| 5 | 포커스 화면 | 오버레이 (모달 연장) | User Flow "포커스 화면" |
| 6 | 완료/피드백 모달 | 오버레이 (포커스 화면 연장) | User Flow "히스토리→피드백" 진입 전 단계 |
| 7 | 히스토리 | `/history` | User Flow "히스토리" |

개입 모달·포커스·피드백은 별도 라우트가 아니라 홈 화면 위에 뜨는 오버레이다 — plan.md 6-3 설계 결정("챗봇 UI 대신 일반 웹페이지 + 알림 모달 구조")과 일치.

---

## 1. 랜딩 화면

**역할**: 서비스 소개, `/register`로 유도하는 진입점. 앱 자체 네비바(홈/등록/히스토리) 대신 자체 헤더(로고만)를 쓴다.

**상태/데이터**: 없음(정적 카피). `LANDING_COPY = { badge, title, sub, ctaLabel }`, `FEATURE_TAGS = [{icon, label}, ...]` 같은 content-as-data 객체만 있으면 됨.

**컴포넌트 분리**:
- `LandingPage` (레이아웃)
- `LandingHero` (배지+타이틀+서브+CTA)
- `FeatureTagList` (핵심 기능 태그 두 개: 마이크로태스크 제안 / 회피 원인 기반 개입)

**전환 조건**: CTA 클릭 → `/register`.

---

## 2. 홈 화면

**역할**: 등록된 할일 목록과 각 할일의 압력 게이지(레벨)를 보여주는 기본 화면. 시작 예정 시각이 지나면 여기서 개입이 시작된다.

**상태/데이터**:
- `tasks: Task[]` — 각 task: `{ id, title, type, startTime, deadline(D-day), reason, customReasonText, status(waiting|active|done), level(0~4), skipCount, nextTickAt }`
- 파생 값: `activeTasks`, `doneTasks`, `streak`(연속 첫시도 완료 횟수)
- `nextTickAt` 기반 "다음 알림까지 N초" 카운트다운 — 1초 간격 재렌더 필요

**컴포넌트 분리**:
- `HomePage` (데이터 필터링 + 레이아웃)
- `StatsRow` (진행중/완료/스트릭 칩 3개 — `STAT_DEFS`로 데이터화)
- `TaskGrid` → `TaskCard` (status별 분기: waiting / active / done 세 변형)
- `EmptyState` (task 0개일 때)

**전환 조건**:
- "+ 새 할일 등록" → `/register`
- 각 active task의 "지금 확인하기" 또는 `status→active` 전환 순간(레벨 상승 시 자동) → 개입 모달 오버레이 오픈
- task `status: waiting`이고 `startTime` 도달 → `active`로 전환(주기적 폴링, plan.md 5-System Flow의 "시작 예정 시각 도달")

---

## 3. 할일 등록 화면

**역할**: 제목·유형·시작 예정 시각·마감 D-day·예상 회피 이유를 입력받아 task를 생성한다.

**상태/데이터**:
- 폼 로컬 상태: `title, type, startTime, deadline, reason, customReasonText`
- `TYPES: string[]`(유형 9종), `REASON_OPTIONS: [{value, label}]`(회피 이유 3종 + 기타), `DEADLINE_QUICK_CHIPS: number[]`(D-1/3/7/14) — 모두 content-as-data

**컴포넌트 분리**:
- `RegisterPage` (폼 상태 관리 + 제출)
- `TypeSelect`, `DeadlineField`(quick chip 포함), `ReasonSelect`(custom 선택 시 텍스트 입력 노출)

**전환 조건**: 제목 미입력 시 제출 차단(포커스 이동). 제출 성공 → task 생성(`status`는 `startTime` 지남 여부로 `waiting`/`active` 결정) → `/home`으로 이동.

---

## 4. 잔소리봇 개입 모달 (Lv1~Lv4)

**역할**: 무응답이 쌓여 레벨이 오를 때마다 뜨는 개입 팝업. 레벨에 따라 메시지 내용과 톤이 달라진다(plan.md 3-System Flow).

**상태/데이터**:
- 대상 task 전체 + `level`(0~4), `skipCount`
- 레벨별 메시지 생성 함수 입력값: `{ reason, type, title, skipCount, deadline }`
- 체크포인트(회피 이유 재확인, Lv1·Lv3에서만, task당 최대 2회): `reasonCheckCount`, `reasonCheckedLevels`
- Lv2 자유 텍스트 입력(공감용, 로직 미반영): `freeTextAsked`, `userNote`
- Lv3 "기억 기반 개입": 세션 내 `history`(완료된 task 목록)에서 같은 `reason`으로 성공한 사례를 찾아 그때의 마이크로태스크를 재제안
- Lv4 전용: D-day 강조 문구 + 캘린더 삽입 카드(클릭 시 해당 task를 캘린더 히스토리 뷰에 표시되도록 연결)

**컴포넌트 분리**:
- `NudgeModal` (레벨별 배경/보더 색, 흔들림 애니메이션(Lv4)은 CSS로)
- `ReasonCheckpoint` (Lv1/3 조건부)
- `FreeTextPrompt` (Lv2 조건부)
- `NudgeMessage` (레벨 칩 + 본문, `LEVEL_META`로 라벨/이모지 데이터화)
- `CalendarSlotCard` (Lv4 조건부, 클릭 시 해당 task를 캘린더 히스토리 뷰에 표시되도록 연결하는 카드)

**전환 조건**:
- "지금 시작하기" → 포커스 화면으로 전환(같은 오버레이가 내용만 교체)
- "닫기" → 오버레이 닫힘, 홈으로 복귀(다음 레벨 상승 시 다시 자동으로 뜸)
- 레벨이 실제로 오른 순간에는 사용자가 아무것도 누르지 않아도 자동으로 뜬다(다른 task의 모달이 떠 있지 않을 때만)

---

## 5. 포커스 화면

**역할**: "지금 시작하기"를 누른 뒤 경과 시간을 보여주며 실제 작업에 집중하는 화면.

**상태/데이터**: `focusStartAt`(시작 시각), 매초 갱신되는 경과시간(mm:ss). task의 `level`에 따른 표정 이모지만 참조.

**컴포넌트 분리**:
- `FocusMode` (경과시간 타이머 + 완료/멈추기 버튼)

**전환 조건**:
- "완료" → 완료/피드백 모달로 전환, task `status: done`; 연속 완료는 Asia/Seoul 기준 날짜별 done 이벤트로 계산
- "멈추기" → task는 `active`로 남고 홈으로 복귀한다. 600초(10분) 이상 집중했을 때만 실제 시도로 인정해 개입 레벨을 정확히 한 단계 완화하며, 600초(10분) 미만이거나 시간이 유효하지 않으면 `skipCount`와 `level`을 유지한다. 스트릭에는 영향이 없다.

---

## 6. 완료/피드백 모달

**역할**: 완료 직후 축하 메시지를 보여주고, 이번 개입이 "도움됐음/귀찮았음"인지 피드백을 받아 다음 개입 강도 조절에 반영한다.

**상태/데이터**: `wasFirstTry`(무응답 없이 바로 완료했는지), `streak`, 피드백 결과 → 같은 `reason`에 대한 `sensitivity`(gentle/normal) 갱신

**컴포넌트 분리**:
- `CompletionMessage`
- `FeedbackButtons` (도움됐음/귀찮았음 두 버튼)

**전환 조건**: 피드백 선택(또는 자동 타임아웃) → 오버레이 닫힘, 홈 화면으로 복귀 + 리렌더.

---

## 7. 히스토리 화면

**역할**: 완료한 할일 목록과 각 할일이 몇 번 미뤄졌는지(`skipCount`)를 보여준다. 리스트 뷰 외에, 날짜별로 등록/완료된 task를 한눈에 보는 캘린더 그리드 뷰도 함께 제공한다(외부 캘린더 연동 아님, 우리 서비스 내부 데이터만 사용).

**상태/데이터**:
- `doneTasks: Task[]`, `maxSkip`(막대 그래프 정규화용), `streak`
- 캘린더 뷰용: `tasksByDate: Record<dateString, Task[]>`(등록일/완료일 기준으로 날짜별 그룹핑), `selectedDate`(클릭한 날짜 셀), `viewMode`(`list` | `calendar`)

**컴포넌트 분리**:
- `HistoryPage` (뷰 전환 탭 상태 관리)
- `HistoryRow` (제목 + 미룸 횟수 막대 그래프, `list` 뷰)
- `CalendarHistoryView` (`calendar` 뷰 — 날짜 그리드, 날짜 셀 클릭 시 해당 날짜에 등록/완료된 task 목록을 표시)
- `EmptyState` (완료 0개일 때, 홈과 컴포넌트 공유)

**전환 조건**:
- 뷰 전환 탭(`list`/`calendar`) 클릭 → `viewMode` 변경, 같은 화면 안에서 컴포넌트만 교체
- 캘린더 그리드의 날짜 셀 클릭 → `selectedDate` 설정, 해당 날짜의 task 목록 표시(별도 라우트 이동 없음)
- 그 외 없음(읽기 전용 화면). 네비바로 `/home`, `/register`로 이동 가능.

---

## 공통 요소

- **네비바**: 로고(→`/landing`), 홈/할일등록/히스토리 링크, 알림 권한 요청 버튼. `/landing`에서만 숨김.
- **오버레이 잠금(`modalLocked`)**: 포커스 화면이 떠 있는 동안 다른 task의 개입 모달이 끼어들어 화면을 가로채지 않도록 막는 상태 — 여러 task가 동시에 활성화될 수 있으므로 실제 구현에서도 필요.
