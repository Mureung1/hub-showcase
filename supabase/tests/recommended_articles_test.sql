begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'recommend-a@example.test',
  now(),
  now()
);

-- 테스트에 쓸 관심사 하나(첫 active 관심사)를 고정한다.
-- content_interest_tags fixture에서 반복 사용한다.
do $$
declare
  v_interest_id uuid;
begin
  select id into v_interest_id from public.interests where launch_status = 'active' order by display_order limit 1;
  perform set_config('test.interest_id', v_interest_id::text, true);
end $$;

insert into public.user_interests (user_id, interest_id)
values (
  '10000000-0000-0000-0000-000000000001',
  current_setting('test.interest_id')::uuid
);

-- 정상 source: high trust, primary
insert into public.sources (
  id, name, source_type, collection_method, trust_level, perspective_type,
  default_exposure, active, source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
) values (
  '30000000-0000-0000-0000-000000000001', '정상 소스', 'news', 'rss', 'high', 'media_view',
  'primary', true, 0.7, 'low',
  'article', 'summary', 5
);

-- low trust source
insert into public.sources (
  id, name, source_type, collection_method, trust_level, perspective_type,
  default_exposure, active, source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
) values (
  '30000000-0000-0000-0000-000000000002', '저신뢰 소스', 'news', 'rss', 'low', 'media_view',
  'primary', true, 0.7, 'low',
  'article', 'summary', 5
);

-- optional exposure source
insert into public.sources (
  id, name, source_type, collection_method, trust_level, perspective_type,
  default_exposure, active, source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
) values (
  '30000000-0000-0000-0000-000000000003', '옵셔널 소스', 'news', 'rss', 'high', 'media_view',
  'optional', true, 0.7, 'low',
  'article', 'summary', 5
);

-- 정렬 확인용 eligible article 3개.
-- 0001, 0002는 published_at을 완전히 동일하게 두어 article_id 오름차순 tie-break를 검증한다.
insert into public.articles (
  id, source_id, title, canonical_url, published_at, content_type, source_type,
  quality_score, access_type, url_status
) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '글 1', 'https://example.com/1', '2026-07-15T00:00:00Z', 'article', 'news', 0.7, 'free', 'active'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '글 2', 'https://example.com/2', '2026-07-15T00:00:00Z', 'article', 'news', 0.7, 'free', 'active'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '글 3', 'https://example.com/3', null, 'article', 'news', 0.7, 'free', 'active');

-- 제외 조건 fixture 6개.
insert into public.articles (
  id, source_id, title, canonical_url, published_at, content_type, source_type,
  quality_score, access_type, url_status
) values
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', 'partial_free 글', 'https://example.com/11', now(), 'article', 'news', 0.7, 'partial_free', 'active'),
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000002', '저신뢰 소스 글', 'https://example.com/12', now(), 'article', 'news', 0.7, 'free', 'active'),
  ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000003', '옵셔널 소스 글', 'https://example.com/13', now(), 'article', 'news', 0.7, 'free', 'active'),
  ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000001', '깨진 링크 글', 'https://example.com/14', now(), 'article', 'news', 0.7, 'free', 'broken'),
  ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000001', '품질 미달 글', 'https://example.com/15', now(), 'article', 'news', 0.64, 'free', 'active'),
  ('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000001', '완료한 글', 'https://example.com/16', now(), 'article', 'news', 0.7, 'free', 'active');

insert into public.content_interest_tags (content_id, interest_id, confidence, tagging_method)
select id, current_setting('test.interest_id')::uuid, 1.0, 'admin'
from public.articles
where id in (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000011',
  '40000000-0000-0000-0000-000000000012',
  '40000000-0000-0000-0000-000000000013',
  '40000000-0000-0000-0000-000000000014',
  '40000000-0000-0000-0000-000000000015',
  '40000000-0000-0000-0000-000000000016'
);

insert into public.mission_records (
  user_id, article_id, mission_type, mission_prompt, user_answer, anchor_type
) values (
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000016',
  'connection',
  '내 상황이나 프로젝트와 연결해보면?',
  '이미 완료했다.',
  'whole_content'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3)),
  3,
  'three eligible articles returned'
);

select is(
  (select recency_score from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3)
   where article_id = '40000000-0000-0000-0000-000000000003'),
  0.1::numeric,
  'null published_at gets 0.1 recency'
);

select results_eq(
  $$ select article_id from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 3) $$,
  $$ values
       ('40000000-0000-0000-0000-000000000001'::uuid),
       ('40000000-0000-0000-0000-000000000002'::uuid),
       ('40000000-0000-0000-0000-000000000003'::uuid)
  $$,
  'ties are deterministic by published_at then article_id'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000011'),
  0,
  'partial_free excluded'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000012'),
  0,
  'low trust source excluded'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000013'),
  0,
  'non-primary exposure excluded'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000014'),
  0,
  'broken url excluded'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000015'),
  0,
  'below quality threshold excluded'
);

select is(
  (select count(*)::integer from public.get_recommended_articles('10000000-0000-0000-0000-000000000001', 20)
   where article_id = '40000000-0000-0000-0000-000000000016'),
  0,
  'completed article excluded'
);

select * from finish();
rollback;
