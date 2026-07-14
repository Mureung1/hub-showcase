-- Demo seed data for the cafe stamp MVP.
-- This file creates cafes, customers, and stamp cards only.
-- Coupons and notifications are intentionally left empty so the stamp
-- earning flow can prove that it creates them later.

insert into public.cafes (name, stamp_goal, reward_title)
values
  ('Mellow Brew', 10, 'Americano 1 cup'),
  ('Forest Coffee', 6, 'Latte 1 cup'),
  ('Daylight Roasters', 8, 'Dessert discount')
on conflict do nothing;

insert into public.customers (name, member_number)
values
  ('Demo Customer General', 'C-1001'),
  ('Demo Customer Reward Ready', 'C-1002')
on conflict (member_number) do update
set
  name = excluded.name,
  updated_at = now();

insert into public.stamp_cards (customer_id, cafe_id, stamp_count)
select customers.id, cafes.id, stamp_count
from (
  values
    ('C-1001', 'Mellow Brew', 3),
    ('C-1001', 'Forest Coffee', 2),
    ('C-1001', 'Daylight Roasters', 5),
    ('C-1002', 'Mellow Brew', 9),
    ('C-1002', 'Forest Coffee', 1),
    ('C-1002', 'Daylight Roasters', 7)
) as seed_cards(member_number, cafe_name, stamp_count)
join public.customers on customers.member_number = seed_cards.member_number
join public.cafes on cafes.name = seed_cards.cafe_name
on conflict (customer_id, cafe_id) do update
set
  stamp_count = excluded.stamp_count,
  updated_at = now();