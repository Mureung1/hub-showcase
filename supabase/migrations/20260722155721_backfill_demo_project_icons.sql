update public.demo_workspaces as demo
set payload = jsonb_set(
  demo.payload,
  '{projects}',
  coalesce(
    (
      select jsonb_agg(
        project.item || jsonb_build_object(
          'iconKey',
          coalesce(project.item->>'iconKey', 'layers')
        )
        order by project.ordinality
      )
      from jsonb_array_elements(demo.payload->'projects')
        with ordinality as project(item, ordinality)
    ),
    '[]'::jsonb
  ),
  false
)
where demo.slug = 'teamflow'
  and jsonb_typeof(demo.payload->'projects') = 'array';
