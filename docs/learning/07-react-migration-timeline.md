# React Migration Timeline

## Keywords

- React migration
- HTML reference
- visual parity
- flow parity
- state transition
- component split
- mock flow
- Quest Event
- Hono API
- Supabase vertical slice
- manager persona
- runtime interaction
- asset manifest
- verifier report

## Why It Matters

정적 HTML은 시각 기준안이고 React 앱은 실제 서비스 구현 대상이다. React 전환 이후에는 visual parity, flow/state parity, API 연결, asset runtime, manager behavior 순서로 구현 범위가 넓어졌다.

## Reference Code Paths

- `public/prototype-static.html`
- `src/App.tsx`
- `src/styles.css`
- `src/data/questLogs.ts`
- `src/data/assetManifest.ts`
- `src/data/windowPetPlacements.ts`
- `src/layers/storage/questLogRepository.ts`
- `src/layers/storage/questLogApi.ts`
- `src/domain/managerPersonaPolicy.ts`
- `src/domain/managerBehaviorAdapter.ts`
- `src/domain/petBehaviorStateMachine.ts`
- `server/routes/questEvents.ts`
- `server/lib/questEventStore.ts`
- `server/lib/supabase.ts`
- `docs/runtime-flow-report.md`
- `docs/architecture-data-flow.md`

## Parts To Check

- HTML 기준안은 수정하지 않고 React에서 화면과 flow를 맞춘다.
- 초기 진입은 manager select -> profile wizard -> manager-created -> desktop으로 이어진다.
- `QuestStatus`와 `openWindows`가 오늘의 퀘스트, runner, 실패, 복구, 기록 노트 flow를 제어한다.
- `POST /api/quest-events`, `GET /api/quest-events`, `GET /api/manager-context`가 기록 노트와 manager context를 갱신한다.
- `ManagerPersonaPolicy`는 말투와 대사, `ManagerBehaviorAdapter`는 행동 intent와 animation mapping을 맡는다.
- `assetManifest`와 `CanvasSpriteAnimator`가 캐릭터/아이콘/interaction object asset을 runtime에 연결한다.
- 시작 메뉴 재시작은 local onboarding reset이고 Supabase 기록 삭제가 아니다.

## Timeline

- HTML 기준안과 React 화면의 P0/P1/P2 visual 차이를 감사했다.
- P0 visual parity 이후 static SVG/PNG asset을 React runtime에서 쓰도록 정리했다.
- flow/state를 기준안에 맞춰 기록 노트 자동 열림, 완료 후 running 회귀, 실패/복구 flow를 수정했다.
- App 중심 UI를 window, quest, manager, journal 성격의 컴포넌트/함수로 분리해 이해하기 쉽게 만들었다.
- 완료/실패/복구 이벤트를 Quest Event metadata로 저장하고 Hono API와 Supabase store에 연결했다.
- TDD로 stat growth, reward progression, stage appearance, behavior state machine, LLM intent boundary를 추가했다.
- manager 선택, settings window, sound toggle, stage 선택, taskbar minimize, outside roaming, ladder/platform interaction을 이어 붙였다.

## ChatGPT Questions

- React migration을 visual parity, flow parity, data flow, runtime interaction 단계로 나눠 설명해줘.
- 이 프로젝트에서 `QuestStatus`, `openWindows`, `outsidePet`이 각각 어떤 화면 흐름을 제어하는지 설명해줘.
- browser mock, server memory store, Supabase persistence 차이를 코드 경로와 함께 설명해줘.
- HTML 기준안을 유지하면서 React 구현을 확장하는 방식의 장단점을 설명해줘.
