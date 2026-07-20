import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { analyzeResponseSchema } from "../schemas/analyzeSchemas.js";

const DEFAULT_DATABASE_PATH = resolve(process.cwd(), "data", "uniradar-demo.sqlite");

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim().toLowerCase() === "true";
}

function readDatabasePath(value) {
  const configuredPath = String(value || "").trim();
  return configuredPath ? resolve(process.cwd(), configuredPath) : DEFAULT_DATABASE_PATH;
}

function createRepositoryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toDatabaseRow(analysis) {
  const normalizedAnalysis = analyzeResponseSchema.parse(analysis);

  return {
    analysisId: normalizedAnalysis.id,
    analysisResult: JSON.stringify(normalizedAnalysis),
    category: normalizedAnalysis.opportunity.category,
    deadline: normalizedAnalysis.opportunity.deadline,
    organizer: normalizedAnalysis.opportunity.organizer,
    sourceUrl: normalizedAnalysis.opportunity.sourceUrl,
    title: normalizedAnalysis.opportunity.title,
    updatedAt: new Date().toISOString(),
  };
}

function fromDatabaseRow(record) {
  let analysisResult;

  try {
    analysisResult = JSON.parse(record.analysis_result);
  } catch {
    throw createRepositoryError("저장된 공고 데이터 형식이 올바르지 않습니다.", "invalid_stored_analysis");
  }

  const parsed = analyzeResponseSchema.safeParse(analysisResult);

  if (!parsed.success) {
    throw createRepositoryError("저장된 공고 데이터 형식이 올바르지 않습니다.", "invalid_stored_analysis");
  }

  return {
    ...parsed.data,
    persistedAt: record.updated_at || record.created_at || null,
    storageId: String(record.id),
  };
}

function initializeDatabase(database) {
  database.exec([
    "CREATE TABLE IF NOT EXISTS opportunity_analyses (",
    "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
    "  analysis_id TEXT NOT NULL UNIQUE,",
    "  analysis_result TEXT NOT NULL,",
    "  category TEXT,",
    "  deadline TEXT,",
    "  organizer TEXT,",
    "  source_url TEXT,",
    "  title TEXT,",
    "  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,",
    "  updated_at TEXT NOT NULL",
    ");",
    "CREATE INDEX IF NOT EXISTS opportunity_analyses_updated_at_idx",
    "  ON opportunity_analyses (updated_at DESC);",
  ].join("\n"));
}

export function getLocalOpportunityConfig(environment = process.env) {
  const enabled = readBoolean(environment.ALLOW_LOCAL_PERSISTENCE, true);

  return {
    databasePath: readDatabasePath(environment.LOCAL_DATABASE_PATH),
    enabled,
    configured: enabled,
  };
}

export function createLocalOpportunityRepository(options = {}) {
  const environmentConfig = getLocalOpportunityConfig(options.environment);
  const enabled = options.enabled ?? environmentConfig.enabled;
  const databasePath = options.databasePath ?? environmentConfig.databasePath;
  let database = options.database ?? null;

  if (enabled && !database) {
    mkdirSync(dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
  }

  if (database) {
    initializeDatabase(database);
  }

  const configured = enabled && Boolean(database);

  function ensureConfigured() {
    if (!enabled || !configured) {
      throw createRepositoryError(
        "로컬 데모 저장소가 비활성화되어 있습니다. ALLOW_LOCAL_PERSISTENCE=true로 설정해주세요.",
        "persistence_disabled",
      );
    }
  }

  return {
    configured,
    databasePath,
    provider: "sqlite",

    async listAnalyses(limit = 12) {
      ensureConfigured();

      const rows = database.prepare([
        "SELECT id, analysis_result, created_at, updated_at",
        "FROM opportunity_analyses",
        "ORDER BY updated_at DESC",
        "LIMIT ?",
      ].join("\n")).all(limit);

      return rows.map(fromDatabaseRow);
    },

    async saveAnalysis(analysis) {
      ensureConfigured();

      const row = toDatabaseRow(analysis);
      database.prepare([
        "INSERT INTO opportunity_analyses (",
        "  analysis_id, analysis_result, category, deadline, organizer, source_url, title, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        "ON CONFLICT(analysis_id) DO UPDATE SET",
        "  analysis_result = excluded.analysis_result,",
        "  category = excluded.category,",
        "  deadline = excluded.deadline,",
        "  organizer = excluded.organizer,",
        "  source_url = excluded.source_url,",
        "  title = excluded.title,",
        "  updated_at = excluded.updated_at",
      ].join("\n")).run(
        row.analysisId,
        row.analysisResult,
        row.category,
        row.deadline,
        row.organizer,
        row.sourceUrl,
        row.title,
        row.updatedAt,
      );

      const record = database.prepare([
        "SELECT id, analysis_result, created_at, updated_at",
        "FROM opportunity_analyses",
        "WHERE analysis_id = ?",
      ].join("\n")).get(row.analysisId);

      return fromDatabaseRow(record);
    },

    close() {
      database?.close();
    },
  };
}
