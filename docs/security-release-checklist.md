# Modu Brain production security checklist

Use this checklist when promoting `production`. Keep secret values in the
provider dashboards; never copy them into commits, issue comments, or build
logs.

## GitHub and Render

- Protect `production`: require `quality`, `secret-scan`, `db-integration`,
  `e2e`, and `security-smoke`; block force-pushes and branch deletion.
- Keep workflow permissions read-only. Do not add a deploy job to pull-request
  workflows or expose repository/environment secrets to fork pull requests.
- In Render, connect only `production`, use **After CI Checks Pass**, and keep
  the health check at `/api/health/ready`.
- Set `MODU_BRAIN_CANONICAL_ORIGIN=https://modu-brain-demo.onrender.com`,
  `MODU_BRAIN_CAPTCHA_REQUIRED=true`, and the public
  `VITE_TURNSTILE_SITE_KEY`. Confirm `/api/health/live` reports the promoted
  commit and `/api/health/ready` reports the expected migration version.

## Supabase Auth and Turnstile

- Set the Auth Site URL to `https://modu-brain-demo.onrender.com`.
- Allow only `https://modu-brain-demo.onrender.com/login` for production magic
  links. Keep `http://127.0.0.1:4173/login` only while local development needs
  it; remove the old Sites origin after the transition window.
- Enable Cloudflare Turnstile in Supabase Auth with the matching Turnstile
  secret. The secret belongs in Supabase only; Render and Vite receive the
  public site key.
- Exercise a real Magic Link request after changing CAPTCHA or redirect
  settings. Verify missing/reused CAPTCHA tokens fail and the response never
  reveals whether an email is registered.
- Review OTP expiry and send limits, enable MFA for dashboard administrators,
  and alert on repeated Auth `429` responses.

## Local release evidence

```powershell
npm run check
npm run build
$commit = (git rev-parse HEAD).Trim()
node scripts/ops/security-smoke.mjs http://127.0.0.1:4173 $commit
```

Run the smoke command against a locally started production build. Remote
branch protection, Supabase dashboard settings, and the deployed response must
still be verified separately; local success does not prove those settings.

## Retention operations

- Before a manual purge or the first Cron activation, run
  `select public.app_preview_expired_project_data();` as an operator and record
  the source, analysis, share-link, and project counts. The preview is
  service-role only and must not delete or expose source content.
- The daily Cron calls `app_purge_expired_project_data_until_drained(500, 20)`.
  Alert whenever `drain_complete` is `false`; the job intentionally stops after
  20 bounded batches so a backlog cannot create an unbounded transaction.
- Retention uses record creation time, not an imported meeting's historical
  `occurredAt`. Increasing a project's retention period takes the same project
  row lock as purge selection, preventing a stale-policy delete race.
- `context_entities` are not deleted by the retention job yet because the
  current schema does not store source provenance for those derived rows. Do
  not populate that table in production until entity-to-source provenance and
  cascade behavior are introduced in a migration.
- Before promotion, verify the remote migration ledger is exactly the local
  ledger, apply only the pending migration, and confirm readiness returns the
  expected migration version. Never run `db reset --linked` against production.

## Deployment transition

1. Disable Render auto-deploy before pushing the development branch.
2. Push the candidate and require all five CI jobs to pass.
3. Apply and verify the pending Supabase migration.
4. Promote the exact tested SHA to protected `production`, then switch Render
   to `production` with **After CI Checks Pass** and deploy.
5. Compare `/api/health/live` commit and `/api/health/ready` migration version
   with the promoted values. Roll back to the prior verified deploy on mismatch.
6. Keep the legacy Sites notice for seven days, then remove its Auth redirect
   and API access. Render remains the only canonical production address.

GitHub PRs follow [the weekday Daily PR runbook](github-daily-pr-runbook.md).
