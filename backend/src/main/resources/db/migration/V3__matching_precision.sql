-- 적합도 정밀도 개선. V1(init) 이후에 적용한다.
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 요구조건 정형화 -------------------------------------------------
ALTER TABLE job_requirement
    ADD COLUMN type            VARCHAR(32)  NOT NULL DEFAULT 'UNCLASSIFIED',
    ADD COLUMN subject         VARCHAR(100),
    ADD COLUMN threshold       NUMERIC(5,2),
    ADD COLUMN necessity       VARCHAR(16)  NOT NULL DEFAULT 'PREFERRED',
    ADD COLUMN source_position VARCHAR(32)  NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN mention_count   INT          NOT NULL DEFAULT 1,
    ADD COLUMN embedding       vector(1536);

-- 기존 required 플래그가 있다면 옮긴다 (컬럼명은 V1 에 맞춰 조정)
-- UPDATE job_requirement SET necessity = 'REQUIRED' WHERE required = true;

CREATE INDEX idx_requirement_subject ON job_requirement(subject);

-- 2. 이력 ------------------------------------------------------------
ALTER TABLE credential
    ADD COLUMN subject   VARCHAR(100),
    ADD COLUMN depth     VARCHAR(16) NOT NULL DEFAULT 'USED',
    ADD COLUMN embedding vector(1536);

CREATE INDEX idx_credential_subject ON credential(subject);

ALTER TABLE app_user
    ADD COLUMN credential_set_version BIGINT NOT NULL DEFAULT 1;

-- 이력 변경 → 버전 증가 → 점수 캐시 자동 무효화
CREATE OR REPLACE FUNCTION bump_credential_version() RETURNS TRIGGER AS $$
BEGIN
    UPDATE app_user SET credential_set_version = credential_set_version + 1
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credential_version
AFTER INSERT OR UPDATE OR DELETE ON credential
FOR EACH ROW EXECUTE FUNCTION bump_credential_version();

-- 3. 점수 ------------------------------------------------------------
ALTER TABLE match_score
    ADD COLUMN weighted_sum           NUMERIC(5,4),
    ADD COLUMN confidence             NUMERIC(4,3),
    ADD COLUMN credential_set_version BIGINT,
    ADD COLUMN calculated_at          TIMESTAMPTZ NOT NULL DEFAULT now();

-- 기존 행은 캐시 키가 없으므로 무효화 대상
UPDATE match_score SET credential_set_version = 0 WHERE credential_set_version IS NULL;
ALTER TABLE match_score ALTER COLUMN credential_set_version SET NOT NULL;

ALTER TABLE match_score
    ADD CONSTRAINT uk_match_score_cache UNIQUE (user_id, posting_id, credential_set_version);

CREATE INDEX idx_match_score_rank ON match_score(user_id, score DESC);

ALTER TABLE match_detail
    ADD COLUMN requirement_text VARCHAR(500),
    ADD COLUMN type             VARCHAR(32),
    ADD COLUMN necessity        VARCHAR(16),
    ADD COLUMN weight           NUMERIC(5,4),
    ADD COLUMN contribution     NUMERIC(5,4),
    ADD COLUMN gate             NUMERIC(4,3),
    ADD COLUMN note             VARCHAR(200);

-- 4. 정규화 사전 & 대체 규칙 -------------------------------------------
CREATE TABLE subject_alias (
    alias      VARCHAR(200) PRIMARY KEY,
    subject_id VARCHAR(100) NOT NULL
);

CREATE TABLE subject_substitution (
    held     VARCHAR(100) NOT NULL,
    required VARCHAR(100) NOT NULL,
    PRIMARY KEY (held, required)
);

CREATE TABLE unclassified_term (
    id          BIGSERIAL PRIMARY KEY,
    raw_term    VARCHAR(200) NOT NULL UNIQUE,
    occurrences INT NOT NULL DEFAULT 1,
    resolved_at TIMESTAMPTZ
);

-- 5. 골든셋: 측정 없이는 개선 여부를 알 수 없다 -------------------------
CREATE TABLE golden_label (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    posting_id BIGINT NOT NULL,
    label      VARCHAR(8) NOT NULL CHECK (label IN ('HIGH','MID','LOW')),
    labeled_by VARCHAR(100),
    labeled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, posting_id)
);

-- 초기 사전 시드 (백엔드 직군 예시)
INSERT INTO subject_alias (alias, subject_id) VALUES
    ('python','python'), ('파이썬','python'), ('py3','python'),
    ('java','java'), ('자바','java'),
    ('spring boot','spring-boot'), ('스프링부트','spring-boot'), ('스프링 부트','spring-boot'),
    ('aws','aws'), ('amazon web services','aws'),
    ('postgresql','postgresql'), ('postgres','postgresql'),
    ('정보처리기사','ipe'), ('정보관리기술사','ipe-master')
ON CONFLICT DO NOTHING;

INSERT INTO subject_substitution (held, required) VALUES
    ('ipe-master','ipe'),
    ('master','bachelor'), ('doctor','master'), ('doctor','bachelor')
ON CONFLICT DO NOTHING;
