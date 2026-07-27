-- 반자동 발행(클립보드 복사 + 네이버 새 탭) 후 사용자가 직접 붙여넣는 실제 게시글 URL.
-- 자동 조회(RSS/검색API)가 붙기 전까지는 사용자가 "게시 완료" 시 직접 입력한다.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_url TEXT;
