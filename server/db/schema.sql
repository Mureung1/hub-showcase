-- Newssist DB 스키마 (Supabase SQL Editor에 붙여넣어 실행)
-- 도메인 순서: 01 인증 -> 02 키워드 -> 03 기사/콘텐츠 -> 04 개인화 활동 -> 05 클러스터링 -> 06 리포트/트렌드

create extension if not exists vector;
create extension if not exists pgcrypto;

create type difficulty_level as enum ('easy', 'medium', 'hard');

-- 01 인증 & 사용자
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 02 키워드
create table keywords (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table user_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  keyword_id uuid not null references keywords(id) on delete cascade,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, keyword_id)
);

-- 03 기사 & 콘텐츠
create table articles (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  source text not null,
  content text,
  thumbnail_url text,
  embedding vector(1536),
  published_at timestamptz,
  collected_at timestamptz not null default now()
);

create table article_keywords (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  keyword_id uuid not null references keywords(id) on delete cascade,
  unique (article_id, keyword_id)
);

-- 난이도별로 원문을 통째로 다시 쓰는 "쉽게 설명"용 (easy/medium만 씀, hard는 미사용)
create table summaries (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  difficulty_level difficulty_level not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (article_id, difficulty_level)
);

-- 난이도 구분 없는 단일 스타일 "AI 요약"용
create table article_summaries (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade unique,
  content text not null,
  created_at timestamptz not null default now()
);

create table terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  created_at timestamptz not null default now()
);

create table article_terms (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  explanation text not null,
  difficulty_level difficulty_level,
  created_at timestamptz not null default now()
);

-- 04 개인화 활동
create table read_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (user_id, article_id)
);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, article_id)
);

-- 05 클러스터링 & 인사이트 (append-only, batch_date별로 계속 쌓임)
create table clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  batch_date date not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table cluster_articles (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references clusters(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade
);

-- 06 리포트 & 트렌드
create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table report_clusters (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references weekly_reports(id) on delete cascade,
  cluster_id uuid not null references clusters(id) on delete cascade
);

create table trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid not null references keywords(id) on delete cascade,
  snapshot_date date not null,
  rank integer not null,
  mention_count integer not null,
  created_at timestamptz not null default now(),
  unique (keyword_id, snapshot_date)
);

-- 임베딩 유사도 검색용 인덱스 (연관 기사 추천에서 사용)
create index articles_embedding_idx on articles using hnsw (embedding vector_cosine_ops);

-- 기본 RLS: Express 백엔드는 service role 키로 붙어서 RLS를 우회하므로 실제 접근 제어는
-- 백엔드 라우트/미들웨어가 담당함. 여기서는 anon 키로 직접 노출되는 사고를 막기 위해
-- 모든 테이블에 RLS만 켜고 정책은 추가하지 않음(기본값: 전체 차단).
alter table profiles enable row level security;
alter table keywords enable row level security;
alter table user_keywords enable row level security;
alter table articles enable row level security;
alter table article_keywords enable row level security;
alter table summaries enable row level security;
alter table article_summaries enable row level security;
alter table terms enable row level security;
alter table article_terms enable row level security;
alter table read_history enable row level security;
alter table bookmarks enable row level security;
alter table clusters enable row level security;
alter table cluster_articles enable row level security;
alter table weekly_reports enable row level security;
alter table report_clusters enable row level security;
alter table trend_snapshots enable row level security;
