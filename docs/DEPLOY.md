# 배포 가이드 — Vercel(프론트) + Render(백엔드)

> 오늘은 **사전 준비**까지. 실제 배포는 내일. 이 문서는 배포 시 옮겨야 할 환경변수와 설정을 한 장에 정리한다.

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
