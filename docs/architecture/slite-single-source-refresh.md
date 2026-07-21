# S-Lite Single-Source Refresh

## Completed Boundary

S1-lite adds one real, allowlisted public notice to the existing durable
S-Lite feed without changing its feed ID or capability URL. It is a manual
operator action, not a generic crawler or scheduler.

- Source ID: `knu-721-2436`
- Source URL: `https://www.kangwon.ac.kr/ko/bbs/721/detail.do?pstSn=2436`
- Policy: restored Foundation.25.1 Policy.15
- Feed result: the fixed 601-event Foundation snapshot plus exactly one
  materialized source event

No caller can supply or override a URL, host, path, board, source ID, or policy.

## Runtime Flow

```text
trusted operator
  └─ POST /api/subscription-feeds/slite/refresh with exact {}
       └─ administrator authentication before the 4 KiB JSON parser
            └─ fixed HTTPS source fetch
                 ├─ public-DNS validation and selected-IP pinning
                 ├─ TLS certificate and hostname validation
                 ├─ no redirects, compression, or proxy tunnels
                 └─ text/html, 10-second timeout, 512 KiB maximum
                      └─ Foundation.25.1 extraction + Policy.15
                           └─ exactly one publishable candidate
                                └─ atomic SQLite source + ICS snapshot update

calendar client
  └─ same retained HTTPS capability URL
       └─ current materialized ICS, ETag, and conditional 304
```

Fetch or evaluation failure leaves the last-good source row, ICS body, ETag,
event identity, and sequence unchanged. A failed SQLite write rolls back the
feed row, source row, and materialized snapshot together.

## Refresh Contract

`POST /api/subscription-feeds/slite/refresh` requires the existing S-Lite
administrator Bearer credential and an `application/json` body of exactly
`{}`. A successful response has exactly these fields:

- `schemaVersion`
- `feedId`
- `sourceId`
- `outcome`: `updated` or `unchanged`
- `previousEventCount`
- `eventCount`
- `snapshotChanged`
- `checkedAt`

The endpoint never returns the feed token, capability path, source HTML, or
calendar body and always uses `Cache-Control: no-store`.

## Durable Identity and Snapshot Rules

SQLite schema `noticepilot.sliteSqlite.v2` adds one source-state row and one
materialized-snapshot row. A v1 database is migrated in a transaction that is
not committed until its feed, token identity, Foundation identity, and base
snapshot pass semantic validation. A failed validation leaves the database in
its original v1 state.

- First accepted source candidate creates one random opaque event ID and UID,
  increases the feed from 601 to 602 events, and starts at `SEQUENCE:0`.
- Re-evaluating identical event semantics updates only the source check time;
  the UID, sequence, ICS body, and ETag remain unchanged.
- A later semantic change keeps the event ID and UID, increments `SEQUENCE`,
  and atomically replaces the materialized body and ETag.
- Startup recomputes and validates the materialized ICS. Missing, malformed,
  or inconsistent source/snapshot state fails closed.

The encrypted recovery verifier accepts v1 and v2 only after a private copy of
the database can boot through the real S-Lite bridge. Table-name-only skeletons
are not considered recoverable.

## 2026-07-20 Live Evidence

The fixed public notice produced one `auto_confirmed`, `student_default`,
all-day Policy.15 event covering 2026-07-14 through 2026-07-27 inclusive.

- first refresh: `updated`, 601 → 602, snapshot changed;
- retained URL file: unchanged;
- HTTPS feed: `200`, 602 events;
- old ETag conditional request: `200`; current ETag: `304`;
- event: stable opaque UID, `SEQUENCE:0`, `STATUS:CONFIRMED`, exclusive ICS
  end date `20260728`;
- Foundation Samsung ICS byte audit: pass;
- second refresh: `unchanged`, 602 events, unchanged ETag;
- Node restart: same ETag, UID, sequence, URL, and 602-event body;
- post-refresh encrypted cold restore: active 602-event feed, retained URL
  `200`, conditional `304`, and byte-identical administrator/URL/CA identity.

Final repository validation passed: root Node tests 174/174, Wiki sync 18/18,
Foundation.25.1 regression 462/462, production build with 57 modules, and npm
high-severity audit with zero vulnerabilities. The restored Foundation subtree
and `.github/workflows/**` were unchanged by this element.

The operator confirmed that the latest active URL can be subscribed to on the
iPhone. The host-side same-URL update is proven, but an observed iPhone
background poll that displays the newly added event without re-registering the
URL is still a separate physical-client gate.

## Explicit Non-Goals

S1-lite does not add a scheduler, retries, attachment downloads, multiple
sources, arbitrary URL ingestion, accounts, a management UI, cancellation
reconciliation, multi-process coordination, monitoring, or public deployment.
Those remain separate product and operations boundaries.
