import { analyzeResponseSchema } from "../schemas/analyzeSchemas.js";

const TABLE_NAME = "saved_opportunities";
const SELECT_FIELDS = [
  "id",
  "source_url",
  "source_name",
  "title",
  "organizer",
  "category",
  "deadline",
  "opportunity_json",
  "match_json",
  "saved_at",
  "updated_at",
].join(", ");

function repositoryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function storageError(error, operation) {
  if (error?.code === "42P01") {
    return repositoryError(
      "저장 공고 테이블이 준비되지 않았습니다. Supabase SQL Editor에서 20260720_auth_profiles.sql을 실행해 주세요.",
      "saved_opportunity_schema_missing",
    );
  }
  if (error?.code === "42501") {
    return repositoryError("저장 공고 접근 권한을 확인해 주세요. 로그아웃 후 다시 로그인해 보세요.", "saved_opportunity_access_denied");
  }
  return repositoryError(`저장 공고 ${operation}에 실패했습니다. 잠시 후 다시 시도해 주세요.`, `saved_opportunity_${operation}_failed`);
}

function normalizeDeadline(value) {
  const deadline = String(value || "").trim();
  return /^20\d{2}-\d{2}-\d{2}$/.test(deadline) ? deadline : null;
}

function sourceNameFrom(analysis) {
  if (analysis.opportunity.organizer) return analysis.opportunity.organizer;
  try {
    return new URL(analysis.opportunity.sourceUrl).hostname;
  } catch {
    return null;
  }
}

function toRow(analysis, userId) {
  const normalized = analyzeResponseSchema.parse(analysis);
  return {
    category: normalized.opportunity.category,
    deadline: normalizeDeadline(normalized.opportunity.deadline),
    match_json: normalized.match,
    opportunity_json: normalized,
    organizer: normalized.opportunity.organizer,
    source_name: sourceNameFrom(normalized),
    source_url: normalized.opportunity.sourceUrl,
    title: normalized.opportunity.title,
    updated_at: new Date().toISOString(),
    user_id: userId,
  };
}

function fromRow(row) {
  const parsed = analyzeResponseSchema.safeParse(row?.opportunity_json);
  if (!parsed.success) {
    throw repositoryError("저장된 공고 데이터 형식이 올바르지 않습니다.", "invalid_saved_opportunity");
  }

  return {
    ...parsed.data,
    persistedAt: row.updated_at || row.saved_at || null,
    storageId: row.id,
  };
}

export function createSavedOpportunityRepository({ createUserClient }) {
  function clientFor(accessToken) {
    const client = createUserClient(accessToken);
    if (!client) throw repositoryError("인증 서버가 설정되지 않았습니다.", "saved_opportunity_storage_unavailable");
    return client;
  }

  async function findExisting(client, analysis, userId) {
    const sourceUrl = analysis.opportunity.sourceUrl;
    const title = analysis.opportunity.title;
    let query = client.from(TABLE_NAME).select("id").eq("user_id", userId);

    if (sourceUrl) {
      query = query.eq("source_url", sourceUrl);
    } else if (title) {
      query = query.is("source_url", null).eq("title", title);
    } else {
      return null;
    }

    const { data, error } = await query.limit(1);
    if (error) throw storageError(error, "중복 확인");
    return data?.[0] || null;
  }

  return {
    async listOpportunities({ accessToken, limit = 50, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) throw storageError(error, "불러오기");
      return (data || []).map(fromRow);
    },

    async saveOpportunity({ accessToken, analysis, userId }) {
      const normalized = analyzeResponseSchema.parse(analysis);
      const client = clientFor(accessToken);
      const existing = await findExisting(client, normalized, userId);
      const row = toRow(normalized, userId);
      let mutation;

      if (existing) {
        mutation = client.from(TABLE_NAME).update(row).eq("id", existing.id).eq("user_id", userId);
      } else {
        mutation = client.from(TABLE_NAME).insert(row);
      }

      const { data, error } = await mutation.select(SELECT_FIELDS).single();
      if (error) throw storageError(error, "저장");
      return fromRow(data);
    },

    async deleteOpportunity({ accessToken, opportunityId, userId }) {
      const { error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .delete()
        .eq("id", opportunityId)
        .eq("user_id", userId);

      if (error) throw storageError(error, "삭제");
    },
  };
}