import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const argumentsSet = new Set(process.argv.slice(2));
const skipBuild = argumentsSet.has("--skip-build");
const jsonOutput = argumentsSet.has("--json");
const unknownArguments = [...argumentsSet].filter((argument) => ![
  "--skip-build",
  "--json",
  "--help",
].includes(argument));

const requirementGroups = [
  {
    id: "RQ-01",
    title: "표준 분석 결과 구조와 누락값 정규화",
    tests: ["tests/normalizeAnalysisResult.test.js"],
  },
  {
    id: "RQ-02",
    title: "AI provider 안전장치와 분석 입력 검증",
    tests: [
      "tests/analyzeProvider.test.js",
      "tests/analyzeSchemas.test.js",
      "tests/profilelessAnalysis.test.js",
    ],
  },
  {
    id: "RQ-03",
    title: "프로필 localStorage 저장과 민감 정보 제외",
    tests: ["tests/profileSchema.test.js", "tests/profileStore.test.js"],
  },
  {
    id: "RQ-04",
    title: "규칙 기반 지원 가능성 판정",
    tests: ["tests/matchOpportunity.test.js", "tests/languageMatching.test.js"],
  },
  {
    id: "RQ-05",
    title: "프로필 변경 후 API 재호출 없는 재판정",
    tests: ["tests/rematchAnalysisResult.test.js"],
  },
  {
    id: "RQ-06",
    title: "공지 링크 추출, 중복 제거, 순차 분석",
    tests: [
      "tests/noticeLinkDeduplication.test.js",
      "tests/analyzeNoticeLinks.test.js",
    ],
  },
  {
    id: "RQ-07",
    title: "대용량 공고 본문 안전 처리",
    tests: ["tests/fetchOpportunityText.test.js"],
  },
  {
    id: "RQ-08",
    title: "로컬/배포 런타임 보안 기본값",
    tests: ["tests/runtimeInfrastructure.test.js"],
  },
  {
    id: "RQ-09",
    title: "Supabase 단일 테이블 저장 및 조회",
    tests: ["tests/opportunityRepository.test.js"],
  },
  {
    id: "RQ-10",
    title: "등록 출처 기반 공지 탐색",
    tests: [
      "tests/discoverySchemas.test.js",
      "tests/knuNoticesSource.test.js",
      "tests/noticeDiscoveryService.test.js",
    ],
  },
];

function printUsage() {
  console.log("Usage: npm run verify:requirements [-- --skip-build] [-- --json]");
  console.log("The default run executes requirement tests and npm run build.");
}

function runCommand(command, commandArguments) {
  const startedAt = Date.now();
  const result = spawnSync(command, commandArguments, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 180000,
  });

  return {
    durationMs: Date.now() - startedAt,
    ok: !result.error && result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`.trim(),
    error: result.error?.message || null,
    status: result.status,
    signal: result.signal,
  };
}

function summarizeFailure(result) {
  if (result.error) return result.error;
  if (result.signal) return `Process stopped by signal: ${result.signal}`;
  return result.output.slice(-4000) || `Process exited with code ${result.status}.`;
}

function validateTestFiles(testFiles) {
  return testFiles.filter((testFile) => !existsSync(resolve(projectRoot, testFile)));
}

function printResult(result) {
  const status = result.ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.id} ${result.title} (${(result.durationMs / 1000).toFixed(1)}s)`);
  if (!result.ok && result.details) console.log(result.details);
}

if (argumentsSet.has("--help") || unknownArguments.length) {
  printUsage();
  process.exitCode = unknownArguments.length ? 1 : 0;
} else {
  const results = [];

  if (!jsonOutput) {
    console.log("UniRadar requirement validation agent");
    console.log("Real Gemini/OpenAI API calls are not made during this check.");
  }

  for (const requirement of requirementGroups) {
    const missingFiles = validateTestFiles(requirement.tests);
    if (missingFiles.length) {
      const result = {
        ...requirement,
        ok: false,
        durationMs: 0,
        details: `Missing test files: ${missingFiles.join(", ")}`,
      };
      results.push(result);
      if (!jsonOutput) printResult(result);
      continue;
    }

    const commandResult = runCommand(process.execPath, ["--test", ...requirement.tests]);
    const result = {
      ...requirement,
      ok: commandResult.ok,
      durationMs: commandResult.durationMs,
      details: commandResult.ok ? null : summarizeFailure(commandResult),
    };
    results.push(result);
    if (!jsonOutput) printResult(result);
  }

  if (!skipBuild) {
    const buildCommand = process.platform === "win32"
      ? { command: process.env.ComSpec || "cmd.exe", arguments: ["/d", "/s", "/c", "npm run build"] }
      : { command: "npm", arguments: ["run", "build"] };
    const commandResult = runCommand(buildCommand.command, buildCommand.arguments);
    const result = {
      id: "RQ-11",
      title: "프론트엔드 프로덕션 빌드",
      ok: commandResult.ok,
      durationMs: commandResult.durationMs,
      details: commandResult.ok ? null : summarizeFailure(commandResult),
    };
    results.push(result);
    if (!jsonOutput) printResult(result);
  }

  const failedResults = results.filter((result) => !result.ok);
  const report = {
    checkedAt: new Date().toISOString(),
    passed: results.length - failedResults.length,
    failed: failedResults.length,
    skippedBuild: skipBuild,
    results,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Result: ${report.passed}/${results.length} requirements passed.`);
  }

  if (failedResults.length) process.exitCode = 1;
}
