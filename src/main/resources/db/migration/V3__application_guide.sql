-- ============================================================
--  V3 — 지원 대행 제거 → 지원 전략 가이드
--
--  이 서비스는 지원을 받지 않는다.
--  공고를 적합도 순으로 줄 세우고, "어떻게 쓰면 유리한지"를
--  가중치 근거와 함께 알려준 뒤 기업 채용 페이지로 보낸다.
--
--  핵심: 갭 분석은 스코어링의 역함수다.
--    매칭된 고IDF 스킬       → 자소서에서 강조할 것
--    미매칭 REQUIRED 고IDF   → 보완하거나 우회 서술할 것
--  새 AI 호출이 필요 없다. score_breakdown에 이미 다 들어있다.
-- ============================================================


-- ------------------------------------------------------------
--  외부 지원 링크는 이제 필수다
-- ------------------------------------------------------------
ALTER TABLE job_postings
    ADD COLUMN apply_url VARCHAR(500) NULL
        COMMENT '기업 채용 페이지 — 지원은 전부 여기로 나간다' AFTER source_url;

UPDATE job_postings SET apply_url = source_url WHERE apply_url IS NULL;


-- ------------------------------------------------------------
--  APPLY → OUTBOUND_CLICK
-- ------------------------------------------------------------
--  우리는 사용자가 실제로 지원했는지 알 수 없다.
--  아는 건 "외부로 나갔다"뿐이다. 이걸 APPLY라고 부르면
--  나중에 지원 전환율 지표가 전부 거짓말이 된다. 이름을 정직하게 둔다.
--
--  단, 가장 강한 관심 신호이므로 학습 가중치는 제일 높게 준다.
ALTER TABLE user_activities
    MODIFY COLUMN action ENUM(
        'IMPRESSION',      -- 랭킹에 노출됨
        'CLICK',           -- 카드 펼침
        'GUIDE_VIEW',      -- 지원 전략 가이드를 봄
        'BOOKMARK',
        'HIDE',
        'OUTBOUND_CLICK',  -- 기업 채용 페이지로 이동
        'LIKE',
        'DISLIKE'
    ) NOT NULL;


-- ------------------------------------------------------------
--  application_guides — 공고별 지원 전략
-- ------------------------------------------------------------
--  recommendations와 1:1. 추천 계산 시점에 같이 만들어둔다.
CREATE TABLE application_guides (
    id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
    recommendation_id     BIGINT       NOT NULL,

    strengths             JSON         NOT NULL
        COMMENT '강조할 것 — [{"skill":"Redis 분산 락","idf":3.1,"evidence":"런포유 프로젝트"}]',

    gaps                  JSON         NOT NULL
        COMMENT '보완할 것 — [{"skill":"Kafka","idf":3.0,"severity":"HIGH"}]',

    strategy_summary      VARCHAR(300) NOT NULL
        COMMENT '가중치 표를 사람이 읽는 한 문장으로',

    cover_letter_outline  JSON         NULL
        COMMENT '자소서 문단 뼈대. 완성된 글을 생성하지 않는다 — 전원이 같은 자소서를 내게 되므로',

    model_version         VARCHAR(40)  NOT NULL,
    generated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE KEY uk_guide_rec (recommendation_id),
    CONSTRAINT fk_guide_rec FOREIGN KEY (recommendation_id)
        REFERENCES recommendations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
