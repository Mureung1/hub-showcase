-- 수집 source: DEVOCEAN.
-- source는 스키마가 아니라 데이터이므로 migration이 아닌 seed로 관리한다.
-- docs/plan/engineering/content-pipeline.md 19장(source 등록 체크리스트)을 따른다.
--
-- 멱등: feed_url이 이미 있으면 다시 넣지 않는다.
--   psql "$DATABASE_URL" -f supabase/seeds/20260724_source_devocean.sql
--
-- feed 검증(2026-07-24): bozo=false, rss20, 6건.
-- pubDate는 존재하지만 timezone이 없어 feed_timezone=Asia/Seoul fallback을 사용한다.

insert into public.sources (
  name, homepage_url, feed_url, source_type, collection_method,
  trust_level, perspective_type, language, default_exposure, active,
  source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes, feed_timezone
)
select
  'DEVOCEAN',
  'https://devocean.sk.com/',
  'https://devocean.sk.com/blog/rss.do',
  'expert_article', 'rss',
  'medium', 'practitioner_view', 'ko', 'primary', true,
  0.70, 'low',
  'blog', 'summary', 7, 'Asia/Seoul'
where not exists (
  select 1 from public.sources
  where feed_url = 'https://devocean.sk.com/blog/rss.do'
);

-- source 관심사는 모든 수집 글에 상속되므로 일관된 'IT·개발'만 좁게 등록한다.
insert into public.source_interests (source_id, interest_id, weight)
select s.id, i.id, 1.0
from public.sources s
join public.interests i on i.name = 'IT·개발'
where s.feed_url = 'https://devocean.sk.com/blog/rss.do'
on conflict (source_id, interest_id) do nothing;
