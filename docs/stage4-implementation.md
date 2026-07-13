# 4단계 — 유저 프로필 + 인증 구현

> 상태: 진행 중 (기본 구조 완성, 실제 Supabase Auth 연동 필요)

## 구현된 것

### 백엔드
- ✅ `backend/src/index.ts` — Express 앱 진입점
- ✅ `backend/src/middleware/auth.ts` — JWT 검증 미들웨어
- ✅ `backend/src/routes/auth.ts` — 회원가입/로그인 (프로토타입)
- ✅ `backend/src/routes/profile.ts` — 프로필 CRUD API
- ✅ `backend/.env` — 환경변수 설정

### 프론트엔드
- ✅ `frontend/src/utils/apiClient.ts` — API 클라이언트 + 토큰 관리
- ✅ `frontend/src/pages/ProfileSetup.tsx` — API 연결 + 에러 표시
- ✅ `frontend/.env` — VITE_API_BASE 설정

### 공유 패키지
- ✅ `shared/src/schemas/profile.ts` — Zod 스키마 (이미 존재)

---

## 실행 방법

### 1️⃣ 백엔드 시작

```bash
cd backend
npm install
npm run dev
```

**결과:**
```
🚀 서버 시작: http://localhost:3000
📝 프로필 API: POST http://localhost:3000/api/profile
🔐 인증: Supabase JWT 기반
```

### 2️⃣ 프론트엔드 시작

```bash
cd frontend
npm install
npm run dev
```

**결과:**
- 브라우저 자동 열림: http://localhost:5173
- 프로필 등록 폼 표시

### 3️⃣ API 테스트 (Postman 또는 curl)

**회원가입:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**응답:**
```json
{
  "success": true,
  "data": {
    "userId": "temp-user-1234567890",
    "email": "user@example.com",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

**프로필 생성:**
```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "major": "IT",
    "grade": 2,
    "enrollmentStatus": "재학",
    "residenceRegion": "SEOUL",
    "incomeBracket": 5,
    "age": 20,
    "interestTags": ["공모전", "인턴"]
  }'
```

---

## 다음 단계 (필수)

### ⚠️ 중요: Supabase Auth 실제 연동

현재 구현은 **프로토타입** 수준입니다. 실제 운영을 위해:

1. **클라이언트 측 Supabase Auth** (권장)
   ```typescript
   // frontend/src/utils/supabaseAuth.ts (신규)
   import { createClient } from '@supabase/supabase-js'
   
   const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   
   export const signUp = (email: string, password: string) => {
     return supabase.auth.signUp({ email, password })
   }
   ```

2. **백엔드: Supabase JWT 검증** (현재 코드 수정)
   ```typescript
   // backend/src/middleware/auth.ts (수정 필요)
   // JWT 서명을 Supabase 공개키로 검증
   import { jwtVerify } from 'jose'
   ```

---

## 주의사항

### 현재 구현의 한계
- ⚠️ 회원가입/로그인이 프로토타입 수준 (실제 비밀번호 검증 없음)
- ⚠️ JWT는 자체 SECRET으로 발급 (Supabase 토큰 아님)
- ⚠️ CORS 설정 아직 구현되지 않음
- ⚠️ 토큰 갱신 로직 미구현

### 다음 PR에서 처리
1. Supabase Auth 실제 연동
2. CORS 미들웨어 추가
3. 리프레시 토큰 엔드포인트
4. 에러 핸들링 미들웨어 개선
5. 로그인 페이지 UI (선택사항)

---

## 파일 구조 요약

```
backend/
├── src/
│   ├── index.ts                 # Express 진입점
│   ├── middleware/
│   │   └── auth.ts             # JWT 검증
│   └── routes/
│       ├── auth.ts             # 회원가입/로그인
│       └── profile.ts          # 프로필 CRUD

frontend/
├── src/
│   ├── utils/
│   │   └── apiClient.ts        # API 클라이언트
│   └── pages/
│       └── ProfileSetup.tsx    # 프로필 폼
├── .env                        # 환경변수
└── .env.example

shared/
└── src/
    └── schemas/
        └── profile.ts          # 공유 Zod 스키마
```

---

## 체크리스트

- [x] Express 백엔드 기본 구조
- [x] JWT 미들웨어
- [x] 프로필 API (POST, GET, PATCH)
- [x] API 클라이언트 (apiClient.ts)
- [x] 프론트엔드 폼 → API 연결
- [ ] Supabase Auth 실제 연동
- [ ] CORS 설정
- [ ] 리프레시 토큰
- [ ] 로그인 페이지
- [ ] 전체 플로우 테스트
