import { buildApiUrl } from "./config/apiBaseUrl.js";

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || payload.error || "API 요청 중 오류가 발생했습니다.";
    throw new Error(message);
  }

  return payload;
}

export async function getHealth() {
  const response = await fetch(buildApiUrl("/api/health"), {
    headers: {
      Accept: "application/json",
    },
  });

  return readJsonResponse(response);
}

export async function getNoticeSources() {
  const response = await fetch(buildApiUrl("/api/sources"), {
    headers: { Accept: "application/json" },
  });

  return readJsonResponse(response);
}

export async function discoverNotices({ sourceId, keyword = "", limit = 20 }) {
  const query = new URLSearchParams({
    sourceId,
    keyword,
    limit: String(limit),
  });
  const response = await fetch(buildApiUrl(`/api/discover?${query.toString()}`), {
    headers: { Accept: "application/json" },
  });

  return readJsonResponse(response);
}

export async function analyzeOpportunity(payload) {
  const response = await fetch(buildApiUrl("/api/analyze"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse(response);
}

export async function getSavedOpportunities(accessToken) {
  const endpoint = accessToken ? "/api/saved-opportunities?limit=100" : "/api/opportunities?limit=100";
  const response = await fetch(buildApiUrl(endpoint), {
    headers: accessToken ? createAuthorizationHeaders(accessToken) : { Accept: "application/json" },
  });

  return readJsonResponse(response);
}

export async function saveOpportunity(analysis, accessToken) {
  const endpoint = accessToken ? "/api/saved-opportunities" : "/api/opportunities";
  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers: accessToken
      ? createAuthorizationHeaders(accessToken, true)
      : { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ analysis }),
  });

  return readJsonResponse(response);
}

export async function deleteSavedOpportunity(storageId, accessToken) {
  const endpoint = accessToken
    ? `/api/saved-opportunities/${encodeURIComponent(storageId)}`
    : `/api/opportunities/${encodeURIComponent(storageId)}`;
  const response = await fetch(buildApiUrl(endpoint), {
    method: "DELETE",
    headers: accessToken ? createAuthorizationHeaders(accessToken) : { Accept: "application/json" },
  });
  if (!response.ok) await readJsonResponse(response);
}

export async function getRecommendationSites() {
  const response = await fetch(buildApiUrl("/api/sites"), { headers: { Accept: "application/json" } });
  return readJsonResponse(response);
}

export async function recommendSites(payload) {
  const response = await fetch(buildApiUrl("/api/recommend-sites"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response);
}

function createAuthorizationHeaders(accessToken, includeJson = false) {
  if (!accessToken) throw new Error("로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.");
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  };
}

export async function getProfile(accessToken) {
  const response = await fetch(buildApiUrl("/api/profile"), {
    headers: createAuthorizationHeaders(accessToken),
  });
  return readJsonResponse(response);
}

export async function saveProfile(profile, accessToken) {
  const response = await fetch(buildApiUrl("/api/profile"), {
    method: "PUT",
    headers: createAuthorizationHeaders(accessToken, true),
    body: JSON.stringify(profile),
  });
  return readJsonResponse(response);
}

export async function deleteProfile(accessToken) {
  const response = await fetch(buildApiUrl("/api/profile"), {
    method: "DELETE",
    headers: createAuthorizationHeaders(accessToken),
  });
  if (!response.ok) await readJsonResponse(response);
}
export async function getUserSettings(accessToken) {
  const response = await fetch(buildApiUrl("/api/settings"), {
    headers: createAuthorizationHeaders(accessToken),
  });
  return readJsonResponse(response);
}

export async function saveUserSettings(settings, accessToken) {
  const response = await fetch(buildApiUrl("/api/settings"), {
    method: "PUT",
    headers: createAuthorizationHeaders(accessToken, true),
    body: JSON.stringify(settings),
  });
  return readJsonResponse(response);
}

export async function resetUserSettings(accessToken) {
  const response = await fetch(buildApiUrl("/api/settings/reset"), {
    method: "POST",
    headers: createAuthorizationHeaders(accessToken),
  });
  return readJsonResponse(response);
}
export async function getSavedNoticeSources(accessToken) {
  const response = await fetch(buildApiUrl("/api/notice-sources"), {
    headers: createAuthorizationHeaders(accessToken),
  });
  return readJsonResponse(response);
}

export async function saveNoticeSource(source, accessToken) {
  const response = await fetch(buildApiUrl("/api/notice-sources"), {
    method: "POST",
    headers: createAuthorizationHeaders(accessToken, true),
    body: JSON.stringify(source),
  });
  return readJsonResponse(response);
}

export async function deleteNoticeSource(sourceId, accessToken) {
  const response = await fetch(buildApiUrl(`/api/notice-sources/${encodeURIComponent(String(sourceId).replace(/^custom:/, ""))}`), {
    method: "DELETE",
    headers: createAuthorizationHeaders(accessToken),
  });
  if (!response.ok) await readJsonResponse(response);
}