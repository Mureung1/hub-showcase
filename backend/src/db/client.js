import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../shortsgen.db');

let db;

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase() {
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    db.exec(schema);

    console.log('[DB] Database initialized successfully');
    console.log(`[DB] Database location: ${dbPath}`);
    return db;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error.message);
    throw error;
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    console.log('[DB] Database connection closed');
  }
}
