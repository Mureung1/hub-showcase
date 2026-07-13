# Development Task List (Draft)

Priority: `P0` foundational/blocking (prerequisite for other work) · `P1` MVP core · `P2` MVP enhancement · `P3` lower priority / stretch

## P0 — Foundation

- [x] **Backend server skeleton** — write `src/server.ts`/`app.ts`, wire up cors/morgan/express.json middleware, shared `errorHandler`, health-check route (`backend/` currently has only dependencies + tsconfig, no entry point)

- [ ] **DB schema design (Prisma)** — define models for items / disposal rules / regional rules, `prisma init` + write `schema.prisma`

- [ ] **공공데이터포털 (Korea Public Data Portal) integration** — research the official disposal-info API, obtain an API key, build a client in `services/` (this is the project's Source of Truth, so it should land before feature work that depends on it)

- [ ] **Object Normalizer** — design the mapping table/logic that converts raw Vision AI predictions into the service's standard item names

## P1 — MVP core features

- [ ] **AI photo recognition flow** — photo upload (multer) → Vision AI call → Object Normalizer → Public Data API lookup → LLM explanation generation → return result (end-to-end)
- [ ] **Result screen (ResultPage)** — render disposal steps / part-by-part separation / common mistakes / rationale, matching `prototype/result.html`
- [ ] **Item search (SearchPage)** — search-by-name API + UI, reusing the same result component as photo recognition
- [ ] **Regional disposal rules (RulesPage)** — city/district selector UI, API for regional pickup days/rules
- [ ] **Today's disposal schedule (HomePage)** — show which items can be disposed of today based on the user's set region
- [ ] **Multilingual support (Korean/English first)** — LLM translation pipeline, always show Korean alongside the translation on the result screen

## P2 — MVP enhancements

- [ ] **Bulky waste reporting guide (BulkyPage)** — item → region → fee lookup → link to official reporting site flow
- [ ] **Commonly confused items list** — curated list surfaced on home/search
- [ ] **Multilingual expansion (Chinese/Japanese/Vietnamese)** — add sequentially after Korean/English (P1)
- [ ] **Nearby collection point guide — data & list view** — data model + list-style UI for battery/fluorescent lamp/small electronics/paper carton collection points (address/name/hours, no map); README's MVP scope names this feature, so it's in-scope for the 2-week MVP push, map rendering excluded (see below)
- [ ] **Points screen (PointsPage)** — not in the README's MVP scope; needs a requirements check before work starts (blocked until scope is confirmed)

## P3 — Lower priority

- [ ] **Nearby collection point guide — map visualization** — map API integration to plot the P2 list data as markers; deferred to the post-MVP Week 3 sprint (not required for the 7/25 test start)
- [ ] **PWA offline support hardening** — refine `vite-plugin-pwa` caching strategy
- [ ] **Auth / user accounts** — not specified in the README; needs discussion before starting
