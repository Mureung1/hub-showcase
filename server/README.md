# Hub Server

## Local development

1. Start MySQL with `docker compose up -d` from this directory.
2. Copy `.env.example` values into your shell as needed.
3. Run `./gradlew bootRun`.

The application runs at `http://localhost:8080`.

- Health: `GET /actuator/health`
- OpenAPI document: `GET /api-docs`
- Swagger UI: `/swagger-ui.html`

Flyway applies `V1__create_reading_shelf_schema.sql` on startup. Hibernate validates the schema but does not create or alter tables.
