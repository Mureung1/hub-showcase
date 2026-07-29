# FitCheck Frontend Web

회원(모바일 비율) / 트레이너(데스크톱) 모드를 담는 Vite + React + TypeScript 웹 앱입니다.

> Monorepo 시작 가이드: [../docs/README.md](../docs/README.md)  
> 백엔드 · API · 암호화: [../backend/README.md](../backend/README.md)

## 현재 진행도 (2026-07)

### 회원 모드 `/user`

| 기능 | 상태 | 비고 |
|------|------|------|
| 랜딩 · 로그인 · 회원가입 | ✅ | Supabase Auth (이메일 + Google OAuth) |
| `/user` 보호 라우트 | ✅ | `ProtectedRoute` — 미로그인 시 `/login` |
| 홈 | ✅ API | 강좌·추천 헬스장·오늘 식단 요약 |
| 강좌 목록·상세 | ✅ API | `GET /courses`, mock 보조 필드 병합 |
| 강좌 시청 기록 | ✅ API | `POST /courses/:id/watch` |
| 지도 · 헬스장 | ✅ API | Naver Map + `GET /gyms`, 주변 sync |
| 헬스장 상세 | ✅ API | `GET /gyms/:id`, 트레이너 목록, 매칭 점수 |
| **상담 신청** | ✅ API | `POST /consult-requests` → Supabase (PII 암호화) |
| 내 상담 목록 | ✅ API | `GET /consult-requests/me` — 로그인 후 조회 |
| 식단 타임라인 | ✅ API | 업로드 · CRUD · Gemini AI 2초 폴링 |
| AI 루틴 추천 | 🟡 선택 | 로컬 Ollama (`/ollama` 프록시) |

### 트레이너 모드 `/trainer`

| 기능 | 상태 | 비고 |
|------|------|------|
| 대시보드 · 회원 · 루틴 · 식단 · 리포트 | 🟡 Mock | `useAppStore` + localStorage |
| 상담 인박스 | 🟡 Mock | localStorage — **회원 API 신청과 미연동** |

### 공통 · 인프라

| 항목 | 상태 |
|------|------|
| Supabase Auth (`useAuth`) | ✅ |
| API 클라이언트 (`services/api.ts`) | ✅ Bearer 토큰 자동 첨부 |
| Dev proxy `/api` → `:5001` | ✅ |
| Vitest 단위 테스트 | 🟡 | `date`, `signal`, `todayMealSummary` |
| Vercel 배포 | ✅ | https://hub-tan-pi.vercel.app |

**범례:** ✅ 동작 · 🟡 부분/Mock · ❌ 미구현

### 다음 단계 (예상)

1. 트레이너 상담 인박스 → 백엔드 API 연동  
2. 트레이너 회원·식단·루틴 Mock → API 전환  

---

## 배포

| 환경 | 플랫폼 | URL / 설정 |
|------|--------|------------|
| **프로덕션** | Vercel | https://hub-tan-pi.vercel.app |
| **백엔드 API** | Render | https://fitcheck-server-wvj4.onrender.com |
| **로컬 개발** | Vite dev | http://localhost:5173 — `/api` → `localhost:5001` |

Vercel OAuth: `VITE_SITE_URL` = 배포 도메인, Supabase Redirect URL에 `/auth/callback` 등록.

---

## 폴더 안내

| 경로 | 설명 |
|------|------|
| `src/pages/user` | 회원 모드 화면 |
| `src/pages/auth` | 로그인 · 회원가입 · OAuth 콜백 |
| `src/pages/trainer` | 트레이너 대시보드 |
| `src/features` | 강좌 / 식단 / 지도 / 상담 |
| `src/services` | API (`gymsApi`, `coursesApi`, `consultRequestsApi`, `mealsApi`) |
| `src/data` | Mock · localStorage (트레이너 등) |

## 환경 변수

`.env.example` → `.env.local`

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_SUPABASE_URL` | Auth | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Auth | Supabase anon key |
| `VITE_NAVER_MAP_CLIENT_ID` | 지도 | NCP Dynamic Map |
| `VITE_SITE_URL` | 배포 | OAuth 리다이렉트 (Vercel 도메인) |
| `VITE_API_BASE_URL` | 배포 | `https://fitcheck-server-wvj4.onrender.com` (비우면 dev proxy `/api`) |
| `VITE_OLLAMA_MODEL` | | AI 추천 (선택) |

## 실행

```bash
npm install
npm run dev
```

http://localhost:5173

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 |
| `/login` | 로그인 |
| `/user` | 회원 홈 (로그인 필요) |
| `/user/map` | 지도 · 상담 신청 |
| `/trainer` | 트레이너 대시보드 |

로컬 개발 시 백엔드(`localhost:5001`)가 함께 실행 중이어야 API 기능이 동작합니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |
| `npm run lint` | oxlint |
| `npm run test:run` | Vitest |
