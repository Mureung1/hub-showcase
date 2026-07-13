CREATE TABLE certification (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(200) NOT NULL,
    issuer  VARCHAR(200)
);

CREATE TABLE certification_mention (
    id                   BIGSERIAL PRIMARY KEY,
    certification_id     BIGINT NOT NULL REFERENCES certification (id) ON DELETE CASCADE,
    job_title            VARCHAR(100) NOT NULL,
    total_posting_count  INT NOT NULL DEFAULT 0,
    mention_count        INT NOT NULL DEFAULT 0,
    UNIQUE (certification_id, job_title)
);
CREATE INDEX idx_certification_mention_job_title ON certification_mention (job_title);
