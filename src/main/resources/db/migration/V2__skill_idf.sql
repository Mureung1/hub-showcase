-- ============================================================
--  V2 — 스킬 IDF 캐시
--
--  가중치를 손으로 적으면 안 된다. 데이터에서 뽑아야 한다.
--
--  거의 모든 백엔드 공고가 Git을 요구한다. 그래서 Git을 아는 건
--  아무 정보도 주지 않는다. 반면 Kafka를 요구하는 공고는 5%뿐이고,
--  그 5%에 내가 Kafka를 안다면 그건 강한 신호다.
--
--    idf(skill) = ln( 전체_활성공고수 / (1 + 그_스킬_요구공고수) )
--
--  매일 배치로 재계산해 이 컬럼에 캐싱한다.
--  → db/queries/idf_batch.sql
-- ============================================================

ALTER TABLE skills
    ADD COLUMN idf_score      DECIMAL(6,4) NOT NULL DEFAULT 1.0000
        COMMENT '역문서빈도 — 희소할수록 높다. 배치로 갱신' AFTER category,
    ADD COLUMN posting_count  INT          NOT NULL DEFAULT 0
        COMMENT '이 스킬을 요구하는 활성 공고 수' AFTER idf_score,
    ADD COLUMN idf_updated_at DATETIME(6)  NULL AFTER posting_count;

-- IDF 내림차순 조회용 (변별력 높은 스킬 상위 N)
CREATE INDEX idx_skills_idf ON skills (idf_score DESC);
