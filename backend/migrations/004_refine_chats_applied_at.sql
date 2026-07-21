-- 리파인 가안이 실제로 검증결과에 적용됐는지 추적. 미적용 가안만 "적용" 버튼을 보여줄 수 있게 한다.
ALTER TABLE refine_chats ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
