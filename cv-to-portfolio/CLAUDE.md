# CLAUDE.md — CV2PF 개발 컨텍스트

이 파일은 사람과 에이전트가 **같은 기준**으로 개발하기 위한 단일 진실 소스다.
본격 개발은 2주차지만, 환경·구조·컨벤션은 여기서 미리 못 박는다.

- 무엇을 만드는지: [`docs/기획서.md`](docs/기획서.md)
- 디자인 기준: `.claude/skills/cv2pf-design` 스킬 + [`stitch_designs/`](stitch_designs) 시안
- 상태: v0.2 — client/server 워크스페이스 구조 확정, Express 스캐폴드 완료(로직은 2주차)

---

## 1. 아키텍처

**모노레포(npm workspaces)** — 프론트(React)와 백엔드(Express)를 한 저장소에서 관리한다.

```
[브라우저] ──(정적 SPA)── client (React/Vite, :5173)
     │
     │  fetch("/api/...")  ← Vite dev proxy
     ▼
   server (Express, :4000) ── Claude Messages API (키는 서버에만)
```

- **client**: CV 업로드 → DESIGN.md 선택 → 생성 → 다운로드의 4단계 SPA. 프로토타입은
  브라우저 안에서 **결정적 렌더러**(`generatePortfolio`)로 HTML을 만든다(백엔드 불필요).
- **server**: 실서비스용 **AI 생성 경로**. `POST /api/generate` 가 CV+DESIGN.md 를 받아
  Claude로 HTML을 생성한다. **API 키를 브라우저에 노출하지 않기 위해** 서버가 필요하다.
- 두 생성 경로는 **교체 가능한 seam** 이다: 프로토타입=결정적 렌더러, 실서비스=서버 `/api/generate`.

## 2. 디렉토리 구조

```
cv-to-portfolio/
├─ CLAUDE.md                 # ← 이 문서
├─ package.json              # 워크스페이스 루트 (dev/build/lint 오케스트레이션)
├─ .editorconfig .prettierrc.json .nvmrc .env.example   # 공용 도구/규칙
├─ docs/                     # 기획서 · 화면캡처 · 디자인 리뷰
├─ stitch_designs/           # 디자인 시안(의도) — cv2pf-design 스킬의 출처
├─ examples/                 # 생성 결과 쇼케이스(6종)
├─ client/                   # @cv2pf/client — React + Vite
│  ├─ index.html  vite.config.js  package.json
│  ├─ designs/               # 사람이 읽는 DESIGN.md 6종 (?raw 임포트)
│  ├─ samples/               # 샘플 CV 4종
│  └─ src/
│     ├─ App.jsx             # 4단계 흐름 오케스트레이터
│     ├─ components/         # 공용 컴포넌트 (Stepper 등)
│     └─ features/           # 기능별 폴더 (cvUpload · designSelect · generate · result)
└─ server/                   # @cv2pf/server — Express API
   ├─ package.json  .env.example  README.md
   └─ src/
      ├─ index.js            # 진입점(listen)     app.js  # 앱 조립
      ├─ config/             # 환경변수 로드·검증
      ├─ routes/ controllers/ services/ middlewares/   # 계층 분리
```

**구조 원칙**
- 클라이언트는 **기능(feature) 단위 폴더**. 화면 컴포넌트 + 그 화면의 로직(파서/렌더러)을 함께 둔다.
- 서버는 **계층 분리**: `routes`(경로) → `controllers`(검증/응답) → `services`(도메인 로직) →
  `config`/`middlewares`(횡단 관심사). 컨트롤러는 얇게, 로직은 서비스에.
- 공용 설정/문서는 루트에, 실행 코드는 `client/`·`server/` 안에만.

## 3. 기술 스택 & 라이브러리 (조사 후 결정)

| 영역 | 선택 | 이유 / 대안 |
| --- | --- | --- |
| 런타임 | **Node ≥ 18.16** (`.nvmrc`=18) | 전역 `fetch` 사용, LTS. |
| 패키지 관리 | **npm workspaces** | 추가 툴 없이 모노레포. (대안 pnpm — 지금은 불필요) |
| 클라 빌드 | **Vite 5** + `@vitejs/plugin-react` | 빠른 HMR, `?raw` 임포트로 .md 로딩. |
| 클라 UI | **React 18** (라우터·상태관리 없음) | 단일 흐름 4단계 → `useState` 로 충분. 라우터/Redux 과함. |
| 서버 | **Express 4** + `cors` + `dotenv` | 표준·가벼움. seam 하나 붙이는 데 적합. |
| LLM 호출 | **전역 `fetch`** (Node 18) | 의존성 0. 필요 시 `@anthropic-ai/sdk`로 승격(로드맵). |
| 서버 dev | **`node --watch`** | 파일 감시 재시작. (대안 nodemon — 의존성 아껴 미채택) |
| 포맷터 | **Prettier** (루트 `.prettierrc.json`) | 인자 폭 90, 세미콜론, 쌍따옴표, trailing comma all. |
| 린터 | **ESLint 9** (client: react/hooks) | 워크스페이스별 설정, 2주차 규칙 확정. |
| 테스트 | **Vitest**(client) / Node test(server) | 2주차 도입. 지금은 스크립트만 준비. |

> **의존성 최소주의**: 지금 단계에선 라우터·상태관리·UI 프레임워크·ORM을 넣지 않는다.
> 필요가 “증명”될 때 추가한다(예: 화면이 늘면 라우터, 저장이 생기면 DB).

## 4. 개발 컨벤션

- **언어**: UI 문구·주석·문서는 **한국어**. 코드 식별자는 영어(camelCase).
- **네이밍**: React 컴포넌트 `PascalCase.jsx`, 로직/유틸 `camelCase.js`, feature 폴더 `camelCase`.
  CSS는 컴포넌트 옆에 두고 클래스는 `kebab-case`.
- **코드 스타일**: Prettier가 강제(수동 정렬 금지). ESM(`import`/`export`) 사용.
- **접근성(필수)**: 상태는 색만이 아니라 **텍스트+ARIA**로도(`aria-current`, `role="status"`),
  포커스 가시성·라벨 제공. 생성물 HTML도 `lang` 지정 + 본문 대비 **WCAG AA**.
- **보안**: 사용자 입력을 HTML로 렌더 시 이스케이프. **API 키·비밀은 서버 `.env` 에만**
  (커밋 금지, `.env.example` 로만 공유).
- **디자인**: CV2PF 도구 화면을 만들거나 검수할 땐 `cv2pf-design` 스킬 기준을 따른다.

## 5. 커밋 로그 규칙 — Conventional Commits

형식: `type(scope): 한국어 요약(명령형, 마침표 없음)`

- **type**: `feat` · `fix` · `docs` · `chore` · `refactor` · `test` · `style` · `perf`
- **scope**(선택): `client` · `server` · `design` · `infra` · `docs`
- 예시:
  - `feat(server): /api/generate 엔드포인트 추가`
  - `feat(client): 결과 화면 HTML 다운로드`
  - `chore(infra): client/server 워크스페이스로 구조 정리`
  - `docs: 개발 환경 컨벤션 CLAUDE.md 정리`
- 한 커밋 = 한 논리적 변경. 기능별로 잘게 나눈다(현 히스토리 스타일 유지).
- ⚠️ **공동 저자(Co-authored-by)에 AI/도구를 넣지 않는다.** 커밋 저자는 본인만.
- 커밋 아이덴티티: `dolphin1404` / `43460702+dolphin1404@users.noreply.github.com`.

## 6. 브랜치 & PR 규칙

- **브랜치**: `feat/<주제>` · `fix/<주제>` · `docs/<주제>`. 작업은 `feat/cv-to-portfolio` 에서.
- **PR 대상**: `dolphin1404:feat/cv-to-portfolio` → `connect-AIAgentChallenge-26-1/hub:N123_이규민`.
- **PR 제목**: `[루카스아이디_실명] 한 문장 요약` (예: `[N123_이규민] 개발 환경 구성 + 디자인 스킬`).
- **PR 본문 체크리스트**: 주요 작업 리스트(+스크린샷) · 내가 설명할 수 있는 부분 ·
  아직 이해 못 한 부분 · 새로 알게 된 것.

## 7. 환경변수 (`.env`)

| 변수 | 위치 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | server | Claude API 키. **서버 전용, 커밋 금지.** |
| `ANTHROPIC_MODEL` | server | 예: `claude-sonnet-5` \| `claude-opus-4-8` |
| `PORT` | server | API 포트(기본 4000) |
| `CLIENT_ORIGIN` | server | CORS 허용 오리진(기본 `http://localhost:5173`) |
| `VITE_API_PROXY` | client | dev 프록시 대상(기본 `http://localhost:4000`) |

## 8. API 설계 (초안)

| Method | Path | 요청 | 응답 |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `{ status, aiConfigured }` |
| POST | `/api/generate` | `{ cvMarkdown, designMarkdown }` | `{ html }` |

- 검증 실패 400, 키 미설정 503, 업스트림 오류 502. 에러는 `{ error }` 형태로 통일.

## 9. 결정 로그 · 열린 질문

**결정(2026-07-09)**
- 구조: `client/` + `server/` npm 워크스페이스 모노레포로 확정.
- 생성: 프로토타입=결정적 렌더러 유지, 실서비스=서버 `/api/generate` seam.
- LLM 호출은 서버에서 `fetch`(의존성 0)로 시작, 필요 시 공식 SDK로 승격.
- 도구 최소주의(라우터/상태관리/DB 미도입).

**2주차 전에/중에 정할 것**
- 셸 레이아웃을 좌측 사이드바로 전환(디자인 리뷰의 미해결 불일치).
- LLM 응답 HTML의 **안전성·일관성**(프롬프트 인젝션·깨진 마크업 대응) 정책.
- PDF/DOCX 파싱 파이프라인 위치(클라 vs 서버).
- 배포 대상(정적 호스팅 + 서버리스 함수 vs 단일 서버) — 기획서 §8과 연계.
- 테스트 범위(파서·렌더러 우선) 및 CI 도입 여부.
