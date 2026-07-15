# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CJMT — a Korean-language nutrition-tracking web app. A user photographs a meal; Gemini (via
OpenRouter) identifies the food and estimates portion size; the app looks up real nutrition figures
in Korea's 식약처 (food safety authority) nutrition DB; the app computes today's nutrient
deficiencies and recommends nearby restaurants via Kakao Maps. All UI strings, prompts, and most
code comments are in Korean.

## Commands

Local dev requires **two terminals** (both read `.env`):

```bash
npm run server   # Express proxy, http://localhost:8787
npm run dev      # Vite dev server, http://localhost:5173 (proxies /api -> 8787, see vite.config.js)
```

Reproduce the production build locally (same code path as Render):

```bash
npm run build
npm run start    # NODE_ENV=production node server/proxy.js — serves dist/ + API on :8787
```

```bash
npm run lint      # oxlint
npm run preview   # vite preview (static preview of dist/, no API — use npm run start for that)
```

There is no test suite/runner configured in this repo (no test script, no test files). Verify
changes by running the app (see above) and exercising the flow in-browser.

To exercise the Vercel serverless path (`api/index.js`) locally, use `vercel dev` — see the "Vercel
CLI로 로컬에서 서버리스 함수 테스트하기" section of README.md. Since `server/proxy.js` loads `.env`
itself via `dotenv/config`, an existing filled-in `.env` is enough; `vercel pull`/login only needed
to pull team-shared env vars instead.

## Architecture

### One Express app, two deployment entry points

All API logic (`/api/gemini`, `/api/places`, `/api/fooddb`, retry/timeout/fallback behavior) lives
in **one file: `server/proxy.js`**. It is consumed two ways:

- **Render / local (`npm run server`, `npm run start`)**: `server/proxy.js` is run directly and
  calls `app.listen()`. When `NODE_ENV=production` (and not on Vercel) it also serves the built
  `dist/` and falls back unmatched non-API GET routes to `index.html` for SPA routing.
- **Vercel (`api/index.js`)**: re-exports the same Express app as a serverless function handler and
  never calls `app.listen()`. Detection is via `process.env.VERCEL` (auto-set by Vercel) — when
  present, `server/proxy.js` skips both `.listen()` and static file serving, since Vercel/`vercel.json`
  handles static assets and SPA rewrites itself. `vercel.json`'s rewrite sends `/api/*` to
  `api/index.js` with the original subpath preserved via a `?vercelSubpath=` query param, which
  `server/proxy.js` restores onto `req.url` when `process.env.VERCEL` is set.

Both deployments coexist in the same repo/branch; nothing needs to be picked at build time.

### Why a proxy exists at all

The three `/api/*` routes exist purely so the browser never needs its own API keys — the server
holds `OPENROUTER_API_KEY`, `KAKAO_REST_API_KEY`, `FOODSAFETY_API_KEY`, `FOODSAFETY_PROC_API_KEY`
and calls out on the client's behalf. The exceptions are `VITE_`-prefixed keys inlined into the
frontend bundle at `vite build` time (not runtime), meant to be public: `VITE_KAKAO_JS_KEY` (loads
the Kakao Maps JS SDK directly, `src/lib/useKakaoLoader.js`) and `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` (Supabase client, `src/lib/supabase.js` — the anon key is safe to expose
because Row Level Security on the Supabase side, not the key, is what restricts access). Changing
any `VITE_` key requires a rebuild/redeploy, not just an env var update — see README.md for the full
env var table and per-platform deploy checklists (Render/Vercel).

### Core domain flow: photo -> nutrition (`src/pages/Analyze.jsx`)

1. Photo + optional menu/brand hints go to Gemini (`src/lib/gemini.js` -> `/api/gemini`), which
   returns *only* food identification + estimated portion grams — not final nutrition numbers.
2. For each identified item, `findFoodMatch` in `Analyze.jsx` queries the 식약처 DB
   (`src/lib/fooddb.js` -> `/api/fooddb`) through a prioritized cascade: `dbSearchName` in the food
   DB → `dbSearchName` in the processed-food DB → `dbSearchName` with a leading 2-char modifier
   stripped → `fallbackSearchName` in food DB → `fallbackSearchName` in processed-food DB. If the
   server reports `FOODDB_CONNECTION_FAILED` (upstream unreachable, e.g. certain deploy regions),
   the cascade aborts immediately rather than retrying every remaining attempt against a dead host.
3. A DB match's per-100g nutrients are scaled to the resolved consumed grams
   (`resolveConsumedGrams`/`scaleNutrients` in `src/lib/nutrition.js`), then passed through
   `clampToPlausibleNutrients`, which corrects DB records whose *per-serving* values are
   unrealistic for specific well-known Korean dishes (keyword-matched, e.g. 짜장면/비빔밥/찌개).
4. If no DB match is found at all, the AI's own `estimatedNutrients` are used as a fallback, still
   passed through the same plausibility clamp.
5. `src/lib/nutrition.js` is the single source of truth for nutrient math: BMR/TDEE-based
   recommended intake (`calcRecommendedNutrients`), the 6-nutrient schema (`NUTRIENT_LABELS`), and
   the 3-state day/nutrient status classifiers used across Result/Calendar/etc.

When touching this flow, prefer extending the keyword tables in `nutrition.js`
(`PORTION_REFERENCE_G`, `NUTRIENT_PLAUSIBILITY`) over adding one-off special cases elsewhere.

### Auth vs. data: two different backends

Login itself is real Supabase Auth (`src/lib/supabase.js`, `@supabase/supabase-js`) — Google OAuth
(`signInWithOAuth`) and email/password (`signUp`/`signInWithPassword`), no more demo/guest login and
no plaintext passwords. `UserContext` (`src/context/UserContext.jsx`) subscribes to
`supabase.auth.onAuthStateChange` and exposes the current session as `user`; `authLoading` stays
true until the initial `getSession()` resolves, so `RequireAuth` (`src/router.jsx`) can avoid
bouncing an already-logged-in user to `/login` while that's in flight. Google's OAuth redirect comes
back to `/login` (no separate callback route) and Supabase auto-parses the token from the URL;
`Login.jsx`'s `useEffect` watches `user` and sends both the OAuth and password paths to the same
place: `/profile` if `user.profile` is empty, `/analyze` otherwise.

Everything *other than login* — profile/recommended-nutrients/today's meals — still lives in
`localStorage` via `src/lib/storage.js` (a thin prefixed get/set/remove wrapper), now keyed by the
Supabase user's `id` (uuid) instead of the old custom username/guest id. `supabase/schema.sql` has a
Postgres schema for eventually moving this data into Supabase too, but that migration hasn't
happened — `UserContext`'s `localProfiles`/`updateUser` is the only place that would need to change
when it does.

- `src/lib/mealStore.js`: today's meal list. Storage unit is one **meal record** (all food items
  from a single photo analysis grouped together, e.g. a multi-dish tray), not one food item —
  `isSetMeal`/`flattenMealItems` distinguish/reflatten as needed. Deletion is meal-record-level
  only. Old-format records (pre-grouping, one food = one record) are normalized on read.
- `src/lib/records.js`: per-day saved analysis snapshot (for Result/Calendar), keyed by
  `toDateKey(date)`.

### Routing and design system

- `src/router.jsx`: `react-router-dom` routes, gated by `RequireAuth` (redirects to `/login` if no
  Supabase session). Every route wraps content in `AppShell` (adds the bottom tab bar) except
  `/login`, which passes `hideTabBar` — `/profile` shows the tab bar in both its onboarding and MY-tab
  uses, since both need to stay navigable via the tab bar.
- `src/styles/theme.js` is the single source of design tokens (colors, spacing, radius, shadow,
  font, layout, and shared inline `styles.*` objects like `styles.page`/`styles.card`) — components
  should reference these tokens, not hardcode hex/px values. Interactive elements get
  `className="tds-press"` (defined in `src/index.css`) for the shared press animation.
- **`.claude/commands/toss.md`** (invoked via `/toss`) is a project-specific skill applying Toss
  design-system conventions, with detailed docs under `디자인/docs/`. Note one intentional
  deviation documented in `theme.js`'s header comment: this app uses a single green accent
  (`#059669`) as its one primary/accent color everywhere the Toss docs describe blue — follow
  `theme.js` as the actual token source, and `/toss` for everything else (one primary button per
  screen, full state coverage, spacing/radius scale, copy tone, etc.).

### Linting

`oxlint` (`.oxlintrc.json`) with `react`/`oxc` plugins; `react/rules-of-hooks` is an error and
`react/only-export-components` is a warn.
