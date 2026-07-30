# Career Mission AI

배포 URL: https://career-mission-ai.vercel.app/

Career Mission AI는 취업 준비생이 현재 스펙과 목표 직무를 입력하면 AI가 준비도를 분석하고, 맞춤형 미션을 추천한 뒤, 제출 결과물에 대한 피드백과 포트폴리오 초안까지 이어주는 커리어 미션 관리 서비스입니다.

기존 취업 준비 과정은 스펙 정리, 채용 정보 탐색, 프로젝트 수행, 결과물 피드백, 포트폴리오 작성이 따로 흩어져 있습니다. 이 프로젝트는 사용자의 상태를 기준으로 부족한 부분을 분석하고, 실제 포트폴리오에 넣을 수 있는 작은 미션을 추천하며, 제출 결과물이 미션 요구사항에 맞는지 검토해 포트폴리오 초안으로 연결합니다.

```txt
스펙 등록 -> AI 준비도 분석 -> 미션 추천 -> 미션 수행/제출 -> AI 피드백 -> 포트폴리오 초안 -> 마이페이지 이력
```

## 주요 기능

- Firebase Auth 기반 회원가입, 로그인, 이메일 인증
- 목표 직무, 학년, 학점, 프로젝트, 활동, 기술, 자격증 기반 스펙 등록
- OpenAI Responses API 기반 취업 준비도 분석
- 직무와 스펙에 맞춘 미션 추천 및 진행 상태 저장
- URL, 텍스트/코드 파일, 이미지, PDF 결과물 제출
- 제출 결과물의 미션 적합도 피드백 생성
- 적합한 제출물 기반 포트폴리오 초안 생성
- 마이페이지에서 사용자 정보와 제출 이력 확인
- CareerNet, Q-Net 공공데이터 API 연동 및 fallback 데이터 처리

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| 프론트엔드 | React 19, Vite, React Router |
| 백엔드 | Node.js, Express |
| DB | PostgreSQL, Prisma 7, Prisma Pg Adapter |
| 인증 | Firebase Auth, JWT |
| AI | OpenAI Responses API |
| 외부 데이터 | CareerNet API, Q-Net 공공데이터 API, fallback 데이터 |
| 메일 | SMTP/Nodemailer, Resend |
| 배포 | Vercel, Render |

## 주요 화면

| 경로 | 역할 |
| --- | --- |
| `/` | 서비스 홈 |
| `/signup` | 회원가입 |
| `/login` | 로그인 |
| `/me` | 마이페이지 |
| `/specs` | 스펙 등록 |
| `/analysis` | AI 준비도 분석 |
| `/mission` | 추천 미션 목록 |
| `/mission/:id` | 미션 상세 및 진행 체크 |
| `/upload` | 결과물 제출 |
| `/feedback` | AI 피드백 확인 |
| `/portfolio` | 포트폴리오 초안 확인 |

## 데이터 흐름

```txt
React 화면
  -> frontend/src/features/* API helper
  -> Express route
  -> auth middleware
  -> service layer
  -> Prisma Client
  -> PostgreSQL
```

AI가 필요한 단계에서는 백엔드 서비스 계층에서만 OpenAI API를 호출합니다. 프론트엔드에는 OpenAI API 키를 두지 않습니다.

```txt
UserSpec -> analysisService -> OpenAI/fallback -> AnalysisResult
UserMission submission -> feedbackService -> OpenAI/fallback -> UserMission.feedback
UserMission feedback -> portfolioService -> UserMission.portfolioDraft
```

## 주요 API

| 기능 | Method | Path |
| --- | --- | --- |
| 회원가입 | `POST` | `/api/auth/register` |
| 로그인 | `POST` | `/api/auth/login` |
| 이메일 인증 | `POST` | `/api/auth/verify-email` |
| 내 정보 조회 | `GET` | `/api/auth/me` |
| 스펙 조회 | `GET` | `/api/specs/me` |
| 스펙 저장 | `POST` | `/api/specs` |
| 분석 조회 | `GET` | `/api/analysis/me` |
| 분석 실행 | `POST` | `/api/analysis` |
| 미션 추천 | `GET` | `/api/missions/recommendations` |
| 미션 진행 조회 | `GET` | `/api/missions/:missionId/progress` |
| 미션 진행 저장 | `PATCH` | `/api/missions/:missionId/progress` |
| 제출물 목록 | `GET` | `/api/submissions/me` |
| 제출물 저장 | `POST` | `/api/submissions` |
| 피드백 조회 | `GET` | `/api/feedback/latest` |
| 피드백 생성 | `POST` | `/api/feedback/latest` |
| 포트폴리오 조회 | `GET` | `/api/portfolio/latest` |
| 포트폴리오 생성 | `POST` | `/api/portfolio/latest` |
| 헬스 체크 | `GET` | `/api/health` |

자세한 API 계약은 [AI_agent/docs/api-spec.md](AI_agent/docs/api-spec.md)를 참고합니다.

## 디렉터리 구조

```txt
AI_agent/
  frontend/
    src/
      pages/                 # 화면 단위 컴포넌트
      components/            # 공통 UI와 레이아웃
      features/auth/         # 인증, Firebase, 세션 처리
      features/career/       # 스펙, 분석, 미션, 제출, 피드백 API
      data/                  # 화면/미션 데이터
      router.js              # 라우트 상수와 이동 helper
    package.json

  backend/
    src/
      routes/                # Express routes
      services/              # 비즈니스 로직
      middleware/            # 인증 middleware
      db/                    # Prisma Client
      config/                # 환경변수 로딩
      app.js
      server.js
    prisma/
      schema.prisma
      migrations/
    package.json

  docs/
    api-spec.md
    architecture-data-flow.md
    deployment.md
    file-upload-storage-review.md
    pr-security-agent.md
```

## 로컬 실행

### 1. 의존성 설치

```bash
cd AI_agent
npm --prefix frontend install
npm --prefix backend install
```

### 2. 환경변수 설정

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

프론트엔드는 `VITE_API_BASE_URL`과 Firebase Web App 설정이 필요합니다. 백엔드는 최소한 `DATABASE_URL`, `JWT_SECRET`, Firebase Admin SDK 설정이 필요합니다.

OpenAI, CareerNet, Q-Net 키가 비어 있으면 지원되는 기능은 fallback 데이터 또는 fallback 응답으로 동작합니다.

### 3. Prisma Client 생성

```bash
npm --prefix backend run db:generate
```

### 4. 백엔드 실행

```bash
npm --prefix backend run dev
```

기본 주소:

```txt
http://localhost:4000
```

헬스 체크:

```bash
curl http://localhost:4000/api/health
```

### 5. 프론트엔드 실행

```bash
npm --prefix frontend run dev
```

기본 주소:

```txt
http://localhost:5173
```

PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 `npm.cmd`를 사용합니다.

```powershell
npm.cmd --prefix frontend run dev
npm.cmd --prefix backend run dev
```

## 검증

프론트엔드:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

백엔드:

```bash
npm --prefix backend test
```

통합 테스트는 실제 테스트 DB 데이터를 생성한 뒤 정리합니다.

```powershell
$env:RUN_INTEGRATION_TESTS="1"
$env:OPENAI_FEEDBACK_ENABLED="false"
npm.cmd --prefix backend test
Remove-Item Env:\RUN_INTEGRATION_TESTS
Remove-Item Env:\OPENAI_FEEDBACK_ENABLED
```

최근 확인 기준:

- 프론트엔드 빌드 통과
- 프론트엔드 ESLint 통과
- 백엔드 `node --test` 통과

## 배포

### Vercel Frontend

```txt
Root Directory: AI_agent/frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

주요 환경변수:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
VITE_GITHUB_URL=https://github.com/your-id
VITE_DISCORD_URL=https://discord.com/users/your-id
VITE_CONTACT_EMAIL=your-email@example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

### Render Backend

Render Blueprint는 루트의 [render.yaml](render.yaml)을 사용합니다.

```txt
Service root: AI_agent/backend
Build command: npm ci && npm run db:generate && npx prisma migrate deploy
Pre-deploy command: npx prisma migrate deploy
Start command: npm start
Health check: /api/health
```

주요 환경변수:

```env
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
CAREER_NET_API_KEY=...
PUBLIC_DATA_API_KEY=...
RESEND_API_KEY=...
RESEND_FROM="Career Mission AI <onboarding@resend.dev>"
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Render Free web service는 outbound SMTP 포트가 막힐 수 있으므로 운영 환경에서는 Resend 설정을 우선 사용합니다.

## 현재 제약

- 업로드 파일은 별도 오브젝트 스토리지에 저장하지 않고 DB에 data URL 형태로 저장합니다. 운영 규모가 커지면 S3 또는 Supabase Storage 분리가 필요합니다.
- 미션 추천은 규칙 기반 트랙 분류와 정렬을 사용합니다. 사용자 행동 데이터를 학습하는 개인화 추천은 아직 포함하지 않았습니다.
- OpenAI 호출 실패 시 fallback 분석/피드백으로 대체합니다.
- 결제, 크레딧, 알림, 요금제 기능은 MVP 범위에 포함하지 않았습니다.
- 통합 테스트는 별도 테스트 DB가 준비된 환경에서 실행하는 것을 권장합니다.

## 데모 시나리오

```txt
회원가입 및 이메일 인증
-> 로그인
-> 스펙 등록
-> AI 분석
-> 미션 추천
-> 미션 체크리스트 진행
-> 결과물 제출
-> 미션 적합도와 AI 피드백 확인
-> 포트폴리오 초안 생성
-> 마이페이지에서 이전 미션 이력 확인
```

부적합 결과물 데모에는 [AI_agent/docs/demo-mismatched-submission.md](AI_agent/docs/demo-mismatched-submission.md)를 사용할 수 있습니다. 예를 들어 업무 프로세스 개선 제안 미션에 카페 이벤트 홍보 기획안을 제출하면 `missionFit.level`이 `low`로 판정되고 포트폴리오 반영이 차단됩니다.
