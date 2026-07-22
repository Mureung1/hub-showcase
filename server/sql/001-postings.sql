-- postings 테이블: 정형 공고 저장소 (계약: docs/architecture.md의 저장소 구조)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.

create table if not exists postings (
  posting_id         text primary key,
  title              text not null,
  company            text not null,
  cluster_tag        text not null,          -- 기업군 6종
  snapshot           text not null check (snapshot in ('recent', 'prev')),
  posted_at          date,
  source             jsonb not null default '{}',
  raw_text           text,                   -- 공고 원문. 샘플 단계에서는 null
  entry_label        text,
  edu_label          text,
  career_label       text,
  skills             jsonb not null default '[]',
  out_of_role_tags   jsonb not null default '[]',
  advanced_spans     jsonb not null default '[]',
  impl_level_signals jsonb not null default '[]',
  axis_mentions      jsonb not null default '[]',
  reality_tags       jsonb not null default '[]',
  created_at         timestamptz not null default now()
);

create index if not exists postings_snapshot_idx on postings (snapshot);
create index if not exists postings_cluster_idx on postings (cluster_tag);

-- 프로젝트 설정에서 새 테이블 자동 노출을 껐으므로, 테이블마다 서버용 role에 권한을 직접 부여한다.
grant usage on schema public to service_role;
grant all privileges on table postings to service_role;
