-- pgTAP test: verify the extension foundation is in place.
--
-- Run with the Supabase CLI:   supabase test db
-- Or directly with pg_prove:   pg_prove -d "$DATABASE_URL" supabase/tests
--
-- pgTAP itself is a test-only extension. It is enabled here (in the test
-- transaction) rather than in a production migration, so it never ships to
-- the live database. Everything runs inside a transaction that is rolled
-- back by finish(), leaving no residue.

begin;

-- pgTAP is provided by the Supabase local stack; enable it for this test run.
create extension if not exists pgtap with schema extensions;

select plan(2);

-- pgcrypto must be installed so gen_random_uuid() is available for uuid PKs.
select has_extension('pgcrypto', 'pgcrypto extension is installed');

-- gen_random_uuid() must resolve and return a uuid value.
select isnt(
  gen_random_uuid(),
  null,
  'gen_random_uuid() returns a non-null uuid'
);

-- pg_cron is intentionally NOT asserted: scheduling moved to Vercel Cron
-- (see design.md "Scheduling 전략"), so the extension is no longer enabled.

select * from finish();

rollback;
