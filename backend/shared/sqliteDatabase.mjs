import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'

export const defaultSqlitePath = '.icu/icu.sqlite'

export function createSqliteDatabase({ dbPath = defaultSqlitePath, repoRoot = process.cwd() } = {}) {
  const resolvedPath = dbPath === ':memory:' || path.isAbsolute(dbPath) ? dbPath : path.join(repoRoot, dbPath)
  if (resolvedPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
  }

  const database = new DatabaseSync(resolvedPath)
  initializeSqliteSchema(database)

  return database
}

export function initializeSqliteSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS learner_profiles (
      id TEXT PRIMARY KEY CHECK (id = 'primary'),
      display_name TEXT NOT NULL,
      learning_goal TEXT NOT NULL,
      preferred_tracks_json TEXT NOT NULL,
      daily_study_minutes INTEGER NOT NULL,
      level TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_progress (
      mission_id TEXT PRIMARY KEY,
      run_state TEXT NOT NULL,
      run_attempt_count INTEGER NOT NULL,
      active_step_offset INTEGER NOT NULL,
      completed_at TEXT,
      activity_log_json TEXT NOT NULL,
      last_test_result_json TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mistake_notes (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      lesson_title TEXT NOT NULL,
      command TEXT NOT NULL,
      reason TEXT NOT NULL,
      correction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      status TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mistake_notes_duplicate
      ON mistake_notes(status, source, lesson_id, command, reason);

    CREATE TABLE IF NOT EXISTS git_lab_attempts (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      command TEXT NOT NULL,
      result TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_git_lab_attempts_created_at
      ON git_lab_attempts(created_at DESC);

    CREATE TABLE IF NOT EXISTS generated_curriculums (
      id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_generated_curriculums_updated_at
      ON generated_curriculums(updated_at DESC);
  `)

  try {
    database.exec('ALTER TABLE learning_progress ADD COLUMN last_test_result_json TEXT')
  } catch {
    // Column already exists (fresh DB created with the DDL above, or already migrated).
  }
}
