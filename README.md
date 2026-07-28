
# Career Mission AI

배포 URL: https://career-mission-ai.vercel.app/

취업 준비생의 스펙과 목표 직무를 바탕으로 **AI 분석 → 맞춤 미션 → 결과물 피드백 → 포트폴리오 정리**까지 이어주는 커리어 미션 관리 서비스입니다.

기존 취업 준비 도구는 스펙을 기록하거나 채용 공고를 찾는 데서 끝나는 경우가 많습니다. Career Mission AI는 사용자가 지금 가진 경험을 입력하면, 목표 직무에 맞춰 부족한 부분을 분석하고, 실제 포트폴리오로 남길 수 있는 작은 미션을 추천합니다.

```
스펙 등록 → AI 준비도 분석 → 미션 추천 → 미션 수행/제출 → AI 피드백 → 포트폴리오 초안 → 마이페이지 이력
```

이 프로젝트의 핵심은 “좋은 말로 조언하기”가 아니라, 사용자가 실제로 제출한 결과물이 미션과 맞는지 확인하고, 포트폴리오에 반영할 수 있는 형태로 정리하는 것입니다.

---

## 기술 스택

| 영역 | 스택 |
| --- | --- |
| 프론트엔드 | React 19, Vite, React Router |
| 백엔드 | Node.js, Express |
| DB | PostgreSQL, Prisma 7, Prisma Pg Adapter |
| 인증 | JWT, 이메일 인증 |
| AI | OpenAI Responses API |
| 외부 데이터 | CareerNet API, Q-Net 공공데이터 API, fallback 데이터 |
| 메일 | SMTP, Nodemailer |

---

## 핵심 사용자 흐름

1. 사용자가 회원가입을 하고 이메일 인증을 완료합니다.
2. 목표 직무, 학년, 학점, 프로젝트, 활동, 기술 등을 `/specs`에서 등록합니다.
3. `/analysis`에서 AI 분석을 실행해 준비도, 강점, 보완 우선순위를 확인합니다.
4. `/mission`에서 목표 직무와 스펙에 맞는 미션 세트를 받습니다.
5. `/mission/:id`에서 체크리스트를 수행하고 진행 상태를 저장합니다.
6. `/upload`에서 결과물 링크나 파일을 제출합니다.
7. `/feedback`에서 AI 피드백과 미션 적합도를 확인합니다.
8. 적합도가 낮지 않으면 `/portfolio`에서 포트폴리오 초안을 생성합니다.
9. `/me`에서 이전 미션 제출 이력을 확인하고 다시 제출할 수 있습니다.

화면 흐름은 단순하지만, 각 단계는 서버와 DB에 연결되어 있습니다. 스펙, 분석 결과, 미션 진행률, 제출물, 피드백, 포트폴리오 초안은 모두 사용자 기준으로 저장됩니다.

---

## 주요 기능

### 1. 스펙 등록과 목표 직무 설정

사용자는 목표 직무와 현재 스펙을 입력합니다.

- 목표 직무
- 학년
- 학점
- 자격증
- 어학 점수
- 프로젝트 경험
- 대외활동 / 인턴 경험
- 보유 기술 / 활용 도구

필수 입력값은 목표 직무, 학년, 학점, 프로젝트, 활동입니다. 기술과 자격증은 선택값이지만 분석과 미션 추천에 반영됩니다.

스펙은 `UserSpec` 테이블에 사용자별로 하나만 저장됩니다. 다시 저장하면 기존 레코드를 갱신합니다.

### 2. AI 준비도 분석

분석은 저장된 스펙을 기준으로 실행됩니다.

백엔드는 분석 전에 필수 스펙이 모두 입력되었는지 검사합니다. 이미 최신 스펙 기준으로 분석된 결과가 있으면 기존 결과를 재사용하고, 스펙이 바뀌었으면 새 분석을 생성합니다.

분석 결과는 다음 형태로 저장됩니다.

- 준비도 점수
- 목표 직무
- 직무 적합도
- 포트폴리오 준비도
- 번아웃 위험도
- 강점
- 보완할 점
- 추천 준비 방향

이 결과는 `AnalysisResult`에 누적 저장됩니다.

### 3. 미션 추천

미션은 사용자의 전공, 목표 직무, 보유 기술을 바탕으로 추천됩니다.

추천 로직은 현재 버전에서 다음 방식으로 동작합니다.

1. 전공, 목표 직무, 기술 텍스트를 기반으로 커리어 트랙을 추론합니다.
2. 미션의 `tracks`, `roles`와 비교해 점수를 계산합니다.
3. 점수가 있는 미션을 우선 노출합니다.
4. 매칭 결과가 없으면 범용 미션을 fallback으로 보여줍니다.
5. 이미 제출 완료한 미션은 추천 목록에서 제외합니다.
6. 현재 세트 4개를 제출하면 다음 미션 세트가 자동으로 열립니다.

즉, 미션 추천은 “한 번 보여주고 끝”이 아니라 제출 이력을 기준으로 다음 후보를 계속 열어주는 방식입니다.

### 4. 미션 진행률 저장

미션 상세 화면에서는 단계별 체크리스트를 저장합니다.

진행 상태는 `UserMission`에 저장됩니다.

| 상태 | 조건 |
| --- | --- |
| `pending` | 체크한 항목이 없음 |
| `in_progress` | 일부 항목을 체크함 |
| `completed` | 체크리스트를 모두 체크함 |
| `submitted` | 결과물을 제출함 |

이미 제출한 미션은 진행 상태를 다시 저장해도 `submitted` 상태를 유지합니다.

### 5. 결과물 제출

사용자는 미션 결과물을 링크나 파일로 제출할 수 있습니다.

- 공개 URL
- 텍스트 / 코드 파일
- 이미지
- PDF

제출 파일은 기본 5MB까지 허용됩니다. 설정값 `SUBMISSION_FILE_MAX_BYTES`로 제한을 바꿀 수 있습니다.

결과물은 별도 파일 스토리지로 분리하지 않고 현재는 `UserMission`에 URL, 파일명, MIME 타입, data URL을 저장합니다. MVP에서는 DB 기반 제출 흐름을 우선 검증하기 위한 선택입니다.

### 6. AI 피드백과 미션 적합도 판정

제출물이 항상 미션에 맞는 것은 아닙니다. 예를 들어 “업무 프로세스 개선 제안서 작성” 미션에 “카페 신메뉴 SNS 홍보 기획안”을 제출할 수 있습니다.

그래서 피드백 생성 시 `missionFit`을 함께 저장합니다.

```json
{
  "level": "low",
  "label": "낮음",
  "canCreatePortfolio": false,
  "reasons": [
    "제출물이 업무 프로세스 개선보다 홍보 콘텐츠 기획에 가깝습니다.",
    "현재 흐름, 병목, 개선안, 우선순위 근거가 충분히 확인되지 않습니다."
  ]
}
```

적합도는 세 단계입니다.

| level | 의미 | 포트폴리오 반영 |
| --- | --- | --- |
| `high` | 미션 요구사항을 충분히 충족 | 가능 |
| `medium` | 일부 보완 필요 | 가능 |
| `low` | 미션과 맞지 않음 | 차단 |

`low`이면 프론트에서 포트폴리오 이동 버튼을 숨기고 다시 제출을 유도합니다. 백엔드에서도 `/api/portfolio/latest` 생성 요청을 `422`로 차단합니다.

프론트 차단만 믿지 않고 서버에서 한 번 더 막는 이유는, 잘못된 결과물이 포트폴리오 이력에 쌓이는 것을 방지하기 위해서입니다.

### 7. 포트폴리오 초안 생성

피드백 적합도가 낮지 않으면 제출물과 피드백을 바탕으로 포트폴리오 초안을 생성합니다.

초안에는 다음 항목이 포함됩니다.

- 프로젝트 제목
- 문제 정의
- 접근 방식
- 사용 역량
- 결과물 링크 / 파일
- 결과 요약
- 면접에서 말할 수 있는 문장
- 포트폴리오 반영 포인트
- 배운 점

포트폴리오는 완성본 자동 생성이 아니라, 사용자가 자기소개서나 노션 포트폴리오에 옮겨 적을 수 있는 초안 역할을 합니다.

### 8. 마이페이지 미션 이력

마이페이지에서는 이전에 제출한 미션 이력을 볼 수 있습니다.

- 미션 제목
- 제출일
- 피드백 생성 여부
- 포트폴리오 생성 여부
- 결과물 링크 열기
- 제출 파일 다운로드
- 다시 제출

추천 목록에서는 제출 완료 미션이 빠지지만, 이력은 `/me`에서 계속 확인할 수 있습니다.

---

## 데이터 흐름

```
React 화면
  ↓ requestAuthJson()
Express API
  ↓ requireAuth
Service Layer
  ↓ Prisma Client
PostgreSQL / Supabase
```

AI가 필요한 단계에서는 서비스 레이어에서 OpenAI API를 호출합니다.

```
UserSpec → analysisService → OpenAI → AnalysisResult
UserMission submission → feedbackService → OpenAI/fallback → UserMission.feedback
UserMission feedback → portfolioService → UserMission.portfolioDraft
```

외부 검색 API는 백엔드에서만 호출합니다. 프론트에 공공데이터 키나 OpenAI 키가 노출되지 않도록 하기 위한 구조입니다.

---

## DB 스키마 요약

```
User
 ├─ UserSpec
 ├─ AnalysisResult[]
 └─ UserMission[]
        └─ Mission
```

### User

회원 계정과 인증 정보를 저장합니다.

- 이메일
- 아이디
- 이름
- 비밀번호 해시
- 학교
- 전공
- 이메일 인증 여부
- 인증 토큰

### UserSpec

사용자의 목표 직무와 스펙 정보를 저장합니다. 사용자당 하나의 스펙 레코드를 가집니다.

### AnalysisResult

AI 분석 결과를 누적 저장합니다. 스펙이 바뀌면 새 분석을 만들 수 있습니다.

### Mission

미션 메타 정보를 저장합니다. 사용자가 진행하거나 제출한 미션은 upsert로 DB에 들어갑니다.

### UserMission

사용자별 미션 진행 상태와 제출 결과를 저장합니다.

- 상태
- 체크한 항목
- 제출 URL
- 제출 파일 정보
- AI 피드백 JSON
- 포트폴리오 초안 JSON

---

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

---

## 디렉터리 구조

```txt
AI_agent/
├─ frontend/
│  ├─ src/
│  │  ├─ pages/                 # 화면 단위 컴포넌트
│  │  ├─ components/             # 공통 UI
│  │  ├─ features/auth/          # 인증 API, 세션 저장
│  │  ├─ features/career/        # 스펙, 분석, 미션, 제출, 피드백 API
│  │  ├─ data/                   # 미션/홈 화면 데이터
│  │  └─ router.js               # 라우트 상수와 이동 헬퍼
│  └─ package.json
│
├─ backend/
│  ├─ src/
│  │  ├─ routes/                 # Express 라우트
│  │  ├─ services/               # 비즈니스 로직
│  │  ├─ middleware/             # 인증 미들웨어
│  │  ├─ db/                     # Prisma Client
│  │  ├─ config/                 # 환경변수 로딩
│  │  └─ app.js
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  └─ package.json
│
└─ docs/
   ├─ api-spec.md
   ├─ architecture-data-flow.md
   └─ demo-mismatched-submission.md
```

---

## 로컬 실행

### 1. 의존성 설치

```bash
cd AI_agent
npm --prefix frontend install
npm --prefix backend install
```

### 2. 환경변수 설정

프론트:

```bash
cp frontend/.env.example frontend/.env
```

백엔드:

```bash
cp backend/.env.example backend/.env
```

백엔드 `.env`에는 최소한 다음 값이 필요합니다.

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://...
JWT_SECRET=replace_with_a_long_random_secret
OPENAI_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Career Mission AI <...>"
```

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

### 5. 프론트 실행

```bash
npm --prefix frontend run dev
```

기본 주소:

```txt
http://localhost:5173
```

---

## 테스트

### 프론트

```bash
npm --prefix frontend run lint
npm run build
```

### 백엔드 단위 테스트

```bash
npm --prefix backend test
```

### DB 통합 테스트

통합 테스트는 실제 DB에 테스트 데이터를 만들었다가 삭제합니다.

PowerShell:

```powershell
$env:RUN_INTEGRATION_TESTS="1"
$env:OPENAI_FEEDBACK_ENABLED="false"
npm.cmd --prefix backend test
Remove-Item Env:\RUN_INTEGRATION_TESTS
Remove-Item Env:\OPENAI_FEEDBACK_ENABLED
```

검증된 결과:

```txt
tests 22
pass 22
fail 0
skipped 0
```

`OPENAI_FEEDBACK_ENABLED=false`를 쓰는 이유는 통합 테스트에서 외부 AI 호출 지연이나 응답 대기를 피하고, 서버/API/DB 저장 흐름을 안정적으로 검증하기 위해서입니다.

---

## 배포 준비 메모

프론트는 Vercel, 백엔드는 Render 배포를 기준으로 준비했습니다.

### Vercel

```txt
Root Directory: AI_agent/frontend
Build Command: npm run build
Output Directory: dist
```

필요한 환경변수:

```env
VITE_API_BASE_URL=https://your-render-api.example.com
VITE_GITHUB_URL=...
VITE_DISCORD_URL=...
VITE_CONTACT_EMAIL=...
```

### Render

```txt
Root Directory: AI_agent/backend
Build Command: npm install && npm run db:generate
Start Command: npm start
```

필요한 환경변수:

```env
PORT
FRONTEND_ORIGIN
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_FEEDBACK_ENABLED
OPENAI_FILE_FEEDBACK_ENABLED
SUBMISSION_FILE_MAX_BYTES
CAREER_NET_API_KEY
PUBLIC_DATA_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
SEARCH_CACHE_TTL_MS
```

---

## 현재 한계

- 포트폴리오 초안은 가장 최근 제출물을 기준으로 생성합니다. 제출 이력은 마이페이지에서 볼 수 있지만, 여러 포트폴리오 초안을 개별 관리하는 기능은 아직 없습니다.
- 파일 업로드는 별도 오브젝트 스토리지 대신 DB에 data URL로 저장합니다. 실제 서비스에서는 S3, Supabase Storage 같은 파일 스토리지 분리가 필요합니다.
- 미션 추천은 규칙 기반 트랙 추론과 정렬입니다. 클릭/완료 데이터를 학습해 개인화하는 단계는 아직 아닙니다.
- AI 피드백은 OpenAI 호출 실패 시 fallback 피드백으로 대체됩니다. 데모 안정성을 위해 fallback 경로도 유지합니다.
- 결제, 크레딧, 요금제 기능은 설계 후보로만 남아 있고 MVP 범위에는 포함하지 않았습니다.

---

## 데모에서 보여줄 핵심 흐름

```txt
회원가입/이메일 인증
→ 로그인
→ 스펙 등록
→ AI 분석
→ 미션 추천
→ 미션 체크리스트 진행
→ 결과물 제출
→ 미션 적합도와 AI 피드백 확인
→ 포트폴리오 초안 생성
→ 마이페이지에서 이전 미션 이력 확인
```

부적합 결과물 데모는 `docs/demo-mismatched-submission.md`를 사용하면 됩니다. “업무 프로세스 개선 제안서” 미션에 카페 신메뉴 홍보 기획안을 제출하면 `미션 적합도: 낮음`으로 판정되고 포트폴리오 반영이 차단됩니다.
