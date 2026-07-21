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
| `ENCRYPTION_KEY` | ✅ | 상담 PII AES-256-GCM 키 (32바이트 base64) |
| `PHONE_HMAC_PEPPER` | ✅ | 전화번호 HMAC pepper |

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

## 상담 신청 개인정보 암호화

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
