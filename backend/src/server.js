import "dotenv/config";
import app from "./app.js";
import database from "./config/database.js";

const PORT = process.env.PORT || 3000;

try {
  database.prepare("SELECT 1").get();

  console.log("SQLite 데이터베이스 연결 성공");

  app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("데이터베이스 연결 실패:", error.message);
  process.exit(1);
}