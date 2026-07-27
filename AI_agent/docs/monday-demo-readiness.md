# Monday Demo Readiness

Date: 2026-07-27

## Demo Core Flow

Demo one complete user flow first:

1. User signs up or logs in.
2. User enters career spec and target role in `/specs`.
3. Frontend saves the spec through `POST /api/specs`.
4. Backend stores the spec through Prisma in PostgreSQL.
5. User opens `/analysis` and runs AI analysis through `POST /api/analysis`.
6. Backend reads the saved user/spec data, creates an analysis result, and stores it.
7. User opens `/mission` and selects a recommended mission.
8. User checks mission progress in `/mission/:id`; progress is saved through `/api/missions/:missionId/progress`.
9. User uploads/submits a mission result in `/upload`; backend stores it through `/api/submissions`.
10. User opens `/feedback`; backend creates or loads feedback through `/api/feedback/latest`.
11. User opens `/portfolio`; backend creates or loads the portfolio draft through `/api/portfolio/latest`.

This is the demo path because it connects screen, server, and DB across the main product promise: spec registration -> analysis -> mission execution -> feedback -> portfolio.

## Monday Scope

Finish or verify these before the demo:

- Login/signup flow and protected-page redirects.
- Spec registration save/load.
- Analysis run and saved-result display.
- Mission recommendation list and mission detail page.
- Mission progress save/load.
- Submission save/load.
- Feedback generation/load for the latest submission.
- Portfolio draft generation/load from submission and feedback.
- Local FE build.
- Backend boot and health check.
- Environment variable list for first deployment.
- Secret check before pushing.

Defer until after Monday:

- First production deployment on Vercel and Render.
- Production PostgreSQL provisioning and migration run.
- Production SMTP verification.
- Production OpenAI/public API key setup and quota checks.
- Payment/plan/credit features.
- Growth analysis, condition check, and meal recommendation expansion.
- PR security review automation beyond the existing planning document.
- Visual polish that does not block the core flow.

## Local Verification

Completed checks:

- `npm run build`: passed. Vite built the frontend into `frontend/dist`.
- `npm.cmd --prefix backend test`: passed. 15 tests passed, 4 DB-dependent integration tests were skipped.
- `npm.cmd --prefix backend run db:generate`: passed. Prisma Client generated successfully.
- `npm.cmd --prefix backend start`: backend started on port `4000`.
- `GET http://localhost:4000/api/health`: returned `ok: true`, service `career-mission-api`.
- Secret scan with common token patterns: no matches found.
- `.env` files exist locally and are ignored by Git; `.env.example` files are tracked.

Not fully verified in this session:

- Full browser click-through with frontend and backend running together.
- PostgreSQL-backed end-to-end save/load, because a local PostgreSQL connection was not exercised.
- DB-dependent integration route tests, because the current test suite skips them without the required DB setup.
- Vercel and Render repository selection, because this requires the user's logged-in browser accounts.

## FE And BE Locations

- Frontend: `AI_agent/frontend`
- Backend: `AI_agent/backend`
- Root scripts: `AI_agent/package.json`
- Prisma schema: `AI_agent/backend/prisma/schema.prisma`
- Deployment examples: `AI_agent/frontend/.env.example`, `AI_agent/backend/.env.example`

## Environment Variables For Deployment

Frontend, Vercel:

- `VITE_API_BASE_URL`
- `VITE_GITHUB_URL`
- `VITE_DISCORD_URL`
- `VITE_CONTACT_EMAIL`

Backend, Render:

- `PORT`
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_FEEDBACK_ENABLED`
- `OPENAI_FILE_FEEDBACK_ENABLED`
- `SUBMISSION_FILE_MAX_BYTES`
- `CAREER_NET_API_KEY`
- `PUBLIC_DATA_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SEARCH_CACHE_TTL_MS`

## First Deployment Prep

Manual account checks for the user:

- Sign up for Vercel with GitHub.
- Sign up for Render with GitHub.
- Confirm the forked repository appears in Vercel.
- Confirm the forked repository appears in Render.
- If both services can select the forked repository, deployment preparation is complete.

Suggested first deployment split:

- Vercel project root: `AI_agent/frontend`
- Vercel build command: `npm run build`
- Vercel output directory: `dist`
- Render service root: `AI_agent/backend`
- Render build command: `npm install && npm run db:generate`
- Render start command: `npm start`

## PR Check Note

Add this result to the PR before merging:

```txt
Demo readiness check, 2026-07-27:
- Frontend build passed.
- Backend tests passed: 15 passed, 4 DB integration tests skipped.
- Prisma Client generation passed.
- Backend health check passed on /api/health.
- Common secret-pattern scan found no matches.
- Remaining risk: full FE -> BE -> PostgreSQL browser flow still needs a local or staging DB run.
```
