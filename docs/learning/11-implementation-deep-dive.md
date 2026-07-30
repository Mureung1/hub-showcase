# Implementation Deep Dive

이 문서는 키워드 암기용이 아니라, 지금 프로젝트의 기능 구현을 말로 설명할 수 있게 풀어쓴 학습 문서다. 코드를 읽을 때는 아래 설명을 먼저 보고, 그 다음에 적힌 파일 위치를 열어 흐름을 따라가면 좋다.

## 1. 창은 어떻게 뜨고 관리되는가

이 프로젝트의 화면은 XP 데스크톱처럼 보이지만, 실제로는 React state로 열린 창 목록과 창 위치를 관리한다. 창의 종류는 `src/data/windowRegistry.ts`에 먼저 등록되어 있다. 여기에는 `quest`, `manager`, `journal`, `pixelTv`, `ladderObject`, `platformObject` 같은 창 id와 초기 위치, 크기, 아이콘 정보가 들어 있다.

앱이 실행되면 `src/App.tsx`에서 `useWindowManager()`를 호출한다. 이 hook은 현재 열린 창 목록인 `openWindows`, 최소화된 창 목록인 `minimizedWindows`, 포커스된 창인 `focusedWindow`, 창 위치인 `windowPositions`, 창 크기인 `windowSizes`를 state로 들고 있다.

사용자가 바탕화면 아이콘이나 시작 메뉴를 눌러 창을 열면 `openWindow(id)`가 실행된다. 이 함수는 먼저 `windowCompatibilityPolicy`를 통해 같이 열리면 안 되는 창이 있는지 확인한다. 예를 들어 Pixel TV와 퀘스트 실행 흐름 창은 동시에 보이지 않도록 정리된다. 그 다음 해당 창 id를 `openWindows`에 넣고, 최소화 목록에서 제거하고, `focusedWindow`를 그 창으로 바꾼다.

React는 state가 바뀌면 다시 렌더링한다. `src/App.tsx`에서는 `isWindowVisible("journal")` 같은 조건으로 각 창을 렌더링한다. 이 조건은 `openWindows`에는 있고 `minimizedWindows`에는 없는 창만 true가 된다. true가 되면 `XpWindow` 컴포넌트가 렌더링되고, 그 안에 `QuestWindow`, `ManagerWindow`, `JournalWindow` 같은 실제 창 내용이 들어간다.

창을 드래그하면 `XpWindow()` 내부에서 pointer 위치를 계산하고 `onMove()`를 호출한다. `onMove()`는 다시 `useWindowManager()`의 `moveWindow(id, position)`으로 연결되어 `windowPositions[id]`를 갱신한다. 즉 창 이동은 DOM을 직접 옮기는 것이 아니라, React state의 좌표가 바뀌고 그 좌표가 style의 `left`, `top`으로 다시 들어가면서 화면에 반영된다.

창을 resize할 때도 비슷하다. `XpWindow()`는 `resizeAxis` 값을 보고 크기를 바꿀 수 있는 방향을 제한한다. 사다리 창은 `vertical`이라 높이만 조절되고, 평지 창은 `horizontal`이라 너비만 조절된다. 변경된 크기는 `windowSizes[id]`에 저장되고, 다음 렌더링 때 창 크기와 interaction rect 계산에 다시 사용된다.

확인할 코드:

- `src/data/windowRegistry.ts`
- `src/hooks/useWindowManager.ts`
- `src/domain/windowCompatibilityPolicy.ts`
- `src/App.tsx`의 `isWindowVisible(...)` 렌더링 구간
- `src/App.tsx`의 `XpWindow()`

## 2. 사다리와 평지는 왜 그냥 이미지가 아닌가

사다리와 평지는 화면에 보이는 픽셀아트 창이면서, 동시에 Lumi가 상호작용할 수 있는 충돌 영역이다. 그래서 두 단계로 나뉜다.

첫 번째는 UI 창이다. `ladderObject`와 `platformObject`는 일반 XP 창처럼 `XpWindow`로 렌더링된다. 안쪽에는 `LadderObjectWindow`와 `PlatformObjectWindow`가 들어가고, 이 컴포넌트들이 `assetManifest`에 등록된 사다리/평지 PNG를 보여준다.

두 번째는 상호작용용 rect다. Lumi의 state machine은 이미지 자체를 보지 않는다. 대신 `createInteractionObjectsFromWindows()`가 현재 사다리 창과 평지 창의 위치/크기를 읽어서 `InteractionObject` 배열을 만든다. 예를 들어 사다리 창이 열려 있으면 `ladder-1`이라는 object가 만들어지고, 그 object에는 `{ x, y, width, height }` rect가 들어간다.

사다리 rect는 창 전체 크기와 완전히 같지 않다. 창 안에서 실제 사다리 이미지가 놓인 부분만 상호작용 영역이 되어야 하므로, 창 위치에서 약간의 offset을 더하고 높이도 titlebar나 여백을 뺀 값으로 계산한다. 평지도 마찬가지로 창 전체가 아니라 발판의 위쪽 선에 가까운 얇은 rect를 만든다.

이렇게 한 이유는 UI와 행동 계산을 분리하기 위해서다. 나중에 사다리 이미지를 바꿔도 `InteractionObject` rect 규칙만 맞으면 Lumi의 climbing 로직은 그대로 쓸 수 있다.

확인할 코드:

- `src/App.tsx`의 `LadderObjectWindow()`
- `src/App.tsx`의 `PlatformObjectWindow()`
- `src/App.tsx`의 `createInteractionObjectsFromWindows()`
- `src/domain/interactionObjects.ts`
- `src/data/assetManifest.ts`의 `interactionObjectAssets`

## 3. Lumi가 사다리를 타는 흐름

Lumi가 창 밖으로 나가면 `outsidePet` state가 사용된다. 이 state는 `phase`, `position`, `direction`, `animation`, `behavior`, `attachedObjectId`, `climbProgress` 같은 값을 가진다.

사다리 근처에 오면 state machine은 후보 행동 중 `climbing`을 고를 수 있다. 그때 `startOutsidePetBehavior()`가 실행되고, 가까운 사다리를 찾아서 `attachedObjectId`에 사다리 id를 저장한다. 동시에 `climbProgress`를 초기값으로 두고, `resolveOutsidePetAttachmentPosition()`으로 사다리 위의 현재 위치를 계산한다.

여기서 중요한 점은 Lumi가 한 번 사다리에 붙으면 매 tick마다 그냥 좌표를 임의로 움직이지 않는다는 것이다. `climbProgress`라는 0에서 1 사이의 비율을 기준으로 사다리 높이에서 어느 위치에 있는지 계산한다. `getClimbPosition(ladderRect, progress)`는 사다리 rect의 위/아래 길이에 progress를 곱해서 실제 좌표를 만든다.

사다리를 타는 loop는 `climb_ladder -> hold_ladder -> descend_ladder -> idle` 순서다. 올라갈 때는 `climbProgress`가 0.2씩 증가하고, 꼭대기에 도착하면 잠깐 잡고 있다가, 내려올 때는 다시 0.2씩 감소한다. progress가 0 이하가 되면 사다리에서 떨어져 일반 `idle` 상태로 돌아간다.

사다리 창을 드래그하거나 높이를 바꿔도 Lumi가 따라갈 수 있는 이유도 여기에 있다. `outsidePet` 원본 state에는 `attachedObjectId`와 `climbProgress`만 남아 있고, 실제 렌더 좌표는 현재 사다리 rect를 기준으로 다시 계산한다. 그래서 사다리 창 위치가 바뀌면 다음 렌더링에서 같은 progress라도 새 사다리 위치에 맞는 좌표가 나온다.

확인할 코드:

- `src/domain/outsidePetRuntime.ts`의 `startOutsidePetBehavior()`
- `src/domain/outsidePetRuntime.ts`의 `advanceClimbBehavior()`
- `src/domain/outsidePetRuntime.ts`의 `resolveOutsidePetAttachmentPosition()`
- `src/domain/interactionObjects.ts`의 `getClimbPosition()`
- `src/hooks/useOutsidePetRuntime.ts`

## 4. Lumi가 평지에 점프하고 내려오는 흐름

평지는 사다리와 다르게 progress로 올라가는 구조가 아니다. 점프 행동은 짧은 상태 전이로 처리한다.

Lumi가 평지 근처에 있고 `jump` animation이 선택되면 `startOutsidePetBehavior()`가 가까운 platform object를 찾는다. 찾으면 `platformId`를 저장하고 behavior를 `jump_to_platform`으로 바꾼다.

그 다음 `advancePlatformBehavior()`가 tick마다 상태를 진행한다. 처음에는 `jump_to_platform` 상태로 platform 위보다 조금 높은 y좌표를 준다. 다음 tick에서는 `land_on_platform`으로 바뀌고, platform 위에 서 있는 위치인 `resolvePlatformStandPosition()`으로 이동한다. 그 뒤 `idle_on_platform`에서 잠깐 머문 뒤 `jump_down`으로 바뀌고, 마지막에는 다시 field 영역의 y좌표로 내려와 `idle`이 된다.

평지 창을 드래그했을 때 Lumi가 따라가야 하는 이유는 `platformId` 때문이다. 현재 behavior가 `jump_to_platform`, `land_on_platform`, `idle_on_platform`, `jump_down` 중 하나이고 `platformId`가 있으면, `resolveRenderedOutsidePet()`가 현재 platform rect를 다시 찾아서 렌더 위치를 계산한다. 즉 평지가 움직이면 platform rect도 바뀌고, Lumi의 렌더 좌표도 그 rect에 맞춰 다시 계산된다.

만약 Lumi가 공중에 멈춘 것처럼 보이면 먼저 `behavior`가 `jump_down`에서 `idle`로 돌아왔는지, `platformId`가 해제됐는지, 그리고 `openWindows`에서 platform window가 닫혀 object가 사라졌는지 확인해야 한다.

확인할 코드:

- `src/domain/outsidePetRuntime.ts`의 `advancePlatformBehavior()`
- `src/domain/outsidePetRuntime.ts`의 `resolvePlatformBehaviorRenderPosition()`
- `src/domain/outsidePetRuntime.ts`의 `resolveRenderedOutsidePet()`
- `src/domain/petBehaviorStateMachine.ts`

## 5. Lumi의 자유 이동은 매 프레임이 아니라 tick으로 움직인다

일반적인 게임 엔진은 매 프레임 `requestAnimationFrame`에서 위치를 갱신하는 경우가 많다. 하지만 현재 프로젝트의 outside pet roaming은 더 단순하게 `setInterval` 기반 tick으로 움직인다.

`useOutsidePetRuntime()`은 `outsidePet.phase`가 `free_roam`일 때 일정 시간마다 현재 상태를 읽고 다음 상태를 계산한다. 현재 tick 간격은 `outsidePetFreeRoamTickMs`로 정의되어 있고, 이 값은 `src/domain/outsidePetRuntime.ts`에 있다.

tick이 돌 때마다 먼저 특수 행동을 확인한다. 사다리를 타는 중이거나, 평지에 점프하는 중이면 `advanceOutsidePetBehavior()`를 호출해 해당 loop를 먼저 진행한다. 이 경우에는 wandering처럼 새 행동을 뽑지 않고, 이미 시작한 climbing/platform loop를 끝까지 진행하는 쪽이 우선된다.

특수 행동이 아니면 다음 animation 후보를 고른다. 이때 `getNextOutsidePetRoamAnimation()`이 호출되고, 내부에서 `resolveManagerBehavior()`가 현재 manager mood, 최근 퀘스트 결과, 근처 interaction object, LLM behavior intent bias를 고려해 행동 후보를 고른다. 최종 behavior는 `mapBehaviorToAnimation()`을 통해 `walk`, `run`, `jump`, `climbing`, `idle` 같은 실제 animation state로 바뀐다.

위치 이동은 animation speed에 따라 달라진다. `resolveOutsidePetAnimationSpeed()`에서 `run`은 더 빠른 값, `walk`는 더 느린 값, `jump`는 더 큰 값을 반환한다. `idle`, `happy`, `hiding`처럼 움직이지 않아야 하는 animation은 speed가 0이다.

확인할 코드:

- `src/hooks/useOutsidePetRuntime.ts`
- `src/domain/outsidePetRuntime.ts`의 `resolveOutsidePetAnimationSpeed()`
- `src/domain/outsidePetRuntime.ts`의 `resolveOutsidePetHorizontalMove()`
- `src/App.tsx`의 `getNextOutsidePetRoamAnimation()`
- `src/domain/managerBehaviorAdapter.ts`
- `src/domain/petBehaviorStateMachine.ts`

## 6. LLM은 무엇을 받고 무엇을 주는가

현재 React는 OpenAI 같은 LLM provider를 직접 호출하지 않는다. React는 항상 `src/layers/storage/managerLlmApi.ts`의 adapter를 통해 `/api/manager/*` 서버 route로 요청을 보낸다. 서버는 Hono route에서 요청 JSON을 읽고, contract parser로 검증한 뒤, LLM provider 또는 rule fallback을 실행한다.

React가 LLM 요청을 만들 때는 `createManagerLlmRequest()`를 사용한다. 이 request에는 크게 다섯 가지가 들어간다.

첫째, `managerContext`다. 여기에는 현재 mood, 최근 이벤트 개수, 마지막 퀘스트 결과, memory summary, reward hints가 들어간다. LLM이 지금 매니저가 어떤 상황인지 알기 위한 짧은 컨텍스트다.

둘째, `profile`이다. 사용자 닉네임, 목표, 카테고리, 하루 사용 가능 시간, 선호 퀘스트 크기, 매니저 말투가 들어간다. 목표 쪼개기나 퀘스트 추천에 가장 직접적으로 쓰인다.

셋째, `persona`다. 선택한 전자 매니저의 pet id와 말투/행동 성향이 들어간다. 같은 상황이라도 차분한 매니저와 장난스러운 매니저가 다른 문구를 말하게 만들기 위한 정보다.

넷째, `questState`다. 현재 퀘스트가 draft인지 active인지, 실패 상태인지, 복구 상태인지와 현재 quest, 이전 quest title, 실패 이유가 들어간다.

다섯째, `recentEvents`다. 최근 기록 노트에 쌓인 quest event 일부를 잘라서 보낸다. LLM이 사용자의 최근 흐름을 보고 문구, 보상, 리밸런싱을 판단할 수 있게 한다.

서버가 돌려주는 값은 요청한 route마다 다르다. `/api/manager/quest-suggestion`은 새 quest draft를 돌려주고, `/api/manager/quest-acceptance-preview`는 수락 전 난이도/EXP/능력치 보상 미리보기를 돌려준다. `/api/manager/stat-evaluation`은 퀘스트 결과에 따른 능력치 증가량을 돌려주고, `/api/manager/behavior-intent`는 매니저의 행동 성향과 행동 bias를 돌려준다.

중요한 점은 LLM 출력이 그대로 앱에 들어오지 않는다는 것이다. `server/contracts/managerLlm.ts`에서 출력 구조와 값 범위를 검사한다. 예를 들어 rewardExp는 난이도별 범위에 들어와야 하고, behavior intent의 state는 허용된 목록 안에 있어야 하며, weightDelta는 `-2..2` 범위로 clamp된다. 잘못된 출력이면 앱이 깨지는 대신 rule fallback을 사용한다.

확인할 코드:

- `src/App.tsx`의 `createManagerLlmRequest()`
- `src/layers/storage/managerLlmApi.ts`
- `server/routes/managerLlm.ts`
- `server/contracts/managerLlm.ts`
- `server/lib/managerLlmProvider.ts`
- `server/lib/managerLlmFallback.ts`

## 7. Pixel TV는 어떻게 픽셀화하는가

Pixel TV는 카메라 화면을 그대로 보여주는 기능이 아니라, 들어온 영상을 작은 canvas로 줄였다가 다시 크게 그려서 픽셀처럼 보이게 하는 기능이다.

`PixelTvWindow()`가 열리면 먼저 `navigator.mediaDevices.getUserMedia()`로 카메라 stream을 요청한다. 권한이 허용되면 video element에 stream이 연결되고, `requestAnimationFrame` loop에서 현재 video frame을 canvas에 그린다.

픽셀화는 `renderPixelizedSource()`에서 일어난다. 이 함수는 두 개의 canvas를 쓴다. 하나는 아주 작은 `sampleCanvas`이고, 다른 하나는 화면에 보이는 `previewCanvas`다. 먼저 원본 video frame을 sample canvas에 작게 그린다. 그 다음 `getImageData()`로 픽셀 배열을 꺼내고, `transformPixelTvSamplePixels()`에서 밝기와 edge를 계산해 흑백에 가까운 따뜻한 픽셀 톤으로 바꾼다.

그 뒤 sample canvas를 preview canvas에 크게 확대해서 그린다. 이때 `imageSmoothingEnabled`를 false로 두면 브라우저가 픽셀을 부드럽게 보간하지 않는다. 그래서 작은 픽셀 블록이 그대로 커져서 픽셀화된 TV 화면처럼 보인다.

사진 촬영은 별도 canvas에서 합성한다. `createPixelTvPhotoCapture()`는 TV 프레임, 현재 Pixel TV canvas, 매니저 sprite, caption을 하나의 canvas에 그린 뒤 PNG로 다운로드한다.

projection mode는 원리가 조금 다르다. TV 아이콘을 우클릭해 속성에서 projection 연결을 켜면 Pixel TV 아이콘이 projection-connected 상태로 바뀐다. 연결된 TV 아이콘을 실행하면 URL에 `?projection=pepper`가 붙고, 검은 배경 위 밝은 Lumi를 띄우는 projection 화면으로 이동한다. 이 화면은 태블릿과 45도 투명판을 쓰는 단일면 Pepper projection 세팅을 염두에 둔 것이다.

확인할 코드:

- `src/App.tsx`의 `PixelTvWindow()`
- `src/App.tsx`의 `renderPixelizedSource()`
- `src/App.tsx`의 `createPixelTvPhotoCapture()`
- `src/App.tsx`의 `launchProjectionMode()`
- `src/domain/pixelizer.ts`
- `src/domain/pixelTvMode.ts`
- `src/data/assetManifest.ts`의 `projectionModeAssets`

## 8. 기록과 보상 데이터는 어떻게 흐르는가

퀘스트 완료, 실패, 복구는 모두 quest event로 저장된다. 사용자가 완료 버튼을 누르면 `useQuestFlow()`와 `App.tsx`의 handler가 현재 quest와 manager state를 바탕으로 `createQuestEventRequest()`를 만든다.

이 request에는 quest title, type, amount, difficulty, result, expDelta, failureReason, managerLine, metadata가 들어간다. metadata에는 능력치 증가량, reward 후보, stage unlock 정보, sound hint 같은 확장 데이터가 붙는다.

저장 직전에는 `enrichQuestEventWithLlmStatEvaluation()`이 한 번 더 실행될 수 있다. 수락 전 preview에서 이미 statEvaluation을 받은 경우에는 그 값을 쓰고, 그렇지 않으면 `/api/manager/stat-evaluation`으로 서버에 요청해 능력치 증가량을 받아온다. 실패하면 기존 request를 유지해서 앱 flow가 끊기지 않게 한다.

그 다음 `saveQuestEvent()`가 `/api/quest-events`로 저장 요청을 보낸다. 서버는 저장된 log와 managerContext를 응답한다. React는 이 응답으로 기록 노트 목록을 갱신하고, manager mood나 line도 갱신한다. 그래서 “화면에서 요청을 보내면 서버가 처리하고, 응답을 받아 화면이 바뀐다”는 수직슬라이스가 여기서 만들어진다.

확인할 코드:

- `src/App.tsx`의 `createQuestEventRequest()`
- `src/App.tsx`의 `enrichQuestEventWithLlmStatEvaluation()`
- `src/App.tsx`의 `saveQuestEvent()`
- `src/layers/storage/questLogApi.ts`
- `server/routes/questEvents.ts`
- `server/contracts/questEvents.ts`
- `server/lib/questEventStore.ts`

## 9. 다시 시작, 새로고침, 최소화는 서로 다르다

새로고침은 브라우저를 다시 렌더링하는 일이다. localStorage에 저장된 profile, manager, Pixel TV mode 같은 값은 다시 읽을 수 있고, 서버에 저장된 quest event도 다시 조회할 수 있다. 하지만 React 메모리에만 있던 임시 state는 초기화된다.

다시 시작은 서비스 flow를 처음부터 다시 시작하기 위한 명시적 동작이다. `getRestartServiceTarget()`은 screen을 wizard로 돌리고 기본 open window 목록을 반환한다. `App.tsx`의 restart handler는 profile, manager level/exp, quest 상태, local logs, 창 위치/크기/측정값, Pixel TV mode, outside pet, blink 상태 등을 초기화하는 방향으로 동작한다. 다만 서버 DB에 이미 저장된 quest event를 지우는 계정 삭제 기능은 아니다.

최소화는 닫기와 다르다. 최소화된 창은 `openWindows`에는 남아 있지만 `minimizedWindows`에 들어가기 때문에 화면에서만 숨겨진다. taskbar 버튼을 누르면 다시 보인다. 기록 노트는 최소화해도 `openWindows`에는 남아 있으므로, 현재 정책상 Lumi의 outside roaming이 계속 유지될 수 있다.

확인할 코드:

- `src/domain/appLifecyclePolicy.ts`
- `src/hooks/useWindowManager.ts`
- `src/App.tsx`의 restart 관련 handler
- `src/hooks/useQuestLogSync.ts`

## 10. 디버깅할 때 보는 순서

창이 이상하면 먼저 `windowRegistry.ts`에서 id와 초기 위치를 확인하고, 그 다음 `useWindowManager()`의 `openWindows`, `minimizedWindows`, `focusedWindow`, `windowPositions`를 본다.

사다리/평지 상호작용이 이상하면 `createInteractionObjectsFromWindows()`가 만든 rect가 실제 화면 위치와 맞는지 먼저 확인한다. 그 다음 `outsidePet.attachedObjectId`, `outsidePet.platformId`, `outsidePet.behavior`, `outsidePet.animation`을 본다.

Lumi의 방향이 이상하면 `outsidePet.direction`과 `shouldMirrorOutsidePet()`를 확인한다. 현재 sprite sheet가 오른쪽 방향 기준인지, mirrorX가 왼쪽 이동 때만 적용되는지도 같이 확인해야 한다.

LLM 결과가 이상하면 브라우저 Network에서 `/api/manager/*` payload와 response를 확인한다. 서버에서는 `parseManagerLlmRequest()`와 `resolveManagerLlmOutput()`가 fallback으로 바꿨는지 본다.

Pixel TV가 이상하면 카메라 권한, video source size, `canPixelizeSource()`, `createPixelizerPlanForStream()`, `renderPixelizedSource()` 순서로 확인한다.

## 설명 연습 질문

- 창 하나가 열릴 때 `windowRegistry`, `useWindowManager`, `XpWindow`, `App.tsx`가 각각 어떤 역할을 하는지 말로 설명해보기.
- 사다리 창을 드래그했을 때 Lumi가 따라가는 이유를 `attachedObjectId`와 `climbProgress` 중심으로 설명해보기.
- 평지 위에서 Lumi가 공중에 멈춘다면 어떤 state 값을 먼저 확인할지 설명해보기.
- LLM이 퀘스트 예상 보상을 계산할 때 React가 어떤 정보를 보내고 서버가 어떤 검증을 하는지 설명해보기.
- Pixel TV가 매 프레임 어떤 canvas 과정을 거쳐 픽셀 화면을 만드는지 설명해보기.
