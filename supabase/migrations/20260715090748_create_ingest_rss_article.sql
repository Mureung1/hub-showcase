-- RSS 수집 파이프라인의 item 단위 저장 RPC.
-- 한 호출이 한 트랜잭션이다. article과 관심사 tag를 원자적으로 저장한다.
-- content_pipeline.md 12장 참조.
--
-- 반환: { "status": "inserted" | "duplicate", "article_id": uuid }
-- 백엔드 secret key(service_role)로만 호출한다. 브라우저/사용자 JWT는 호출 불가.

create or replace function public.ingest_rss_article(
  p_source_id uuid,
  p_article jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_source          public.sources%rowtype;
  v_interest_count  integer;
  v_title           text;
  v_url             text;
  v_author          text;
  v_excerpt         text;
  v_thumbnail       text;
  v_reading_time    integer;
  v_reading_source  text;
  v_quality         numeric;
  v_published_at    timestamptz;
  v_article_id      uuid;
begin
  -- 1. 허용하지 않은 key 거부
  if exists (
    select 1
    from jsonb_object_keys(p_article) as k
    where k not in (
      'title', 'canonical_url', 'published_at', 'author', 'official_excerpt',
      'thumbnail_url', 'reading_time_minutes', 'reading_time_source',
      'quality_score', 'original_url'
    )
  ) then
    raise exception 'INGEST_UNKNOWN_KEY';
  end if;

  -- 2. source 재검증 (파이프라인 앞단과 동일 조건)
  select * into v_source from public.sources where id = p_source_id;
  if not found then
    raise exception 'SOURCE_NOT_FOUND';
  end if;
  if not (
    v_source.active
    and v_source.collection_method = 'rss'
    and v_source.language = 'ko'
    and v_source.default_exposure = 'primary'
    and v_source.trust_level in ('high', 'medium')
    and v_source.paywall_risk = 'low'
  ) then
    raise exception 'SOURCE_NOT_ELIGIBLE';
  end if;

  select count(*) into v_interest_count
  from public.source_interests where source_id = p_source_id;
  if v_interest_count < 1 then
    raise exception 'SOURCE_INTERESTS_EMPTY';
  end if;

  -- 3. 입력 값 재검증
  v_title := btrim(p_article->>'title');
  if v_title is null or v_title = '' then
    raise exception 'INGEST_MISSING_TITLE';
  end if;
  if char_length(v_title) > 300 then
    raise exception 'INGEST_TITLE_TOO_LONG';
  end if;

  v_url := p_article->>'canonical_url';
  if v_url is null or v_url !~* '^https?://' then
    raise exception 'INGEST_INVALID_URL';
  end if;

  v_author := nullif(btrim(p_article->>'author'), '');
  if v_author is not null and char_length(v_author) > 200 then
    raise exception 'INGEST_AUTHOR_TOO_LONG';
  end if;

  v_excerpt := nullif(p_article->>'official_excerpt', '');
  if v_excerpt is not null and char_length(v_excerpt) > 1000 then
    raise exception 'INGEST_EXCERPT_TOO_LONG';
  end if;

  v_thumbnail := nullif(p_article->>'thumbnail_url', '');

  v_reading_time := nullif(p_article->>'reading_time_minutes', '')::integer;
  if v_reading_time is not null and (v_reading_time < 1 or v_reading_time > 60) then
    raise exception 'INGEST_READING_TIME_OUT_OF_RANGE';
  end if;

  v_reading_source := nullif(p_article->>'reading_time_source', '');
  if v_reading_source is not null
     and v_reading_source not in ('source_meta', 'source_default', 'manual') then
    raise exception 'INGEST_INVALID_READING_TIME_SOURCE';
  end if;

  v_quality := nullif(p_article->>'quality_score', '')::numeric;
  if v_quality is null or v_quality < 0 or v_quality > 1 then
    raise exception 'INGEST_QUALITY_OUT_OF_RANGE';
  end if;

  v_published_at := nullif(p_article->>'published_at', '')::timestamptz;

  -- 4. article insert. content_type/source_type은 source에서 가져온다.
  --    나머지(difficulty_level, stance, language, access_type, thumbnail_status,
  --    url_status, created_at)는 DB 기본값을 쓴다. access_type 기본값 'free'는
  --    파이프라인이 free 후보만 RPC로 보내는 것과 일치한다.
  insert into public.articles (
    source_id, title, canonical_url, content_type, source_type,
    published_at, author, official_excerpt, thumbnail_url,
    reading_time_minutes, reading_time_source, quality_score, metadata
  ) values (
    p_source_id, v_title, v_url, v_source.content_type, v_source.source_type,
    v_published_at, v_author, v_excerpt, v_thumbnail,
    v_reading_time, v_reading_source, v_quality,
    jsonb_build_object(
      'ingestion', jsonb_build_object('original_url', p_article->>'original_url')
    )
  )
  on conflict (canonical_url) do nothing
  returning id into v_article_id;

  -- 5. 기존 URL이면 아무것도 갱신하지 않고 duplicate
  if v_article_id is null then
    select id into v_article_id from public.articles where canonical_url = v_url;
    return jsonb_build_object('status', 'duplicate', 'article_id', v_article_id);
  end if;

  -- 6. 신규면 source 관심사를 tag로 복사. 실패하면 article까지 rollback(같은 트랜잭션).
  insert into public.content_interest_tags (content_id, interest_id, confidence, tagging_method)
  select v_article_id, si.interest_id, si.weight, 'source_rule'
  from public.source_interests si
  where si.source_id = p_source_id;

  return jsonb_build_object('status', 'inserted', 'article_id', v_article_id);
end;
$$;

-- 권한: backend secret key(service_role)만 실행한다.
revoke execute on function public.ingest_rss_article(uuid, jsonb) from public;
revoke execute on function public.ingest_rss_article(uuid, jsonb) from anon;
revoke execute on function public.ingest_rss_article(uuid, jsonb) from authenticated;
grant execute on function public.ingest_rss_article(uuid, jsonb) to service_role;
