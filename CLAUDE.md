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

### Tests

**Vitest + jsdom + @testing-library/react** (`vitest.config.js` merges `vite.config.js` so plugins/
aliases stay shared; `vitest.setup.js` registers jest-dom matchers and auto-`cleanup()`s). `globals:
true`, so `describe`/`it`/`expect` need no import. `src/**/*.{test,spec}.{js,jsx}` and
`server/**/*.{test,spec}.js` are collected — `android/` and `dist/` are excluded.

```bash
npm run test                                   # vitest run (one-shot)
npm run test:watch                             # vitest (watch)
npx vitest run src/lib/foodCategory.test.js    # a single file
npx vitest run -t "부족 영양소"                 # a single test/describe by name
```

Test files sit **next to the code** (`src/lib/foodCategory.test.js`, `src/utils/formatNutrient.test.js`);
`src/__tests__/` is for cross-cutting ones (`appShell.tabbar.test.jsx`) plus two `example.*` templates
kept as starting points. Coverage is deliberately thin and concentrated on pure logic — most of the app
is still verified by running it in-browser. Two **pre-Vitest** node-assertion scripts remain and are
still the guards for their areas (don't rewrite them casually — they load the real serializers):

```bash
npm run check:ads   # scripts/check-ad-recommendation.mjs — ad recommendation rules
npm run check:csv   # scripts/check-csv-roundtrip.mjs — CSV export→import roundtrip
```

The `.claude/skills/테스트-작성` skill holds this project's TDD conventions, and
`.claude/skills/기능-검증` a post-implementation verification checklist.

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
tradeoff, and the known CSV-download WebView limitation are in `docs/03-개발스펙.md` §3. **Capacitor is additive
— none of it affects the web build** (`@capacitor/*` is inert on web; `Capacitor.isNativePlatform()` is false there).

## Architecture

A Mermaid diagram of the overall system (layout, photo→nutrition flow, auth, deployment, CSV, ads) is
embedded in README.md — update it in the same change that moves the code. `docs/03-개발스펙.md` §1
additionally records per-feature decisions and unresolved issues discovered while building this
architecture that aren't repeated in this file.

All project docs live under `docs/` as four files: `01-알고리즘.md` (nutrition-matching and
ad/leaderboard scoring logic), `02-디자인.md` (Toss-style design system — the `/toss` skill's source
of truth), `03-개발스펙.md` (architecture addenda, build/test/interaction guides, condensed PRD
history), `04-프로젝트설명.md` (project narrative, cost analysis, release checklist). Each is a single
self-contained file (no subfolders) — keep it that way; fold new documentation into the matching file
rather than creating new ones.

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

Every `/api` route is rate-limited by IP (`express-rate-limit`): 60 req/min overall, and `/api/gemini`
additionally 30 per 10 min because it burns paid OpenRouter tokens. Hammering the analyze flow in a
test loop will start returning `요청이 너무 많습니다` — that's the limiter, not a bug.

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
(`scripts/check-ad-recommendation.mjs` — Vitest 도입 이전에 만든 노드 단언 스크립트라 그대로 남아 있다).
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
2. All identified items go to the **unified resolution engine** in ONE request
   (`src/lib/resolveFood.js` -> `POST /api/resolve-food` -> `server/nutrition/resolveFood.js`).
   This replaced three divergent resolvers that used to exist (a 7-step *sequential* client cascade
   in `Analyze.jsx`, a local-only one in `precisionEngine.js`, and a remote-only one in
   `menuNutrition.js`) — that split is why fixes never propagated across analysis paths.
   The engine resolves in four stages:
   **① local first, zero network** — `server/nutrition/foodLookup.js` (식약처 음식DB snapshot,
   11,347 items) and `server/nutrition/recipeLookup.js` (식품안전나라 조리식품 레시피DB, 1,141 items,
   fully bundled at build time by `scripts/buildRecipeDB.js`). Both share one matching strategy
   (`server/nutrition/nameMatcher.js`: 정규화→완전일치→별칭→부분포함→편집거리). Only `exact`/`alias`
   are trusted outright; `partial`/`fuzzy` are held back as *pending* candidates.
   **② retrieval-then-gate** — `server/nutrition/nameIndex.js` pulls top-k candidates from a jamo
   bi-gram inverted index and the similarity gate picks the best. **This ordering is the point.**
   The old matcher returned exactly one answer and the gate could only accept or reject it — never
   swap in a better one — so tightening the gate always cost match rate (that is literally what
   "adding the gate killed 29% of good matches" was, `docs/03-개발스펙.md` §1.6). Retrieval first
   means the gate can stay strict. Measured on 667 real 학식·급식 menu names: **46.8% → 63.3%**
   match rate at 2.4 ms/item, `npm run check:matchrate`.
   **③ remote for misses only, in ONE parallel round** — 식약처 음식/가공식품 DB via
   `lookupFoodSafety` in `server/proxy.js` (in-flight dedup + 24h cache + 60s negative cache).
   Skipped entirely when a local candidate scores ≥0.85 — spend the round trip only where unsure.
   **④ verification** — every non-exact candidate must clear the same similarity bar
   (`foodNameSimilarity` ≥ 0.7, `src/lib/foodMatch.js`) the client uses; otherwise it is rejected
   and the item falls through to the AI estimate. **This gate matters**: the edit-distance stage
   really does return unrelated foods (measured: 치킨→제육(돼지고기 수육), 파스타→토스트(식빵)), and
   the old code accepted them unverified. Two narrow exceptions were added because the gate was also
   rejecting *correct* matches: 식약처's `기본명_수식어` variant naming (`김치찌개_돼지고기` — most DB
   records look like this, so blocking it made the DB largely unreachable) and cooking-method
   suffixes (`돼지갈비`→`돼지갈비찜`). The unrelated-food cases above still score 0.

   Three more relaxations were added with retrieval, plus one tightening — none of which can
   override a veto (the tail veto returns 0 immediately and nothing after it runs): `_` variant
   names are compared **base-name only** (`햄버거_치킨` is a burger, not chicken) plus an
   order-insensitive character Dice (`샌드위치_바삭몬테크리스토` ↔ `몬테크리스토샌드위치`); jamo-level
   similarity ≥0.85 rescues plain typos (`닭갈비`↔`닥갈비`); and the affix rule now demands a higher
   ratio when only the *tail* is shared, because sharing just the tail means a different ingredient
   (`콩자반`↔`김자반`, 180 vs 500 kcal/100g). ⚠️ If any ordered relation matched at all, that verdict
   is final — letting the affix rule run afterwards resurrects `라면`→`라면땅` (hit during
   implementation). Confirmed synonyms are handled by **normalization, not scoring**
   (`MORPHEME_SYNONYMS` in `textNormalize.js`): `달걀`↔`계란` don't resemble each other at any
   character or jamo level, so no threshold can catch them.

   A candidate whose density falls outside `foodData`'s verified range for the query is dropped from
   ranking — retrieval finds name-alike but unrepresentative records (`치킨`→`삼계치킨` at
   120 kcal/100g when verified chicken is 180–326). Near-ties (top score −0.05, max 5) are
   **averaged** rather than arbitrarily picked; do not widen that band — averaging *all* passing
   candidates measurably made things worse (`감자채볶음` 67 → 102 kcal/100g).

   **`servingContext: 'restaurant' | 'packaged' | 'cafeteria' | 'home'`** — the same dish has
   genuinely different numbers depending on where it's served, and 식약처 stores them as separate
   records per origin (measured: 돼지갈비구이 급식 132 kcal/100g vs 외식 294; 김치찌개 급식 19 vs
   외식 61; 돈가스 급식 148 vs 외식 280). `ORIGIN_PREFERENCE` in `foodLookup.js` picks the variant —
   restaurant prefers measured-over-computed (프랜차이즈 공식 → 외식 분석 → 가정식 분석 → 외식 산출 →
   급식), `packaged` puts the maker's official figures first, `home` puts 가정식 분석 first, and
   `cafeteria` keeps 급식 first. **Variant selection happens in exactly one place —
   `toFoodItemResponse` / `pickVariantForContext`** — so nutrients and serving size can never come
   from different origins. The remote (식약처 API) path has no origin variants, so its cache key
   correctly does not include the context.

   **The context is decided per item by the AI, not per screen.** Each identified item carries its own
   `servingContext`, and it overrides the request-level default — one photo can hold a 급식 식판 and a
   packaged drink, and a single request-wide context cannot be right for both. Screens still set a
   sensible default (`precisionEngine.js` pins `cafeteria`; the map tab sends `packaged` for chains it
   flags via `isFranchise`), but hardcoding it *only* per screen is what made 식판 사진 and 편의점
   도시락 both come out as restaurant food. The AI also returns `role` (the 8 `mealPortions.js` roles)
   and `portionRatio` — see the serving-weight section below for what each is for.

   Remote source choice is **deterministic, not a race**. The engine queries 음식DB and 가공식품DB in
   parallel, and used to accept whichever landed first — with the same name in both, the answer
   depended on that day's network. Now `REMOTE_SOURCE_PREFERENCE` picks by context (packaged →
   가공식품DB first, everything else → 음식DB first).
   A **server-side deadline budget** bounds the whole stage; exceeding it returns whatever resolved
   so far rather than erroring. In dev builds (`import.meta.env.DEV`), each resolved item logs a
   `[분석 진단]` line (source / matchType / grams / final nutrients) to help spot accuracy gaps.
   ⚠️ The recipe DB is stored **per-serving, not per-100g** — COOKRCP01 gives 1인분 nutrition but its
   `INFO_WGT` is populated for only 282 of 1,141 records, so converting everything to per-100g would
   invent precision that doesn't exist. `recipeToPer100` isolates that conversion and flags
   `assumedServing` when it had to guess the weight, which lowers the item's `confidence`.
3. A DB match's per-100g nutrients are scaled to the resolved consumed grams
   (`resolveConsumedGrams`/`scaleNutrients` in `src/lib/nutrition.js`), then passed through
   `clampToPlausibleNutrients`, which corrects DB records whose *per-serving* values are
   unrealistic for specific well-known Korean dishes (keyword-matched, e.g. 짜장면/비빔밥/찌개).
4. If no DB match is found at all, the AI's own `estimatedNutrients` are used as a fallback, still
   passed through the same plausibility clamp.
5. `src/lib/nutrition.js` is the single source of truth for nutrient math: BMR/TDEE-based
   recommended intake (`calcRecommendedNutrients`), the 6-nutrient schema (`NUTRIENT_LABELS`), and
   the 3-state day/nutrient status classifiers used across Result/Calendar/etc.

**Serving weight** is decided in one shared place, `server/nutrition/servingWeight.js` — both
`resolveFood.js` and `precisionEngine.js` call it, because when they each had their own rule the two
engines returned different numbers for the same food. Order for restaurant/home: `foodData.js`
`referenceGrams` → DB `servingGram` → role weight; `cafeteria` puts role weight first (배식 정량은
표준화돼 있고 재현 가능해야 한다); `packaged` puts the DB's declared serving first and skips the
Korean-dish role standards entirely (초코바 20 g도 도시락 700 g도 정상이라 "이상치" 판정 근거가 없다).
`resolveServingWeight` returns *why* it chose a value (`source` / `founded`) — callers need that to
know whether the number is evidence or a bare neutral fallback.

⚠️ **The recurring bug in this file is one shape: rejecting founded values using an unfounded
default.** It has appeared three times — the ratio guard's denominator (돼지갈비 defaulting to 50 g
rejected the DB's correct 220 g as a 4.4× outlier), the role *bounds* (a food whose role wasn't
recognized became 반찬, whose 20–150 g band then threw out real serving sizes — measured: **57.5% of
8,259 franchise records**), and the role classifier itself failing on 3,606 of 11,347 foods (31.8%).
So: DB `servingGram` is rejected only if exactly `100` (a *base-quantity* placeholder in 871 records)
or outside a band, and **the role band applies only when the role is actually known** — from a name
pattern, or from the AI's `role` hint, which is what closes the 31.8% gap. A pattern match always
beats the hint (reproducibility).

Note the deliberate split between `match.servSize` (real evidence like package size — remote/recipe
DB only) and `match.referenceServingGram` (the local DB's generic 1인분): putting the latter in
`servSize` makes `resolveConsumedGrams` override the AI's photo estimate, flattening double/half
portions.

**Consumed grams** (`resolveConsumedGrams`, `src/lib/nutrition.js`) then picks in order:
`match.servSize` (a printed fact, always wins) → **standard serving × portion ratio** → the AI's
absolute gram estimate. The middle step exists because an LLM is far better at "how full is this
relative to a normal serving" than at "how many grams is this"; it is used **only when the standard
serving is founded** (`servingGramFounded`), since multiplying a bare 200 g neutral by a ratio is two
unknowns multiplied. For tray photos the ratio blends two signals (`blendPortionRatio`): the AI's
`portionRatio` and `trayFillRatio` (how full the compartment is, weighted 0.4 — compartment size is
physically fixed so it varies less); a ≥1.5× disagreement is flagged. Photo prompts also give the AI
real tableware dimensions (밥공기 지름 10.5 cm, 종이컵 7 cm, 식판 38 cm…) as a scale ruler.

**NEIS official figures are anchors, not suggestions** (`src/lib/anchoredNutrients.js`). A school
meal's nutrition is computed by a licensed nutritionist from 표준레시피 and published, so where NEIS
gives a value we keep it **verbatim** and only *derive* what it didn't give. Coverage varies by
school: calories always, 탄수/단백/지방 sometimes, and 식이섬유·나트륨 never. Given
`{calories: 800, protein: 15}`, protein consumes 60 kcal and the remaining 740 kcal is split across
carbs/fat using our own estimate's energy composition (falling back to KDRI AMDR midpoints), so the
result reconciles to exactly 800 kcal; fiber/sodium are scaled by the calorie ratio. The old code
scaled only the keys NEIS supplied and left the rest untouched, producing totals where calories had
been cut to 0.8× but sodium was still at 1.0×. ⚠️ If NEIS's own numbers don't reconcile under Atwater
(they sometimes don't), **we do not "fix" them** — we have no basis for claiming to be more accurate.
`applyOfficialAnchors` only fixes the *total*; `applyProportionalCalibration` (same file) then scales
each item by the same ratio so item sums still add up to the anchored total. Both
`server/nutrition/precisionEngine.js` (menu-name entry points) and `Analyze.jsx`'s photo-analysis path
share this single calibration function — the latter only got it in a pre-release review pass (it used
to fetch `officialTotals` via `fetchMenuPrior` and then never use it), and only applies it when every
identified item in the photo is confirmed as that day's official meal (a mixed photo with a personal
snack alongside the tray is left uncalibrated, since the official total doesn't cover the extra item).

**Protein/fat plausibility** (`src/lib/macroPlausibility.js`) covers a gap the other two clamps leave:
`applyAtwaterEnsemble` only checks that macros *sum* to calories (40 g protein + 0 carbs + 0 fat at
160 kcal is perfectly consistent), and `clampToPlausibleNutrients` only fires for the ~60 foods in
`foodData`. The band comes from KDRI 에너지적정비율 (protein 7–20%, fat 15–30% of energy), so it scales
with the meal — 20% of an 800 kcal school lunch is exactly the ~40 g practical ceiling, while a
1500 kcal meat dinner is allowed 75 g. A **meal-level absolute cap** (protein 40 g, fat 35 g start)
runs alongside it, because energy share alone cannot catch a plate that is uniformly over-estimated
(the reported 1021 kcal / 60 g tray sits at 23% protein energy — perfectly normal by share). Values
are compressed along an asymptotic curve rather than truncated, so ordering survives.

⚠️ **Never apply this to DB-measured values.** A full scan of the 11,255 records found **5.5% exceed
35% protein energy and 5.0% exceed 50% fat energy — and they are all real foods** (가자미찜 60%
protein, 갈비구이_돼지고기 65% fat, 갈비탕 67%). Capping those destroys the very record §1.5 fought to
reach. So the per-item cap applies **only to AI estimates**, foods with a verified `foodData` range
are exempt at both levels, and the meal-level pass removes from the weakest evidence first
(AI estimate → recipe DB → 식약처DB) with a 40% per-item limit. When NEIS official totals exist the
correction is skipped entirely — an anchor outranks a general rule.

**Plate-level sanity** (`src/lib/mealStandards.js`) catches what per-item clamping cannot: every item
inside its own range while the total is badly off. The band is not invented — it is 학교급식법
시행규칙 별표3 (초등 534/634, 중학 800, 고등 900 kcal), validated against this repo's NEIS samples
(middle school 4 meals averaged 804 vs the 800 standard). ⚠️ **It warns, it never auto-corrects.**
Auto-correction happens only against an external ground truth (NEIS official totals, via
`applyProportionalCalibration`); scaling values to fit a band we chose is the same "reject founded
values using an unfounded default" mistake as everything in the section above.

**Closed-set prior for school meals** (`src/lib/menuPrior.js`): Korean school meals are planned by a
nutritionist from 표준레시피 × 배식량 and published to NEIS, so the day's official menu list already
exists. When the profile has a school, that list is fetched **in parallel with the Gemini call** and
injected into the prompt, turning identification from open-set into closed-set — the AI picks from the
list instead of inventing a name, and the name it picks is already a DB-searchable standard name.
Cached by `(schoolCode, date)`; a miss or failure silently falls back to the open-set path.

When touching this flow, prefer extending the single table in `src/lib/foodData.js`
(`portion` / `referenceGrams` / `plausible` per food) over adding one-off special cases elsewhere.
The Gemini prompts' portion reference tables are **generated** from it
(`buildServingGramHints` / `buildPlausibilityReferenceLines`) — don't hand-write a second copy.

⚠️ Accuracy changes must clear **both** benchmarks, and the two cover different domains on purpose —
tuning against only one is how the numbers drifted school-meal-ward and produced "돼지갈비 73kcal"
(see `docs/03-개발스펙.md` §1.5):

- `npm run check:nutrition` — **free, offline, the primary gate.** Uses the DB's own measured serving
  sizes as ground truth across 식당·프랜차이즈·급식 at once: `[1]` hides each record's real serving
  size and scores how well the dictionary+role fallback predicts it, `[2]` reports how often the rules
  *discard* a real serving size they were given, `[3]` asserts the origin-selection invariant.
  Run it on every rule change.
- `npm run check:matchrate` — **free, offline.** What fraction of 667 real 학식·급식 menu names reach
  the DB at all. This is the coverage metric that matters most, because **an unmatched item's calories
  are supplied by Gemini, and that is ~48% of a school meal's official total** — a point of match rate
  is a point less handed to the LLM. Also prints the single-matcher baseline (so retrieval's
  contribution stays visible), per-role rates, and ms/item. Never raise this number by loosening the
  similarity threshold; that trades coverage for wrong matches.
- `npm run check:nutrition:cafeteria` — **paid** (OpenRouter), NEIS school meals, end-to-end. It is a
  20-sample check whose pass count is dominated by LLM output (42% of menu items have no DB match at
  all and Gemini supplies ~48% of total calories), so **do not chase its pass count** — read its mean
  error, and run it sparingly.

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
the 1,000-row sample generator: `docs/03-개발스펙.md` §4, `scripts/generate-sample-csv.mjs`.

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
  flickers" was. Details: `docs/03-개발스펙.md` §2.
- **`.claude/commands/toss.md`** (invoked via `/toss`) is a project-specific skill applying Toss
  design-system conventions, with detailed docs in `docs/02-디자인.md`. Note one intentional
  deviation documented in `theme.js`'s header comment: this app uses a single green accent
  (`#059669`) as its one primary/accent color everywhere the Toss docs describe blue — follow
  `theme.js` as the actual token source, and `/toss` for everything else (one primary button per
  screen, full state coverage, spacing/radius scale, copy tone, etc.).

### Linting

`oxlint` (`.oxlintrc.json`) with `react`/`oxc` plugins; `react/rules-of-hooks` is an error and
`react/only-export-components` is a warn.
