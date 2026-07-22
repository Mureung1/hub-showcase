-- ============================================================
--  V2 — 로컬 검증용 시드 (김서준 페르소나 + 백엔드 직군 공고 8건)
--
--  ⚠️ 크롤링 아님. 실제 데이터 확보 방식(공식 API/제휴/공공데이터) 확정 전
--     임시 시드다 (기획서 8장 · 2주차 태스크 A-1). 직군은 BACKEND 하나로 좁혔다.
--
--  로그인: seojun@hub.dev / test1234
--  요구조건은 evaluator 가 실제 발화하도록 type/subject/threshold/necessity 를 채웠다.
--  weight 는 공고별 합이 1.0 이 되도록 명시(추정 대신 수동값). 화면에 그대로 표시된다.
-- ============================================================

-- ── 1. 김서준 계정 ─────────────────────────────────────────
INSERT INTO users (email, password_hash, name) VALUES
    ('seojun@hub.dev', '$2b$10$D2kU6yGh8hSOVwFbMCHrFe/vjoaPIwa6eyxpd2a98mrZqlyrVzISy', '김서준')
ON CONFLICT (email) DO NOTHING;

-- ── 2. 이력 (subject = 정규화 id, depth = 관여 깊이) ────────
WITH u AS (SELECT id FROM users WHERE email = 'seojun@hub.dev')
INSERT INTO credentials (user_id, type, title, detail, subject, depth, started_on, ended_on)
SELECT u.id, v.type, v.title, v.detail, v.subject, v.depth, v.started_on, v.ended_on
FROM u, (VALUES
    ('CAREER'::varchar, '백엔드 개발 · 카카오페이',
       'Python 기반 결제·정산 백엔드. 일 300만 건 정산 배치 운영. 핀테크 도메인.',
       'python'::varchar, 'OWNED'::varchar, DATE '2021-03-01', NULL::date),
    ('CAREER', '결제 인프라 · 라인',
       'AWS EKS 운영, 대용량 트랜잭션 처리, Kafka 메시징, PostgreSQL 튜닝.',
       'aws', 'USED', DATE '2019-01-01', DATE '2021-02-28'),
    ('CERTIFICATE', '정보처리기사', '한국산업인력공단 발급',
       'ipe', 'USED', DATE '2020-05-01', NULL),
    ('COMPANY', '카카오페이', '핀테크 · 50-100인 규모',
       NULL, 'USED', DATE '2021-03-01', NULL),
    ('PORTFOLIO', '이력 매칭 사이드프로젝트',
       'Next.js + Spring Boot, pgvector 기반 적합도 매칭 엔진 구현.',
       NULL, 'USED', DATE '2024-01-01', NULL)
) AS v(type, title, detail, subject, depth, started_on, ended_on);

-- ── 3. 공고 8건 (BACKEND) ─────────────────────────────────
INSERT INTO job_postings (company, title, job_category, location, experience, source_url, raw_content) VALUES
    ('토스',     '백엔드 엔지니어 (핀테크 정산)',   'BACKEND', '서울 강남', '3~7년',  'https://seed.hub.dev/toss-settlement',   '핀테크 정산 시스템 백엔드. Python, 대용량 트랜잭션, AWS 운영 경험 우대. 정보처리기사 우대.'),
    ('카카오페이','결제 플랫폼 백엔드',              'BACKEND', '서울 판교', '3년 이상','https://seed.hub.dev/kakaopay-payment',  '결제 플랫폼 백엔드. Python 3년 이상 필수, AWS 운영, 핀테크 도메인 경험, 팀 협업.'),
    ('네이버',   '검색 플랫폼 백엔드 (Java)',        'BACKEND', '성남',     '5년 이상','https://seed.hub.dev/naver-search',      'Java 5년 이상 필수. Spring Boot, Kafka 기반 대용량 검색 플랫폼.'),
    ('우아한형제들','주문 백엔드 (Kubernetes)',       'BACKEND', '서울 송파', '3~8년',  'https://seed.hub.dev/baemin-order',      'Python 백엔드. Kubernetes 설계·운영 경험 필수. AWS.'),
    ('당근',     '백엔드 개발자',                    'BACKEND', '서울 서초', '3년 이상','https://seed.hub.dev/daangn-backend',    'Python, PostgreSQL, 대용량 트래픽 처리 경험.'),
    ('쿠팡',     '물류 백엔드 (Go)',                 'BACKEND', '서울',     '3년 이상','https://seed.hub.dev/coupang-logistics', 'Go 3년 이상 필수. Kubernetes 필수, AWS.'),
    ('리디',     '서버 개발 (팀 리드)',              'BACKEND', '서울 강남', '5년 이상','https://seed.hub.dev/ridi-lead',         'Python 5년 이상. 팀 리딩 경험 필수. AWS.'),
    ('스타트업A','풀스택 주니어 백엔드',             'BACKEND', '서울',     '1년 이상','https://seed.hub.dev/startup-junior',    'Python 1년 이상. React 경험 우대. 성장 의지.')
ON CONFLICT (source_url) DO NOTHING;

-- ── 4. 요구조건 (공고별 weight 합 = 1.0) ──────────────────
INSERT INTO job_requirements (posting_id, name, necessity, weight, type, subject, threshold)
SELECT p.id, r.name, r.necessity, r.weight, r.type, r.subject, r.threshold
FROM job_postings p
JOIN (VALUES
    -- 토스 (김서준 강점: python·정산·aws·ipe → 상위권 예상)
    ('https://seed.hub.dev/toss-settlement', 'Python 3년 이상',      'REQUIRED'::varchar, 0.35::numeric, 'EXPERIENCE_YEARS'::varchar, 'python'::varchar, 3.0::numeric),
    ('https://seed.hub.dev/toss-settlement', '대용량 트랜잭션 처리',  'REQUIRED', 0.25, 'SKILL_USE',        NULL,   NULL),
    ('https://seed.hub.dev/toss-settlement', 'AWS 운영 경험',        'PREFERRED',0.20, 'SKILL_USE',        'aws',  NULL),
    ('https://seed.hub.dev/toss-settlement', '정보처리기사',          'PREFERRED',0.10, 'CERTIFICATION',    'ipe',  NULL),
    ('https://seed.hub.dev/toss-settlement', '핀테크 도메인 경험',    'PREFERRED',0.10, 'DOMAIN',           NULL,   NULL),

    -- 카카오페이 (python 필수·핀테크·aws → 상위권)
    ('https://seed.hub.dev/kakaopay-payment', 'Python 3년 이상',     'REQUIRED', 0.40, 'EXPERIENCE_YEARS', 'python', 3.0),
    ('https://seed.hub.dev/kakaopay-payment', 'AWS 운영 경험',       'PREFERRED',0.25, 'SKILL_USE',        'aws',    NULL),
    ('https://seed.hub.dev/kakaopay-payment', '핀테크 도메인 경험',   'PREFERRED',0.20, 'DOMAIN',           NULL,     NULL),
    ('https://seed.hub.dev/kakaopay-payment', '팀 협업/커뮤니케이션', 'PREFERRED',0.15, 'SOFT',             NULL,     NULL),

    -- 네이버 (Java 필수 → 김서준 java 경력 0, 게이트로 하락)
    ('https://seed.hub.dev/naver-search', 'Java 5년 이상',   'REQUIRED', 0.45, 'EXPERIENCE_YEARS', 'java',        5.0),
    ('https://seed.hub.dev/naver-search', 'Spring Boot',     'REQUIRED', 0.30, 'SKILL_USE',        'spring-boot', NULL),
    ('https://seed.hub.dev/naver-search', 'Kafka',           'PREFERRED',0.25, 'SKILL_USE',        'kafka',       NULL),

    -- 배민 (Kubernetes 필수 → 김서준 부분충족)
    ('https://seed.hub.dev/baemin-order', 'Python 3년 이상',       'REQUIRED', 0.35, 'EXPERIENCE_YEARS', 'python',     3.0),
    ('https://seed.hub.dev/baemin-order', 'Kubernetes 설계 경험',   'REQUIRED', 0.40, 'SKILL_USE',        'kubernetes', NULL),
    ('https://seed.hub.dev/baemin-order', 'AWS 운영 경험',         'PREFERRED',0.25, 'SKILL_USE',        'aws',        NULL),

    -- 당근 (python·postgresql·대용량 → 상위권)
    ('https://seed.hub.dev/daangn-backend', 'Python 3년 이상',     'REQUIRED', 0.40, 'EXPERIENCE_YEARS', 'python',     3.0),
    ('https://seed.hub.dev/daangn-backend', 'PostgreSQL',         'PREFERRED',0.30, 'SKILL_USE',        'postgresql', NULL),
    ('https://seed.hub.dev/daangn-backend', '대용량 트래픽 처리',   'PREFERRED',0.30, 'SKILL_USE',        NULL,         NULL),

    -- 쿠팡 (Go 필수 → 김서준 go 경력 0, 게이트로 대폭 하락)
    ('https://seed.hub.dev/coupang-logistics', 'Go 3년 이상',      'REQUIRED', 0.45, 'EXPERIENCE_YEARS', 'go',         3.0),
    ('https://seed.hub.dev/coupang-logistics', 'Kubernetes',       'REQUIRED', 0.35, 'SKILL_USE',        'kubernetes', NULL),
    ('https://seed.hub.dev/coupang-logistics', 'AWS 운영 경험',    'PREFERRED',0.20, 'SKILL_USE',        'aws',        NULL),

    -- 리디 (팀 리딩 필수 SOFT → stub NONE=0, 게이트로 하락)
    ('https://seed.hub.dev/ridi-lead', 'Python 5년 이상',   'REQUIRED', 0.35, 'EXPERIENCE_YEARS', 'python', 5.0),
    ('https://seed.hub.dev/ridi-lead', '팀 리딩 경험',       'REQUIRED', 0.40, 'SOFT',             NULL,     NULL),
    ('https://seed.hub.dev/ridi-lead', 'AWS 운영 경험',      'PREFERRED',0.25, 'SKILL_USE',        'aws',    NULL),

    -- 스타트업A (문턱 낮음: python 1년 → 김서준 5년 만점 → 최상위 예상)
    ('https://seed.hub.dev/startup-junior', 'Python 1년 이상', 'REQUIRED', 0.60, 'EXPERIENCE_YEARS', 'python', 1.0),
    ('https://seed.hub.dev/startup-junior', 'React 경험',      'PREFERRED',0.25, 'SKILL_USE',        'react',  NULL),
    ('https://seed.hub.dev/startup-junior', '성장 의지',       'PREFERRED',0.15, 'SOFT',             NULL,     NULL)
) AS r(url, name, necessity, weight, type, subject, threshold)
    ON p.source_url = r.url;
