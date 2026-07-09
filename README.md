# CJMT

사진으로 식사를 기록하면 AI(Gemini, OpenRouter 경유)가 음식을 식별하고, 식약처 식품영양성분DB로
실제 영양수치를 채워주는 영양 관리 웹앱. 오늘 부족한 영양소를 계산해 카카오맵으로 주변 식당을
추천해준다.

## 아키텍처

- **프론트엔드**: React + Vite (`src/`)
- **서버**: Express 프록시 하나(`server/proxy.js`)가 두 가지 역할을 겸한다.
  1. `/api/gemini`, `/api/places`, `/api/fooddb` — OpenRouter(Gemini) / 카카오 로컬 / 식약처 API를
     서버 보유 키로 대신 호출하는 프록시. 사용자는 별도 키 발급 없이 링크만으로 모든 기능을 쓸 수 있다.
  2. 프로덕션(`NODE_ENV=production`)에서는 `npm run build`로 만든 `dist/`를 정적 서빙하고,
     `/api`가 아닌 모든 GET 요청을 `index.html`로 폴백해 SPA 클라이언트 라우팅을 지원한다.
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

프로덕션 빌드를 로컬에서 그대로 재현해보려면:

```bash
npm run build
npm run start    # NODE_ENV=production으로 프록시 서버가 dist/까지 함께 서빙 (http://localhost:8787)
```

## 환경변수

| 변수 | 필수 | 발급처 / 설명 |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | 필수 (서버) | [openrouter.ai](https://openrouter.ai) 가입 → **Keys** 메뉴에서 발급. `/api/gemini`(음식 인식·메뉴 추천)에서 서버가 대신 호출하며, 프론트에는 절대 노출되지 않는다. |
| `KAKAO_REST_API_KEY` | 필수 (서버) | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → **앱 키 → REST API 키**. `/api/places`(주변 식당 검색)에서 서버가 대신 호출한다. |
| `VITE_KAKAO_JS_KEY` | 필수 (빌드 시점) | Kakao Developers → 내 애플리케이션 → **앱 키 → JavaScript 키**. 브라우저가 카카오맵 SDK를 직접 로드할 때 쓰는 공개용 키로, `npm run build` 시점에 프론트 번들에 그대로 박힌다(런타임에 서버에서 주입하는 값이 아님). 이 키를 등록한 도메인만 지도가 뜨므로, 배포 도메인을 Kakao Developers **플랫폼 → Web**에 등록해야 한다. |
| `FOODSAFETY_API_KEY` | 필수 (서버) | [공공데이터포털](https://www.data.go.kr)에서 "식품의약품안전처_전국통합식품영양성분정보(음식)" API를 활용신청하면 발급되는 일반 인증키(Decoding). `/api/fooddb`의 기본 조회(`source=food`, 조리식)에 사용. |
| `FOODSAFETY_PROC_API_KEY` | 필수 (서버) | 공공데이터포털에서 "식품의약품안전처_전국통합식품영양성분정보(가공식품)" API를 **별도로** 활용신청해 발급받는 인증키. `/api/fooddb`의 가공식품 폴백 조회(`source=process`, 편의점/포장 제품)에 사용. |
| `NODE_ENV` | 필수 | `production`으로 고정. 이 값일 때만 `server/proxy.js`가 `dist/`를 정적 서빙하고 SPA 라우팅 폴백을 활성화한다. |
| `APP_URL` | 선택 | 배포된 서비스의 URL(예: `https://cjmt.onrender.com`). OpenRouter 요청의 `HTTP-Referer` 헤더 값으로 쓰인다. 비워두면 로컬 개발용 값(`http://localhost:5173`)으로 폴백하므로 배포 시 채워두는 걸 권장. |
| `PORT` | 자동 | Render가 서비스 실행 시 자동 주입한다. **직접 설정하지 않는다.** 로컬에서는 기본값 8787(`PROXY_PORT`로 override 가능). |

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
- [ ] **콜드 스타트**: 무료 플랜은 일정 시간 미사용 시 슬립 상태로 전환된다. 슬립 이후
      첫 요청이 프론트의 fetch 타임아웃(약 28초) 안에 깨어나 응답하는지 확인 — 자주
      길어지면 유료 플랜 전환을 고려한다.
- [ ] **환경변수 누락 확인**: Render 로그에서 `is not configured on the server` 류의
      500 에러가 없는지 확인(키 등록 누락 시 나는 메시지).
- [ ] **HTTPS**: Render가 자동 발급하는 인증서로 `https://`가 정상 적용되는지 확인.
