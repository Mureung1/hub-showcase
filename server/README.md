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
| `DB_URL` | `jdbc:mysql://localhost:3306/itjang?...` | MySQL JDBC connection URL |
| `DB_USERNAME` | `itjang` | MySQL application user |
| `DB_PASSWORD` | `itjang` | MySQL application password |
| `CORS_ALLOWED_ORIGIN` | `http://localhost:5173` | Exact browser origin allowed to send credentialed requests |
| `GOOGLE_BOOKS_BASE_URL` | Google Books v1 URL | Optional API base override for tests |
| `GOOGLE_BOOKS_API_KEY` | empty | Google Books search credential |
| `GOOGLE_CLIENT_ID` | empty | Web OAuth client ID used to verify Google ID tokens |
| `SESSION_COOKIE_SECURE` | `false` | Set to `true` when HTTPS is used |

```bash
cp .env.example .env
# .env에 GOOGLE_BOOKS_API_KEY와 GOOGLE_CLIENT_ID 입력
set -a && source .env && set +a
./gradlew bootRun
```

`.env`는 Git에 올라가지 않습니다. 배포 환경에서는 위 값을 플랫폼 환경 변수로 등록하고 HTTPS에서는 `SESSION_COOKIE_SECURE=true`를 사용하세요.
