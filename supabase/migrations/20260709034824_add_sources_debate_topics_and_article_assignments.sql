-- 콘텐츠 출처 (뉴스/블로그/칼럼)
create type source_type as enum ('뉴스', '블로그', '칼럼');

create table sources (
  id smallint generated always as identity primary key,
  name text not null,
  feed_url text not null unique,
  source_type source_type not null,
  created_at timestamptz not null default now()
);

create table source_interests (
  source_id smallint not null references sources(id) on delete cascade,
  interest_id smallint not null references interests(id) on delete cascade,
  primary key (source_id, interest_id)
);

-- 찬반 논쟁 주제 클러스터 (확증편향 대응)
create table debate_topics (
  id bigint generated always as identity primary key,
  title text not null,
  created_at timestamptz not null default now()
);

-- articles 테이블 확장
alter table articles
  add column source_id smallint references sources(id),
  add column content text,
  add column author text,
  add column debate_topic_id bigint references debate_topics(id),
  add column stance text;

alter table articles drop column source;

create index idx_articles_debate_topic on articles (debate_topic_id);

-- 오늘의 글 배정/노출 이력
create table article_assignments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id bigint not null references articles(id) on delete cascade,
  assigned_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, article_id, assigned_date)
);
create index idx_article_assignments_user_date on article_assignments (user_id, assigned_date desc);

alter table article_assignments enable row level security;
create policy "본인 데이터만 조회/수정" on article_assignments for all using (user_id = auth.uid());

-- source_interests도 공용 콘텐츠 성격이라 읽기 공개 RLS 적용
alter table source_interests enable row level security;
alter table sources enable row level security;
alter table debate_topics enable row level security;
create policy "공개 읽기" on sources for select using (true);
create policy "공개 읽기" on source_interests for select using (true);
create policy "공개 읽기" on debate_topics for select using (true);
