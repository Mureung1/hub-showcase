# server

product 전용 Express 백엔드다. 화면이 부르는 `/api/*` 경로를 열고, 활성 분석 버전의 `analysis_outputs.payload`를 그대로 돌려준다.

Express는 payload를 만들지 않는다. 판단이 필요한 자리는 FastAPI가 맡고, 저장소 조회와 결정적 조합은 Express가 맡는다. 구성요소 경계의 기준은 [아키텍처](../docs/architecture.md) 4장 구성요소 표와 9장·11장 시퀀스다.

## 경로별 FastAPI 의존

| 경로 | 하는 일 | FastAPI |
| --- | --- | --- |
| `GET /api/health` | 상태 확인 | 불필요 |
| `GET /api/jobs` | 화면 선택지용 직무 목록 | 불필요 |
| `GET /api/stats` | 활성 버전의 `statistics` payload | 불필요 |
| `POST /api/reverse` | 활성 버전의 `interpretation` payload | 불필요 |
| `POST /api/conditions` | 활성 버전의 `strategy` payload | 불필요 |
| `POST /api/roadmap` | 활성 버전의 `roadmap` payload와 체크 상태 재조합 | 불필요 |
| `POST /api/postings/analyze` (캐시 적중) | `user_postings`·`user_posting_analyses` 조회 | 불필요 |
| `POST /api/postings/analyze` (캐시 미적중) | 온디맨드 해석·전략·로드맵 | **필요** |
| `POST /api/extract` | 공고 원문 구조화 추출 | **필요** |

화면 조회 다섯 경로와 체크리스트 재조합, 캐시가 적중하는 공고 입력은 Express만으로 동작한다. FastAPI는 캐시가 없는 공고의 온디맨드 분석과 `/api/extract`에만 필요하다.

## 로드맵 재조합

준비 현황·로드맵 조합기는 Express 소관이다([아키텍처](../docs/architecture.md) 4장 구성요소 표, 9장 시퀀스의 `API->>API`). `POST /api/roadmap`은 저장된 roadmap payload를 읽어 `src/recompose.js`의 `recompose(payload, checks)`를 적용한다. `checks`가 비어 있으면 저장된 payload를 그대로 낸다.

재조합은 순수 함수다. 저장소도 모델도 부르지 않고 입력 payload를 고치지 않는다. 그래서 체크를 켜고 끄는 상호작용은 에이전트 서비스가 꺼져 있어도 동작한다.

기준 구현은 파이썬 `agent/src/careersignal/agents/roadmap/recompose.py`다. `src/__fixtures__/recompose-cases.json`이 파이썬 결과를 담고 `src/recompose.test.js`가 전량을 대조한다. 두 결과가 갈라지면 JS 쪽을 고친다.

## 사용자 공고 직접 입력

`POST /api/postings/analyze`의 순서는 [아키텍처](../docs/architecture.md) 11장과 [데모 시드 계약](../agent/data/demo_seed/CONTRACT.md) 6.2·6.3이 정한다.

1. 길이 제한(200~12000자)과 빈도 제한(IP당 분당 5회)
2. 개인정보 제거·정규화·SHA-256 (`src/normalize.js`)
3. 원문 해시로 `user_postings` 조회, 적중하면 `user_posting_analyses`에서 세 payload를 읽어 `source: "cache"`로 반환
4. 미적중이면 FastAPI `POST /postings/analyze` 호출

한 벌은 세 종이 모두 같은 분석 버전에서 나온 것이다. 활성 버전에 한 벌이 없으면 남은 버전 가운데 온전한 벌을 쓰고, 온전한 벌이 없으면 미적중으로 본다.

에이전트에 닿지 못하면 `503`과 `ONDEMAND_UNAVAILABLE`을 내되 그 직무의 overall 해석·전략·로드맵 payload를 `matched: false`, `source: "unavailable"`과 함께 실어 화면이 안내를 띄우게 한다. 조용히 빈 결과를 반환하지 않는다.

응답 형태는 `{ job, matched, source, interpretation, strategy, roadmap }`이다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `src/index.js` | 라우트 조립. 조회 함수와 `fetch`는 주입받는다 |
| `src/cors.js` | 교차 출처 허용 판정과 프리플라이트 응답 |
| `src/db.js` | Supabase 조회. 저장소 접근의 유일한 경로 |
| `src/outputs.js` | 범위 폴백(`posting → cluster → overall`)과 payload 적재 |
| `src/recompose.js` | 체크 상태 반영 로드맵 재조합 |
| `src/normalize.js` | 사용자 입력 원문 정규화와 해시 |
| `src/stats.js` | 평면 표 폴백 집계. 기본으로 꺼져 있다 |
| `src/__fixtures__/` | 파이썬 기준 구현과의 대조용 입력·기대 출력 |

## 실행

```bash
npm install
npm start     # PORT 기본값 4000
npm test      # vitest. 데이터베이스에 접속하지 않는다
```

환경변수는 `.env.example`에 있다. Express는 생성 모델 키를 보유하지 않는다.

시험은 가짜 조회 함수와 가짜 `fetch`로 돈다. `createApp({ db, fetch, agentUrl, allowedOrigins })`의 네 자리가 전부 주입 가능하다.

## 배포

Render의 Blueprint가 `render.yaml`을 읽는다. 서비스는 Express(`careersignal-server`)와 FastAPI(`careersignal-agent`) 둘이며, 브라우저가 부르는 주소는 Express뿐이다. `PORT`는 Render가 주입한다.

값이 환경마다 다른 항목은 저장소에 이름만 두고 대시보드에서 받는다(`sync: false`). 목록과 설명은 `.env.example`에 있다.

### 교차 출처 허용

React는 Vercel, Express는 Render로 서로 다른 출처에 뜬다. 브라우저는 응답의 `Access-Control-Allow-Origin`을 보고 교차 출처 요청을 통과시키므로, 화면의 출처를 `ALLOWED_ORIGINS`에 넣어야 한다. 개발에서는 `product/vite.config.js`의 `/api` 프록시가 같은 출처로 만들어 주어 이 값이 필요 없다.

| 항목 | 규칙 |
| --- | --- |
| 형식 | 쉼표로 구분한 출처 목록. scheme을 포함하고 경로는 넣지 않는다 |
| 예 | `https://careersignal.vercel.app,https://careersignal-git-preview.vercel.app` |
| 빈 값 | `http://localhost:5173`·`http://127.0.0.1:5173`만 허용한다. `*`로 떨어지지 않는다 |
| 목록 밖 출처 | `Access-Control-Allow-Origin`을 붙이지 않는다. 요청은 그대로 처리한다 |
| 프리플라이트 | `OPTIONS`에 `204`. 허용 메서드는 `GET, POST, OPTIONS`, 허용 헤더는 `Content-Type` |
| 쿠키 | 쓰지 않는다. `Access-Control-Allow-Credentials`를 두지 않는다 |

응답에는 `Vary: Origin`이 붙는다. 이 헤더가 없으면 중간 캐시가 한 출처에 준 응답을 다른 출처에 되돌려 허용 여부가 뒤바뀐다.

`cors` 패키지를 쓰지 않고 `src/cors.js`가 직접 구현한다. 규칙은 `src/cors.test.js`가 고정한다.

화면 쪽 짝은 `VITE_API_BASE`다. 두 값은 함께 넣는다. 한쪽만 넣으면 화면이 서버를 부르지 못하거나 브라우저가 응답을 막는다. 설명은 [product/README.md](../product/README.md)에 있다.
