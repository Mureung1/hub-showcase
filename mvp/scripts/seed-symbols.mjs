// 종목 마스터(symbols) 시드 스크립트.
// supabase/seed/symbols/{kr.json,us.json}을 읽어 Supabase `symbols` 테이블에
// 1000행 배치로 upsert(onConflict: market,exchange,ticker) 한다.
//
// 사용법:
//   node scripts/seed-symbols.mjs
//
// 환경변수 (우선순위: process.env > 프로젝트 루트 .env 파일):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const BATCH_SIZE = 1000;
const SEED_FILES = [
  { market: "KR", file: path.join(projectRoot, "supabase/seed/symbols/kr.json") },
  { market: "US", file: path.join(projectRoot, "supabase/seed/symbols/us.json") },
];

/**
 * .env 파일을 최소한으로 파싱한다 (dotenv 의존성 없이).
 * `KEY=VALUE` 형태만 지원, 따옴표 제거, 주석(#)/빈 줄 무시.
 */
async function loadDotEnvFallback() {
  const envPath = path.join(projectRoot, ".env");
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    return {};
  }

  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function resolveEnv() {
  const dotEnv = await loadDotEnvFallback();
  const supabaseUrl = process.env.SUPABASE_URL ?? dotEnv.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? dotEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[seed-symbols] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다. " +
        "환경변수로 설정하거나 프로젝트 루트 .env 파일에 정의하세요."
    );
    process.exit(1);
  }

  return { supabaseUrl, serviceRoleKey };
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function loadSymbols({ market, file }) {
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`[seed-symbols] ${file}은(는) 배열이어야 합니다.`);
  }
  return parsed.map((row) => ({
    market: row.market ?? market,
    exchange: row.exchange,
    ticker: row.ticker,
    name: row.name,
    source: row.source ?? null,
  }));
}

async function seedSymbols() {
  const { supabaseUrl, serviceRoleKey } = await resolveEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let totalUpserted = 0;

  for (const seedFile of SEED_FILES) {
    console.log(`[seed-symbols] ${seedFile.market} 시드 파일 로드: ${seedFile.file}`);
    const rows = await loadSymbols(seedFile);
    console.log(`[seed-symbols] ${seedFile.market}: ${rows.length}건 로드 완료`);

    const batches = chunk(rows, BATCH_SIZE);
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const { error } = await supabase
        .from("symbols")
        .upsert(batch, { onConflict: "market,exchange,ticker" });

      if (error) {
        console.error(
          `[seed-symbols] ${seedFile.market} 배치 ${i + 1}/${batches.length} 실패:`,
          error.message
        );
        process.exit(1);
      }

      totalUpserted += batch.length;
      console.log(
        `[seed-symbols] ${seedFile.market} 배치 ${i + 1}/${batches.length} 완료 ` +
          `(${batch.length}건, 누적 ${totalUpserted}건)`
      );
    }
  }

  console.log(`[seed-symbols] 완료. 총 upsert 건수: ${totalUpserted}`);
}

seedSymbols().catch((error) => {
  console.error("[seed-symbols] 예기치 않은 오류:", error);
  process.exit(1);
});
