-- 결산(Harvest) 평가 — 시간·장소·역할 적합도 리프 평점(1~5) + 선택 코멘트
-- docs/plan.md "결과 결산: 과정 항목 3가지를 leaf 아이콘으로 평가 → 제출"
-- Supabase 대시보드 SQL Editor에서 실행

create table harvest_reviews (
  id             uuid primary key default gen_random_uuid(),
  letter_id      uuid not null references letters(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  time_rating    int not null check (time_rating between 1 and 5),
  place_rating   int not null check (place_rating between 1 and 5),
  role_rating    int not null check (role_rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique (letter_id, participant_id)
);

create index harvest_reviews_letter_id_idx on harvest_reviews(letter_id);
