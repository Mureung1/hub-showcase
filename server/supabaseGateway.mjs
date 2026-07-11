import { ApiError } from "./apiErrors.mjs";

export function createSupabaseGateway(options = {}) {
  const url = String(options.url || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey =
    options.publishableKey ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    options.anonKey ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  const secretKey =
    options.secretKey ||
    process.env.SUPABASE_SECRET_KEY ||
    options.serviceRoleKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  const fetchImpl = options.fetch || globalThis.fetch;

  function assertConfigured({ serviceRole = false } = {}) {
    const missing = [];
    if (!url) missing.push("SUPABASE_URL");
    if (!publishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");
    if (serviceRole && !secretKey) missing.push("SUPABASE_SECRET_KEY");
    if (missing.length) {
      throw new ApiError(503, "DATABASE_NOT_CONFIGURED", "데이터베이스 설정이 필요합니다.", {
        missing,
      });
    }
  }

  async function authenticate(accessToken) {
    assertConfigured();
    if (!accessToken) {
      throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }

    let response;
    try {
      response = await fetchImpl(`${url}/auth/v1/user`, {
        headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ApiError(503, "AUTH_SERVICE_UNAVAILABLE", "인증 서비스를 사용할 수 없습니다.");
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApiError(401, "INVALID_ACCESS_TOKEN", "로그인 세션이 유효하지 않습니다.");
    }
    if (!response.ok) {
      throw new ApiError(503, "AUTH_SERVICE_UNAVAILABLE", "인증 서비스를 사용할 수 없습니다.");
    }

    const user = await response.json();
    if (!user?.id) throw new ApiError(401, "INVALID_ACCESS_TOKEN", "로그인 세션이 유효하지 않습니다.");
    return { id: user.id, email: user.email || null, accessToken };
  }

  function forUser(accessToken) {
    assertConfigured();
    return createPostgrestClient({ url, apiKey: publishableKey, accessToken, fetchImpl });
  }

  function asServiceRole() {
    assertConfigured({ serviceRole: true });
    return createPostgrestClient({
      url,
      apiKey: secretKey,
      accessToken: looksLikeJwt(secretKey) ? secretKey : undefined,
      fetchImpl,
    });
  }

  return { authenticate, forUser, asServiceRole, assertConfigured };
}

export function createPostgrestClient({ url, apiKey, accessToken, fetchImpl = globalThis.fetch }) {
  return {
    async request(path, options = {}) {
      const headers = {
        apikey: apiKey,
        Accept: "application/json",
        ...(options.headers || {}),
      };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (options.body !== undefined) headers["Content-Type"] = "application/json";
      if (options.prefer) headers.Prefer = options.prefer;

      let response;
      try {
        response = await fetchImpl(`${url}/rest/v1/${path}`, {
          method: options.method || "GET",
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: options.signal || AbortSignal.timeout(10_000),
        });
      } catch {
        throw new ApiError(503, "DATABASE_UNAVAILABLE", "데이터베이스를 사용할 수 없습니다.");
      }

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) throw mapPostgrestError(response.status, payload);
      return payload;
    },
  };
}

function looksLikeJwt(value) {
  return String(value).split(".").length === 3;
}

function mapPostgrestError(status, payload) {
  const message = String(payload?.message || "");
  if (["PGRST202", "PGRST204", "PGRST205", "42P01", "42883"].includes(payload?.code)) {
    return new ApiError(503, "DATABASE_UNAVAILABLE", "데이터베이스 스키마를 사용할 수 없습니다.");
  }
  if (message.includes("IDEMPOTENCY_CONFLICT")) {
    return new ApiError(409, "IDEMPOTENCY_CONFLICT", "같은 키가 다른 분석 요청에 사용되었습니다.");
  }
  if (message.includes("ANALYSIS_ALREADY_RUNNING") || payload?.code === "23505") {
    return new ApiError(409, "ANALYSIS_ALREADY_RUNNING", "이미 실행 중인 분석이 있습니다.");
  }
  if (message.includes("INVALID_SOURCE_SELECTION")) {
    return new ApiError(400, "INVALID_SOURCE_SELECTION", "선택한 기록을 사용할 수 없습니다.");
  }
  if (message.includes("ANALYSIS_INPUT_TOO_LARGE")) {
    return new ApiError(413, "ANALYSIS_INPUT_TOO_LARGE", "분석 입력은 총 100,000자 이하여야 합니다.");
  }
  if (message.includes("IMPORTED_SOURCE_IMMUTABLE")) {
    return new ApiError(
      409,
      "IMPORTED_SOURCE_IMMUTABLE",
      "가져온 원문의 내용과 시각은 변경할 수 없습니다.",
    );
  }
  if (
    message.includes("INVALID_IMPORT") ||
    message.includes("INVALID_SOURCE_SEGMENT") ||
    message.includes("INVALID_SEGMENT_") ||
    message.includes("INVALID_PARTICIPANTS") ||
    message.includes("INVALID_EXTERNAL_ID") ||
    message.includes("INVALID_SOURCE_") ||
    message.includes("SOURCE_SEGMENTS_TOO_LARGE")
  ) {
    return new ApiError(400, "INVALID_CONTEXT_IMPORT", "가져오기 데이터 형식이 올바르지 않습니다.");
  }
  if (message.includes("RATE_LIMITED")) {
    return new ApiError(429, "RATE_LIMITED", "요청 한도를 초과했습니다.", undefined, {
      "Retry-After": "3600",
    });
  }
  if (payload?.code === "PGRST116") {
    return new ApiError(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
  }
  if (status === 404) {
    return new ApiError(503, "DATABASE_UNAVAILABLE", "데이터베이스 API를 사용할 수 없습니다.");
  }
  if (status === 401 || status === 403 || payload?.code === "42501") {
    return new ApiError(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
  }
  if (status >= 500) {
    return new ApiError(503, "DATABASE_UNAVAILABLE", "데이터베이스를 사용할 수 없습니다.");
  }
  return new ApiError(400, "DATABASE_REQUEST_REJECTED", "데이터베이스 요청이 거부되었습니다.");
}
