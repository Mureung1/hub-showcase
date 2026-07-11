// @ts-expect-error The existing API is intentionally shared from JavaScript modules.
import { createApiV1Handler } from "../server/apiV1.mjs";
// @ts-expect-error The legacy compatibility handler is a JavaScript module.
import { handleContextAnalysisRequest } from "../server/contextAnalysisApi.mjs";
import {
  createNodeHttpAdapters,
  type NodeRequestAdapter,
  type NodeResponseAdapter,
} from "./node-http-adapter";

type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type SitesEnvironment = {
  ASSETS: AssetsBinding;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  MODU_BRAIN_ANALYSIS_PROVIDER?: string;
  MODU_BRAIN_OPENAI_ENABLED?: string;
  MODU_BRAIN_OPENAI_MODEL?: string;
  MODU_BRAIN_OPENAI_REASONING_EFFORT?: string;
  OPENAI_API_KEY?: string;
  SAFETY_IDENTIFIER_SECRET?: string;
};

const worker = {
  async fetch(request: Request, env: SitesEnvironment) {
    const url = new URL(request.url);

    if (url.pathname === "/api/context-analysis") {
      return runNodeHandler(request, async (nodeRequest, nodeResponse) => {
        await handleContextAnalysisRequest(nodeRequest, nodeResponse, {
          analysisOptions: { provider: "local-heuristic" },
        });
        return true;
      });
    }

    if (url.pathname.startsWith("/api/")) {
      const handler = createApiV1Handler({
        supabase: {
          url: env.SUPABASE_URL,
          publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY,
          secretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
        },
        openAIEnabled:
          String(env.MODU_BRAIN_OPENAI_ENABLED || "").toLowerCase() === "true" &&
          Boolean(env.OPENAI_API_KEY) &&
          Boolean(env.MODU_BRAIN_OPENAI_MODEL),
        analysisOptions: {
          apiKey: env.OPENAI_API_KEY,
          model: env.MODU_BRAIN_OPENAI_MODEL || "gpt-5.6-terra",
          reasoningEffort: env.MODU_BRAIN_OPENAI_REASONING_EFFORT || "low",
          safetyIdentifierSecret: env.SAFETY_IDENTIFIER_SECRET || "",
        },
      });

      return runNodeHandler(request, async (nodeRequest, nodeResponse) => {
        const handled = await handler(nodeRequest, nodeResponse, url.pathname);
        if (!handled) {
          nodeResponse.statusCode = 404;
          nodeResponse.setHeader("Content-Type", "application/json; charset=utf-8");
          nodeResponse.setHeader("Cache-Control", "no-store");
          nodeResponse.end(
            JSON.stringify({ error: { code: "NOT_FOUND", message: "API route not found." } }),
          );
        }
        return true;
      });
    }

    return secureAssetResponse(await env.ASSETS.fetch(request), request, env);
  },
};

async function runNodeHandler(
  request: Request,
  handler: (
    nodeRequest: NodeRequestAdapter,
    nodeResponse: NodeResponseAdapter,
  ) => Promise<boolean>,
) {
  const adapters = await createNodeHttpAdapters(request);
  try {
    await handler(adapters.request, adapters.response);
    return adapters.response.toResponse();
  } finally {
    adapters.dispose();
  }
}

function secureAssetResponse(
  response: Response,
  request: Request,
  env: SitesEnvironment,
) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  let connectSource = "'self'";
  try {
    if (env.SUPABASE_URL) connectSource += ` ${new URL(env.SUPABASE_URL).origin}`;
  } catch {
    // Invalid optional configuration must not weaken the same-origin default.
  }
  headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connectSource}; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default worker;
