import { readFileSync } from "fs";
import { pool } from "./db";

async function main() {
  const sql = readFileSync("migrations/003_symptom_ingredient_mapping.sql", "utf-8");
  await pool.query(sql);
  console.log("매핑 마이그레이션 완료! symptom_ingredients 테이블 생성 및 매핑 데이터 삽입됨.");
  await pool.end();
}

main().catch((err) => {
  console.error("매핑 마이그레이션 실패:", err.message);
  process.exit(1);
});
