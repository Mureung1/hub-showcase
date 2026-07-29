-- 직무 아홉 종을 전부 활성화한다.
-- 0011 이 backend 외 여덟 종을 is_active = false 로 넣어 화면 선택지에서 빠져 있었다.
-- 데모 시드가 아홉 직무 전량의 분석 산출물을 채우므로(CONTRACT 2장) 선택지도 아홉이다.
-- 명시적으로 아홉 id 를 나열해, 뒤에 새 직무가 들어와도 이 migration 이 켜지 않게 한다.

UPDATE job_roles
   SET is_active = true
 WHERE job_role_id IN (
   'backend',
   'frontend',
   'ai_engineer',
   'data_engineer',
   'fullstack',
   'devops',
   'mobile',
   'security',
   'game_client'
 );
