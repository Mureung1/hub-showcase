import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { analyzeOpportunity, getAIConfig } from "./services/analyzeOpportunity.js";
import {
  analyzeRequestSchema,
  formatZodError,
} from "./schemas/analyzeSchemas.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

app.get("/api/health", (request, response) => {
  const config = getAIConfig();

  sendJson(response, 200, {
    ok: true,
    aiProvider: config.aiProvider,
    liveOpenAIEnabled: config.liveOpenAIEnabled,
  });
});

app.get("/api/fetch-html", async (request, response) => {
  const targetUrl = request.query.url;

  if (!targetUrl || typeof targetUrl !== "string") {
    sendJson(response, 400, { error: "url query parameter is required" });
    return;
  }

  let parsedTargetUrl;

  try {
    parsedTargetUrl = new URL(targetUrl);
  } catch {
    sendJson(response, 400, { error: "invalid url" });
    return;
  }

  if (!["http:", "https:"].includes(parsedTargetUrl.protocol)) {
    sendJson(response, 400, { error: "only http and https urls are allowed" });
    return;
  }

  try {
    const upstreamResponse = await fetch(parsedTargetUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "OpportunityAgentPrototype/0.1",
      },
    });
    const html = await upstreamResponse.text();

    response.status(upstreamResponse.status);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("X-Opportunity-Agent-Proxy", "html-fetch-proxy");
    response.send(html);
  } catch {
    sendJson(response, 502, { error: "failed to fetch target url" });
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
    const result = await analyzeOpportunity(validation.data);
    sendJson(response, 200, result);
  } catch {
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

app.listen(port, () => {
  const config = getAIConfig();
  console.log(`Opportunity Agent API server running on port ${port}`);
  console.log(`AI provider: ${config.aiProvider}, live OpenAI: ${config.liveOpenAIEnabled}`);
});
