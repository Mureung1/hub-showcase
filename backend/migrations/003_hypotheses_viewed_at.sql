-- 대시보드의 "검토 전" 방문 표시용. 유지/수정/폐기 판단(status)과는 완전히 별개 값이다.
-- 상세 화면 GET 호출 시 최초 1회 채워지며, 그 뒤엔 "검토 전" 표시를 지우는 데만 쓰인다.
ALTER TABLE hypotheses ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
