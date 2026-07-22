-- 공유 URL용 추측 불가 토큰. 기존 id 컬럼들과 동일하게 uuid_generate_v4()로 자동 생성해
-- 별도 "링크 생성" 엔드포인트 없이 프로젝트 생성 시점부터 항상 존재하게 한다.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT uuid_generate_v4()::text;

-- 이미 만들어진 기존 프로젝트에도 토큰을 채워 넣는다(DEFAULT는 신규 INSERT에만 적용되므로).
UPDATE projects SET share_token = uuid_generate_v4()::text WHERE share_token IS NULL;
