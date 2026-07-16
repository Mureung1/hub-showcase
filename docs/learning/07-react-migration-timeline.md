# React Migration Timeline

## Keywords

- React migration
- HTML reference
- visual parity
- flow parity
- state transition
- component split
- mock storage
- Quest Event
- Hono API
- FE-BE-DB vertical slice
- verifier report

## Why It Matters

React 전환 이후의 작업 순서를 알면 HTML 기준안, React state, mock data, Hono API, Supabase DB 연결이 어떤 순서로 안정화됐는지 설명할 수 있다.

## Reference Code Paths

- public/prototype-static.html
- src/App.tsx
- src/styles.css
- src/data/questLogs.ts
- src/layers/storage/questLogRepository.ts
- src/layers/storage/questLogApi.ts
- server/app.ts
- server/contracts/questEvents.ts
- server/routes/questEvents.ts
- server/lib/questEventStore.ts
- server/lib/supabase.ts
- vite.config.ts
- docs/mvp-functional-spec.md
- docs/user-flow-wireframes.md
- docs/api-contracts.md
- docs/db-schema.md

## Parts To Check

- HTML 기준안: `prototype-static.html`은 visual/flow reference이고 수정하지 않는다.
- UI parity: XP window, taskbar, start menu, icons, QuestRunner `[RUN]`, manager dialogue panel.
- Flow parity: `QuestStatus`, `openWindows`, `replaceWorkflowWindows`, 기록 노트 자동 열림 금지.
- Component split: `App.tsx` 내부 함수 컴포넌트가 먼저 정리됐고, 파일 단위 분리는 다음 단계다.
- Mock 기록: `QuestLog`, `createQuestLogRepository`, localStorage fallback.
- API 계약: `POST /api/quest-events`, `GET /api/quest-events`, `GET /api/manager-context`, common error response.
- DB 설계: `quest_logs`, `event_type`, `result`, `exp_delta`, `failure_reason`, `visibility`, `metadata`.
- FE-BE 연결: `questLogApi.ts`, Hono route, memory store, Supabase store fallback.
- 검증: `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, `npm.cmd run build`, HTTP smoke test.

## Timeline

- HTML 기준안과 React 화면을 감사해 P0/P1/P2 visual 차이를 나눴다.
- P0부터 visual parity를 맞추고, 정적인 아이콘/배지는 SVG asset을 우선 사용하기로 결정했다.
- Flow/state를 HTML 기준으로 맞춰 완료 후 기록 노트 자동 열림과 실행 중 회귀 문제를 제거했다.
- Quest, Runner, Manager, Journal 성격의 React mock UI와 상태 흐름을 정리했다.
- 완료/실패/복구 이벤트가 mock 기록과 manager state를 갱신하도록 연결했다.
- API contract와 `quest_logs` schema를 Quest Event 구조로 문서화했다.
- Hono app, Quest Event route, memory store, Supabase REST store, Vite API middleware를 추가했다.
- React에서 `POST /api/quest-events`, `GET /api/quest-events`, `GET /api/manager-context`를 호출하게 연결했다.
- 2주차 발표 자료를 만들고, 핵심 작업 1 슬라이드는 state/handler/props 중심으로 정정했다.

## ChatGPT Questions

- React migration 과정을 visual parity, flow parity, data flow 단계로 나눠 설명해줘.
- 이 프로젝트에서 `QuestStatus`와 `openWindows`가 화면 흐름을 어떻게 제어하는지 설명해줘.
- browser mock, server memory store, Supabase persistence의 차이를 이 코드 기준으로 설명해줘.
- `quest_logs` schema가 주간 리포트, manager memory, 공개 퀘스트 확장을 어떻게 준비하는지 설명해줘.
