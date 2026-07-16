-- 초기 수집 source: 우아한형제들 기술블로그.
-- source는 스키마가 아니라 데이터이므로 migration이 아닌 seed로 관리한다.
-- content_pipeline.md 19장(source 등록 체크리스트), docs/notes/2026-07-15-content-source-selection.md 참조.
--
-- 멱등: feed_url이 이미 있으면 다시 넣지 않는다. 원격 적용은 사람이 한 번만 실행한다.
--   psql "$DATABASE_URL" -f supabase/seeds/20260716_source_woowahan.sql
--
-- 확정 값(2026-07-16): trust_level=high, source_quality_score=0.70.
--   최종 글 quality_score = 0.70(source) + 0.10(free) + 0.05(meta) = 0.85 (임계 0.65 통과).
-- feed 검증: bozo=false, rss20, 10건, published_parsed·author 모두 존재.

insert into public.sources (
  name, homepage_url, feed_url, source_type, collection_method,
  trust_level, perspective_type, language, default_exposure, active,
  source_quality_score, paywall_risk,
  content_type, excerpt_field, default_reading_time_minutes
)
select
  '우아한형제들 기술블로그',
  'https://techblog.woowahan.com/',
  'https://techblog.woowahan.com/feed/',
  'official_blog', 'rss',
  'high', 'vendor_view', 'ko', 'primary', true,
  0.70, 'low',
  'blog', 'summary', 7
where not exists (
  select 1 from public.sources
  where feed_url = 'https://techblog.woowahan.com/feed/'
);

-- source_interests: 현재 taxonomy에 존재하는 관심사만 매핑한다.
-- 'IT·개발'만 등록한다. ('디자인·UX·제품'은 interests에 아직 없음 — 추가되면 여기서 매핑)
-- 관심사는 수집 글 전체에 상속되므로 좁게 시작한다.
insert into public.source_interests (source_id, interest_id, weight)
select s.id, i.id, 1.0
from public.sources s
join public.interests i on i.name = 'IT·개발'
where s.feed_url = 'https://techblog.woowahan.com/feed/'
on conflict (source_id, interest_id) do nothing;
