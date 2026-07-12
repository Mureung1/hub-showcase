# CLAUDE.md

이 저장소에서 개발 작업을 할 때 참고 기준으로 삼는 문서다. 프로젝트 개요, 디렉토리
구조, 기술 스택, 컨벤션을 정리한다.

## 프로젝트 개요

**영문 뉴스 기반 해외 주식 모의 투자 학습 AI 에이전트 (Briefly)**

해외 주식과 영문 뉴스 읽기에 처음 입문하는 초보자는 경제 기사 특유의 전문용어·
은유적 표현(bear market, guidance, ticker 등)과 정보 과부하 때문에 외신을
끝까지 읽지 못하고 포기한다. 이 서비스는 오늘의 핵심 외신을 큐레이션해 보여주고,
리더뷰 안에서 전문용어를 바로 해설하며, AI 요약과 종목 영향 해설로 "언어 해석"과
"투자 가치 분석" 사이의 인지적 부담을 낮춘 뒤, 완독 후 모의 투자 판단(매수/관망/
매도)까지 이어지는 흐름으로 학습과 투자 감각을 함께 키운다.

> 이 기획은 2026-07-12자 커밋(`기획 피벗 반영`)에서 관심종목 큐레이션·난이도별
> 학습 중심의 이전 6화면 기획에서 현재 구조(대시보드/리더뷰/마이페이지 3화면)로
> 전환되었다. `client/`, `server/`는 이 전환에 맞춰 재구성이 끝난 상태다("구현
> 상태" 절 참고).

자세한 문제 정의·시나리오·KPI는 `docs/plan.md`, 작업 체크리스트는
`docs/checklist.md`, 4주 로드맵과 Task 목록은 `docs/backlog.md` 참고. 디자인
시스템(색상·타이포그래피·컴포넌트·인터랙션 규칙)은 `.claude/skills/design/
SKILL.md`가 확정본이다. 새 화면/컴포넌트를 만들거나 기존 화면을 고칠 때는
이 skill을 그대로 따른다("디자인 skill 적용해서 만들어줘" 같은 요청에도 이
문서를 참고). 색상 팔레트는 원래 `stitch-reference/briefly_core/DESIGN.md`의
Google Stitch 산출물에서 시작됐지만, 그 문서는 피벗 이전 6화면 기획 기준이라
지금은 참고용 원본일 뿐 SKILL.md가 우선한다.

### 핵심 기능 (MVP, 3개 — 우선순위순)

- **기능 ① 원문 리더뷰 + 전문용어 인라인 해설 (최우선)** — 뉴스 원문을 렌더링
  하되 금융 전문용어를 자동 하이라이트하고, 탭하면 "비유 1줄 + 뜻 1줄" 형식의
  한글 툴팁을 팝업으로 보여준다. 사전이나 번역기로 이탈하는 지점을 기사 화면
  안에서 없애는 서비스의 핵심 존재 이유다.
- **기능 ② AI 문단 요약 + 종목 영향 한 줄 해설** — 문단별 3줄 불릿 요약과,
  기사 하단 "이 기사가 주가에 미치는 영향" AI 한 줄 브리핑을 제공한다. 용어
  뜻만으로는 연결되지 않는 '언어 해석'과 '투자 가치 분석' 사이에 다리를 놓는다.
- **기능 ③ 완독 후 투자심리 인터랙션 (매수/관망/매도)** — 기사 최하단에서
  모의 투자 판단을 선택하면 마이페이지에 히스토리로 기록된다. 킥오프에서 합의한
  정량적 성공 기준(완독 후 판단 인터랙션 수행)을 측정하는 유일한 데이터 포인트다.

실제 증권사 API와 연동된 매매 시스템은 스코프 밖이다(모의 투자 판단 훈련
도구로 명확히 한정, `docs/plan.md` 4번 참고).

### 3개 화면 구조

핵심 사용자 시나리오("번역기 없이 완독 → 투자 판단")를 따르는 3개 화면.
웹 브라우저(모바일 아님) 375~720px 기준, 화면 간 이동은 카드/버튼 클릭과 링크로
이어진다.

| # | 화면 | 페이지 컴포넌트 | 핵심 내용 | 관련 기능 |
|---|---|---|---|---|
| 1 | 대시보드 | `pages/Dashboard.jsx` | 오늘의 핵심 외신 3개 카드(매체 로고/이니셜 + 영문 제목 + 한 줄 번역) | 기능①의 진입점 |
| 2 | 리더뷰 | `pages/Reader.jsx` | 원문 렌더링, 용어 인라인 해설 툴팁, AI 3줄 요약(아코디언), AI 인사이트 패널, 매수/관망/매도 버튼(sticky) + 완료 토스트 | 기능①②③ |
| 3 | 마이페이지 | `pages/MyPage.jsx` | 투자 판단 히스토리(기사 제목 + 저장된 AI 요약 3줄 + 판단 뱃지), 원문 링크 만료 시 Fallback 복기 | 기능③ |

`prototype/02_reader.html` + `prototype/style.css`에는 화면 2의 인터랙션
(용어 툴팁, 아코디언 요약, 투자 판단 버튼)이 자바스크립트 없이 CSS만으로 구현된
정적 프로토타입이 남아 있다(삭제 금지 — 디자인 동작 사양의 원본 레퍼런스).
`client/src`의 실제 React 구현은 같은 동작을 다음과 같이 React 방식으로
포팅했다:

- 용어 툴팁 → `TermTooltip.jsx`가 `useState`로 열림 상태를 관리 (CSS의
  `:focus` 트릭 대신 클릭 핸들러 사용)
- AI 요약 → `AiSummary.jsx`도 네이티브 `<details><summary>`를 그대로 사용
  (JS 상태 관리가 필요 없는 부분이라 프로토타입과 동일한 방식 유지)
- 투자 판단 버튼 → `DecisionButtons.jsx`가 선택 상태를 `useState`로 관리하고,
  선택 시 부모(`Reader.jsx`)의 콜백으로 `POST /api/decisions`를 호출한다
  (프로토타입의 숨김 라디오 + `:checked ~` 트릭 대신)

### 구현 상태 (2주차 완료, 3주차 예정)

`docs/backlog.md` 2주차 Task(화면 뼈대, API 스펙 정의, 더미 응답 API) 기준으로
`client/`·`server/`가 3화면 구조로 재구성되어 있다. 현재 동작하는 것과 아직
더미인 것을 구분해서 참고한다:

- **실제로 동작하는 로직:** 화면 라우팅·API 연동 전체 흐름, `articleParser.js`의
  실제 fetch+cheerio 스크래핑(및 실패 시 fallback), `decisionStore.js`의 JSON
  파일 읽기/쓰기.
- **아직 더미 응답인 로직:** `llmService.js`의 `analyzeArticle` — 문단 텍스트에서
  알려진 용어(`bear market`, `ticker`, `guidance`, `sell-off`)만 문자열
  매칭으로 찾아내고, 3줄 요약과 인사이트는 고정 문구를 반환한다. 실제 Claude
  프롬프트 설계(`callClaude` 활용)는 3주차 작업이다.
- 대시보드의 3개 기사(`routes/dashboard.js`)도 고정 픽스처이며, 실제 외신
  수집·선별 로직은 아직 없다.

## 디렉토리 구조

```
hub/
├── client/                       # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── pages/                # Dashboard.jsx, Reader.jsx, MyPage.jsx
│   │   ├── components/           # NewsCard, TermTooltip, AiSummary, AiInsight, DecisionButtons, Badge
│   │   ├── styles/               # tokens.css(디자인 토큰) + global.css(리셋/베이스/컴포넌트 스타일)
│   │   ├── api/                  # client.js(공용 fetch 래퍼) + dashboard.js/article.js/decisions.js
│   │   └── App.jsx               # react-router-dom 라우트: "/", "/reader", "/mypage"
│   └── package.json
├── server/                       # Express 백엔드
│   ├── src/
│   │   ├── routes/               # dashboard.js, article.js(parse+analyze), decisions.js
│   │   ├── services/             # articleParser.js(스크래핑), llmService.js(AI 분석), decisionStore.js(JSON 파일 저장)
│   │   └── index.js
│   ├── data/decisions.json       # 투자 판단 히스토리 저장소 (fs 동기 읽기/쓰기, 별도 DB 없음)
│   └── package.json
├── docs/                          # plan.md(기획서), checklist.md(작업 체크리스트), backlog.md(4주 로드맵·Task 목록)
├── prototype/                     # 대시보드/리더뷰/마이페이지 HTML/CSS 정적 프로토타입 — 동작 사양 레퍼런스, 삭제 금지
├── stitch-reference/               # 디자인 레퍼런스 원본(DESIGN.md, Stitch 산출물)
├── .claude/skills/design/          # 디자인 시스템 규칙(SKILL.md)
├── .env.example                    # 필요한 환경변수 목록 (실제 키 값 없음)
├── .gitignore
├── eslint.config.js                # client/server 공통 eslint flat config
├── .prettierrc.json / .prettierignore
├── package.json                    # 루트: eslint/prettier 공용 devDependencies + 스크립트
└── CLAUDE.md
```

`client/`와 `server/`는 각자 독립된 `package.json`을 가진 별도 npm 패키지다
(npm workspaces는 쓰지 않는다 — 두 패키지 모두 크기가 작아서 아직 필요 없음).
`eslint`/`prettier`만 저장소 루트에 한 번 설치해 두고 두 패키지에 공통으로
적용한다(아래 컨벤션 참고).

## 기술 스택

- **client**: React 19 + Vite, react-router-dom (SPA 라우팅)
- **server**: Express 5, cors, dotenv, `@anthropic-ai/sdk`, cheerio(HTML 파싱)
- **개발 도구**: eslint(flat config) + prettier — 저장소 루트에 한 번만 설치하고
  `client/src`, `server/src`에 공통 적용
- **LLM**: Anthropic Claude API, 모델은 `claude-haiku-4-5`

### LLM 제공자 선택 이유

Anthropic Claude API를 쓰고, 모델은 `claude-haiku-4-5`로 고정한다. 이 서비스가
LLM에 맡기는 작업(기사 3줄 요약, "비유 1줄 + 뜻 1줄" 형식의 용어 툴팁 생성,
종목 영향 한 줄 해설)은 전부 **짧고 반복적이며 출력 형식이 정형화된** 작업이라,
더 크고 비싼 모델의 추론 능력이 크게 필요하지 않다. 매일 사용자마다 반복
호출되는 구조이므로 비용 효율이 중요하고, Haiku 계열이 지연시간도 짧아 리더뷰
안에서 툴팁이 즉시 팝업되어야 하는 UX에 적합하다. `server/src/services/
llmService.js`에 모델 이름과 클라이언트 초기화를 한 곳에 모아두었으니, 모델을
바꾸게 되면 그 파일의 `MODEL` 상수만 수정하면 된다.

## 컨벤션

- **컴포넌트 파일명**: PascalCase (예: `NewsCard.jsx`)
- **함수/변수명**: camelCase
- **CSS 변수명**: kebab-case, `.claude/skills/design/SKILL.md`에 확정된 디자인
  토큰 네이밍 유지(`--surface-bg`, `--brand-navy`, `--space-lg` 등 — 전체
  목록은 `client/src/styles/tokens.css`와 SKILL.md 참고)
- **커밋 메시지**: Conventional Commits 형식 — `feat|fix|docs|style|refactor|chore: 설명`
- **브랜치 전략**: `main`(배포용) + 기능별 브랜치 → PR로 병합
- **API 엔드포인트**:
  - `GET /api/dashboard` — 오늘의 핵심 외신 3개 (기능①)
  - `POST /api/article/parse` — 원문 스크래핑 (기능①, body: `{ url }`)
  - `POST /api/article/analyze` — 용어 해설·AI 요약·인사이트 (기능②, body: `{ paragraphs }`)
  - `POST /api/decisions` — 투자 판단 저장 (기능③, body: `{ url, title, summaryBullets, decision }`)
  - `GET /api/decisions` — 투자 판단 히스토리 조회 (기능③)
- **API 응답 형식**: 항상 `{ success: true, data: {...} }` 또는
  `{ success: false, error: "메시지" }` 중 하나로 통일
  (`client/src/api/client.js`의 `apiRequest`가 이 형식을 전제로 파싱한다)
- **투자 판단 저장소**: 별도 DB 없이 `server/data/decisions.json`에 JSON
  배열로 저장한다. `server/src/services/decisionStore.js`가 `fs`의
  동기 API(`readFileSync`/`writeFileSync`)로 읽고 쓴다 — 이유는 아래
  "구현 유의사항" 절 참고.
- **환경변수**: `ANTHROPIC_API_KEY`는 `server/.env`에 저장하고 `.env`는
  `.gitignore` 처리. `.env.example`에는 키 이름만 남겨 팀원에게 어떤 변수가
  필요한지 안내한다. 현재 `analyzeArticle`은 더미 응답이라 이 키 없이도 서버가
  정상 동작하며, 3주차에 `callClaude`를 실제로 호출하는 순간부터 필요해진다.
- **린트/포맷**: `npm run lint` (저장소 루트에서 `client/src`, `server/src`
  대상 eslint 실행), `npm run format` (같은 범위로 prettier 실행). `docs/`,
  `prototype/`, `stitch-reference/`, `.claude/`, `.github/`, `README.md`는
  포맷 대상에서 제외되어 있다(레퍼런스/문서 자료는 임의로 재포맷하지 않는다).

## 구현 유의사항 (3주차 실전 로직에 반영할 안전장치)

2주차는 화면 뼈대와 더미 응답으로 흐름만 연결했다. 3주차에 실제 로직을 채울
때 다음 세 가지를 반드시 지킨다 — 전부 데모/운영 중 실패를 막기 위한
안전장치다.

- **외신 파싱 (`articleParser.js`)**
  - fetch 요청에는 일반 브라우저처럼 보이는 `User-Agent` 헤더를 반드시
    포함한다. 대형 외신 사이트는 기본 요청(Node의 기본 UA)을 봇으로 간주해
    403을 반환하는 경우가 많다.
  - 파싱이 실패하면(403, 404, 페이지 구조 불일치 등) 하드코딩된 더미 기사
    텍스트를 fallback으로 반환한다. 데모 중 스크래핑이 막혀도 시연이 끊기지
    않게 하기 위함이다. 현재 fallback 기사는 `prototype/02_reader.html`과
    동일한 "Tech Stocks Slide..." 지문이다.
- **투자 판단 저장 (`decisionStore.js`, `data/decisions.json`)**
  - `fs.readFileSync`/`writeFileSync`로 **동기** 처리한다. 비동기로 처리하면
    매수/관망/매도 버튼을 연속 클릭했을 때 두 요청의 읽기-수정-쓰기가 겹쳐
    파일이 깨질 위험이 있다. MVP 규모의 단일 JSON 파일에는 동기 처리가 더
    안전하다.
- **API 분리 원칙 (`routes/article.js`)**
  - `/api/article/parse`(스크래핑)와 `/api/article/analyze`(AI 추론)는
    반드시 분리된 엔드포인트로 유지한다. 하나로 합치면 스크래핑 지연과 LLM
    추론 지연이 겹쳐 HTTP Timeout 위험이 커진다. 프론트엔드(`Reader.jsx`)는
    parse가 성공한 뒤에만 analyze를 호출하도록 순차 처리한다.
- **LLM 호출 비용 관리**: `llmService.js`는 환경변수(`MOCK_LLM=true`)로 전환
  가능한 Mock 모드를 지원한다. 로컬 개발/통합 테스트 중에는 Claude API를 매번
  실제로 호출하지 않고 성공/실패 더미 응답을 반환해, 과금과 Rate Limit 부담
  없이 개발할 수 있게 한다. 파라미터에 `FAIL_TEST` 문자열을 포함시키면
  의도적으로 실패 케이스를 트리거할 수 있어, 프론트엔드 에러 UI(토스트 등)
  테스트에 활용한다.

## 개발 실행

```bash
# 최초 1회
npm install            # 루트: eslint/prettier
cd client && npm install
cd ../server && npm install

# 개발 서버
cd server && npm run dev   # http://localhost:4000
cd client && npm run dev   # http://localhost:5173 (Vite 기본 포트)
```

`server/.env`에 `.env.example`을 복사해 `ANTHROPIC_API_KEY`를 채워야
`llmService.js`의 `callClaude`를 통한 실제 Claude 호출이 동작한다(현재
`analyzeArticle`은 아직 더미 응답을 반환하는 2주차 스캐폴드 상태 — "구현 상태",
"구현 유의사항" 절 참고).
