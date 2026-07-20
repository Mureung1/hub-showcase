import { Pool } from "pg";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL이 필요합니다.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (
    parsedUrl.protocol !== "postgres:" &&
    parsedUrl.protocol !== "postgresql:"
  ) {
    throw new Error("DATABASE_URL은 PostgreSQL 연결 URL이어야 합니다.");
  }

  return databaseUrl;
}

export const databasePool = new Pool({
  connectionString: getDatabaseUrl(),
});

export async function verifyDatabaseConnection() {
  await databasePool.query("SELECT 1");
}