-- ============================================================
--  지원 전략 가이드용 쿼리
--  ※ 마이그레이션이 아니다.
-- ============================================================


-- ------------------------------------------------------------
--  1. 갭 추출 — "내가 못 덮은 필수 스킬"
-- ------------------------------------------------------------
--  candidate_recall.sql의 matched를 뒤집으면 그대로 갭이 나온다.
--  IDF가 높은 REQUIRED 스킬을 못 덮은 게 가장 치명적이고,
--  그게 곧 자소서에서 반드시 다뤄야 할 지점이다.
SELECT ps.posting_id,
       s.id        AS skill_id,
       s.name      AS skill_name,
       s.idf_score,
       ps.requirement_type,
       CASE
           WHEN ps.requirement_type = 'REQUIRED' AND s.idf_score >= 2.0 THEN 'HIGH'
           WHEN ps.requirement_type = 'REQUIRED'                        THEN 'MEDIUM'
           ELSE 'LOW'
       END AS severity
  FROM posting_skills ps
  JOIN skills s ON s.id = ps.skill_id
 WHERE ps.posting_id IN (:postingIds)
   AND NOT EXISTS (
       SELECT 1 FROM user_skills us
        WHERE us.user_id  = :userId
          AND us.skill_id = ps.skill_id
   )
 ORDER BY ps.posting_id,
          FIELD(ps.requirement_type, 'REQUIRED', 'PREFERRED'),
          s.idf_score DESC;


-- ------------------------------------------------------------
--  2. 강점 추출 — 매칭된 스킬 + 근거 문장
-- ------------------------------------------------------------
--  portfolio_skills.evidence를 끌어와야 "왜 내가 이걸 안다고
--  주장할 수 있는지"의 근거가 자소서에 그대로 들어간다.
SELECT DISTINCT
       s.id        AS skill_id,
       s.name      AS skill_name,
       s.idf_score,
       pfs.evidence,
       pf.title    AS portfolio_title
  FROM posting_skills ps
  JOIN skills s              ON s.id = ps.skill_id
  JOIN user_skills us        ON us.skill_id = ps.skill_id AND us.user_id = :userId
  LEFT JOIN portfolios pf    ON pf.user_id = :userId
  LEFT JOIN portfolio_skills pfs
         ON pfs.portfolio_id = pf.id AND pfs.skill_id = s.id
 WHERE ps.posting_id = :postingId
 ORDER BY s.idf_score DESC
 LIMIT 4;


-- ------------------------------------------------------------
--  3. 랭킹 품질 지표 — 순위별 아웃바운드 CTR
-- ------------------------------------------------------------
--  "몇 등에 놓인 공고가 실제로 클릭되는가" — 랭킹 품질의 유일한 진짜 지표.
--  상위권 CTR이 하위권보다 유의하게 높지 않다면,
--  우리 가중치는 무작위 정렬과 다를 바 없다.
SELECT r.`rank`,
       COUNT(DISTINCT CASE WHEN a.action = 'IMPRESSION'     THEN a.id END) AS impressions,
       COUNT(DISTINCT CASE WHEN a.action = 'OUTBOUND_CLICK' THEN a.id END) AS outbound,
       ROUND(COUNT(DISTINCT CASE WHEN a.action = 'OUTBOUND_CLICK' THEN a.id END)
             / NULLIF(COUNT(DISTINCT CASE WHEN a.action = 'IMPRESSION' THEN a.id END), 0) * 100, 2)
           AS ctr_pct
  FROM recommendations r
  LEFT JOIN user_activities a
         ON a.posting_id = r.posting_id
        AND a.user_id    = r.user_id
        AND a.created_at >= r.created_at
 WHERE r.created_at >= NOW() - INTERVAL 30 DAY
 GROUP BY r.`rank`
 ORDER BY r.`rank`;


-- ------------------------------------------------------------
--  4. 최신 추천 조회 (사용자 화면)
-- ------------------------------------------------------------
SELECT r.`rank`, r.match_score, r.score_breakdown,
       g.strategy_summary, g.strengths, g.gaps, g.cover_letter_outline,
       p.title, p.apply_url, c.name AS company_name
  FROM recommendations r
  JOIN job_postings p        ON p.id = r.posting_id
  JOIN companies    c        ON c.id = p.company_id
  LEFT JOIN application_guides g ON g.recommendation_id = r.id
 WHERE r.run_id = (SELECT id FROM recommendation_runs
                    WHERE user_id = :userId
                    ORDER BY created_at DESC LIMIT 1)
 ORDER BY r.`rank`
 LIMIT 20;
