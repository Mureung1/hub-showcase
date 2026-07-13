# NoticePilot Subscription Foundation Contract

Status: Authoritative for Subscription Foundation schema work

Contract version: noticepilot.domain.v1

Decision date: 2026-07-10

## 1. Subscription Foundation Stages

Subscription Foundation is an independent work track from the existing Phase 4 AI integration track. Its stages are:

- **SF-0 — Subscription product contract:** Define the user-facing subscription product behavior and boundaries.
- **SF-1 — Core domain decisions:** Fix the canonical domain concepts, policies, and invariants.
- **SF-2 — KNU crawler mapping audit:** Audit Kangwon National University source boards and their mapping into the domain.
- **SF-3 — Zod/adapter implementation design:** Define schema boundaries, adapter responsibilities, and validation behavior.
- **SF-4 — Core schema implementation:** Implement the authoritative core domain contract as strict Zod schemas.

## 2. Product Pipeline

The crawler-based product pipeline is:

```text
Crawler
→ CrawledNotice
→ CanonicalNotice
→ ExtractionResult
→ CalendarEventCandidate
→ CalendarEvent
→ SubscriptionIcsFeed
```

Each transition is an explicit domain boundary. A downstream object must not silently inherit legacy or source-specific payload flexibility from an upstream boundary.

## 3. Manual Input Pipeline

Manual input uses an adapter into the same canonical extraction pipeline rather than a separate core schema pipeline:

```text
ManualNoticeInput
→ CanonicalNotice
→ ExtractionResult
→ CalendarEventCandidate
→ CalendarEvent
→ one-off preview / ICS
```

Manual input remains available for one-off review, preview, and ICS export. It does not create a `SubscriptionIcsFeed` by default.

## 4. Status of AppAnalysisSchema

`AppAnalysisSchema` is the manual analysis UI projection used by the current application. It is not a core domain schema and must not define or constrain the Subscription Foundation domain model.

Adapters may project core domain objects into `AppAnalysisSchema` when a UI workflow requires it. SF-4 must not rewire existing runtime callers or change current manual analysis behavior.

## 5. Campus Contract

The physical campus taxonomy is fixed to:

- `chuncheon`
- `samcheok`
- `dogye`
- `gangneung_wonju`

Listed-campus classification describes how the source lists a notice. Target-campus classification describes whom the notice content actually targets. These concepts must remain separate.

`targetScope` supports:

- `all`
- `specific`
- `source_default`
- `unknown`

Campus targeting follows these rules:

- An explicit, unambiguous statement in the notice body takes precedence over source-board defaults or listed-campus classification.
- A conflict between source metadata and explicit body text sets `campusReviewRequired` and records an appropriate review reason.
- An unknown-campus notice must remain `targetScope=unknown`; it must not be converted to `all` merely to simplify filtering.
- A common notice means `targetScope=all` and targets all four physical campuses.
- The user-facing default for `includeUnknownCampusNotices` is `true`.

## 6. Event Policy

Default student-feed inclusion policy is:

- Include `deadline` events by default.
- Include `start` events by default only when the start has clear action value for the user.
- Include `meeting` events by default when the meeting time is explicit.
- Exclude `announcement` events by default.
- Preserve department and staff internal deadlines as candidates, but exclude `department` and `staff` target actors from the default student feed.

Date and time rules are:

- A timed deadline may have `endTime=null`.
- The system must not invent an arbitrary duration.
- A review-required event remains included by default when it has a valid `normalizedDate`.
- An event without a valid `normalizedDate` must be excluded from ICS output.

## 7. Identity, Revision, and Cancellation

- Content-derived identifiers must not be used as persistent calendar UIDs.
- An ICS UID is derived from the persistent `CalendarEvent.eventId`.
- When an event date or other event content changes, retain the same UID and increment `sequence`.
- When a previously published event is deleted, publish a cancellation using `STATUS:CANCELLED` rather than silently dropping its identity.
- Source identity is the tuple `institution + canonical board category + pstSn`.
- `sourceUrl` preserves the observed source location, while `canonicalSourceUrl` stores the stable canonical location. They are separate fields and must not be conflated.

## 8. Date Semantics

- An AI raw empty-string date is converted to core `null` at the adapter boundary.
- `CalendarEvent.endDate` is inclusive in the core domain.
- ICS `DTEND` is exclusive. The serializer converts the inclusive core end date to the required exclusive ICS value.

The core schema must not encode ICS-exclusive dates or legacy empty-string date conventions.

## 9. Strict Schemas and Adapter Boundary

Every core domain object schema is strict and rejects unknown keys. Legacy payload flexibility, coercion, empty-string normalization, and source-specific shape repair are permitted only at an adapter boundary.

Core schemas validate canonical values; they do not serve as permissive legacy parsers.

## 10. Cross-Validation Invariants

Core schemas enforce the following invariants:

- `reviewRequired` is `true` if and only if `reviewReasons.length > 0`.
- Evidence offsets either both exist or are both `null`.
- Body evidence requires `attachmentId=null`.
- Attachment evidence requires a non-null `attachmentId`.
- When status is `superseded`, `supersededByNoticeId` is required.
- Selection arrays and taxonomy arrays must not contain duplicates.

Schema-specific invariants may add stronger constraints, but must not weaken these shared rules.

## 11. Feed Actor Defaults

Core schemas do not automatically insert student actor defaults. Schema parsing validates supplied data without silently adding target actors.

Feed factories and UI initialization use the following default target actors:

- `student`
- `applicant`
- `public`
- `unknown`

`department` and `staff` remain valid core candidate actors but are excluded from the default student feed.

## 12. Relationship to the Existing Roadmap

The existing Phase 4-A through Phase 4-E remains the AI integration track. Subscription Foundation uses the independent SF-0 through SF-4 naming defined in this contract.

The current post-Phase-4 roadmap places subscription work in Phase 8. That priority conflicts with the latest Subscription Foundation product direction. Revising the roadmap is a separate follow-up step; SF-4 must not modify the existing roadmap.

## 13. Unresolved Items

The following decisions remain intentionally unresolved and are outside the SF-4 core schema implementation:

- Retention period for cancellation events
- Detailed policy for selective attachment extraction
- Database and persistent ID issuance implementation
- Samsung Calendar physical-device QA
- Detailed cross-post representative-selection algorithm
