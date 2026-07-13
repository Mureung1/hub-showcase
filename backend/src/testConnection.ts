import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query("SELECT NOW()");
  console.log("DB 연결 성공! 현재 시각:", result.rows[0].now);
  await pool.end();
}

main().catch((err) => {
  console.error("DB 연결 실패:", err.message);
  process.exit(1);
});
