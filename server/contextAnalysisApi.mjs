import { analyzeProjectContext } from "./contextAnalysisCore.mjs";
import { ContextAnalysisApiError } from "./contextAnalysisErrors.mjs";

// rawText is limited by characters in the domain validator. Keep enough byte
// headroom for 20,000 Korean characters plus the surrounding JSON payload.
const MAX_REQUEST_BODY_BYTES = 100_000;

export function createContextAnalysisApiMiddleware(options = {}) {
  return async function contextAnalysisApiMiddleware(req, res, next) {
    const pathname = (req.url || "").split("?")[0];

    if (pathname !== "/api/context-analysis") {
      next();
      return;
    }

    await handleContextAnalysisRequest(req, res, options);
  };
}

export async function handleContextAnalysisRequest(req, res, options = {}) {
  setJsonHeaders(res);

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

    const payload = await readJsonBody(req);
    const analyze = options.analyze || analyzeProjectContext;
    const result = await analyze(payload, {
      ...(options.analysisOptions || {}),
      signal: abortController.signal,
    });
    if (abortController.signal.aborted || res.destroyed) return;
    writeJson(res, 200, result);
  } catch (error) {
    if (abortController.signal.aborted && (req.aborted || res.destroyed)) return;

    if (error instanceof ContextAnalysisApiError) {
      writeJson(res, error.status, {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodyBytes = 0;
    let settled = false;

    const contentLength = Number(req.headers?.["content-length"] || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      settled = true;
      req.resume();
      reject(new ContextAnalysisApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다."));
      return;
    }

    req.on("data", (chunk) => {
      if (settled) return;

      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > MAX_REQUEST_BODY_BYTES) {
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
