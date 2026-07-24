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

### Android app wrapper (Capacitor)

The same web build (`dist/`) is also wrapped as an Android WebView app via Capacitor (`capacitor.config.json`,
`android/` native project committed, `npm run app:sync`/`app:sync:config`/`app:open`). The web app is unchanged
and stays the primary target; the app is purely a wrapper. **`capacitor.config.json` is currently set to
server-URL mode** — `server.url` points at the deployed site (`hub-iota-seven.vercel.app`), so the app loads
the live site whole and **a web push auto-updates the app with no APK rebuild**; the bundled `dist/` is then
unused. `server.allowNavigation` (our domain + `*.supabase.co`) keeps the WebView on known origins — anything
else Capacitor kicks to the system browser (CapConfig reads `server.allowNavigation`; `BridgeWebViewClient`
does `bridge.launchIntent` for off-list URLs). To revert to local-bundle mode, delete the `server` block and
build with `VITE_API_BASE_URL` set. Two things make it work across both modes: `src/lib/apiBase.js`
(`API_BASE` = `VITE_API_BASE_URL || ''` — empty on web/server-URL so `/api` stays same-origin relative, set to
the deployed backend URL only for local-bundle builds; prepended in `fetchWithTimeout`) and `src/lib/externalLink.js`
(`openExternalLink` — opens external links in the system browser on native via `@capacitor/browser`, new
tab on web; used by ad/map links since WebView blocks `target="_blank"`). `src/lib/useAndroidBackButton.js`
(called in `App.jsx`, native-only) makes the hardware back button navigate back on sub-screens and exit at the
`/analyze` home — being web code, it only takes effect once deployed. Camera (`<input type=file>`) and
`navigator.geolocation` need **no native code**: Capacitor's default `BridgeWebChromeClient` handles
`onShowFileChooser`/`onGeolocationPermissionsShowPrompt`/`onPermissionRequest`, so `MainActivity` stays a plain
`BridgeActivity`. Header/tab-bar use `env(safe-area-inset-*)`. Full build steps, the server-URL-vs-local-bundle
tradeoff, and the known CSV-download WebView limitation are in `docs/apk-build-guide.md`. **Capacitor is additive
— none of it affects the web build** (`@capacitor/*` is inert on web; `Capacitor.isNativePlatform()` is false there).

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

`src/lib/foodCategory.js` is the single source for the 지도 탭's "음식 종류" filter (전체/한식/중식/일식/
양식/분식/아시안/카페·디저트): the list itself, the per-category search-keyword pool, the tokens that
decide whether a Naver `category` string belongs to a category, and the selected value (stored per
*device* in localStorage, following `cardSettings.js`'s reasoning — it's a screen preference, not
account data). `MapPage` feeds the chosen category into the keyword-generation prompt, then filters
the search results by category and, if that leaves nothing, relaxes in steps (search by the category
name alone → fall back to uncategorized results **with an on-screen notice**) rather than silently
showing another cuisine. `전체` keeps the exact pre-existing behavior, prompt text included.
`src/lib/foodCategory.test.js` covers the matching/filtering rules.

### Ads: Coupang Partners supplements (real data path, placeholder links)

식단(`/meals`) 탭의 "부족한 영양소는?" 가로 캐러셀(`src/components/DeficientNutrientAds.jsx`)이 유일한
광고 노출 지점이다(결과 화면 `Result.jsx`의 세로형 `AdCard`가 같은 데이터를 재사용). 세 층이 분리돼 있다:
`src/data/coupangProducts.js`(상품 데이터 — **파트너스 승인 후 이 파일의 값만 교체**하면 되고 로직/화면은
안 건드린다), `src/utils/adRecommendation.js`(순수 함수 `recommendAdProducts` — 실측 부족 영양소 상위 1~3개
→ 없으면 폴백 미량영양소 순환. **절대 빈 배열을 반환하지 않아** 배너가 비는 상태가 없다),
`src/lib/adData.js`(로컬 노출/클릭 집계만). 상품 `nutrient` 키는 앱이 추적하는 5개(`protein`/`fiber`/
`calories`/`carbs`/`fat` — `NUTRIENT_LABELS`와 동일)와 앱이 추적하지 않는 폴백 전용 미량영양소
(`vitaminD`/`calcium`/…)가 섞여 있고, `AD_NUTRIENTS`의 `tracked` 플래그가 둘을 구분한다. `sodium`은
한도형이라 의도적으로 없다. `COUPANG_DISCLOSURE` 문구와 AD 배지는 어떤 상태에서도 렌더링을 생략하면
안 된다(법정 고지). 추천 로직 검증은 `npm run check:ads`
(`scripts/check-ad-recommendation.mjs` — 이 저장소엔 테스트 러너가 없어 노드 단언 스크립트로 대신한다).
식당 광고는 PRD v2.0 §6에서 스코프 아웃돼 관련 목업(`SPONSORED_RESTAURANTS`, `PlaceList`의 `isAd` 분기)이
제거됐다.

### Leaderboard

MY 탭이 아니라 식단(`/meals`) 탭에 `LeaderboardCard`(`src/components/LeaderboardCard.jsx`)가 있다.
로그인 계정끼리만 "오늘의 순위"를 비교한다(게스트는 기기에 묶인 임시 식별자뿐이라 비교할 고정 신원이
없음) — `supabase/schema.sql`의 `get_daily_leaderboard()`(SECURITY DEFINER, rank/score/is_me만
반환, 다른 사용자의 실제 데이터는 노출 안 함)를 `src/lib/leaderboard.js`가 호출한다. **이 SQL 함수는
schema.sql을 다시 실행해야 실제 Supabase 프로젝트에 반영된다** — 아직 실행 전이면 로그인 사용자에게
에러가 뜬다. 채점 공식(`src/lib/nutritionScore.js`의 `calcNutritionScore`와 SQL 버전)은 반드시
동일하게 유지해야 한다. 게스트는 로그인 유도 문구와 함께 자기 자신의 "오늘의 점수"만 본다.

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
fully works signed out. Real login is an opt-in entry point surfaced in the header and the MY tab
(`src/components/Header.jsx`, `src/pages/Profile.jsx`) — not a gate. `src/router.jsx` has no
login-based redirect at all; its only guard (`LoadGate`) waits for session/profile loading to settle
and shows a retry card on fetch failure, regardless of login state.

**Auth is ID + password only** (`/login`, `/signup`; Google OAuth was removed in week 3 because
embedded-WebView OAuth is blocked in the APK). It still runs entirely on Supabase Auth — nothing about
sessions, JWTs, `auth.uid()`, or RLS changed. `src/lib/authId.js` is the whole seam: it maps a user's
login id to a synthetic internal email `<id>@mealyze.app` before handing it to
`supabase.auth.signUp`/`signInWithPassword`, so GoTrue keeps doing the bcrypt hashing and the email
column's UNIQUE constraint doubles as login-id uniqueness. That domain never receives mail — the
Supabase project **must have "Confirm email" off**, or signup stalls waiting for a confirmation that
can't arrive (`supabase/migrations/2026-07-22_id-password-auth.sql` documents the dashboard settings,
plus the backup/delete/verify SQL for purging the old Google-linked accounts). Nickname and the raw
login id live in `user_metadata` (`authId.js`'s `displayNameOf` picks nickname > id > email local
part); the synthetic email is never shown in the UI. `authId.js` also holds the pure validation rules
and the per-id "5 failures → 1 min" local lockout (a UX-level deterrent in front of Supabase's own
server-side rate limiting, not a replacement for it).

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

Guest-mode local data can be migrated into a Supabase account on login, but only via an explicit
one-time opt-in prompt: right after login, if localStorage holds guest data, `GuestMigrationPrompt`
(rendered globally in `router.jsx`) offers to copy it up. `src/lib/guestMigration.js` +
`UserContext.acceptGuestMigration` do the upload — profile only if the account has none (never
overwrites), meals deduped per record via a `guestMigration:<userId>` state (`doneMealIds`), with a
re-entrancy guard so a double-tap can't double-insert. Declining (or having no guest data) just
proceeds with the account. The local guest data is left on the device either way (readable again if
they log out) — it is never deleted by the migration. `src/lib/csv.js`'s header comment documents the
separate legacy policy for pre-Supabase-Auth accounts in more detail.

`supabase/schema.sql` has the Postgres schema (`profiles`/`meals`, RLS policies scoped to
`auth.uid()`) for the logged-in-only storage path.

### CSV backup: two formats, one importer, three environments

**There are two export entry points and their formats differ** — MY 탭's full backup
(`[profile]`/`[meals]` sections, via `dataBackup.js`) and 달력 탭's date-range export (a flat table with
`recommended_*`/`compliant`, via `csv.js`). A user must never have to remember which button produced a
file, so **the single importer auto-detects both** (by content, not filename). Every column constant,
serializer, and parser for both formats lives in **`src/lib/backupFormat.js`** — a pure module with no
storage/browser dependency — and both exporters import from it, so the two sides cannot drift apart.
That drift is exactly what caused the "exported file can't be re-imported" bug: the flat format had no
reachable reader (`csv.js`'s `importCSV` existed but nothing called it; it has since been deleted).
`npm run check:csv` (`scripts/check-csv-roundtrip.mjs`) guards the regression by importing the *real*
serializers and parsing their output back — never re-implement the format inside the test.



MY 탭's export/import (`src/components/DataBackupPanel.jsx` → `src/lib/dataBackup.js`) works for guests
*and* logged-in accounts — it goes through `dataStore` (`getAllMealsByDate`/`replaceMealsForDates`), so
it never branches on login state. `src/utils/platform.js`'s `getPlatform()` (`'web' | 'mobile-web' |
'apk'`) is the single source for platform branching, and `src/lib/fileExport.js`'s `saveTextFile()` is
the only place that actually writes a file: browser blob download on web, `@capacitor/filesystem` →
public `Documents` (falling back to app cache) + `@capacitor/share` on native, always with a UTF-8 BOM
so Excel doesn't mangle Korean. Import is deliberately two-phase — `parseBackupCSV` (pure, writes
nothing) then `applyBackup` — so the duplicate-date "overwrite / skip" dialog can sit between them;
row-level parse failures are skipped and counted rather than aborting the file, while a wrong *file*
(missing section markers / mismatched header) aborts before writing anything. Every outcome surfaces
as a toast (`src/context/ToastContext.jsx`), because PRD §2 forbids silent failure. Test procedure and
the 1,000-row sample generator: `docs/csv-crossplatform-test.md`, `scripts/generate-sample-csv.mjs`.

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

- `src/router.jsx`: `react-router-dom` routes. `AppShell` (bottom tab bar) and `LoadGate` are **layout
  routes**, not per-route wrappers: `<Route element={<AppShell/>}>` holds every tab screen and
  `<Route element={<LoadGate/>}>` nests inside it, so a path change swaps only what renders at
  `AppShell`'s `<Outlet/>` — the tab bar component stays mounted across navigations, and it also stays
  put while `LoadGate` shows its loading/error card. `/login` and `/signup` sit under a second
  `<AppShell hideTabBar/>` layout route; `/profile` is under the tab-bar one in both its onboarding and
  MY-tab uses, since both need to stay navigable via the tab bar. `RootRedirect` handles `/` (always ->
  `/analyze`, unless loading or a profile-fetch error is in progress); `LoadGate` only blocks on
  session/profile loading, never on login state. `src/__tests__/appShell.tabbar.test.jsx` pins the
  layout-route property by asserting the tab bar's DOM node survives a navigation.
- `src/styles/theme.js` is the single source of design tokens (colors, spacing, radius, shadow,
  font, layout, and shared inline `styles.*` objects like `styles.page`/`styles.card`) — components
  should reference these tokens, not hardcode hex/px values. Interactive elements get
  `className="tds-press"` (defined in `src/index.css`) for the shared press animation.
- **Motion lives in CSS, not a library.** framer-motion was measured and rejected (+41 kB gzip on a
  bundle the APK re-downloads on every cold start, since it loads a remote URL). `src/index.css` holds
  every keyframe; JS only sets `<html data-nav-direction="forward|back|none">`. Three pieces:
  `src/components/Pressable.jsx` is the *single* press-feedback component (buttons/tabs/cards all route
  through it — don't hand-roll a scale animation anywhere else), `src/lib/tabs.js` is the tab-order
  single source (the tab bar and the slide-direction calc must agree), and `src/lib/useTabTransition.js`
  drives `document.startViewTransition(() => flushSync(() => navigate(…)))` with a CSS-animation
  fallback. **Only `transform`/`opacity` may be animated** — progress bars use
  `ProgressBarFill`'s `scaleX`, never `width`; the two remaining `stroke-dashoffset` transitions are
  deliberate (SVG paint-only, no reflow). `AppShell` also resets `data-nav-direction` on every route
  change and restores per-tab scroll position. The header (`.tds-appbar`) and the bottom tab bar
  (`.tds-tabbar`) each carry their own `view-transition-name` so they are pulled out of the animated
  `root` snapshot — without that, the `translateX` on `::view-transition-old/new(root)` drags both bars
  (the tab bar is `position: fixed`) off-screen and back on every tab change, which is what "the tab bar
  flickers" was. Details: `docs/interaction-guide.md`.
- **`.claude/commands/toss.md`** (invoked via `/toss`) is a project-specific skill applying Toss
  design-system conventions, with detailed docs under `디자인/docs/`. Note one intentional
  deviation documented in `theme.js`'s header comment: this app uses a single green accent
  (`#059669`) as its one primary/accent color everywhere the Toss docs describe blue — follow
  `theme.js` as the actual token source, and `/toss` for everything else (one primary button per
  screen, full state coverage, spacing/radius scale, copy tone, etc.).

### Linting

`oxlint` (`.oxlintrc.json`) with `react`/`oxc` plugins; `react/rules-of-hooks` is an error and
`react/only-export-components` is a warn.
