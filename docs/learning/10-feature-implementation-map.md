# Feature Implementation Map

## Keywords

- windowRegistry
- useWindowManager
- XpWindow
- interaction object window
- outsidePet state machine
- Manager LLM API
- Hono contract parser
- rule fallback
- Pixel TV
- single-plane Pepper projection
- canvas pixelizer
- quest event metadata

## Why It Matters

이 문서는 현재 구현된 주요 기능을 코드 위치와 함께 빠르게 복습하기 위한 지도다. 창이 어떻게 뜨는지, 사다리/평지와 Lumi가 어떻게 연결되는지, LLM이 어떤 정보를 받고 무엇을 돌려주는지, Pixel TV가 어떤 원리로 동작하는지 설명할 때 출발점으로 쓴다.

## Reference Code Paths

- `src/App.tsx`
- `src/data/windowRegistry.ts`
- `src/hooks/useWindowManager.ts`
- `src/domain/windowCompatibilityPolicy.ts`
- `src/domain/managerRuntimePriority.ts`
- `src/hooks/useOutsidePetRuntime.ts`
- `src/domain/outsidePetRuntime.ts`
- `src/domain/interactionObjects.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/domain/managerBehaviorIntent.ts`
- `src/layers/storage/managerLlmApi.ts`
- `server/routes/managerLlm.ts`
- `server/contracts/managerLlm.ts`
- `server/lib/managerLlmProvider.ts`
- `server/lib/managerLlmFallback.ts`
- `src/domain/pixelizer.ts`
- `src/data/assetManifest.ts`

## 1. Window Opening And Rendering

| 단계 | 코드 위치 | 하는 일 |
|---|---|---|
| window id 정의 | `src/data/windowRegistry.ts` | `quest`, `manager`, `journal`, `pixelTv`, `ladderObject`, `platformObject` 같은 `WindowId`와 초기 위치/크기/아이콘을 관리 |
| 창 상태 관리 | `src/hooks/useWindowManager.ts` | `openWindows`, `minimizedWindows`, `focusedWindow`, `windowPositions`, `windowSizes`, `windowRects` 관리 |
| 창 열기 | `openWindow(id)` | compatibility 정책을 거친 뒤 열고, 최소화 상태에서 제거하고, focus를 준다 |
| 창 닫기 | `closeWindow(id)` | `openWindows`와 `minimizedWindows`에서 제거하고 focus를 다음 창으로 넘긴다 |
| 창 최소화 | `minimizeWindow(id)` | 창은 `openWindows`에 남지만 `visibleWindows`에서 빠진다 |
| 렌더링 | `src/App.tsx`의 `isWindowVisible(id)` 조건부 JSX | 보이는 창만 `XpWindow`로 감싸서 렌더링 |
| 드래그/resize | `XpWindow()` | titlebar pointer move로 위치를 바꾸고, `resizeAxis`에 따라 크기 변경 |
| taskbar | `src/App.tsx` 하단 taskbar map | 열린 창 목록을 표시하고 클릭하면 focus/restore |

## 2. Ladder And Platform Logic

| 항목 | 사다리 | 평지 |
|---|---|---|
| WindowId | `ladderObject` | `platformObject` |
| 렌더 창 | `XpWindow` + `LadderObjectWindow` | `XpWindow` + `PlatformObjectWindow` |
| resize axis | `vertical` | `horizontal` |
| asset source | `getInteractionObjectAsset("ladder")` | `getInteractionObjectAsset("platform")` |
| interaction rect 생성 | `createInteractionObjectsFromWindows()` | `createInteractionObjectsFromWindows()` |
| pet 연결 id | `attachedObjectId` | `platformId` |
| loop | `climb_ladder` -> `hold_ladder` -> `descend_ladder` -> `idle` | `jump_to_platform` -> `land_on_platform` -> `idle_on_platform` -> `jump_down` -> `idle` |

## 3. Outside Pet State Machine

| state/phase | 의미 | 코드 위치 |
|---|---|---|
| `inside` | 매니저가 창 안에 있는 기본 상태 | `outsidePetInitialState` |
| `blink` | 외부 산책 전환 시작 | `triggerOutsidePetFromJournal()` |
| `peek_from_edge` | 화면 왼쪽/오른쪽 끝에서 hiding motion | `useOutsidePetRuntime()` |
| `walk_in` | 들판 영역으로 걸어 들어오는 상태 | `resolveOutsidePetWalkInStep()` |
| `free_roam` | 주기적으로 행동을 고르는 상태 | `useOutsidePetRuntime()` interval |
| `returning` | 기록 노트가 닫히면 화면 밖으로 돌아가는 상태 | `resolveReturningOutsidePetStep()` |

## 4. LLM Feature Input And Output

React는 LLM provider를 직접 호출하지 않는다. `src/layers/storage/managerLlmApi.ts`가 `/api/manager/*`로 JSON 요청을 보내고, Hono route가 계약 검증과 fallback을 담당한다.

| 기능 | React가 보내는 정보 | 서버가 돌려주는 정보 | 주요 코드 |
|---|---|---|---|
| manager line | `managerContext`, `profile`, `persona`, `questState`, `recentEvents` | `managerLine` | `requestManagerLineViaApi()` |
| quest suggestion | 목표/프로필/최근 기록/현재 퀘스트 상태 | 새 `Quest` draft | `requestManagerQuestSuggestionViaApi()` |
| difficulty evaluation | 사용자가 수정한 quest draft | `difficulty`, `rewardExp`, `reason` | `requestManagerDifficultyEvaluationViaApi()` |
| quest acceptance preview | 수락 전 quest snapshot | `difficulty`, `rewardExp`, `statEvaluation`, `reason` | `requestManagerQuestAcceptancePreviewViaApi()` |
| stat evaluation | quest event 직전 상태 | `statDeltas`, `statBudget`, `primaryStats`, `reason` | `requestManagerStatEvaluationViaApi()` |
| behavior intent | persona와 최근 흐름 | `behaviorStyle`, `tone`, `line`, `suggestedBehaviorBias` | `requestManagerBehaviorIntentViaApi()` |
| goal plan / rebalance | 장기 목표, 계획, 최근 실패/성공 | 월간/주간/일간 plan 또는 rebalance plan | `requestManagerGoalPlanViaApi()`, `requestManagerPlanRebalanceViaApi()` |

## 5. LLM Guardrails

- `server/routes/managerLlm.ts`: route별 `outputKind`가 맞는지 확인한다.
- `server/contracts/managerLlm.ts`: request body와 LLM raw output을 parser로 검증한다.
- `rewardExpRangeByDifficulty`: 현재 `easy=5..15`, `normal=16..35`, `hard=36..60`.
- `resolveManagerLlmOutput()`: LLM 출력이 이상하면 `INVALID_LLM_OUTPUT` fallback으로 바꾼다.
- `createManagerLlmFallback()`: LLM 비활성화, rate limit, provider error 때 rule fallback을 만든다.
- `managerBehaviorIntent.ts`: LLM behavior bias의 state를 whitelist로 제한하고 `weightDelta`를 `-2..2`로 clamp한다.

## 6. Pixel TV Principle And Code Flow

| 흐름 | 코드 위치 | 설명 |
|---|---|---|
| Pixel TV 창 열기 | `openAppWindow("pixelTv")` | Pixel TV 창을 띄운다. quest flow 창과는 compatibility 정책으로 같이 열리지 않게 조정된다 |
| 카메라 입력 | `PixelTvWindow()` | `navigator.mediaDevices.getUserMedia()`로 video stream을 받는다 |
| 픽셀화 | `renderPixelizedSource()` + `src/domain/pixelizer.ts` | 원본 frame을 작은 sample canvas로 줄이고, edge/luma 보정 후 `imageSmoothing=false`로 확대한다 |
| 사진 저장 | `createPixelTvPhotoCapture()` | TV frame, 현재 canvas, manager sprite, caption을 새 canvas에 그린 뒤 PNG로 다운로드한다 |
| projection 변환 | `PixelTvPropertiesWindow` + `usePixelTvMode()` | 우클릭 속성에서 Pixel TV 아이콘을 projection-connected 상태로 바꾼다 |
| Pepper mode 실행 | `launchProjectionMode()` | 연결된 TV 아이콘 실행 시 URL에 `?projection=pepper`를 붙인다 |

단일면 Pepper projection은 검은 배경 위 밝은 캐릭터 영상을 태블릿에 띄우고, 45도 투명판에 반사시켜 공중에 떠 보이게 하는 방식이다. 현재 앱의 projection mode는 이 물리 세팅에 맞는 검은 배경과 밝은 Lumi 출력으로 연결되는 hidden route를 준비한다.

## 7. Quest Event And Reward Metadata

| 단계 | 코드 위치 | 하는 일 |
|---|---|---|
| 이벤트 생성 | `createQuestEventRequest()` | 완료/실패/복구 결과를 `CreateQuestEventRequest`로 만든다 |
| stat 평가 | `enrichQuestEventWithLlmStatEvaluation()` | preview가 없으면 LLM stat evaluation을 요청하고 실패 시 기존 request 유지 |
| 저장 요청 | `saveQuestEvent()` | `/api/quest-events`로 저장하고, 응답의 log와 managerContext로 화면 state를 갱신 |
| 기록 표시 | `JournalWindow` | `QuestLog.metadata`의 stat delta, reward hint, stage unlock chip을 렌더링 |
| manager 갱신 | `applyManagerContext()`와 `setManager()` | mood, line, exp, stats, stage 상태를 반영 |

## 8. Current Checkpoints

- `windowRegistry.ts`의 일부 한글 label은 현재 파일에 mojibake가 남아 있어 별도 정리가 필요하다.
- `resolvePixelTvWatchingAnimationAsset()`는 현재 `watching` sheet를 직접 고정 사용하지 않고 `focused`/`happy`를 시간에 따라 번갈아 반환한다. Pixel TV 전용 watching sheet를 확실히 쓰려면 이 resolver를 먼저 확인한다.
- 사다리/평지 창을 닫으면 interaction object 배열에서 빠지므로, 붙어 있던 outside pet은 `outsidePetRuntime`의 object missing fallback을 타는지 확인한다.
- LLM API는 실제 모델이 꺼져 있어도 route와 contract는 동작하며, `source: "rule_fallback"`으로 응답할 수 있다.

## ChatGPT Questions

- 이 프로젝트의 `windowRegistry`, `useWindowManager`, `XpWindow`가 각각 어떤 책임을 가지는지 설명해줘.
- `ladderObject` 창이 `InteractionObject` rect로 바뀌고 Lumi climbing 위치에 반영되는 흐름을 단계별로 설명해줘.
- `ManagerLlmRequest`에는 어떤 데이터가 들어가고, Hono route는 어떤 기준으로 LLM 출력을 거절하는지 설명해줘.
- Pixel TV의 canvas pixelizer가 왜 sample canvas와 preview canvas를 나눠 쓰는지 설명해줘.
- `openWindows`, `minimizedWindows`, `focusedWindow`가 동시에 필요한 이유를 이 프로젝트 창 관리 코드로 설명해줘.
