# SUBZIP

구독 서비스 비용을 간편하게 정산하고, AI 기반 구독 만족도 리포트를 제공하여 의사결정을 돕는 웹 플랫폼

## Documents

- **[docs/plan.md](./docs/plan.md)**: 기획서 — 문제 정의, 핵심 타겟, 핵심 기능, 서브 기능, 사용자 시나리오
- **[docs/checklist.md](./docs/checklist.md)**: 개발 Task — 주차별 체크리스트. 새 기능 작업 전 해당 주차 항목의 체크 여부를 먼저 확인할 것.
- **[docs/design.md](./docs/design.md)**: 디자인 가이드 — 색상, 타이포, 컴포넌트 패턴의 단일 소스(design token 문서). UI 작업 시 반드시 이 기준을 따를 것 (`design` skill이 참조함).
- **[docs/api-spec.md](./docs/api-spec.md)**: API 명세서 — 도메인별 엔드포인트/요청/응답 형태의 단일 소스. 섹션마다 `[확정]`/`[초안]` 상태 마커가 있음. 신규 기능 구현 시(`feature-workflow` skill) 및 API/DB 설계 시(`api-db-designer` agent) 참조함.
- **[docs/architecture.md](./docs/architecture.md)**: 아키텍처 다이어그램 — 화면(FE) → 서버(BE) → DB 흐름을 Mermaid로 시각화. 실제 구현된 코드 기준(as-is)이며, 새 라우트/화면/테이블 추가 시 함께 갱신할 것.

## Commands

npm workspaces 모노레포. 루트에서 `npm install` 1회 실행 후:

- `npm run dev` — 프론트/백엔드 동시 실행 (concurrently, FE/BE 로그가 색으로 구분되어 출력됨)
- `npm run dev:frontend` / `npm run dev:backend` — 개별 실행 (frontend는 Vite dev server, backend는 nodemon)
- `npm run build` — 프론트엔드 빌드만 수행 (`npm run build -w frontend`)
- `npm run lint` — 워크스페이스 전체 lint (`--workspaces --if-present`, 현재 frontend에만 ESLint 설정 존재)

테스트 스크립트는 아직 없음 (frontend/backend package.json 모두 `test` 미정의).

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Express 4 + nodemon, ESM(`"type": "module"`)
- **패키지 관리**: npm workspaces 모노레포
- **타겟 플랫폼**: 모바일 우선 PWA (`docs/design.md` 참고)

## Structure

```
hub/
├── frontend/     React 19 + Vite
├── backend/      Express 4 + nodemon (ESM)
└── docs/         기획/디자인 산출물 (plan.md, checklist.md, design.md, api-spec.md)
```

- `frontend/src/`: `npm run dev` → 5173 포트(Vite 기본값)에서 서빙.
- `backend/src/index.js`: 엔트리 파일. `.env`의 `PORT`(기본 4000)로 리슨하며 `cors()` + `express.json()` 미들웨어 적용. API 라우트 추가 시 이 파일 기준으로 라우터 분리 권장.

## Convention

- **컴포넌트 파일**: PascalCase `.jsx` + 동일 이름의 `.css`로 스타일을 분리 (`ProjectInfo.jsx` + `ProjectInfo.css` 패턴).
- **UI/색상**: `docs/design.md` 기준을 따를 것.
