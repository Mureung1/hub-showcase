# SQLite Persistence Plan

## Purpose

ICU now needs persistence because the backend has real API boundaries for learning progress, mistake notes, and Git Lab attempts. In-memory repositories are still useful for tests and mock mode, but local development and the future desktop app need data to survive server restarts.

## Current Implementation

SQLite is available through Node's built-in `node:sqlite`, so no new package dependency is required.

Runtime selection:

```env
ICU_REPOSITORY_MODE=sqlite
ICU_SQLITE_PATH=.icu/icu.sqlite
```

If `ICU_REPOSITORY_MODE` is not `sqlite`, the backend keeps using in-memory repositories.

## Persisted Tables

- `learning_progress`: Workspace mission state, run state, attempt count, active step, completion time, activity log JSON.
- `mistake_notes`: open/resolved mistake note records across Git Lab, Workspace, algorithm, and API practice flows.
- `git_lab_attempts`: command, result, reason, lesson id, created time.
- `generated_curriculums`: reserved table for generated curriculum snapshots. The schema exists, but the API adapter is not connected yet.

## Files

- `backend/shared/sqliteDatabase.mjs`: opens the SQLite database and initializes schema.
- `backend/modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs`
- `backend/modules/mistake-notes/adapters/sqliteMistakeNoteRepository.mjs`
- `backend/modules/git-lab/adapters/sqliteGitLabAttemptRepository.mjs`
- `backend/http/server.mjs`: chooses in-memory or SQLite repositories at runtime.

## Next Steps

1. Add a generated curriculum repository and API so Today Hub can save generated plans on the backend.
2. Add a simple migration version table before schema changes become frequent.
3. Decide user identity strategy before adding multi-user sync.
4. Keep Supabase/Postgres as the later sync/backend deployment option, not the first local persistence layer.
