import { analyzeProjectContext } from "./contextAnalysisCore.mjs";
import { ContextAnalysisApiError } from "./contextAnalysisErrors.mjs";
import { ApiError } from "./apiErrors.mjs";
import { normalizeContextImport } from "./contextImport.mjs";

// rawText is limited by characters in the domain validator. Keep enough byte
// headroom for 20,000 Korean characters plus the surrounding JSON payload.
const MAX_REQUEST_BODY_BYTES = 100_000;
const MAX_IMPORT_REQUEST_BODY_BYTES = 256 * 1024;
const PUBLIC_IMPORT_LIMIT = 20;
const PUBLIC_IMPORT_WINDOW_MS = 60 * 60 * 1000;
const publicImportBuckets = new Map();

export function createContextAnalysisApiMiddleware(options = {}) {
  return async function contextAnalysisApiMiddleware(req, res, next) {
    const pathname = (req.url || "").split("?")[0];

    if (!["/api/context-analysis", "/api/context-analysis/import"].includes(pathname)) {
      next();
      return;
    }

    await handleContextAnalysisRequest(req, res, options);
  };
}

export async function handleContextAnalysisRequest(req, res, options = {}) {
  setJsonHeaders(res);
  const pathname = (req.url || "").split("?")[0];
  const isImportRequest = pathname === "/api/context-analysis/import";

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    writeJson(res, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "POST 메서드만 지원합니다.",
      },
    });
    return;
  }

  const abortController = new AbortController();
  const abortRequest = () => abortController.abort();
  const abortOnClose = () => {
    if (!res.writableEnded) abortRequest();
  };

  req.once("aborted", abortRequest);
  res.once("close", abortOnClose);

  try {
    const contentType = String(req.headers?.["content-type"] || "").toLowerCase();
    if (contentType && !contentType.includes("application/json")) {
      throw new ContextAnalysisApiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type은 application/json이어야 합니다.",
      );
    }

    if (isImportRequest) {
      assertSameOrigin(req);
      const consumeRateLimit = options.consumeImportRateLimit || consumePublicImportRateLimit;
      const allowed = await consumeRateLimit(clientIp(req), Date.now());
      if (!allowed) {
        throw new ContextAnalysisApiError(
          429,
          "PUBLIC_IMPORT_RATE_LIMITED",
          "공개 가져오기는 시간당 20회까지 사용할 수 있습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    }

    const payload = await readJsonBody(
      req,
      isImportRequest ? MAX_IMPORT_REQUEST_BODY_BYTES : MAX_REQUEST_BODY_BYTES,
    );
    const analyze = options.analyze || analyzeProjectContext;
    const normalizedImport = isImportRequest ? normalizeContextImport(payload) : null;
    const analysisPayload = normalizedImport
      ? { projectTitle: normalizedImport.title, rawText: normalizedImport.content }
      : payload;
    const result = await analyze(analysisPayload, {
      ...(options.analysisOptions || {}),
      signal: abortController.signal,
    });
    if (abortController.signal.aborted || res.destroyed) return;
    writeJson(
      res,
      200,
      normalizedImport
        ? {
            import: {
              provider: normalizedImport.provider,
              title: normalizedImport.title,
              content: normalizedImport.content,
              participantCount: normalizedImport.participants.length,
              segmentCount: normalizedImport.segments.length,
            },
            result,
          }
        : result,
    );
  } catch (error) {
    if (abortController.signal.aborted && (req.aborted || res.destroyed)) return;

    const apiError = error instanceof ApiError
      ? new ContextAnalysisApiError(
        error.status,
        error.code,
        error.message,
        error.details,
      )
      : error;

    if (apiError instanceof ContextAnalysisApiError) {
      if (apiError.code === "PUBLIC_IMPORT_RATE_LIMITED") {
        res.setHeader("Retry-After", "3600");
      }
      writeJson(res, apiError.status, {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
        },
      });
      return;
    }

    writeJson(res, 500, {
      error: {
        code: "INTERNAL_ANALYSIS_ERROR",
        message: "맥락 분석 중 서버 오류가 발생했습니다.",
      },
    });
  } finally {
    req.off("aborted", abortRequest);
    res.off("close", abortOnClose);
  }
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = MAX_REQUEST_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodyBytes = 0;
    let settled = false;

    const contentLength = Number(req.headers?.["content-length"] || 0);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      settled = true;
      req.resume();
      reject(new ContextAnalysisApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다."));
      return;
    }

    req.on("data", (chunk) => {
      if (settled) return;

      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > maxBytes) {
        settled = true;
        reject(new ContextAnalysisApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다."));
        return;
      }

      body += chunk;
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;

      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new ContextAnalysisApiError(400, "INVALID_JSON", "요청 본문을 JSON으로 파싱할 수 없습니다."));
      }
    });

    req.on("error", () => {
      if (settled) return;
      settled = true;
      reject(new ContextAnalysisApiError(400, "REQUEST_STREAM_ERROR", "요청 본문을 읽을 수 없습니다."));
    });
  });
}

function assertSameOrigin(req) {
  const origin = String(req.headers?.origin || "").trim();
  if (!origin) return;

  const forwardedHost = String(req.headers?.["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || String(req.headers?.host || "").trim();
  const forwardedProtocol = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol || (req.socket?.encrypted ? "https" : "http");

  let expectedOrigin;
  try {
    expectedOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    throw new ContextAnalysisApiError(403, "INVALID_ORIGIN", "요청 출처를 확인할 수 없습니다.");
  }

  let requestOrigin;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    throw new ContextAnalysisApiError(403, "INVALID_ORIGIN", "요청 출처를 확인할 수 없습니다.");
  }

  if (requestOrigin !== expectedOrigin) {
    throw new ContextAnalysisApiError(403, "INVALID_ORIGIN", "같은 사이트에서 보낸 요청만 허용합니다.");
  }
}

function clientIp(req) {
  return String(
    req.headers?.["cf-connecting-ip"] ||
      req.headers?.["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown",
  )
    .split(",")[0]
    .trim();
}

function consumePublicImportRateLimit(key, now) {
  for (const [bucketKey, bucket] of publicImportBuckets) {
    if (bucket.resetAt <= now) publicImportBuckets.delete(bucketKey);
  }

  const current = publicImportBuckets.get(key);
  if (!current || current.resetAt <= now) {
    publicImportBuckets.set(key, { count: 1, resetAt: now + PUBLIC_IMPORT_WINDOW_MS });
    return true;
  }
  if (current.count >= PUBLIC_IMPORT_LIMIT) return false;
  current.count += 1;
  return true;
}
