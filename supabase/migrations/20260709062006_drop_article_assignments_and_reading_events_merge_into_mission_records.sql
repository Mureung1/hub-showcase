-- reading_events, article_assignments 제거 (완료된 사고 기록만 남기는 방향으로 단순화)
drop table if exists reading_events cascade;
drop table if exists article_assignments cascade;

-- mission_records에 참여 신호 필드 흡수
alter table mission_records
  add column opened_original_at timestamptz,
  add column returned_from_original_at timestamptz,
  add column minimum_engagement_met boolean not null default false;
