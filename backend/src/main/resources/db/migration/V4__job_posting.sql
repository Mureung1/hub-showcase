CREATE TABLE job_posting (
    id                            BIGSERIAL PRIMARY KEY,
    recruit_announcement_no      VARCHAR(50) NOT NULL,
    job_title                    VARCHAR(100) NOT NULL,
    title                        VARCHAR(500) NOT NULL,
    institution_name             VARCHAR(200),
    application_qualification    TEXT,
    preference_condition_summary TEXT,
    preference_detail            TEXT,
    ncs_classification           VARCHAR(500),
    ongoing                      BOOLEAN NOT NULL,
    announcement_start_date      DATE,
    announcement_end_date        DATE,
    collected_at                  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (recruit_announcement_no, job_title)
);
CREATE INDEX idx_job_posting_job_title ON job_posting (job_title);
