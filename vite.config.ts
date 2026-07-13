import { execFileSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { sites } from "./build/sites-vite-plugin";

const serverEnvironmentKeys = [
  "MODU_BRAIN_ANALYSIS_PROVIDER",
  "MODU_BRAIN_OPENAI_ENABLED",
  "MODU_BRAIN_OPENAI_MODEL",
  "MODU_BRAIN_OPENAI_REASONING_EFFORT",
  "OPENAI_API_KEY",
  "SAFETY_IDENTIFIER_SECRET",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
];

export default defineConfig(async ({ mode, command }) => {
  const fileEnvironment = loadEnv(mode, process.cwd(), "");

  for (const key of serverEnvironmentKeys) {
    if (!process.env[key] && fileEnvironment[key]) process.env[key] = fileEnvironment[key];
  }

  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/wrangler.log";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  if (command === "serve") {
    process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV ??= "true";
  }

  const { cloudflare } = await import("@cloudflare/vite-plugin");
  const commit = resolveBuildCommit();
  const builtAt = new Date().toISOString();
  const buildId =
    process.env.RENDER_DEPLOY_ID ||
    (process.env.GITHUB_RUN_ID
      ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
      : commit) ||
    `local-${Date.now().toString(36)}`;

  return {
    define: {
      "globalThis.__MODU_BRAIN_BUILD_METADATA__": JSON.stringify({
        commit,
        buildId,
        builtAt,
      }),
    },
    plugins: [
      react(),
      sites(),
      cloudflare({ configPath: "./wrangler.sites.jsonc" }),
    ],
  };
});

function resolveBuildCommit() {
  for (const candidate of [process.env.RENDER_GIT_COMMIT, process.env.SOURCE_VERSION]) {
    const normalized = String(candidate || "").trim().toLowerCase();
    if (/^[0-9a-f]{7,40}$/.test(normalized)) return normalized;
  }
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().toLowerCase();
    return /^[0-9a-f]{7,40}$/.test(commit) ? commit : null;
  } catch {
    return null;
  }
}
