# 로컬 실행과 통합 QA

이 문서는 잇장의 로컬 환경을 실행하고 핵심 독서 재개 흐름을 검증하는 기준 절차입니다. Google 로그인, 책 검색, 독서 기록과 글귀 배너까지 실제 서버와 MySQL을 사용합니다.

## 준비물

- JDK 21
- Node.js와 npm
- Docker와 Docker Compose
- Google Cloud의 Web OAuth 클라이언트 ID
- Google Books API 키

Google Cloud Console에서 Web OAuth 클라이언트의 승인된 JavaScript 원본에 `http://localhost`와 `http://localhost:5173`을 모두 추가합니다. Google Identity Services의 로컬 개발 지침은 포트 없는 localhost와 실제 개발 서버 origin을 함께 요구합니다. 같은 클라이언트 ID를 서버의 `GOOGLE_CLIENT_ID`와 클라이언트의 `VITE_GOOGLE_CLIENT_ID`에 사용해야 서버가 Google ID 토큰의 대상 사용자를 검증할 수 있습니다.

Vite 개발 서버는 HTTP localhost에서 Google 로그인 요청이 올바른 referrer를 전달하도록 `Referrer-Policy: no-referrer-when-downgrade` 응답 헤더를 설정합니다.

## 1. 환경 변수 준비

서버 환경 파일을 만듭니다.

```bash
cd server
cp .env.example .env
```

`server/.env`에서 다음 두 값을 입력합니다.

```dotenv
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
GOOGLE_CLIENT_ID=your-web-oauth-client-id.apps.googleusercontent.com
```

클라이언트 환경 파일을 만듭니다.

```bash
cd ../client
cp .env.example .env
```

`client/.env`에 서버와 같은 Web OAuth 클라이언트 ID를 입력합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-web-oauth-client-id.apps.googleusercontent.com
```

두 `.env` 파일은 Git에 포함되지 않습니다. 실제 키나 클라이언트 ID를 문서나 커밋에 넣지 마세요.

## 2. MySQL과 서버 실행

첫 번째 터미널에서 실행합니다.

```bash
cd server
docker compose up -d --wait
set -a
source .env
set +a
./gradlew bootRun
```

서버가 시작되면 Flyway가 스키마 변경을 적용하고 Hibernate가 결과를 검증합니다. 다음 요청이 `{"status":"UP"}`을 포함하면 준비된 상태입니다.

```bash
curl http://localhost:8080/actuator/health
```

API 문서는 `http://localhost:8080/swagger-ui.html`에서 확인할 수 있습니다.

## 3. 클라이언트 실행

두 번째 터미널에서 실행합니다.

```bash
cd client
npm ci
npm run dev
```

브라우저에서 `http://localhost:5173`을 열고 Google 로그인 버튼이 표시되는지 확인합니다. `Google 로그인 설정이 필요해요.`가 보이면 `client/.env`의 `VITE_GOOGLE_CLIENT_ID`를 확인하고 Vite를 다시 시작합니다.

## 핵심 흐름 통합 QA

아래 표를 위에서부터 실행합니다. 각 단계의 기대 결과를 확인한 뒤 Pass 또는 Fail을 기록합니다.

| 단계 | 동작 | 기대 결과 |
| --- | --- | --- |
| 1 | Google 계정으로 로그인한다. | 온보딩이 닫히고 책장이 표시된다. 새로고침해도 로그인 세션이 유지된다. |
| 2 | 책 추가에서 제목을 검색한다. | Google Books 결과가 표시되고 한 권을 선택할 수 있다. |
| 3 | 시작 페이지와 함께 책을 등록한다. | 책이 `읽는 중` 서가에 나타난다. |
| 4 | 책을 펼친다. | 마지막 책갈피와 다음 시작 페이지가 표시된다. |
| 5 | 끝난 페이지, 짧은 감상과 도움이 된 글귀를 저장한다. | 상세 화면의 기록 목록과 마지막 책갈피가 갱신된다. |
| 6 | 책장으로 돌아간다. | 저장한 글귀가 책장 오른쪽 배너에 표시된다. |
| 7 | 글귀 배너의 `다시 펼치기`를 누른다. | 해당 책이 열리고 이전 기록 다음 페이지부터 재개할 수 있다. |
| 8 | 기록을 수정한 뒤 최신 기록을 삭제한다. | 책갈피가 남은 기록을 기준으로 다시 계산된다. 글귀는 유지된다. |
| 9 | 책을 완독으로 옮겼다가 다시 읽는 중으로 되돌린다. | 기록과 책갈피가 유지된 채 서가만 이동한다. |
| 10 | 책장으로 돌아가 읽기 기록 달력을 확인한다. | 기록한 날짜의 횟수가 표시되고 빈 날짜에는 점수를 부여하지 않는다. |
| 11 | 페이지를 새로고침한다. | 로그인, 책, 기록, 글귀와 상태 변경이 서버 값으로 복구된다. |

### QA 기록 양식

```text
실행 날짜:
브랜치/커밋:
브라우저:
서버 환경:

1 로그인: Pass / Fail
2 검색: Pass / Fail
3 등록: Pass / Fail
4 펼치기: Pass / Fail
5 기록·글귀 저장: Pass / Fail
6 글귀 배너: Pass / Fail
7 글귀에서 재개: Pass / Fail
8 기록 수정·삭제: Pass / Fail
9 완독·복귀: Pass / Fail
10 읽기 기록 달력: Pass / Fail
11 새로고침 복구: Pass / Fail

실패 단계:
재현 절차:
기대 결과:
실제 결과:
콘솔/서버 로그:
```

자격증명 없이 자동 테스트만 실행한 경우 Google 로그인과 이후 수동 단계는 `미검증`으로 남깁니다. 실행하지 않은 단계를 Pass로 기록하지 않습니다.

## 1분 시연

시연 전에 로그인하고, 읽는 중인 책 한 권과 저장된 글귀 하나를 준비합니다.

1. **0–10초:** 책장 오른쪽 글귀 배너에서 `다시 펼치기`를 누릅니다.
2. **10–22초:** 책이 펼쳐지고 마지막 책갈피 다음 페이지가 보이는 것을 확인합니다.
3. **22–38초:** 읽기 기록에서 끝난 페이지, 짧은 감상과 새 글귀를 저장합니다.
4. **38–50초:** 책장으로 돌아가 갱신된 책갈피와 읽기 기록 달력을 확인합니다.
5. **50–60초:** 새로고침한 뒤 같은 상태가 서버에서 복구되는 것을 보여 줍니다.

시연 전에 새 책 등록까지 보여줘야 한다면 1분 시연과 분리해 책 검색 API를 먼저 확인합니다. 외부 Google Books 응답 지연 때문에 핵심 재개 흐름이 가려지는 것을 막기 위한 구분입니다.

## 자동 검증

클라이언트:

```bash
cd client
npm test
npm run build
```

서버:

```bash
cd server
./gradlew test
```

자동 테스트는 Google OAuth 설정과 실제 브라우저 로그인까지 검증하지 않습니다. 핵심 흐름의 완료 판단에는 위 수동 QA가 필요합니다.

### 현재 수동 확인 상태

- 2026-07-27: 로컬 Google 로그인과 표의 1–11단계를 실제 브라우저에서 모두 통과했습니다.
- Google Books 검색·등록, 글귀 배너 재개와 노출 기록, 최신 기록 수정·삭제 뒤 책갈피 재계산, 완독·보관·복원, 달력과 새로고침 복구를 확인했습니다.
- 기록 저장 직후 글귀 배너가 갱신되지 않던 결함은 [PR #63](https://github.com/Tapha-K/hub/pull/63)에서 수정하고 실브라우저와 회귀 테스트로 재검증했습니다.
- 자동 검증은 프런트 31개 테스트와 프로덕션 빌드, 서버 Gradle 테스트를 통과했습니다.
- 배포 환경 smoke test는 이 로컬 통합 QA와 별도 작업입니다.

## 문제 해결

### Google 로그인 버튼이 나오지 않는다

- `client/.env`에 `VITE_GOOGLE_CLIENT_ID`가 있는지 확인합니다.
- 환경 변수를 바꾼 뒤 `npm run dev`를 다시 시작합니다.
- OAuth 클라이언트가 Web 애플리케이션 유형인지 확인합니다.
- 승인된 JavaScript 원본에 `http://localhost`와 정확한 개발 서버 origin인 `http://localhost:5173`이 모두 있는지 확인합니다.
- `curl -I http://localhost:5173` 응답에 `Referrer-Policy: no-referrer-when-downgrade`가 있는지 확인합니다.

### 로그인 요청이 거부된다

- 서버와 클라이언트의 Google Client ID가 같은지 확인합니다.
- `server/.env`를 현재 셸에 다시 불러온 뒤 서버를 재시작합니다.
- 브라우저 개발자 도구에서 `/api/auth/google`의 응답을 확인합니다.

### 서버 연결 또는 CORS 오류가 난다

- `curl http://localhost:8080/actuator/health`로 서버 상태를 확인합니다.
- `VITE_API_BASE_URL`이 `http://localhost:8080`인지 확인합니다.
- `CORS_ALLOWED_ORIGIN`이 브라우저 주소와 정확히 같은 `http://localhost:5173`인지 확인합니다.
- 호스트나 포트를 바꾸면 두 값을 함께 바꾸고 서버와 Vite를 재시작합니다.

### 책 검색이 실패한다

- `GOOGLE_BOOKS_API_KEY`가 현재 서버 프로세스에 로드됐는지 확인합니다.
- 서버 로그에서 Google Books의 인증, 할당량 또는 네트워크 오류를 확인합니다.
- 외부 API 장애와 앱의 빈 검색 결과를 구분하기 위해 다른 제목으로 한 번 더 검색합니다.

### MySQL 또는 Flyway에서 서버 시작이 멈춘다

```bash
cd server
docker compose ps
docker compose logs mysql
```

- MySQL 컨테이너가 healthy인지 확인합니다.
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`가 `compose.yaml`의 로컬 값과 일치하는지 확인합니다.
- 마이그레이션 오류가 나면 기존 데이터를 삭제하기 전에 서버 로그와 실패한 Flyway 버전을 기록합니다. 로컬 볼륨 삭제는 데이터를 잃으므로 자동 해결 절차로 사용하지 않습니다.

## 관련 문서

- [프로젝트 방향과 아키텍처](../README.md)
- [서버 실행과 환경 변수](../server/README.md)
- [프런트엔드 구현 기록](../client/docs/frontend-implementation-notes.md)
- [서버 구현 기록](../server/docs/server-implementation-notes.md)
