-- Create RPC for customers to update their own display name.

create or replace function public.update_customer_name(customer_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile public.profiles%rowtype;
  updated_customer public.customers%rowtype;
  normalized_name text;
begin
  normalized_name := btrim(update_customer_name.customer_name);

  if normalized_name = '' then
    raise exception 'customer_name is required';
  end if;

  select profiles.*
  into customer_profile
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.role = 'customer';

  if customer_profile.id is null then
    raise exception 'customer profile is required';
  end if;

  update public.customers
  set
    name = normalized_name,
    updated_at = now()
  where customers.id = customer_profile.customer_id
  returning * into updated_customer;

  if updated_customer.id is null then
    raise exception 'customer not found';
  end if;

  return jsonb_build_object(
    'customerId', updated_customer.id,
    'name', updated_customer.name,
    'memberNumber', updated_customer.member_number
  );
end;
$$;

grant execute on function public.update_customer_name(text) to authenticated;
