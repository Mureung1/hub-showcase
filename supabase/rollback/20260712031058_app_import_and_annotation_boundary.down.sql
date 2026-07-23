-- Version 20260712031058. LOCAL/EMPTY DATABASE ONLY; production uses forward-fix.
begin;

drop function if exists public.app_create_analysis_run_annotation(
  uuid, uuid, text, text, text, text, text
);
drop function if exists public.app_import_source_context(
  uuid, uuid, text, text, text, text, text, timestamptz, jsonb, jsonb, jsonb
);

commit;
