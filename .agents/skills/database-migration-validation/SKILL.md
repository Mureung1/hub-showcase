---
name: database-migration-validation
description: Create and verify sequential PostgreSQL schema migrations in this repository against the documented physical model and a real database. Use when adding or changing backend migration SQL, implementing a DB ticket, or validating columns, constraints, foreign keys, indexes, migration application, and safe reruns.
---

# Database Migration Validation

Add the smallest forward-only migration that matches the repository's documented PostgreSQL model, then verify the applied schema rather than relying on SQL inspection alone.

## Workflow

1. Read the applicable `AGENTS.md` guidance and use `$preserve-product-intent`.
2. For ticket work, use `$run-project-ticket` and treat its completion criteria and prerequisites as the scope contract.
3. Inspect `docs/architecture/data_model.md`, `docs/architecture/db.vuerd.json`, the nearest product or API policy, `backend/migrations/`, and `backend/src/scripts/migrate.ts`.
4. Check Git status and preserve all existing user changes.
5. Compare the documented schema with the live migration history. Report unresolved conflicts involving ownership, deletion, security, fields, or relationships before editing.
6. Add the next sequential SQL file. Never edit an already-applied migration to change a deployed schema.
7. Declare required types, nullability, defaults, CHECK and UNIQUE constraints, foreign keys, deletion behavior, and query-driven indexes explicitly.
8. Run the repository migration command against the intended database once, then run it again to prove the migration runner skips the applied file safely.
9. Query PostgreSQL catalogs to verify the actual columns, defaults, constraints, foreign keys, and indexes. Do not treat a successful command or SQL text alone as schema evidence.
10. Run the backend's actual tests, type check, build, and `git diff --check`.
11. For ticket implementation, update only verified checklist criteria and record the result in project history.

## Migration Guardrails

- Prefer a new forward migration over destructive rollback or mutation of migration history.
- Keep the migration limited to the requested schema. Do not add speculative tables, generic metadata, triggers, helpers, or dependencies.
- Follow the repository's UUID, naming, timestamp, ownership, and deletion conventions.
- Store only fields authorized by the data model. Never add credentials, raw tokens, secret keys, request bodies, recipe bodies, or unrestricted metadata to audit or sharing tables.
- Use parameterized application queries for later data access; do not solve runtime behavior inside a schema ticket.
- Do not expose `DATABASE_URL` or other secrets in commands, logs, history, or reports.
- Treat migration application to a shared database as a material write. Use the repository's configured target and report which verification ran without printing credentials.
- Do not mark a ticket complete when the migration was not applied to the required database or when catalog verification is missing.

## Validation Evidence

Record only observed results:

- migration filename applied on the first run;
- no reapplication or duplicate failure on the second run;
- catalog-confirmed columns and nullability;
- primary, foreign, CHECK, and UNIQUE constraints;
- index names, column order, and sort direction;
- actual test, type-check, build, and diff-check results;
- unavailable or failed validation without claiming completion.

TDD is usually not applicable to a schema-only migration when the repository has no isolated migration-test database. Do not replace real database verification with brittle tests that only search SQL strings. If an isolated migration harness already exists, use it for Red-to-Green validation before applying the migration to the configured database.
