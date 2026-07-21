# Development Task List (Draft)

Priority: `P0` foundational/blocking (prerequisite for other work) · `P1` MVP core · `P2` MVP enhancement · `P3` lower priority / stretch

## P0 — Foundation

- [x] **Backend server skeleton** — write `src/server.ts`/`app.ts`, wire up cors/morgan/express.json middleware, shared `errorHandler`, health-check route (`backend/` currently has only dependencies + tsconfig, no entry point)

- [ ] **DB schema design (Prisma)** — define models for items / disposal rules / regional rules, `prisma init` + write `schema.prisma`; DB is hosted on Supabase (free tier Postgres) — Prisma stays as the ORM, Supabase just supplies the `DATABASE_URL`

- [x] **공공데이터포털 (Korea Public Data Portal) integration** — API key obtained for `기후에너지환경부_분리배출 정보조회 서비스` (15156866) and `행정안전부_생활쓰레기배출정보 조회서비스` (15155080); client for the former built in `backend/src/services/govDisposalApiClient.ts` (+ mock fallback). See `docs/TASK.md` Day 3 for details.

- [x] **Object Normalizer → catalog-wide matching (with whitespace normalization)** — replaced the static ~12-entry English-label dictionary (`objectNormalizer.ts`, deleted) with direct matching: Gemini Vision now guesses the object's name in Korean (styled like official 품목명), and `itemService.findBestMatchingItem` matches that guess against the full 731-item synced catalog. Two real gaps found via manual testing and fixed: (1) a banana peel photo failed even though "바나나껍질" existed in the catalog and was findable via search — dictionary just didn't cover it; (2) hairspray failed because the catalog has "헤어 스프레이" (with a space) while a natural guess is "헤어스프레이" (no space) — plain SQL `contains`/`ILIKE` doesn't match across spacing differences. Fixed by loading all 731 items (small enough to hold in memory) and comparing with whitespace stripped from both sides, exact match preferred over substring. Verified against both real cases plus their alternate spacings. **Tried and rejected**: constraining Gemini's response via `responseSchema.enum` with all 731 item names, to guarantee the output is always a literal catalog name — Gemini API itself rejects this with `400 INVALID_ARGUMENT: "too much branching for serving"`. This is a hard API-side limit on enum size, not something to retry as-is; would need item categories to narrow the candidate set to ~20-30 before an enum constraint becomes viable (not implemented — no category field exists on `Item` yet).

- [x] **Gov catalog bulk sync** — `backend/scripts/syncGovCatalog.ts` upserts the full ~730-item `getItem` catalog (confirmed live: omitting `itemNm` returns the entire catalog, paginated) into `Item`/`DisposalRule` in one pass, replacing per-item lazy caching. Run manually via `npm run sync:catalog -w backend` — kept separate from `prisma db seed` since the team shares one Supabase instance; re-run periodically (e.g. monthly) to catch catalog updates.

## P1 — MVP core features

- [x] **AI photo recognition flow** — photo upload (multer) → Vision AI call → Object Normalizer → Public Data API lookup → LLM explanation generation → return result (end-to-end). Vision AI + LLM explanation both run on **Gemini** (`gemini-2.5-flash`, falls back to `gemini-2.5-flash-lite` on daily quota limit) — switched from OpenAI since it has no standing free tier. Verified with real API calls, not just mocks.
- [x] **Result screen (ResultPage)** — render disposal steps / part-by-part separation / common mistakes / rationale, matching `prototype/result.html` structure. `ConfirmPage` (previously an unbuilt stub) also implemented: receives the photo, calls recognize, shows the single top-prediction result, falls back to Search on no-match. Deliberately does **not** replicate `prototype/confirm.html`'s multi-candidate confidence-percentage UI, since the backend only returns one prediction with no confidence score — fabricating fake percentages was rejected in favor of an honest single-result UI.
- [ ] **Item search (SearchPage)** — search-by-name API + UI, reusing the same result component as photo recognition
- [ ] **English search support (`nameEn`)** — add an `nameEn` column to `Item`, batch-translate the synced catalog once via LLM (disposal-category context in the prompt to cut down on mistranslations), extend `searchItems` to match `name` OR `nameEn` so non-Korean-speaking users can search in English. Log zero-result searches during dev instead of reviewing all rows upfront — spot-fix translations that real searches actually hit.
- [ ] **Regional disposal rules (RulesPage)** — city/district selector UI, API for regional pickup days/rules
- [ ] **Today's disposal schedule (HomePage)** — show which items can be disposed of today based on the user's set region
- [ ] **Multilingual support (Korean/English first)** — LLM translation pipeline; result screen has a single "Translate" toggle to switch between Korean and English (README updated — not simultaneous dual-display anymore)

## P2 — MVP enhancements

- [ ] **Bulky waste reporting guide (BulkyPage)** — item → region → fee lookup → link to official reporting site flow
- [ ] **Weekly disposal schedule (HomePage)** — added to README's MVP scope; extends the "today's schedule" data (P1) to show the coming week's pickup days per item, same regional data source
- [ ] **Multilingual expansion (Chinese/Japanese/Vietnamese)** — add sequentially after Korean/English (P1); not mentioned in current README feature text but still listed under 기술 스택/AI, needs confirmation before scheduling
- [ ] **Nearby collection point guide — data & list view** — data model + list-style UI for battery/fluorescent lamp/small electronics/paper carton collection points (address/name/hours, no map); README's MVP scope names this feature, so it's in-scope for the 2-week MVP push, map rendering excluded (see below)
- [ ] **Points screen (PointsPage)** — not in the README's MVP scope; needs a requirements check before work starts (blocked until scope is confirmed)

## P3 — Lower priority

- [ ] **Nearby collection point guide — map visualization** — map API integration to plot the P2 list data as markers; deferred to the post-MVP Week 3 sprint (not required for the 7/25 test start)
- [ ] **Commonly confused items list** — curated list surfaced on home/search; README dropped this feature's dedicated section (was never in the MVP-범위 bullet list either), demoted from P2 — restore to P2 if the drop was accidental
- [ ] **PWA offline support hardening** — refine `vite-plugin-pwa` caching strategy
- [ ] **Auth / user accounts** — not specified in the README; needs discussion before starting
