#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  createRequestBody,
  createResultFileName,
  parseJsonContent,
  parseModelList,
  validateTechnicalChallengeResponse,
} from "./evaluate-openai-models.lib.mjs";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_ENV_FILE = "apps/api/.env";
const DEFAULT_FIXTURE = "scripts/fixtures/technical-challenge-request.example.json";
const DEFAULT_OUTPUT_DIR = "docs/research/model-evaluation/results";

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const rootDirectory = process.cwd();
  await loadEnvFile(resolveFromRoot(options.envFile, rootDirectory));

  const apiKey = process.env.AI_API_KEY?.trim();
  const configuredModels = options.models || process.env.EVAL_MODELS || process.env.AI_MODEL;
  const models = parseModelList(configuredModels);

  if (!apiKey) {
    throw new Error("AI_API_KEY가 없습니다. apps/api/.env 또는 환경 변수를 확인해 주세요.");
  }

  if (models.length === 0) {
    throw new Error("비교할 모델이 없습니다. --models 또는 AI_MODEL을 지정해 주세요.");
  }

  const fixturePath = resolveFromRoot(options.fixture, rootDirectory);
  const outputDirectory = resolveFromRoot(options.outputDir, rootDirectory);
  const fixture = await loadFixture(fixturePath);
  await mkdir(outputDirectory, { recursive: true });

  const failures = [];

  for (const model of models) {
    for (let run = 1; run <= options.runs; run += 1) {
      const result = await evaluateModel({ apiKey, fixture, model, run });
      const outputPath = resolve(outputDirectory, createResultFileName(model, run));

      await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      const state = !result.ok ? "error" : result.contractValidation.valid ? "ok" : "contract-invalid";
      console.log(`[${state}] ${model} run ${run} (${result.latencyMs}ms) -> ${outputPath}`);

      if (!result.ok) {
        failures.push(`${model} run ${run}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`실패한 실행: ${failures.join(", ")}`);
  }
}

async function evaluateModel({ apiKey, fixture, model, run }) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const requestBody = createRequestBody(model, fixture);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const rawBody = await response.text();
    const responseBody = parseResponseBody(rawBody);
    const parsedResponse = responseBody ? parseJsonContent(responseBody) : null;
    const contractValidation = validateTechnicalChallengeResponse(parsedResponse);

    return {
      schemaVersion: 1,
      startedAt,
      model,
      run,
      latencyMs: Math.round(performance.now() - started),
      status: response.status,
      ok: response.ok,
      responseModel: responseBody?.model ?? null,
      usage: responseBody?.usage ?? null,
      parsedResponse,
      contractValidation,
      rawResponse: rawBody,
      error: response.ok ? null : getProviderError(responseBody, response.status),
    };
  } catch (error) {
    return {
      schemaVersion: 1,
      startedAt,
      model,
      run,
      latencyMs: Math.round(performance.now() - started),
      status: null,
      ok: false,
      responseModel: null,
      usage: null,
      parsedResponse: null,
      contractValidation: validateTechnicalChallengeResponse(null),
      rawResponse: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function loadFixture(fixturePath) {
  const value = JSON.parse(await readFile(fixturePath, "utf8"));

  if (
    !value ||
    typeof value.systemPrompt !== "string" ||
    typeof value.userPrompt !== "string"
  ) {
    throw new Error("fixture에는 systemPrompt와 userPrompt 문자열이 필요합니다.");
  }

  return value;
}

async function loadEnvFile(envPath) {
  try {
    const content = await readFile(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) {
        continue;
      }

      process.env[match[1]] = removeQuotes(match[2]);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function parseArgs(args) {
  const options = {
    envFile: DEFAULT_ENV_FILE,
    fixture: DEFAULT_FIXTURE,
    outputDir: DEFAULT_OUTPUT_DIR,
    models: null,
    runs: 1,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const nextValue = args[index + 1];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--env-file") options.envFile = nextValue;
    if (argument === "--fixture") options.fixture = nextValue;
    if (argument === "--output-dir") options.outputDir = nextValue;
    if (argument === "--models") options.models = nextValue;
    if (argument === "--runs") options.runs = parsePositiveInteger(nextValue, "--runs");

    if (argument.startsWith("--") && !nextValue) {
      throw new Error(`${argument} 값이 필요합니다.`);
    }

    if (argument.startsWith("--")) {
      index += 1;
    }
  }

  return options;
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName}은 1 이상의 정수여야 합니다.`);
  }
  return parsed;
}

function resolveFromRoot(filePath, rootDirectory) {
  return isAbsolute(filePath) ? filePath : resolve(rootDirectory, filePath);
}

function parseResponseBody(rawBody) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function getProviderError(body, status) {
  const message = body?.error?.message;
  return typeof message === "string" ? `${status}: ${message}` : `OpenAI 요청 실패 (${status})`;
}

function removeQuotes(value) {
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

const USAGE = `Usage:
  npm run evaluate:ai -- --models gpt-4.1-mini,gpt-4.1 --runs 2

Options:
  --models      comma-separated model IDs (default: AI_MODEL or EVAL_MODELS)
  --runs        number of sequential runs per model (default: 1)
  --fixture     fixed request JSON path
  --output-dir  local result directory
  --env-file    env file path (default: apps/api/.env)
  --help        show this message`;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
