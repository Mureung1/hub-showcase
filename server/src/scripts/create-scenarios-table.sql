create table if not exists scenarios (
  id text primary key,
  title text not null,
  description text not null,
  command_ids jsonb not null
);
