import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = process.env.DB_PATH || './data/specfit.db'

export const db = new Database(path.resolve(dbPath))
db.pragma('journal_mode = WAL')
