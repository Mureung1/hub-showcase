# Project Guidance

## Project

This repository implements a mobile-first web service for local-clinic remote waiting. Patients join the clinic's real walk-in queue before arrival, while clinic staff manage remote and on-site entries in one queue.

Read these files before changing behavior:

- Product plan: `docs/plan.md`
- System rules: `docs/feature-spec.md`
- Data model: `docs/erd.md`
- UX structure: `docs/ux-structure.md`
- Design system: `docs/design-system.md`
- Development checklist: `docs/checklist.md`

If these documents conflict, use `docs/plan.md` for product scope, `docs/feature-spec.md` for behavior, and `docs/erd.md` for persisted data. Ask before changing product scope.

## Stack

- `apps/patient-web/`: patient-facing React 19 + Vite + TypeScript app
- `apps/staff-web/`: clinic staff React 19 + Vite + TypeScript app
- `apps/platform-admin-web/`: minimal platform administrator app for inquiry and application review
- `apps/api/`: Node.js + Express 5 + TypeScript, ESM, `tsx` for development
- `packages/shared/`: shared TypeScript types and Zod schemas
- `packages/design-system/`: canonical shared CSS design tokens
- Auth: Supabase Auth with confirmed email and password; Brevo provides Custom SMTP
- Data: Supabase PostgreSQL through `pg`, SQL repositories, and Supabase CLI migrations
- `prototype/`: static HTML and CSS only; do not add JavaScript or external CDNs

The repository uses npm workspaces. Install dependencies and run aggregate checks from the repository root.

## Commands

Run commands from the repository root.

```text
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Default development ports are `5173` for patients, `5174` for staff, `5175` for platform administrators, and `3000` for Express.

## MVP Rules

- Prioritize the P0 flow in `docs/checklist.md` before P1 or P2 work.
- Treat one family as one waiting entry using the clinic's versioned patient categories or total-only input mode.
- Calculate queue load from the number of patients, not the number of family entries.
- Keep remote and on-site entries in the same real treatment queue.
- Require a patient account and login for remote waiting. Allow staff-created on-site waiting without a patient account.
- Require email confirmation before login. Supabase Auth owns passwords and sessions; never store password hashes in application tables.
- Allow at most one active remote waiting per patient account across all clinics.
- Supported states are `remote_waiting`, `entry_requested`, `onsite_waiting`, `held`, `called`, and `cancelled`.
- Treat deferring as a queue-order action recorded separately from no-show movement, not as a persistent status.
- Send mock preparation notification at position 6 and mock entry request at position 4. Start the 20-minute arrival deadline only for the entry request.
- Let clinic staff confirm a remote patient's arrival and desk registration. Do not add a patient arrival-code flow.
- On-site patients use an opaque status link without direct defer or cancel actions; invalidate it immediately on call or cancellation.
- Limit remote capacity to 20 patients by default and never apply that limit to staff-created on-site entries.
- `called` means the entry left the waiting queue; this project does not manage medical treatment details.
- Estimated time is advisory and must be shown with a notice that clinic conditions can change it.
- Staff may reorder entries for medical operations without exposing the reason to other patients.
- MVP Alimtalk, clinic verification, evidence upload, approval, and nearby results are mocked. Real providers and clinic-system integrations are P2.
- Poll active patient and staff status endpoints every 10 seconds.
- Run arrival-expiration work every minute in the single Express process and guard it with a PostgreSQL advisory lock. Supabase Cron is P2.

## Architecture Boundaries

- React may call Supabase directly only for Auth. All hospital and waiting data goes through Express.
- Send the Supabase access token to Express as a Bearer token and validate it before profile and role checks.
- Access PostgreSQL only from repositories through `pg`; keep SQL out of routes, React, and service orchestration.
- Wrap multi-row queue changes, event records, and notification records in one PostgreSQL transaction.
- Manage schema, indexes, constraints, and RLS in `supabase/migrations`; do not make undocumented Dashboard-only schema changes.
- Use the cloud Supabase development project with test data only. MVP runs locally; external deployment and a separate production project are P2.

## Engineering Conventions

- Use the existing folder boundaries: routes, services, repositories, types, middleware, pages, components, hooks, and utils.
- Keep queue calculations and state-transition rules out of React page components.
- Use the existing fetch wrapper instead of adding Axios.
- Use explicit TypeScript types in the server; do not use `any` or guess missing domain fields.
- Keep patient-facing identifiers opaque. Do not collect patient names, birth dates, or symptoms in MVP, and never expose phone numbers in public queue views.
- Preserve user changes and avoid unrelated refactors.
- React components and types use `PascalCase`; functions and variables use `camelCase`.
- Database tables and columns use `snake_case`; API paths use plural nouns and `kebab-case`.
- Store instants as PostgreSQL `timestamptz` in UTC and calculate clinic business dates in `Asia/Seoul`.
- Return successful API resources directly. Return errors as `{ error: { code, message, details } }`.
- Commit prefixes are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, followed by a concise Korean summary.
- Keep commits scoped to one checklist item or one tightly coupled change set.
- Never expose the database URL, Supabase secret key, Brevo SMTP password, phone numbers, or status tokens to the browser or logs.

## Planning Work

- Use the repo skill `plan-development` when splitting requirements, prioritizing a backlog, comparing plans, or scheduling a sprint or week.
- Confirm which context documents may be read before loading them.
- The planning skill proposes plans only. Do not let it modify files, GitHub Issues, GitHub Projects, or external services.

## Feature Verification

- Use the repo skill `verify-feature` after implementing a vertical slice, API, UI flow, DB behavior, bug fix, or checklist item and before marking it complete.
- Confirm which requirement documents may be read before loading them.
- The verification skill reports evidence, defects, likely causes, recommended fixes, and retest steps. It must not modify code, documents, checklists, Git state, or external data.
- Ask for approval before reading from or writing to Supabase or another external system. Use development data and transaction rollback whenever possible.
- Do not treat mock behavior or passing tests as proof of an unverified real integration.

## Product Comparison

- Before deciding product policies or workflow details, compare the relevant public Catchtable flow when an equivalent exists.
- Prefer current official Catchtable pages, terms, and business guides over third-party summaries.
- Separate verified behavior from inference, and ask before adopting an inferred rule.
- Use Catchtable as a reference, not a specification. Account for the difference between restaurant operations and medical-clinic identity, privacy, and desk-registration requirements.
- Record the project-specific decision in the plan or feature specification so implementation does not depend on the external service remaining unchanged.

## UI Work

- Use the repo skill `build-clinic-ui` for UI creation, styling, responsive work, or visual QA.
- Treat `docs/design-system.md` as the visual rulebook and `packages/design-system/styles.css` as the canonical code export.
- Inspect the matching file in `docs/assets/design/` before implementing patient registration, patient status, or staff queue screens.
- Patient screens are mobile-first and optimized for one-handed use.
- Staff queue screens prioritize fast scanning and repeated actions.
- Never communicate queue state by color alone; pair text with an icon or status marker.
- Use one primary action per view and keep touch targets at least 44px.
- Use existing `--bj-*` tokens before adding raw colors, spacing, radii, or shadows. Add new tokens only in the canonical token file.
- Keep the default radius at 6px and never exceed 8px except for status pills.
- Do not reuse PlaceSync-specific labels, sample data, screens, or platform concepts.

## Verification

- Run the narrowest relevant checks after each change.
- For frontend changes, run root `npm run lint`, `npm run typecheck`, and `npm run build`.
- For server changes, also run root `npm test`.
- For end-to-end queue work, verify two browser sessions: one patient view and one staff view.
- Do not report completion while required checks are failing.
