-- 수집 source: 카카오테크.
-- source는 스키마가 아니라 데이터이므로 migration이 아닌 seed로 관리한다.
-- docs/plan/engineering/content-pipeline.md 19장(source 등록 체크리스트),
-- docs/notes/2026-07-15-content-source-selection.md 참조.
--
-- 멱등: feed_url이 이미 있으면 다시 넣지 않는다.
--   psql "$DATABASE_URL" -f supabase/seeds/20260724_source_kakao_tech.sql
--
-- feed 검증(2026-07-24): bozo=false, rss20, 10건.
-- published_at·summary·author가 모두 존재하며 별도 source 보정은 필요하지 않다.

insert into public.sources (
  name, homepage_url, feed_url, source_type, collection_method,
  trust_level, perspective_type, language, default_exposure, active,
  source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
)
select
  '카카오테크',
  'https://tech.kakao.com/',
  'https://tech.kakao.com/feed/',
  'official_blog', 'rss',
  'high', 'vendor_view', 'ko', 'primary', true,
  0.70, 'low',
  'blog', 'summary', 7
where not exists (
  select 1 from public.sources
  where feed_url = 'https://tech.kakao.com/feed/'
);

-- source 관심사는 모든 수집 글에 상속되므로 일관된 'IT·개발'만 좁게 등록한다.
insert into public.source_interests (source_id, interest_id, weight)
select s.id, i.id, 1.0
from public.sources s
join public.interests i on i.name = 'IT·개발'
where s.feed_url = 'https://tech.kakao.com/feed/'
on conflict (source_id, interest_id) do nothing;
