begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(4);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000031', 'semantic-owner@example.com'),
  ('00000000-0000-4000-8000-000000000032', 'semantic-other@example.com');

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  memo
) values
  (
    '10000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000031',
    'https://semantic.example/hash-one',
    'https://semantic.example/hash-one',
    'semantic.example',
    'ab',
    'c:d'
  ),
  (
    '10000000-0000-4000-8000-000000000032',
    '00000000-0000-4000-8000-000000000031',
    'https://semantic.example/hash-two',
    'https://semantic.example/hash-two',
    'semantic.example',
    'ab:c',
    'd'
  );

create temporary table semantic_job_state as
select count(distinct source_hash) as distinct_hash_count
from public.insight_embedding_jobs
where insight_id in (
  '10000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000032'
);

delete from public.insight_embedding_jobs
where insight_id = '10000000-0000-4000-8000-000000000031';

update public.insights
set category = '카테고리만 변경'
where id = '10000000-0000-4000-8000-000000000031';

create temporary table semantic_category_state as
select count(*) as category_job_count
from public.insight_embedding_jobs
where insight_id = '10000000-0000-4000-8000-000000000031';

update public.insights
set memo = '변경된 메모'
where id = '10000000-0000-4000-8000-000000000031';

select extensions.ok(
  (
    select distinct_hash_count = 2
    from semantic_job_state
  )
  and (
    select category_job_count = 0
    from semantic_category_state
  )
  and exists(
    select 1
    from public.insight_embedding_jobs
    where insight_id = '10000000-0000-4000-8000-000000000031'
  ),
  '제목·메모만 충돌하지 않는 해시의 재색인 작업을 만든다'
);

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  updated_at
)
select
  ('20000000-0000-4000-8000-' || lpad(sequence::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000031',
  'https://semantic.example/relevant-' || sequence,
  'https://semantic.example/relevant-' || sequence,
  'semantic.example',
  '관련 인사이트 ' || sequence,
  timestamptz '2026-07-29 00:00:00+00' + sequence * interval '1 minute'
from generate_series(1, 7) as sequence;

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  updated_at
) values
  (
    '20000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000031',
    'https://semantic.example/below-threshold',
    'https://semantic.example/below-threshold',
    'semantic.example',
    '관련도 기준 미달',
    '2026-07-29 00:08:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000032',
    'https://semantic.example/other-user',
    'https://semantic.example/other-user',
    'semantic.example',
    '다른 사용자 관련 인사이트',
    '2026-07-29 00:09:00+00'
  );

insert into public.insight_embeddings (
  insight_id,
  user_id,
  embedding,
  model_id,
  projection_version,
  source_hash
)
select
  insight.id,
  insight.user_id,
  case
    when insight.id = '20000000-0000-4000-8000-000000000008'
      then (
        array[-1::real] || array_fill(0::real, array[767])
      )::extensions.vector
    else (
      array[1::real] || array_fill(0::real, array[767])
    )::extensions.vector
  end,
  'gemini-embedding-2',
  1,
  repeat('a', 64)
from public.insights as insight
where insight.id between
  '20000000-0000-4000-8000-000000000001'
  and '20000000-0000-4000-8000-000000000009';

select extensions.results_eq(
  $$
    select insight_id
    from public.match_insight_embeddings(
      '00000000-0000-4000-8000-000000000031',
      (
        array[1::real] || array_fill(0::real, array[767])
      )::extensions.vector,
      0.59,
      'gemini-embedding-2',
      1
    )
  $$,
  $$
    select (
      '20000000-0000-4000-8000-' || lpad(sequence::text, 12, '0')
    )::uuid
    from generate_series(7, 1, -1) as sequence
  $$,
  '자신의 관련 인사이트를 기준과 최신순에 따라 개수 제한 없이 반환한다'
);

select extensions.ok(
  (
    select bool_and(
      not has_function_privilege(checked_role, function_oid, 'execute')
    )
    from unnest(array['anon', 'authenticated']) as checked_role
    cross join unnest(array[
      'public.enqueue_insight_embedding()'::regprocedure::oid,
      'public.list_pending_insight_embeddings(uuid,text,smallint,integer)'::regprocedure::oid,
      'public.complete_insight_embedding_job(uuid,uuid,extensions.vector,text,smallint,text)'::regprocedure::oid,
      'public.match_insight_embeddings(uuid,extensions.vector,real,text,smallint)'::regprocedure::oid,
      'public.reserve_embedding_usage(bigint)'::regprocedure::oid,
      'public.reconcile_embedding_usage(uuid,text,bigint)'::regprocedure::oid
    ]) as function_oid
  ),
  '브라우저 역할은 서버 전용 함수를 실행할 수 없다'
);

create temporary table semantic_reservation_results (
  sequence integer primary key,
  reservation_id uuid
);

insert into semantic_reservation_results (sequence, reservation_id)
values
  (1, public.reserve_embedding_usage(20000000)),
  (2, public.reserve_embedding_usage(6000000));

select extensions.ok(
  (
    select reservation_id is not null
    from semantic_reservation_results
    where sequence = 1
  )
  and (
    select reservation_id is null
    from semantic_reservation_results
    where sequence = 2
  ),
  '첫 예약 뒤 월 한도를 넘기는 두 번째 예약은 거부한다'
);

select * from extensions.finish();
rollback;
