import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
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
    title: "프로필 검증, 안전한 저장, 사용자별 DB 분리",
    tests: [
      "tests/profileSchema.test.js",
      "tests/profileStore.test.js",
      "tests/profileRequestSchema.test.js",
      "tests/profileRepository.test.js",
    ],
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
    title: "공지 링크 추출, 중복 제거, 순차 분석, 결과 유지",
    tests: [
      "tests/noticeLinkDeduplication.test.js",
      "tests/noticeOrdering.test.js",
      "tests/analyzeNoticeLinks.test.js",
      "tests/scanResultStore.test.js",
    ],
  },
  {
    id: "RQ-06B",
    title: "브라우저 공지 목록 게시일 추출",
    runner: "vitest",
    tests: ["tests/vitest/noticeLinkPublishedAt.test.js"],
  },
  {
    id: "RQ-07",
    title: "대용량 공고 본문 안전 처리",
    tests: ["tests/fetchOpportunityText.test.js"],
  },
  {
    id: "RQ-08",
    title: "로컬/배포 런타임 보안 기본값",
    tests: [
      "tests/runtimeInfrastructure.test.js",
      "tests/apiBaseUrl.test.js",
      "tests/dockerRuntimeFiles.test.js",
      "tests/requireScanAccess.test.js",
    ],
  },
  {
    id: "RQ-09",
    title: "Supabase와 로컬 SQLite 공고 저장 및 조회",
    tests: [
      "tests/opportunityRepository.test.js",
      "tests/localOpportunityRepository.test.js",
      "tests/localDemoMiddleware.test.js",
    ],
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
  {
    id: "RQ-11",
    title: "Supabase 인증과 서버 사용자 식별",
    tests: [
      "tests/authErrorMessages.test.js",
      "tests/authIdentity.test.js",
      "tests/authMiddleware.test.js",
      "tests/authSessionStorage.test.js",
    ],
  },
  {
    id: "RQ-11B",
    title: "로그인 전 서비스 접근 차단",
    runner: "vitest",
    tests: ["tests/vitest/authGate.test.js"],
  },
  {
    id: "RQ-12",
    title: "사용자별 저장 출처와 저장 공고 관리",
    tests: [
      "tests/customSourceStore.test.js",
      "tests/noticeSourceRepository.test.js",
      "tests/savedOpportunityRepository.test.js",
    ],
  },
  {
    id: "RQ-13",
    title: "개인 설정 기반 필터와 사이트 추천",
    tests: [
      "tests/filterAnalysesBySettings.test.js",
      "tests/geminiExplainSiteRecommendations.test.js",
      "tests/recommendSites.test.js",
      "tests/savedSourceRecommendationFilter.test.js",
      "tests/userSettingsRepository.test.js",
      "tests/userSettingsSchemas.test.js",
    ],
  },
  {
    id: "RQ-14",
    title: "마감 태스크 생성과 날짜 경계 처리",
    runner: "vitest",
    tests: ["tests/vitest/createTasks.test.js", "tests/vitest/taskSchedule.test.js"],
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

function listTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return listTestFiles(entryPath);
    if (!entry.isFile() || !entry.name.endsWith(".test.js")) return [];
    return [relative(projectRoot, entryPath).replaceAll("\\", "/")];
  });
}

function validateRequirementCoverage() {
  const assignedTests = requirementGroups.flatMap((requirement) => requirement.tests);
  const assignedSet = new Set(assignedTests);
  const discoveredTests = listTestFiles(resolve(projectRoot, "tests"));
  const unassignedTests = discoveredTests.filter((testFile) => !assignedSet.has(testFile));
  const duplicateTests = [...new Set(
    assignedTests.filter((testFile, index) => assignedTests.indexOf(testFile) !== index),
  )];

  const details = [
    unassignedTests.length ? `Unassigned test files: ${unassignedTests.join(", ")}` : null,
    duplicateTests.length ? `Tests assigned more than once: ${duplicateTests.join(", ")}` : null,
  ].filter(Boolean);

  return {
    id: "RQ-00",
    title: "모든 자동 테스트의 요구사항 매핑",
    ok: details.length === 0,
    durationMs: 0,
    details: details.join("\n") || null,
  };
}

function runRequirement(requirement) {
  if (requirement.runner === "vitest") {
    const vitestEntry = resolve(projectRoot, "node_modules/vitest/vitest.mjs");
    if (!existsSync(vitestEntry)) {
      return {
        ok: false,
        durationMs: 0,
        output: "",
        error: "Vitest is not installed. Run npm install first.",
        status: null,
        signal: null,
      };
    }
    return runCommand(process.execPath, [vitestEntry, "run", ...requirement.tests]);
  }

  return runCommand(process.execPath, ["--test", ...requirement.tests]);
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

  const coverageResult = validateRequirementCoverage();
  results.push(coverageResult);
  if (!jsonOutput) printResult(coverageResult);

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

    const commandResult = runRequirement(requirement);
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
      id: "RQ-15",
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
