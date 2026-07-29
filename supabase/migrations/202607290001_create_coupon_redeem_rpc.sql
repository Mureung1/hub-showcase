-- Create RPCs for owner coupon lookup and redemption.
-- Coupon lookup previews a coupon before redemption; redemption rechecks
-- the same ownership and status rules before marking the coupon used.

create or replace function public.lookup_coupon(coupon_barcode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile public.profiles%rowtype;
  target_coupon public.coupons%rowtype;
  target_customer public.customers%rowtype;
  target_cafe public.cafes%rowtype;
  normalized_barcode text;
begin
  normalized_barcode := upper(btrim(lookup_coupon.coupon_barcode));

  if normalized_barcode = '' then
    raise exception 'coupon_barcode is required';
  end if;

  select profiles.*
  into owner_profile
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'owner';

  if owner_profile.id is null then
    raise exception 'owner profile is required';
  end if;

  select coupons.*
  into target_coupon
  from public.coupons
  where upper(coupons.barcode) = normalized_barcode;

  if target_coupon.id is null then
    raise exception 'coupon not found';
  end if;

  if target_coupon.cafe_id <> owner_profile.cafe_id then
    raise exception 'coupon belongs to another cafe';
  end if;

  select customers.*
  into target_customer
  from public.customers
  where customers.id = target_coupon.customer_id;

  select cafes.*
  into target_cafe
  from public.cafes
  where cafes.id = target_coupon.cafe_id;

  return jsonb_build_object(
    'couponId', target_coupon.id,
    'barcode', target_coupon.barcode,
    'status', target_coupon.status,
    'title', target_coupon.title,
    'issuedAt', target_coupon.issued_at,
    'usedAt', target_coupon.used_at,
    'customerName', target_customer.name,
    'memberNumber', target_customer.member_number,
    'cafeName', target_cafe.name,
    'isRedeemable', target_coupon.status = 'issued'
  );
end;
$$;

create or replace function public.redeem_coupon(coupon_barcode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile public.profiles%rowtype;
  target_coupon public.coupons%rowtype;
  redeemed_coupon public.coupons%rowtype;
  target_customer public.customers%rowtype;
  target_cafe public.cafes%rowtype;
  normalized_barcode text;
begin
  normalized_barcode := upper(btrim(redeem_coupon.coupon_barcode));

  if normalized_barcode = '' then
    raise exception 'coupon_barcode is required';
  end if;

  select profiles.*
  into owner_profile
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'owner';

  if owner_profile.id is null then
    raise exception 'owner profile is required';
  end if;

  select coupons.*
  into target_coupon
  from public.coupons
  where upper(coupons.barcode) = normalized_barcode
  for update;

  if target_coupon.id is null then
    raise exception 'coupon not found';
  end if;

  if target_coupon.cafe_id <> owner_profile.cafe_id then
    raise exception 'coupon belongs to another cafe';
  end if;

  if target_coupon.status <> 'issued' then
    raise exception 'coupon is already used';
  end if;

  update public.coupons
  set
    status = 'used',
    used_at = now(),
    updated_at = now()
  where coupons.id = target_coupon.id
  returning * into redeemed_coupon;

  select customers.*
  into target_customer
  from public.customers
  where customers.id = redeemed_coupon.customer_id;

  select cafes.*
  into target_cafe
  from public.cafes
  where cafes.id = redeemed_coupon.cafe_id;

  return jsonb_build_object(
    'couponId', redeemed_coupon.id,
    'barcode', redeemed_coupon.barcode,
    'status', redeemed_coupon.status,
    'title', redeemed_coupon.title,
    'issuedAt', redeemed_coupon.issued_at,
    'usedAt', redeemed_coupon.used_at,
    'customerName', target_customer.name,
    'memberNumber', target_customer.member_number,
    'cafeName', target_cafe.name,
    'isRedeemable', false
  );
end;
$$;

grant execute on function public.lookup_coupon(text) to authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;
