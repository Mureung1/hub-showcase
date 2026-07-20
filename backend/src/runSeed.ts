import { readFileSync } from "fs";
import { pool } from "./db";

async function main() {
  const sql = readFileSync("migrations/002_seed_symptoms_ingredients.sql", "utf-8");
  await pool.query(sql);
  console.log("시딩 완료! 증상 8개, 성분 8개 삽입됨.");
  await pool.end();
}

main().catch((err) => {
  console.error("시딩 실패:", err.message);
  process.exit(1);
});
