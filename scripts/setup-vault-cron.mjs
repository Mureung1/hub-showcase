// Cron(0002_cron.sql)이 참조하는 Vault 시크릿(monitor_url, service_role_key)을 등록한다.
// 실행: node scripts/setup-vault-cron.mjs
// .env의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_PASSWORD 를 사용하며, 시크릿 값은 출력하지 않는다.
import postgres from "postgres";
import { readFileSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  } catch { /* .env 없으면 process env만 사용 */ }
  return env;
}

const env = loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD } = env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_DB_PASSWORD) {
  console.error("필요 env 누락 (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_PASSWORD)");
  process.exit(1);
}

const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const monitorUrl = `${SUPABASE_URL}/functions/v1/monitor`;

// Supavisor 세션 풀러 (서울 리전, IPv4 호환)
const sql = postgres(
  `postgresql://postgres.${ref}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`,
  { password: SUPABASE_DB_PASSWORD, ssl: "require", prepare: false },
);

async function upsertSecret(name, value) {
  const [existing] = await sql`select id from vault.secrets where name = ${name}`;
  if (existing) {
    await sql`select vault.update_secret(${existing.id}::uuid, ${value})`;
    console.log(`[vault] ${name} 갱신 완료`);
  } else {
    await sql`select vault.create_secret(${value}, ${name})`;
    console.log(`[vault] ${name} 등록 완료`);
  }
}

try {
  await upsertSecret("monitor_url", monitorUrl);
  await upsertSecret("service_role_key", SUPABASE_SERVICE_ROLE_KEY);
  const jobs = await sql`select jobname, schedule, active from cron.job`;
  console.log("[cron] 등록된 잡:", jobs.map((j) => `${j.jobname} (${j.schedule}, active=${j.active})`).join(", ") || "없음");
} finally {
  await sql.end();
}
