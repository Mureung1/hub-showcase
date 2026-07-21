# FitCheck Frontend Web

회원(모바일 비율) / 트레이너(데스크톱) 모드를 담는 Vite + React + TypeScript 웹 앱입니다.

> Monorepo 시작 가이드: [../README.md](../README.md)  
> 백엔드 · API · 암호화: [../backend/README.md](../backend/README.md)

## 현재 진행도 (2026-07)

### 회원 모드 `/user`

| 기능 | 상태 | 비고 |
|------|------|------|
| 홈 | ✅ UI | 강좌·헬스장 API 일부 연동 |
| 강좌 목록·상세 | ✅ API | `GET /courses`, mock 보조 필드 병합 |
| 지도 · 헬스장 | ✅ API | Naver Map + `GET /gyms`, 주변 sync |
| 헬스장 상세 | ✅ API | `GET /gyms/:id`, 트레이너 목록 |
| **상담 신청** | ✅ API | `POST /consult-requests` → Supabase (PII 암호화) |
| 내 상담 목록 | 🟡 API | `GET /consult-requests/me` — **로그인 UI 없음**, 토큰 있을 때만 |
| 식단 타임라인 | 🟡 Mock | `userMock` — API 미연동 |
| AI 루틴 추천 | 🟡 선택 | 로컬 Ollama (`/ollama` 프록시) |

### 트레이너 모드 `/trainer`

| 기능 | 상태 | 비고 |
|------|------|------|
| 대시보드 · 회원 · 루틴 · 식단 · 리포트 | 🟡 Mock | `useAppStore` + localStorage |
| 상담 인박스 | 🟡 Mock | localStorage — **회원 API 신청과 미연동** |

### 공통 · 인프라

| 항목 | 상태 |
|------|------|
| API 클라이언트 (`services/api.ts`) | ✅ Bearer 토큰 헤더 지원 |
| Supabase Auth / 로그인 UI | ❌ 미구현 |
| Dev proxy `/api` → `:5001` | ✅ |

**범례:** ✅ 동작 · 🟡 부분/Mock · ❌ 미구현

### 다음 단계 (예상)

1. Supabase Auth + 로그인 UI → `GET /consult-requests/me` 활성화  
2. 식단 `meal_logs` API 연동  
3. 트레이너 상담 인박스 → 백엔드 API 연동  

---

## 폴더 안내

| 경로 | 설명 |
|------|------|
| `src/pages/user` | 회원 모드 화면 |
| `src/pages/trainer` | 트레이너 대시보드 |
| `src/features` | 강좌 / 식단 / 지도 / 상담 |
| `src/services` | API (`gymsApi`, `coursesApi`, `consultRequestsApi`) |
| `src/data` | Mock · localStorage (트레이너·식단 등) |

## 환경 변수

`.env.example` → `.env.local`

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_NAVER_MAP_CLIENT_ID` | 지도 | NCP Dynamic Map |
| `VITE_API_BASE_URL` | | 비우면 dev proxy `/api` 사용 |
| `VITE_SUPABASE_ACCESS_TOKEN` | | `/me` 테스트용 (로그인 UI 전) |
| `VITE_OLLAMA_MODEL` | | AI 추천 (선택) |

## 실행

```bash
npm install
npm run dev
```

http://localhost:5173

| 경로 | 설명 |
|------|------|
| `/user` | 회원 홈 |
| `/user/map` | 지도 · 상담 신청 |
| `/trainer` | 트레이너 대시보드 |

백엔드(`localhost:5001`)가 함께 실행 중이어야 API 기능이 동작합니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |
| `npm run lint` | oxlint |
