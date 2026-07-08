-- Beacon 감시 스케줄 (pg_cron + pg_net → monitor Edge Function 호출)
-- 근거: docs/prd.md §4 (5분 주기 감시)
--
-- ⚠️ 배포 시 (프로젝트 ref 확정 후) Supabase Vault 에 아래 두 시크릿을 먼저 넣어야 한다.
--    프로젝트 ref 를 아직 모르므로 URL/키를 여기 하드코딩하지 않는다.
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/monitor',
--     'monitor_url'
--   );
--   select vault.create_secret(
--     '<service-role-key>',
--     'service_role_key'
--   );
--
--   -- 이미 등록돼 있으면 갱신:
--   -- select vault.update_secret(
--   --   (select id from vault.secrets where name = 'monitor_url'),
--   --   'https://<project-ref>.supabase.co/functions/v1/monitor'
--   -- );

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 5분마다 monitor 호출 (장시간 필터는 Edge Function 내부에서 수행)
select cron.schedule(
  'beacon-monitor',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'monitor_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  )
  $$
);
