-- Version 20260712054932. LOCAL/EMPTY DATABASE ONLY; production uses forward-fix.
begin;

grant execute on function public.import_source_context(
  uuid, text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function public.create_analysis_run_annotation(
  uuid, text, text, text, text, text
) to authenticated;

commit;
