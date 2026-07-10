# KNU Rule Candidates to ExtractionResult Mapping Contract

Status: Authoritative for the S19 KNU rule-candidate adapter

Contract version: noticepilot.domain.v1

Parent contracts:

- subscription-foundation-contract.md
- sf4-zod-schema-implementation-spec.md
- subscription-adapter-contract.md
- knu-crawler-v0.4.4-mapping-contract.md
- crawled-notice-canonicalization-contract.md

Source fixture set: noticepilot.knu-rule-candidates-v0.4.sanitized

Decision date: 2026-07-10

## 1. Boundary

S19 implements this source-specific adapter:

```text
normalizeKnuRuleCandidatesToExtractionResult({
  candidatePayload,
  canonicalNotice,
  context,
})
→ ExtractionResult
```

The adapter translates an already-produced KNU rule-candidate payload into strict core extraction objects. It does not run rule extraction, parse notice prose beyond exact evidence lookup, promote candidates, select feed entries, reconcile events, or serialize ICS.

## 2. Supported Source Contract

The only accepted source schema version is:

```text
noticepilot.calendarCandidates.v0.4
```

Abbreviated or other minor versions are rejected. The payload must also contain:

```text
timezone=Asia/Seoul
extractor.version=0.4.4
extractor.mode=rule_based_v1
extractor.createdAt=valid ISO datetime with offset or Z
```

An invalid source timestamp is rejected. The adapter never falls back to `context.now`.

The strict source payload preserves the audited top-level, candidate, campus-scope, extractor, and summary keys. Candidate IDs must be non-empty and unique. Candidate arrays are not sorted or deduplicated by the adapter.

Summary values must equal the source payload:

- `candidateCount` equals `candidates.length`.
- `autoConfirmedCount` counts source `status=auto_confirmed`.
- `needsReviewCount` counts source `status=needs_review`.
- `calendarFeedIncludedCount` counts `includeInCalendarFeed=true`.

Source status accepts only `auto_confirmed` and `needs_review`. `includeInCalendarFeed` and `reviewedByUser` are booleans, and `createdBy` must be `rule`. These fields are source validation data, not core promotion truth.

## 3. Notice Identity and Source Hash

The adapter accepts only an active KNU crawler canonical notice:

```text
sourceKind=crawler
institutionId=kangwon
status=active
sourceBoard/sourcePostId/sourceUrl/boardCategory are non-null
sourceBoard.boardKey=knu-bbs-{sourceBoard.boardId}
```

Manual, deleted, superseded, or non-KNU canonical notices are rejected. Deleted and superseded state remains a reconciliation responsibility.

The expected source transport ID is reconstructed from the canonical notice:

```text
knu-{canonicalNotice.sourceBoard.boardId}-{canonicalNotice.sourcePostId}
```

The payload `sourceNoticeId` must equal that value. It is retained only for validation and provenance; it never becomes a core notice ID.

Core extraction ownership always uses:

```text
ExtractionResult.sourceNoticeId=canonicalNotice.noticeId
CalendarEventCandidate.sourceNoticeId=canonicalNotice.noticeId
```

The payload is rejected as stale unless:

```text
candidatePayload.sourceContentHash === canonicalNotice.contentHash
```

The adapter must not compare the source hash with `semanticContentHash`.

Top-level `sourceTitle` and `sourceUrl` must exactly equal the canonical notice title and observed source URL. Each candidate's source notice ID, title, URL, and campus scope must exactly equal its payload-level counterpart. Candidate `noticeType` must equal `canonicalNotice.boardCategory`; it is source board provenance and does not override `canonicalNotice.noticeType`.

Source campus scope is structurally validated under the audited KNU source vocabulary. Every candidate scope must exactly match the payload-level scope.

The payload source scope is converted to listed-campus form and compared with `canonicalNotice.campus.listedCampusClassification`:

```text
campus_specific + physical campuses → specific + preserved campuses
all_campuses + [all]                → all + all four physical campuses
unknown + [unknown]                 → unknown + []
```

Source labels are trimmed and whitespace-collapsed before comparison. Scope and campus sets must match, while array order is not significant. This comparison never uses resolved `targetScope`, `targetCampuses`, or `excludedCampuses`. Source campus data remains listed provenance and must not change canonical target campus or feed eligibility.

## 4. Core IDs and Source Candidate Provenance

Core IDs use the existing adapter context:

```text
extractionId=context.idFactory('extraction')
candidateId=context.idFactory('calendar_event_candidate')
evidenceId=context.idFactory('evidence')
```

The source candidate `id` becomes `sourceCandidateKey`. It must not become a core candidate ID or persistent event UID.

Each source `uidHint` must be exactly derivable from its candidate ID:

```text
source id:  cand-{source-specific-key}
uidHint:    noticepilot-{source-specific-key}@noticepilot.local
```

The adapter validates this relationship and then discards `uidHint`. It is not copied into `ExtractionResult`, `CalendarEventCandidate`, or any later event identity.

## 5. Event and Temporal Mapping

Only these source event types are supported:

| Source event type | Core `eventType` | Core `eventSubtype` |
| --- | --- | --- |
| `application_deadline` | `deadline` | `application_deadline` |
| `submission_deadline` | `deadline` | `submission_deadline` |
| `payment_deadline` | `deadline` | `payment_deadline` |
| `deadline` | `deadline` | `general_deadline` |

Every other literal is rejected.

Source actors map directly and are limited to `student`, `department`, and `unknown`.

Temporal mapping is closed:

| Source `normalizedStart` | Required source `isAllDay` | Core mapping |
| --- | --- | --- |
| `YYYY-MM-DD` | `true` | Date preserved; time and timezone null; `isAllDay=true` |
| `YYYY-MM-DDTHH:mm:ss+09:00` | `false` | Date and `HH:mm` split; timezone `Asia/Seoul`; `isAllDay=false` |
| `null` | `null` | Date, time, timezone, and `isAllDay` all null; add `ambiguous_date` |

`normalizedEnd` must be null. Non-null end support requires a separate source contract. Date-only and timed values must be real calendar values, and source `isAllDay` must agree with the normalized-start representation.

Core expression and fixed fields are:

```text
dateExpression=source dateText
timeExpression=source dateText for timed candidates, otherwise ''
description=''
relatedItemId=null
candidateStatus=pending
suppressionReason=null
```

Evidence is not copied into `description`; the candidate description is always the empty string.

Source `status`, feed inclusion, and user-review flags do not change candidate status.

## 6. Evidence Mapping

Evidence lookup uses only `canonicalNotice.normalizedText` and the first exact occurrence.

For non-empty evidence found exactly:

```text
sourcePart=body
attachmentId=null
exactMatch=true
startOffset=first occurrence
endOffset=startOffset + evidence length
sourceLineIndex=source evidenceLineIndex
```

For non-empty evidence not found:

```text
sourcePart=body
attachmentId=null
exactMatch=false
startOffset=null
endOffset=null
reviewReasons += evidence_not_exact
```

Empty evidence creates no `EvidenceRef` and adds `missing_evidence`. It does not additionally add `evidence_not_exact`; that reason applies only to non-empty evidence that is absent from canonical text. The adapter does not guess attachment provenance. Source `evidenceLineIndex` is a nonnegative integer or null and is preserved as `sourceLineIndex` when an evidence object is created.

## 7. Review Reasons and Warnings

Source uncertainty mapping is fixed:

| Source reason | Core behavior |
| --- | --- |
| `missing_evidence` | `missing_evidence` |
| `missing_normalized_date` | `ambiguous_date` |
| `unknown_actor` | `unknown_actor` |
| `internal_actor` | No core review reason |
| `weak_action_type` | `other` plus candidate warning |
| `uncertain_keyword:추후` | `other` plus candidate warning |
| `uncertain_keyword:예정` | `other` plus candidate warning |
| `uncertain_keyword:선착순` | `other` plus candidate warning |
| `uncertain_keyword:별도 공지` | `other` plus candidate warning |
| `uncertain_keyword:변동 가능` | `other` plus candidate warning |

Every unregistered reason or uncertain keyword is rejected.

`internal_actor` must be present if and only if `targetActor=department`. It expresses feed eligibility context, not extraction uncertainty, and does not force review. An unknown actor deterministically adds `unknown_actor` even if the source reason is absent.

The adapter also adds:

- `low_confidence` when source confidence is `low`.
- `missing_evidence` or `evidence_not_exact` from exact evidence validation.
- `ambiguous_date` when normalized start is null.

Review reasons are deduplicated in this fixed priority order:

```text
ambiguous_date
missing_evidence
evidence_not_exact
low_confidence
unknown_actor
other
```

The invariant is always derived rather than copied:

```text
reviewRequired = reviewReasons.length > 0
```

`weak_action_type` and allowed `uncertain_keyword:*` values each produce a candidate-level warning:

```text
type=knu_rule_uncertainty
message=the exact registered source reason
itemId=null
candidateId=generated core candidate ID
```

Source confidence is preserved. Source `auto_confirmed`, `needs_review`, feed inclusion, or reviewed-by-user state cannot suppress deterministic core review reasons.

## 8. ExtractionResult Mapping

The result contains no synthetic extraction items:

```text
items=[]
relatedItemId=null for every candidate
```

The source `summary` object is used only to validate source candidate/status/feed counts. Its values are not copied into the core string `summary`, which is always empty.

Result metadata is fixed:

```text
schemaVersion=1
extractionMethod=rule
sourceContentHash=canonicalNotice.contentHash
provider=null
model=null
promptVersion=null
extractorVersion=candidatePayload.extractor.version
schemaContractVersion=noticepilot.domain.v1
summary=''
inferredTitle=null
detectedNoticeType=canonicalNotice.noticeType
detectedLanguage=unknown
status=completed
createdAt=candidatePayload.extractor.createdAt
```

Every child candidate uses the same source extractor timestamp for `createdAt` and `updatedAt`. `context.now` is validated as part of the shared adapter context but is not used as a timestamp fallback.

The adapter returns only a strict `ExtractionResultSchema` result and does not mutate any caller input.

## 9. Sanitized Fixture Provenance

The checked-in fixture set is structurally derived from the two KNU v0.4.4 candidate samples recorded in `manifest.json`. It preserves the complete v0.4 key structure, two timed Samcheok candidates with student and department actors, and one all-day Gangneung-Wonju student candidate.

The board 720 normalized-notice fixture contains synthetic line-aligned student and department evidence. Its updated source content hash is also used by the linked candidate payload. Board 721 remains unchanged and supplies the all-day evidence case.

The fixture set excludes raw HTML, Python source, real notice prose, actual candidate identity and UID hints, reports, expected results, feed profiles, attachment metadata, and ICS output.

## 10. S19 Readiness

S19 is ready only when:

- fixture key paths match the two audited source samples;
- source archive provenance is verified;
- upstream source hashes, titles, URLs, evidence, and line indexes are consistent;
- temporal and summary invariants pass;
- no credential-like or real notice content remains;
- no core schema, adapter, runtime, dependency, or lockfile change was required by S18.

S19 implements only the boundary in section 1 with focused `node:test` coverage in `normalizeKnuRuleCandidatesToExtractionResult.js`. Promotion, feed selection, event reconciliation, and ICS remain separate work.
