CREATE TABLE certification_progress (
    id                BIGSERIAL PRIMARY KEY,
    certification_id  BIGINT NOT NULL REFERENCES certification (id) ON DELETE CASCADE,
    status            VARCHAR(20) NOT NULL,
    target_date       DATE,
    memo              VARCHAR(500),
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (certification_id)
);
CREATE INDEX idx_certification_progress_status ON certification_progress (status);
