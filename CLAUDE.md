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
> 학습 중심의 이전 6화면 기획에서 현재 구조로 전환되었다. `client/`, `server/`의
> 실제 코드는 아직 이 전환이 반영되기 전 상태이니 아래 "마이그레이션 상태" 절
> 참고.

자세한 문제 정의·시나리오·KPI는 `docs/plan.md`, 작업 체크리스트는
`docs/checklist.md`, 4주 로드맵과 Task 목록은 `docs/backlog.md` 참고. 디자인
톤은 `.claude/skills/design/SKILL.md`와 `stitch-reference/briefly_core/DESIGN.md`
참고.

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

| # | 화면 | 핵심 내용 | 관련 기능 |
|---|---|---|---|
| 1 | 대시보드 | 오늘의 핵심 외신 3개 카드(매체 로고/이니셜 + 영문 제목 + 한 줄 번역) | 기능①의 진입점 |
| 2 | 리더뷰 | 원문 렌더링, 용어 인라인 해설 툴팁, AI 3줄 요약(아코디언), AI 인사이트 패널, 매수/관망/매도 버튼(sticky) + 완료 토스트 | 기능①②③ |
| 3 | 마이페이지 | 투자 판단 히스토리(기사 제목 + 저장된 AI 요약 3줄 + 판단 뱃지), 원문 링크 만료 시 Fallback 복기 | 기능③ |

화면 2(리더뷰)는 용어 툴팁 팝업(항목①), 아코디언 요약(항목②), 매수/관망/매도
버튼(항목③)까지 인터랙션이 가장 몰린 화면이다. `prototype/02_reader.html` +
`prototype/style.css`에 이 인터랙션 전부가 자바스크립트 없이 구현된 정적
프로토타입이 있으니, React로 포팅할 때 동작 사양의 레퍼런스로 삼는다:

- 용어 툴팁 → `.term` 버튼의 `:focus` 상태로 `.tooltip` 노출 (React에서는 클릭
  핸들러 + `useState`로 자연스럽게 포팅)
- AI 요약 → 네이티브 `<details><summary>` 아코디언
- 투자 판단 버튼 → 숨김 라디오 3개 + `label` + `:checked ~` 형제 선택자로 색상
  전환과 완료 토스트 노출 (React에서는 선택 상태를 `useState`로 관리)

정적 HTML용 CSS-only 트릭 자체를 React 코드에 그대로 옮길 필요는 없고, "무엇이
어떤 상태에서 어떻게 보여야 하는가"라는 동작 사양만 참고한다.

### 마이그레이션 상태 (React/Express 코드 vs 최신 기획)

`client/src/pages`(Home, BriefingEntry, Summary, SourceLink, Sentences, Terms)와
`server/src/routes`(`/api/briefing`, `/api/sentences`, `/api/terms`)는 피벗
이전 6화면 기획의 스캐폴드가 아직 그대로 남아 있다. 위 3화면 구조로의 실제
마이그레이션은 미착수 상태이며, `docs/backlog.md` 2주차 Task("대시보드/리더뷰/
마이페이지 화면 뼈대", "API 스펙 정의", "더미 응답 API")가 그 작업 목록이다.
이 영역에서 작업할 때는 페이지·라우트를 새로 만들되, 기존 6화면 파일을 3화면
구조에 맞게 대체(rename이 아니라 재설계)하는 방향으로 진행한다.

## 디렉토리 구조

```
hub/
├── client/                     # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── pages/              # (구) Home, BriefingEntry, Summary, SourceLink, Sentences, Terms — 마이그레이션 대상, "마이그레이션 상태" 절 참고
│   │   ├── components/         # Card, Button, ProgressBar, Accordion 등 재사용 컴포넌트
│   │   ├── styles/              # tokens.css(디자인 토큰) + global.css(리셋/베이스)
│   │   ├── api/                 # 백엔드 API 호출 함수 모음 (client.js + 엔드포인트별 모듈)
│   │   └── App.jsx              # react-router-dom 라우트 정의
│   └── package.json
├── server/                     # Express 백엔드
│   ├── src/
│   │   ├── routes/              # (구) /api/briefing, /api/sentences, /api/terms — 마이그레이션 대상
│   │   ├── services/            # newsCollector.js(외신 수집·파싱), llmService.js(Claude API 호출 — 용어 툴팁/문단 요약/인사이트 생성)
│   │   └── index.js
│   └── package.json
├── docs/                        # plan.md(기획서), checklist.md(작업 체크리스트), backlog.md(4주 로드맵·Task 목록)
├── prototype/                   # 현재 기획(대시보드/리더뷰/마이페이지) 기준 HTML/CSS 정적 프로토타입 — React 포팅 레퍼런스, 삭제 금지
├── stitch-reference/             # 디자인 레퍼런스 원본(DESIGN.md, Stitch 산출물)
├── .claude/skills/design/        # 디자인 시스템 규칙(SKILL.md)
├── .env.example                  # 필요한 환경변수 목록 (실제 키 값 없음)
├── .gitignore
├── eslint.config.js              # client/server 공통 eslint flat config
├── .prettierrc.json / .prettierignore
├── package.json                  # 루트: eslint/prettier 공용 devDependencies + 스크립트
└── CLAUDE.md
```

`client/`와 `server/`는 각자 독립된 `package.json`을 가진 별도 npm 패키지다
(npm workspaces는 쓰지 않는다 — 두 패키지 모두 크기가 작아서 아직 필요 없음).
`eslint`/`prettier`만 저장소 루트에 한 번 설치해 두고 두 패키지에 공통으로
적용한다(아래 컨벤션 참고).

## 기술 스택

- **client**: React 19 + Vite, react-router-dom (SPA 라우팅)
- **server**: Express 5, cors, dotenv, `@anthropic-ai/sdk`
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

- **컴포넌트 파일명**: PascalCase (예: `BriefingCard.jsx`)
- **함수/변수명**: camelCase
- **CSS 변수명**: kebab-case, 기존 Stitch 디자인 토큰 네이밍 유지
  (`--color-primary`, `--space-stack-lg` 등 — 전체 목록은
  `client/src/styles/tokens.css`와 `.claude/skills/design/SKILL.md` 참고)
- **커밋 메시지**: Conventional Commits 형식 — `feat|fix|docs|style|refactor|chore: 설명`
- **브랜치 전략**: `main`(배포용) + 기능별 브랜치 → PR로 병합
- **API 응답 형식**: 항상 `{ success: true, data: {...} }` 또는
  `{ success: false, error: "메시지" }` 중 하나로 통일
  (`client/src/api/client.js`의 `apiRequest`가 이 형식을 전제로 파싱한다)
- **환경변수**: `ANTHROPIC_API_KEY`는 `server/.env`에 저장하고 `.env`는
  `.gitignore` 처리. `.env.example`에는 키 이름만 남겨 팀원에게 어떤 변수가
  필요한지 안내한다.
- **린트/포맷**: `npm run lint` (저장소 루트에서 `client/src`, `server/src`
  대상 eslint 실행), `npm run format` (같은 범위로 prettier 실행). `docs/`,
  `prototype/`, `stitch-reference/`, `.claude/`, `.github/`, `README.md`는
  포맷 대상에서 제외되어 있다(레퍼런스/문서 자료는 임의로 재포맷하지 않는다).

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
`llmService.js`의 실제 Claude 호출이 동작한다(현재 라우트들은 아직 목데이터를
반환하는 스캐폴드 상태 — `services/newsCollector.js`, `services/llmService.js`의
TODO 주석 참고).
