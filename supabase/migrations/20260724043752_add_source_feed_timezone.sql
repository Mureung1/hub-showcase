-- RSS 날짜에 timezone 정보가 없는 source의 fallback timezone.
-- 현재 확인된 예외는 DEVOCEAN의 Asia/Seoul뿐이다.
alter table public.sources
add column feed_timezone text
check (feed_timezone is null or feed_timezone = 'Asia/Seoul');

comment on column public.sources.feed_timezone is
'RSS 날짜에 timezone이 없을 때만 적용하는 IANA timezone. 현재 Asia/Seoul만 허용.';
