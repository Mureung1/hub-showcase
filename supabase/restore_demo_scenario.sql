-- Restore the demo scenario to a known starting point.
-- This is a manual development/demo helper, not an application feature.
--
-- Starting scenario:
-- - C-1001 at Mellow Brew: 3 / 10 for normal stamp earning
-- - C-1002 at Mellow Brew: 9 / 10 for coupon issuance testing
-- - Coupons and notifications are cleared so the next earning flow can
--   prove that it creates fresh records.

delete from public.notifications
where customer_id in (
  select id
  from public.customers
  where member_number in ('C-1001', 'C-1002')
);

delete from public.coupons
where customer_id in (
  select id
  from public.customers
  where member_number in ('C-1001', 'C-1002')
);

update public.stamp_cards
set
  stamp_count = demo_counts.stamp_count,
  updated_at = now()
from (
  values
    ('C-1001', 'Mellow Brew', 3),
    ('C-1001', 'Forest Coffee', 2),
    ('C-1001', 'Daylight Roasters', 5),
    ('C-1002', 'Mellow Brew', 9),
    ('C-1002', 'Forest Coffee', 1),
    ('C-1002', 'Daylight Roasters', 7)
) as demo_counts(member_number, cafe_name, stamp_count)
join public.customers on customers.member_number = demo_counts.member_number
join public.cafes on cafes.name = demo_counts.cafe_name
where stamp_cards.customer_id = customers.id
  and stamp_cards.cafe_id = cafes.id;