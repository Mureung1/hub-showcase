# ICU Backend

This folder contains server-side code for ICU. The frontend must not call Gemini, Vertex AI, OpenAI, or other model providers directly from the browser.

## Local API Server

```bash
npm run server:curriculum
```

The Express server entrypoint is `backend/http/server.mjs`. It listens on `http://127.0.0.1:8787` by default.

## Implemented APIs

The current backend uses Express with in-memory repositories by default. These APIs are the local boundary for React screens before Electron and RAG are introduced. Code execution already goes through this backend boundary, with the current runner kept intentionally minimal for local learning feedback.

```http
POST   /api/curriculum/recommend
GET    /api/curriculum/generated
POST   /api/curriculum/generated
DELETE /api/curriculum/generated
DELETE /api/curriculum/generated/:id
GET    /api/curriculum/history
GET    /api/progress/today
POST   /api/progress/missions/:missionId
DELETE /api/progress/missions/:missionId
DELETE /api/progress
GET    /api/mistake-notes
POST   /api/mistake-notes
PATCH  /api/mistake-notes/:noteId
DELETE /api/mistake-notes/:noteId
DELETE /api/mistake-notes
GET    /api/git-lab/attempts
POST   /api/git-lab/attempts
DELETE /api/git-lab/attempts
POST   /api/code/run
```

## Curriculum Agent API

```http
POST /api/curriculum/recommend
Content-Type: application/json
```

Request:

```json
{ "goal": "백엔드 개발자가 되고 싶어" }
```

The response returns a `GeneratedCurriculumPlan`-compatible `plan` for the React Today Hub and Workspace. Recommended plans are saved through the configured generated-curriculum repository.

Generated curriculum snapshots can also be read, saved, cleared, or deleted individually through `/api/curriculum/generated`, while `/api/curriculum/history` returns the saved curriculum list used by the curriculum history screen.

## Code Runner API

```http
POST /api/code/run
Content-Type: application/json
```

Request:

```json
{ "language": "javascript", "code": "console.log('hello ICU')" }
```

Response:

```json
{ "success": true, "logs": ["hello ICU"], "result": null }
```

The current runner supports JavaScript/JSX snippets through Node's `vm` module. It is suitable for local learning feedback only; process isolation, filesystem isolation, and stronger limits belong to the Judge Service phase.

## Module Boundaries

- `backend/modules/curriculum`: matches a user goal to curriculum data and model output, then stores generated curriculum snapshots through the configured repository.
- `backend/modules/learning-progress`: stores mission run state, attempt count, active step, completion time, and activity log.
- `backend/modules/mistake-notes`: stores reusable mistake records from Git Lab, Workspace, algorithm, and API practice flows.
- `backend/modules/git-lab`: records Git command attempts and can create a linked mistake note for failed attempts.
- `backend/modules/code-runner`: runs JavaScript/JSX snippets for Workspace learning feedback through `/api/code/run`.
- `backend/modules/knowledge`: loads official-doc JSONL chunks from `data` for agent/RAG grounding.

## Local Environment

Keep real secrets in `.env` or the deployment secret store. Do not expose provider keys through `VITE_*` variables.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
CURRICULUM_AGENT_PORT=8787
```

To make the Vite dev app call this backend, set:

```env
VITE_CURRICULUM_RECOMMENDATION_MODE=server
VITE_ICU_API_MODE=server
```

Without those flags, the React app keeps using mock curriculum generation and localStorage-backed screen state.

Keep `GEMINI_API_KEY` server-side only in `.env`. Do not create a `VITE_*` API key.

## Full Local Dev Mode

Use this when you want the React app to call the local backend API while developing the product screens.

```bash
npm run dev:server
```

This starts both processes:

- `npm run server:curriculum`: Express backend on `http://127.0.0.1:8787`
- `npm run dev`: Vite frontend, with `/api` proxied to the backend

`dev:server` defaults these frontend flags to server mode unless you already set them yourself:

```env
VITE_ICU_API_MODE=server
VITE_CURRICULUM_RECOMMENDATION_MODE=server
```

Quick QA path:

1. Run `npm run dev:server`.
2. Open the Vite URL shown in the terminal.
3. Go to Today Hub and generate a curriculum from a Docker or backend learning goal.
4. Confirm the generated plan is saved, then open Workspace and check that the same plan is used.
5. Edit JavaScript in the Monaco editor and run it through `/api/code/run`.

## SQLite Persistence Mode

Use SQLite when backend state should survive server restarts during local development or desktop-app preparation.

```env
ICU_REPOSITORY_MODE=sqlite
ICU_SQLITE_PATH=.icu/icu.sqlite
```

Then run:

```bash
npm run server:curriculum
```

The default mode still uses in-memory repositories. SQLite mode persists learning progress, mistake notes, Git Lab attempts, and generated curriculums. Today Hub and Workspace use the generated-curriculum APIs to restore the latest plan, browse curriculum history, resume a saved plan, and delete saved plans.
