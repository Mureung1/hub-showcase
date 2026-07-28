// 로컬에서는 Vite proxy로 상대 경로를 사용하고,
// 프론트·백엔드 분리 배포 시에만 백엔드 origin을 설정한다.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor({ code, message, status = 0, details = null }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(
  path,
  { idToken, body, headers, ...requestOptions } = {},
) {
  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  if (idToken) {
    requestHeaders.set("Authorization", `Bearer ${idToken}`);
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "서버에 연결할 수 없습니다.",
    });
  }
  let result = null;

  try {
    result = await response.json();
  } catch {
    // 공통 오류로 처리
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: result?.error?.code ?? "API_REQUEST_FAILED",
      message: result?.error?.message ?? "요청을 처리하지 못헀습니다.",
      details: result?.error?.details ?? null,
    });
  }

  if (!result || !Object.hasOwn(result, "data")) {
    throw new ApiError({
      status: response.status,
      code: "INVALID_API_RESPONSE",
      message: "서버 응답 형식이 올바르지 않습니다.",
    });
  }

  return result.data;
}
