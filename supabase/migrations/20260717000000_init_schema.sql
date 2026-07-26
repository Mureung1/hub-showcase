-- Articles 데이터 모델 초기 스키마
-- 대상 엔티티: articles, vocabulary, decisions, article_reads
-- 사용자는 Supabase Auth(auth.users)를 사용한다.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- articles: 분석 대상 외신 원문 (마스터 테이블)
-- ─────────────────────────────────────────────
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  source text,
  source_initial text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- vocabulary: 사용자별 단어장 (기사에서 자동 적재된 용어)
-- ─────────────────────────────────────────────
create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  term text not null,
  definition text not null,
  added_at timestamptz not null default now()
);

create unique index if not exists vocabulary_user_term_unique
  on public.vocabulary (user_id, lower(term));

create index if not exists vocabulary_user_id_idx
  on public.vocabulary (user_id);

-- ─────────────────────────────────────────────
-- decisions: 사용자의 투자 판단 기록 (바텀시트 닫을 때 저장)
-- ─────────────────────────────────────────────
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  summary_bullets text[],
  decision text not null check (decision in ('buy', 'hold', 'sell')),
  market_sentiment text check (market_sentiment in ('bullish', 'neutral', 'bearish')),
  insight text,
  created_at timestamptz not null default now()
);

create index if not exists decisions_user_article_idx
  on public.decisions (user_id, article_id);

-- ─────────────────────────────────────────────
-- article_reads: 완독(읽기 완료) 이벤트
-- Primary 지표(완독 수) = count(*)
-- Secondary 지표(판단수행률) = count(decision_id is not null) / count(*)
-- ─────────────────────────────────────────────
create table if not exists public.article_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  decision_id uuid references public.decisions (id) on delete set null
);

create index if not exists article_reads_user_article_idx
  on public.article_reads (user_id, article_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

-- articles: 전체 공개 읽기, 쓰기는 서비스 역할만(백엔드가 service_role 키로 insert)
alter table public.articles enable row level security;

create policy "articles are readable by everyone"
  on public.articles for select
  using (true);

-- vocabulary: 본인 행만 접근
alter table public.vocabulary enable row level security;

create policy "users can view their own vocabulary"
  on public.vocabulary for select
  using (auth.uid() = user_id);

create policy "users can insert their own vocabulary"
  on public.vocabulary for insert
  with check (auth.uid() = user_id);

create policy "users can update their own vocabulary"
  on public.vocabulary for update
  using (auth.uid() = user_id);

create policy "users can delete their own vocabulary"
  on public.vocabulary for delete
  using (auth.uid() = user_id);

-- decisions: 본인 행만 접근
alter table public.decisions enable row level security;

create policy "users can view their own decisions"
  on public.decisions for select
  using (auth.uid() = user_id);

create policy "users can insert their own decisions"
  on public.decisions for insert
  with check (auth.uid() = user_id);

create policy "users can update their own decisions"
  on public.decisions for update
  using (auth.uid() = user_id);

create policy "users can delete their own decisions"
  on public.decisions for delete
  using (auth.uid() = user_id);

-- article_reads: 본인 행만 접근
alter table public.article_reads enable row level security;

create policy "users can view their own article_reads"
  on public.article_reads for select
  using (auth.uid() = user_id);

create policy "users can insert their own article_reads"
  on public.article_reads for insert
  with check (auth.uid() = user_id);

create policy "users can update their own article_reads"
  on public.article_reads for update
  using (auth.uid() = user_id);

create policy "users can delete their own article_reads"
  on public.article_reads for delete
  using (auth.uid() = user_id);
