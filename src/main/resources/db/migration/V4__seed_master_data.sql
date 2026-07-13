-- ============================================================
--  V4 — 시드 데이터
--
--  주의: 여기에는 크롤링한 실제 공고를 넣지 않는다.
--        스키마는 내 창작물이지만 수집한 공고 본문은 아니다.
--        로컬 실행과 테스트에 필요한 최소한의 가짜 데이터만 둔다.
-- ============================================================


-- ------------------------------------------------------------
--  직무 분류
-- ------------------------------------------------------------
INSERT INTO job_categories (id, name, parent_id, depth) VALUES
    (1, '개발',        NULL, 0),
    (2, '백엔드',      1,    1),
    (3, '프론트엔드',  1,    1),
    (4, '풀스택',      1,    1),
    (5, '데이터',      1,    1),
    (6, '인프라/플랫폼', 1,  1);


-- ------------------------------------------------------------
--  스킬 마스터
-- ------------------------------------------------------------
INSERT INTO skills (id, name, category) VALUES
    (1,  'Java',        'LANGUAGE'),
    (2,  'Spring Boot', 'FRAMEWORK'),
    (3,  'JPA',         'FRAMEWORK'),
    (4,  'MySQL',       'DB'),
    (5,  'Redis',       'DB'),
    (6,  'React',       'FRAMEWORK'),
    (7,  'TypeScript',  'LANGUAGE'),
    (8,  'Git',         'TOOL'),
    (9,  'Kafka',       'INFRA'),
    (10, 'Kubernetes',  'INFRA'),
    (11, 'Kotlin',      'LANGUAGE'),
    (12, 'Docker',      'INFRA');

-- 표기 흔들림 흡수. 이게 없으면 "스프링부트"와 "Spring Boot"가 영원히 안 만난다.
INSERT INTO skill_aliases (skill_id, alias) VALUES
    (1,  '자바'),         (1,  'java'),
    (2,  '스프링부트'),    (2,  'SpringBoot'),   (2, 'spring-boot'),
    (3,  '하이버네이트'),  (3,  'Hibernate'),
    (4,  '마이에스큐엘'),  (4,  'mysql'),
    (5,  '레디스'),       (5,  'redis'),
    (6,  '리액트'),       (6,  'react.js'),     (6, 'ReactJS'),
    (7,  '타입스크립트'),  (7,  'TS'),
    (9,  '카프카'),
    (10, '쿠버네티스'),    (10, 'k8s'),
    (12, '도커');


-- ------------------------------------------------------------
--  자격증 / 학교 / 전공
-- ------------------------------------------------------------
INSERT INTO certifications (id, name, issuer, category) VALUES
    (1, '정보처리기사',      '한국산업인력공단', 'IT'),
    (2, 'SQLD',             '한국데이터산업진흥원', 'IT'),
    (3, 'AWS SAA',          'Amazon', 'IT'),
    (4, 'TOEIC',            'ETS', '어학');

INSERT INTO schools (id, name, region) VALUES
    (1, '전남대학교', '광주'),
    (2, '테스트대학교', '서울');

INSERT INTO majors (id, name, category) VALUES
    (1, '컴퓨터공학', '공학'),
    (2, '소프트웨어학', '공학'),
    (3, '경영학', '상경');


-- ------------------------------------------------------------
--  가짜 회사 / 공고  (로컬 실행용)
-- ------------------------------------------------------------
INSERT INTO companies (id, name, industry, size) VALUES
    (1, '샘플컴퍼니A', 'IT', 'LARGE'),
    (2, '샘플컴퍼니B', 'IT', 'MID'),
    (3, '샘플컴퍼니C', 'IT', 'STARTUP');

INSERT INTO job_postings
    (id, company_id, job_category_id, title, career_level, min_years, location,
     source_site, apply_url, content_hash, status, expires_at)
VALUES
    (1, 1, 2, '백엔드 엔지니어 (신입)',  'NEWCOMER', 0, '서울',
     'sample', 'https://example.com/apply/1', SHA2('sample-posting-1', 256), 'OPEN', NOW() + INTERVAL 30 DAY),
    (2, 2, 4, '풀스택 개발자',           'JUNIOR',   1, '서울',
     'sample', 'https://example.com/apply/2', SHA2('sample-posting-2', 256), 'OPEN', NOW() + INTERVAL 30 DAY),
    (3, 3, 6, '플랫폼 엔지니어',          'MID',      4, '경기',
     'sample', 'https://example.com/apply/3', SHA2('sample-posting-3', 256), 'OPEN', NOW() + INTERVAL 30 DAY);

INSERT INTO posting_skills (posting_id, skill_id, requirement_type, weight) VALUES
    -- 공고 1: 백엔드 신입
    (1, 1, 'REQUIRED',  1.0),   -- Java
    (1, 2, 'REQUIRED',  1.0),   -- Spring Boot
    (1, 4, 'REQUIRED',  0.8),   -- MySQL
    (1, 5, 'PREFERRED', 0.6),   -- Redis
    (1, 8, 'REQUIRED',  0.3),   -- Git — 모두가 요구하므로 IDF가 낮게 나올 것이다
    -- 공고 2: 풀스택
    (2, 1, 'REQUIRED',  1.0),
    (2, 6, 'REQUIRED',  1.0),   -- React
    (2, 7, 'PREFERRED', 0.7),   -- TypeScript
    (2, 11,'PREFERRED', 0.5),   -- Kotlin
    -- 공고 3: 플랫폼 (희소 스킬 위주 — IDF가 높게 나올 것이다)
    (3, 9, 'REQUIRED',  1.0),   -- Kafka
    (3, 10,'REQUIRED',  1.0),   -- Kubernetes
    (3, 5, 'REQUIRED',  0.8),   -- Redis
    (3, 12,'PREFERRED', 0.6);   -- Docker

INSERT INTO posting_certifications (posting_id, certification_id, requirement_type) VALUES
    (1, 1, 'PREFERRED'),   -- 정보처리기사
    (1, 2, 'PREFERRED');   -- SQLD
