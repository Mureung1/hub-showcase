import cors from "cors";
import dotenv from "dotenv";
import express from "express";
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

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";

app.use(cors({ origin: true }));
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
  });
});

app.get("/api/fetch-html", async (request, response) => {
  const targetUrl = request.query.url;

  try {
    const { html, status } = await fetchUrlHtml(targetUrl);

    response.status(status);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("X-Opportunity-Agent-Proxy", "html-fetch-proxy");
    response.send(html);
  } catch (error) {
    response.setHeader("X-Opportunity-Agent-Proxy", "html-fetch-proxy");
    sendJson(response, getFetchErrorStatus(error), {
      error: "failed_to_fetch_target_url",
      message: error?.message || "대상 웹사이트 HTML을 가져오지 못했습니다.",
    });
  }
});

app.post("/api/analyze", async (request, response) => {
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

app.use((request, response) => {
  sendJson(response, 404, {
    error: "not_found",
    message: "요청한 API 경로를 찾을 수 없습니다.",
  });
});

const server = app.listen(port, host, () => {
  const config = getAIConfig();
  console.log(`Opportunity Agent API server running on http://${host}:${port}`);
  console.log(`AI provider: ${config.aiProvider}, live AI: ${config.liveAIEnabled}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Close the existing API server and run start-uniradar-dev.cmd again.`);
    process.exit(1);
  }

  console.error("API server failed to start.");
  process.exit(1);
});