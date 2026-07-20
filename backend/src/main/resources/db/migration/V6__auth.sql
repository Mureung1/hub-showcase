-- ============================================================
--  V6 — 회원가입 이메일 인증 + 로그인
--
--  ⚠️ 기존 users 테이블이 이미 있다면, 아래 ALTER 중
--     이미 있는 컬럼은 지우고 실행하세요.
--     (컬럼 확인: SHOW COLUMNS FROM users;)
-- ============================================================


-- ------------------------------------------------------------
--  users — 인증에 필요한 컬럼 보강
-- ------------------------------------------------------------
ALTER TABLE users
    -- BCrypt 해시가 60자, 알고리즘이 바뀔 수 있으니 100 확보.
    -- 평문 비밀번호는 어떤 경우에도 저장하지 않는다.
    ADD COLUMN password_hash   VARCHAR(100) NULL AFTER email,

    -- 이메일 인증을 통과해야 true. false면 로그인을 막는다.
    ADD COLUMN email_verified  BOOLEAN      NOT NULL DEFAULT FALSE AFTER password_hash,

    ADD COLUMN verified_at     DATETIME(6)  NULL AFTER email_verified;


-- ------------------------------------------------------------
--  email_verifications — 발송한 인증코드
-- ------------------------------------------------------------
--  가입 전(=users 행이 아직 없음)에도 코드를 보내야 하므로
--  user_id가 아니라 email을 키로 잡는다.
CREATE TABLE email_verifications (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    email        VARCHAR(160) NOT NULL,

    -- 코드도 평문으로 두지 않는다. DB가 유출되면 그대로 인증 통과가 되므로
    -- 해시만 저장하고, 원본은 메일로만 나간다.
    code_hash    VARCHAR(100) NOT NULL,

    expires_at   DATETIME(6)  NOT NULL COMMENT '발송 후 5분',
    verified_at  DATETIME(6)  NULL     COMMENT 'NULL이면 아직 미인증',
    attempt_count TINYINT     NOT NULL DEFAULT 0 COMMENT '5회 초과 시 폐기 — 무차별 대입 방지',
    created_at   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    KEY idx_verif_email (email, created_at DESC),
    KEY idx_verif_expires (expires_at) COMMENT '만료분 정리 배치용'
) ENGINE=InnoDB;
