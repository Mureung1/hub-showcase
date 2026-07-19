# ICU Backend

This folder contains server-side code for ICU. The frontend must not call Gemini, Vertex AI, OpenAI, or other model providers directly from the browser.

## Curriculum Agent API

```bash
npm run server:curriculum
```

The server entrypoint is `backend/http/server.mjs`. It listens on `http://127.0.0.1:8787` by default and exposes:

```http
POST /api/curriculum/recommend
Content-Type: application/json
```

Request:

```json
{ "goal": "백엔드 개발자가 되고 싶어" }
```

The response returns a `GeneratedCurriculumPlan`-compatible `plan` for the React Today Hub and Workspace.


## Implemented Mock Backend APIs

The current backend intentionally stays dependency-light and uses Node `http` with in-memory repositories. These APIs are a server boundary for the React screens before Express, Electron, SQLite, RAG, or code execution are introduced.

```http
POST   /api/curriculum/recommend
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
```

Current module boundaries:

- `backend/modules/curriculum`: matches a user goal to curriculum data and model output.
- `backend/modules/learning-progress`: stores mission run state, attempt count, active step, completion time, and activity log.
- `backend/modules/mistake-notes`: stores reusable mistake records from Git Lab, Workspace, algorithm, and API practice flows.
- `backend/modules/git-lab`: records Git command attempts and can create a linked mistake note for failed attempts.

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
