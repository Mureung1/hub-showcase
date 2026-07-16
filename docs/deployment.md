# deployment.md — 공개 배포 절차 (Render + Vercel)

> 목적: `localhost`가 아니라 **누구나 클릭하면 접속되는 공개 링크**를 만든다. 지금까지는 로컬(개발자 PC)에서만 전 기능이 돌았다 — 이 문서는 그걸 인터넷에 올리는 절차다.
>
> **중요(Codex 필독): 이 작업은 자동화할 수 없다.** Render·Vercel 계정 생성, GitHub 저장소 접근 승인, 대시보드 클릭은 전부 **사용자 본인이 브라우저에서 직접 해야 하는 단계**다. Codex(또는 다른 에이전트)는 이 문서를 사용자에게 그대로 안내하는 역할만 하고, 계정 생성이나 로그인을 대신 하지 않는다. 특히 API 키·시크릿 값은 절대 대신 입력하거나 채팅/커밋에 남기지 않는다(`docs/security-secrets.md`).

## 왜 백엔드 먼저인가

프론트(Vercel)는 "백엔드가 어디 있는지"(`VITE_API_BASE_URL`)를 알아야 하고, 백엔드(Render)는 "프론트가 어디서 오는지"(`CORS_ORIGIN`)를 알아야 한다. 순환 의존이라 순서를 정한다: **백엔드 먼저 배포 → 그 주소로 프론트 배포 → 마지막에 백엔드의 CORS_ORIGIN을 프론트 주소로 갱신.**

## 1. 백엔드 배포 (Render, 무료 티어)

> 무료 티어는 15분 미사용 시 슬립되고, 첫 요청이 깨우는 데 ~50초 걸릴 수 있다. 파일럿 데모용으로는 충분하지만, 이 한계는 사용자에게 미리 안내한다.

1. https://dashboard.render.com/register — **GitHub으로 가입/로그인** (저장소 연결이 가장 쉬움).
2. **New +** → **Web Service** → GitHub 저장소 접근 승인 → `bricepark94/hub` 선택.
3. 설정값:

   | 항목 | 값 |
   |---|---|
   | Name | `hub-backend` (자유) |
   | Region | Singapore |
   | Branch | `work` (또는 배포 대상 브랜치) |
   | **Root Directory** | `backend` ⚠️ 모노레포라 필수 |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

4. **Environment Variables**(Render 대시보드에서 사용자가 직접 입력, 값은 절대 채팅/문서/커밋에 남기지 않음):
   ```
   SUPABASE_URL=<Supabase 프로젝트 URL>
   SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role 키>
   CORS_ORIGIN=http://localhost:5173   # 임시값 — §3에서 프론트 주소로 갱신
   ```
5. **Create Web Service** → 배포 완료(2~3분) → 상단에 `https://hub-backend-XXXX.onrender.com` 형태의 공개 주소가 생긴다.
6. 확인: `<그 주소>/api/health` 를 브라우저로 열어 `{"status":"ok","backend":"supabase",...}` 확인. 또는 로컬에서:
   ```bash
   API_BASE=https://hub-backend-XXXX.onrender.com npm run verify:backend
   ```
   (백엔드 슬립 상태면 첫 호출이 느릴 수 있다 — 실패 시 한 번 더 실행)

## 2. 프론트엔드 배포 (Vercel, 무료 티어)

1. https://vercel.com/signup — **GitHub으로 가입/로그인**.
2. **Add New** → **Project** → `bricepark94/hub` import.
3. 설정값:

   | 항목 | 값 |
   |---|---|
   | Framework Preset | Vite |
   | **Root Directory** | `frontend` ⚠️ 필수 |
   | Build Command | `npm run build` (기본값 유지) |
   | Output Directory | `dist` (기본값 유지) |

4. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://hub-backend-XXXX.onrender.com
   ```
   (1단계에서 나온 Render 주소. 이건 비밀 아님 — 공개 API 주소.)
5. **Deploy** → 완료되면 `https://hub-XXXX.vercel.app` 형태의 공개 주소 생성.

## 3. 백엔드 CORS 갱신 (마무리)

1. Render 대시보드 → `hub-backend` 서비스 → Environment → `CORS_ORIGIN` 값을 실제 Vercel 주소로 교체:
   ```
   CORS_ORIGIN=https://hub-XXXX.vercel.app
   ```
2. 저장하면 Render가 자동 재배포한다.

## 4. 최종 검증

- `https://hub-XXXX.vercel.app`을 새 브라우저(시크릿 모드 등, 로그인 없이)로 열어 전체 흐름(소개→MBTI→설문→결과→오늘 계획→실천카드) 완주.
- 결과 화면에서 동의 후 "서버에 익명 저장" → 성공 메시지 확인.
- `API_BASE=https://hub-backend-XXXX.onrender.com npm run verify:backend`로 원격 라운드트립 재확인.

## 5. 배포 후 남는 일

- 공개 링크가 생기면 **성인 대상 가명 파일럿(ADR-006)**을 실제로 시작할 수 있다 — `frontend/src/components/ConsentNotice.jsx`의 고지가 이미 이 경로로 접속하는 사용자에게도 그대로 뜬다.
- 무료 티어 한계(Render 슬립, Vercel 대역폭)로 사용자가 많아지면 유료 전환을 검토한다(승인 필요).
- 배포된 프론트·백엔드 주소는 `docs/handoff/` 최신 인수인계 문서에 기록해 둔다(비밀 아님, 커밋해도 됨).
