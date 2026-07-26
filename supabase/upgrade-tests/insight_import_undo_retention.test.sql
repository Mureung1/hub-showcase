begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(4);

select extensions.results_eq(
  $$
    select
      undo_expires_at = completed_at + interval '24 hours',
      undo_expires_at > now()
    from public.insight_import_jobs
    where id = '40000000-0000-4000-8000-000000000081'
  $$,
  $$ values (true, true) $$,
  '24시간 이내 완료 작업에 기존 완료 시각 기준 Undo 만료를 부여한다'
);

select extensions.results_eq(
  $$
    select
      job_id,
      user_id,
      created_insight_id,
      imported_updated_at is not null
    from public.insight_import_undo_items
    order by created_insight_id nulls last
  $$,
  $$
    values (
      '40000000-0000-4000-8000-000000000081'::uuid,
      '00000000-0000-4000-8000-000000000081'::uuid,
      '30000000-0000-4000-8000-000000000081'::uuid,
      true
    ),
    (
      '40000000-0000-4000-8000-000000000081'::uuid,
      '00000000-0000-4000-8000-000000000081'::uuid,
      null::uuid,
      true
    )
  $$,
  '24시간 이내 완료 작업만 최소 되돌리기 원장으로 이관한다'
);

select extensions.results_eq(
  $$
    select id, undo_expires_at is null
    from public.insight_import_jobs
    where id in (
      '40000000-0000-4000-8000-000000000082',
      '40000000-0000-4000-8000-000000000083'
    )
    order by id
  $$,
  $$
    values
      ('40000000-0000-4000-8000-000000000082'::uuid, true),
      ('40000000-0000-4000-8000-000000000083'::uuid, true)
  $$,
  '오래된 완료 작업과 되돌림 작업에는 Undo 권한을 만들지 않는다'
);

select extensions.is(
  (
    select count(*)::bigint
    from public.insight_import_items
    where job_id in (
      '40000000-0000-4000-8000-000000000081',
      '40000000-0000-4000-8000-000000000082',
      '40000000-0000-4000-8000-000000000083'
    )
  ),
  0::bigint,
  '기존 완료·되돌림 작업의 원본 후보 데이터를 모두 삭제한다'
);

select * from extensions.finish();
rollback;
