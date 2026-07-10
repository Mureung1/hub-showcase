# SF-4 Zod Schema Implementation Specification

Status: Approved implementation specification for SF-4

Contract version: noticepilot.domain.v1

Parent contract: subscription-foundation-contract.md

Decision date: 2026-07-10

## 1. Purpose and Boundaries

This specification translates the Subscription Foundation contract into a decision-complete Zod implementation design. It fixes module ownership, dependency direction, field types, nullability, empty-string behavior, strictness, refinements, public exports, staged implementation boundaries, and the test strategy for SF-4.

SF-4 creates core domain schemas only. It does not connect runtime callers, modify `AppAnalysisSchema` or the existing AI raw schema, implement crawler adapters, implement an ICS serializer, add dependencies, or introduce TypeScript.

## 2. Planned Files

Production modules:

```text
server/src/domain/schemas/
  commonSchemas.js
  sourceBoardSchema.js
  crawledNoticeSchema.js
  canonicalNoticeSchema.js
  extractionSchema.js
  calendarEventSchema.js
  subscriptionFeedSchema.js
  index.js
```

Test modules:

```text
server/src/domain/schemas/__tests__/
  commonSchemas.test.js
  crawledNoticeSchema.test.js
  canonicalNoticeSchema.test.js
  extractionSchema.test.js
  calendarEventSchema.test.js
  subscriptionFeedSchema.test.js
```

The production modules are implemented in S4 and S5. The test modules are implemented in S6.

## 3. Module Ownership and Dependency Direction

The notice-source dependency chain is:

```text
commonSchemas.js
  ↓
sourceBoardSchema.js
  ↓
crawledNoticeSchema.js
  ↓
canonicalNoticeSchema.js
```

The extraction and event dependency chain is:

```text
commonSchemas.js
  ↓
extractionSchema.js
  ↓
calendarEventSchema.js
```

The feed dependency chain is:

```text
commonSchemas.js
  ↓
subscriptionFeedSchema.js
```

Additional ownership rules:

- Circular imports are prohibited.
- `EvidenceRefSchema` and `DomainWarningSchema` belong to `extractionSchema.js`.
- `AttachmentRefSchema` and `ListedCampusClassificationSchema` belong to `crawledNoticeSchema.js`.
- `CanonicalNoticeSchema` imports `SourceBoardSchema` and `AttachmentRefSchema`.
- `CalendarEventSchema` imports `EvidenceRefSchema`.
- Shared refinement helpers may be named exports from their defining modules when another schema module needs them.
- Internal helpers do not need to be re-exported from the public `index.js`.

## 4. Global Schema Conventions

### 4.1 Strictness and adapter boundary

Every core object schema uses `.strict()` and rejects unknown keys. Legacy crawler, AI, or UI payloads must be normalized by an adapter before strict core validation.

Core schemas do not coerce legacy values, silently repair shapes, deduplicate or sort arrays, or insert defaults. In particular, AI raw empty-string dates and times are converted to core `null` by an adapter rather than by a core schema.

### 4.2 IDs and strings

- IDs and required non-empty strings use `z.string().trim().min(1)`.
- UUID formatting is not enforced.
- Fields where an empty value carries domain meaning use `z.string()`. These include descriptions, body or normalized text where explicitly allowed, summaries, raw date/time expressions, and evidence text.
- A field described as nullable must be present and may be `null`; it is not optional.
- `noticeTypeHint` is the only optional field explicitly defined in the source-board contract.

### 4.3 URLs, hashes, and temporal primitives

- Required URLs use `z.string().url()`.
- Nullable URLs use `z.string().url().nullable()`.
- URL fields reject empty strings. Legacy `""` is converted to `null` at an adapter boundary.
- Hashes are non-empty strings. SHA-256 length or encoding is not enforced in v1.
- `IsoDateSchema` accepts `YYYY-MM-DD` only and verifies the actual calendar date. Values such as `2026-02-30` are rejected.
- `IsoTimeSchema` accepts `HH:mm` from `00:00` through `23:59`. It rejects `24:00`.
- `IsoDateTimeSchema` accepts ISO datetimes only when they include a numeric timezone offset or `Z`. Offset-free datetimes are rejected.
- `TimezoneSchema` is a non-empty string. A nullable timezone uses `TimezoneSchema.nullable()`. The full IANA registry is not validated in v1.

### 4.4 Common enums

```text
SchemaVersion: 1
CampusId: chuncheon | samcheok | dogye | gangneung_wonju
NoticeType: school_notice | scholarship | competition | job_posting | assignment | other | unknown
Confidence: high | medium | low
TargetActor: student | applicant | department | staff | public | unknown
EventType: deadline | start | end | announcement | meeting | other
ReviewReason:
  ambiguous_date
  relative_date_resolved
  missing_evidence
  evidence_not_exact
  low_confidence
  target_campus_unresolved
  source_target_campus_conflict
  notice_type_conflict
  invalid_time
  unknown_actor
  invalid_source_item_reference
  other
```

`InstitutionIdSchema` is a non-empty string rather than an enum.

### 4.5 Primitive array uniqueness

The following arrays reject duplicate primitive values:

```text
aliasBoardIds
supportedCampusFilters
campuses
targetCampuses
excludedCampuses
campusReviewReasons
reviewReasons
selectedCampuses
selectedBoardIds
selectedNoticeTypes
includedEventTypes
includedTargetActors
```

Schemas compare primitive values directly. They do not deduplicate or sort input. Object arrays are not compared by whole-object equality; required object-ID uniqueness is enforced by the owning parent schema.

## 5. Source and Crawled Notice Schemas

### 5.1 SourceBoardSchema

`sourceBoardSchema.js` defines:

```text
boardId: non-empty string
institutionId: non-empty string
boardKey: non-empty string
displayName: non-empty string
category: non-empty string
canonical: boolean
aliasBoardIds: unique non-empty string[]
listUrl: URL
noticeTypeHint?: NoticeType
supportedCampusFilters: unique CampusId[]
```

`category` is deliberately not an enum. Alias and campus-filter arrays may be empty. `boardId` must not appear in `aliasBoardIds`. The schema supplies no defaults.

Public object API:

```text
SourceBoardSchema
parseSourceBoard
safeParseSourceBoard
```

### 5.2 ListedCampusClassificationSchema

```text
rawLabel: string | null
campuses: unique CampusId[]
scope: all | specific | unknown
```

Refinements:

- `all` contains exactly all four physical campus IDs. Order is not significant.
- `specific` contains one to three campus IDs.
- `unknown` contains an empty `campuses` array.
- `all` and `unknown` are scope values, not sentinel values in the campus array.

Public object API:

```text
ListedCampusClassificationSchema
parseListedCampusClassification
safeParseListedCampusClassification
```

### 5.3 AttachmentRefSchema

```text
attachmentId: non-empty string
fileName: non-empty string
sourceUrl: URL
serverName: string | null
sourcePath: string | null
mediaType: string | null
fileExtension: string | null
fetchedAt: datetime | null
sizeBytes: nonnegative integer | null
contentHash: non-empty string | null
extractionStatus: not_requested | pending | downloaded | extracted | failed | unsupported
normalizedText: string | null
errorCode: non-empty string | null
```

Refinements:

- `extracted` requires a non-null `normalizedText`; an empty extracted string is permitted by this schema.
- `failed` requires a non-null `errorCode`.
- Every status other than `failed` requires `errorCode=null`.
- `sizeBytes=0` is valid.
- Local filesystem paths are not part of this core object.

Public object API:

```text
AttachmentRefSchema
parseAttachmentRef
safeParseAttachmentRef
```

### 5.4 CrawledNoticeSchema

```text
schemaVersion: 1
crawledNoticeId: non-empty string
institutionId: non-empty string
sourceInstitutionKey: non-empty string
sourceBoard: SourceBoard
sourcePostId: non-empty string
sourceUrl: URL
canonicalSourceUrl: URL
title: non-empty string
publishedAt: date | null
fetchedAt: datetime
contentText: string
contentExtractionStatus: extracted | empty | failed
listedCampusClassification: ListedCampusClassification
attachments: AttachmentRef[]
rawSourceHash: non-empty string | null
contentHash: non-empty string
sourceIdentityKey: non-empty string
crawlStatus: active | missing | deleted | fetch_failed
```

Refinements:

- `extracted` requires non-empty `contentText`.
- `empty` requires `contentText=""`.
- `failed` permits empty or non-empty `contentText`.
- Equal `sourceUrl` and `canonicalSourceUrl` values are valid.

Public object API:

```text
CrawledNoticeSchema
parseCrawledNotice
safeParseCrawledNotice
```

## 6. Canonical Notice Schemas

### 6.1 CanonicalCampusMetadataSchema

```text
listedCampusClassification: ListedCampusClassification
targetScope: all | specific | source_default | unknown
targetCampuses: unique CampusId[]
excludedCampuses: unique CampusId[]
targetCampusBasis: explicit_text | listed_campus_default | common_board_default | manual_review | unknown
campusReviewRequired: boolean
campusReviewReasons: unique ReviewReason[]
```

Refinements:

- `targetCampuses` and `excludedCampuses` must not intersect.
- `all` contains exactly all four physical campuses in `targetCampuses`; the overlap rule consequently requires an empty exclusion list.
- `specific` and `source_default` require at least one target campus.
- `unknown` requires an empty target-campus array and is never promoted to `all` by the schema.
- `campusReviewRequired` is true if and only if `campusReviewReasons.length > 0`.
- If an otherwise broad target excludes a physical campus, the canonical representation uses `targetScope=specific`.
- Computing the effective target set is a policy-function responsibility, not a schema default or transform.

Public object API:

```text
CanonicalCampusMetadataSchema
parseCanonicalCampusMetadata
safeParseCanonicalCampusMetadata
```

### 6.2 CanonicalNoticeSchema

```text
schemaVersion: 1
noticeId: non-empty string
sourceKind: crawler | manual
institutionId: non-empty string | null
sourceBoard: SourceBoard | null
sourcePostId: non-empty string | null
sourceUrl: URL | null
canonicalSourceUrl: URL | null
title: non-empty string
publishedAt: date | null
normalizedText: string
attachments: AttachmentRef[]
boardCategory: non-empty string | null
noticeType: NoticeType
noticeTypeBasis: manual | rule | ai | board_hint | unknown
noticeTypeConflict: boolean
campus: CanonicalCampusMetadata
contentHash: non-empty string
semanticContentHash: non-empty string
revision: positive integer
status: active | deleted | superseded
supersededByNoticeId: non-empty string | null
createdAt: datetime
updatedAt: datetime
```

Refinements:

- A crawler source requires non-null `institutionId`, `sourceBoard`, `sourcePostId`, `sourceUrl`, and `canonicalSourceUrl`.
- A manual source may use null `sourceBoard` and `sourcePostId`.
- `institutionId=null` requires `sourceBoard=null`.
- A non-null source board must have the same `institutionId` as the notice.
- `status=superseded` requires a non-null `supersededByNoticeId`; every other status requires it to be null.
- A notice cannot supersede itself.
- `noticeTypeBasis=unknown` requires `noticeType=unknown`.
- `revision` is an integer of at least 1.

Public object API:

```text
CanonicalNoticeSchema
parseCanonicalNotice
safeParseCanonicalNotice
```

## 7. Extraction Schemas

### 7.1 EvidenceRefSchema

```text
evidenceId: non-empty string
exactText: string
sourcePart: body | attachment
attachmentId: non-empty string | null
exactMatch: boolean
startOffset: nonnegative integer | null
endOffset: nonnegative integer | null
sourceLineIndex: nonnegative integer | null
```

Refinements:

- Body evidence requires `attachmentId=null`.
- Attachment evidence requires a non-null `attachmentId`.
- `startOffset` and `endOffset` are either both present or both null.
- When offsets exist, `endOffset >= startOffset` and `exactMatch=true`.
- `exactMatch=true` does not itself require offsets.
- `exactText=""` is allowed only when `exactMatch=false`.

Public object API:

```text
EvidenceRefSchema
parseEvidenceRef
safeParseEvidenceRef
```

### 7.2 Review-state invariant

`ExtractionItemSchema`, `CalendarEventCandidateSchema`, and `CalendarEventSchema` apply the same invariant:

```text
reviewRequired = true if and only if reviewReasons.length > 0
```

The schema does not generate missing reasons. Each `reviewReasons` array is unique.

### 7.3 DomainWarningSchema

```text
type: non-empty string
message: non-empty string
itemId: non-empty string | null
candidateId: non-empty string | null
```

A global warning may have both IDs set to null.

Public object API:

```text
DomainWarningSchema
parseDomainWarning
safeParseDomainWarning
```

### 7.4 ExtractionItemSchema

```text
schemaVersion: 1
itemId: non-empty string
extractionId: non-empty string
sourceNoticeId: non-empty string
kind: deadline | task | submission | requirement | caution
title: non-empty string
description: string
dateExpression: string
normalizedDate: date | null
timeExpression: string
normalizedTime: time | null
evidence: EvidenceRef[]
confidence: Confidence
reviewRequired: boolean
reviewReasons: unique ReviewReason[]
extractionMethod: ai | rule | manual
createdAt: datetime
```

A non-null `normalizedTime` requires a non-null `normalizedDate`. AI raw empty-string normalized dates and times are converted to null by the adapter.

Public object API:

```text
ExtractionItemSchema
parseExtractionItem
safeParseExtractionItem
```

### 7.5 CalendarEventCandidateSchema

```text
schemaVersion: 1
candidateId: non-empty string
extractionId: non-empty string
sourceNoticeId: non-empty string
relatedItemId: non-empty string | null
sourceCandidateKey: non-empty string | null
title: non-empty string
description: string
eventType: EventType
eventSubtype: application_deadline | submission_deadline | payment_deadline | general_deadline | application_start | registration_start | result_announcement | information_meeting | other | null
targetActor: TargetActor
dateExpression: string
normalizedDate: date | null
timeExpression: string
normalizedTime: time | null
timezone: non-empty string | null
isAllDay: boolean | null
evidence: EvidenceRef[]
confidence: Confidence
reviewRequired: boolean
reviewReasons: unique ReviewReason[]
candidateStatus: pending | auto_eligible | approved | rejected | suppressed
suppressionReason: non-empty string | null
createdAt: datetime
updatedAt: datetime
```

Refinements:

- A non-null `normalizedTime` requires a non-null `normalizedDate`.
- `isAllDay=true` requires null normalized time and timezone.
- `isAllDay=false` requires non-null normalized date, normalized time, and timezone.
- `isAllDay=null` represents unresolved temporal normalization and adds no all-day/timed requirement beyond the general time/date dependency.
- `candidateStatus=suppressed` requires a non-null `suppressionReason`; every other status requires it to be null.

Public object API:

```text
CalendarEventCandidateSchema
parseCalendarEventCandidate
safeParseCalendarEventCandidate
```

### 7.6 ExtractionResultSchema

```text
schemaVersion: 1
extractionId: non-empty string
sourceNoticeId: non-empty string
extractionMethod: ai | rule | hybrid | manual
sourceContentHash: non-empty string
provider: string | null
model: string | null
promptVersion: string | null
extractorVersion: string | null
schemaContractVersion: noticepilot.domain.v1
summary: string
inferredTitle: string | null
detectedNoticeType: NoticeType
detectedLanguage: ko | en | mixed | unknown
items: ExtractionItem[]
calendarEventCandidates: CalendarEventCandidate[]
warnings: DomainWarning[]
status: completed | partial | failed
createdAt: datetime
```

Refinements:

- Every child item and candidate must match the parent `extractionId` and `sourceNoticeId`.
- `itemId` values are unique within the result.
- `candidateId` values are unique within the result.
- A non-null candidate `relatedItemId` must reference an item in the same result.
- Non-null warning `itemId` and `candidateId` values must reference objects in the same result.
- `status=failed` requires empty item and candidate arrays.
- The schema does not impose an additional provider/model pairing rule.

Public object API:

```text
ExtractionResultSchema
parseExtractionResult
safeParseExtractionResult
```

## 8. Calendar Event Schema

```text
schemaVersion: 1
eventId: non-empty string
sourceNoticeId: non-empty string
sourceCandidateId: non-empty string
title: non-empty string
description: string
eventType: EventType
eventSubtype: non-empty string | null
targetActor: TargetActor
startDate: date
endDate: date
startTime: time | null
endTime: time | null
isAllDay: boolean
timezone: non-empty string | null
sourceUrl: URL | null
evidence: EvidenceRef[]
confidence: Confidence
reviewRequired: boolean
reviewReasons: unique ReviewReason[]
status: published | updated | cancelled | suppressed
sequence: nonnegative integer
createdAt: datetime
updatedAt: datetime
```

Refinements:

- `endDate` must be on or after `startDate`. The core `endDate` is inclusive.
- An all-day event requires null start time, end time, and timezone.
- A timed event requires a non-null start time and timezone.
- A timed deadline may use `endTime=null`; the schema does not invent a duration.
- A non-null `endTime` requires a non-null `startTime`.
- On the same date, a non-null `endTime` must be on or after `startTime`.
- Times are not directly compared across different dates.
- A cancelled event retains its original dates.
- Detailed suppression reasons belong to a promotion or reconciliation record, not this object.

Public object API:

```text
CalendarEventStatusSchema
CalendarEventSchema
parseCalendarEvent
safeParseCalendarEvent
```

The ICS serializer, implemented in a later phase, converts the inclusive core end date to exclusive ICS `DTEND` and derives the persistent UID from `eventId`.

## 9. SubscriptionIcsFeedSchema

```text
schemaVersion: 1
feedId: non-empty string
institutionId: non-empty string
selectedCampuses: unique CampusId[], minimum 1
selectedBoardIds: unique non-empty string[], minimum 1
selectedNoticeTypes: unique NoticeType[], minimum 1
includedEventTypes: unique EventType[], minimum 1
includeCommonNotices: boolean
includeUnknownCampusNotices: boolean
includeReviewRequired: boolean
includedTargetActors: unique TargetActor[], minimum 1
publicSlug: non-empty string | null
feedTokenHash: non-empty string | null
feedTokenPrefix: non-empty string | null
status: active | revoked | paused
createdAt: datetime
updatedAt: datetime
```

The schema has no defaults. Feed factories and UI initialization own the student-feed actor default of `student`, `applicant`, `public`, and `unknown`; `department` and `staff` are valid explicit values but are excluded from that default. The core object never stores a raw feed token, and v1 does not enforce a token-authentication field combination.

Public object API:

```text
FeedStatusSchema
SubscriptionIcsFeedSchema
parseSubscriptionIcsFeed
safeParseSubscriptionIcsFeed
```

## 10. Public Exports

Each object-schema module exports its Zod schema object and corresponding `parse*` and `safeParse*` functions. Domain enums needed by callers are public named exports. `index.js` re-exports only the supported schema, enum, parse, and safe-parse API; it excludes internal date-validation, primitive-uniqueness, and refinement helpers.

The implementation uses the repository's existing ESM conventions:

- `import { z } from 'zod'`
- `.js` extensions for local imports
- named exports

## 11. Implementation Stages

### S4 — Common/source/core notice schemas

Create or update only:

```text
commonSchemas.js
sourceBoardSchema.js
crawledNoticeSchema.js
canonicalNoticeSchema.js
index.js
```

S4 implements the common primitives and helpers, source board, listed campus, attachment, crawled notice, canonical campus metadata, canonical notice, their refinements, and their public exports. It performs module and index import smoke checks but creates no tests.

### S5 — Extraction/event/feed schemas

Create:

```text
extractionSchema.js
calendarEventSchema.js
subscriptionFeedSchema.js
```

Update `index.js` to add their public exports. S5 performs import and minimal valid-object parse smoke checks using inline data. It does not create persistent fixtures or tests.

### S6 — Node built-in schema tests

Create the six test files listed in section 2. A test-only `fixtures.js` may be added if shared fixtures materially reduce duplication; it must not be exported from the production index.

Tests use only:

```text
node:test
node:assert/strict
```

No package dependency or lockfile change is permitted. If no package script exists, run tests directly:

```bash
node --test server/src/domain/schemas/__tests__/*.test.js
```

## 12. Test Coverage Requirements

### Common primitives

- Valid dates and leap days pass.
- Invalid calendar dates and months fail.
- `23:59` passes and `24:00` fails.
- Offset-free datetimes fail.
- Whitespace-only IDs fail.

### Crawled notices

- A valid crawled notice passes.
- All, specific, and unknown campus invariants are enforced.
- Duplicate campus and alias values fail.
- A self alias fails.
- Extracted and empty content invariants are enforced.
- Attachment extracted, failed, and error-code invariants are enforced.

### Canonical notices

- Valid crawler and manual notices pass.
- Crawler source fields are required.
- Source-board institution IDs must match.
- Target/excluded overlap fails.
- All and unknown target invariants are enforced.
- Campus review state works in both directions.
- Superseded-link and self-reference invariants are enforced.
- An unknown notice-type basis requires an unknown notice type.
- Revision zero fails.

### Extractions

- Body and attachment evidence invariants are enforced.
- Offset pairing, ordering, and exact-match rules are enforced.
- Empty exact text is accepted only for a non-exact match.
- Extraction-item time/date dependency is enforced.
- Review state and duplicate reasons are rejected when invalid.
- All-day and timed candidate invariants are enforced.
- Suppression-reason state is enforced.
- Parent/child IDs, uniqueness, and references are validated.
- A failed result requires empty item and candidate collections.

### Calendar events

- Valid all-day and timed deadline objects pass.
- All-day time and timezone values fail.
- Timed start-time and timezone requirements are enforced.
- Inclusive end-date ordering is enforced.
- Same-day end-time ordering is enforced without incorrectly comparing times across different dates.
- Review state is enforced.
- Cancelled events retain dates.
- Negative sequences fail.

### Subscription feeds

- A valid student feed passes.
- Empty and duplicate selection arrays fail.
- An explicit department actor passes schema validation.
- A raw-token unknown key fails strict validation.
- Parsing does not insert default actors.

Tests assert `safeParse().success` or parse failures without coupling to complete rendered error strings. Fixtures use fixed datetimes and no network or external filesystem data.

## 13. Verification and Failure Policy

S4 and S5 verify module syntax, direct imports, public index imports, unchanged package and lockfiles, and unchanged existing callers. S6 additionally imports the existing server schemas as a regression check.

Refinement failures must expose identifiable messages and useful paths. If implementation reveals a conflict with this specification or the parent contract, work stops rather than silently renaming a field or weakening a test. Fixing a specification contradiction requires a separately approved documentation change.

## 14. Contract Consistency and Deferred Work

This specification preserves the parent contract's campus separation, event inclusion rules, persistent event identity, inclusive core end dates, strict core boundary, review-state equivalence, unique taxonomy arrays, and schema-free actor defaults.

The following parent-contract decisions remain outside SF-4 and are not blockers for schema implementation:

- Cancellation-event retention period
- Selective attachment-extraction policy details
- Database and persistent-ID issuance implementation
- Samsung Calendar physical-device QA
- Detailed cross-post representative-selection algorithm

Adapter implementation, runtime wiring, crawler mapping implementation, event promotion/reconciliation, ICS serialization, and roadmap reprioritization require separately planned and approved work.
