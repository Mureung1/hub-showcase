-- RSS 수집 파이프라인용 소스 수집 설정 컬럼.
-- 코드 SourceProfile registry를 두지 않고 sources 행에서 읽는다.
-- docs/plan/engineering/content-pipeline.md 4장 "sources 수집 설정 컬럼" 참조.
--
-- 적용 전제: 이 마이그레이션 시점에 sources가 0행이라 NOT NULL을 바로 건다.
-- 행이 있으면 nullable 추가 → source별 backfill → NOT NULL/check 순서로 바꿔야 한다.

alter table sources
  add column content_type text not null
    check (content_type in ('article', 'blog', 'video')),
  add column excerpt_field text not null
    check (excerpt_field in ('summary', 'description', 'none')),
  add column default_reading_time_minutes integer not null
    check (default_reading_time_minutes between 1 and 60);

comment on column sources.content_type is 'articles.content_type 도메인. 이 소스의 글을 저장할 기본 콘텐츠 유형';
comment on column sources.excerpt_field is '저장을 허용한 feed 공식 소개문 필드 (summary/description/none)';
comment on column sources.default_reading_time_minutes is 'feed에 유효한 읽기 시간이 없을 때의 소스 기본값';
