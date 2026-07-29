alter table public.group_buys
  add column if not exists product_url text,
  add column if not exists image_url text,
  add column if not exists free_shipping_threshold integer
    check (free_shipping_threshold >= 0),
  add column if not exists per_person_quantity integer not null default 1
    check (per_person_quantity between 1 and 100);
