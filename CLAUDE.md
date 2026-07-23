# Newssist — 프로젝트 컨텍스트

여러 매체의 뉴스를 키워드로 모아 AI가 해설하고, 읽은 기사를 클러스터링해 개인화된 "시사 흐름"을 설명해주는 서비스. 타겟은 취준생/직장인. 1인 개발, 1개월 완성, 바이브코딩(AI 보조 개발) 중심, 예산 3만원 제약.

이번 개발 기간(~7/31 데모)은 **웹만** 대상으로 함. 이후 PWA로 앱화할 계획이 있으나 이번 기간에는 개발하지 않음 — 이 제약 때문에 외부 API(네이버 등) 연동은 서버 경유 구조를 유지하고, 클라이언트가 직접 API를 호출하는 방식은 쓰지 않음(PWA 전환 시에도 그대로 재사용 가능하도록).

기능 우선순위·유저 시나리오·기술스택 선택 이유 같은 배경은 GitHub Wiki `기획서.md`(`hub.wiki` 저장소)에 있음. 디자인 토큰·컴포넌트 레시피는 `.claude/skills/newssist-design/SKILL.md`. 이 문서는 그 둘을 실제 개발할 때 바로 참조할 수 있게 요약 + 코딩 컨벤션을 더한 것.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프론트엔드 | React(CRA) + react-router + Tailwind + Context/useReducer |
| 백엔드 | **Node.js + Express** (챌린지 커리큘럼 필수 스택) |
| DB/Auth | Supabase(Postgres) + pgvector, Auth는 이메일/비밀번호만(소셜 로그인 없음) |
| 배포 | Vercel 하나로 통합 — 프론트 정적 빌드 + Express를 서버리스 함수로 배포 (Render 아님, 슬립 이슈 회피) |
| 뉴스 수집 | 네이버 뉴스 검색 API (+ NewsAPI 보조) |
| AI | GPT-4o-mini (요약/용어해설/클러스터 설명), text-embedding-3-small (임베딩) |
| 클러스터링 | JS/TS K-Means(예: `ml-kmeans`), GitHub Actions에서 Node.js 스크립트로 1일 1회 직접 실행 (API 서버 경유 없음) |

## 디렉토리 구조

```
hub/
  newssist/                 # React 프론트엔드 (CRA)
    src/
      api/                  # 백엔드 호출 함수 (엔드포인트별 fetch 래퍼)
      components/           # 공용 UI 컴포넌트 (Card, Badge, GradientGlow, Sparkline ...)
      layouts/               # 사이드바+헤더 레이아웃
      pages/                 # Home, Article, Trend, Insight, MyPage, Settings
      context/               # KeywordsContext, ReadHistoryContext (Context+useReducer)
      hooks/                 # 커스텀 훅 (useArticles, useSummary ...)
      styles/                # 전역 CSS, Tailwind 관련
      utils/                 # 순수 함수 (포맷터 등)
    tailwind.config.js

  server/                    # Express 백엔드
    index.js                 # Express 앱 엔트리 (Vercel 서버리스 핸들러로 export)
    routes/                  # keywords.js, articles.js, bookmarks.js, trend.js, insights.js, reports.js
    services/                 # 외부 API 클라이언트 (naver, openai, supabase)
    middleware/                # auth, rateLimit, errorHandler
    scripts/
      cluster.js               # GitHub Actions가 직접 실행하는 배치 스크립트 (Express 앱과 무관, 독립 실행)
    vercel.json

  .claude/skills/newssist-design/SKILL.md   # 디자인 시스템
```

## 주요 라이브러리

- 프론트: `react-router-dom`, `tailwindcss`(+`postcss`, `autoprefixer`), `@supabase/supabase-js`(클라이언트 인증용)
- 백엔드: `express`, `cors`, `dotenv`, `@supabase/supabase-js`(서비스 롤 키), `openai`(공식 SDK), `express-rate-limit`, `ml-kmeans`(`scripts/cluster.js` 전용)

## 컨벤션

**커밋 메시지**: Conventional Commits 접두사(`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`, `test:`) + 한글 설명. **바뀐 이유(reason) 단위로 커밋을 쪼갠다** — 같은 결정/작업이면 여러 파일을 고쳐도 커밋 1개, 이유가 다르면 시점이 붙어 있어도 커밋을 나눈다 (디자인 스킬 문서 유지보수 규칙과 동일 원칙).

**브랜치/PR**: `feature/기능명`, `fix/버그명`. PR은 기존 `.github/pull_request_template.md` 양식(주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못한 부분 / 새로 알게 된 것) 따름. **리뷰 받고 싶은 PR은 반드시 `review` 라벨을 걸 것** — 없으면 매일 22:00(KST) `auto-merge.yml`이 자동 병합함.

**코드 스타일**: CRA 기본 ESLint 설정 유지. 컴포넌트 파일은 PascalCase, 훅은 `useXxx`, API 함수는 동사+명사(`getArticles`, `createBookmark`).

**API 응답 형식**: 성공 시 데이터를 그대로, 실패 시 `{ "error": "snake_case_code" }`. 비용 발생하는 AI 호출 엔드포인트는 캐시 우선 확인 + `express-rate-limit`으로 사용자당 요청 한도를 둔다.

**환경 변수**: `.env.local`은 커밋 금지, 필요한 키 목록만 `.env.example`에 남긴다. `OPENAI_API_KEY`, `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`. OpenAI는 대시보드에 하드 사용한도(월 $15 내외) 설정 + auto-recharge 끄기 필수 (예산 3만원 제약).

**테스트**: 1개월 일정 + 바이브코딩 특성상 formal test suite는 생략. 기능 구현 후 수동 스모크 테스트로 검증.

**로컬 개발**: CRA의 `proxy` 설정으로 프론트(3000)에서 Express(예: 3001)로 요청을 프록시.

## API 명세서

`docs/api-spec.md`에 엔드포인트별 request/response 스키마를 정리해둠. **이 파일이 바뀔 때(엔드포인트 추가/변경)는 Claude가 먼저 사용자에게 알릴 것** — Notion에 별도로 일정만 정리해뒀고 API 명세서는 Notion에 없어서, 사용자가 수동으로 동기화하려면 변경 사실을 알아야 함.
