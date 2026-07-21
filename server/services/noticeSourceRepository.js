const TABLE_NAME = "notice_sources";
const SELECT_FIELDS = [
  "id",
  "category",
  "html_source",
  "link_selector",
  "name",
  "source_mode",
  "target_url",
  "created_at",
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
      "저장된 출처 테이블이 준비되지 않았습니다. Supabase SQL Editor에서 20260721_notice_sources.sql을 실행해 주세요.",
      "notice_source_schema_missing",
    );
  }
  if (error?.code === "42501") {
    return repositoryError("저장된 출처 접근 권한을 확인해 주세요. 로그아웃 후 다시 로그인해 보세요.", "notice_source_access_denied");
  }
  return repositoryError(`출처 ${operation}에 실패했습니다. 잠시 후 다시 시도해 주세요.`, `notice_source_${operation}_failed`);
}

function fromRow(row) {
  if (!row) return null;

  return {
    category: row.category || "직접 추가",
    html: row.html_source || "",
    id: `custom:${row.id}`,
    knownUrls: [],
    linkSelector: row.link_selector || "a[href]",
    name: row.name,
    sourceMode: row.source_mode || "live",
    targetUrl: row.target_url,
    updatedAt: row.updated_at || row.created_at || null,
  };
}

function toRow(source, userId) {
  return {
    category: source.category,
    html_source: source.html,
    link_selector: source.linkSelector,
    name: source.name,
    source_mode: source.sourceMode,
    target_url: source.targetUrl,
    user_id: userId,
  };
}

export function createNoticeSourceRepository({ createUserClient }) {
  function clientFor(accessToken) {
    const client = createUserClient(accessToken);
    if (!client) throw repositoryError("인증 서버가 설정되지 않았습니다.", "notice_source_storage_unavailable");
    return client;
  }

  return {
    async listSources({ accessToken, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw storageError(error, "불러오기");
      return (data || []).map(fromRow);
    },

    async upsertSource({ accessToken, source, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .upsert(toRow(source, userId), { onConflict: "user_id,target_url" })
        .select(SELECT_FIELDS)
        .single();

      if (error) throw storageError(error, "저장");
      return fromRow(data);
    },

    async deleteSource({ accessToken, sourceId, userId }) {
      const { error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .delete()
        .eq("id", sourceId)
        .eq("user_id", userId);

      if (error) throw storageError(error, "삭제");
    },
  };
}