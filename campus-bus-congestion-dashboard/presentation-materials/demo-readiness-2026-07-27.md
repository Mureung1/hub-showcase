# Demo Readiness - 2026-07-27

## Core Demo Flow

1. Open Campus Flow.
2. Review the university cards and the current-hour low-usage stop recommendations.
3. Select a campus with directional data, preferably Kyungpook National University or Chungnam National University.
4. Switch between A/C directions.
5. Drag the hourly selector.
6. Confirm that the map pins, stop comparison bars, and 24-hour chart update together.

## Monday Scope

### Finish

- Stable first-screen campus selection.
- Current-hour recommended stops on campus cards.
- Direction-specific stop usage for mapped campuses.
- Hour selector connected to map, comparison bars, and 24-hour chart.
- Static public-data JSON loading without exposing API keys.
- FSD-style source organization.
- Validation scripts updated for the new source structure.

### Defer

- Real-time bus crowding.
- Fully automatic stop-direction matching for every unsupported or ambiguous stop.
- New backend server or database.
- Vercel/Render production migration.
- Hub showcase active-list registration, which depends on the upstream dashboard config.

## System Boundaries

- Frontend folder: `campus-bus-congestion-dashboard`
- Backend folder: none
- Database: none
- Runtime data source: generated static JSON
- Local-only secret: `DATA_GO_KR_SERVICE_KEY`
- Secret policy: do not commit `.env.local` or service keys

## Verification

- `npm run data:validate`: passed
- `npm run routes:validate`: passed
- `npm run assets:validate`: passed
- `npm run lint`: passed with existing warnings
- `npm run build`: passed

## Known Gaps

- Some campuses still rely on map-first presentation where public-data matching is limited.
- The public hub page will not list Campus Flow until `N056_김진영` is added to `dashboard/config/active-showcases.json` in the upstream dashboard branch.

