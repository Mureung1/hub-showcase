const TABLE_NAME = "profiles";

function repositoryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeUpdatedAt(value) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.user_id,
    updatedAt: normalizeUpdatedAt(row.updated_at),
    school: row.school,
    grade: row.grade,
    majors: Array.isArray(row.majors) ? row.majors : [],
    interests: Array.isArray(row.interests) ? row.interests : [],
    regions: Array.isArray(row.regions) ? row.regions : [],
    canJoinTeam: row.can_join_team,
    availableHoursPerWeek: row.available_hours_per_week,
    gpa: row.gpa === null ? null : Number(row.gpa),
    incomeBracket: row.income_bracket,
    languageScores: Array.isArray(row.language_scores) ? row.language_scores : [],
  };
}

function toRow(profile, userId) {
  return {
    user_id: userId,
    school: profile.school,
    grade: profile.grade,
    majors: profile.majors,
    interests: profile.interests,
    regions: profile.regions,
    can_join_team: profile.canJoinTeam,
    available_hours_per_week: profile.availableHoursPerWeek,
    gpa: profile.gpa,
    income_bracket: profile.incomeBracket,
    language_scores: profile.languageScores,
  };
}

export function createProfileRepository({ createUserClient }) {
  function clientFor(accessToken) {
    const client = createUserClient(accessToken);
    if (!client) throw repositoryError("인증 서버가 설정되지 않았습니다.", "profile_storage_unavailable");
    return client;
  }

  return {
    async getProfile({ accessToken, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .select("user_id, school, grade, majors, interests, regions, can_join_team, available_hours_per_week, gpa, income_bracket, language_scores, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw repositoryError("프로필을 불러오지 못했습니다.", "profile_read_failed");
      return fromRow(data);
    },
    async upsertProfile({ accessToken, profile, userId }) {
      const { data, error } = await clientFor(accessToken)
        .from(TABLE_NAME)
        .upsert(toRow(profile, userId), { onConflict: "user_id" })
        .select("user_id, school, grade, majors, interests, regions, can_join_team, available_hours_per_week, gpa, income_bracket, language_scores, updated_at")
        .single();
      if (error) throw repositoryError("프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", "profile_write_failed");
      return fromRow(data);
    },
    async deleteProfile({ accessToken, userId }) {
      const { error } = await clientFor(accessToken).from(TABLE_NAME).delete().eq("user_id", userId);
      if (error) throw repositoryError("프로필 초기화에 실패했습니다. 잠시 후 다시 시도해 주세요.", "profile_delete_failed");
    },
  };
}
