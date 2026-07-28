# Runtime Flow Report

이 문서는 현재 코드 기준으로 화면, 데이터, API, localStorage, Supabase, 리렌더링이 어떻게 이어지는지 설명한다. ChatGPT 프로젝트에서 이어 질문할 수 있도록 각 흐름마다 코드 위치를 함께 기록한다.

## 1. 첫 접속과 온보딩

### 흐름

1. App 시작 시 `profileKey`에서 `storedProfile`을 읽는다.
2. `storedProfile`이 없으면 `screen`은 `manager-select`로 시작한다.
3. 사용자가 매니저를 선택하면 `continueWithSelectedManager()`가 `manager`와 `wizardDraft`를 준비하고 `screen`을 `wizard`로 바꾼다.
4. 설치 마법사 제출 시 `submitWizard()`가 `profile`, `quest`, `manager`, `questStatus`, open windows를 초기화하고 `screen`을 `manager-created`로 바꾼다.
5. 데스크톱 진입 버튼을 누르면 `enterDesktop()`이 blink focus를 트리거하고 `screen`을 `desktop`으로 바꾼다.

### 보존/갱신

- `screen`은 React volatile state라 새로고침하면 다시 계산된다.
- `profile`은 `screen`이 `desktop` 또는 `manager-created`일 때 localStorage에 저장된다.
- `manager`는 변경될 때마다 localStorage에 저장된다.
- `questStatus`는 localStorage에 저장되지 않는다.

### 코드 출처

- `src/App.tsx`: `profileKey`, `managerKey`, startup `useState`, `continueWithSelectedManager()`, `submitWizard()`, `enterDesktop()`
- `src/domain/managerPersonaPolicy.ts`: 선택한 매니저/말투를 Persona policy로 변환

## 2. 새로고침, 재접속, 데이터 보존

### 새로고침 또는 웹사이트 재접속

`profileKey`가 있으면 `screen`은 바로 `desktop`으로 시작한다. 이때 `managerKey`, `questLogsKey`, `pixelTvModeKey`도 localStorage에서 읽는다.

desktop 진입 후 `useEffect([screen])`가 실행되어 `fetchQuestEventsViaApi()`와 `fetchManagerContextViaApi()`를 동시에 호출한다. 성공하면 `logs`는 서버에서 받은 기록으로 교체되고, `manager`의 mood와 line은 `ManagerContext`와 현재 Persona policy를 기준으로 갱신된다.

### 보존되는 데이터

| 데이터 | 위치 | 새로고침 후 상태 |
|---|---|---|
| profile | `manager-xp.profile.v1` localStorage | 유지 |
| manager | `manager-xp.manager.v1` localStorage | 유지 후 `ManagerContext`로 mood/line 갱신 가능 |
| local logs | `manager-xp.logs.v1` localStorage | 초기값으로 읽지만 desktop fetch 성공 시 서버 기록으로 대체 |
| Pixel TV mode | `manager-xp.pixel-tv-mode.v1` localStorage | 유지 |
| sprite placement | `manager-xp.window-pet-placement.v1` localStorage | review/runtime placement에 유지 |
| Supabase records | `quest_logs` | 유지 |

### 보존되지 않는 데이터

| 데이터 | 이유 |
|---|---|
| `questStatus` | React state 기본값 `draft`로 재시작 |
| 현재 진행 중 quest run 상태 | localStorage/DB에 진행 상태 저장 없음 |
| 열린 창의 runtime 순서와 active state | 초기 open windows로 재생성 |
| `outsidePet`, `blinkFocus`, `logSync` | 화면 연출용 volatile state |
| `questOutcomeStreak` | React state로만 유지 |

### 코드 출처

- `src/App.tsx`: startup state, `useEffect([screen])`, `readStorage()`, `writeStorage()`
- `src/layers/storage/questLogRepository.ts`: `questLogsKey`
- `src/layers/storage/questLogApi.ts`: server fetch adapter

## 3. 시작 메뉴 다시 시작

### 흐름

1. 시작 메뉴에서 `다시 시작`을 누른다.
2. `restartService()`가 `profileKey`, `managerKey`를 localStorage에서 삭제한다.
3. `questLogRepository.set([])`로 local logs를 비운다.
4. React state를 `defaultProfile`, `defaultManager`, `draft`, 기본 창 상태로 되돌린다.
5. `screen`을 `manager-select`로 바꿔 매니저 선택부터 다시 시작한다.

### 중요한 경계

`다시 시작`은 로컬 onboarding reset이다. Supabase `quest_logs`를 삭제하지 않는다. 따라서 이 기능은 계정 삭제나 서버 기록 초기화가 아니다.

### 코드 출처

- `src/App.tsx`: `restartService()`
- `src/layers/storage/questLogRepository.ts`: local quest log repository
- `server/lib/supabase.ts`: 서버 기록은 별도 삭제 route 없음

## 4. 퀘스트 완료, 실패, 복구

### 완료

`completeQuest()`는 `questStatus`가 recovery인지 확인해 `success` 또는 `recovery` result를 정한다. `recordOutcomeStreak("success")`를 호출하고, `addExp()`로 manager exp/level/mood/line을 갱신한다. 이후 `createQuestEventRequest()`로 요청을 만들고 `saveQuestEvent()`가 서버에 저장한다.

### 실패

`startFailureFlow()`는 화면을 실패 이유 입력 flow로 이동시키고 manager mood를 `recovering`으로 바꾼다. 사용자가 이유를 선택해 복구를 만들면 `createRecovery()`가 failed event를 저장하고 `createRecoveryQuest()`로 작은 복구 퀘스트를 만든다.

### 서버 저장

`saveQuestEvent()`는 `createQuestEventViaApi()`를 호출한다. 저장 성공 시 응답의 event를 `QuestLog`로 변환해 `logs`에 넣고, 함께 받은 `managerContext`로 manager state를 갱신한다. 실패 시 `logSync.status = "error"`가 되고 화면 flow는 계속 유지된다.

### 성장/보상 metadata

`createQuestEventRequest()`는 완료/실패/복구 결과를 `statDeltas`, `statBudget`, `primaryStats`, `statEvaluationReason`, `statEvaluationSource`, `rewardCandidates`, `unlockedStagesAfter`, `stageUnlocked`, `soundEvent`, `soundAssetId` metadata로 확장한다. 실패 이벤트는 stat delta를 만들지 않는다. 복구 완료는 별도 보상 구간을 쓰지 않고, 조정된 퀘스트의 easy/normal/hard 난이도 budget으로 다시 평가한다.

현재 `statEvaluationSource`는 실제 LLM API가 아니라 `rule_fallback`이다. 이후 LLM 매니저가 붙어도 LLM은 stat 분배를 제안하고, 앱은 난이도별 총합, 주요 능력치 비율, 단일 능력치 최대치를 검증한 뒤 저장한다. 기록 노트는 서버에서 받은 metadata를 `QuestLog.metadata`로 유지한 뒤 stat/reward/stage chip으로 표시한다. 매니저 창은 `ManagerState.unlockedStages`와 `selectedStage`를 사용해 해금된 외형만 선택할 수 있게 한다. `soundEnabled`는 local manager state에 보존되며, 실제 음원 파일이 없는 placeholder asset은 재생 대상으로 쓰지 않는다.

### 코드 출처

- `src/App.tsx`: `completeQuest()`, `startFailureFlow()`, `createRecovery()`, `createQuestEventRequest()`, `saveQuestEvent()`
- `src/domain/statGrowth.ts`: 퀘스트 결과별 stat delta
- `src/domain/rewardProgression.ts`: stage/recovery reward 후보
- `src/domain/stageAppearance.ts`: 해금 stage 선택 규칙
- `src/domain/soundPolicy.ts`: muted 기본값과 sound asset 선택
- `src/data/questLogs.ts`: 기록 노트 metadata 보존
- `src/domain/questLogic.ts`: `createRecoveryQuest()`
- `src/layers/storage/questLogApi.ts`: `createQuestEventViaApi()`
- `server/routes/questEvents.ts`: `POST /api/quest-events`
- `server/contracts/questEvents.ts`: `parseCreateQuestEventRequest()`

## 5. 기록 노트 열기와 매니저 창 밖 이동

기록 노트 아이콘을 열면 `openAppWindow("journal")`이 journal window를 열고 `triggerOutsidePetFromJournal()`을 호출한다. 이 함수는 서버 event를 만들지 않는다. 즉 기록 노트 열기는 “조회/연출” flow이고 저장 flow가 아니다.

outside pet은 `inside -> blink -> peek_from_edge -> walk_in -> free_roam -> returning` 순서로 움직인다. journal window가 열려 있는 동안 free roam이 유지되고, journal이 닫히면 returning phase로 들어간다.

climbing 중에는 `attachedObjectId`로 사다리 오브젝트에 붙어 있고, 사다리 창이 이동/resize되면 현재 ladder rect를 기준으로 pet position을 다시 계산한다.

### 코드 출처

- `src/App.tsx`: `openAppWindow()`, `triggerOutsidePetFromJournal()`, outsidePet 관련 `useEffect`
- `src/domain/interactionObjects.ts`: `getClimbPosition()`
- `src/domain/managerBehaviorAdapter.ts`: behavior 선택
- `src/components/CanvasSpriteAnimator.tsx`: sprite animation render

## 6. Manager Persona와 대사 생성

현재 Persona는 animation 차이를 크게 만드는 용도가 아니다. sprite motion 수가 제한적이므로 Persona의 본체는 말투, 피드백 방식, 퀘스트 제안 성향이다.

`resolveManagerPersona()`는 `petId`, `managerTone`, `questSize`를 받아 `ManagerPersona`를 만든다. `getPersonaLine()`은 이벤트별 문구를 `gentle`, `playful`, `direct` 스타일로 반환한다. animation은 `behaviorStyle`을 통해 `balanced`, `adventurous`, `shy` bias만 약하게 받는다.

### 코드 출처

- `src/domain/managerPersonaPolicy.ts`: Persona line/policy
- `src/domain/managerBehaviorIntent.ts`: 제한된 intent boundary
- `src/domain/managerBehaviorAdapter.ts`: intent + behavior context 결합
- `src/domain/petBehaviorStateMachine.ts`: behavior 후보와 animation mapping
- `src/App.tsx`: `getManagerPersona()`, `createRuleFallbackManagerIntent()`

## 7. Pixel TV와 Projection Mode

Pixel TV mode는 `pixelTvModeKey` localStorage에 저장된다. 기본 상태에서는 Pixel TV 아이콘 클릭이 properties window를 열고, projection 연결 상태에서는 `launchProjectionMode()`가 현재 URL에 `projection=pepper` query를 붙여 projection route로 이동한다.

현재 구현된 것은 `T-724` default/projection mode 전환과 projection route 연결이다. 3순위 Pixel TV 묶음은 `T-721` 현실 픽셀화 TV prototype, `T-724` Single-plane Pepper projection mode, `T-725` photo capture를 함께 다룬다.

### 코드 출처

- `src/App.tsx`: `pixelTvMode`, `togglePixelTvMode()`, `launchProjectionMode()`
- `src/data/assetManifest.ts`: `projectionModeAssets`
- `docs/tasks.md`: `T-721`, `T-724`, `T-725`

## 8. Sprite Review Placement

Sprite review tool은 `?review=sprites`에서 placement를 맞추고 `manager-xp.window-pet-placement.v1` localStorage에 저장한다. React runtime의 `WindowPetInteraction`도 같은 `readWindowPetPlacementDrafts()`와 `resolveWindowPetPosition()`을 사용하므로 review tool에서 맞춘 값이 runtime preview에 반영된다.

### 코드 출처

- `src/components/SpriteSheetReviewTool.tsx`: placement 저장 UI
- `src/data/windowPetPlacements.ts`: placement schema, resolver, storage key
- `src/App.tsx`: `WindowPetInteraction()`

## 9. 현재 플로우 점검

### 의도와 맞음

- 기록 노트 열기는 서버 event를 생성하지 않는다.
- 실패는 punishment가 아니라 recovery/rebalancing flow로 이어진다.
- `다시 시작`은 매니저 선택부터 다시 진행하는 로컬 reset이다.
- LLM은 현재 연결되어 있지 않고, rule fallback과 제한된 intent 구조만 있다.
- Supabase env가 없으면 memory store로 fallback하고, `/api/health`에서 mode를 확인할 수 있다.

### 확인 필요

- 새로고침하면 `questStatus`가 항상 `draft`로 돌아간다. 서버 기록은 보존되지만 “진행 중이던 퀘스트” 자체는 복원되지 않는다.
- `questOutcomeStreak`가 새로고침 후 사라진다. 따라서 성공 streak 기반 hanging/free roam bias도 초기화된다.
- 시작 메뉴 `다시 시작`은 Supabase 기록을 삭제하지 않는다. 사용자 입장에서는 “새로 시작”과 “서버 기록 초기화”의 차이를 설명해야 한다.
- desktop 진입 fetch 성공 시 local logs가 서버 logs로 대체된다. 서버가 memory mode이고 dev server가 재시작되면 이전 local logs와 다르게 보일 수 있다.
- `ManagerContext.memorySummary`에 한글 mojibake 가능성이 있다. 사용자 visible UI에는 현재 이 string을 직접 보여주지 않지만 문서/디버그에서 혼란을 줄 수 있다.

### 잠재 개선

- 진행 중 quest를 복원해야 한다면 `questStatus`, current quest, runner startedAt을 localStorage 또는 server event로 저장해야 한다.
- 다시 시작에 “로컬만 초기화”와 “서버 기록도 초기화”를 분리하려면 인증/사용자 식별과 삭제 정책이 먼저 필요하다.
- 기록 노트의 loading/empty/error 상태를 더 명확하게 구분하면 새로고침 후 데이터 fetch 흐름을 이해하기 쉬워진다.

## 10. 주기적 Data Rebalancing 판단

현재 MVP에는 cron이나 background job 같은 주기적 rebalancing이 필요하지 않다.

지금 필요한 rebalancing은 두 가지면 충분하다.

- 이벤트 발생 시점: 완료/실패/복구 이벤트 저장 후 `ManagerContext`를 다시 계산한다.
- 데스크톱 진입 시점: 서버 기록과 manager context를 다시 조회한다.

`T-712`, `T-703`, `T-713`의 1차 metadata/UI 연결 이후에는 batch rebalancing 후보가 더 분명해진다.

- 하루 단위 능력치 집계
- reward unlock 계산
- memory fragment 생성
- persona별 cyber-purr preference 갱신
- LLM manager context 압축

권장 기본값은 “실시간 UX는 event-driven, 장기 요약은 daily/manual batch”이다. 즉 버튼 클릭 직후 화면 반응은 지금처럼 즉시 처리하고, 장기 성장/기억/추천 품질 개선은 하루 1회 또는 사용자가 기록 노트를 열 때 on-demand로 재계산하는 편이 현재 구조에 맞다.
