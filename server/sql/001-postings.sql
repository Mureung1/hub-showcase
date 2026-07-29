-- legacy_posting_samples: 수직 슬라이스가 쓰던 평면 공고 표. 참고용 사본이다.
--
-- 스키마의 정본은 `agent/migrations/` 다. 이 파일은 스키마를 정의하지 않는다.
-- 같은 표의 정본 정의는 `agent/migrations/sql/0025_legacy_posting_samples.sql` 에 있다.
--
-- 이 표는 `postings` 라는 이름으로 만들었는데, `agent/migrations/` 의 정규화 `postings` 와
-- 이름이 겹쳐 같은 데이터베이스에 둘 다 둘 수 없었다(CONTRACT 4장). 0025 가 이름을 갈랐다.
-- 정규화 `postings` 는 분석 경로가, 이 평면 표는 Express 의 폴백 조회가 쓴다.
-- 이 표는 분석 모집단이 아니므로 `job_roles` 로 가는 외래키를 두지 않는다.

create table if not exists legacy_posting_samples (
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
  job_role_id        text not null default 'backend',
  created_at         timestamptz not null default now()
);

create index if not exists legacy_posting_samples_role_snapshot_idx
  on legacy_posting_samples (job_role_id, snapshot);
create index if not exists legacy_posting_samples_cluster_idx
  on legacy_posting_samples (cluster_tag);

-- 프로젝트 설정에서 새 테이블 자동 노출을 껐으므로, 테이블마다 서버용 role에 권한을 직접 부여한다.
grant usage on schema public to service_role;
grant all privileges on table legacy_posting_samples to service_role;
