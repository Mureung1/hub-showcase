create or replace function private.is_valid_agent_trace(p_trace jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  top_level_keys text[];
  review_keys text[];
  item jsonb;
  item_text text;
begin
  if p_trace is null
    or jsonb_typeof(p_trace) <> 'object'
    or char_length(p_trace::text) > 20000 then
    return false;
  end if;

  select array_agg(key order by key)
  into top_level_keys
  from jsonb_object_keys(p_trace) as key;

  if top_level_keys is distinct from array[
    'attemptCount',
    'plan',
    'repaired',
    'selfReview',
    'suggestedNextAction',
    'version'
  ]::text[] then
    return false;
  end if;

  if p_trace -> 'version' <> '1'::jsonb
    or jsonb_typeof(p_trace -> 'plan') <> 'array'
    or jsonb_array_length(p_trace -> 'plan') not between 1 and 5
    or jsonb_typeof(p_trace -> 'selfReview') <> 'object'
    or jsonb_typeof(p_trace -> 'suggestedNextAction') <> 'string'
    or char_length(btrim(p_trace ->> 'suggestedNextAction')) not between 1 and 1000
    or p_trace -> 'attemptCount' not in ('1'::jsonb, '2'::jsonb)
    or jsonb_typeof(p_trace -> 'repaired') <> 'boolean'
    or (
      (p_trace -> 'attemptCount' = '1'::jsonb and p_trace -> 'repaired' <> 'false'::jsonb)
      or (p_trace -> 'attemptCount' = '2'::jsonb and p_trace -> 'repaired' <> 'true'::jsonb)
    ) then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_trace -> 'plan') as entry(value)
  loop
    if jsonb_typeof(item) <> 'string' then
      return false;
    end if;
    item_text := item #>> '{}';
    if char_length(btrim(item_text)) not between 1 and 500 then
      return false;
    end if;
  end loop;

  select array_agg(key order by key)
  into review_keys
  from jsonb_object_keys(p_trace -> 'selfReview') as key;

  if review_keys is distinct from array[
    'issues',
    'requirementsMet',
    'roleFollowed',
    'selectedContextOnly'
  ]::text[]
    or jsonb_typeof(p_trace #> '{selfReview,roleFollowed}') <> 'boolean'
    or jsonb_typeof(p_trace #> '{selfReview,requirementsMet}') <> 'boolean'
    or jsonb_typeof(p_trace #> '{selfReview,selectedContextOnly}') <> 'boolean'
    or jsonb_typeof(p_trace #> '{selfReview,issues}') <> 'array'
    or jsonb_array_length(p_trace #> '{selfReview,issues}') > 5 then
    return false;
  end if;

  for item in
    select value
    from jsonb_array_elements(p_trace #> '{selfReview,issues}') as entry(value)
  loop
    if jsonb_typeof(item) <> 'string' then
      return false;
    end if;
    item_text := item #>> '{}';
    if char_length(btrim(item_text)) not between 1 and 500 then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.is_valid_agent_trace(jsonb)
  from public, anon, authenticated;
