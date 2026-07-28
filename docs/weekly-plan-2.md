# 주간 개발 계획 (2026-07-27~07-30)

**목표:** FE(Vercel) + BE(Render) 배포 완료 + 프로덕션 E2E 검증

## 이슈 목록

| # | 레이어 | 작업 | 의존 | 상태 |
|---|---|---|---|---|
| 20 | BE | CORS origin + 쿠키 `sameSite` 환경변수화 | — | [ ] |
| 21 | FE | `localhost:4000` → `VITE_API_URL` 환경변수 교체 | — | [ ] |
| 22 | 설정 | `server/.env.example` 추가 | — | [ ] |
| 23 | BE | Render 배포 — Root Directory·빌드 명령어·환경변수 설정 | 20 | [ ] |
| 24 | FE | Vercel 배포 — 환경변수 설정 | 21 | [ ] |
| 25 | 통합 | 배포 검증 + 오류 수정 | 23, 24 | [ ] |

## 진행 순서

```
7/27 (월)  #20 + #21 + #22  (병렬, 독립 코드 변경)
7/28 (화)  #23 Render 배포 + #24 Vercel 배포
7/29 (수)  #25 통합 검증 + 오류 수정
7/30 (목)  여유: 오류 수정 마무리
```

## 스코프 밖 (이번 주 안 함)

- 메모 기능 (DB 컬럼은 이미 스키마에 있으나 API·UI 미완성 — 다음 주)
- 완료 화면
- 커스텀 도메인
- 모바일 반응형

---

## 이슈 상세

### #20 `[BE]` CORS origin + 프로덕션 쿠키 설정 환경변수화

**변경 파일:** `server/src/app.ts`, `server/src/middleware/session.ts`

**핵심:** Vercel(https)↔Render(https) 크로스 도메인 환경에서 쿠키가 전달되려면
`sameSite: 'none'`과 `secure: true`가 필요. 로컬에서는 `sameSite: 'lax'`로 유지.

```ts
// server/src/app.ts
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }))

// server/src/middleware/session.ts — 쿠키 옵션
const isProduction = process.env.NODE_ENV === 'production'
res.cookie('sid', sessionId, {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
})
```

**완료 조건**
- `server/src/app.ts`에 `localhost:5173` 문자열 없음
- 로컬 `npm run dev`에서 기존 동작 유지

---

### #21 `[FE]` `localhost:4000` → `VITE_API_URL` 환경변수 교체

**변경 파일:** `src/App.tsx`, `.env.local`(신규)

`src/App.tsx` 7곳 교체:
```ts
// Before
fetch('http://localhost:4000/api/profile', ...)

// After
fetch(`${import.meta.env.VITE_API_URL}/api/profile`, ...)
```

`.env.local` (gitignore됨, 로컬 개발용):
```
VITE_API_URL=http://localhost:4000
```

**완료 조건**
- `src/App.tsx`에 `localhost:4000` 문자열 0건
- 로컬에서 `.env.local`로 정상 동작

---

### #22 `[설정]` `server/.env.example` 추가

**새 파일:** `server/.env.example`

```
DATABASE_URL=
PORT=4000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**완료 조건**
- `server/.env.example` 커밋됨 (`.gitignore`에 `!.env.example` 이미 있음 확인)

---

### #23 `[BE]` Render 배포

**Render 설정값:**

| 항목 | 값 |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npm run start` |

**Render 환경변수:**

| 키 | 값 |
|---|---|
| `DATABASE_URL` | Supabase 연결 문자열 |
| `CORS_ORIGIN` | `https://<vercel-domain>` (Vercel 배포 후 채움) |
| `NODE_ENV` | `production` |

**완료 조건**
- `curl https://<render-domain>/api/health` → `{"ok":true}`
- Render 로그에 에러 없음

---

### #24 `[FE]` Vercel 배포

**Vercel 설정값:**

| 항목 | 값 |
|---|---|
| Root Directory | `/` (루트) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Vercel 환경변수:**

| 키 | 값 |
|---|---|
| `VITE_API_URL` | `https://<render-domain>` |

**완료 조건**
- `https://<vercel-domain>` 브라우저에서 랜딩 페이지 로드
- 빌드 로그 오류 없음

---

### #25 `[통합]` 배포 검증 + 오류 수정

| 시나리오 | 검증 방법 |
|---|---|
| FE 외부 접속 | 배포 URL 브라우저에서 열기 |
| BE health | `curl https://<render-domain>/api/health` |
| 온보딩 → DB 저장 | 폼 제출 후 Supabase 콘솔 Profile 테이블 확인 |
| 체크 → DB 반영 | 체크 후 새로고침 → 상태 유지 확인 |
| 세션 격리 | 시크릿 창에서 별도 진행 상태 확인 |
| 쿠키 전달 | DevTools Application > Cookies에서 `sid` 쿠키 `Secure; SameSite=None` 확인 |

실패 시: Render/Vercel 로그 확인 → 원인 기록 후 수정
