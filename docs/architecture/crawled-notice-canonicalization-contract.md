# CrawledNotice to CanonicalNotice Contract

Status: Authoritative for the crawler canonicalization adapter

Contract version: noticepilot.domain.v1

Parent contracts:

- subscription-foundation-contract.md
- sf4-zod-schema-implementation-spec.md
- subscription-adapter-contract.md
- knu-crawler-v0.4.4-mapping-contract.md

Decision date: 2026-07-10

## 1. Boundary

The crawler canonicalization boundary is:

```text
normalizeCrawledNoticeToCanonical({
  crawledNotice,
  previousCanonicalNotice,
  campusResolution,
  noticeTypeResolution,
  context,
})
→ CanonicalNotice
```

Every argument key is required by the strict argument object. Optional resolution values use explicit `null`.

The adapter accepts only `crawlStatus=active` with content extraction status `extracted` or `empty`. Missing, deleted, fetch-failed, and content-extraction-failed states belong to crawl-run reconciliation and are rejected here.

The adapter does not parse notice prose, classify notice type, promote event candidates, reconcile calendar events, or serialize ICS.

## 2. Optional Resolution Inputs

An upstream body-campus resolver may supply:

```text
campusResolution:
  targetScope: all | specific
  targetCampuses: unique CampusId[]
  excludedCampuses: unique CampusId[]
```

`all` requires all four physical campuses. `specific` requires one to three. Target and excluded arrays must not overlap. The adapter fixes `targetCampusBasis=explicit_text`; callers do not supply basis or review state.

An upstream rule or AI classifier may supply:

```text
noticeTypeResolution:
  noticeType: NoticeType
  noticeTypeBasis: rule | ai
```

Both resolution objects are strict. The adapter accepts their validated decisions but does not perform either resolution itself.

## 3. Campus Policy

An explicit `campusResolution` takes precedence over listed-campus metadata. If listed scope is known and its campus set differs from the explicit target set, the adapter records:

```text
campusReviewRequired=true
campusReviewReasons=[source_target_campus_conflict]
```

Campus-set comparison ignores array order. Listed `unknown` makes no source assertion and therefore does not create a conflict with an explicit resolution.

Without an explicit resolution:

| Listed classification | Canonical target |
| --- | --- |
| `all` | `targetScope=all`, all four campuses, `listed_campus_default`, no review |
| `specific` | `targetScope=source_default`, listed campuses, `listed_campus_default`, no review |
| `unknown` | `targetScope=unknown`, no target campuses, `target_campus_unresolved` review |

Fallback and explicit results use `excludedCampuses=[]` unless the explicit resolution supplies exclusions. `common_board_default` is not used because `CrawledNotice` has no authoritative common-board signal.

## 4. Notice Type Policy

An explicit notice-type resolution takes precedence. When a board hint exists and differs from the resolved type, `noticeTypeConflict=true`; otherwise it is false.

Without a resolution:

```text
sourceBoard.noticeTypeHint exists
→ noticeType=noticeTypeHint
→ noticeTypeBasis=board_hint
→ noticeTypeConflict=false

noticeTypeHint absent
→ noticeType=unknown
→ noticeTypeBasis=unknown
→ noticeTypeConflict=false
```

`boardCategory` always preserves `sourceBoard.category` independently of notice type.

## 5. Field and Hash Mapping

The adapter preserves the crawler institution, source board, post ID, observed URL, canonical URL, title, publication date, attachments, and listed-campus classification. It maps `contentText` to `normalizedText` and preserves the source-specific `contentHash` without recalculation.

`semanticContentHash` is dependency-injected:

```text
contentText non-empty → context.hashText(contentText)
contentText empty     → context.hashText(title)
```

The semantic hash is a comparison aid. It is not source identity, a persistent ID, or a standalone cross-post deduplication decision.

The adapter verifies that `sourceIdentityKey` equals:

```text
institutionId:sourceBoard.category:sourcePostId
```

## 6. Previous State and Revision

Previous state is supplied explicitly and never loaded by the adapter. A previous notice must be an active crawler `CanonicalNotice` with the same source identity. Manual, deleted, superseded, or different-identity previous notices are rejected.

The shared revision policy is:

```text
previous=null
→ allocate context.idFactory('canonical_notice')
→ revision=1
→ createdAt=context.now

same source identity and contentHash
→ preserve noticeId, revision, createdAt

same source identity and changed contentHash
→ preserve noticeId and createdAt
→ revision=previous revision + 1
```

Every result uses `updatedAt=context.now`, `status=active`, and `supersededByNoticeId=null`. Deletion, supersession, and cancellation remain reconciliation responsibilities.

## 7. Validation and Exclusions

The adapter validates strict arguments, injected IDs and hashes, optional resolutions, source identity, current crawl state, and previous state before returning a strict `CanonicalNoticeSchema` result. It does not mutate any caller input.

The following remain outside this contract:

- body-campus parsing and notice-type classification
- cross-post representative selection
- candidate promotion and feed eligibility
- CalendarEvent identity, status, and sequence reconciliation
- cancellation retention and ICS serialization
- runtime caller wiring
