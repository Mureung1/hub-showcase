# React Migration Timeline

## Keywords

- React migration
- HTML reference
- visual parity
- flow parity
- state transition
- component split
- mock storage
- API contract
- FE-BE-DB vertical slice
- verifier report

## Why It Matters

React 전환 이후의 작업 순서를 알면 HTML 기준안, React state, mock data, API, DB 연결이 어떤 순서로 안정화됐는지 설명할 수 있다.

## Reference Code Paths

- public/prototype-static.html
- src/App.tsx
- src/styles.css
- src/data/questLogs.ts
- src/layers/storage/questLogRepository.ts
- src/layers/storage/questLogApi.ts
- server/contracts/questLogs.ts
- server/routes/questLogs.ts
- server/lib/supabase.ts
- vite.config.ts
- docs/mvp-functional-spec.md
- docs/user-flow-wireframes.md
- docs/api-contracts.md
- docs/db-schema.md

## Parts To Check

- HTML 기준안 감사: `prototype-static.html`은 visual/flow reference이고 수정하지 않는다.
- UI parity: XP window, taskbar, start menu, icons, QuestRunner `[RUN]`, manager dialogue panel.
- Flow parity: `QuestStatus`, `openWindows`, `replaceWorkflowWindows`, 기록 노트 자동 열림 금지.
- Component split: Wizard, Desktop, Window, Quest, Runner, Manager, Journal 성격의 분리.
- Mock 기록: `QuestLog`, `createQuestLog`, `prependQuestLog`, localStorage repository.
- API 계약: `POST /api/quest-logs`, `GET /api/quest-logs`, common error response.
- DB 설계: `quest_logs`, `result`, `exp_delta`, `failure_reason`, `visibility`, `metadata`.
- FE-BE 연결: `questLogApi.ts`, `saveQuestLog`, `fetchQuestLogsViaApi`, API failure notice.
- 검증: `npm.cmd run typecheck`, server tsconfig, secret scan, static HTML diff.

## Timeline

- HTML 기준안과 React 화면을 감사해 P0/P1/P2 차이를 나눴다.
- P0부터 visual parity를 맞추고, 정적 아이콘은 SVG asset으로 옮겼다.
- Flow/state를 HTML 기준으로 맞춰 완료 후 자동 기록 노트 열림과 실행 중 회귀를 제거했다.
- Quest, Runner, Manager, Journal 성격으로 React mock UI를 정리했다.
- 완료/실패/복구 이벤트가 mock 기록과 manager state를 갱신하도록 연결했다.
- API contract와 `quest_logs` schema를 문서화했다.
- 서버 contract, route, Supabase REST store, Vite API middleware를 추가했다.
- React에서 `POST /api/quest-logs`와 `GET /api/quest-logs`를 호출하게 연결했다.

## ChatGPT Questions

- React migration 과정을 visual parity, flow parity, data flow 단계로 나눠 설명해줘.
- 이 프로젝트에서 `QuestStatus`와 `openWindows`가 사용자 flow를 어떻게 제어하는지 설명해줘.
- mock localStorage 기록에서 server response 기반 기록으로 전환할 때 주의할 점은?
- `quest_logs` schema가 주간 리포트, manager memory, 공개 퀘스트 확장에 어떻게 대비하는지 설명해줘.
