alter table public.group_buys
  add column if not exists pickup_latitude double precision,
  add column if not exists pickup_longitude double precision;

alter table public.group_buys
  drop constraint if exists group_buys_pickup_latitude_range,
  drop constraint if exists group_buys_pickup_longitude_range,
  drop constraint if exists group_buys_pickup_coordinates_complete;

alter table public.group_buys
  add constraint group_buys_pickup_latitude_range
    check (pickup_latitude is null or pickup_latitude between -90 and 90),
  add constraint group_buys_pickup_longitude_range
    check (pickup_longitude is null or pickup_longitude between -180 and 180),
  add constraint group_buys_pickup_coordinates_complete
    check ((pickup_latitude is null) = (pickup_longitude is null));
