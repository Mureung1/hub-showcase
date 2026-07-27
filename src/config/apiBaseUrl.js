function normalizeApiBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getConfiguredApiBaseUrl(environment = import.meta.env) {
  return normalizeApiBaseUrl(environment?.VITE_API_BASE_URL);
}

export function buildApiUrl(path, apiBaseUrl = getConfiguredApiBaseUrl()) {
  const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${path}`;
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  return normalizedApiBaseUrl ? `${normalizedApiBaseUrl}${normalizedPath}` : normalizedPath;
}