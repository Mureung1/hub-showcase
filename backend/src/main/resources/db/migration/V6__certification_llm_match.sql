CREATE TABLE certification_llm_match (
    id                BIGSERIAL PRIMARY KEY,
    job_posting_id    BIGINT NOT NULL REFERENCES job_posting (id) ON DELETE CASCADE,
    certification_id  BIGINT NOT NULL REFERENCES certification (id) ON DELETE CASCADE,
    mention_field     VARCHAR(20) NOT NULL,
    UNIQUE (job_posting_id, certification_id)
);
