-- 목표 직무 아홉 종을 기준 데이터로 넣는다.
-- 직무 판정이 아홉 중 하나를 고르는 문제이므로 후보 전량이 테이블에 있어야 한다.
-- 분석은 backend 만 수행한다. 나머지는 is_active 가 거짓이라 화면 선택지에 나타나지 않는다.
-- 활성화는 Phase 28 EXT-01 에서 다룬다.

INSERT INTO job_roles (job_role_id, display_name, description, is_active) VALUES
  ('frontend',      '프론트엔드 개발자', '웹 화면과 클라이언트 상태를 구현하는 직무', false),
  ('ai_engineer',   'AI 엔지니어',       '모델 학습과 서빙, AI 기능 구현을 담당하는 직무', false),
  ('data_engineer', '데이터 엔지니어',   '데이터 수집·파이프라인·분석 저장소를 구축하는 직무', false),
  ('fullstack',     '풀스택 개발자',     '화면과 서버를 함께 구현하는 직무', false),
  ('devops',        'DevOps 엔지니어',   '인프라 구축, 배포 자동화, 운영을 담당하는 직무', false),
  ('mobile',        '모바일 개발자',     'iOS와 안드로이드 앱을 구현하는 직무', false),
  ('security',      '정보보안',          '보안 설계, 점검, 침해 대응을 담당하는 직무', false),
  ('game_client',   '게임 개발자',       '게임 클라이언트와 엔진을 구현하는 직무. 게임 서버는 backend 가 담는다', false)
ON CONFLICT (job_role_id) DO NOTHING;
