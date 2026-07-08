CREATE TABLE project (
    id               BIGSERIAL PRIMARY KEY,
    owner            VARCHAR(100) NOT NULL,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    last_analyzed_at TIMESTAMP,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (owner, name)
);

CREATE TABLE commit_log (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    sha          VARCHAR(64) NOT NULL,
    author       VARCHAR(100),
    message      TEXT,
    additions    INT NOT NULL DEFAULT 0,
    deletions    INT NOT NULL DEFAULT 0,
    change_type  VARCHAR(20) CHECK (change_type IN ('FEATURE', 'FIX', 'REFACTOR', 'DOCS', 'TEST', 'CONFIG')),
    committed_at TIMESTAMP NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (project_id, sha)
);
CREATE INDEX idx_commit_log_project_committed_at ON commit_log (project_id, committed_at);

CREATE TABLE issue_log (
    id            BIGSERIAL PRIMARY KEY,
    project_id    BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    issue_number  INT NOT NULL,
    title         VARCHAR(300),
    state         VARCHAR(20) NOT NULL CHECK (state IN ('OPEN', 'CLOSED')),
    labels        VARCHAR(200),
    created_at_gh TIMESTAMP,
    closed_at_gh  TIMESTAMP,
    UNIQUE (project_id, issue_number)
);
CREATE INDEX idx_issue_log_project_state ON issue_log (project_id, state);

CREATE TABLE doc_status (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    file_path           VARCHAR(300) NOT NULL,
    last_code_change_at TIMESTAMP,
    last_doc_update_at  TIMESTAMP,
    staleness_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
    UNIQUE (project_id, file_path)
);

CREATE TABLE priority_score (
    id                      BIGSERIAL PRIMARY KEY,
    project_id              BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    score                   NUMERIC(6, 2) NOT NULL,
    commit_frequency_factor NUMERIC(6, 2),
    open_issue_factor       NUMERIC(6, 2),
    doc_staleness_factor    NUMERIC(6, 2),
    computed_at             TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_priority_score_project_computed_at ON priority_score (project_id, computed_at DESC);

CREATE TABLE agent_run (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    run_type    VARCHAR(20) NOT NULL CHECK (run_type IN ('COLLECT', 'CLASSIFY', 'SCORE', 'SUGGEST')),
    started_at  TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status      VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED'))
);
CREATE INDEX idx_agent_run_project_started_at ON agent_run (project_id, started_at DESC);

CREATE TABLE doc_suggestion (
    id                BIGSERIAL PRIMARY KEY,
    project_id        BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    file_path         VARCHAR(300) NOT NULL,
    suggested_content TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    applied           BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (project_id, file_path) REFERENCES doc_status (project_id, file_path) ON DELETE CASCADE
);
CREATE INDEX idx_doc_suggestion_project_file_path ON doc_suggestion (project_id, file_path);
