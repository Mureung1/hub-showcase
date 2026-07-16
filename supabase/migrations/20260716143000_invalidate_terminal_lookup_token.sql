create or replace function public.clear_terminal_waiting_lookup_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('called', 'cancelled') then
    new.lookup_token_hash := null;
  end if;
  return new;
end;
$$;

create trigger waiting_entries_clear_terminal_lookup_token
before insert or update of status on public.waiting_entries
for each row
execute function public.clear_terminal_waiting_lookup_token();

update public.waiting_entries
set lookup_token_hash = null
where status in ('called', 'cancelled')
  and lookup_token_hash is not null;
