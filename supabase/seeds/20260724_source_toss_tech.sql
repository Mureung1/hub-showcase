-- 수집 source: 토스테크.
-- source는 스키마가 아니라 데이터이므로 migration이 아닌 seed로 관리한다.
-- docs/plan/engineering/content-pipeline.md 19장(source 등록 체크리스트),
-- docs/notes/2026-07-15-content-source-selection.md 참조.
--
-- 멱등: feed_url이 이미 있으면 다시 넣지 않는다.
--   psql "$DATABASE_URL" -f supabase/seeds/20260724_source_toss_tech.sql
--
-- feed 검증(2026-07-24): bozo=false, rss20, 20건.
-- published_at·summary는 존재한다. author가 없지만 선택 필드라 수집 대상에는 영향이 없다.

insert into public.sources (
  name, homepage_url, feed_url, source_type, collection_method,
  trust_level, perspective_type, language, default_exposure, active,
  source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
)
select
  '토스테크',
  'https://toss.tech/',
  'https://toss.tech/rss.xml',
  'official_blog', 'rss',
  'high', 'vendor_view', 'ko', 'primary', true,
  0.70, 'low',
  'blog', 'summary', 7
where not exists (
  select 1 from public.sources
  where feed_url = 'https://toss.tech/rss.xml'
);

-- source 관심사는 모든 수집 글에 상속되므로 일관된 'IT·개발'만 좁게 등록한다.
insert into public.source_interests (source_id, interest_id, weight)
select s.id, i.id, 1.0
from public.sources s
join public.interests i on i.name = 'IT·개발'
where s.feed_url = 'https://toss.tech/rss.xml'
on conflict (source_id, interest_id) do nothing;
