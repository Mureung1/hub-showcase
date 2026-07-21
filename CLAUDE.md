# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mealyze (formerly CJMT — the old name still appears throughout the codebase: the `cjmt` npm
package folder path, the `cjmt:` localStorage key prefix in `src/lib/storage.js` (kept as-is for
backward compatibility with existing guest data, not renamed), git history, and various comments)
— a Korean-language nutrition-tracking web app. A user photographs a meal; Gemini (via
OpenRouter) identifies the food and estimates portion size; the app looks up real nutrition figures
in Korea's 식약처 (food safety authority) nutrition DB; the app computes today's nutrient
deficiencies and recommends nearby restaurants: candidates are found via Naver Local search (API Hub)
and shown on an embedded Naver Map — both were migrated from Kakao equivalents, whose code is kept
in place, unused, as a rollback path (see below). All UI strings, prompts, and most code comments
are in Korean.

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

All API logic (`/api/gemini`, `/api/naver-places`, `/api/reverse-geocode`, `/api/places`,
`/api/geocode`, `/api/fooddb`, retry/timeout/fallback behavior) lives in **one file:
`server/proxy.js`**. It is consumed two ways:

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

The `/api/*` routes exist purely so the browser never needs its own API keys — the server holds
`OPENROUTER_API_KEY`, `KAKAO_REST_API_KEY`, `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`,
`FOODSAFETY_API_KEY`, `FOODSAFETY_PROC_API_KEY` and calls out on the client's behalf.
`/api/reverse-geocode` (coords -> rough district name, used to bias `/api/naver-places` queries since
Naver Local search has no radius param) reuses `KAKAO_REST_API_KEY` via Kakao's coord2address
endpoint — unrelated to the rollback-only Kakao search path below, just a convenient existing key.
The exceptions are `VITE_`-prefixed keys inlined into the
frontend bundle at `vite build` time (not runtime), meant to be public: `VITE_NAVER_MAP_CLIENT_ID`
(loads the Naver Maps JS SDK directly, `src/lib/useNaverMapLoader.js` -> `src/components/NaverPlaceMap.jsx`,
used by the map tab) and `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (Supabase client,
`src/lib/supabase.js` — the anon key is safe to expose because Row Level Security on the Supabase
side, not the key, is what restricts access). Changing any `VITE_` key requires a rebuild/redeploy,
not just an env var update — see README.md for the full env var table and per-platform deploy
checklists (Render/Vercel).

`VITE_KAKAO_JS_KEY`/`src/lib/useKakaoLoader.js`/`src/components/PlaceMap.jsx` (the pre-Naver map
display) and `KAKAO_REST_API_KEY`'s place-search use/`src/lib/kakao.js`'s `searchPlaces`/`/api/places`
(the pre-Naver restaurant search) are intentionally left in place, unused by any screen, as a
rollback path — `src/pages/MapPage.jsx` now sources restaurant candidates from
`src/lib/naverPlaces.js` (`searchNaverPlaces` -> `/api/naver-places`, NAVER API Hub 지역 검색) instead.
`toPlaceShape` in `MapPage.jsx` normalizes Naver's result fields into the same shape the (Kakao-era)
`PlaceList`/`NaverPlaceMap` components already expect (`place_name`/`road_address_name`/
`category_name`/`place_url`/`x`=lng/`y`=lat), so neither of those needs to know which search backend
is active.

### Leaderboard and ads (mockup)

MY 탭이 아니라 식단(`/meals`) 탭에 `LeaderboardCard`(`src/components/LeaderboardCard.jsx`)가 있다.
로그인 계정끼리만 "오늘의 순위"를 비교한다(게스트는 기기에 묶인 임시 식별자뿐이라 비교할 고정 신원이
없음) — `supabase/schema.sql`의 `get_daily_leaderboard()`(SECURITY DEFINER, rank/score/is_me만
반환, 다른 사용자의 실제 데이터는 노출 안 함)를 `src/lib/leaderboard.js`가 호출한다. **이 SQL 함수는
schema.sql을 다시 실행해야 실제 Supabase 프로젝트에 반영된다** — 아직 실행 전이면 로그인 사용자에게
에러가 뜬다. 채점 공식(`src/lib/nutritionScore.js`의 `calcNutritionScore`와 SQL 버전)은 반드시
동일하게 유지해야 한다. 게스트는 로그인 유도 문구와 함께 자기 자신의 "오늘의 점수"만 본다.

`src/lib/adData.js`(스폰서 식당 1곳 + 부족 영양소별 보충제 매핑)와 `src/components/AdCard.jsx`(AD
배지 + 제휴 고지 문구)는 실제 광고 네트워크/제휴 링크가 정해지지 않아 전부 목업(`link: '#'`)이다 —
실제 링크가 정해지면 `adData.js`의 값만 바꾸면 되고 화면 컴포넌트는 손댈 필요가 없다.

### Core domain flow: photo -> nutrition (`src/pages/Analyze.jsx`)

1. Photo + optional menu/brand hints go to Gemini (`src/lib/gemini.js` -> `/api/gemini`), which
   returns *only* food identification + estimated portion grams — not final nutrition numbers.
2. For each identified item, `findFoodMatch` in `Analyze.jsx` queries the 식약처 DB
   (`src/lib/fooddb.js` -> `/api/fooddb`) through a prioritized, de-duplicated cascade: `dbSearchName`
   in the food DB → **normalized canonical name** (`src/lib/foodNameMap.js`'s `normalizeFoodSearchName`,
   a client-side variant→표준명 map like 돌솥비빔밥→비빔밥·신라면→라면, as a safety net when the AI's
   `fallbackSearchName` isn't general enough) in food DB → `dbSearchName` in the processed-food DB →
   `dbSearchName` with a leading 2-char modifier stripped → `fallbackSearchName` in food DB →
   normalized name in processed-food DB → `fallbackSearchName` in processed-food DB. Same (term,
   dbSource) pairs are searched only once. If the server reports `FOODDB_CONNECTION_FAILED` (upstream
   unreachable, e.g. certain deploy regions), the cascade aborts immediately rather than retrying
   every remaining attempt against a dead host. In dev builds (`import.meta.env.DEV`), each resolved
   item logs a `[분석 진단]` line (matched term / grams / final nutrients) to help spot accuracy gaps.
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

### Guest-first: login is optional, storage mode follows it

Login is never required. Opening the app always lands directly on `/analyze` regardless of body-info
profile or login state (`RootRedirect` in `src/router.jsx`) — a missing profile is handled in-place on
that screen (`Analyze.jsx`'s `SexPromptCard`) rather than by redirecting elsewhere, and every screen
fully works signed out. Real login (Google OAuth or email/password via Supabase Auth,
`src/lib/supabase.js`) is an opt-in entry point surfaced in the header and the MY tab
(`src/components/Header.jsx`, `src/pages/Profile.jsx`) — not a gate. `src/router.jsx` has no
login-based redirect at all; its only guard (`LoadGate`) waits for session/profile loading to settle
and shows a retry card on fetch failure, regardless of login state.

`src/lib/dataStore.js` is the storage abstraction that makes this possible: `getProfile`/
`saveProfile`/`getMeals`/`addMeal`/`deleteMeal`/`getMealsByDateRange` each call
`supabase.auth.getSession()` (cheap, local-only) to decide per-call whether to read/write
`localStorage` (guest — no session) or Supabase via `src/lib/db.js` (logged in). Screens never branch
on login state themselves; they only call `dataStore`. Guest data lives under a single fixed bucket
id, `dataStore.GUEST_ID`, since there's no per-guest identity to key by (one browser = one guest).
`UserContext` (`src/context/UserContext.jsx`) exposes `effectiveUserId` (Supabase uid when logged in,
else `GUEST_ID`) for the handful of purely-local features that still need an id to key by directly
(`src/lib/dayStatus.js`'s manual day-status picks, CSV export/import's `user` argument) — `authUser`
(Supabase session info, `null` for guests) is kept separate and used only for login-gated UI (header
email/logout, `Login.jsx`'s post-login redirect). `profile`/`recommended`/`effectiveRecommended` are
top-level context values available regardless of login state; there's no `user.profile`-style nesting
that would be `null` for guests.

There is no migration path from guest-mode local data into a Supabase account on login — if a guest
later logs in, their local data stays on the device (readable again if they log out), and the account
starts fresh in Supabase. `src/lib/csv.js`'s header comment documents this and the separate legacy
policy for pre-Supabase-Auth accounts in more detail.

`supabase/schema.sql` has the Postgres schema (`profiles`/`meals`, RLS policies scoped to
`auth.uid()`) for the logged-in-only storage path.

- `src/lib/mealStore.js`: guest mode's live meal storage (via `dataStore.js`, keyed by
  `dataStore.GUEST_ID`) *and* the CSV export/import subsystem's self-contained legacy storage for
  logged-in accounts (via `src/lib/csv.js`) — see that file's header comment for which is which.
  Storage unit is one **meal record** (all food items from a single photo analysis grouped together,
  e.g. a multi-dish tray), not one food item — `isSetMeal`/`flattenMealItems` distinguish/reflatten as
  needed. Deletion is meal-record-level only. Old-format records (pre-grouping, one food = one record)
  are normalized on read.
- `src/lib/records.js`: legacy per-day saved analysis snapshot, read only as a Calendar.jsx fallback
  for dates predating the Supabase meals migration.

### Routing and design system

- `src/router.jsx`: `react-router-dom` routes. `RootRedirect` handles `/` (always -> `/analyze`, unless
  loading or a profile-fetch error is in progress); `LoadGate` wraps every other content route and only
  blocks on session/profile loading, never on login state. Every route wraps content in `AppShell` (adds the bottom tab bar)
  except `/login`, which passes `hideTabBar` — `/profile` shows the tab bar in both its onboarding and
  MY-tab uses, since both need to stay navigable via the tab bar.
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
