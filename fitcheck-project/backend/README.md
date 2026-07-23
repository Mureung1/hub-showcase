# FitCheck Backend

Express API 서버 (TypeScript) + Supabase(Postgres).

## 시작하기

```bash
cd fitcheck-project/backend
npm install
cp .env.example .env
npm run dev
```

기본 포트: **5001** (macOS AirPlay가 5000을 쓰는 경우가 많음)

```bash
# DB 마이그레이션 (최초 1회 및 schema 변경 시)
npm run db:migrate
```

API Base URL: `http://localhost:5001/api/v1`  
상세 명세: [`docs/API.md`](./docs/API.md)

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `PORT` | | 서버 포트 (기본 5001) |
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role 키 (서버 전용) |
| `SUPABASE_DB_PASSWORD` 또는 `DATABASE_URL` | | `npm run db:migrate`용 |
| `NAVER_SEARCH_CLIENT_ID` | | 지역 검색 API |
| `NAVER_SEARCH_CLIENT_SECRET` | | 지역 검색 API |
| `ENCRYPTION_KEY` | ✅* | 상담 PII AES-256-GCM 키 (32바이트 base64) |
| `PHONE_HMAC_PEPPER` | ✅* | 전화번호 HMAC pepper |
| `GEMINI_API_KEY` | | 식단 사진 AI 분석 ([Google AI Studio](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | | Gemini 모델명 (기본 `gemini-flash-latest`) |

\* 상담 API(`consult_requests`) 사용 시 필수. 식단·프로필만 쓸 때도 `.env.example` 기준으로 함께 두는 것을 권장합니다.

키 생성:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # PHONE_HMAC_PEPPER
```

> `.env`는 Git에 커밋하지 않습니다. `.env.example`만 커밋 대상입니다.

## 디렉터리

```
backend/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middleware/      # Auth (Supabase JWT)
│   └── utils/
│       └── fieldEncryption.ts
├── supabase/migrations/   # DDL — Git 커밋 O
├── scripts/
│   └── apply-migrations.mjs
└── docs/API.md
```

---

## 기능별 데이터 보호

프론트 → Express → Supabase 로 저장되는 모든 요청은 **HTTPS(TLS)** 로 전송됩니다.  
그 외 **DB·Storage에 넣기 전/후 앱 레벨 암호화**는 **기능(도메인)마다 다릅니다.**

### 요약

| 기능 | API / 저장소 | 앱 레벨 암호화 | 암·복호화 시점 | 비고 |
|------|----------------|----------------|----------------|------|
| **전송 구간** | 프론트 ↔ Express | TLS (HTTPS) | 네트워크 구간 | Vite dev는 `/api` 프록시도 동일 |
| **로그인·회원** | Supabase Auth | 비밀번호 **해시** (Supabase) | 가입·로그인 시 | JWT는 Supabase가 서명·발급 |
| **프로필** | `profiles` | ❌ 없음 (평문) | — | `GET/PATCH /me` |
| **식단** | `meal_logs` | ❌ 없음 (평문) | — | `memo`, `macros`, `ai_feedback` 등 |
| **식단 AI** | Gemini Vision API | — | `POST /meals` 저장 직전 | `GEMINI_API_KEY` 없으면 AI 생략, 식단만 저장 |
| **식단 사진** | Storage `meal-images` | ❌ 없음 | — | public bucket, URL을 `image_url`에 저장 |
| **상담 신청** | `consult_requests` | ✅ **AES-256-GCM** (PII) | **INSERT 직전** encrypt, **SELECT 직후** decrypt | 아래 [상담 PII 상세](#상담-신청-개인정보-암호화) |
| **헬스장·강좌·트레이너** | `gyms`, `courses`, `trainers` | ❌ 없음 (평문) | — | 공개 조회 API |

> **앱 레벨 암호화**란 Express 코드(`fieldEncryption.ts` 등)에서 평문 ↔ ciphertext 변환을 하는 것을 말합니다.  
> 식단·프로필 등은 **인증(JWT) + DB 접근 통제**로 보호하고, 필드 자체는 평문입니다.

### 공통 흐름

```
[암호화 없는 기능 — 식단, 프로필, gyms …]

Client ──HTTPS(평문 JSON)──▶ Express ──평문──▶ Supabase Postgres / Storage


[상담 PII — consult_requests 만]

Client ──HTTPS(평문 JSON)──▶ Express ──encryptField()──▶ Supabase (ciphertext)
                              ▲
                              └── GET 시 decryptField() 후 응답
```

### 기능별 설명

#### 로그인·인증 (`requireAuth`)

- 클라이언트: Supabase Auth로 로그인 → **access token(JWT)** 획득
- API 호출: `Authorization: Bearer <token>`
- 백엔드: `auth.middleware.ts`에서 JWT 검증 → `req.userId` 설정
- 비밀번호 원문은 백엔드·DB에 저장하지 않음 (Supabase Auth 영역)

#### 식단 (`/api/v1/meals`, `/api/v1/uploads/meals`)

- `POST /uploads/meals`: multipart 파일 → Storage 업로드 → **public URL** 반환
- `POST /meals`: JSON 평문 → `meal_logs` row INSERT
- `GET /meals`: DB 평문 그대로 JSON 응답 (본인 `user_id`만)

#### 프로필 (`/api/v1/me`)

- `name`, `phone` 등 **평문** 저장·조회
- 상담 PII와 달리 `encryptField()` 미적용

#### 공개 데이터 (`/gyms`, `/courses`, …)

- 인증 없이 조회 가능한 마스터 데이터
- 평문 저장

---

## 헬스장 매칭 점수

PT 강좌 시청 기록 + 사용자 위치를 바탕으로 주변 헬스장에 **0~100점** 매칭 점수를 부여합니다.  
**Gemini 등 AI가 아닌**, `src/services/gymRecommendation.service.ts`의 **규칙 기반(rule-based) 계산**입니다.

### 점수 구성 (최대 100점)

| 점수 구성 | 강좌 시청 전 | 강좌 시청 후 |
|-----------|-------------|-------------|
| **거리 (40점)** | ✅ 반영 | ✅ 반영 |
| **트레이너 specialty (40점)** | ❌ 0점 | ✅ 반영 |
| **헬스장 타입 (20점)** | ❌ 0점 | ✅ 반영 |
| **최대** | **약 35~40점** | **최대 100점** |

### 항목별 설명

| 항목 | 최대 | 기준 |
|------|------|------|
| 거리 | 40점 | 가까울수록 높음 (`1 - distanceKm / radiusKm`) |
| 트레이너 specialty | 40점 | 시청한 강좌의 `goal` / `body_part`와 트레이너 `specialty` 키워드 매칭 |
| 헬스장 타입 | 20점 | 예: 입문·초급 → `1인 PT숍`, 벌크업·근력 → `골목 헬스장` |

### 관련 API

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/v1/courses/:id/watch` | 강좌 시청 기록 저장 (인증 필요) |
| `GET` | `/api/v1/me/course-activity` | 시청 기록 + 관심 프로필 조회 (인증 필요) |
| `GET` | `/api/v1/gyms/recommended?lat=&lng=&radiusKm=` | 매칭 점수순 헬스장 목록 (인증 시 시청 기록 반영) |

시청 기록은 `course_views` 테이블에 저장됩니다 (`20260723000000_course_views.sql`).

---

상담 신청(`consult_requests`) PII는 **애플리케이션 레벨 필드 암호화**로 보호합니다.  
암·복호화는 **이 백엔드에서만** 수행합니다.

### 보호 대상

| DB 컬럼 | 처리 | 비고 |
|---------|------|------|
| `name`, `phone`, `topic`, `topic_detail`, `memo` | AES-256-GCM | |
| `phone_hmac` | HMAC-SHA256 | 조회·중복 확인용 (원문 복원 불가) |
| `preferred_date`, `gym_id`, `status` 등 | 평문 | PII 아님 / FK·필터용 |

### AES-256-GCM (필드 암호화)

- **종류:** 대칭키 인증 암호화 (AEAD)
- **키:** `ENCRYPTION_KEY` (`backend/.env`)
- **IV:** 요청마다 랜덤 12바이트
- **저장 형식:** `v1:<IV>:<AuthTag>:<Ciphertext>` (base64url)
- **legacy:** `v1:` prefix 없으면 평문으로 간주 (기존 row 호환)

### HMAC-SHA256 (전화번호)

- **키:** `PHONE_HMAC_PEPPER`
- **입력:** 숫자만 추출 (`010-1234-5678` → `01012345678`)
- **저장:** hex → `phone_hmac` 컬럼

### API 노출 정책

| API | PII |
|-----|-----|
| `POST /consult-requests` | 평문 (신청 직후) |
| `GET /consult-requests/me` | phone 마스킹 (`010-****-5678`) |
| `GET /consult-requests/:id` | 본인 — 전체 복호화 |

### 데이터 흐름

```
Client ──HTTPS──▶ Express ──encrypt──▶ Supabase
                      │
                      ├─ encryptField()  name, phone, topic, memo ...
                      ├─ hashPhone()     phone_hmac
                      └─ decryptField()  GET 시 복호화
```

### Git / 배포

- **커밋 O:** `supabase/migrations/*.sql`, `.env.example`
- **커밋 X:** `.env`, DB 덤프·백업 SQL
- dev / prod **키 분리** 권장
