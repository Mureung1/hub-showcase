# C-Dict 프로젝트 컨텍스트

CS 실습생을 위한 Unix/Git 명령어 사전 웹앱. 기획/화면 흐름은 `docs/plan.md`, 완료 이력은 `docs/checklist.md`, 지금 뭘 해야 하는지(백로그/우선순위/로드맵)는 `docs/tasks.md` 참고.

## 기술 스택

| 영역 | 스택 | 상태 |
|---|---|---|
| FE | React 19 + Vite, react-router-dom | 적용됨 (`src/`) |
| BE | Node.js + Express | 신규 (`server/`, 뼈대만 구성됨) |
| DB | Supabase (Postgres) | 적용됨 (`categories`/`commands`/`scenarios` 테이블) |
| 검색엔진 | Meilisearch (Cloud) | 적용됨 (`server/src/routes/search.js`, `server/src/config/meilisearch.js`) |
| 배포 | FE: Vercel/Netlify, BE: Render/Railway | 예정 |

## 디렉토리 구조

```
src/            # FE (React+Vite), 기존 그대로
server/         # BE (Express), 별도 package.json — FE와 독립적으로 배포
  src/
    index.js       # Express 앱 진입점, 공통 에러 핸들러 포함
    routes/        # API 라우트 (commandsRouter.js, scenariosRouter.js, search.js. chat.js — AI 챗봇, 아직 미정)
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
- **포트**: FE `5173`(Vite 기본, 사용 중이면 5174로 자동 이동 — `CORS_ORIGIN`이 콤마로 여러 origin을 허용하도록 구성되어 있음), BE `4000`.
- **환경변수**: `server/.env.example` 참고. `PORT`, `CORS_ORIGIN`(콤마로 다중 origin), `SUPABASE_URL`, `SUPABASE_KEY`(service_role, RLS 우회 — 서버 전용), `MEILISEARCH_HOST`/`MEILISEARCH_ADMIN_KEY`/`MEILISEARCH_SEARCH_KEY`, `LLM_API_KEY`(AI 챗봇 API 미정으로 값 비워둠), `ANTHROPIC_API_KEY`(구조화된 출력 authoring 스크립트용, `server/src/scripts/generateScenarios.js`).
- FE 개발 시 `npm run dev` (루트), BE 개발 시 `cd server && npm install && npm run dev`.

## 디자인

새 화면을 만들거나 수정할 때는 `docs/design-system/DESIGN.md` 규칙을 따르고, `.claude/skills/design-check` Skill로 검증한다.

## 향후 아이디어 (방향 확정, 세부 미정)

- **셸 연동 CLI `kman` (브라우저 오픈형)** — 유닉스 터미널(가상머신/SSH 등)에 패키지로 설치해두고 `kman <command>` 입력 시 배포된 상세 페이지 URL을 브라우저로 열어줌 (`gh repo view --web`류의 흔한 CLI 패턴). 명령어 이름으로 URL을 계산만 하면 되므로 데이터 복제/조회 API가 불필요 — 터미널에 직접 렌더링하는 방식은 그 부담 때문에 기각. 직접 URL 접속을 대체하지 않고 그 위에 얹는 편의 계층. 이름을 `kman`으로 정해 진짜 `man`은 전혀 건드리지 않으면서 "man의 한국어/웹 버전"이라는 연상만 줌(`man` 자체를 오버라이드하는 안은 파이프 활용이 깨지는 리스크로 기각). `--man` 플래그로 진짜 `man` 실행도 지원 예정. 사용자가 그냥 `man ls`를 직접 치는 경우는 여전히 못 잡는 갭이 남아있음(MANPAGER 훅으로 안내 문구를 덧붙이는 안 검토 중, 미결정). 설치 방식(curl\|bash vs npm, 진짜 apt 패키지는 인프라 부담 커서 기각)은 대상 환경의 Node 설치 여부에 따라 결정 예정. FE 배포가 선행되어야 함. (심화 버전, 로그인 이후 확장 후보) 로그인/북마크 시스템이 생기면 `kman`으로 내 북마크 목록을 셸에 내보내는 기능도 검토 — 이건 사용자별 실제 데이터라 URL 계산만으로는 안 되고 로그인+조회 API+CLI 인증(`kman login`류)이 필요해서 기본 kman보다 스코프가 큼. 상세는 `docs/tasks.md`/`docs/checklist.md` 참고.
