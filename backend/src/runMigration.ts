import "dotenv/config";
import { readFileSync } from "fs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = readFileSync("migrations/001_create_tables.sql", "utf-8");
  await pool.query(sql);
  console.log("마이그레이션 완료! 테이블 9개 생성됨.");
  await pool.end();
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err.message);
  process.exit(1);
});
