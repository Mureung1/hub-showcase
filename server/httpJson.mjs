import { ApiError } from "./apiErrors.mjs";

export const MAX_JSON_BODY_BYTES = 256 * 1024;

export function setApiHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function writeData(res, status, data, headers = undefined) {
  setApiHeaders(res);
  setResponseHeaders(res, headers);
  res.statusCode = status;
  res.end(JSON.stringify({ data }));
}

export function writeApiError(res, error) {
  setApiHeaders(res);
  setResponseHeaders(res, error.headers);
  res.statusCode = error.status || 500;
  res.end(
    JSON.stringify({
      error: {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message || "요청을 처리하지 못했습니다.",
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    }),
  );
}

export async function readJson(req, options = {}) {
  const maxBytes = options.maxBytes || MAX_JSON_BODY_BYTES;
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type은 application/json이어야 합니다.",
    );
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    req.resume();
    throw new ApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.");
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > maxBytes) {
      throw new ApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다.");
    }
    chunks.push(chunk);
  }

  try {
    const text = Buffer.concat(chunks).toString("utf8");
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "INVALID_JSON", "올바른 JSON 본문이 아닙니다.");
  }
}

export function allowOnly(req, res, methods) {
  if (req.method === "OPTIONS") {
    setApiHeaders(res);
    res.setHeader("Allow", [...methods, "OPTIONS"].join(", "));
    res.statusCode = 204;
    res.end();
    return false;
  }

  if (!methods.includes(req.method)) {
    throw new ApiError(
      405,
      "METHOD_NOT_ALLOWED",
      "지원하지 않는 요청 메서드입니다.",
      undefined,
      { Allow: [...methods, "OPTIONS"].join(", ") },
    );
  }
  return true;
}

function setResponseHeaders(res, headers) {
  if (!headers) return;
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
}
