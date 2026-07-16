# Done History

This file records work that has already been installed, created, implemented, or intentionally deferred in this project. The daily planning skill must read this file before suggesting today's tasks, so it does not repeat completed work as new work.

## How To Update

- Add a new dated section when meaningful work is completed.
- Keep entries short and factual.
- Record enough evidence that a future daily plan can distinguish completed work from work that only needs verification.
- Include related files and verification commands when they are known.
- Use "Do not suggest again" for tasks that should not appear again as new work.

## Entry Template

```md
## YYYY-MM-DD

### Completed
- Work item
  - Related files: `path/to/file`
  - Verification: `command`
  - Do not suggest again: task wording to avoid

### Installed
- Package or tool
  - Related files: `package.json`, `package-lock.json`
  - Do not suggest again: reinstalling this package

### Verify Only
- Item that exists but still needs real-environment confirmation
  - Reason: why this is verification-only, not new implementation

### Deferred
- Item intentionally left for later
  - Reason: why it is not today's work
```

## 2026-07-16

### Previously Completed From Repository Evidence
- Set up the Vite + React app structure and development scripts.
  - Related files: `package.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `index.html`
  - Evidence: commit `6cfbe57` and current `package.json`
  - Do not suggest again: creating the initial Vite/React project or basic npm scripts
- Added React Router routes for `/login`, `/customer`, customer subpages, and `/owner`.
  - Related files: `src/main.jsx`, `src/App.jsx`
  - Evidence: commit `c86cca6`; `BrowserRouter`, `Routes`, `Route`, and `ProtectedRoute` exist
  - Do not suggest again: setting up the first app routes from scratch
- Added Supabase client wiring for frontend access.
  - Related files: `src/services/supabaseClient.js`, `src/services/index.js`, `package.json`, `package-lock.json`
  - Evidence: commit `c86cca6`; `@supabase/supabase-js` is listed in dependencies
  - Do not suggest again: creating the Supabase client file or installing the Supabase JS client
- Prepared the initial stamp MVP database schema migration.
  - Related files: `supabase/migrations/202607130001_create_stamp_schema.sql`
  - Evidence: commit `8fc52c9`
  - Do not suggest again: writing the first schema migration for `customers`, `cafes`, `profiles`, `stamp_cards`, `coupons`, and `notifications`
- Prepared demo seed data for cafes, customers, and stamp cards.
  - Related files: `supabase/seed.sql`
  - Evidence: commit `605cda5`
  - Do not suggest again: creating the first demo seed data for cafes, customers, and stamp cards
- Prepared template SQL for connecting Supabase Auth users to demo profiles.
  - Related files: `supabase/demo_profiles.template.sql`
  - Evidence: current repository file
  - Do not suggest again: creating the initial demo profile template from scratch
- Prepared a demo reset helper for the known stamp/coupon test scenario.
  - Related files: `supabase/restore_demo_scenario.sql`
  - Evidence: current repository file
  - Do not suggest again: creating the first restore script for the demo scenario
- Connected email/password login, logout, session restore, and role-based screen routing.
  - Related files: `src/App.jsx`
  - Evidence: commit `24dc8a8`; `supabase.auth.signInWithPassword`, `signOut`, `getSession`, and `onAuthStateChange` exist
  - Do not suggest again: implementing the first auth session and role routing flow from scratch
- Connected the customer home screen to Supabase customer and stamp-card data.
  - Related files: `src/App.jsx`
  - Evidence: commit `27c8937`; customer screen reads `customers`, `stamp_cards`, and joined `cafes`
  - Do not suggest again: building the first customer DB read for member number and cafe stamp cards
- Connected the owner screen to Supabase cafe data.
  - Related files: `src/App.jsx`
  - Evidence: commit `27c8937`; owner screen reads `cafes` by `profile.cafe_id`
  - Do not suggest again: building the first owner DB read for the assigned cafe

### Installed
- Runtime dependencies are already present in `package.json`.
  - Packages: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`
  - Related files: `package.json`, `package-lock.json`
  - Do not suggest again: installing React, React Router, or Supabase JS as new setup
- Development dependencies are already present in `package.json`.
  - Packages: `vite`, `@vitejs/plugin-react`, `oxlint`, `supabase`, `@types/react`, `@types/react-dom`
  - Related files: `package.json`, `package-lock.json`
  - Do not suggest again: installing the initial Vite, Oxlint, or Supabase CLI npm package setup as new work

### Completed
- Created the project-level done history file for daily planning.
  - Related files: `docs/done-history.md`
  - Do not suggest again: creating a separate completed-work history file
- Updated the daily planning skill to read and update the done history.
  - Related files: `skills/beginner-issue-day-plan/SKILL.md`, `docs/done-history.md`
  - Do not suggest again: adding done-history awareness to the daily planning skill

### Verify Only
- Confirm the migration has been applied to the real Supabase project.
  - Related files: `supabase/migrations/202607130001_create_stamp_schema.sql`
  - Reason: the migration file exists locally, but real project application depends on the user's Supabase environment.
- Confirm demo seed data and demo profile template have been run against the real Supabase project.
  - Related files: `supabase/seed.sql`, `supabase/demo_profiles.template.sql`
  - Reason: local SQL files exist, but Auth user IDs and real project data are environment-specific.
- Confirm deployed or local environment variables are filled in.
  - Related files: `src/services/supabaseClient.js`
  - Reason: the client expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, but actual values are not committed.
- Confirm customer and owner DB views work against the real Supabase project with valid demo accounts.
  - Related files: `src/App.jsx`, `supabase/demo_profiles.template.sql`
  - Reason: code exists, but end-to-end behavior depends on live Auth users, RLS, and seeded data.
- Keep this file updated when a daily work session ends.
  - Reason: this depends on what was actually completed during each session.
- Skill quick validation could not run in this environment because PyYAML is missing.
  - Verification attempted: `python C:\Users\seong\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills\beginner-issue-day-plan`
  - Reason: the validator imports `yaml`, but the available Python environments do not include that module.

### Not Yet Completed
- Customer lookup by member number on the owner screen.
  - Related files: `src/App.jsx`
  - Reason: the owner screen currently shows cafe info, but does not yet include member-number lookup.
- Stamp earning, coupon issuing, and notification creation flow.
  - Related files: `src/App.jsx`, `supabase/migrations/202607130001_create_stamp_schema.sql`
  - Reason: schema exists, but the transaction/RPC and owner action flow are not implemented yet.
- Real QR generation and scanner/paste handling.
  - Related files: `src/App.jsx`
  - Reason: current customer screen displays a visual placeholder, not an actual QR generation flow.
