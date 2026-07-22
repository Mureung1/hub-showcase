-- 임시저장/저장하기 상태. 프로젝트 생성 시 기본은 초안(draft).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS save_status TEXT DEFAULT 'draft'; -- 'draft' / 'saved'
