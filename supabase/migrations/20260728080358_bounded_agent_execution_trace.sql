do $$
begin
  if to_regclass('public.ai_runs') is null
    or to_regprocedure('private.complete_ai_run(uuid,text,jsonb,integer)') is null then
    raise exception 'TEAMFLOW_AGENT_TRACE_PREFLIGHT_FAILED';
  end if;
end;
$$;

create function private.is_valid_agent_trace(p_trace jsonb)
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

  if top_level_keys <> array[
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

  if review_keys <> array[
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

alter table public.ai_runs
  add column agent_trace jsonb;

alter table public.ai_runs
  add constraint ai_runs_agent_trace_check
  check (
    agent_trace is null
    or private.is_valid_agent_trace(agent_trace)
  );

comment on column public.ai_runs.agent_trace is
  'Validated bounded Agent plan, self-review, next action, and repair metadata.';

create function private.complete_agentic_ai_run(
  p_run_id uuid,
  p_result_markdown text,
  p_agent_trace jsonb,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_result jsonb;
  updated_run public.ai_runs;
begin
  completed_result := private.complete_ai_run(
    p_run_id,
    p_result_markdown,
    p_usage,
    p_duration_ms
  );

  if not private.is_valid_agent_trace(p_agent_trace) then
    raise exception 'INVALID_AI_AGENT_TRACE';
  end if;

  update public.ai_runs
  set agent_trace = p_agent_trace
  where id = p_run_id
  returning * into updated_run;

  if updated_run.id is null then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  return jsonb_set(
    completed_result,
    '{aiRun}',
    to_jsonb(updated_run),
    true
  );
end;
$$;

create function public.complete_agentic_ai_run(
  p_run_id uuid,
  p_result_markdown text,
  p_agent_trace jsonb,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.complete_agentic_ai_run(
    p_run_id,
    p_result_markdown,
    p_agent_trace,
    p_usage,
    p_duration_ms
  );
$$;

revoke all on function private.is_valid_agent_trace(jsonb)
  from public, anon, authenticated;
revoke all on function private.complete_agentic_ai_run(uuid, text, jsonb, jsonb, integer)
  from public, anon, authenticated;
revoke all on function public.complete_agentic_ai_run(uuid, text, jsonb, jsonb, integer)
  from public, anon, authenticated;

grant execute on function private.complete_agentic_ai_run(uuid, text, jsonb, jsonb, integer)
  to authenticated;
grant execute on function public.complete_agentic_ai_run(uuid, text, jsonb, jsonb, integer)
  to authenticated;
