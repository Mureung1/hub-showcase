-- 5주차 §4: 영양 점수 100점 배점표 개편(칼로리 적정성 40 / 단백질·탄수화물·지방 각 10 /
-- 나트륨 30, 식이섬유·미량영양소는 배점에서 제외 — 실제로 추적하는 5개 영양소만으로 채점).
-- get_daily_leaderboard()를 src/lib/nutritionScore.js의 새 calcScore/getScoreBreakdown 공식과
-- 동일하게 다시 만든다. 테이블 변경 없이 함수 본문만 바뀌므로 create or replace 한 번이면 된다.
-- 이미 배포된 Supabase 프로젝트에 적용하는 증분 마이그레이션 — 신규 설치는 schema.sql이 이 버전을
-- 이미 포함하고 있으니 이 파일을 따로 실행할 필요 없다.
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run 하세요.

create or replace function public.get_daily_leaderboard()
returns table (rank bigint, score numeric, is_me boolean)
language sql
security definer
set search_path = public
as $$
  with today_totals as (
    select
      m.user_id,
      sum((m.total->>'calories')::numeric) as calories,
      sum((m.total->>'protein')::numeric)  as protein,
      sum((m.total->>'carbs')::numeric)    as carbs,
      sum((m.total->>'fat')::numeric)      as fat,
      sum((m.total->>'sodium')::numeric)   as sodium
    from public.meals m
    where m.date = (now() at time zone 'Asia/Seoul')::date
    group by m.user_id
  ),
  scored as (
    select
      t.user_id,
      (
        select sum(pts) from unnest(array[
          case when (p.recommended->>'calories')::numeric > 0 then
            round(40 * least(1, greatest(0,
              case
                when coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric between 0.9 and 1.1 then 1
                when coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric < 0.9 then
                  (coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric - 0.5) / (0.9 - 0.5)
                else
                  (1.5 - coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric) / (1.5 - 1.1)
              end
            )))
          end,
          case when (p.recommended->>'protein')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.protein, 0) / (p.recommended->>'protein')::numeric * 10)))
          end,
          case when (p.recommended->>'carbs')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.carbs, 0) / (p.recommended->>'carbs')::numeric * 10)))
          end,
          case when (p.recommended->>'fat')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.fat, 0) / (p.recommended->>'fat')::numeric * 10)))
          end,
          case when (p.recommended->>'sodium')::numeric > 0 then
            round(
              case
                when coalesce(t.sodium, 0) <= (p.recommended->>'sodium')::numeric then 30
                else greatest(0, 30 * (1 - (t.sodium - (p.recommended->>'sodium')::numeric) / (p.recommended->>'sodium')::numeric))
              end
            )
          end
        ]) pts
      ) as score
    from today_totals t
    join public.profiles p on p.id = t.user_id
    where p.recommended is not null and p.recommended != '{}'::jsonb
  )
  select
    row_number() over (order by score desc) as rank,
    score,
    user_id = auth.uid() as is_me
  from scored
  where score is not null
  order by score desc
  limit 100;
$$;

-- 확인용: 오늘 기록이 있는 로그인 사용자로 앱에서 리더보드를 열어 표시되는 점수가
-- src/lib/nutritionScore.js의 calcScore(브라우저 devtools에서 같은 값으로 계산)와 일치하는지 확인.
