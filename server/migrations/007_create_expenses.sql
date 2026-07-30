-- 정산(Settlement) 지출 항목 — 1/N 균등 분배 계산의 원본 데이터
-- Supabase 대시보드 SQL Editor에서 실행

create table expenses (
  id                     uuid primary key default gen_random_uuid(),
  letter_id              uuid not null references letters(id) on delete cascade,
  label                  text not null,
  amount                 int not null check (amount > 0),
  paid_by_participant_id uuid not null references participants(id) on delete cascade,
  created_at             timestamptz not null default now()
);

create index expenses_letter_id_idx on expenses(letter_id);
