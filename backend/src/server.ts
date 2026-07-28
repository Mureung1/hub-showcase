import "dotenv/config";
import app from "./app.js";
import { databasePool, verifyDatabaseConnection } from "./database.js";

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  await verifyDatabaseConnection();

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch(async (error: unknown) => {
  console.error("데이터베이스 연결에 실패했습니다.", error);
  await databasePool.end();
  process.exit(1);
});

// 실제서버 실행