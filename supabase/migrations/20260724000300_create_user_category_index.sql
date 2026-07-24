-- Supabase CLI 2.109.1은 CONCURRENTLY를 마이그레이션 파이프라인에서 실행하지 못한다.
-- 인덱스 작업을 별도 마이그레이션으로 격리하고 시간 제한으로 쓰기 잠금을 제한한다.
set lock_timeout = '5s';
set statement_timeout = '5s';

create index insights_category_user_id_idx
on public.insights (category_id, user_id)
where category_id is not null;

reset statement_timeout;
reset lock_timeout;
