insert into auth.users (id, email)
values (
  '00000000-0000-4000-8000-000000000081',
  'import-retention-upgrade@example.com'
);

insert into public.insights (
  id, user_id, original_url, normalized_url, domain, title, title_origin,
  created_at, updated_at
)
values
  (
    '30000000-0000-4000-8000-000000000081',
    '00000000-0000-4000-8000-000000000081',
    'https://retention-upgrade.example/recent',
    'https://retention-upgrade.example/recent',
    'retention-upgrade.example',
    '최근 완료 인사이트',
    'capture',
    now() - interval '1 hour',
    now() - interval '1 hour'
  ),
  (
    '30000000-0000-4000-8000-000000000082',
    '00000000-0000-4000-8000-000000000081',
    'https://retention-upgrade.example/old',
    'https://retention-upgrade.example/old',
    'retention-upgrade.example',
    '오래된 완료 인사이트',
    'capture',
    now() - interval '25 hours',
    now() - interval '25 hours'
  );

insert into public.insight_import_jobs (
  id, user_id, input_kind, adapter_key, status, idempotency_key,
  total_count, new_count, created_count, expires_at, completed_at
)
values
  (
    '40000000-0000-4000-8000-000000000081',
    '00000000-0000-4000-8000-000000000081',
    'pasted-text',
    'pasted-text',
    'completed',
    repeat('1', 64),
    2,
    2,
    2,
    null,
    now() - interval '1 hour'
  ),
  (
    '40000000-0000-4000-8000-000000000082',
    '00000000-0000-4000-8000-000000000081',
    'pasted-text',
    'pasted-text',
    'completed',
    repeat('2', 64),
    1,
    1,
    1,
    null,
    now() - interval '25 hours'
  ),
  (
    '40000000-0000-4000-8000-000000000083',
    '00000000-0000-4000-8000-000000000081',
    'pasted-text',
    'pasted-text',
    'undone',
    repeat('3', 64),
    1,
    1,
    1,
    null,
    now() - interval '1 hour'
  );

insert into public.insight_import_items (
  job_id, user_id, candidate_id, original_url, normalized_url, domain,
  source_location, classification, created_insight_id, imported_updated_at,
  ordinal
)
values
  (
    '40000000-0000-4000-8000-000000000081',
    '00000000-0000-4000-8000-000000000081',
    'recent-completed',
    'https://retention-upgrade.example/recent',
    'https://retention-upgrade.example/recent',
    'retention-upgrade.example',
    '최근 완료',
    'new',
    '30000000-0000-4000-8000-000000000081',
    now() - interval '1 hour',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000082',
    '00000000-0000-4000-8000-000000000081',
    'old-completed',
    'https://retention-upgrade.example/old',
    'https://retention-upgrade.example/old',
    'retention-upgrade.example',
    '오래된 완료',
    'new',
    '30000000-0000-4000-8000-000000000082',
    now() - interval '25 hours',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000081',
    '00000000-0000-4000-8000-000000000081',
    'recent-already-deleted',
    'https://retention-upgrade.example/deleted',
    'https://retention-upgrade.example/deleted',
    'retention-upgrade.example',
    '최근 완료 후 삭제',
    'new',
    null,
    now() - interval '1 hour',
    2
  ),
  (
    '40000000-0000-4000-8000-000000000083',
    '00000000-0000-4000-8000-000000000081',
    'undone',
    'https://retention-upgrade.example/undone',
    'https://retention-upgrade.example/undone',
    'retention-upgrade.example',
    '되돌림 완료',
    'new',
    null,
    null,
    1
  );
