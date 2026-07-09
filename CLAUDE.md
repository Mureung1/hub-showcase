# CLAUDE.md

이 저장소에서 개발 작업을 할 때 참고 기준으로 삼는 문서다. 프로젝트 개요, 디렉토리
구조, 기술 스택, 컨벤션을 정리한다.

## 프로젝트 개요

**해외주식투자 & 실전영어 학습 브리핑 서비스 (Briefly)**

해외주식에 관심이 생긴 투자 초보 대학생은 야후 파이낸스 등 영어 뉴스를 읽을 때
금융 전문용어와 실전 영어 표현을 동시에 해석해야 하는 이중 부담 때문에 꾸준히
읽지 못하고, 결국 투자 감각도 영어 실력도 쌓이지 않는다. 이 서비스는 매일 아침
사용자의 관심 종목 뉴스를 짧은 브리핑 형태로 제공하면서, 기사 속 핵심 문장과
투자 용어를 사용자 수준에 맞게 함께 학습시킨다.

자세한 문제 정의·시나리오·KPI는 `docs/plan.md`, 작업 체크리스트는
`docs/checklist.md` 참고. 디자인 톤은 `.claude/skills/design/SKILL.md`와
`stitch-reference/briefly_core/DESIGN.md` 참고.

### 핵심 기능 (MVP, 2개)

- **기능 A. 관심종목/섹터 기반 뉴스 큐레이션** — 온보딩에서 선택한 관심
  종목/섹터를 기준으로 매일 아침 야후 파이낸스에서 기사를 선별한다. 관심 종목이
  여러 개여도 별도 우선순위 없이 "발행 시각이 가장 최신인 기사"를 자동 선정한다.
  이게 없으면 화면 2 이후가 전부 빈 화면이 되므로 콘텐츠 파이프라인의 필수
  입력값이다.
- **기능 B. 난이도별 콘텐츠/표현 조절** — 온보딩에서 선택한 영어 실력(초급/중급/
  고급)에 따라 화면 5(핵심 문장 + 표현 해설)의 아코디언 설명과 하이라이트되는
  표현의 개수·난이도가 달라진다. 화면 6(투자 용어)은 난이도와 무관하게 모두
  동일한 기본 설명을 제공한다(적용 범위는 화면 5로 한정). "금융 전문용어 +
  영어 표현"이라는 문제 정의를 정면으로 해결하는 기능이라 서비스 존재 이유와
  직결된다.

퀴즈/정답 확인/스트릭 갱신·복습 로직은 Phase 2로 유보되어 있다(MVP는 "읽고
이해하는 것"까지).

### 6개 화면 구조

MVP 핵심 시나리오("데일리 브리핑 학습")를 따르는 6개 화면. 모바일 375×812
기준, 화면 간 이동은 전부 순차적 CTA 클릭이다.

| # | 화면 | 핵심 내용 | 관련 기능 |
|---|---|---|---|
| 1 | Home | 오늘의 브리핑 알림 배지, 학습 스트릭 | — |
| 2 | Briefing Entry | 종목 태그, 기사 헤드라인, 출처/발행일 | 기능 A |
| 3 | Summary | 3줄 한글 요약, 지표 하이라이트 | 기능 A |
| 4 | Source Link | 원문 기사 링크(새 탭 이동 후 복귀) | 기능 A |
| 5 | Sentences | 핵심 문장 카드(원문+해석), 표현 하이라이트, 난이도별 아코디언 설명, 카드 인디케이터(1/3→2/3→3/3) | 기능 B |
| 6 | Terms | 투자 용어 미니 설명(용어명+정의+맥락), "오늘 학습 마치기" | — |

화면 5는 문장 카드 전환(5-1→5-3)과 표현 설명 펼침(5-2)이 겹치는, 인터랙션이
가장 몰린 화면이다. `prototype/05_sentence.html`에는 이 인터랙션이 라디오
입력 + `:checked ~` 형제 선택자만으로 구현된 정적 프로토타입이 있으니, React
버전을 만들 때 동작 사양의 레퍼런스로 삼는다(실제 구현은 `useState`로 자연스럽게
포팅했다 — 정적 HTML용 CSS-only 트릭 자체를 React 코드에 그대로 옮길 필요는
없다).

## 디렉토리 구조

```
hub/
├── client/                     # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── pages/              # Home, BriefingEntry, Summary, SourceLink, Sentences, Terms
│   │   ├── components/         # Card, Button, ProgressBar, Accordion 등 재사용 컴포넌트
│   │   ├── styles/              # tokens.css(디자인 토큰) + global.css(리셋/베이스)
│   │   ├── api/                 # 백엔드 API 호출 함수 모음 (client.js + 엔드포인트별 모듈)
│   │   └── App.jsx              # react-router-dom 라우트 정의
│   └── package.json
├── server/                     # Express 백엔드
│   ├── src/
│   │   ├── routes/              # /api/briefing, /api/sentences, /api/terms
│   │   ├── services/            # newsCollector.js(뉴스 수집, 기능 A), llmService.js(Claude API 호출, 기능 B)
│   │   └── index.js
│   └── package.json
├── docs/                        # plan.md(기획서), checklist.md(작업 체크리스트)
├── prototype/                   # 기존 HTML/CSS 정적 프로토타입 (참고용, 삭제 금지)
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
LLM에 맡기는 작업(기사 3줄 요약, 핵심 문장 발췌, 난이도별 표현 해설, 투자 용어
설명)은 전부 **짧고 반복적이며 출력 형식이 정형화된** 작업이라, 더 크고 비싼
모델의 추론 능력이 크게 필요하지 않다. 매일 사용자마다 반복 호출되는 구조이므로
비용 효율이 중요하고, Haiku 계열이 지연시간도 짧아 브리핑처럼 여러 화면을
순차적으로 넘기는 UX에 적합하다. `server/src/services/llmService.js`에 모델
이름과 클라이언트 초기화를 한 곳에 모아두었으니, 모델을 바꾸게 되면 그 파일의
`MODEL` 상수만 수정하면 된다.

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
