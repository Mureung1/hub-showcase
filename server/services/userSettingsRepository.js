import { createDefaultUserSettings, normalizeUserSettings } from "../../src/constants/userSettings.js";

const TABLE_NAME = "user_settings";
const SELECT_FIELDS = [
  "recommendation_categories",
  "preferred_regions",
  "include_online",
  "minimum_match_score",
  "include_unknown_deadline",
  "auto_save_analyzed_opportunities",
  "recommendation_limit",
].join(", ");

function repositoryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function fromRow(row) {
  if (!row) return null;

  return normalizeUserSettings({
    recommendationCategories: row.recommendation_categories,
    preferredRegions: row.preferred_regions,
    includeOnline: row.include_online,
    minimumMatchScore: row.minimum_match_score,
    includeUnknownDeadline: row.include_unknown_deadline,
    autoSaveAnalyzedOpportunities: row.auto_save_analyzed_opportunities,
    recommendationLimit: row.recommendation_limit,
  });
}

function toRow(settings, userId) {
  const normalized = normalizeUserSettings(settings);

  return {
    user_id: userId,
    recommendation_categories: normalized.recommendationCategories,
    preferred_regions: normalized.preferredRegions,
    include_online: normalized.includeOnline,
    minimum_match_score: normalized.minimumMatchScore,
    include_unknown_deadline: normalized.includeUnknownDeadline,
    auto_save_analyzed_opportunities: normalized.autoSaveAnalyzedOpportunities,
    recommendation_limit: normalized.recommendationLimit,
  };
}

export function createUserSettingsRepository({ createUserClient }) {
  function clientFor(accessToken) {
    const client = createUserClient(accessToken);
    if (!client) throw repositoryError("인증 서버가 설정되지 않았습니다.", "settings_storage_unavailable");
    return client;
  }

  return {
    async getSettings({ accessToken, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw repositoryError("개인 설정을 불러오지 못했습니다.", "settings_read_failed");

      return {
        isDefault: !data,
        settings: data ? fromRow(data) : createDefaultUserSettings(),
      };
    },
    async upsertSettings({ accessToken, settings, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .upsert(toRow(settings, userId), { onConflict: "user_id" })
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        throw repositoryError("개인 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", "settings_write_failed");
      }

      return { isDefault: false, settings: fromRow(data) };
    },
    async resetSettings({ accessToken, userId }) {
      const { error } = await clientFor(accessToken).from(TABLE_NAME).delete().eq("user_id", userId);
      if (error) throw repositoryError("개인 설정 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.", "settings_reset_failed");

      return { isDefault: true, settings: createDefaultUserSettings() };
    },
  };
}