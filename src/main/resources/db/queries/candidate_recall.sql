-- ============================================================
--  후보군 리콜 + 스킬 커버리지
--  ※ 마이그레이션이 아니다. Repository가 실행한다.
-- ============================================================
--
--  2단계 랭킹의 1단계.
--  전체 공고를 Java로 끌어오면 죽는다. DB에서 스킬 교집합으로
--  200개까지 좁히고, 무거운 집계(IDF 커버리지)까지 여기서 끝낸다.
--  나머지 컴포넌트와 게이트는 Java에서 — 그쪽이 자주 바뀌므로.
--
--  핵심은 분모다.
--    matched_idf  = 내가 가진 것 중 공고가 요구한 스킬의 IDF 합
--    required_idf = 공고가 요구한 전체 스킬의 IDF 합
--    coverage     = matched / required
--
--  분모 정규화를 빼면 "Java만 요구하는 공고"가 100% 매칭이 되어
--  요구사항이 적은 공고가 무조건 1등을 먹는다.
-- ============================================================

WITH my_skills AS (
    -- 같은 스킬이 SELF / PORTFOLIO / CERTIFICATION 여러 출처로 들어올 수 있다.
    -- skill_id 단위로 가장 신뢰도 높은 것 하나로 접는다.
    SELECT us.skill_id,
           MAX(us.confidence) AS confidence,
           MAX(us.level)      AS level
      FROM user_skills us
     WHERE us.user_id = :userId
     GROUP BY us.skill_id
),
open_postings AS (
    SELECT p.id
      FROM job_postings p
     WHERE p.status = 'OPEN'
       AND (p.expires_at IS NULL OR p.expires_at > NOW())
       AND p.apply_url IS NOT NULL      -- 지원 링크가 없으면 추천할 이유가 없다
),
-- 분모: 공고가 요구한 IDF 총합
required AS (
    SELECT ps.posting_id,
           SUM(s.idf_score * ps.weight
               * CASE ps.requirement_type WHEN 'REQUIRED' THEN 1.0 ELSE 0.5 END) AS required_idf,
           SUM(CASE WHEN ps.requirement_type = 'REQUIRED' THEN 1 ELSE 0 END)     AS required_cnt
      FROM posting_skills ps
      JOIN skills s        ON s.id = ps.skill_id
      JOIN open_postings o ON o.id = ps.posting_id
     GROUP BY ps.posting_id
),
-- 분자: 내가 실제로 덮은 IDF 합
matched AS (
    SELECT ps.posting_id,
           SUM(s.idf_score * ps.weight * m.confidence
               * CASE ps.requirement_type WHEN 'REQUIRED' THEN 1.0 ELSE 0.5 END) AS matched_idf,
           SUM(CASE WHEN ps.requirement_type = 'REQUIRED' THEN 1 ELSE 0 END)     AS matched_required_cnt,
           -- 근거 칩 / 자소서 강조 포인트로 쓸 스킬명 (IDF 높은 순)
           GROUP_CONCAT(s.name ORDER BY s.idf_score DESC SEPARATOR ',')          AS matched_skills
      FROM posting_skills ps
      JOIN skills s        ON s.id = ps.skill_id
      JOIN my_skills m     ON m.skill_id = ps.skill_id
      JOIN open_postings o ON o.id = ps.posting_id
     GROUP BY ps.posting_id
)
SELECT p.id                               AS posting_id,
       p.title,
       p.career_level,
       p.min_years,
       p.location,
       p.job_category_id,
       p.apply_url,
       c.name                             AS company_name,
       r.required_idf,
       r.required_cnt,
       COALESCE(mt.matched_idf, 0)        AS matched_idf,
       COALESCE(mt.matched_required_cnt, 0) AS matched_required_cnt,
       mt.matched_skills,
       LEAST(COALESCE(mt.matched_idf, 0) / NULLIF(r.required_idf, 0), 1.0) AS skill_coverage
  FROM job_postings p
  JOIN companies c   ON c.id = p.company_id
  JOIN required  r   ON r.posting_id = p.id
  LEFT JOIN matched mt ON mt.posting_id = p.id
 WHERE mt.posting_id IS NOT NULL          -- 스킬이 하나도 안 겹치면 후보 제외
 ORDER BY skill_coverage DESC
 LIMIT 200;
