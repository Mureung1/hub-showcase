# 오늘의 냉장고 개발 환경 및 협업 가이드

> Notion에 이 문서 전체를 복사하면 제목, 표, 체크리스트와 코드 블록 구조를 그대로 활용할 수 있습니다.

## 1. 목적과 기술 구성

프런트엔드와 API 서버를 같은 방식으로 실행하고, 사람과 AI Agent가 일관된 규칙으로 개발하기 위한 기준입니다.

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프런트엔드 | React + Vite | 기존 구현 유지, 빠른 개발 서버와 단순한 빌드 |
| 백엔드 | Node.js + Express | 작은 REST API를 빠르게 구성하기 적합 |
| 입력 검증 | Zod | 환경변수와 API 입력을 같은 방식으로 검증 |
| 로그 | Pino + pino-http | 검색 가능한 JSON 로그와 요청 로그 제공 |
| 정적 분석 | oxlint | 기존 설정을 유지하면서 빠르게 검사 |
| 패키지 관리 | npm | 기존 `package-lock.json`과 일치 |
| 데이터 저장 | Supabase PostgreSQL | 브라우저에 비밀키를 노출하지 않고 Express API를 통해 재료 데이터를 영속 저장 |

## 2. 사전 준비

- Git
- Node.js LTS와 npm
- GitHub 게시 작업 시 GitHub CLI(`gh`)

PowerShell에서 `npm.ps1` 실행 정책 오류가 발생하면 정책을 바꾸지 않고 `npm.cmd`를 사용할 수 있습니다.

```powershell
node --version
npm.cmd --version
```

`node`를 찾지 못하면 Node.js LTS 설치 시 PATH 추가를 활성화한 뒤 터미널을 다시 시작합니다.

## 3. 최초 설치 및 실행

```powershell
git clone https://github.com/pkchanghyun-pixel/hub.git
cd hub
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

- 웹: `http://localhost:5173/`
- API 상태: `http://localhost:3000/api/health`
- `npm run dev`는 웹과 API 서버를 함께 실행합니다.

## 4. 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 웹과 API 동시 실행 |
| `npm run dev:web` | Vite 프런트엔드만 실행 |
| `npm run dev:api` | Express API만 watch 모드로 실행 |
| `npm run start` | Express API 일반 실행 |
| `npm run lint` | JavaScript/React 정적 분석 |
| `npm test` | 추천·소비기한·기본 양념 등 핵심 규칙 단위 테스트 |
| `npm run build` | 배포용 프런트엔드 빌드 |
| `npm run preview` | 빌드 결과 로컬 확인 |

## 5. 환경변수

| 변수 | 기본 예시 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | `development` | development/test/production |
| `PORT` | `3000` | Express 서버 포트 |
| `LOG_LEVEL` | `debug` | 최소 출력 로그 레벨 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | API 호출을 허용할 웹 출처 |

`.env`는 커밋하지 않습니다. 키를 추가하면 `.env.example`과 이 표를 함께 수정합니다.

| `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 프로젝트 API URL |
| `SUPABASE_SECRET_KEY` | `your-supabase-secret-key` | 서버 전용 Supabase Secret key |
환경변수는 프로젝트 루트의 `.env` 파일에서 관리합니다.
실제 Supabase Secret key는 `.env.example`이나 Git 저장소에 커밋하지 않습니다.
브라우저 코드에는 Secret key를 사용하지 않습니다.

## 6. 디렉터리 구조

```text
hub/
├─ frontend/               React + Vite 프런트엔드
│  ├─ public/              정적 파일
│  ├─ src/
│  │  ├─ assets/
│  │  ├─ components/       재사용 UI
│  │  ├─ pages/            화면 단위 UI
│  │  ├─ services/         API 호출
│  │  ├─ hooks/
│  │  └─ utils/
│  ├─ index.html
│  └─ vite.config.js
├─ backend/                Express API
│  ├─ config/              환경 설정
│  ├─ controllers/         HTTP 요청·응답
│  ├─ routes/              API 주소
│  ├─ services/            업무 규칙
│  ├─ repositories/        데이터 접근
│  ├─ middleware/
│  └─ lib/                 로거 등 공통 기반
├─ shared/                 프런트엔드·백엔드 공통 규칙
├─ tests/                  단위·통합 테스트
├─ scripts/                검증 및 자동화 스크립트
├─ docs/                   협업 문서
├─ showcase/               프로젝트 대시보드 메타데이터
├─ .env.example
├─ AGENTS.md               Agent 실행 규칙
└─ DESIGN.md               디자인 기준
```

존재하지 않는 폴더는 관련 기능을 추가할 때 생성합니다.

## 7. API 및 오류 규칙

- API 접두사는 `/api`, 리소스는 복수 명사입니다. 예: `/api/ingredients`.
- 오류 형식은 `{ "error": { "code": "CODE", "message": "설명" } }`로 통일합니다.
- 내부 스택과 데이터베이스 오류는 응답에 노출하지 않습니다.
- 개발 중 `/api` 요청은 Vite 프록시가 `localhost:3000`으로 전달합니다.

## 8. 로그 규칙

```js
request.log.info({ ingredientId }, "Ingredient created");
request.log.error({ err, ingredientId }, "Ingredient creation failed");
```

- 시작·종료와 주요 상태 변화: `info`
- 개발 상세 진단: `debug`
- 복구 가능한 문제: `warn`
- 요청 실패와 예외: `error`
- 서비스 지속 불가: `fatal`
- 인증 정보, 쿠키, 비밀번호, 토큰, 개인 정보는 기록하지 않습니다.

## 9. 브랜치와 커밋

```text
feat: add ingredient API
fix: prevent duplicate ingredient names
docs: document local setup
refactor: separate recommendation service
test: cover expiry calculation
chore: update dependencies
```

- 커밋 하나에는 논리적 변경 하나만 포함합니다.
- 푸시 전 `npm run lint`와 `npm run build`를 통과시킵니다.

## 10. 개발 전 결정 체크리스트

- [x] 프런트엔드와 백엔드 기술
- [x] 패키지 관리자와 기본 라이브러리
- [x] 디렉터리 구조
- [x] 환경변수 관리
- [x] API 오류 형식
- [x] 서버 로그와 민감 정보 기준
- [x] 커밋 형식
- [x] 재료 데이터 영속 저장 시점과 DB: Supabase PostgreSQL
- [ ] 로그인 및 사용자 구분 필요 여부
- [ ] 레시피 추천 알고리즘 또는 외부 AI API
- [ ] 배포 플랫폼과 운영 환경변수
- [ ] API 통합 테스트와 CI 범위

미결정 항목은 기능 요구가 확정되는 순서대로 결정하고 이 문서를 갱신합니다.
