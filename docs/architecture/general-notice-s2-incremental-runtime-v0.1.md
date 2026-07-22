# General Notice S2 Incremental Runtime v0.1

Status: `implemented_internal_incremental_non_publishing`

## Purpose and authority boundary

This is an operator-triggered, Python-owned path from one explicitly selected
private S1 batch to durable General Notice CalendarEvent state. It consumes
clean S1-A batches and aggregate-clean S1-B batches only for forward candidate
processing. S1-B remains observation-only: neither batch type grants source
completeness, absence, deletion, cancellation, publication, or production
authority.

The command never discovers a latest batch. It requires absolute roots, an
exact batch identifier, an environment-held database URL, and
`--confirm-persist`. Server startup, HTTP routes, Node database access,
schedulers, and daemons are absent.

## Input and receipt contracts

`noticepilot.generalNoticeS2ConsumerReceipt.v0.1` binds the producer batch and
manifest digests, optional S1-B receipt digest, ordered normalized notice
identities/content hashes, extraction/adapter/promotion/reconciliation
versions, and ordered dispositions. Its canonical input is the idempotency
key. Exact retries are no-ops; the same key with a different payload fails
closed. Database triggers reject receipt and outcome UPDATE or DELETE.

`noticepilot.generalNoticeReconciliationInput.v0.1` wraps, without replacing,
the existing normalized notice, KNU candidate payload, and Candidate-to-
ExtractionResult adapter. Date parsing, candidate generation, promotion, and
S27 candidate-view construction remain their existing authorities. Review
candidates are retained as immutable evidence and never materialize an active
event.

## Incremental reconciliation

The sealed S27 baseline is read-only. The search universe is that baseline
plus prior General Notice overlay outcomes. The complete-snapshot materializer
is never used as an incremental writer.

Only candidate views sharing an existing S27-derived relation base title or
canonical source identity enter the unchanged S27 pair evaluator. This is a
search boundary, not a merge rule: title/date never prove identity, and all
selected relations still use the existing reconciler.

- unambiguous no-match: may create a new overlay event;
- ambiguous relation: immutable review outcome only;
- approved baseline match: evidence-only outcome, with no baseline revision or
  active-head mutation;
- overlay revision: deferred in v0.1.

The 900 events, 901 revisions, 909 source links, and 900 active revisions in
the baseline remain byte-identical. Reporting keeps baseline and overlay
counts separate.

## PostgreSQL persistence

The only migration authority is
`packages/noticepilot-knu-crawler/migrations/postgresql`, ledger
`noticepilot.schema_migration`, and the existing Python migration runner.
Migration `0002_general_notice_s2_incremental_outcomes.sql` adds immutable
consumer receipts and outcomes, and preserves a first-class opaque source-link
ID for newly created S2 links. It adds no feed, snapshot, ICS, academic, or
parallel-ledger table.

One transaction covers receipt, S29 source/candidate records, reconciliation
evidence, and—only for a no-match—the new opaque CalendarEvent, initial
CalendarEventRevision, active head CAS, CalendarEventSourceLink, and candidate
assignment. Receipt and candidate advisory transaction locks serialize
competing writes. The database relationship keys and post-commit read-back
verify that event, active revision, source link, and assignment agree.

## Non-goals and production gate

This release does not revise baseline events, infer cancellation/deletion,
activate feeds, snapshots, ICS, a public API, UI, scheduler, deployment, or
production sources. Academic runtime and PR #58 remain isolated. A future
baseline-revision or production activation requires separate creator authority.

## Verification

Focused tests cover batch validation, provenance, receipt idempotency,
review/baseline dispositions, no-match writes, rollback boundaries, PostgreSQL
immutability, checksum mismatch, real concurrent first writes, post-commit
retry, and committed read-back. CI uses PostgreSQL 17 through the existing
migration authority.
