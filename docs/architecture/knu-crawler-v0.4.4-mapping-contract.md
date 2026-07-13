# KNU Crawler v0.4.4 to CrawledNotice Mapping Contract

Status: Authoritative for the S15 KNU crawler adapter

Contract version: noticepilot.domain.v1

Parent contracts:

- subscription-foundation-contract.md
- sf4-zod-schema-implementation-spec.md
- subscription-adapter-contract.md

Source fixture set: noticepilot.knu-crawler-v0.4.4.sanitized

Decision date: 2026-07-10

## 1. Purpose and Boundary

This contract fixes the source-specific boundary between the audited KNU crawler v0.4.4 normalized payload and the strict core `CrawledNotice` object. S15 implements this function:

```text
normalizeKnuV044ToCrawledNotice({
  normalizedNotice,
  boardRegistry,
  context,
})
→ CrawledNotice
```

The adapter converts and validates one already-normalized source notice. It does not fetch pages, read raw HTML, access a repository, or repair unsupported source enum values.

S14 contains only sanitized fixtures and this contract. S15 owns adapter code and adapter tests.

## 2. Supported Source Contract

The adapter accepts only these source schema versions:

- `noticepilot.normalizedNotice.v0.3`
- `noticepilot.normalizedNotice.v0.4`

The two versions normalize identically. Supporting both is an explicit response to producer/sample drift in the audited v0.4.4 package; it does not permit arbitrary version coercion. Every other source schema version is rejected.

The source institution must be `kangwon.ac.kr`, the crawler version must be `0.4.4`, and the timezone must be `Asia/Seoul`. Source IDs and duplicated list metadata must be internally consistent:

- `board.boardId`, `listMetadata.board_id`, and the discovered URL board ID are equal. That observed ID may be the canonical registry ID or one of its aliases.
- `pstSn` and `listMetadata.pst_sn` are equal.
- `sourceUrl` and `listMetadata.url` are equal.
- `title`, `publishedAt`, and their list-metadata counterparts are exact matches. The adapter does not collapse title whitespace.
- `attachmentCount` equals `attachments.length`.
- Attachment indexes are positive, unique, and in source order.
- `extractedTextChars` equals the JavaScript string length of `extractedText`.
- SHA-256 source fields are lowercase 64-character hexadecimal strings when non-null.

An unsupported status, inconsistent duplicate field, or missing registry entry is rejected rather than guessed.

## 3. Identity and Source Board

`AdapterContext` is validated before use. The adapter obtains `crawledNoticeId` from `context.idFactory('crawled_notice')` and every `attachmentId` from `context.idFactory('attachment')`; it does not reuse the source `noticeId` as a core ID and does not derive a persistent ID from content.

The institution mapping is fixed:

```text
kangwon.ac.kr → kangwon
```

The raw source institution key remains available separately:

```text
sourceInstitutionKey=normalizedNotice.institution
institutionId=kangwon
```

Source identity uses the canonical registry category:

```text
sourceIdentityKey=kangwon:{registry.category}:{pstSn}
```

The adapter selects exactly one canonical registry entry whose `boardId` equals the observed board ID or whose `aliasBoardIds` contains it. No match or multiple matches are rejected. The adapter requires the payload board category, display name, priority, and alias IDs to agree with that canonical registry entry. Registry-only `priority` and `dedupeKey` are validated where present but are not core `SourceBoard` fields.

`SourceBoard` is constructed as follows:

| Core field | Source or rule |
| --- | --- |
| `boardId` | Registry `boardId` |
| `institutionId` | `kangwon` |
| `boardKey` | `knu-bbs-{boardId}` |
| `displayName` | Registry `name` |
| `category` | Registry `category` |
| `canonical` | Registry `canonical` |
| `aliasBoardIds` | Registry `aliasBoardIds` |
| `listUrl` | `https://www.kangwon.ac.kr/ko/bbs/{boardId}/list.do` |
| `noticeTypeHint` | Registry category when it is a core `NoticeType`; otherwise omitted |
| `supportedCampusFilters` | `[]` |

An empty `supportedCampusFilters` array means the local contract has not verified a board-level filtering capability. It is not evidence that the board has no campus metadata.

## 4. URLs and Source Metadata

`sourceUrl` preserves the observed normalized source URL, including its query parameters. It must use HTTPS, host `www.kangwon.ac.kr`, the exact path `/ko/bbs/{observedBoardId}/detail.do`, and exactly one non-empty `pstSn` query value. `canonicalSourceUrl` uses the canonical registry board ID and removes every query parameter except `pstSn`:

```text
https://www.kangwon.ac.kr/ko/bbs/{boardId}/detail.do?pstSn={pstSn}
```

The adapter rejects a source URL whose origin, board path, or `pstSn` does not match the normalized payload. It does not copy `sourceSystem`, `noticeId`, `crawler.userAgent`, `listMetadata.row_index`, `notice_no`, `author`, `views`, `is_pinned`, or `parse_source` into the core object. Those fields remain source-boundary validation or provenance data and do not acquire new core semantics.

## 5. Listed Campus Classification

`listedCampusClassification` is derived only from `listMetadata.campus`. The producer's `campusScope` remains an internal hint and never determines `CanonicalNotice.targetScope`, `targetCampuses`, or feed selection.

The adapter trims and collapses whitespace in the list label, then applies the audited producer vocabulary:

- `춘천`, `삼척`, and `도계` map to their corresponding physical campus IDs.
- `강릉` or `원주` maps to the single physical ID `gangneung_wonju`; `강릉 원주` and `강릉원주` therefore produce the same result.
- Multiple physical-campus words produce a unique campus array in the fixed physical-campus order.
- `ALL`, `전체`, or a label containing `전체` maps to `scope=all` and all four physical campuses.
- A label containing all four physical campuses also maps to `scope=all`.
- Empty or unrecognized labels map to `scope=unknown` and an empty campus array.

A non-empty normalized list label becomes `rawLabel`; otherwise `rawLabel=null`. One to three detected physical campuses use `scope=specific`.

The adapter accepts only the producer provenance values `listMetadata.campus`, `title_or_body`, `listMetadata.author`, and `none`. Every `campusScope` must be internally consistent: `all_campuses` contains only the `all` sentinel, `unknown` contains only the `unknown` sentinel, `campus_specific` contains unique physical IDs, and `source=none` requires unknown scope.

When `campusScope.source=listMetadata.campus`, its normalized source label, scope, and campuses must agree with the classification derived from `listMetadata.campus`; a conflict is rejected. Hints derived from `title_or_body`, `listMetadata.author`, or `none` are validated but ignored for listed classification, including when they conflict with the list label. Explicit body-based target classification remains a later canonicalization responsibility.

## 6. Notice Content Mapping

| Core field | Source or rule |
| --- | --- |
| `schemaVersion` | Core literal `1` |
| `sourcePostId` | `pstSn` |
| `title` | `title` |
| `publishedAt` | `publishedAt`, or `null` when source null |
| `fetchedAt` | `crawler.crawledAt` |
| `contentText` | `extractedText` |
| `rawSourceHash` | `rawHtml.sha256`, or `null` |
| `contentHash` | Source `contentHash` unchanged |
| `crawlStatus` | `active` |

Content extraction status is closed and deterministic:

| Source `textExtractionStatus` | Core `contentExtractionStatus` |
| --- | --- |
| `body_html_extracted` | `extracted` |
| `empty_body` | `empty` |

`body_html_extracted` requires non-empty `extractedText`. `empty_body` requires `extractedText=''` and `extractedTextChars=0`. Every other source text-extraction status is rejected.

`rawHtml.path` is source provenance only and is never copied into core. The adapter does not open it. A successfully produced supported normalized payload maps to `crawlStatus=active`; missing, deleted, and fetch-failed states require a different source input contract.

## 7. Attachment Mapping

The adapter preserves attachment order and allocates one core attachment ID per source entry.

| Core field | Source or rule |
| --- | --- |
| `attachmentId` | `context.idFactory('attachment')`; IDs must be unique within the notice |
| `fileName` | `display_name` |
| `sourceUrl` | `download_url` |
| `serverName` | `server_name`, nullable |
| `sourcePath` | Source `path`, nullable |
| `mediaType` | `detected_type`, nullable |
| `fileExtension` | Lowercase final filename suffix when unambiguous, otherwise `null` |
| `fetchedAt` | `crawler.crawledAt` when `downloaded=true`, otherwise `null` |
| `sizeBytes` | `size_bytes`, nullable |
| `contentHash` | Attachment `sha256`, nullable |
| `normalizedText` | `null`; source payload has no extracted attachment text |

Attachment status mapping is fixed:

| Source status | Required consistency | Core status | Core `errorCode` |
| --- | --- | --- | --- |
| `metadata_only` | `downloaded=false` | `not_requested` | `null` |
| `skipped_by_probe_download_first` | `downloaded=false` | `not_requested` | `null` |
| `downloaded` | `downloaded=true` | `downloaded` | `null` |
| `failed_invalid_content` | `downloaded=false`, non-empty source `error` | `failed` | `source_invalid_content` |
| `failed_exception` | `downloaded=false`, non-empty source `error` | `failed` | `source_download_exception` |

Every attachment URL must use HTTPS, host `www.kangwon.ac.kr`, path `/ko/cmmn/download.do`, and exactly one non-empty `dn`, `path`, and `fn` query value. Unknown statuses and contradictory download fields are rejected. A `downloaded` source requires `downloaded=true`, a positive size, a SHA-256 hash, and `error=null`. Metadata-only and skipped sources require `downloaded=false` and no result hash, size, error, or local path. Failed sources require `downloaded=false`, a non-empty raw error, and no result hash.

`elapsed_ms` is source diagnostic data and is not copied. `local_path`, raw exception text, and stack-like text are always discarded. They must never appear in the core output; only the stable status-derived `errorCode` crosses the boundary.

`attachmentRequiredForFullExtraction` is preserved only as source audit data in the fixture. Detailed selective attachment extraction remains unresolved in the parent contract and does not alter `CrawledNotice` mapping.

## 8. Strict Core Validation and Excluded Semantics

The adapter constructs a complete object and returns only the result of strict `CrawledNoticeSchema` parsing. It does not add defaults to source taxonomy arrays, deduplicate arrays, sort arrays, or silently repair inconsistent source values.

The following source or downstream concepts are outside this mapping boundary:

- candidate extraction results and source candidate `uidHint` values
- source feed eligibility or `auto_confirmed` decisions
- target-campus classification and user campus preferences
- candidate promotion into `CalendarEvent`
- persistent event UID, revision reconciliation, and cancellation
- arbitrary event duration or ICS serialization
- raw HTML parsing and attachment selective-extraction policy

In particular, a source candidate kind such as `submission_deadline` must not be copied into a core event type by this adapter. Event-type and subtype mapping belongs to extraction or promotion work. The source package's feed-profile default for unknown campuses and its duration-based ICS behavior do not override the authoritative Subscription Foundation contract.

## 9. Sanitized Fixture Provenance

The checked-in fixture set is derived structurally from `noticepilot-knu-crawler-v0.4.4.zip`, whose SHA-256 is recorded in `manifest.json`. The archive remains external reference material and is not copied or extracted into the repository.

The fixtures preserve the registry shape, normalized notice keys, Samcheok and Gangneung-Wonju listed-campus examples, and metadata-only attachment shape. They intentionally replace notice IDs, prose, authors, view counts, URLs, server paths, attachment names, and hashes with synthetic values.

The repository fixture set excludes raw HTML, hidden authentication-token values, browser API keys, Python code, actual attachment download metadata, candidate/expected outputs, feed profiles, and ICS output. S15 tests must use only this sanitized fixture set.

## 10. S15 Readiness Criteria

S15 is ready only when:

- all four JSON artifacts parse;
- fixture counts, string lengths, and hash shapes are internally consistent;
- the fixture set contains no raw HTML or credential-like values;
- all source fields have a documented mapping, validation-only role, or explicit exclusion;
- the fixture and contract add no adapter, runtime, dependency, or lockfile changes.

S15 must implement only the boundary in section 1 and its focused `node:test` coverage. Candidate promotion, event reconciliation, and ICS serialization remain later separately approved steps.
