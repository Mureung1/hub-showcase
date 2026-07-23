# Hub Server

## Local development

1. Start MySQL with `docker compose up -d` from this directory.
2. Copy `.env.example` to `.env`, enter `GOOGLE_BOOKS_API_KEY`, and load it into the shell.
3. Run `./gradlew bootRun`.

The application runs at `http://localhost:8080`.

- Health: `GET /actuator/health`
- OpenAPI document: `GET /api-docs`
- Swagger UI: `/swagger-ui.html`

Flyway applies the migration files on startup. Hibernate validates the schema but does not create or alter tables.

Book search uses Google Books API. Set `GOOGLE_BOOKS_API_KEY` when required by the provider; the key is read only by the server.

```bash
cp .env.example .env
# .env에 GOOGLE_BOOKS_API_KEY 입력
set -a && source .env && set +a
./gradlew bootRun
```

`.env`는 Git에 올라가지 않습니다. 배포 환경에서는 플랫폼의 서버 환경 변수에 `GOOGLE_BOOKS_API_KEY`를 등록하세요.
