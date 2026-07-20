# C-Dict 프로젝트 컨텍스트

CS 실습생을 위한 Unix/Git 명령어 사전 웹앱. 기획/화면 흐름은 `docs/plan.md`, 완료 이력은 `docs/checklist.md`, 지금 뭘 해야 하는지(백로그/우선순위/로드맵)는 `docs/tasks.md` 참고.

## 기술 스택

| 영역 | 스택 | 상태 |
|---|---|---|
| FE | React 19 + Vite, react-router-dom | 적용됨 (`src/`) |
| BE | Node.js + Express | 신규 (`server/`, 뼈대만 구성됨) |
| DB | Supabase (Postgres) | Phase 2 예정 |
| 배포 | FE: Vercel/Netlify, BE: Render/Railway | 예정 |

## 디렉토리 구조

```
src/            # FE (React+Vite), 기존 그대로
server/         # BE (Express), 별도 package.json — FE와 독립적으로 배포
  src/
    index.js       # Express 앱 진입점, 공통 에러 핸들러 포함
    routes/        # API 라우트 (예: chat.js — AI 챗봇, 아직 미정)
    config/
      supabase.js   # Supabase 클라이언트 초기화
  .env.example    # 필요한 환경변수 목록 (실제 값은 server/.env, 커밋 안 함)
docs/
  plan.md, checklist.md
  prototype/          # 순수 HTML/CSS 프로토타입
  design-system/      # 최종 디자인 규칙(DESIGN.md) + 참고 페이지(style-guide.html)
.claude/skills/design-check/   # 화면 작업 시 디자인 규칙 검증용 Skill
```

## 컨벤션

- **커밋 메시지**: Conventional Commits 스타일 (`feat:`, `fix:`, `docs:`, `style:`, `refactor:` 등) — 기존 커밋 이력과 동일한 방식 유지.
- **네이밍**: React 컴포넌트는 PascalCase `.jsx` (기존 `CommandCard.jsx` 등과 동일), 그 외 파일/폴더는 kebab-case.
- **API 에러 응답 포맷**: 항상 `{ "error": { "message": "사용자 친화적 메시지" } }` 형태로 통일 (`server/src/index.js`의 공통 에러 핸들러 참고).

## 개발 환경

- **Node 버전**: `.nvmrc` 참고 (24, 실제 설치된 버전 기준).
- **포트**: FE `5173`(Vite 기본), BE `4000`.
- **환경변수**: `server/.env.example` 참고. `PORT`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LLM_API_KEY`(AI 챗봇 API 미정으로 값 비워둠).
- FE 개발 시 `npm run dev` (루트), BE 개발 시 `cd server && npm install && npm run dev`.

## 디자인

새 화면을 만들거나 수정할 때는 `docs/design-system/DESIGN.md` 규칙을 따르고, `.claude/skills/design-check` Skill로 검증한다.
