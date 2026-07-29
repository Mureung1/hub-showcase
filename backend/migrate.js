import "dotenv/config";
import sqlite3 from "sqlite3";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

// PostgreSQL 연결
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// SQLite 연결
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const dbPath = path.join(currentDirectory, "data", "calme.db");

const sqliteDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite 연결 실패:", err.message);
    process.exit(1);
  }
  console.log("SQLite 연결 성공");
});

// 마이그레이션 실행
async function migrate() {
  try {
    // 1. users 테이블 마이그레이션
    await migrateUsers();
    console.log("✅ users 마이그레이션 완료");

    // 2. notices 테이블 마이그레이션
    await migrateNotices();
    console.log("✅ notices 마이그레이션 완료");

    // 3. events 테이블 마이그레이션
    await migrateEvents();
    console.log("✅ events 마이그레이션 완료");

    console.log("\n🎉 데이터 마이그레이션 완료!");
    process.exit(0);
  } catch (error) {
    console.error("마이그레이션 실패:", error.message);
    process.exit(1);
  }
}

// users 마이그레이션
function migrateUsers() {
  return new Promise((resolve, reject) => {
    sqliteDb.all("SELECT * FROM users", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        for (const row of rows) {
          await pgPool.query(
            `INSERT INTO users (id, email, password, name, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [row.id, row.email, row.password, row.name, row.created_at]
          );
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// notices 마이그레이션
function migrateNotices() {
  return new Promise((resolve, reject) => {
    sqliteDb.all("SELECT * FROM notices", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        for (const row of rows) {
          await pgPool.query(
            `INSERT INTO notices (id, user_id, title, content, summary, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [row.id, row.user_id, row.title, row.content, row.summary, row.created_at]
          );
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// events 마이그레이션
function migrateEvents() {
  return new Promise((resolve, reject) => {
    sqliteDb.all("SELECT * FROM events", async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        for (const row of rows) {
          await pgPool.query(
            `INSERT INTO events (
              id, notice_id, user_id, name, start_date, end_date, deadline,
              time_start, time_end, location, deliverables, notes, category, is_selected, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (id) DO NOTHING`,
            [
              row.id,
              row.notice_id,
              row.user_id,
              row.name,
              row.start_date,
              row.end_date,
              row.deadline,
              row.time_start,
              row.time_end,
              row.location,
              row.deliverables,
              row.notes,
              row.category,
              row.is_selected,
              row.created_at,
            ]
          );
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// 마이그레이션 시작
migrate();
