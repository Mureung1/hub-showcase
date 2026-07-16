import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { getRuntimeConfig } from "./config/runtimeConfig.js";
import { analyzeOpportunity, getAIConfig } from "./services/analyzeOpportunity.js";
import { createOpportunityRepository } from "./services/opportunityRepository.js";
import { noticeDiscoveryService } from "./services/noticeDiscoveryService.js";
import { NoticeDiscoveryError } from "./sources/sourceFetch.js";
import { getAvailableNoticeSources } from "./sources/sourceRegistry.js";
import {
  OpportunityTextFetchError,
  fetchOpportunityTextFromUrl,
  fetchUrlHtml,
} from "./services/fetchOpportunityText.js";
import {
  analyzeRequestSchema,
  formatZodError,
  savedOpportunitiesQuerySchema,
  saveOpportunityRequestSchema,
} from "./schemas/analyzeSchemas.js";
import { noticeDiscoveryQuerySchema } from "./schemas/discoverySchemas.js";
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
const discoverRateLimit = createFixedWindowRateLimit({
  enabled: true,
  maxRequests: 12,
  windowMs: 60_000,
  message: "공지 탐색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
const opportunityRepository = createOpportunityRepository();

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

function sendOpportunityStorageError(response, error) {
  const unavailable = ["persistence_disabled", "storage_not_configured"].includes(error?.code);

  sendJson(response, unavailable ? 503 : 500, {
    error: unavailable ? "storage_unavailable" : "storage_failed",
    message: unavailable
      ? error.message
      : "저장 공고 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  });
}

async function createAnalyzePayload(requestPayload) {
  const rawText = requestPayload.rawText?.trim() || "";
  const sourceUrl = requestPayload.url || requestPayload.sourceUrl || undefined;

  if (rawText) {
    return {
      ...requestPayload,
      rawText,
      sourceUrl,
      url: sourceUrl,
    };
  }

  if (!sourceUrl) {
    throw new OpportunityTextFetchError("URL 또는 공고 본문을 입력해주세요.", { statusCode: 400 });
  }

  const fetched = await fetchOpportunityTextFromUrl(sourceUrl);
  const finalSourceUrl = fetched.finalUrl || sourceUrl;

  return {
    ...requestPayload,
    rawText: fetched.rawText,
    sourceUrl: finalSourceUrl,
    url: finalSourceUrl,
  };
}

app.get("/api/health", (request, response) => {
  const config = getAIConfig();

  sendJson(response, 200, {
    ok: true,
    provider: config.provider,
    aiProvider: config.aiProvider,
    geminiConfigured: config.geminiConfigured,
    liveAIEnabled: config.liveAIEnabled,
    liveGeminiEnabled: config.liveGeminiEnabled,
    liveOpenAIEnabled: config.liveOpenAIEnabled,
    serveClient: runtimeConfig.serveClient,
    supabaseConfigured: opportunityRepository.configured,
  });
});

app.get("/api/sources", (request, response) => {
  sendJson(response, 200, { sources: getAvailableNoticeSources() });
});

app.get("/api/discover", discoverRateLimit, async (request, response) => {
  const validation = noticeDiscoveryQuerySchema.safeParse(request.query);

  if (!validation.success) {
    sendJson(response, 400, {
      error: "invalid_request",
      message: formatZodError(validation.error),
    });
    return;
  }

  try {
    const result = await noticeDiscoveryService.discover(validation.data);
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof NoticeDiscoveryError) {
      sendJson(response, error.statusCode, {
        error: error.code,
        message: error.message,
      });
      return;
    }

    sendJson(response, 502, {
      error: "discovery_failed",
      message: "공지 목록을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
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

app.get("/api/opportunities", async (request, response) => {
  const validation = savedOpportunitiesQuerySchema.safeParse(request.query);

  if (!validation.success) {
    sendJson(response, 400, {
      error: "invalid_request",
      message: formatZodError(validation.error),
    });
    return;
  }

  try {
    const items = await opportunityRepository.listAnalyses(validation.data.limit);
    sendJson(response, 200, { items });
  } catch (error) {
    sendOpportunityStorageError(response, error);
  }
});

app.post("/api/opportunities", async (request, response) => {
  const validation = saveOpportunityRequestSchema.safeParse(request.body);

  if (!validation.success) {
    sendJson(response, 400, {
      error: "invalid_request",
      message: formatZodError(validation.error),
    });
    return;
  }

  try {
    const item = await opportunityRepository.saveAnalysis(validation.data.analysis);
    sendJson(response, 201, { item });
  } catch (error) {
    sendOpportunityStorageError(response, error);
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
