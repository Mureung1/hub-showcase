import { readFileSync } from "fs";
import { pool } from "./db";

async function main() {
  const sql = readFileSync("migrations/016_fix_renamed_product_ingredients.sql", "utf-8");
  await pool.query(sql);
  console.log("마이그레이션 완료! 오마비/GNM 제품에 누락된 성분 연결 추가됨.");
  await pool.end();
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err.message);
  process.exit(1);
});
