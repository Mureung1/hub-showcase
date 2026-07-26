# 오늘 학습 허브(TodayLearningHub) 레이아웃 재구성 설계

## 배경 및 목표

참고 목업(외부 서비스 "aidt-library"의 수업별 학습 현황 대시보드에서 영감을 받음)의 구조를
ICU 프로젝트의 `/today` 페이지(오늘 학습 허브)에 맞게 재구성한다. ICU는 다수 학생을
관리하는 클래스형 서비스가 아니라 1인 학습자를 위한 개인 대시보드이므로, 목업의 "수업별/
학생별 현황 표" 개념 대신 "트랙별(React/Python/FastAPI 등) 진행 현황"으로 치환해 적용한다.

목표: `/today`를 읽기 전용 현황 대시보드로 재구성하고, 지금 이 페이지 안에 인라인으로
붙어 있는 "새 목표 만들기(AI 커리큘럼 생성)" 플로우를 별도 라우트로 분리한다.

## 시각적 스타일 원칙

새 레이아웃은 구조(섹션 구성, 데이터 배치)만 재구성한다. **배경색과 섹션별 패널 구조는
`TodayLearningHub.module.css`에 이미 정의된 기존 톤(카드 배경색, `panelTitleRow`, 그라디언트
스탯 카드 등)을 그대로 유지**하며, 완전히 새로운 색상/디자인 언어를 도입하지 않는다. 새로
추가하는 섹션(ProgressBar 등)도 기존 CSS 모듈의 색상·타이포그래피 변수를 그대로 따른다.

## 범위

- 이번 설계는 **오늘 학습 허브 레이아웃 전체 재구성 + 목표 생성 페이지 분리**까지를 다룬다.
- 점수/취약개념 데이터 모델 신설도 이번 범위에 포함한다(아래 3절).
- 캘린더 섹션은 기존 컴포넌트를 그대로 유지하고, 새 레이아웃 내 위치만 조정한다. 내용/로직
  변경 없음.
- 관리자/통계용 별도 페이지 신설, 다중 사용자(교사-학생) 기능은 이번 범위에서 제외한다.

## 1. 라우트/컴포넌트 구조

- `/today` (`TodayLearningHub.tsx`)를 **읽기 전용 대시보드**로 축소한다. 구성 섹션:
  진행 중 미션 카드, 트랙 현황(전체 진행률 + 취약개념), 오늘 복습, 오늘 진행 순서,
  학습 워크스페이스 미리보기, 학습 목록 미리보기(진행률 바 + 테스트 통과율), 캘린더.
- 새 라우트 `/today/goal`을 신설한다. 지금 `TodayLearningHub.tsx`에 있는 목표 입력
  (`careerGoal` state), `startCurriculumGeneration`, docs/ai 모드 선택, `CurriculumLoading`
  연동 로직(대략 280~560번째 줄 부근)을 이 새 페이지 컴포넌트로 그대로 이전한다.
- `/today`의 "새 목표 만들기" 버튼을 `<Link to="/today/goal">`로 교체한다.
- `/today/goal`에서 커리큘럼 생성이 완료되면 `/today`로 리다이렉트한다.
- `src/app/router.tsx`에 `/today/goal` 라우트 항목을 추가한다.

## 2. 데이터 모델 변경

### 2.1 테스트 결과 영속화

`useLearningProgressStore.ts`의 `LearningMissionProgress`에 필드를 추가한다.

```ts
type LearningTestResult = { passed: number; total: number; ranAt: string }

type LearningMissionProgress = {
  // 기존 필드(missionId, runState, runAttemptCount, activeStepOffset, completedAt, activityLog)
  lastTestResult: LearningTestResult | null
}
```

- `LearningWorkspace.tsx`에서 테스트를 실행해 `recordRunResult`를 호출하는 지점(현재
  `TestCase[]`로부터 `passedCount`/`failedCount`를 계산하는 로직이 이미 있음)에서
  해당 카운트를 `lastTestResult`로 함께 저장하도록 `recordRunResult` 시그니처를 확장한다.
- 기존과 동일하게 `localStorage`(`icu.learningProgress`)에 영속화되고, 기존
  `/api/progress` 동기화 흐름에 포함된다. **다만 백엔드에는 실제 변경이 필요하다**:
  `backend/modules/learning-progress/domain/missionProgress.mjs`의
  `normalizeMissionProgressInput`이 `runState`/`runAttemptCount`/`activeStepOffset`/
  `completedAt`/`activityLog` 5개 필드만 명시적으로 화이트리스트하고 있어, 이 목록에
  `lastTestResult`를 추가하지 않으면 서버로 보낸 값이 조용히 버려진다. 또한
  `sqliteLearningProgressRepository.mjs`는 JSON blob이 아니라 고정 컬럼 목록으로 저장하므로
  `last_test_result_json` 컬럼을 `backend/shared/sqliteDatabase.mjs`의 DDL과 INSERT/매핑
  로직에 추가해야 한다. in-memory 저장소(`inMemoryLearningProgressRepository.mjs`)는 객체를
  그대로 저장하므로 변경이 필요 없다.

### 2.2 트랙 정의 재설계 (Mock 제거, 실데이터 3개 트랙)

기존 `learningTracks`(React 입문/Python 기초/FastAPI/BFS, `src/features/today-learning/data/todayLearning.ts:58-91`)는
전부 발명된 가짜 진행률이며 실제로 진행률을 계산할 근거 데이터가 없다. 조사 결과 이 프로젝트에서
**실제로 진행 상태를 계산할 수 있는 콘텐츠는 Git 시뮬레이터와 React 실습 두 가지뿐**이고,
Docker는 코드 실행(`runDockerfileCode`)은 가능하지만 레벨/진행 저장 구조가 없다. 이에 따라
`learningTracks`를 다음 3개의 실데이터 기반 트랙으로 교체한다.

| 트랙 | 진행률 소스 | 테스트 통과율 소스 |
|---|---|---|
| 깃 시뮬레이터 | `createPlayableLevels(gitLabLevels.json)` 전체 개수 대비 `localStorage['icu:git-lab-cleared-levels']` 클리어 개수 (`src/features/git-lab/levels/gitLabCurriculumAdapter.ts`의 `createPlayableLevels`, `src/features/git-lab/GitLabPage.tsx:37-47`의 저장 키/로더 재사용) | 진행률과 동일한 값 재사용 (Git 레벨은 클리어 자체가 pass/fail 테스트이므로 별도 실습/테스트 구분이 없음) |
| React 실습 | 기존 `applyQueueProgress`+`getCompletionPercent`로 계산하는 오늘 큐 완료율(`TodayLearningHub.tsx:244-252`, 그대로 재사용) | 현재 활성 미션의 `lastTestResult.passed/total` (2.1절), 아직 실행 전이면 2.4절 빈 상태 규칙 |
| Docker 실습 | 없음 — "진행률 없음 · 준비 중" 고정 표시 | 없음 — 동일하게 "준비 중" 고정 표시 |

- 트랙 상태 배지는 `'in_progress' | 'completed' | 'not_started' | 'unavailable'`로 재정의한다.
  Git/React는 진행률 값에 따라 in_progress/completed/not_started를 계산하고, Docker는 항상
  `unavailable`이다. 기존 `review_due` 상태는 트랙 단위 복습 신호가 없으므로 제거한다.
- "트랙 현황" 카드(전체 진행률 + 취약개념)는 React 실습 트랙을 대표로 표시한다(목업의
  "React 현황"과 동일한 역할 — 현재 진행 중인 학습이 항상 React 실습이기 때문).

### 2.3 취약 개념 (신규 유틸)

- `useMistakeNoteStore`에서 `status === 'open'`인 노트를 `lessonTitle` 기준으로
  그룹핑하여 가장 빈도 높은 `lessonTitle` 하나를 "취약 개념"으로 노출한다.
- **트랙 구분 없이 전체 학습에서 취약개념 1개만 계산**한다(lessonId→track 매핑이 현재
  존재하지 않고, 억지로 추론하면 규칙이 깨지기 쉬우므로 이번 범위에서 만들지 않는다).
  이 전역 취약개념 1개는 "트랙 현황" 카드 하나(현재 진행 중인 미션이 속한 트랙 기준으로
  표시되는 그 카드)에 그대로 노출한다. 트랙별로 다른 취약개념을 계산하지 않는다.

### 2.4 빈 상태 처리

- 진행 중인 미션이 없는 경우: 미션 카드 자리에 "진행 중인 미션이 없어요 · 새 목표를
  만들어보세요" 안내 문구 + `/today/goal`로 가는 버튼을 표시한다.
- 테스트를 한 번도 실행하지 않은 트랙(`lastTestResult`가 모두 `null`)의 경우: 통과율
  수치 대신 "아직 실행 안함" 텍스트를 표시한다(0/0으로 표기해 0%처럼 오인시키지 않는다).

## 3. 섹션별 UI 매핑

| 목업 섹션 | ICU 데이터 소스 | 비고 |
|---|---|---|
| 진행 중 미션 카드 | `getMissionProgress` + 현재 활성 미션 | 기존 로직 재사용, 진행률 바 신규 추가 |
| 트랙 현황(전체 진행률/취약개념) | 2.2/2.3의 신규 집계 유틸 | 신규 |
| 오늘 복습 | `useMistakeNoteStore`의 open 노트 | 기존 `recentMistakes` 목업 데이터 대체 |
| 오늘 진행 순서(타임라인) | `todayQueue` (기존 데이터) | 배지/레이아웃만 목업 스타일로 조정 |
| 학습 워크스페이스 미리보기 | 진행 중 미션의 `activeStepOffset` 코드 스니펫 + AI 힌트 | 신규 연동 |
| 학습 목록 미리보기 | 2.2절의 실데이터 3개 트랙(깃 시뮬레이터/React 실습/Docker 실습) + 신규 진행률 바 컴포넌트 | 표 형태로 재배치, mock `learningTracks` 제거 |
| 캘린더 | 기존 컴포넌트 그대로 | 위치만 재배치, 로직/내용 변경 없음 |

### 신규 공용 컴포넌트

- **ProgressBar**: 현재 `src/components`에 진행률 바 컴포넌트가 없다(진행률이 숫자
  텍스트로만 표시됨). 미션 카드, 트랙 현황, 학습 목록 미리보기 3곳에서 재사용할 공용
  컴포넌트를 신규 제작한다.

## 4. 에러 처리

- 테스트 실행 관련 API/스토어 호출 실패 시: 기존 `recordRunResult` 호출부의 에러 처리
  패턴을 그대로 따른다(신규 동작 추가 없음, 필드 저장 실패해도 UI 진행을 막지 않음).
- 집계 유틸(2.2, 2.3)은 순수 함수로 작성하여 스토어 데이터가 비어 있어도 예외를 던지지
  않고 빈 상태 값을 반환한다.

## 5. 테스트

- 신규 집계 유틸(트랙 진행률/통과율 평균, 취약개념 그룹핑)에 대한 단위 테스트 작성.
- `recordRunResult` 확장부에 대한 기존 스토어 테스트(있다면) 갱신, 없다면 `lastTestResult`
  저장 여부를 검증하는 테스트 추가.
- `/today/goal` 라우트 분리 후 기존 목표 생성 플로우(케이스: docs 모드, ai 모드, 팔로업
  수정 요청)가 동일하게 동작하는지 회귀 확인.
- UI 회귀는 브라우저 프리뷰로 수동 확인(빈 상태 포함).
