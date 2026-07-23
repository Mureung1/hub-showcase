-- Create RPC for owner stamp earning.
-- This function handles stamp increment, coupon issuing, and notifications
-- as one database transaction.

create or replace function public.award_stamp(member_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile public.profiles%rowtype;
  target_customer public.customers%rowtype;
  target_cafe public.cafes%rowtype;
  target_card public.stamp_cards%rowtype;
  issued_coupon public.coupons%rowtype;
  normalized_member_number text;
  coupon_was_issued boolean := false;
begin
  normalized_member_number := btrim(award_stamp.member_number);

  if normalized_member_number = '' then
    raise exception 'member_number is required';
  end if;

  select profiles.*
  into owner_profile
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'owner';

  if owner_profile.id is null then
    raise exception 'owner profile is required';
  end if;

  select cafes.*
  into target_cafe
  from public.cafes
  where cafes.id = owner_profile.cafe_id;

  if target_cafe.id is null then
    raise exception 'owner cafe is required';
  end if;

  select customers.*
  into target_customer
  from public.customers
  where customers.member_number = normalized_member_number;

  if target_customer.id is null then
    raise exception 'customer not found';
  end if;

  select stamp_cards.*
  into target_card
  from public.stamp_cards
  where stamp_cards.customer_id = target_customer.id
    and stamp_cards.cafe_id = target_cafe.id
  for update;

  if target_card.id is null then
    insert into public.stamp_cards (customer_id, cafe_id, stamp_count)
    values (target_customer.id, target_cafe.id, 0)
    returning * into target_card;
  end if;

  if target_card.stamp_count >= target_cafe.stamp_goal - 1 then
    coupon_was_issued := true;

    insert into public.coupons (
      customer_id,
      cafe_id,
      title,
      barcode,
      status
    )
    values (
      target_customer.id,
      target_cafe.id,
      target_cafe.reward_title,
      'CP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      'issued'
    )
    returning * into issued_coupon;

    update public.stamp_cards
    set
      stamp_count = 0,
      updated_at = now()
    where stamp_cards.id = target_card.id
    returning * into target_card;
  else
    update public.stamp_cards
    set
      stamp_count = target_card.stamp_count + 1,
      updated_at = now()
    where stamp_cards.id = target_card.id
    returning * into target_card;
  end if;

  insert into public.notifications (
    customer_id,
    cafe_id,
    type,
    message
  )
  values (
    target_customer.id,
    target_cafe.id,
    'stamp_earned',
    target_cafe.name
      || ' stamp earned. Current stamps: '
      || target_card.stamp_count
      || ' / '
      || target_cafe.stamp_goal
  );

  if coupon_was_issued then
    insert into public.notifications (
      customer_id,
      cafe_id,
      type,
      message
    )
    values (
      target_customer.id,
      target_cafe.id,
      'coupon_issued',
      target_cafe.name || ' coupon issued: ' || target_cafe.reward_title
    );
  end if;

  return jsonb_build_object(
    'customerName', target_customer.name,
    'memberNumber', target_customer.member_number,
    'cafeName', target_cafe.name,
    'currentStamps', target_card.stamp_count,
    'goalStamps', target_cafe.stamp_goal,
    'reward', target_cafe.reward_title,
    'couponIssued', coupon_was_issued,
    'couponTitle', case when coupon_was_issued then issued_coupon.title else null end,
    'couponBarcode', case when coupon_was_issued then issued_coupon.barcode else null end
  );
end;
$$;

grant execute on function public.award_stamp(text) to authenticated;
