# CLAUDE.md

이 저장소에서 개발 작업을 할 때 참고 기준으로 삼는 문서다.

## 프로젝트 개요

**영문 뉴스 기반 해외 주식 모의 투자 학습 AI 에이전트 (Articles)**

초보자가 외신 원문을 번역기 없이 완독하고, 스스로 시장을 해석해 투자 판단
(Bullish/Neutral/Bearish)을 내린 뒤 AI의 해석과 비교해보는 웹 서비스.

> 기획은 두 번 전환됐다: (1) 2026-07-12 6화면→대시보드/리더뷰/마이페이지
> 3화면. (2) 2026-07-13~15 용어 팝업(`metaphor` 필드)→문장 단위 번역+단어장
> 분리, 바텀시트 추가, "마이페이지"→"인사이트 노트" 개명. `client/`,
> `server/`는 재구성 완료.

상세 문서: 기획/시나리오 `docs/plan.md`, API 스펙 `docs/api-spec.md`, 체크리스트
`docs/checklist.md`, 로드맵 `docs/backlog.md`, 디자인 시스템(확정본)
`.claude/skills/design/SKILL.md`. `stitch-reference/`는 첫 피벗 이전 원본이라
SKILL.md가 우선.

### 핵심 기능 (MVP 4개, 우선순위순)

1. **원문 리더뷰 + 문장 단위 인라인 번역 (최우선)** — LLM이 구조상 어려운
   문장만 선별, 탭하면 팝업 대신 문장 아래 아코디언으로 번역 노출. 용어
   자체는 다루지 않음(→ 기능④).
2. **AI 문단 요약 + 종목 영향 해설** — 3줄 요약은 항상 공개. `insight`/
   `marketSentiment`는 응답엔 항상 포함되지만 판단 전까지 화면에 렌더링하지
   않음(블라인드 처리, state엔 보관).
3. **투자심리 인터랙션 + 바텀시트** — 기사 최하단 정적 배치(sticky 아님)
   버튼 클릭 → 바텀시트에서 "나의 선택 vs marketSentiment" 비교 + `insight`
   공개. 바텀시트 닫는 시점에 `POST /api/decisions` 저장.
4. **데일리 단어장** — 기사 분석 시 핵심 용어 3~5개를 탭 여부와 무관하게
   자동 적재, 최신순 정렬, 출처 클릭 시 원문 기사로 이동.

증권사 API 연동 매매는 스코프 밖(모의 투자 훈련 도구로 한정).

### 화면 구조

좌측 **사이드바**(전역 내비게이션, 리더뷰에서만 숨김) + 대시보드 + 리더뷰
(+바텀시트) + 인사이트 노트(舊 마이페이지) + 단어장.

| 화면 | 컴포넌트 | 비고 |
|---|---|---|
| 사이드바 | `components/Sidebar.jsx` | Primary 버튼 + Menu(대시보드/단어장)·History(인사이트 노트), 카운트 뱃지 |
| 대시보드 | `pages/Dashboard.jsx` | 오늘의 핵심 외신 3개 카드 |
| 리더뷰 | `pages/Reader.jsx` | 문장 아코디언 번역, AI 요약, 판단 버튼. `< 뒤로가기`로 복귀 |
| 바텀시트 | `components/BottomSheet.jsx` | 판단 vs marketSentiment 비교 + insight 공개, 닫으면 저장 |
| 인사이트 노트 | `pages/InsightNote.jsx` | 히스토리 카드(기본: 판단 vs marketSentiment) + "AI 관점 해설 보기" 아코디언 |
| 단어장 | `pages/Vocabulary.jsx` | 자동 적재된 용어 최신순, 출처 클릭 시 리더뷰 이동 |

`prototype/`은 첫 피벗 이전 버전(용어 팝업 등) 포함 — 삭제 금지, 참고용.
실제 동작 사양은 `docs/plan.md`/`api-spec.md`/`SKILL.md`가 우선.

React 구현 메모:
- 문장 번역/AI 요약 → 네이티브 `<details><summary>`
- 판단 버튼 클릭은 트리거일 뿐, 실제 저장은 바텀시트 닫기(`handleCloseSheet`)에서
- 블라인드 처리 → `analysis`는 state에 항상 보관, `{pendingDecision && <BottomSheet/>}`로만 조건부 렌더링
- `marketSentiment` 라벨/톤 매핑은 `constants/sentiment.js`의 `SENTIMENT_META`로 공용화

### 구현 상태 (2주차 대부분 완료, 3주차 예정)

- **동작함:** 전체 라우팅/API 흐름, `articleParser.js` 스크래핑+fallback,
  `vocabularyStore.js`(Supabase 전환, 2026-07-17), `decisionStore.js`(Supabase
  전환, 2026-07-21), Supabase Auth 로그인/회원가입(`Login.jsx`,
  `AuthContext.jsx`), 단어장 자동 적재, 인사이트 노트 아코디언, 사이드바
  카운트 뱃지.
- **더미:** `llmService.js`의 `analyzeArticle` — 고정 용어/문장 매칭 + 고정
  요약·insight·marketSentiment 반환. 실제 Claude 프롬프트는 3주차 작업.
- 대시보드 3개 기사도 고정 픽스처, 실제 수집 로직 없음.
- **미완:** 바텀시트 닫기→저장 완료 토스트 미배선. 완독/판단수행률 분리
  집계 로깅 없음.

## 디렉토리 구조

```
hub/
├── client/src/
│   ├── pages/        # Dashboard.jsx, Reader.jsx, InsightNote.jsx, Vocabulary.jsx, Login.jsx
│   ├── components/   # Sidebar.jsx, NewsCard.jsx, SentenceAccordion.jsx, AiSummary.jsx, DecisionButtons.jsx, BottomSheet.jsx, Badge.jsx
│   ├── context/      # AuthContext.jsx (Supabase Auth 세션)
│   ├── constants/    # sentiment.js
│   ├── styles/       # tokens.css, global.css
│   ├── api/          # client.js, supabaseClient.js, dashboard.js, article.js, decisions.js, vocabulary.js
│   └── App.jsx        # 라우트: "/", "/reader", "/mypage", "/vocabulary", "/login"
├── server/
│   ├── src/routes/     # dashboard.js, article.js, decisions.js, vocabulary.js
│   ├── src/middleware/ # auth.js (requireAuth, attachUser)
│   ├── src/services/   # articleParser.js, llmService.js, decisionStore.js, vocabularyStore.js, articleStore.js, supabaseClient.js
│   └── data/           # decisions.json/vocabulary.json 모두 Supabase로 이전, 미사용
├── supabase/migrations/ # 20260717000000_init_schema.sql (articles/vocabulary/decisions/article_reads + RLS)
├── docs/               # plan.md, api-spec.md, checklist.md, backlog.md, data-model.md
├── prototype/          # 정적 프로토타입 — 삭제 금지
├── stitch-reference/    # 디자인 원본(참고용, SKILL.md 하위)
├── .claude/skills/design/SKILL.md
└── CLAUDE.md
```

`client/`·`server/`는 독립 npm 패키지(workspaces 미사용). `eslint`/`prettier`는
루트에 한 번만 설치해 공통 적용.

## 기술 스택

- client: React 19 + Vite, react-router-dom
- server: Express 5, cors, dotenv, `@anthropic-ai/sdk`, cheerio
- LLM: Anthropic Claude API, `claude-haiku-4-5` 고정 — 요약/번역/용어선별/심리판별이
  전부 짧고 정형화된 반복 작업이라 저지연·저비용 모델이 적합. 모델 변경 시
  `llmService.js`의 `MODEL` 상수만 수정.

## 컨벤션

- 컴포넌트 파일명 PascalCase, 함수/변수 camelCase, CSS 변수 kebab-case(SKILL.md 토큰 재사용)
- 커밋: Conventional Commits (`feat|fix|docs|style|refactor|chore: 설명`)
- 브랜치: `main` + 기능별 브랜치 → PR
- **API 엔드포인트** (상세는 `docs/api-spec.md`):
  - `GET /api/dashboard` — 오늘의 핵심 외신 3개
  - `POST /api/article/parse` — 원문 스크래핑 (`{ url }`)
  - `POST /api/article/analyze` — `{ paragraphs, title, url }` →
    `sentences`/`terms`/`summaryBullets`/`insight`/`marketSentiment`.
    `title`/`url`은 응답에 없고 단어장 자동 저장 부수효과에만 사용
  - `GET /api/vocabulary` — 단어장 조회(최신순)
  - `POST /api/decisions` — `{ url, title, summaryBullets, decision, marketSentiment, insight }`
  - `GET /api/decisions` — 히스토리 조회
- **응답 형식**: 항상 `{ success: true, data }` 또는 `{ success: false, error }`
  (`client/src/api/client.js`의 `apiRequest`가 전제)
- **저장소**: `vocabularyStore.js`(2026-07-17)와 `decisionStore.js`(2026-07-21)
  모두 Supabase(`articles`/`vocabulary`/`decisions` 테이블,
  `server/src/services/supabaseClient.js`)로 전환됨. `articles` 테이블
  upsert-by-url 로직은 `articleStore.js`의 `ensureArticle`로 공용화해 두
  스토어가 함께 쓴다 — 스키마는 `docs/data-model.md`/`supabase/migrations/` 참고
- **환경변수**: `ANTHROPIC_API_KEY`는 `server/.env`(gitignore). 현재
  `analyzeArticle`이 더미라 키 없이도 서버 동작. Supabase 연동에는
  `server/.env`의 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`(서버 전용,
  절대 프론트 노출 금지)와 `client/.env`의 `VITE_SUPABASE_URL`/
  `VITE_SUPABASE_ANON_KEY`가 필요(각 `.env.example` 참고)
- **린트/포맷**: `npm run lint`/`npm run format` (client/server src만 대상,
  `docs/`·`prototype/`·`stitch-reference/`·`.claude/` 등 제외)

## 구현 유의사항

- **외신 파싱**: fetch에 브라우저 `User-Agent` 헤더 필수(없으면 403 다발).
  파싱 실패 시 하드코딩 fallback 기사 반환(데모 중단 방지).
- **vocabularyStore/decisionStore 인증**: `GET /api/vocabulary`, `GET`/`POST
  /api/decisions` 모두 `req.userId` 없이 호출되지 않는다(각 라우트의
  `requireAuth`가 401로 막음). `appendVocabulary`도 `userId` 없이는 호출하지
  않는다(`llmService.js`가 비로그인 시 저장 자체를 건너뜀). 프론트도 비로그인
  사용자를 위해 `Vocabulary.jsx`/`InsightNote.jsx`는 로그인 안내로 대체
  렌더링하고, `Reader.jsx`의 `handleCloseSheet`는 비로그인 시 `saveDecision`
  호출 자체를 건너뛴다(401로 리더뷰 전체가 에러 화면이 되는 것 방지).
- **parse/analyze 분리 유지**: 합치면 스크래핑+LLM 지연 합산으로 타임아웃 위험.
  프론트는 parse 성공 후에만 analyze 호출.
- **MOCK_LLM=true**: Claude 미호출, 더미 응답. 파라미터에 `FAIL_TEST` 포함 시
  의도적 실패 트리거(에러 UI 테스트용).
- **state 보관 ≠ 화면 렌더링**: 블라인드 처리처럼, 받은 데이터를 state엔
  항상 두되 조건부 렌더링으로만 노출을 제어할 수 있다.
- **저장 시점 = 확정 행동**: 클릭 즉시가 아니라 되돌릴 수 없이 확정되는
  순간(예: 바텀시트 닫기)에 서버 저장 호출.
- **공유 매핑 로직은 `constants/`로**: 여러 컴포넌트가 쓰는 로직(예:
  `sentiment.js`)은 중복 정의하지 않고 공용 모듈로 뺀다.
- **대체된 컴포넌트는 즉시 삭제**: 죽은 코드 방지(예: `AiInsight.jsx`는
  `BottomSheet.jsx` 도입으로 대체되며 삭제됨).
- **mock 화면 완성 → 백엔드 완성 시 실API 교체 Task를 backlog에 남길 것**:
  단어장 화면이 API 완성 후에도 며칠간 mock을 계속 렌더링했던 사례 참고.

## 개발 실행

```bash
npm install && cd client && npm install && cd ../server && npm install
cd server && npm run dev   # :4000
cd client && npm run dev   # :5173
```

`server/.env`에 `.env.example` 복사 후 `ANTHROPIC_API_KEY` 채우면 `callClaude`
실 호출 가능(현재 `analyzeArticle`은 더미 응답 상태).

단어장(Supabase)을 쓰려면 추가로:
1. Supabase 프로젝트 생성 후 SQL Editor에서 `supabase/migrations/20260717000000_init_schema.sql` 실행
2. Authentication → Providers → Email에서 "Confirm email" 끄기(로컬 개발 중 회원가입 즉시 로그인되도록)
3. `server/.env`에 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `client/.env`에
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 채우기(각 `.env.example` 참고)
