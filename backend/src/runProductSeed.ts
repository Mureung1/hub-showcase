import { readFileSync } from "fs";
import { pool } from "./db";

async function main() {
  const sql = readFileSync("migrations/004_seed_products.sql", "utf-8");
  await pool.query(sql);
  console.log("제품 시딩 완료! products 12개, product_ingredients 연결 완료.");
  await pool.end();
}

main().catch((err) => {
  console.error("제품 시딩 실패:", err.message);
  process.exit(1);
});
