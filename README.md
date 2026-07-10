# CJMT

사진으로 식사를 기록하면 AI(Gemini, OpenRouter 경유)가 음식을 식별하고, 식약처 식품영양성분DB로
실제 영양수치를 채워주는 영양 관리 웹앱. 오늘 부족한 영양소를 계산해 카카오맵으로 주변 식당을
추천해준다.

## 아키텍처

- **프론트엔드**: React + Vite (`src/`)
- **API 로직**: `/api/gemini`, `/api/places`, `/api/fooddb` — OpenRouter(Gemini) / 카카오 로컬 /
  식약처 API를 서버 보유 키로 대신 호출하는 Express 앱. 사용자는 별도 키 발급 없이 링크만으로
  모든 기능을 쓸 수 있다. 이 로직은 `server/proxy.js` 한 곳에만 있고, 배포 방식에 따라 두 가지
  진입점이 그 Express 앱을 가져다 쓴다.
  - **`server/proxy.js`를 직접 실행** (로컬 `npm run server`, Render): `app.listen()`으로 이 서버
    하나가 API와 정적 프론트(`dist/`, `NODE_ENV=production`일 때)를 함께 서빙한다.
  - **`api/index.js`** (Vercel): `server/proxy.js`가 export하는 Express 앱을 그대로 가져와
    서버리스 함수 핸들러로 다시 내보내기만 한다. `process.env.VERCEL`(Vercel이 자동으로 심어주는
    값)이 감지되면 `server/proxy.js`는 `app.listen()`도, 정적 파일 서빙도 하지 않는다 — 정적
    프론트와 SPA 라우팅은 Vercel/`vercel.json`이 직접 처리하기 때문이다.
- 개발 환경에서는 vite dev server(5173)와 프록시 서버(8787)를 각각 띄우고,
  `vite.config.js`의 `server.proxy['/api']`가 5173 → 8787로 요청을 전달한다.

## 로컬 실행

```bash
npm install
cp .env.example .env   # 아래 "환경변수" 표를 참고해 값 채우기
```

개발 모드는 터미널 두 개가 필요하다(둘 다 `.env`를 읽는다).

```bash
npm run server   # 프록시 서버 (http://localhost:8787)
npm run dev      # vite dev server (http://localhost:5173, /api는 8787로 프록시)
```

프로덕션 빌드를 로컬에서 그대로 재현해보려면(Render와 동일한 경로):

```bash
npm run build
npm run start    # NODE_ENV=production으로 프록시 서버가 dist/까지 함께 서빙 (http://localhost:8787)
```

Vercel 서버리스 경로(`api/index.js`)까지 로컬에서 그대로 재현해보려면 [Vercel CLI](https://vercel.com/docs/cli)를 쓴다.
자세한 절차는 아래 "Vercel CLI로 로컬에서 서버리스 함수 테스트하기"를 참고. 참고로 `server/proxy.js`가
`import 'dotenv/config'`로 `.env`를 직접 읽으므로, 이미 채워둔 `.env`가 있으면 별도 `vercel pull` 없이도
`vercel dev`에서 그대로 동작한다.

## 환경변수

| 변수 | 필수 | 발급처 / 설명 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | 필수 (서버) | [openrouter.ai](https://openrouter.ai) 가입 → **Keys** 메뉴에서 발급. `/api/gemini`(음식 인식·메뉴 추천)에서 서버가 대신 호출하며, 프론트에는 절대 노출되지 않는다. |
| `KAKAO_REST_API_KEY` | 필수 (서버) | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → **앱 키 → REST API 키**. `/api/places`(주변 식당 검색)에서 서버가 대신 호출한다. |
| `VITE_KAKAO_JS_KEY` | 필수 (빌드 시점) | Kakao Developers → 내 애플리케이션 → **앱 키 → JavaScript 키**. 브라우저가 카카오맵 SDK를 직접 로드할 때 쓰는 공개용 키로, `npm run build` 시점에 프론트 번들에 그대로 박힌다(런타임에 서버에서 주입하는 값이 아님). 이 키를 등록한 도메인만 지도가 뜨므로, 배포 도메인을 Kakao Developers **플랫폼 → Web**에 등록해야 한다. |
| `FOODSAFETY_API_KEY` | 필수 (서버) | [공공데이터포털](https://www.data.go.kr)에서 "식품의약품안전처_전국통합식품영양성분정보(음식)" API를 활용신청하면 발급되는 일반 인증키(Decoding). `/api/fooddb`의 기본 조회(`source=food`, 조리식)에 사용. |
| `FOODSAFETY_PROC_API_KEY` | 필수 (서버) | 공공데이터포털에서 "식품의약품안전처_전국통합식품영양성분정보(가공식품)" API를 **별도로** 활용신청해 발급받는 인증키. `/api/fooddb`의 가공식품 폴백 조회(`source=process`, 편의점/포장 제품)에 사용. |
| `NODE_ENV` | Render만 필수 | `production`으로 고정. 이 값일 때(그리고 `VERCEL`이 없을 때)만 `server/proxy.js`가 `dist/`를 정적 서빙하고 SPA 라우팅 폴백을 활성화한다. Vercel은 정적 서빙을 직접 처리하므로 굳이 설정할 필요 없음(설정돼 있어도 무방 — `VERCEL`이 함께 감지되면 무시된다). |
| `APP_URL` | 선택 | 배포된 서비스의 URL(예: `https://cjmt.onrender.com`, `https://cjmt.vercel.app`). OpenRouter 요청의 `HTTP-Referer` 헤더 값으로 쓰인다. 비워두면 로컬 개발용 값(`http://localhost:5173`)으로 폴백하므로 배포 시 채워두는 걸 권장. |
| `PORT` | 자동 (Render) | Render가 서비스 실행 시 자동 주입한다. **직접 설정하지 않는다.** 로컬에서는 기본값 8787(`PROXY_PORT`로 override 가능). Vercel은 서버리스 함수라 포트 개념이 없어 무관하다. |
| `VERCEL` | 자동 (Vercel) | Vercel이 모든 배포에 자동으로 심어주는 값. **직접 설정하지 않는다.** `server/proxy.js`가 이 값으로 "지금 Vercel 서버리스 환경인지"를 판단해 `app.listen()`/정적 서빙을 건너뛴다. |

## Render 배포

사전 준비: 이 저장소를 GitHub에 push하고, 위 표의 키들을 미리 발급받아 둔다.

### 방법 A — render.yaml Blueprint (권장)

저장소 루트에 `render.yaml`이 포함되어 있다.

1. Render 대시보드 → **New +** → **Blueprint** → 이 저장소 선택
2. `sync: false`로 표시된 환경변수(`OPENROUTER_API_KEY`, `KAKAO_REST_API_KEY`,
   `VITE_KAKAO_JS_KEY`, `FOODSAFETY_API_KEY`, `FOODSAFETY_PROC_API_KEY`, `APP_URL`)는
   Render가 자동으로 채우지 않으므로, Blueprint 적용 화면 또는 서비스 생성 후
   **Environment** 탭에서 직접 입력한다.
3. **Apply**

### 방법 B — 대시보드에서 수동으로 Web Service 생성

1. Render 대시보드 → **New +** → **Web Service** → 이 저장소 선택
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm run start`
4. **Environment** 탭에서 위 환경변수 표의 값들을 모두 등록 (`NODE_ENV=production` 포함)

### ⚠️ VITE_KAKAO_JS_KEY 주의사항

`VITE_KAKAO_JS_KEY`는 런타임이 아니라 **빌드 시점**(`vite build`)에 프론트 JS 번들에
그대로 인라인된다. 따라서:

- 최초 배포 전에 반드시 Environment 탭에 값을 먼저 등록해두어야 한다(빌드 이후에
  추가하면 그 빌드 결과물에는 반영되지 않는다).
- 이 값을 나중에 바꾸거나 새로 추가했다면, 그냥 저장만으로는 반영되지 않고
  **Manual Deploy**(재빌드)를 한 번 더 실행해야 프론트에 반영된다.

### 카카오 배포 도메인 등록

Kakao Developers → 내 애플리케이션 → **플랫폼 → Web**에 Render가 준 배포 도메인
(예: `https://cjmt.onrender.com`)을 등록해야 카카오맵 SDK가 정상 로드된다. 등록 전에는
지도 화면에서 로드 실패 에러가 뜬다.

## Vercel 배포

Render 설정(`render.yaml`)과 별개로 동작하는 독립적인 배포 경로다. 둘 다 같은 저장소에서
그대로 공존할 수 있다 — Render는 `server/proxy.js`를 `app.listen()`으로 직접 실행하고, Vercel은
같은 로직을 `api/index.js`를 통해 서버리스 함수로 실행한다(자세한 구조는 위 "아키텍처" 참고).

1. Vercel 대시보드 → **Add New** → **Project** → 이 저장소 선택
2. **Framework Preset**은 자동 감지되지 않으면 "Other"로 두고, 아래 값을 확인/입력한다
   (저장소 루트의 `vercel.json`이 이미 지정하므로 보통 그대로 두면 된다):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**에 위 환경변수 표의 값들을 등록한다
   (`OPENROUTER_API_KEY`, `KAKAO_REST_API_KEY`, `VITE_KAKAO_JS_KEY`, `FOODSAFETY_API_KEY`,
   `FOODSAFETY_PROC_API_KEY`, 선택으로 `APP_URL`). `NODE_ENV`/`PORT`/`VERCEL`은 설정하지 않는다.
4. **Deploy**

`vercel.json`에 이미 포함된 설정:

- **rewrites**: `/api/(.*)` 요청은 전부 `api/index.js`(서버리스 함수) 하나로 보내고, 그 외 모든
  경로는 `index.html`로 보내 SPA 클라이언트 라우팅을 지원한다(`dist/assets/...` 같은 실제 정적
  파일은 rewrite보다 우선 적용되므로 그대로 서빙된다).
- **regions**: `["icn1"]`(서울)로 고정. 카카오/식약처 API가 국내 공공·상용 API라 해외 리전에서는
  연결이 느리거나 아예 막힐 수 있어 반드시 필요하다.
- **functions.maxDuration**: `api/index.js` 30초. 사진 분석(Gemini 호출)이 몇 초 걸릴 수 있어
  기본값보다 넉넉하게 잡아뒀다(Hobby 플랜 기준 최대 300초까지 늘려도 된다).

### Vercel CLI로 로컬에서 서버리스 함수 테스트하기

실제로 배포하지 않고도 `vercel dev`로 `api/index.js` + `vercel.json`의 rewrites/functions 설정을
로컬에서 그대로 재현해볼 수 있다.

**1. 설치** (프로젝트에 CLI를 상주시키지 않으려면 매번 `npx vercel ...`로 대체 가능):

```bash
npm install -g vercel
```

**2. 로그인 + 프로젝트 연결** (최초 1회만):

```bash
vercel login   # 브라우저로 로그인(디바이스 인증). vercel dev/link 실행 시 로그인 안 돼 있으면 자동으로 뜬다
vercel link    # 이 디렉터리를 Vercel 프로젝트에 연결 (.vercel/project.json 생성, .gitignore에 이미 포함됨)
```

**3. 환경변수** — 이 프로젝트는 `server/proxy.js`가 `import 'dotenv/config'`로 `.env`를 직접
읽으므로, 이미 채워둔 `.env`가 있으면 **추가 작업 없이** `vercel dev`가 그 값을 그대로 사용한다.
Vercel 대시보드에 등록해둔 값을 대신 쓰고 싶다면(예: 팀원이 `.env` 없이 테스트할 때) 아래처럼
당겨온다 — `vercel dev`/`vercel build`와 쓸 때는 `vercel env pull`이 아니라 `vercel pull`을
쓰는 게 Vercel 공식 권장 방식이다(`vercel env pull`은 `next dev` 등 다른 툴이 읽는 `.env` 파일을
따로 만들 때 쓰는 명령이고, `vercel pull`은 `.vercel/.env.development.local`에 저장해 `vercel dev`가
자동으로 읽게 한다):

```bash
vercel pull   # Development 환경변수 + 프로젝트 설정을 .vercel/ 아래로 받아옴
```

**4. 실행**:

```bash
vercel dev
```

기본적으로 `http://localhost:3000`에서 뜬다(다른 포트를 쓰려면 `vercel dev --listen 3001`).
`/api/*`는 `api/index.js`(우리 Express 앱)로, 그 외 경로는 프론트 개발 서버(vite)로 처리된다.

**5. 확인**:

```bash
curl -X POST http://localhost:3000/api/gemini -H "Content-Type: application/json" -d '{}'
# {"error":"prompt is required"} 정도가 나오면 라우팅은 정상 (실제 키가 있으면 정상 응답까지 확인)
```

브라우저로 `http://localhost:3000`에 접속해 사진 분석/지도/식단 기록 등 실제 기능이 되는지도
확인하면 더 확실하다. 이 경로가 통과하면 배포본에서도 같은 라우팅으로 동작할 가능성이 높다
(다만 위 "첫 배포 후 꼭 확인할 것"에 적었듯, 실제 배포 후 한 번 더 확인하는 걸 권장한다 —
`vercel dev`는 실제 프로덕션 라우팅 레이어를 100% 동일하게 재현하는 건 아니다).

### ⚠️ VITE_KAKAO_JS_KEY 주의사항 (Vercel도 동일)

Render와 마찬가지로 `VITE_KAKAO_JS_KEY`는 **빌드 시점**에 프론트 번들에 그대로 인라인된다.
최초 빌드 전에 Environment Variables에 먼저 등록해두어야 하고, 값을 나중에 바꿨다면
**Redeploy**를 한 번 더 실행해야 반영된다.

### 카카오 배포 도메인 등록 (Vercel도 동일)

Kakao Developers → 내 애플리케이션 → **플랫폼 → Web**에 Vercel이 준 배포 도메인
(예: `https://cjmt.vercel.app`, 커스텀 도메인을 쓴다면 그 도메인도 함께)을 등록해야
카카오맵 SDK가 정상 로드된다.

### 첫 배포 후 꼭 확인할 것

`/api/gemini`, `/api/places`, `/api/fooddb`를 실제로 호출해서 404가 아니라 정상 응답(또는 키 누락
등 우리가 던지는 에러 메시지)이 오는지 확인한다. Vercel의 rewrite가 여러 하위 경로(`/api/gemini`
등)를 함수 하나로 몰아주는 방식은 플랫폼 내부 구현에 따라 동작이 달라질 수 있는 지점이라, 배포
직후 한 번은 세 엔드포인트 모두 직접 두들겨보는 걸 권장한다. 만약 404가 뜬다면 `api/index.js`를
캐치올 파일명(`api/[...path].js`)으로 바꾸는 것으로 우회할 수 있다.

## 배포 후 체크리스트

- [ ] **키 노출 여부**: 브라우저 개발자도구(Network/Sources)에서 프론트 번들·API 응답에
      `OPENROUTER_API_KEY` / `KAKAO_REST_API_KEY` / `FOODSAFETY_API_KEY` /
      `FOODSAFETY_PROC_API_KEY` 값이 노출되지 않는지 확인. 번들에 보여도 되는 건
      `VITE_KAKAO_JS_KEY` 뿐이다(원래 공개용 키).
- [ ] **`/api` 동작 확인**: 실제 기능으로 확인 — 사진 분석(`/api/gemini`), 지도에서 주변
      식당 찾기(`/api/places`), 음식 DB 매칭(`/api/fooddb`). 각각 실패 시 500/502/504가
      아니라 화면에 사용자 친화 에러 메시지가 뜨는지도 함께 확인.
- [ ] **SPA 라우팅**: `/analyze`, `/calendar`, `/profile`, `/map`, `/result`, `/meals` 등을
      새로고침하거나 주소창에 직접 쳐서 들어가도 404 없이 정상 로드되는지 확인.
- [ ] **모바일 접속**: 실제 모바일 브라우저(또는 반응형 모드)에서 사진 업로드(카메라),
      지도, 레이아웃 깨짐 없는지 확인.
- [ ] **카카오 배포 도메인 등록**: Kakao Developers 플랫폼에 배포 도메인이 등록되어
      지도 SDK가 정상 로드되는지 확인.
- [ ] **콜드 스타트**: Render 무료 플랜은 일정 시간 미사용 시 슬립 상태로, Vercel 서버리스
      함수는 매 요청마다 콜드 스타트가 있을 수 있다. 첫 요청이 프론트의 fetch 타임아웃(약 28초)
      안에 응답하는지 확인 — 자주 길어지면 Render는 유료 플랜, Vercel은 함수 warm-up을 고려한다.
- [ ] **환경변수 누락 확인**: 배포 로그에서 `is not configured on the server` 류의 500 에러가
      없는지 확인(키 등록 누락 시 나는 메시지).
- [ ] **HTTPS**: 플랫폼(Render/Vercel)이 자동 발급하는 인증서로 `https://`가 정상 적용되는지 확인.
