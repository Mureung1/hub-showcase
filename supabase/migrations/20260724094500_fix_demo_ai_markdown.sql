-- Convert the literal "\n" sequences from the first demo payload migration
-- into real line breaks so the safe Markdown renderer receives valid Markdown.
update public.demo_workspaces
set payload = jsonb_set(
  payload,
  '{aiRuns}',
  coalesce(
    (
      select jsonb_agg(
        run_item
        || jsonb_build_object(
          'resultMarkdown',
          replace(run_item ->> 'resultMarkdown', E'\\n', E'\n')
        )
        order by run_ordinality
      )
      from jsonb_array_elements(payload -> 'aiRuns')
        with ordinality as run_rows(run_item, run_ordinality)
    ),
    '[]'::jsonb
  )
)
where jsonb_typeof(payload -> 'aiRuns') = 'array';
