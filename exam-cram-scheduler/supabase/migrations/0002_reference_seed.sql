-- #14 시드 데이터.
-- caffeine_reference: InputPage.tsx의 mock 음료 목록(client/src/pages/Input/InputPage.tsx)과
-- 동일하게 맞춰서, DB로 교체해도 화면에 보이는 값이 바뀌지 않게 한다.
insert into caffeine_reference (name, mg, icon, sort_order) values
  ('아이스 아메리카노 (톨)', 150, '☕', 1),
  ('에너지 드링크', 80, '🥤', 2),
  ('커피믹스 1포', 60, '🍵', 3)
on conflict do nothing;

-- sensitivity_halflife: sensitivityToHalfLife.ts(계산_모델_리서치.md 2.1)와 동일한 값.
insert into sensitivity_halflife (sensitivity, half_life_hours) values
  ('둔감', 4),
  ('보통', 5),
  ('예민', 7)
on conflict (sensitivity) do nothing;

-- safety_limits: dailyCaffeineLimit.ts(기획서.md 6.3, 2026-07-15 결정)와 동일한 값.
-- 성인 기본 400mg(FDA), 12~19세는 100mg과 체중×2.5mg/kg 중 낮은 값,
-- 12세 미만은 0mg, 임신·심장질환·불안불면은 공통 200mg으로 근사.
insert into safety_limits (condition_key, daily_limit_mg, mg_per_kg, note) values
  ('adult', 400, null, '건강한 성인 일반. 출처: FDA'),
  ('minor', 100, 2.5, '12~19세. daily_limit_mg과 mg_per_kg×체중 중 낮은 값 적용. 출처: AAP 계열 권고'),
  ('child', 0, null, '12세 미만. 섭취 자제 권고를 한도 0으로 반영'),
  ('pregnant', 200, null, '임신. 출처: ACOG 기준'),
  ('heart_condition', 200, null, '심장질환. 공식 고정 수치 없어 보수적으로 근사(2026-07-14 결정)'),
  ('anxiety', 200, null, '불안·불면. 공식 고정 수치 없어 보수적으로 근사(2026-07-14 결정)')
on conflict (condition_key) do nothing;
