-- ============================================================
--  IDF 배치 — 매일 새벽 1회
--  ※ 마이그레이션이 아니다. 스케줄러가 실행한다.
--     (Flyway가 실행하지 않도록 db/queries/ 아래 둔다)
-- ============================================================
--
--    idf = ln( 전체_활성공고수 / (1 + 해당스킬_요구공고수) )
--
--  예시 (공고 10,000건 기준)
--    Git         9,500건 요구 → ln(10000/9501) ≈ 0.05  → 거의 무의미
--    Spring Boot 2,000건      → ln(10000/2001) ≈ 1.61
--    Kafka         500건      → ln(10000/501)  ≈ 3.00  → 강한 변별 신호
--
--  GREATEST(..., 0.05)로 하한을 두는 이유:
--  IDF가 0이 되면 "그 스킬이 매칭됐다"는 사실 자체가 분자에서 사라진다.
--  변별력이 없는 것과 존재하지 않는 것은 다르다.
-- ============================================================

UPDATE skills s
LEFT JOIN (
    SELECT ps.skill_id, COUNT(DISTINCT ps.posting_id) AS cnt
      FROM posting_skills ps
      JOIN job_postings p ON p.id = ps.posting_id
     WHERE p.status = 'OPEN'
       AND (p.expires_at IS NULL OR p.expires_at > NOW())
     GROUP BY ps.skill_id
) c ON c.skill_id = s.id
CROSS JOIN (
    SELECT COUNT(*) AS total
      FROM job_postings
     WHERE status = 'OPEN'
       AND (expires_at IS NULL OR expires_at > NOW())
) t
SET s.posting_count  = COALESCE(c.cnt, 0),
    s.idf_score      = GREATEST(LN(t.total / (1 + COALESCE(c.cnt, 0))), 0.05),
    s.idf_updated_at = NOW(6);


-- 배치 후 확인용 --------------------------------------------

-- 변별력이 높은 스킬 (희소)
-- SELECT name, posting_count, idf_score FROM skills ORDER BY idf_score DESC LIMIT 20;

-- 변별력이 없는 스킬 (모두가 요구) — Git이 여기 있어야 정상이다
-- SELECT name, posting_count, idf_score FROM skills ORDER BY idf_score ASC LIMIT 20;
