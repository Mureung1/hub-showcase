import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL;
if (!url) {
  console.error('MISSING DATABASE_DIRECT_URL');
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const ext = await sql`
    select e.extname, n.nspname as schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto'`;
  console.log('PGCRYPTO EXTENSION:', JSON.stringify(ext, null, 2));

  const fn = await sql`
    select n.nspname as schema, p.proname,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'handle_new_user'`;
  console.log('HANDLE_NEW_USER FUNCTION(S):');
  for (const f of fn) {
    console.log('--- schema:', f.schema, 'name:', f.proname);
    console.log(f.definition);
  }

  const trg = await sql`
    select t.tgname, c.relname as table, n.nspname as schema,
           pg_get_triggerdef(t.oid) as definition, t.tgenabled
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and t.tgname = 'on_auth_user_created'`;
  console.log('TRIGGER on_auth_user_created:', JSON.stringify(trg, null, 2));

  // All triggers on auth.users (to confirm only permitted one)
  const authTrg = await sql`
    select t.tgname, pg_get_triggerdef(t.oid) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname = 'auth' and c.relname = 'users'`;
  console.log('ALL TRIGGERS ON auth.users:', JSON.stringify(authTrg, null, 2));

  // FK on profiles(id) -> auth.users
  const fk = await sql`
    select c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass and c.contype = 'f'`;
  console.log('PROFILES FOREIGN KEYS:', JSON.stringify(fk, null, 2));

  // Confirm profiles + point_wallets columns exist
  const cols = await sql`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name in ('profiles','point_wallets')
    order by table_name, ordinal_position`;
  console.log('PROFILES/POINT_WALLETS COLUMNS:', JSON.stringify(cols, null, 2));
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await sql.end();
}
