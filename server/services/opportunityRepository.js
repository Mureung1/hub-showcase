import { createClient } from "@supabase/supabase-js";

import { analyzeResponseSchema } from "../schemas/analyzeSchemas.js";

const DEFAULT_TABLE_NAME = "opportunity_analyses";
const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;

function readBoolean(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function readText(value) {
  return String(value || "").trim();
}

function readTableName(value) {
  const tableName = readText(value) || DEFAULT_TABLE_NAME;
  return TABLE_NAME_PATTERN.test(tableName) ? tableName : null;
}

function createRepositoryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toDatabaseRow(analysis) {
  const normalizedAnalysis = analyzeResponseSchema.parse(analysis);

  return {
    analysis_id: normalizedAnalysis.id,
    analysis_result: normalizedAnalysis,
    category: normalizedAnalysis.opportunity.category,
    deadline: normalizedAnalysis.opportunity.deadline,
    organizer: normalizedAnalysis.opportunity.organizer,
    source_url: normalizedAnalysis.opportunity.sourceUrl,
    title: normalizedAnalysis.opportunity.title,
    updated_at: new Date().toISOString(),
  };
}

function fromDatabaseRow(record) {
  const parsed = analyzeResponseSchema.safeParse(record.analysis_result);

  if (!parsed.success) {
    throw createRepositoryError("저장된 공고 데이터 형식이 올바르지 않습니다.", "invalid_stored_analysis");
  }

  return {
    ...parsed.data,
    persistedAt: record.updated_at || record.created_at || null,
    storageId: record.id || null,
  };
}

export function getSupabaseOpportunityConfig(environment = process.env) {
  const enabled = readBoolean(environment.ALLOW_SUPABASE_PERSISTENCE);
  const url = readText(environment.SUPABASE_URL);
  const serviceRoleKey = readText(environment.SUPABASE_SERVICE_ROLE_KEY);
  const tableName = readTableName(environment.SUPABASE_OPPORTUNITIES_TABLE);

  return {
    enabled,
    serviceRoleKey,
    tableName,
    url,
    configured: enabled && Boolean(url && serviceRoleKey && tableName),
  };
}

export function createOpportunityRepository(options = {}) {
  const environmentConfig = getSupabaseOpportunityConfig(options.environment);
  const enabled = options.enabled ?? environmentConfig.enabled;
  const tableName = options.tableName ?? environmentConfig.tableName;
  const url = options.url ?? environmentConfig.url;
  const serviceRoleKey = options.serviceRoleKey ?? environmentConfig.serviceRoleKey;
  const canCreateClient = enabled && Boolean(url && serviceRoleKey && tableName);
  const client = options.client ?? (canCreateClient
    ? createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
    : null);
  const configured = enabled && Boolean(tableName && client);

  function ensureConfigured() {
    if (!enabled) {
      throw createRepositoryError(
        "Supabase 저장 기능이 비활성화되어 있습니다. ALLOW_SUPABASE_PERSISTENCE=true로 설정해주세요.",
        "persistence_disabled",
      );
    }

    if (!configured) {
      throw createRepositoryError(
        "Supabase 저장소가 설정되지 않았습니다. 서버 환경변수를 확인해주세요.",
        "storage_not_configured",
      );
    }
  }

  return {
    configured,

    async listAnalyses(limit = 12) {
      ensureConfigured();

      const { data, error } = await client
        .from(tableName)
        .select("id, analysis_result, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw createRepositoryError("저장한 공고를 불러오지 못했습니다.", "storage_read_failed");
      }

      return (data || []).map(fromDatabaseRow);
    },

    async saveAnalysis(analysis) {
      ensureConfigured();

      const row = toDatabaseRow(analysis);
      const { data, error } = await client
        .from(tableName)
        .upsert(row, { onConflict: "analysis_id" })
        .select("id, analysis_result, created_at, updated_at")
        .single();

      if (error) {
        throw createRepositoryError("공고 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "storage_write_failed");
      }

      return fromDatabaseRow(data);
    },
  };
}

