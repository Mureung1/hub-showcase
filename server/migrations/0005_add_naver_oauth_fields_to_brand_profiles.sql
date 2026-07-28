-- 네이버 로그인(OAuth) 결과 저장. blog_id는 0004에서 이미 추가됨.
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS naver_id TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS blog_id_confirmed BOOLEAN NOT NULL DEFAULT false;
