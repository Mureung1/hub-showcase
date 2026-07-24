insert into auth.users (id, email)
values (
  '00000000-0000-4000-8000-000000000071',
  'category-upgrade@example.com'
);

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  category,
  created_at,
  updated_at
) values
  (
    '30000000-0000-4000-8000-000000000071',
    '00000000-0000-4000-8000-000000000071',
    'https://category-upgrade.example/first',
    'https://category-upgrade.example/first',
    'category-upgrade.example',
    '첫 번째 이전 인사이트',
    '개발',
    '2026-07-01 00:00:00+00',
    '2026-07-02 00:00:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000072',
    '00000000-0000-4000-8000-000000000071',
    'https://category-upgrade.example/second',
    'https://category-upgrade.example/second',
    'category-upgrade.example',
    '두 번째 이전 인사이트',
    '  개발  ',
    '2026-07-03 00:00:00+00',
    '2026-07-04 00:00:00+00'
  );
