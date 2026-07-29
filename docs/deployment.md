# 배포 가이드 — Vercel(FE) + Render(BE)

프론트엔드는 Vercel, API 서버는 Render 에 올린다.

## 배포 주소 (2026-07-29 연결 완료)

| | 주소 |
|---|---|
| 화면 (Vercel) | https://exam-priority-calculator.vercel.app |
| API 서버 (Render) | https://exam-priority-server.onrender.com |
| 상태 확인 | https://exam-priority-server.onrender.com/api/health |

둘은 환경변수 두 개로 이어져 있다. **한쪽 주소가 바뀌면 반대쪽도 같이 고쳐야 한다.**

| 환경변수 | 어디에 | 값 |
|---|---|---|
| `VITE_API_BASE_URL` | Vercel | Render 주소 |
| `CORS_ORIGIN` | Render | Vercel 주소 |

연결 확인 근거는 [4. 배포 후 확인 결과](#4-배포-후-확인-결과-2026-07-29) 에 있다.
남은 과제는 [막힌 지점](#막힌-지점) 을 본다.

---

## 1. 코드 쪽 준비 (완료)

배포하려면 "FE 와 BE 주소가 다르다"는 상황을 코드가 감당할 수 있어야 한다. 로컬에서는
Vite 프록시가 `/api` 를 `localhost:3001` 로 넘겨줘서 같은 오리진처럼 보였지만, 배포하면
프록시가 없다.

| 무엇 | 어디 | 하는 일 |
|---|---|---|
| `VITE_API_BASE_URL` | `frontend/src/utils/apiBase.js` | API 요청 주소의 앞부분. 비우면 기존처럼 같은 오리진 `/api`(로컬), 채우면 그 주소로 직접 요청(배포) |
| `VITE_BASE_PATH` | `frontend/vite.config.js` | 정적 파일 경로 접두사. Vercel 은 `/`(기본), GitHub Pages 는 `/hub/`(`npm run build:pages`) |
| `CORS_ORIGIN` | `server/src/index.js` | 허용할 프론트엔드 주소. 쉼표로 여러 개. 비우면 전부 허용(로컬 개발용) |
| `PORT` | `server/src/index.js` | Render 가 자동으로 넣어준다. 배포에서는 직접 설정하지 않는다 |
| `render.yaml` | 저장소 루트 | Render Blueprint. rootDir/build/start/health 를 미리 적어둠 |
| `frontend/vercel.json` | | Vite 프리셋 + SPA rewrite |

환경변수 예시는 `frontend/.env.example`, `server/.env.example` 에 있다. 실제 `.env` 는
gitignore 되어 있으니 커밋되지 않는다.

---

## 2. 배포 순서

주소를 서로 참조해야 해서 **BE(Render) → FE(Vercel) → 다시 BE 환경변수** 순서가 편하다.
Render 를 먼저 띄워야 Vercel 에 넣을 API 주소가 생긴다.

### 2-1. Render 에 API 서버 올리기

1. https://dashboard.render.com → **New → Blueprint** → 이 저장소(`pkyungho/hub`) 선택.
   `render.yaml` 을 읽어 `exam-priority-server` 가 만들어진다.
   - Blueprint 를 안 쓰고 **New → Web Service** 로 직접 만들 거면 이렇게 넣는다.

     | 항목 | 값 |
     |---|---|
     | Root Directory | `server` |
     | Runtime | Node |
     | Build Command | `npm install` |
     | Start Command | `npm start` |
     | Health Check Path | `/api/health` |
     | Instance Type | Free |

2. **Environment** 에 환경변수를 넣는다.

   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `24.17.0` |
   | `CORS_ORIGIN` | (아직 비워둔다 — Vercel 주소가 나오면 2-3 에서 채운다) |

   `NODE_VERSION` 은 빼먹으면 안 된다. 서버가 Node 내장 `node:sqlite` 를 쓰는데
   Node 22 미만에는 그 모듈이 없어서 뜨자마자 죽는다.

3. 배포가 끝나면 주소가 나온다(`https://exam-priority-server.onrender.com` 형태).
   **확인:** 브라우저에서 `<Render주소>/api/health` 를 열어 `{"status":"ok"}` 가 보이면 된다.
   → 여기까지가 수업 최소 기준의 절반이다.

> 무료 플랜은 15분간 요청이 없으면 서버가 잠든다. 잠든 뒤 첫 요청은 깨어나는 데
> **50초 정도** 걸린다. 화면이 멈춘 것처럼 보여도 고장이 아니다.

### 2-2. Vercel 에 화면 올리기

1. https://vercel.com/new → 이 저장소 선택.
2. **Root Directory 를 `frontend` 로 바꾼다.** (저장소 루트에도 `package.json` 이 있어서
   그냥 두면 엉뚱한 걸 빌드한다.) Framework Preset 은 Vite 로 잡힌다.
3. **Environment Variables** 에 넣는다.

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | 2-1 에서 받은 Render 주소. 끝에 `/` 나 `/api` 를 붙이지 않는다 |

4. Deploy → 주소가 나온다(`https://....vercel.app`).
   **확인:** 그 주소에서 화면이 열리면 수업 최소 기준 달성이다.

> **함정:** Vite 의 `VITE_*` 환경변수는 실행 중에 읽는 게 아니라 **빌드할 때 코드 안에 박힌다.**
> 값을 바꾸면 화면을 새로고침하는 걸로는 안 바뀌고 **반드시 다시 배포(Redeploy)** 해야 한다.

### 2-3. Render 에 Vercel 주소 넣기 (CORS)

지금 상태로는 화면은 뜨지만 데이터 요청이 브라우저에서 막힌다. 서버가 "이 주소에서 오는
요청을 받아도 된다"고 알려주지 않았기 때문이다.

1. Render → 서비스 → **Environment** → `CORS_ORIGIN` 에 Vercel 주소를 넣는다.
   예) `https://exam-priority-calculator.vercel.app`
2. 저장하면 Render 가 자동으로 다시 배포한다.

> Vercel 은 커밋마다 미리보기 주소(`...-git-xxx.vercel.app`)를 따로 만든다. 미리보기에서도
> API 를 쓰려면 그 주소도 `CORS_ORIGIN` 에 쉼표로 덧붙인다.

---

## 3. 핵심 기능 확인하기

배포된 Vercel 화면에서 과목을 하나 추가하고, 아래 네 군데를 순서대로 본다.

1. **화면** — 과목이 목록에 뜨고, 새로고침해도 남아있는가.
2. **브라우저 개발자 도구 → Network** — 요청 주소가 `localhost` 가 아니라 Render 주소인가.
   `POST /api/subjects` 가 **201**, 그 앞의 `OPTIONS`(preflight)가 **204** 인가.
3. **Render → Logs** — 요청이 서버에 도착했는가. 서버가 뜰 때 찍는
   `CORS: 허용 오리진 ...` 줄에 Vercel 주소가 제대로 들어갔는지도 여기서 확인된다.
4. **데이터** — 지금은 Render 안의 SQLite 파일에 저장된다. (Supabase 는 아직 연결 전 —
   [막힌 지점](#막힌-지점) 참고.)

### 안 될 때 보는 표

| 증상 | 원인 | 할 일 |
|---|---|---|
| 화면은 뜨는데 과목이 저장 안 됨, 콘솔에 `Failed to fetch` | CORS 차단 | Render 의 `CORS_ORIGIN` 이 Vercel 주소와 **정확히** 같은지 확인(`https://` 포함, 끝 `/` 없이) |
| 요청이 `localhost:3001` 로 감 | `VITE_API_BASE_URL` 미설정 또는 설정 후 재배포 안 함 | Vercel 환경변수 확인 후 **Redeploy** |
| 화면이 하얗고 콘솔에 404(js/css) | `base` 경로 문제 | Vercel 은 `VITE_BASE_PATH` 를 설정하지 않아야 한다(`/` 가 기본) |
| Render 가 뜨자마자 죽음, 로그에 `node:sqlite` 관련 오류 | Node 버전이 낮음 | `NODE_VERSION=24.17.0` 추가 후 재배포 |
| 첫 요청이 한참 걸림 | 무료 플랜 콜드 스타트 | 정상. 50초 정도 기다린다 |
| 저장했던 과목이 재배포 후 사라짐 | Render 무료 디스크가 초기화됨 | 아래 [막힌 지점](#막힌-지점) |

---

## 4. 배포 후 확인 결과 (2026-07-29)

실제 배포본에서 확인한 것이다.

| 확인 | 결과 |
|---|---|
| Render `/api/health` | `{"status":"ok"}` HTTP 200 |
| Render `/` | `{"service":"exam-priority-server","health":"/api/health"}` |
| Vercel 화면 | HTTP 200, 정상 렌더 |
| 번들에 Render 주소가 박혔는지 | 배포된 `index-*.js` 에서 1건 발견 |
| Vercel 오리진의 요청 | `access-control-allow-origin` 헤더 붙음 |
| **엉뚱한 오리진의 요청** | **헤더 없음 — CORS_ORIGIN 이 실제로 잠겨 있다** |
| 배포 화면에서 과목 담기 | Render DB 에 저장됨(새 디폴트 이해도 4·분량 4까지 그대로) |
| 새로고침 | 과목 유지, "서버에 연결하지 못해…" 안내 사라짐 |
| 핵심 흐름 | 과목 담기 → 분량·이해도 → 결과(추천 과목·점수·이유·시간 배분) 완주 |

> CORS 는 설정이 **비어 있어도** 허용 헤더가 붙는다(비면 전체 허용). 그래서 "헤더가 왔다"만으로는
> 잠긴 걸 확인할 수 없다. **엉뚱한 오리진으로 한 번 더 찔러 헤더가 없는 것까지** 봐야 한다.

## 5. 로컬에서 미리 확인한 것 (2026-07-28)

배포 전에 "FE 와 BE 가 다른 주소일 때"를 로컬에서 그대로 흉내내서 확인했다.
FE 를 `localhost:4173`, BE 를 `localhost:3999` 로 띄우고 `CORS_ORIGIN=http://localhost:4173`
을 준 상태다.

| 확인한 것 | 결과 |
|---|---|
| `GET /` | `{"service":"exam-priority-server","health":"/api/health"}` |
| `GET /api/health` | `{"status":"ok"}` |
| 허용된 오리진의 요청 | `Access-Control-Allow-Origin` 헤더 붙음 |
| 허용 안 된 오리진의 요청 | 헤더 안 붙음(= 브라우저가 차단) |
| preflight `OPTIONS`(PATCH) | 204, `Allow-Methods` 에 PATCH 포함 |
| 브라우저에서 다른 오리진으로 과목 추가·조회·삭제 | `POST` 201 → 목록에 포함 → `DELETE` 204 |
| `CORS_ORIGIN` 을 틀린 주소로 두고 요청 | `Failed to fetch` 로 막힘 (의도한 동작) |
| Vercel 용 빌드(`npm run build`) | 자산 경로 `/assets/...` |
| Pages 용 빌드(`npm run build:pages`) | 자산 경로 `/hub/assets/...` |
| 브라우저에서 다른 오리진의 API 로 과목 목록·점수 불러오기 | 14개 과목과 순위판이 그대로 표시됨 |
| 프론트 테스트 59개 · `npm run lint` | 전부 통과, 오류 0 |

로컬 개발(`npm run dev`)도 그대로 동작한다. `VITE_API_BASE_URL` 이 비어 있으면 예전처럼
`/api` 로 요청하고 Vite 프록시가 3001 로 넘긴다.

---

## 막힌 지점

> 배포 자체는 2026-07-29 에 끝났다(위 [배포 주소](#배포-주소-2026-07-29-연결-완료)).
> 아래는 그 뒤에도 남아 있는 과제다.

### 1. Supabase 아직 연결 안 됨

수업 항목의 "Render 에 Supabase 연결 정보를 설정한다"를 오늘은 하지 않았다.

**이유:** 서버가 지금 Supabase(Postgres)가 아니라 Node 내장 SQLite(`node:sqlite`)를 쓴다.
Render 에 `DATABASE_URL` 을 넣어도 그걸 읽는 코드가 없어서 아무 일도 일어나지 않는다.
연결하려면 먼저 DB 계층을 바꿔야 한다.

**해야 할 일:**
- `server/src/db/database.js` 를 `pg` 기반으로 교체 (`DatabaseSync` → `Pool`)
- `server/src/services/subjectService.js` 의 준비된 statement 들을 async 쿼리로 변경
- 그에 맞춰 `subjectController.js` 도 async 로 변경
- `docs/data-model.md` 의 subjects 테이블을 Postgres DDL 로 옮기고 Supabase SQL Editor 에서 실행
- Render 환경변수에 `DATABASE_URL`(Supabase 의 connection string) 추가

### 2. Render 무료 플랜은 저장한 데이터가 남지 않는다

무료 플랜은 배포·재시작할 때마다 디스크가 초기화된다. SQLite 파일(`server/data/app.db`)이
그때 같이 사라져서 **등록한 과목이 재배포 후 없어진다.**

지금은 "서버가 응답하지 않으면 localStorage 로 폴백"하는 구조라 화면이 아예 깨지지는 않지만,
서버에 저장된 데이터가 유지된다고 볼 수는 없다.

→ 위 1번(Supabase 연결)이 그대로 이 문제의 해결책이다. 데이터를 Render 디스크가 아니라
Supabase 에 두면 재배포와 무관해진다. 두 항목은 사실상 같은 하나의 작업이다.

### 3. Vercel 미리보기 배포 주소는 그때그때 바뀐다

커밋마다 새 미리보기 주소가 생기는데 `CORS_ORIGIN` 은 고정 목록이라 미리보기에서는
API 가 막힌다. 지금은 운영 주소 하나만 넣고 쓰기로 했다. 미리보기까지 필요해지면 서버의
`origin` 옵션을 함수로 바꿔 `*.vercel.app` 패턴을 허용하는 방법이 있다.
