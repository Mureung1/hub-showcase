import { ContextAnalysisApiError, analyzeProjectContext } from "./contextAnalysisCore.mjs";

export function createContextAnalysisApiMiddleware() {
  return async function contextAnalysisApiMiddleware(req, res, next) {
    const pathname = (req.url || "").split("?")[0];

    if (pathname !== "/api/context-analysis") {
      next();
      return;
    }

    await handleContextAnalysisRequest(req, res);
  };
}

export async function handleContextAnalysisRequest(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "POST 메서드만 지원합니다.",
      },
    });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const result = analyzeProjectContext(payload);
    writeJson(res, 200, result);
  } catch (error) {
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
  }
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25000) {
        reject(new ContextAnalysisApiError(413, "REQUEST_TOO_LARGE", "요청 본문이 너무 큽니다."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new ContextAnalysisApiError(400, "INVALID_JSON", "요청 본문을 JSON으로 파싱할 수 없습니다."));
      }
    });

    req.on("error", () => {
      reject(new ContextAnalysisApiError(400, "REQUEST_STREAM_ERROR", "요청 본문을 읽을 수 없습니다."));
    });
  });
}
