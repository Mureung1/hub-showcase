-- 기획서 6장 데이터 모델
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 이력 (자격증 / 포트폴리오 / 경력 / 회사)
CREATE TABLE credentials (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('CAREER', 'CERTIFICATE', 'PORTFOLIO', 'COMPANY')),
    title      VARCHAR(255) NOT NULL,
    detail     TEXT,
    started_on DATE,
    ended_on   DATE,                      -- NULL = 재직/진행 중
    embedding  vector(1536),              -- 요구조건과의 의미 유사도 계산용
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credentials_user ON credentials (user_id);

-- 채용 포지션
CREATE TABLE job_postings (
    id           BIGSERIAL PRIMARY KEY,
    company      VARCHAR(255) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    job_category VARCHAR(50)  NOT NULL,   -- MVP는 'BACKEND' 하나로 좁힌다
    location     VARCHAR(100),
    experience   VARCHAR(50),
    source_url   TEXT         NOT NULL UNIQUE,
    raw_content  TEXT         NOT NULL,   -- 공고 원문
    collected_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- LLM이 공고 원문에서 뽑아낸 요구조건
CREATE TABLE job_requirements (
    id         BIGSERIAL PRIMARY KEY,
    posting_id BIGINT       NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    required   BOOLEAN      NOT NULL DEFAULT true,   -- false = 우대
    weight     NUMERIC(4, 3) NOT NULL,               -- 0.000 ~ 1.000
    embedding  vector(1536),
    CONSTRAINT weight_range CHECK (weight >= 0 AND weight <= 1)
);
CREATE INDEX idx_requirements_posting ON job_requirements (posting_id);

-- 적합도 점수 = Σ(가중치 × 충족도)
CREATE TABLE match_scores (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    posting_id   BIGINT   NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    score        SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, posting_id)
);
CREATE INDEX idx_match_user_score ON match_scores (user_id, score DESC);

-- 요구조건별 충족도 (포지션 상세의 "근거" 화면이 이걸 읽는다)
CREATE TABLE match_details (
    id             BIGSERIAL PRIMARY KEY,
    match_score_id BIGINT       NOT NULL REFERENCES match_scores (id) ON DELETE CASCADE,
    requirement_id BIGINT       NOT NULL REFERENCES job_requirements (id) ON DELETE CASCADE,
    fulfillment    NUMERIC(4, 3) NOT NULL,           -- 0.000 ~ 1.000
    evidence       TEXT,                              -- 충족도 판단 근거 문장
    CONSTRAINT fulfillment_range CHECK (fulfillment >= 0 AND fulfillment <= 1)
);
CREATE INDEX idx_match_details_score ON match_details (match_score_id);

-- AI 생성 문서 (비동기 잡)
CREATE TABLE generated_docs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    posting_id   BIGINT      NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    type         VARCHAR(20) NOT NULL CHECK (type IN ('RESUME', 'COVER_LETTER')),
    status       VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED')),
    content      TEXT,
    error_message TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_user_posting ON generated_docs (user_id, posting_id);
