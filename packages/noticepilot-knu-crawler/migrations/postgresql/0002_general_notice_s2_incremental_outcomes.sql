BEGIN;

-- S29 created the source-link relationship but did not retain its opaque
-- registry identifier as a first-class column.  v0.1 keeps legacy rows
-- nullable and requires a unique opaque identity for every new S2 link.
ALTER TABLE noticepilot.calendar_event_source_link
  ADD COLUMN source_link_id text;

ALTER TABLE noticepilot.calendar_event_source_link
  ADD CONSTRAINT calendar_event_source_link_id_format
  CHECK (source_link_id IS NULL OR source_link_id ~ '^evsrc_[0-9a-f]{32}$');

CREATE UNIQUE INDEX calendar_event_source_link_source_link_id_idx
  ON noticepilot.calendar_event_source_link(source_link_id)
  WHERE source_link_id IS NOT NULL;

CREATE TABLE noticepilot.general_notice_s2_consumer_receipt (
  receipt_id text PRIMARY KEY CHECK (receipt_id ~ '^gns2rec_[0-9a-f]{32}$'),
  schema_version text NOT NULL CHECK (schema_version = 'noticepilot.generalNoticeS2ConsumerReceipt.v0.1'),
  idempotency_key char(64) NOT NULL UNIQUE CHECK (idempotency_key ~ '^[0-9a-f]{64}$'),
  producer_batch_id text NOT NULL,
  producer_manifest_digest char(64) NOT NULL CHECK (producer_manifest_digest ~ '^[0-9a-f]{64}$'),
  producer_receipt_digest char(64) CHECK (producer_receipt_digest IS NULL OR producer_receipt_digest ~ '^[0-9a-f]{64}$'),
  normalized_notice_digests jsonb NOT NULL CHECK (jsonb_typeof(normalized_notice_digests) = 'array'),
  contract_versions jsonb NOT NULL CHECK (jsonb_typeof(contract_versions) = 'object'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL
);

CREATE TABLE noticepilot.general_notice_s2_reconciliation_outcome (
  outcome_id text PRIMARY KEY CHECK (outcome_id ~ '^gns2out_[0-9a-f]{32}$'),
  receipt_id text NOT NULL REFERENCES noticepilot.general_notice_s2_consumer_receipt(receipt_id),
  candidate_id text NOT NULL REFERENCES noticepilot.calendar_event_candidate(candidate_id),
  disposition text NOT NULL CHECK (disposition IN ('created_new_event','requires_review','baseline_match_evidence')),
  calendar_event_id text REFERENCES noticepilot.calendar_event(calendar_event_id),
  baseline_calendar_event_id text,
  reconciliation_evidence jsonb NOT NULL CHECK (jsonb_typeof(reconciliation_evidence) = 'object'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL,
  CONSTRAINT general_notice_s2_outcome_receipt_candidate_unique
    UNIQUE (receipt_id, candidate_id),
  CHECK (
    (disposition = 'created_new_event' AND calendar_event_id IS NOT NULL AND baseline_calendar_event_id IS NULL)
    OR (disposition = 'requires_review' AND calendar_event_id IS NULL)
    OR (disposition = 'baseline_match_evidence' AND calendar_event_id IS NULL AND baseline_calendar_event_id IS NOT NULL)
  )
);

CREATE INDEX general_notice_s2_outcome_event_idx
  ON noticepilot.general_notice_s2_reconciliation_outcome(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

CREATE FUNCTION noticepilot.reject_general_notice_s2_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'general notice S2 history is immutable';
END;
$$;

CREATE TRIGGER general_notice_s2_receipt_immutable
BEFORE UPDATE OR DELETE ON noticepilot.general_notice_s2_consumer_receipt
FOR EACH ROW EXECUTE FUNCTION noticepilot.reject_general_notice_s2_history_mutation();

CREATE TRIGGER general_notice_s2_outcome_immutable
BEFORE UPDATE OR DELETE ON noticepilot.general_notice_s2_reconciliation_outcome
FOR EACH ROW EXECUTE FUNCTION noticepilot.reject_general_notice_s2_history_mutation();

COMMIT;
