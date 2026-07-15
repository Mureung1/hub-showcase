create table interests (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table user_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_id smallint not null references interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table articles (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null unique,
  source text,
  published_at timestamptz,
  excerpt text,
  created_at timestamptz not null default now()
);
create index idx_articles_created_at on articles (created_at desc);

create table article_interests (
  article_id bigint not null references articles(id) on delete cascade,
  interest_id smallint not null references interests(id) on delete cascade,
  primary key (article_id, interest_id)
);
create index idx_article_interests_interest on article_interests (interest_id);

create table highlights (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id bigint not null references articles(id) on delete cascade,
  highlighted_text text not null,
  created_at timestamptz not null default now()
);
create index idx_highlights_user on highlights (user_id);

create type mission_type as enum ('질문', '반박', '연결', '표현');

create table mission_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id bigint not null references articles(id) on delete cascade,
  highlight_id bigint references highlights(id) on delete set null,
  mission_type mission_type not null,
  response_text text not null check (char_length(response_text) > 0),
  created_at timestamptz not null default now()
);
create index idx_mission_records_user_created on mission_records (user_id, created_at desc);
create index idx_mission_records_article on mission_records (article_id);

alter table user_interests enable row level security;
alter table highlights enable row level security;
alter table mission_records enable row level security;

create policy "본인 데이터만 조회/수정" on user_interests for all using (user_id = auth.uid());
create policy "본인 데이터만 조회/수정" on highlights for all using (user_id = auth.uid());
create policy "본인 데이터만 조회/수정" on mission_records for all using (user_id = auth.uid());
