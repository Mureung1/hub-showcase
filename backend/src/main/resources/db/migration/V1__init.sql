-- ============================================================
--  V1 — 초기 스키마 (단일 소스)
--  기획서 6장 데이터 모델 + 적합도_계산_설계.md 1~7장 정형화 컬럼을 하나로 통합.
--  ⚠️ 기존 V3/V5/V6 는 폐기하고 이 파일 하나만 둔다.
--  네이밍 규칙: 테이블은 전부 복수형. 엔티티 @Table 과 1:1 대응.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 사용자 ────────────────────────────────────────────────
CREATE TABLE users (
    id                      BIGSERIAL PRIMARY KEY,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    password_hash           VARCHAR(100) NOT NULL,   -- BCrypt 해시. 평문 저장 금지
    name                    VARCHAR(100),
    credential_set_version  BIGINT       NOT NULL DEFAULT 1,  -- 이력 변경 시 +1 → 점수 캐시 무효화
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 이력 (자격증 / 포트폴리오 / 경력 / 회사) ───────────────
CREATE TABLE credentials (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(20)  NOT NULL CHECK (type IN ('CAREER','CERTIFICATE','PORTFOLIO','COMPANY')),
    title      VARCHAR(255) NOT NULL,
    detail     TEXT,
    subject    VARCHAR(100),                          -- 정규화된 대상(python, aws...). 매칭 키
    depth      VARCHAR(16)  NOT NULL DEFAULT 'USED'    -- 관여 깊이. SKILL_USE 충족도 곱 계수
               CHECK (depth IN ('MENTIONED','USED','OWNED')),
    started_on DATE,
    ended_on   DATE,                                  -- NULL = 재직/진행 중
    embedding  vector(1536),                          -- 요구조건과의 의미 유사도 계산용 (엔티티 미매핑)
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_credentials_user    ON credentials (user_id);
CREATE INDEX idx_credentials_subject ON credentials (subject);

-- ── 채용 포지션 ───────────────────────────────────────────
CREATE TABLE job_postings (
    id           BIGSERIAL PRIMARY KEY,
    company      VARCHAR(255) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    job_category VARCHAR(50)  NOT NULL,               -- MVP는 'BACKEND' 하나로 좁힌다
    location     VARCHAR(100),
    experience   VARCHAR(50),
    source_url   TEXT         NOT NULL UNIQUE,
    raw_content  TEXT         NOT NULL,               -- 공고 원문
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 요구조건 (LLM 추출 + 코드 정형화) ─────────────────────
CREATE TABLE job_requirements (
    id              BIGSERIAL PRIMARY KEY,
    posting_id      BIGINT       NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    necessity       VARCHAR(16)  NOT NULL DEFAULT 'PREFERRED'   -- REQUIRED=필수(게이트), PREFERRED=우대
                    CHECK (necessity IN ('REQUIRED','PREFERRED')),
    weight          NUMERIC(4,3) CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)),
                    -- NULL 이면 WeightEstimator 가 추정. 값이 있으면 수동 오버라이드
    type            VARCHAR(32)  NOT NULL DEFAULT 'UNCLASSIFIED', -- 충족도 전략 선택 키
    subject         VARCHAR(100),                       -- 정규화된 대상
    threshold       NUMERIC(5,2),                       -- EXPERIENCE_YEARS 요구 연차
    source_position VARCHAR(32)  NOT NULL DEFAULT 'UNKNOWN', -- 공고 내 위치 (가중치 보너스)
    mention_count   INT          NOT NULL DEFAULT 1,    -- 언급 횟수 (가중치 보너스)
    embedding       vector(1536)
);
CREATE INDEX idx_requirements_posting ON job_requirements (posting_id);
CREATE INDEX idx_requirements_subject ON job_requirements (subject);

-- ── 적합도 점수 = (Σ 가중치×충족도) × Π(필수 게이트) ──────
CREATE TABLE match_scores (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                BIGINT   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    posting_id             BIGINT   NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    score                  SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100), -- 게이트 반영 최종 0~100
    weighted_sum           NUMERIC(5,4),               -- 게이트 적용 전 가중합 0~1
    confidence             NUMERIC(4,3),               -- 근거 확보 가중치 비율
    credential_set_version BIGINT,                     -- 캐시 키의 일부
    calculated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_match_score_cache UNIQUE (user_id, posting_id, credential_set_version)
);
CREATE INDEX idx_match_scores_rank ON match_scores (user_id, score DESC);

-- ── 요구조건별 기여도 (F5 "방향 제시" 데이터 소스) ────────
CREATE TABLE match_details (
    id               BIGSERIAL PRIMARY KEY,
    match_score_id   BIGINT        NOT NULL REFERENCES match_scores (id) ON DELETE CASCADE,
    requirement_id   BIGINT,
    requirement_text VARCHAR(500),                     -- 공고 마감/수정돼도 상세가 안 깨지게 복사 저장
    type             VARCHAR(32),
    necessity        VARCHAR(16),
    weight           NUMERIC(5,4),
    fulfillment      NUMERIC(4,3)  NOT NULL CHECK (fulfillment >= 0 AND fulfillment <= 1),
    contribution     NUMERIC(5,4),
    gate             NUMERIC(4,3),                     -- 우대 조건은 항상 1.0
    evidence         VARCHAR(1000),
    note             VARCHAR(200)
);
CREATE INDEX idx_match_details_score ON match_details (match_score_id);

-- ── AI 생성 문서 (비동기 잡) ──────────────────────────────
CREATE TABLE generated_docs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    posting_id    BIGINT      NOT NULL REFERENCES job_postings (id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL CHECK (type IN ('RESUME','COVER_LETTER')),
    status        VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','RUNNING','DONE','FAILED')),
    content       TEXT,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_user_posting ON generated_docs (user_id, posting_id);

-- ── 정규화 사전 · 대체 규칙 · 미분류 큐 (stub 구현체가 읽는다) ─
CREATE TABLE subject_aliases (
    alias      VARCHAR(200) PRIMARY KEY,
    subject_id VARCHAR(100) NOT NULL
);

CREATE TABLE subject_substitutions (
    held     VARCHAR(100) NOT NULL,   -- 보유 자격/학위
    required VARCHAR(100) NOT NULL,   -- 요구 자격/학위
    PRIMARY KEY (held, required)
);

CREATE TABLE unclassified_terms (
    id          BIGSERIAL PRIMARY KEY,
    raw_term    VARCHAR(200) NOT NULL UNIQUE,
    occurrences INT NOT NULL DEFAULT 1,
    resolved_at TIMESTAMPTZ
);

-- ── 골든셋 (정밀도 측정 — 적합도_계산_설계.md 6장) ─────────
CREATE TABLE golden_labels (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    posting_id BIGINT NOT NULL,
    label      VARCHAR(8) NOT NULL CHECK (label IN ('HIGH','MID','LOW')),
    labeled_by VARCHAR(100),
    labeled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, posting_id)
);

-- ── 이력 변경 → 버전 증가 → 점수 캐시 자동 무효화 ─────────
CREATE OR REPLACE FUNCTION bump_credential_version() RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET credential_set_version = credential_set_version + 1
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credential_version
AFTER INSERT OR UPDATE OR DELETE ON credentials
FOR EACH ROW EXECUTE FUNCTION bump_credential_version();

-- ── 초기 사전 시드 (백엔드 직군) ──────────────────────────
INSERT INTO subject_aliases (alias, subject_id) VALUES
    ('python','python'), ('파이썬','python'), ('py3','python'),
    ('java','java'), ('자바','java'),
    ('spring boot','spring-boot'), ('스프링부트','spring-boot'), ('스프링 부트','spring-boot'),
    ('aws','aws'), ('amazon web services','aws'),
    ('postgresql','postgresql'), ('postgres','postgresql'),
    ('kafka','kafka'), ('카프카','kafka'),
    ('kubernetes','kubernetes'), ('k8s','kubernetes'), ('쿠버네티스','kubernetes'),
    ('정보처리기사','ipe'), ('정보관리기술사','ipe-master')
ON CONFLICT DO NOTHING;

INSERT INTO subject_substitutions (held, required) VALUES
    ('ipe-master','ipe')
ON CONFLICT DO NOTHING;
