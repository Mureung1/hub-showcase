# CLAUDE.md — 우리결 개발 가이드

이 문서는 "우리결" 프로젝트에서 Claude Code가 작업할 때 따라야 할 규칙(폴더 구조, 라이브러리, 커밋/코드 컨벤션)을 정리한다.
서비스 기획/로드맵은 [README.md](README.md), 화면 디자인 규칙은 [DESIGN.md](DESIGN.md) + `.claude/skills/woorigyeol-design`를 참고할 것.

## 레포 구조

```
hub/
├── README.md              # 기획서 (서비스 개요, 로드맵, 체크리스트)
├── DESIGN.md               # 디자인 시스템 (색상/타이포/컴포넌트 규칙)
├── CLAUDE.md                # 이 문서
├── intro-page/              # 랜딩/소개 페이지 (React + Vite) — 실제 서비스 아님
├── vanillla-prototype/      # 초기 화면 흐름 클릭 프로토타입 (바닐라 HTML/CSS) — 디자인 참고용
├── frontend/                 # 실제 서비스 프론트엔드 (React + Vite)
└── backend/                  # 실제 서비스 백엔드 (Node.js + Express + Prisma)
```

`frontend/`와 `backend/`는 npm workspaces로 묶지 않고 완전히 독립된 프로젝트로 둔다. 각 폴더에서 따로 `npm install`, `npm run dev`를 실행한다.

## frontend/

```
frontend/
├── src/
│   ├── api/          # axios 인스턴스, 엔드포인트별 요청 함수
│   ├── components/   # 재사용 공통 컴포넌트
│   ├── pages/         # 라우트 단위 페이지 (Login, Signup, HobbyTest, MatchResult ...)
│   ├── hooks/          # 커스텀 훅
│   ├── store/          # zustand 전역 상태 (인증 등)
│   ├── styles/          # tokens.css — DESIGN.md 팔레트를 CSS 변수로 반영
│   ├── utils/
│   ├── App.jsx           # 라우터 정의
│   └── main.jsx
├── .env.example
└── package.json
```

### 라이브러리 & 선택 이유

| 라이브러리 | 용도 | 선택 이유 |
|---|---|---|
| React 19 + Vite | 프레임워크/빌드 | intro-page와 스택 통일 |
| react-router-dom | 라우팅 | 표준 선택지, 화면 흐름이 많은 서비스 특성상 필요 |
| axios | API 통신 | 인터셉터로 JWT 토큰 자동 첨부, 에러 처리 일관화가 fetch보다 쉬움 |
| zustand | 전역 상태 (인증 토큰, 유저 정보 등) | Redux 대비 보일러플레이트가 거의 없음. 1인 개발 + 4주 일정에 적합한 최소 상태 관리 |
| oxlint | 린트 | intro-page에서 이미 사용 중 (Rust 기반, 빠름) — 통일 |
| prettier | 포맷팅 | oxlint는 포맷터가 아니므로 별도 필요 |

애니메이션(framer-motion) 등은 실제 화면을 만들면서 필요할 때 추가한다. 지금은 스켈레톤 단계라 넣지 않았다.

### 실행

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## backend/

```
backend/
├── src/
│   ├── routes/        # 라우터 (엔드포인트 정의만, 로직은 controller로)
│   ├── controllers/   # 요청/응답 처리
│   ├── services/       # 비즈니스 로직 (매칭 알고리즘 등)
│   ├── middlewares/     # 인증, 에러 핸들러 등
│   ├── config/           # 환경변수 등 설정
│   ├── utils/
│   ├── app.js            # express 앱 설정 (미들웨어, 라우터 마운트)
│   └── server.js         # 서버 실행 진입점
├── prisma/
│   └── schema.prisma      # DB 스키마 (아직 모델 없음 — DB 설계 단계에서 채울 것)
├── prisma.config.ts        # Prisma 7 설정 파일 (TS지만 프로젝트 전체가 TS인 건 아님, Prisma CLI가 자체적으로 실행)
├── .env.example
└── package.json
```

### 라이브러리 & 선택 이유

| 라이브러리 | 용도 | 선택 이유 |
|---|---|---|
| express | 웹 프레임워크 | README 기술 스택 명시 |
| prisma + @prisma/client | ORM / MySQL 접근 | 스키마 파일 기반으로 마이그레이션 자동 생성, 타입 안전한 쿼리. 1인 개발 + 4주 일정에서 DB 설계·마이그레이션 속도가 중요해서 선택 (Sequelize/raw SQL 대비) |
| jsonwebtoken | 인증 토큰 발급/검증 | 학교 이메일 인증 로그인 후 세션 유지용 |
| bcrypt | 비밀번호 해싱 | 표준 선택지 |
| zod | 요청 값 검증 | 라우트 입력값(회원가입, 테스트 응답 등) 스키마 검증 |
| cors | CORS 허용 | 프론트(별도 origin)에서 API 호출 허용 |
| morgan | 요청 로깅(dev) | 개발 중 디버깅용 |
| nodemon (dev) | 파일 변경 감지 재시작 | 개발 편의 |
| oxlint / prettier | 린트/포맷 | 프론트와 동일 도구로 통일 |

### 실행

```bash
cd backend
cp .env.example .env   # DATABASE_URL, JWT_SECRET 등 실제 값으로 수정
npm install
npm run dev
```

`GET /api/health` 로 서버 동작 확인 가능. DB 모델이 생기면 `npm run prisma:migrate`로 마이그레이션 적용.

## 커밋 메시지 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따르되, 설명은 한글로 쓴다.

```
<type>: <한글 설명>
```

| type | 용도 |
|---|---|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 (README, CLAUDE.md, DESIGN.md 등) |
| `style` | 코드 동작에 영향 없는 스타일/포맷 변경 |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정, 의존성 등 잡무성 변경 |

예시:
```
feat: 학교 이메일 인증 회원가입 API 구현
fix: 매칭 알고리즘에서 취미 점수 null 처리 안 되던 버그 수정
chore: backend 폴더 초기 스캐폴딩
```

여러 이슈/작업을 한 커밋에 묶지 않고, 의미 단위로 나눠 커밋한다.

## 코드 컨벤션

- **모듈 시스템**: frontend/backend 모두 ESM (`"type": "module"`) 사용, `import`/`export`.
- **네이밍**
  - 컴포넌트 파일: `PascalCase.jsx` (예: `MatchCard.jsx`)
  - 훅: `useXxx.js`
  - 그 외 js 파일(유틸, 서비스 등): `camelCase.js`
  - Prisma 모델: `PascalCase` (예: `User`, `HobbyTest`), 필드는 `camelCase`. 실제 MySQL 테이블/컬럼명은 스키마 설계 시 `@@map`/`@map`으로 snake_case로 매핑한다.
- **폴더 구조 기준**: 폴더-바이-타입(pages/components/hooks/...)으로 시작. 기능이 많아져서 관리가 힘들어지면 그때 폴더-바이-피처로 전환을 검토한다 (지금 미리 나누지 않음).
- **린트/포맷**: 커밋 전 `npm run lint` 통과 확인. 포맷은 prettier 기본 설정(`semi: false`, `singleQuote: true`) 사용.
- **환경변수**: `.env`는 절대 커밋하지 않는다 (`.gitignore`에 이미 포함). 새 환경변수를 추가하면 `.env.example`에도 같이 추가한다.
- **화면/디자인 작업**: 새 화면이나 컴포넌트, 색상/레이아웃을 다룰 때는 반드시 `DESIGN.md` 또는 `woorigyeol-design` skill을 먼저 확인한다. (룸메이트=민트, 과팅=핑크/코랄, 공통=크림/코랄 규칙)

## 아직 더 정해야 할 것 (개발 시작 전 논의 필요)

- [ ] **DB 스키마 설계** — User, HobbyTest, PersonalityTest, Match 등 실제 테이블/관계 설계 (현재 `schema.prisma`는 모델 없이 비어 있음)
- [ ] **학교 이메일(.ac.kr) 인증 방식** — 실제 메일 발송(SMTP/SendGrid 등)까지 구현할지, MVP에서는 형식 검증만 하고 mock 처리할지
- [ ] **JWT 저장 위치** — 프론트에서 localStorage vs httpOnly 쿠키 (보안/구현 난이도 트레이드오프)
- [ ] **프로필 사진 업로드 여부** — DESIGN.md 상 매칭 리스트 아바타는 단색 원형이라 사진 업로드가 필요 없어 보이는데, 실제로 사진을 받을지 확정 필요 (필요하면 multer + 저장소 결정 추가)
- [ ] **API 응답 포맷 표준** — 성공/에러 응답 공통 envelope(예: `{ data }` / `{ error }`) 정의
- [ ] **배포 대상** — README에는 Vercel/Netlify(프론트) + Railway/Render(백엔드) 언급됨. MySQL은 어디에 호스팅할지(Railway MySQL, PlanetScale 등) 미정
- [ ] **CORS 허용 origin** — 배포 도메인이 정해지면 `cors()` 설정을 와일드카드에서 구체적 origin으로 좁히기
- [ ] **매칭 알고리즘 실행 방식** — 요청 시 즉시 계산(on-demand)할지, 배치로 주기 실행할지
- [ ] **채팅 폴링 주기** — README에 "폴링 방식(당근마켓 참고)"라고만 되어 있음. 몇 초 간격으로 폴링할지 등 세부 사양 필요
- [ ] **자동화 테스트 도입 여부** — 4주 일정상 자동 테스트 없이 수동 QA로 갈지, 최소한의 API 스모크 테스트(Vitest/Jest + supertest)라도 넣을지
