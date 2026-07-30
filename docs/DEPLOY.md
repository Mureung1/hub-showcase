# 배포 가이드 — Vercel(프론트) + Render(백엔드)

> 이 문서는 배포 시 옮겨야 할 환경변수와 설정을 한 장에 정리한다.

## ✅ 배포 완료 (2026-07-28) — 라이브

| | 주소 |
|---|---|
| **프론트 (Vercel)** | https://respec-gamma.vercel.app |
| **백엔드 (Render)** | https://respec.onrender.com |

**검증 결과**
- `GET https://respec.onrender.com/api/health` → `{"db":"ok"}` (백엔드 라이브 + DB 연결)
- 발행 문서 65편·RAWG 게임 검색 정상 (환경변수 전부 적용됨)
- 프론트 번들에 `VITE_API_URL=https://respec.onrender.com/api` 반영, CORS 허용 확인 (프론트 ↔ 백엔드 연결 성공)

**배포 중 겪은 것 / 해결**
- Vercel Hobby가 `Co-Authored-By` 트레일러를 "협업 커밋"으로 보고 차단 → 단일 작성자 커밋 + 커밋 이메일을 GitHub에 인증해 해결.
- Vercel이 기본 `main`을 배포 → `main`을 최신 브랜치로 fast-forward 하여 최신 코드 배포.

**남은 것**
- Supabase Auth **Redirect URL / Site URL**에 `https://respec-gamma.vercel.app` 등록(프로덕션 로그인용). 프론트가 OAuth를 `redirectTo: window.location.origin`으로 부르므로, 이 등록 없이는 배포 도메인에서 소셜 로그인이 돌아오지 못한다.
- 배포 후 CORS를 Vercel 도메인으로 제한(현재 전체 허용) — **데모 이후로 미룸**(데모 주간에 배포 리스크를 만들지 않는다).
- Render 무료 인스턴스 콜드스타트(~50초) — 데모 직전 워밍업.

## 재검증 기록 (2026-07-30, 4주차 마감)

| 확인 | 결과 |
|---|---|
| `GET https://respec.onrender.com/api/health` | `{"status":"ok","service":"core-loop-builder-backend","db":"ok"}` |
| `GET /api/documents` | 발행 문서 **66편** (최근: 2026-07-29) |
| `GET /api/games/search?q=zelda` | RAWG 결과 8건 |
| `https://respec-gamma.vercel.app` | HTTP 200 |
| 배포 번들 | `VITE_API_URL`이 `https://respec.onrender.com/api`로 반영됨(번들 문자열 확인) |
| 로컬 테스트 | backend 28 / frontend 36 통과, `npm run lint` 경고 2건(에러 0), `vite build` 성공 |

이번 주 배포 반영분: 4주차 문서(WORKFLOW·발표 자료)·CI 워크플로우·showcase.json, 그리고 7/29 인증 개선 커밋(비밀번호 재설정·변경, 이메일 변경, 프로필 한 줄 소개, 로그인 UX). `main`에 반영하면 Vercel/Render가 자동 배포한다.

## 폴더 구조
- **프론트엔드**: `frontend/` (Vite + React) → **Vercel**
- **백엔드**: `backend/` (Express) → **Render**
- 두 서비스가 각각 하위 폴더를 root로 잡는다(모노레포 한 저장소).

## 로컬에서 되는지 (확인 완료)
```bash
cd backend && npm install && npm start   # http://localhost:4000  (GET /api/health → db:ok)
cd frontend && npm install && npm run dev # http://localhost:5173  (dev는 /api를 :4000으로 프록시)
cd frontend && npm run build             # dist/ 생성 (배포 산출물)
```

## 프론트엔드 → Vercel
| 항목 | 값 |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

**환경변수(빌드 타임, 전부 `VITE_` 접두사 = 번들에 공개됨):**
| 이름 | 값 | 비고 |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 가능 |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** 키 | 공개 키(번들 노출 OK) |
| `VITE_API_URL` | `https://<render-백엔드>.onrender.com/api` | **배포 백엔드 주소 + `/api`.** 로컬은 비워두면 프록시 사용 |

> ⚠️ `VITE_API_URL`을 안 넣으면 배포본이 `/api`(상대경로)로 호출 → Vercel엔 백엔드가 없어 실패. 반드시 Render 주소로 지정.

## 백엔드 → Render
| 항목 | 값 |
|---|---|
| Root Directory | `backend` |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` (= `node src/index.js`) |

**환경변수(서버 전용 비밀 — 절대 프론트로 가면 안 됨):**
| 이름 | 값 | 비고 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** 키 | 🔒 최고 권한. 백엔드 전용 |
| `GEMINI_API_KEY` | Google Gemini 키 | 🔒 |
| `RAWG_API_KEY` | RAWG 게임 검색 키 | 🔒 |
| `PORT` | (설정하지 않음) | Render가 자동 주입 — 코드가 `process.env.PORT` 사용 |
| `AI_FEEDBACK_MODEL` / `AI_EXAMPLE_MODEL` / `EXAMPLE_DELAY_MS` | (선택) | 미설정 시 기본값 |

## 비밀 경계 (반드시 지킬 것)
- `SUPABASE_SERVICE_ROLE_KEY` · `GEMINI_API_KEY` · `RAWG_API_KEY` 는 **Render(백엔드)에만**. Vercel/프론트엔 절대 넣지 않는다.
- 프론트가 갖는 Supabase 키는 **anon(공개)** 하나뿐.
- 실제 `.env`는 git에 올리지 않는다(`.gitignore`로 무시, 값 없는 `.env.example`만 커밋).

## 배포 후 할 일(내일)
- **CORS 좁히기**: 현재 `backend/src/app.js`가 `app.use(cors())`(전체 허용). 배포 후 Vercel 프론트 도메인만 허용하도록 제한.
- Supabase Auth의 Redirect URL에 배포된 프론트 도메인 추가(OAuth 로그인용).
- `VITE_API_URL`을 실제 Render 주소로 확정 후 프론트 재배포.

## 사용자 사전 체크리스트 (오늘)
- [ ] Vercel에 GitHub 계정으로 가입 → 본인 포크 저장소가 목록에 보이는지 확인
- [ ] Render에 GitHub 계정으로 가입 → 본인 포크 저장소가 목록에 보이는지 확인
