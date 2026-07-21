# 보안 규칙

이 프로젝트에서 예외 처리·입력 검증·배포 보안 설정을 어떻게 하는지 정리한 문서입니다.
**기존 코드에서 실제로 쓰고 있는 패턴**을 명문화한 것이며, [conventions.md](conventions.md)의 에러 처리 규칙을 보안 관점에서 더 구체화합니다.
새 라우트·컨트롤러를 작성·수정할 때 이 문서를 기준으로 삼습니다.

---

## 1. 예외 처리

### 계층별 책임 (conventions.md 4장과 동일한 레이어 분리를 따른다)
- **Service**: 실패 상황은 `Error`를 만들어 `err.status`/`err.code`를 붙여 **throw**한다. 그 값이 openapi.yaml의 에러 코드 enum과 일치해야 한다.
  ```js
  const notFound = new Error('추천 결과를 찾을 수 없습니다.');
  notFound.status = 404;
  notFound.code = 'RECOMMENDATION_NOT_FOUND';
  throw notFound;
  ```
  참고: `backend/src/services/analysisService.js`(`ANALYSIS_NOT_FOUND`), `backend/src/services/recommendationService.js`(`RECOMMENDATION_NOT_FOUND`)
- **Controller**: 컨트롤러 자체 검증 실패(형식 오류 등)는 즉시 400 응답. 그 외 서비스 호출은 `try/catch`로 감싸고 `next(error)`로 전역 핸들러에 위임한다. 컨트롤러에서 직접 500을 조립하지 않는다.
- **전역 핸들러** (`backend/src/middlewares/errorHandler.js`): `err.status`/`err.code`가 있으면 그대로 쓰고, 없으면 500/`INTERNAL_ERROR`로 통일한다.

### 500 에러는 상세를 감춘다
- `errorHandler.js`는 `status === 500`일 때 사용자에게 고정 문구("서버에서 오류가 발생했습니다...")만 보여주고, 실제 `err.message`/`err.stack`은 **로그에만** 남긴다. 스택 트레이스나 내부 예외 메시지를 응답 바디에 그대로 노출하지 않는다.
- 4xx(400/404/429 등)는 `err.message`를 그대로 노출해도 되는 **사용자용 한글 문구**로만 작성한다 (내부 구현 세부사항 금지 — 예: SQL 오류 원문, 파일 경로 등은 절대 넣지 않는다).

### 로깅
- winston 로거(`createLogger`)로 에러 발생 시 `{ error: error.message, stack: error.stack, ...컨텍스트 }`를 구조적으로 남긴다.
- **로그에 비밀값을 남기지 않는다.** GitHub 토큰·DB 접속 문자열 등은 로그에 절대 그대로 찍지 않는다. 토큰을 식별해야 할 때는 해시로 남긴다 (참고: `apiUsageService`가 토큰을 SHA-256 해시 키로 집계).

---

## 2. 입력 검증

### 원칙: 화이트리스트, 경계에서, 상한을 둔다
- 검증은 **컨트롤러**(요청이 시스템에 들어오는 경계)에서 한다. 서비스 레이어는 이미 검증된 입력을 신뢰한다.
- 허용 패턴을 정규식으로 명시하는 **화이트리스트 방식**을 쓴다 (금지 문자를 나열하는 블랙리스트 방식 지양).
  ```js
  // openapi.yaml의 githubId 패턴 그대로 검증
  const GITHUB_ID_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  ```
  참고: `backend/src/utils/validators.js` (`isValidGithubId`, `isValidUuid`)
- **배열/문자열은 반드시 길이 상한을 둔다.** 상한이 없으면 과도한 배열·긴 문자열로 서버 자원을 소모시키는 입력이 그대로 통과한다.
  ```js
  const MAX_LANGUAGES_INPUT = 10;
  const MAX_TOPICS = 10;
  if (!Array.isArray(languages) || languages.length > MAX_LANGUAGES_INPUT) return false;
  ```
  참고: `backend/src/controllers/recommendationController.js` (`isValidPreferences`)

### 외부 API 쿼리에 들어가는 사용자 입력은 이중 방어
- 사용자 입력이 GitHub 검색 qualifier처럼 **다른 시스템의 쿼리 문법**에 삽입될 때는 (1) 컨트롤러에서 허용 문자 화이트리스트로 막고, (2) 실제로 쿼리를 조립하는 서비스 레이어에서도 위험 문자(따옴표 등)를 한 번 더 제거/이스케이프한다. 한쪽이 뚫려도 다른 쪽이 막는 이중 방어.
  ```js
  // 컨트롤러: 패턴 검증 (LANGUAGE_PATTERN)
  // 서비스: 그래도 따옴표는 제거 — 2차 방어
  `language:"${language.replaceAll('"', '')}"`
  ```
  참고: `backend/src/services/githubService.js` (`searchRepos`)
- 여러 리소스를 조합해 조회할 때(GraphQL 별칭 쿼리 등) 조합 전 각 값의 **형식**을 다시 검사한다. 상류에서 걸러졌다고 가정하지 않는다.
  ```js
  const validFullNames = fullNames.filter((fullName) => /^[^/]+\/[^/]+$/.test(fullName));
  ```
  참고: `backend/src/services/githubService.js` (`fetchReposWithIssues`)

### ID/UUID 등 경로 파라미터도 검증한다
- `req.params`도 `req.body`와 동일하게 검증 대상이다. 형식이 아니면 DB에 묻기 전에 400으로 끊는다 (불필요한 쿼리 방지 + 에러 누출 방지).

---

## 3. 배포 시 보안 설정

### 시크릿 관리
- `.env`는 절대 커밋하지 않는다 (`backend/.gitignore`에 `.env` 등록됨). 새 환경변수가 생기면 `backend/.env.example`에 **키만** 추가하고 값은 비워둔다.
- 프론트엔드 `import.meta.env.VITE_*`로 노출되는 값은 **빌드 결과물에 그대로 포함되어 브라우저에서 누구나 볼 수 있다.** API 키·토큰 등 비밀값을 `VITE_` 접두사 환경변수에 절대 넣지 않는다 (참고: `frontend/src/api/index.js`의 `VITE_API_BASE_URL`은 공개 URL이라 안전한 예).
- GitHub 토큰 등은 필요한 최소 스코프만 발급한다 (참고: `.env.example`의 `GITHUB_TOKEN` 스코프 주석).

### HTTP 보안 헤더 / CORS
- `helmet()`을 항상 적용한다. CSP처럼 특정 기능(Swagger UI 등)과 충돌해 끄는 경우, 끄는 이유를 주석으로 남긴다 (참고: `backend/app.js`).
- `cors()`는 `origin`을 환경변수(`CORS_ORIGIN`)로 제한한다. 개발 편의를 위해 `origin: '*'`로 열어두지 않는다.

### Rate limit / 외부 API 사용량
- 외부 API(GitHub) 호출은 실패까지 포함해 사용량을 집계한다(`ApiUsage`, `finally`에서 기록 — 성공만 세면 실패 유발 남용을 놓친다).
- 외부 API가 rate limit(429)을 반환하면 서버도 429 + 명세된 에러 코드로 그대로 전달한다. 500으로 뭉뚱그리지 않는다.

### 의존성 / 일반 원칙
- `npm audit`에 걸리는 고위험 취약점은 방치하지 않는다. 배포(`#10`) 전 확인 항목에 포함.
- DB 조회는 Prisma의 파라미터 바인딩만 쓴다. `$queryRaw`로 문자열을 직접 조합하지 않는다 (불가피하면 `Prisma.sql` 템플릿 태그로 파라미터화해 SQL 인젝션을 막는다).
