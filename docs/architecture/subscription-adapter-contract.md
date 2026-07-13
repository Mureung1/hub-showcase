# NoticePilot Subscription Adapter Contract

Status: Authoritative for Subscription Foundation adapter work

Contract version: noticepilot.domain.v1

Parent contracts:

- subscription-foundation-contract.md
- sf4-zod-schema-implementation-spec.md

Decision date: 2026-07-10

## 1. Purpose and Scope

This contract defines the adapter boundaries that translate manual and legacy AI inputs into the strict Subscription Foundation domain and project core extraction output into the legacy manual-analysis UI shape.

The adapters covered by this contract are:

```text
ManualNoticeInput
→ CanonicalNotice

Legacy AiRawAnalysis
+ CanonicalNotice
→ ExtractionResult

ExtractionResult
→ AppAnalysisProjection
```

This contract does not authorize runtime wiring. Existing callers, `normalizeAiRawToAppResult.js`, `AppAnalysisSchema`, and the current App-based ICS export remain unchanged until separately approved compatibility work.

## 2. Adapter Principles

Adapters are pure boundary functions. Their responsibilities are limited to:

- payload shape conversion
- dependency-injected ID, time, and hash use
- null and legacy empty-string normalization
- evidence exact-match lookup
- deterministic review-reason enrichment
- construction of complete core objects
- strict core-schema validation before return

Adapters must not:

- read the global clock directly
- generate random or content-derived persistent IDs directly
- access a database or repository
- infer business facts from notice prose beyond the rules in this contract
- promote candidates into calendar events
- reconcile event identity or sequence
- serialize ICS
- silently mutate or deduplicate caller input

The validation order is:

```text
legacy/source payload
→ explicit normalization and enrichment
→ complete core object
→ strict core schema parse
→ validated return value
```

## 3. AdapterContext and Previous State

The conceptual adapter context is:

```ts
interface AdapterContext {
  now: string
  idFactory: (entityType: string) => string
  hashText: (input: string) => string
}
```

This TypeScript notation documents the interface only; the JavaScript implementation does not introduce TypeScript.

Rules:

- `now` must already be an ISO datetime accepted by `IsoDateTimeSchema`.
- `idFactory` supplies IDs for newly created domain entities.
- `hashText` supplies content hashes without coupling adapters to a specific hash library.
- Adapters use the injected values and never call `Date.now()`, `new Date()`, `crypto.randomUUID()`, or a repository directly.
- A caller or future repository layer is responsible for looking up previous state and constructing the context.

An adapter that may revise an existing canonical notice receives previous state explicitly:

```text
normalizeCrawledNoticeToCanonical({
  crawledNotice,
  previousCanonicalNotice,
  context,
})
```

Revision rules:

```text
previousCanonicalNotice=null
→ revision=1
→ allocate a new noticeId

same source identity and same contentHash
→ preserve noticeId
→ preserve revision

same source identity and changed contentHash
→ preserve noticeId
→ revision=previous revision + 1
```

The adapter preserves the previous `createdAt` when revising an entity and uses `context.now` for `updatedAt`. Persistent-ID issuance and prior-state retrieval may later be backed by a database, but adapters remain repository-independent.

## 4. ManualNoticeInput to CanonicalNotice

### 4.1 Function boundary

```text
normalizeManualNoticeToCanonical({
  manualNoticeInput,
  previousCanonicalNotice,
  context,
})
→ CanonicalNotice
```

The adapter is server/domain code and is not wired into the current UI in its initial implementation.

### 4.2 ManualNoticeInput contract

The S9 input schema defines:

```text
title: non-empty string
normalizedText: string
publishedAt: date|null
institutionId: ID|null
sourceUrl: URL|null
canonicalSourceUrl: URL|null
boardCategory: non-empty string|null
noticeType: NoticeType
campus: CanonicalCampusMetadata|null
attachments: AttachmentRef[]
```

All fields are present; nullable fields use `null`, not an empty string. The input schema is strict and supplies no Zod defaults.

### 4.3 Canonical mapping

- `sourceKind` is `manual`.
- `sourceBoard` and `sourcePostId` are `null`.
- A known manual notice type uses `noticeTypeBasis=manual`.
- `noticeType=unknown` uses `noticeTypeBasis=unknown`.
- `noticeTypeConflict` is `false`; conflict detection requires a separate classification input.
- `status` is `active` and `supersededByNoticeId` is `null` for this creation/update adapter.
- `contentHash` is `context.hashText(normalizedText)`.
- Until a separate semantic-normalization policy exists, `semanticContentHash` uses the same `hashText(normalizedText)` result. This does not make the hash a persistent entity ID.
- Identity, revision, `createdAt`, and `updatedAt` follow section 3.

If `campus` is non-null, the adapter validates and preserves it. If it is null, the adapter constructs the explicit unresolved state:

```text
listedCampusClassification:
  rawLabel=null
  campuses=[]
  scope=unknown
targetScope=unknown
targetCampuses=[]
excludedCampuses=[]
targetCampusBasis=unknown
campusReviewRequired=true
campusReviewReasons=[target_campus_unresolved]
```

User campus preferences must not be used as notice target-campus evidence.

## 5. Legacy AiRawAnalysis to ExtractionResult

### 5.1 Function boundary

```text
normalizeAiRawToExtractionResult({
  aiRawAnalysis,
  canonicalNotice,
  extractionMetadata,
  context,
})
→ ExtractionResult
```

`aiRawAnalysis` is first validated with the existing legacy `AiRawAnalysisSchema`. The adapter does not change that schema. `canonicalNotice` is a validated core object and supplies the source notice ID, normalized source text, and source content hash.

`extractionMetadata` supplies nullable provider/model/prompt/extractor metadata. `extractionId`, child IDs, and evidence IDs come from `context.idFactory`.

The result uses:

```text
schemaVersion=1
extractionMethod=ai
schemaContractVersion=noticepilot.domain.v1
sourceContentHash=canonicalNotice.contentHash
detectedNoticeType=unknown
detectedLanguage=unknown
inferredTitle=null
status=completed
createdAt=context.now
```

The legacy schema has no structured document classification or language fields, so the adapter must not infer them from prose.

### 5.2 Empty date and time normalization

- Legacy `normalizedDate=""` becomes core `normalizedDate=null`.
- A valid legacy normalized date is preserved.
- Legacy raw has no structured time, so `timeExpression=""`, `normalizedTime=null`, and `timezone=null`.
- The adapter does not parse apparent times from title or evidence text.

### 5.3 Deterministic review enrichment

The adapter evaluates applicable reasons in this order and accumulates unique reasons:

```text
normalizedDate missing
→ ambiguous_date

evidence missing
→ missing_evidence

non-empty evidence not found exactly in canonical text
→ evidence_not_exact

confidence=low
→ low_confidence

targetActor=unknown
→ unknown_actor

legacy reviewRequired=true and no reason found above
→ other
→ DomainWarning(type="ai_review_reason_unspecified")
```

For empty evidence, `missing_evidence` is recorded and `evidence_not_exact` is not additionally added for the same empty value.

The core review state is always derived from the enriched reason list:

```text
reviewRequired = reviewReasons.length > 0
```

If legacy AI sets `reviewRequired=false` but deterministic checks find a problem, the core object is promoted to `reviewRequired=true`. If legacy AI sets it to true without an identifiable reason, the adapter adds `other` and the warning above. The legacy boolean never overrides the core invariant.

### 5.4 String evidence conversion

The initial adapter searches only `canonicalNotice.normalizedText`.

For non-empty AI evidence, use the first exact string occurrence deterministically:

```text
match found
→ sourcePart=body
→ attachmentId=null
→ exactText=legacy evidence
→ exactMatch=true
→ startOffset=first match index
→ endOffset=startOffset + evidence length
```

If the non-empty string is not found:

```text
sourcePart=body
attachmentId=null
exactText=legacy evidence
exactMatch=false
startOffset=null
endOffset=null
reviewReasons += evidence_not_exact
```

Empty evidence produces no `EvidenceRef` and adds `missing_evidence`.

The adapter does not guess attachment provenance. Attachment evidence support requires a later input-segment provenance contract.

### 5.5 Extraction item mapping

- Preserve legacy `kind`, `title`, `description`, `dateExpression`, confidence, and valid normalized date.
- Generate `itemId`, `extractionId`, evidence IDs, and `createdAt` from injected context.
- Use `extractionMethod=ai`.
- Populate time fields as described in section 5.2.
- Derive review state only through section 5.3.

### 5.6 Calendar event candidate mapping

Legacy AI raw has no actor, subtype, structured time, related-item reference, or source-candidate key.

The adapter uses:

```text
relatedItemId=null
sourceCandidateKey=null
description=""
eventSubtype=null
targetActor=unknown
timeExpression=""
normalizedTime=null
timezone=null
candidateStatus=pending
suppressionReason=null
```

`unknown_actor` is added to every legacy candidate review-reason list.

All-day state is conservative:

```text
eventType in deadline|start and normalizedDate is valid
→ isAllDay=true

otherwise
→ isAllDay=null
```

A meeting without structured time is preserved as a candidate with unresolved temporal state. Promotion policy excludes it by default; the adapter does not suppress or delete it.

### 5.7 Legacy warnings

- A legacy warning object preserves its non-empty type when available; otherwise use `legacy_ai_warning`.
- A legacy warning string uses type `legacy_ai_warning` and the string as its message.
- Legacy warnings are global: `itemId=null`, `candidateId=null`.
- Adapter-generated `ai_review_reason_unspecified` warnings may reference the related item or candidate ID when available.

## 6. Adapter and Promotion Boundary

Adapter responsibility:

```text
payload conversion
context injection
null/empty-string normalization
evidence exact matching
review-reason enrichment
strict core validation
```

Promotion responsibility:

```text
candidate event eligibility
targetActor eligibility
eventType eligibility
valid date/time policy
meeting-without-time exclusion
eventId reconciliation
status and sequence
```

The functions remain separate:

```text
normalizeAiRawToExtractionResult()
promoteCandidateToCalendarEvent()
```

The legacy AI adapter must never create `CalendarEvent` objects directly.

## 7. ExtractionResult to AppAnalysisProjection

### 7.1 Function boundary

```text
projectExtractionResultToAppAnalysis({
  extractionResult,
  projectionContext,
})
→ AppAnalysisSchema-compatible object
```

This is a compatibility projection, not a core-domain transformation. It must validate its output with `AppAnalysisSchema` before return.

`projectionContext` supplies UI-only metadata that is not part of extraction:

```text
title
userSelectedNoticeType
noticePublicationDate
uploadedFileName
referenceDate
userPreferencesSnapshot optional
```

### 7.2 Item projection

- Route core items to the matching app section by `kind`.
- Use the core item ID as the App item ID.
- Project the first evidence `exactText` as the legacy evidence string, or `""` when no evidence exists.
- Convert core nullable normalized dates/times to legacy empty strings.
- Set UI-only initial flags such as `edited=false` and `completed=false` without changing the core object.
- Preserve confidence and review state.

### 7.3 Candidate projection and date compatibility

Calendar candidates remain reviewable UI projections; projection does not promote them into core events. To preserve the existing App contract, a projected candidate uses `selected=true` when `normalizedDate` is non-null and `selected=false` otherwise. This UI compatibility flag is not core promotion eligibility. In particular, the later promotion policy may still exclude a meeting that lacks structured time.

For the legacy all-day date representation:

```text
core/candidate normalizedDate=2026-07-20
→ App startDate=2026-07-20
→ App endDate=2026-07-21
```

The next-day App `endDate` is an explicit UI compatibility projection. It does not mutate the inclusive core date model.

The long-term path bypasses App dates:

```text
CalendarEvent[]
→ core ICS serializer
```

The core serializer converts inclusive `CalendarEvent.endDate` to exclusive ICS `DTEND` itself.

## 8. Deferred Layers

### 8.1 Crawler adapters

S14 introduced the sanitized KNU crawler v0.4.4 fixtures and mapping contract. S15 implemented the strict KNU normalized-payload to `CrawledNotice` adapter.

S16 audited the next boundary without implementing candidate promotion. S17 implements `CrawledNotice` to `CanonicalNotice` under the dedicated `crawled-notice-canonicalization-contract.md`. Body-campus parsing and notice-type classification remain optional upstream resolution inputs rather than adapter inference.

### 8.2 Other deferred layers

The following remain separate work:

- candidate promotion policy
- CalendarEvent identity reconciliation and sequence handling
- Subscription ICS serialization
- attachment-provenance-aware AI evidence
- AI raw vNext with structured actor, subtype, time, and provenance

Legacy AI adaptation is not blocked on AI raw vNext. The deterministic conservative rules in section 5 are sufficient for the legacy adapter.

## 9. Compatibility and Runtime Policy

- S9 through S12 add isolated schemas, adapters, and tests without changing existing callers.
- S13 converts `normalizeAiRawToAppResult.js` into an opt-in compatibility wrapper after the new adapter and projection suites pass.
- The public signature remains `normalizeAiRawToAppResult(aiRawInput, options)`.
- Without `options.domainAdapter`, the wrapper runs the existing legacy normalization unchanged.
- The domain path is selected only when the complete strict option below is present:

```text
options.domainAdapter = {
  canonicalNotice,
  context,
  extractionMetadata,
}
```

- The wrapper never synthesizes a canonical notice, clock, ID, or hash dependency.
- The domain path runs `normalizeAiRawToExtractionResult` and then `projectExtractionResultToAppAnalysis`.
- Existing top-level UI options supply projection title, selected notice type, publication date, uploaded filename, reference date, and optional preference metadata.
- A non-empty top-level `detectedNoticeType` remains an explicit App compatibility override; it does not modify the core extraction result.
- An absent, null, partial, or unknown-key `domainAdapter` object is rejected rather than partially falling back.
- Domain enrichment may produce different review reasons and warnings, but these changes occur only on the explicit opt-in path.
- Manual text paste, client mock, and server mock behavior must remain available.
- Runtime wiring must not silently change selection, export, warning, or review behavior.

## 10. Approved Follow-up Sequence

Adapter track:

```text
S9  — ManualNoticeInput schema and adapter
S10 — Legacy AI raw to ExtractionResult adapter
S11 — ExtractionResult to AppAnalysis projection
S12 — Adapter node:test validation
S13 — Existing normalizeAiRawToAppResult compatibility wrapper transition
```

Crawler and subscription-event track:

```text
S14 — KNU crawler fixture and local contract artifact
S15 — KNU crawler adapter
S16 — CrawledNotice to CanonicalNotice boundary audit and plan
S17 — CrawledNotice to CanonicalNotice contract and adapter
S18 — KNU rule-candidate mapping contract and sanitized fixtures
S19 — KNU rule candidates to ExtractionResult adapter
```

S18 and S19 connect crawler rule extraction to the common `ExtractionResult` and `CalendarEventCandidate` boundary. Candidate promotion, CalendarEvent reconciliation, and core ICS serialization remain deferred. Their replacement step numbers require a separate plan and are not assigned by S18.

S19 implements the strict `normalizeKnuRuleCandidatesToExtractionResult` boundary under `knu-rule-candidate-mapping-contract.md`. It preserves source rule candidates as pending core candidates and does not perform promotion or feed selection.

Each step requires its own step-gated plan and approval. Completing this document does not authorize any adapter or runtime implementation.
