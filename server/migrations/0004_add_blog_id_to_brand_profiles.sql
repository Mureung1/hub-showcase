-- 네이버 로그인 자동화(Playwright)로 조회했거나, 실패 시 사용자가 직접 입력한 blogId.
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS blog_id TEXT;
