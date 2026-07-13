-- ============================================================
--  V1 — 초기 스키마
--
--  설계 축:
--   1) 사람과 공고를 같은 좌표계(skills / certifications)에 올린다
--      → user_skills와 posting_skills가 같은 skill_id를 참조해야
--        매칭이 조인 한 번으로 끝난다
--   2) 추천 결과는 계산해서 저장한다 (재현 가능 + 조회 빠름)
--   3) 사용자 행동 로그가 있어야 추천이 개선된다
-- ============================================================


-- ------------------------------------------------------------
--  마스터 / 택소노미 — 매칭의 공통 언어
-- ------------------------------------------------------------

-- 스킬 마스터. canonical_id로 대표 스킬을 가리켜 표기 흔들림을 흡수한다.
CREATE TABLE skills (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    name          VARCHAR(80)  NOT NULL,
    category      VARCHAR(40)  NOT NULL COMMENT 'LANGUAGE / FRAMEWORK / DB / INFRA / TOOL / SOFT',
    canonical_id  BIGINT       NULL     COMMENT 'NULL이면 자기 자신이 대표',
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_skills_name (name),
    CONSTRAINT fk_skills_canonical FOREIGN KEY (canonical_id) REFERENCES skills(id)
) ENGINE=InnoDB;

-- "스프링부트", "springboot", "Spring-Boot" → 전부 같은 skill_id로 정규화.
-- 이게 없으면 유저 포트폴리오의 "스프링부트"와 공고의 "Spring Boot"가
-- 영원히 매칭되지 않는다.
CREATE TABLE skill_aliases (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    skill_id  BIGINT      NOT NULL,
    alias     VARCHAR(80) NOT NULL,
    UNIQUE KEY uk_skill_aliases_alias (alias),
    KEY idx_skill_aliases_skill (skill_id),
    CONSTRAINT fk_skill_aliases_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 직무 분류 (자기참조 트리: 개발 > 백엔드 > Java 백엔드)
CREATE TABLE job_categories (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(60) NOT NULL,
    parent_id  BIGINT      NULL,
    depth      TINYINT     NOT NULL DEFAULT 0,
    CONSTRAINT fk_job_categories_parent FOREIGN KEY (parent_id) REFERENCES job_categories(id)
) ENGINE=InnoDB;

CREATE TABLE certifications (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    issuer    VARCHAR(80)  NULL,
    category  VARCHAR(40)  NULL COMMENT 'IT / 어학 / 금융 ...',
    UNIQUE KEY uk_certifications_name (name)
) ENGINE=InnoDB;

CREATE TABLE schools (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(80) NOT NULL,
    region  VARCHAR(40) NULL,
    UNIQUE KEY uk_schools_name (name)
) ENGINE=InnoDB;

CREATE TABLE majors (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(80) NOT NULL,
    category  VARCHAR(40) NULL COMMENT '공학 / 상경 / 인문 ...',
    UNIQUE KEY uk_majors_name (name)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
--  회원 / 프로필 — 추천의 입력
-- ------------------------------------------------------------

CREATE TABLE users (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    email          VARCHAR(160) NOT NULL,
    password_hash  VARCHAR(100) NULL COMMENT '소셜 로그인만 쓰면 NULL',
    nickname       VARCHAR(40)  NOT NULL,
    status         ENUM('ACTIVE','DORMANT','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

-- users와 1:1. profile_version이 올라가면 재추천 트리거로 쓴다.
CREATE TABLE user_profiles (
    user_id            BIGINT PRIMARY KEY,
    school_id          BIGINT      NULL,
    major_id           BIGINT      NULL,
    graduation_year    SMALLINT    NULL,
    career_level       ENUM('STUDENT','NEWCOMER','JUNIOR','MID') NOT NULL DEFAULT 'NEWCOMER',
    desired_locations  JSON        NULL COMMENT '["서울","경기"] — 필터가 아니라 가중치로 쓴다',
    summary            TEXT        NULL COMMENT '자기소개 원문 — AI가 스킬을 추출하는 소스',
    profile_version    INT         NOT NULL DEFAULT 1,
    updated_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_profiles_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_profiles_school FOREIGN KEY (school_id) REFERENCES schools(id),
    CONSTRAINT fk_user_profiles_major  FOREIGN KEY (major_id)  REFERENCES majors(id)
) ENGINE=InnoDB;

CREATE TABLE user_certifications (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id           BIGINT      NOT NULL,
    certification_id  BIGINT      NOT NULL,
    acquired_at       DATE        NULL,
    score             VARCHAR(20) NULL COMMENT '토익 900 같은 점수형 자격증',
    UNIQUE KEY uk_user_cert (user_id, certification_id),
    CONSTRAINT fk_user_cert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_cert_cert FOREIGN KEY (certification_id) REFERENCES certifications(id)
) ENGINE=InnoDB;

CREATE TABLE portfolios (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT       NOT NULL,
    title        VARCHAR(120) NOT NULL,
    description  TEXT         NULL COMMENT 'AI가 스킬을 추출하는 원문',
    repo_url     VARCHAR(300) NULL,
    demo_url     VARCHAR(300) NULL,
    my_role      VARCHAR(120) NULL,
    started_on   DATE         NULL,
    ended_on     DATE         NULL,
    analyzed_at  DATETIME(6)  NULL COMMENT 'NULL이면 아직 스킬 추출 전',
    KEY idx_portfolios_user (user_id),
    CONSTRAINT fk_portfolios_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 포트폴리오 원문에서 추출된 스킬. evidence가 나중에 자소서 가이드의 근거가 된다.
CREATE TABLE portfolio_skills (
    portfolio_id  BIGINT       NOT NULL,
    skill_id      BIGINT       NOT NULL,
    weight        DECIMAL(4,3) NOT NULL DEFAULT 1.000 COMMENT '이 프로젝트에서의 비중',
    evidence      VARCHAR(255) NULL COMMENT '"Redis 분산 락으로 중복 배차 방지" 같은 근거 문장',
    PRIMARY KEY (portfolio_id, skill_id),
    KEY idx_portfolio_skills_skill (skill_id),
    CONSTRAINT fk_pf_skills_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    CONSTRAINT fk_pf_skills_skill     FOREIGN KEY (skill_id)     REFERENCES skills(id)
) ENGINE=InnoDB;

-- 유저의 최종 스킬 벡터. 자기입력 + 포트폴리오 + 자격증을 집계해 만든다.
-- 매칭 쿼리는 이 테이블만 보면 되므로 조인이 얕아진다.
CREATE TABLE user_skills (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    skill_id    BIGINT       NOT NULL,
    level       TINYINT      NOT NULL DEFAULT 1 COMMENT '1~5',
    source      ENUM('SELF','PORTFOLIO','CERTIFICATION','AI_INFERRED') NOT NULL,
    confidence  DECIMAL(4,3) NOT NULL DEFAULT 1.000 COMMENT 'AI 추론일수록 낮게',
    updated_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_skill (user_id, skill_id, source),
    KEY idx_user_skills_skill (skill_id),
    CONSTRAINT fk_user_skills_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
--  채용 공고 — 추천의 후보군
-- ------------------------------------------------------------

CREATE TABLE companies (
    id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    name      VARCHAR(120) NOT NULL,
    industry  VARCHAR(60)  NULL,
    size      ENUM('STARTUP','SME','MID','LARGE','PUBLIC') NULL,
    logo_url  VARCHAR(300) NULL,
    UNIQUE KEY uk_companies_name (name)
) ENGINE=InnoDB;

CREATE TABLE job_postings (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id       BIGINT       NOT NULL,
    job_category_id  BIGINT       NULL,
    title            VARCHAR(200) NOT NULL,
    description      MEDIUMTEXT   NULL,
    career_level     ENUM('INTERN','NEWCOMER','JUNIOR','MID','SENIOR','ANY') NOT NULL DEFAULT 'ANY',
    min_years        TINYINT      NULL,
    employment_type  ENUM('FULL_TIME','CONTRACT','INTERN') NOT NULL DEFAULT 'FULL_TIME',
    location         VARCHAR(80)  NULL,
    salary_min       INT          NULL,
    salary_max       INT          NULL,
    source_site      VARCHAR(40)  NULL COMMENT '사람인 / 잡코리아 / 원티드 ...',
    source_url       VARCHAR(500) NULL,
    content_hash     CHAR(64)     NOT NULL COMMENT '사이트 간 중복 공고 제거 (SHA-256)',
    posted_at        DATETIME(6)  NULL,
    expires_at       DATETIME(6)  NULL,
    status           ENUM('OPEN','CLOSED','EXPIRED') NOT NULL DEFAULT 'OPEN',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_postings_hash (content_hash),
    KEY idx_postings_open (status, expires_at) COMMENT '후보군 조회의 시작점',
    KEY idx_postings_category (job_category_id, career_level),
    CONSTRAINT fk_postings_company  FOREIGN KEY (company_id)      REFERENCES companies(id),
    CONSTRAINT fk_postings_category FOREIGN KEY (job_category_id) REFERENCES job_categories(id)
) ENGINE=InnoDB;

-- 공고가 요구하는 스킬. user_skills와 같은 skill_id를 보므로 곧바로 교집합이 계산된다.
CREATE TABLE posting_skills (
    posting_id        BIGINT       NOT NULL,
    skill_id          BIGINT       NOT NULL,
    requirement_type  ENUM('REQUIRED','PREFERRED') NOT NULL DEFAULT 'REQUIRED',
    weight            DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    PRIMARY KEY (posting_id, skill_id),
    KEY idx_posting_skills_skill (skill_id) COMMENT '역방향: 이 스킬을 원하는 공고들',
    CONSTRAINT fk_posting_skills_posting FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
    CONSTRAINT fk_posting_skills_skill   FOREIGN KEY (skill_id)   REFERENCES skills(id)
) ENGINE=InnoDB;

CREATE TABLE posting_certifications (
    posting_id        BIGINT NOT NULL,
    certification_id  BIGINT NOT NULL,
    requirement_type  ENUM('REQUIRED','PREFERRED') NOT NULL DEFAULT 'PREFERRED',
    PRIMARY KEY (posting_id, certification_id),
    CONSTRAINT fk_posting_cert_posting FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
    CONSTRAINT fk_posting_cert_cert    FOREIGN KEY (certification_id) REFERENCES certifications(id)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
--  추천 결과 — 계산해서 저장한다
-- ------------------------------------------------------------

-- 추천 1회 실행 단위.
-- model_version과 profile_hash를 남겨야 "왜 이 순위였는지" 재현할 수 있다.
CREATE TABLE recommendation_runs (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id        BIGINT      NOT NULL,
    model_version  VARCHAR(40) NOT NULL COMMENT '"v1-heuristic-idf"',
    profile_hash   CHAR(64)    NOT NULL COMMENT '프로필이 그대로면 재계산 스킵',
    candidate_cnt  INT         NOT NULL DEFAULT 0,
    created_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_runs_user_created (user_id, created_at DESC),
    CONSTRAINT fk_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 화면에 줄 세워 보여줄 최종 랭킹.
CREATE TABLE recommendations (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    run_id           BIGINT       NOT NULL,
    user_id          BIGINT       NOT NULL COMMENT '조회 편의상 비정규화',
    posting_id       BIGINT       NOT NULL,
    `rank`           INT          NOT NULL,
    match_score      DECIMAL(5,2) NOT NULL COMMENT '0.00 ~ 100.00 — 확률이 아니라 적합도',
    score_breakdown  JSON         NOT NULL COMMENT '{"skill":41.2,"career":9.3,"gate":0.45}',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_rec_run_posting (run_id, posting_id),
    KEY idx_rec_user_rank (user_id, run_id, `rank`),
    CONSTRAINT fk_rec_run     FOREIGN KEY (run_id)     REFERENCES recommendation_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_posting FOREIGN KEY (posting_id) REFERENCES job_postings(id)
) ENGINE=InnoDB;

-- UI 근거 칩. 설명 가능한 추천의 근거.
CREATE TABLE recommendation_reasons (
    id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
    recommendation_id  BIGINT       NOT NULL,
    reason_type        ENUM('SKILL','CERTIFICATION','MAJOR','CAREER','PORTFOLIO','LOCATION') NOT NULL,
    skill_id           BIGINT       NULL,
    message            VARCHAR(120) NOT NULL,
    contribution       DECIMAL(5,2) NOT NULL COMMENT '이 근거가 점수에 기여한 값',
    KEY idx_reasons_rec (recommendation_id),
    CONSTRAINT fk_reasons_rec   FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
    CONSTRAINT fk_reasons_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
) ENGINE=InnoDB;


-- ------------------------------------------------------------
--  사용자 행동 — 추천을 개선하는 학습 신호
-- ------------------------------------------------------------
-- 이 테이블이 없으면 추천은 영원히 첫 버전에 머문다.
-- 지금 안 쓰더라도 처음부터 쌓아야 한다. 나중에 만들면 데이터가 0부터 시작한다.
CREATE TABLE user_activities (
    id                 BIGINT      PRIMARY KEY AUTO_INCREMENT,
    user_id            BIGINT      NOT NULL,
    posting_id         BIGINT      NOT NULL,
    recommendation_id  BIGINT      NULL COMMENT '추천을 통해 들어왔는지 추적',
    action             ENUM('IMPRESSION','CLICK','BOOKMARK','HIDE','LIKE','DISLIKE') NOT NULL,
    created_at         DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_activities_user_action (user_id, action, created_at DESC),
    KEY idx_activities_posting (posting_id),
    CONSTRAINT fk_act_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_posting FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
