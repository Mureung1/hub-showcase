# ICU Backend

This folder contains server-side code for ICU. The frontend must not call Gemini, Vertex AI, OpenAI, or other model providers directly from the browser.

## Curriculum Agent API

```bash
npm run server:curriculum
```

The server listens on `http://127.0.0.1:8787` by default and exposes:

```http
POST /api/curriculum/recommend
Content-Type: application/json
```

Request:

```json
{ "goal": "백엔드 개발자가 되고 싶어" }
```

The response returns a `GeneratedCurriculumPlan`-compatible `plan` for the React Today Hub and Workspace.

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
```

Without that flag, the React app keeps using mock curriculum generation.
