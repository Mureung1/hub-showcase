-- ============================================================
-- 0. 기존 객체 제거 (실 사용자 데이터 없음, 참조용 interests 시드만 재생성)
-- ============================================================
drop table if exists mission_records cascade;
drop table if exists reading_events cascade;
drop table if exists article_assignments cascade;
drop table if exists highlights cascade;
drop table if exists article_interests cascade;
drop table if exists articles cascade;
drop table if exists debate_topics cascade;
drop table if exists source_interests cascade;
drop table if exists sources cascade;
drop table if exists user_interests cascade;
drop table if exists interests cascade;
drop type if exists mission_type cascade;
drop type if exists source_type cascade;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. interests (uuid PK로 재생성, 기존 20개 시드 유지)
-- ============================================================
create table interests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order smallint not null unique
);

insert into interests (name, display_order) values
  ('AI', 1),
  ('IT·개발', 2),
  ('커리어·취업', 3),
  ('자기계발', 4),
  ('시사이슈', 5),
  ('경제', 6),
  ('재테크·투자', 7),
  ('창업·스타트업', 8),
  ('심리', 9),
  ('러닝', 10),
  ('사회문제', 11),
  ('환경·ESG', 12),
  ('과학', 13),
  ('마케팅', 14),
  ('여행', 15),
  ('철학', 16),
  ('역사', 17),
  ('영화·드라마', 18),
  ('음악', 19),
  ('교육·학습법', 20);

create table user_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_id uuid not null references interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

-- ============================================================
-- 2. sources / source_interests
-- ============================================================
create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage_url text,
  feed_url text,
  source_type text not null check (source_type in ('news','official_blog','expert_article')),
  collection_method text not null check (collection_method in ('rss','api','manual','metadata_crawl')),
  trust_level text not null check (trust_level in ('high','medium','low')),
  perspective_type text not null check (perspective_type in ('media_view','vendor_view','practitioner_view','public_interest')),
  language text not null default 'ko',
  default_exposure text not null default 'primary' check (default_exposure in ('primary','optional','advanced')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table source_interests (
  source_id uuid not null references sources(id) on delete cascade,
  interest_id uuid not null references interests(id) on delete cascade,
  weight numeric not null default 1.0,
  primary key (source_id, interest_id)
);

-- ============================================================
-- 3. debate_topics
-- ============================================================
create table debate_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. articles (콘텐츠 메타데이터, 본문 전문은 저장하지 않음)
-- ============================================================
create table articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  title text not null,
  canonical_url text not null unique,
  published_at timestamptz,
  author text,
  content_type text not null check (content_type in ('article','blog','video')),
  source_type text not null check (source_type in ('news','official_blog','expert_article')),
  official_excerpt text,
  translated_title text,
  translated_excerpt text,
  thumbnail_url text,
  reading_time_minutes integer,
  reading_time_source text check (reading_time_source in ('source_meta','source_default','manual')),
  difficulty_level text not null default 'unknown' check (difficulty_level in ('easy','medium','hard','unknown')),
  stance text not null default 'unknown' check (stance in ('pro','con','neutral','mixed','unknown')),
  debate_topic_id uuid references debate_topics(id),
  quality_score numeric not null default 0,
  language text not null default 'ko',
  access_type text not null default 'free' check (access_type in ('free','partial_free','paywalled','unknown')),
  thumbnail_status text not null default 'unknown' check (thumbnail_status in ('unknown','ok','failed','blocked')),
  url_status text not null default 'active' check (url_status in ('active','broken','paywalled','removed')),
  last_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_articles_created_at on articles (created_at desc);
create index idx_articles_debate_topic on articles (debate_topic_id);
create index idx_articles_url_status on articles (url_status);

create table content_interest_tags (
  content_id uuid not null references articles(id) on delete cascade,
  interest_id uuid not null references interests(id) on delete cascade,
  confidence numeric not null default 1.0,
  tagging_method text not null check (tagging_method in ('source_rule','keyword_rule','admin','ai_assist')),
  primary key (content_id, interest_id)
);
create index idx_content_interest_tags_interest on content_interest_tags (interest_id);

-- ============================================================
-- 5. article_assignments (오늘의 글 노출 이력)
-- ============================================================
create table article_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  assigned_date date not null,
  assignment_reason text check (assignment_reason in ('interest_match','perspective_balance','source_diversity','manual_pick')),
  mission_type text check (mission_type in ('question','rebuttal','connection','expression')),
  mission_anchor_type text check (mission_anchor_type in ('whole_content','highlight','timestamp','user_quote')),
  completed_at timestamptz,
  opened_original_at timestamptz,
  returned_from_original_at timestamptz,
  minimum_engagement_met boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_article_assignments_user_date on article_assignments (user_id, assigned_date desc);
create index idx_article_assignments_article on article_assignments (article_id);

-- ============================================================
-- 6. mission_records (사고 기록 = 사고 로그 아카이브)
-- ============================================================
create table mission_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_assignment_id uuid references article_assignments(id) on delete set null,
  article_id uuid not null references articles(id) on delete cascade,
  mission_type text not null check (mission_type in ('question','rebuttal','connection','expression')),
  mission_prompt text not null,
  user_answer text not null check (char_length(user_answer) > 0),
  selected_quote text,
  anchor_type text not null check (anchor_type in ('whole_content','highlight','timestamp','user_quote')),
  created_at timestamptz not null default now()
);
create index idx_mission_records_user_created on mission_records (user_id, created_at desc);
create index idx_mission_records_article on mission_records (article_id);

-- ============================================================
-- 7. reading_events (최소 참여 신호)
-- ============================================================
create table reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_assignment_id uuid not null references article_assignments(id) on delete cascade,
  event_type text not null check (event_type in ('card_viewed','original_opened','returned','mission_started','mission_submitted')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index idx_reading_events_assignment on reading_events (article_assignment_id);
create index idx_reading_events_user on reading_events (user_id);

-- ============================================================
-- 8. RLS
-- ============================================================
alter table interests enable row level security;
alter table sources enable row level security;
alter table source_interests enable row level security;
alter table debate_topics enable row level security;
alter table articles enable row level security;
alter table content_interest_tags enable row level security;

create policy "공개 읽기" on interests for select using (true);
create policy "공개 읽기" on sources for select using (true);
create policy "공개 읽기" on source_interests for select using (true);
create policy "공개 읽기" on debate_topics for select using (true);
create policy "공개 읽기" on articles for select using (true);
create policy "공개 읽기" on content_interest_tags for select using (true);

alter table user_interests enable row level security;
alter table article_assignments enable row level security;
alter table mission_records enable row level security;
alter table reading_events enable row level security;

create policy "본인 데이터만 조회/수정" on user_interests for all using (user_id = auth.uid());
create policy "본인 데이터만 조회/수정" on article_assignments for all using (user_id = auth.uid());
create policy "본인 데이터만 조회/수정" on mission_records for all using (user_id = auth.uid());
create policy "본인 데이터만 조회/수정" on reading_events for all using (user_id = auth.uid());
