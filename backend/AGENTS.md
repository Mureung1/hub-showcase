# Backend agent guidance

This file narrows the repository-wide rules for `backend/`.

## Runtime and build invariants

- Use Java 17 for the Gradle daemon, toolchain, compilation release, and every test JVM.
- Run Gradle only through the repository wrapper from the repository root.
- Keep Spring Boot on the repository-pinned 3.5.x line; do not add dynamic or snapshot dependencies.
- Flyway SQL is the schema source of truth. Hibernate must remain `ddl-auto=validate`.

## Architecture and safety

- This phase exposes only Actuator health and Prometheus endpoints. Do not add business controllers until their contract is approved.
- Keep external Naver and LLM integrations behind the `placepick.external` configuration boundary.
- The `local`, `test`, and `load` profiles must use `mock` mode and loopback or Compose mock hosts. Never weaken the startup guard to make a test pass.
- Never put credentials, real API hosts, or production data in source, fixtures, logs, or documentation.

## Verification

- `./gradlew test`: fast unit tests, no Docker.
- `./gradlew integrationTest`: PostgreSQL and Redis Testcontainers plus WireMock contracts.
- `./gradlew evalTest`: deterministic JSONL fixture validation.
- `./gradlew check`: the complete backend verification gate.

Add a unit test for deterministic logic, an integration test for infrastructure wiring or HTTP contracts, and an eval fixture only for measurable policy behavior.
