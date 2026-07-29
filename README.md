# Career Mission AI

배포 URL: https://career-mission-ai.vercel.app/

Career Mission AI는 취업 준비생이 현재 스펙과 목표 직무를 입력하면 AI가 준비도를 분석하고, 맞춤형 미션, 결과물 피드백, 포트폴리오 초안까지 이어 주는 커리어 미션 관리 서비스입니다.

기존 취업 준비는 스펙 기록, 채용 공고 탐색, 프로젝트 수행, 포트폴리오 정리가 서로 분리되어 흐름이 끊기기 쉽습니다. 이 서비스는 사용자의 현재 상태를 기준으로 부족한 부분을 분석하고, 실제 포트폴리오에 넣을 수 있는 작은 미션을 추천한 뒤, 제출 결과물이 미션에 맞는지 검토해 포트폴리오 초안으로 연결합니다.

```txt
스펙 등록 -> AI 준비도 분석 -> 미션 추천 -> 미션 수행/제출 -> AI 피드백 -> 포트폴리오 초안 -> 마이페이지 이력
```

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| 프론트엔드 | React 19, Vite, React Router |
| 백엔드 | Node.js, Express |
| DB | PostgreSQL, Prisma 7, Prisma Pg Adapter |
| 인증 | Firebase Auth, JWT, 이메일 인증 |
| AI | OpenAI Responses API |
| 외부 데이터 | CareerNet API, Q-Net 공공데이터 API, fallback 데이터 |
| 메일 | SMTP/Nodemailer, Resend 설정 지원 |

## 주요 흐름

1. 사용자가 회원가입하고 이메일 인증을 완료합니다.
2. `/specs`에서 목표 직무, 학년, 학점, 프로젝트, 활동, 기술을 등록합니다.
3. `/analysis`에서 AI 분석을 실행하고 준비도, 강점, 보완 우선순위를 확인합니다.
4. `/mission`에서 목표 직무와 스펙에 맞는 미션 세트를 받습니다.
5. `/mission/:id`에서 체크리스트를 수행하고 진행 상태를 저장합니다.
6. `/upload`에서 결과물 링크나 파일을 제출합니다.
7. `/feedback`에서 AI 피드백과 미션 적합도를 확인합니다.
8. 적합도가 낮지 않으면 `/portfolio`에서 포트폴리오 초안을 생성합니다.
9. `/me`에서 이전 미션 제출 이력을 확인하고 다시 제출할 수 있습니다.

## 주요 기능

### 스펙 등록

사용자는 목표 직무와 현재 스펙을 입력합니다.

- 목표 직무
- 학년
- 학점
- 자격증
- 이수 과목
- 프로젝트 경험
- 대외활동 또는 인턴 경험
- 보유 기술과 사용 도구

필수 입력값은 목표 직무, 학년, 학점, 프로젝트, 활동입니다. 기술과 자격증은 선택값이지만 분석과 미션 추천에 반영됩니다.

### AI 준비도 분석

저장된 스펙을 기준으로 준비도 분석을 실행합니다. 백엔드는 분석 전에 필수 스펙이 모두 입력되었는지 확인하고, 동일한 스펙 기준의 최신 분석 결과가 있으면 재사용합니다.

분석 결과에는 준비도 점수, 목표 직무 적합도, 포트폴리오 준비도, 번아웃 위험도, 강점, 보완점, 추천 준비 방향이 포함됩니다.

### 미션 추천과 진행 저장

미션은 전공, 목표 직무, 보유 기술을 기준으로 추천됩니다. 이미 제출한 미션은 추천 목록에서 제외되고, 현재 미션 세트를 모두 제출하면 다음 후보가 열리는 구조입니다.

미션 상세 화면에서는 체크리스트 진행 상태를 저장합니다.

| 상태 | 조건 |
| --- | --- |
| `pending` | 체크한 항목 없음 |
| `in_progress` | 일부 항목 체크 |
| `completed` | 체크리스트 완료 |
| `submitted` | 결과물 제출 |

### 결과물 제출과 AI 피드백

사용자는 미션 결과물을 공개 URL, 텍스트/코드 파일, 이미지, PDF로 제출할 수 있습니다. 파일 업로드는 기본 5MB까지 허용하며 `SUBMISSION_FILE_MAX_BYTES`로 조정할 수 있습니다.

AI 피드백은 결과물이 미션 요구사항에 맞는지 `high`, `medium`, `low` 단계로 판단합니다. `low`이면 포트폴리오 생성 버튼을 숨기고, 백엔드에서도 `/api/portfolio/latest` 요청을 `422`로 차단합니다.

### 포트폴리오 초안

피드백 적합도가 낮지 않으면 제출물과 피드백을 바탕으로 포트폴리오 초안을 생성합니다. 초안에는 프로젝트 제목, 문제 정의, 접근 방식, 사용 역량, 결과물 링크/파일, 결과 요약, 면접에서 말할 수 있는 문장, 배운 점이 포함됩니다.

## 데이터 흐름

```txt
React 화면
  -> requestAuthJson()
Express API
  -> requireAuth
Service Layer
  -> Prisma Client
PostgreSQL / Supabase
```

AI가 필요한 단계에서는 백엔드 서비스 레이어에서만 OpenAI API를 호출합니다.

```txt
UserSpec -> analysisService -> OpenAI -> AnalysisResult
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
| 헬스체크 | `GET` | `/api/health` |

## 디렉터리 구조

```txt
AI_agent/
  frontend/
    src/
      pages/                 # 화면 단위 컴포넌트
      components/            # 공통 UI
      features/auth/         # 인증 API, 세션 저장, Firebase 클라이언트
      features/career/       # 스펙, 분석, 미션, 제출, 피드백 API
      data/                  # 미션과 화면 데이터
      router.js              # 라우트 상수와 이동 헬퍼
    package.json

  backend/
    src/
      routes/                # Express 라우트
      services/              # 비즈니스 로직
      middleware/            # 인증 미들웨어
      db/                    # Prisma Client
      config/                # 환경변수 로딩
      app.js
    prisma/
      schema.prisma
      migrations/
    package.json

  docs/
    api-spec.md
    architecture-data-flow.md
    demo-mismatched-submission.md
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

프론트엔드는 `VITE_API_BASE_URL`과 Firebase Web App 설정이 필요합니다. 백엔드는 최소 `DATABASE_URL`, `JWT_SECRET`, Firebase Admin 설정, 메일 발송 설정이 필요합니다. OpenAI와 외부 API 키가 없으면 일부 기능은 fallback 경로로 동작합니다.

### 3. Prisma Client 생성

```bash
npm --prefix backend run db:generate
```

### 4. 백엔드 실행

```bash
npm --prefix backend run dev
```

헬스체크:

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

## 테스트

프론트엔드:

```bash
npm --prefix frontend run lint
npm run build
```

백엔드 단위 테스트:

```bash
npm --prefix backend test
```

DB 통합 테스트는 실제 테스트 DB에 데이터를 만들었다가 제거합니다.

PowerShell:

```powershell
$env:RUN_INTEGRATION_TESTS="1"
$env:OPENAI_FEEDBACK_ENABLED="false"
npm.cmd --prefix backend test
Remove-Item Env:\RUN_INTEGRATION_TESTS
Remove-Item Env:\OPENAI_FEEDBACK_ENABLED
```

## 배포

### Vercel

```txt
Root Directory: AI_agent/frontend
Build Command: npm run build
Output Directory: dist
```

주요 환경변수:

```env
VITE_API_BASE_URL=https://your-render-api.example.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

### Render

```txt
Root Directory: AI_agent/backend
Build Command: npm install && npm run db:generate
Start Command: npm start
```

주요 환경변수는 `AI_agent/backend/.env.example`을 기준으로 설정합니다.

## 현재 제약

- 파일 업로드는 별도 오브젝트 스토리지가 아니라 DB에 data URL 형태로 저장합니다. 실제 서비스에서는 S3 또는 Supabase Storage 분리가 필요합니다.
- 미션 추천은 규칙 기반 트랙 추론과 정렬을 사용합니다. 클릭/완료 데이터를 학습한 개인화 추천은 아직 포함하지 않습니다.
- OpenAI 호출 실패 시 fallback 피드백으로 대체합니다.
- 결제, 알림, 요금제 기능은 MVP 범위에 포함하지 않았습니다.

## 데모 시나리오

```txt
회원가입/이메일 인증
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

부적합 결과물 데모는 `AI_agent/docs/demo-mismatched-submission.md`를 사용할 수 있습니다. 예를 들어 업무 프로세스 개선 제안서 미션에 카페 이벤트 홍보 기획안을 제출하면 `missionFit.level`이 `low`로 판정되고 포트폴리오 반영이 차단됩니다.
