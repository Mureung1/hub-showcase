-- ============================================================
--  V5 — 관심 공고 북마크 (수직 슬라이스)
--  기존 users / job_postings 위에 얹는다.
-- ============================================================

CREATE TABLE bookmarks (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT      NOT NULL,
    posting_id  BIGINT      NOT NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    -- 같은 유저가 같은 공고를 두 번 저장하지 못하게
    UNIQUE KEY uk_bookmark_user_posting (user_id, posting_id),
    KEY idx_bookmark_user (user_id, created_at DESC),

    CONSTRAINT fk_bookmark_user    FOREIGN KEY (user_id)    REFERENCES users(id)        ON DELETE CASCADE,
    CONSTRAINT fk_bookmark_posting FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Express 슬라이스와 달리 title/company를 복사 저장하지 않는다.
-- 이미 job_postings가 있으므로 조회 시 조인하면 된다 (정규화 유지).
