# product

실제 서비스 React 화면이다. 직무 선택·통계·공고 해석·합격 전략·로드맵 다섯 화면과 내 공고 직접 분석 패널로 이루어진다. 데이터는 전부 Express(`server/`)의 `/api/*`에서 받는다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run lint
```

개발 서버는 `vite.config.js`의 proxy로 `/api` 요청을 `http://localhost:4000`의 Express로 넘긴다. 그래서 로컬에서는 화면과 서버가 같은 출처로 보이고 별도 설정이 필요 없다.

## API 주소

React는 Vercel, Express는 Render로 서로 다른 출처에 뜬다. 배포에서는 상대경로 `/api/...`에 아무것도 없으므로 화면이 서버의 절대 주소를 알아야 한다. 그 주소가 `VITE_API_BASE`다.

모든 API 호출은 `src/data/api.js`의 `apiUrl(path)`를 거친다. `src/hooks/apiFetch.js`의 `fetchJson`이 이 함수를 부르고, 상태 코드를 직접 다루는 `PostingAnalyzePanel`도 같은 함수로 주소를 만든다. 화면 코드는 `/api/...` 경로만 넘긴다.

| `VITE_API_BASE` | 화면이 부르는 주소 |
| --- | --- |
| 빈 값 | `/api/...` — 개발에서는 Vite 프록시가, 같은 출처 배포에서는 그 출처가 받는다 |
| `https://호스트` | `https://호스트/api/...` |
| `https://호스트/` | `https://호스트/api/...` — 끝의 `/`는 `apiUrl`이 떼어 낸다 |

값은 빌드 시점에 코드로 박힌다. 런타임에 갈아 끼울 수 없으므로 주소를 바꾸면 다시 빌드한다. Vercel에서는 환경변수를 고친 뒤 재배포한다.

값은 저장소가 아니라 Vercel 대시보드의 환경변수(Settings → Environment Variables)에서 Production·Preview별로 넣는다. `vercel.json`에는 이 이름을 두지 않는다. `build.env`에 빈 문자열을 적어 두면 대시보드 값을 덮어 화면이 상대경로로 되돌아간다.

로컬에서 배포된 서버를 부를 때는 `.env.example`을 복사해 `.env.local`을 만들고 값을 채운다. `VITE_` 접두사가 붙은 값은 빌드 산출물에 그대로 들어가므로 비밀값을 두지 않는다.

## 교차 출처

`VITE_API_BASE`의 짝은 Express의 `ALLOWED_ORIGINS`다. 서버가 이 화면의 출처를 허용 목록에 담아야 브라우저가 응답을 읽는다. 두 값은 함께 넣는다. 규칙은 [server/README.md](../server/README.md)의 배포 절에 있다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `src/data/api.js` | `VITE_API_BASE`를 붙인 API 주소 생성 |
| `src/hooks/apiFetch.js` | JSON 응답 읽기와 오류 코드 해석 |
| `src/hooks/useJobs.js` | `GET /api/jobs` 직무 목록 |
| `src/screens/` | 다섯 화면 |
| `src/components/PostingAnalyzePanel.jsx` | 내 공고 직접 분석 |
| `vercel.json` | Vercel 빌드·SPA rewrite·정적 자산 캐시 |
