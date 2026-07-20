import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { databasePool } from "../database.js";

async function runMigrations() {
  try {
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationDirectory = path.resolve("migrations");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    const appliedResult = await databasePool.query<{ name: string }>(
      "SELECT name FROM schema_migrations",
    );
    const appliedMigrations = new Set(
      appliedResult.rows.map((migration) => migration.name),
    );

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        continue;
      }

      const sql = await readFile(
        path.join(migrationDirectory, migrationFile),
        "utf8",
      );
      const client = await databasePool.connect();

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [migrationFile],
        );
        await client.query("COMMIT");
        console.log(`Applied migration: ${migrationFile}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await databasePool.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error("마이그레이션 실행에 실패했습니다.", error);
  process.exitCode = 1;
})