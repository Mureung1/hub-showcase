import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { getRuntimeConfig } from "./config/runtimeConfig.js";
import { analyzeOpportunity, getAIConfig } from "./services/analyzeOpportunity.js";
import {
  OpportunityTextFetchError,
  fetchOpportunityTextFromUrl,
  fetchUrlHtml,
} from "./services/fetchOpportunityText.js";
import {
  analyzeRequestSchema,
  formatZodError,
} from "./schemas/analyzeSchemas.js";
import {
  createCorsOptions,
  handleCorsError,
  securityHeaders,
} from "./middleware/httpSecurity.js";
import { createFixedWindowRateLimit } from "./middleware/rateLimit.js";

dotenv.config();

const runtimeConfig = getRuntimeConfig();
const app = express();
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const clientDistDirectory = resolve(serverDirectory, "..", "dist");
const clientIndexPath = resolve(clientDistDirectory, "index.html");
const analyzeRateLimit = createFixedWindowRateLimit({
  enabled: runtimeConfig.analyzeRateLimitEnabled,
  maxRequests: runtimeConfig.analyzeRateLimitMax,
  windowMs: runtimeConfig.analyzeRateLimitWindowMs,
});

app.disable("x-powered-by");
if (runtimeConfig.trustProxy) app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(cors({
  ...createCorsOptions(runtimeConfig.allowedOrigins),
  exposedHeaders: ["X-Opportunity-Agent-Proxy", "X-Opportunity-Agent-Final-Url"],
}));
app.use(express.json({ limit: "1mb" }));

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function getFetchErrorStatus(error) {
  return error instanceof OpportunityTextFetchError ? error.statusCode : 502;
}

async function createAnalyzePayload(requestPayload) {
  const rawText = requestPayload.rawText?.trim() || "";

  if (rawText) {
    return {
      ...requestPayload,
      rawText,
      url: requestPayload.url || undefined,
    };
  }

  if (!requestPayload.url) {
    throw new OpportunityTextFetchError("URL 또는 공고 본문을 입력해주세요.", { statusCode: 400 });
  }

  const fetched = await fetchOpportunityTextFromUrl(requestPayload.url);

  return {
    ...requestPayload,
    rawText: fetched.rawText,
    url: fetched.finalUrl || requestPayload.url,
  };
}

app.get("/api/health", (request, response) => {
  const config = getAIConfig();

  sendJson(response, 200, {
    ok: true,
    aiProvider: config.aiProvider,
    liveAIEnabled: config.liveAIEnabled,
    liveGeminiEnabled: config.liveGeminiEnabled,
    liveOpenAIEnabled: config.liveOpenAIEnabled,
    serveClient: runtimeConfig.serveClient,
  });
});

app.get("/api/fetch-html", async (request, response) => {
  const targetUrl = request.query.url;

  try {
    const { finalUrl, html, status } = await fetchUrlHtml(targetUrl);

    response.status(status);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("X-Opportunity-Agent-Proxy", "html-fetch-proxy");
    response.setHeader("X-Opportunity-Agent-Final-Url", finalUrl);
    response.send(html);
  } catch (error) {
    response.setHeader("X-Opportunity-Agent-Proxy", "html-fetch-proxy");
    sendJson(response, getFetchErrorStatus(error), {
      error: "failed_to_fetch_target_url",
      message: error?.message || "대상 웹사이트 HTML을 가져오지 못했습니다.",
    });
  }
});

app.post("/api/analyze", analyzeRateLimit, async (request, response) => {
  const validation = analyzeRequestSchema.safeParse(request.body);

  if (!validation.success) {
    sendJson(response, 400, {
      error: "invalid_request",
      message: formatZodError(validation.error),
    });
    return;
  }

  try {
    const analysisPayload = await createAnalyzePayload(validation.data);
    const result = await analyzeOpportunity(analysisPayload);
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof OpportunityTextFetchError) {
      sendJson(response, error.statusCode, {
        error: "notice_text_fetch_failed",
        message: error.message,
      });
      return;
    }

    sendJson(response, 500, {
      error: "analysis_failed",
      message: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
});

if (runtimeConfig.serveClient) {
  if (!existsSync(clientIndexPath)) {
    console.error("Frontend build was not found. Run npm run build before starting production mode.");
    process.exit(1);
  }

  app.use(express.static(clientDistDirectory, {
    index: false,
    maxAge: runtimeConfig.isProduction ? "1h" : 0,
  }));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.setHeader("Cache-Control", "no-store");
    response.sendFile(clientIndexPath, (error) => {
      if (error) next(error);
    });
  });
}

app.use((request, response) => {
  sendJson(response, 404, {
    error: "not_found",
    message: "요청한 API 경로를 찾을 수 없습니다.",
  });
});

app.use(handleCorsError);
app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error(`Request failed: ${request.method} ${request.path} - ${error?.message || "unknown error"}`);
  sendJson(response, 500, {
    error: "internal_server_error",
    message: "서버 요청 처리 중 오류가 발생했습니다.",
  });
});

const server = app.listen(runtimeConfig.port, runtimeConfig.host, () => {
  const config = getAIConfig();
  const localUrl = `http://${runtimeConfig.host}:${runtimeConfig.port}`;

  console.log(`Opportunity Agent server running on ${runtimeConfig.publicUrl || localUrl}`);
  console.log(`Runtime: ${runtimeConfig.nodeEnv}, serves client: ${runtimeConfig.serveClient}`);
  console.log(`AI provider: ${config.aiProvider}, live AI: ${config.liveAIEnabled}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${runtimeConfig.port} is already in use. Close the existing server and run start-uniradar-dev.cmd again.`,
    );
    process.exit(1);
  }

  console.error("Server failed to start.");
  process.exit(1);
});
