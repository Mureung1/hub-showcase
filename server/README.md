# Hub Server

## Local development

전체 Google 로그인과 독서 흐름은 [로컬 실행과 통합 QA](../docs/local-qa-and-demo.md)를 따라 검증합니다.

1. Start MySQL with `docker compose up -d --wait` from this directory.
2. Copy `.env.example` to `.env`, enter `GOOGLE_BOOKS_API_KEY` and the web OAuth `GOOGLE_CLIENT_ID`, then load it into the shell.
3. Run `./gradlew bootRun`.

The application runs at `http://localhost:8080`.

- Health: `GET /actuator/health`
- OpenAPI document: `GET /api-docs`
- Swagger UI: `/swagger-ui.html`

Flyway applies the migration files on startup. Hibernate validates the schema but does not create or alter tables.

Book search uses Google Books API. Google login verifies an ID token for `GOOGLE_CLIENT_ID` and stores the authenticated user in an HttpOnly session cookie. Use the same web client ID in the client's `VITE_GOOGLE_CLIENT_ID`.

| Variable | Local default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port; Render injects this value |
| `DB_URL` | `jdbc:mysql://localhost:3306/itjang?...` | MySQL JDBC connection URL |
| `DB_USERNAME` | `itjang` | MySQL application user |
| `DB_PASSWORD` | `itjang` | MySQL application password |
| `CORS_ALLOWED_ORIGIN` | `http://localhost:5173` | Exact browser origin allowed to send credentialed requests |
| `GOOGLE_BOOKS_BASE_URL` | Google Books v1 URL | Optional API base override for tests |
| `GOOGLE_BOOKS_API_KEY` | empty | Google Books search credential |
| `GOOGLE_CLIENT_ID` | empty | Web OAuth client ID used to verify Google ID tokens |
| `SESSION_COOKIE_SAME_SITE` | `lax` | Use `none` when the frontend and API use different sites |
| `SESSION_COOKIE_SECURE` | `false` | Set to `true` when HTTPS is used |

```bash
cp .env.example .env
# .env에 GOOGLE_BOOKS_API_KEY와 GOOGLE_CLIENT_ID 입력
set -a && source .env && set +a
./gradlew bootRun
```

`.env`는 Git에 올라가지 않습니다. 배포 환경에서는 위 값을 플랫폼 환경 변수로 등록하고 HTTPS에서는 `SESSION_COOKIE_SECURE=true`를 사용하세요.

## Render deployment

Render Dashboard에서 **New > Blueprint**를 선택하고 이 저장소의 `render.yaml`을 연결합니다. 최초 생성 화면에서 다음 값을 입력합니다.

- `DB_URL`: 외부 MySQL의 JDBC URL. 예: `jdbc:mysql://HOST:3306/itjang?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC`
- `DB_USERNAME`, `DB_PASSWORD`: MySQL 접속 정보
- `CORS_ALLOWED_ORIGIN`: 배포한 Vercel 프론트의 정확한 origin. 예: `https://example.vercel.app`
- `GOOGLE_BOOKS_API_KEY`, `GOOGLE_CLIENT_ID`: 로컬과 같은 Google 자격 증명

`SESSION_COOKIE_SECURE=true`와 `SESSION_COOKIE_SAME_SITE=none`은 Blueprint에 설정되어 있습니다. Vercel 환경 변수 `VITE_API_BASE_URL`에는 생성된 Render URL을 입력하고 다시 배포합니다.

배포가 끝나면 `https://<service>.onrender.com/actuator/health`가 `UP`인지 확인합니다. Render의 무료 웹 서비스는 유휴 상태에서 정지되므로 첫 요청은 느릴 수 있습니다.

현재 Flyway SQL과 JDBC 드라이버가 MySQL 전용이므로 Render Postgres를 Blueprint에 함께 만들지 않습니다. Render에서 MySQL을 직접 운영하려면 유료 persistent disk가 필요하므로, 별도 관리형 MySQL을 연결하는 구성이 더 단순합니다.
