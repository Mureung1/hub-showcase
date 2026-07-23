import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLAN_STATES = new Set([
  "제안",
  "승인됨",
  "진행 중",
  "검증 대기",
  "종료",
  "보류",
]);
const VERIFICATION_STATES = new Set([
  "진행 중",
  "통과",
  "보완 필요",
  "보류",
]);

function extractStatus(content, relativePath) {
  const match = content.match(/^> 상태: (.+)$/m);
  if (!match) {
    return {
      error: `${relativePath}: 상단 상태 헤더를 찾지 못했습니다.`,
      status: null,
    };
  }

  return { error: null, status: match[1].trim() };
}

function checklistStates(content) {
  const states = new Map();
  const pattern = /^- \[([ x])\].*?\*\*T(\d+)\./gm;

  for (const match of content.matchAll(pattern)) {
    const taskId = `T${match[2]}`;
    if (states.has(taskId)) {
      throw new Error(`docs/CHECKLIST.md에 ${taskId}가 두 번 정의되어 있습니다.`);
    }
    states.set(taskId, match[1] === "x");
  }

  return states;
}

function validateRecord(record, checklist) {
  const errors = [];
  const { directory, planStatus, verificationStatus, taskId } = record;

  if (!PLAN_STATES.has(planStatus)) {
    errors.push(
      `${directory}/plan.md: 허용되지 않은 상태 "${planStatus}"입니다.`,
    );
  }
  if (!VERIFICATION_STATES.has(verificationStatus)) {
    errors.push(
      `${directory}/verification.md: 허용되지 않은 상태 "${verificationStatus}"입니다.`,
    );
  }

  if (taskId) {
    if (!checklist.has(taskId)) {
      errors.push(`${directory}: ${taskId}가 docs/CHECKLIST.md에 없습니다.`);
      return errors;
    }

    const completed = checklist.get(taskId);
    if (completed && planStatus !== "종료") {
      errors.push(
        `${directory}: CHECKLIST 완료 ${taskId}의 plan 상태는 "종료"여야 합니다.`,
      );
    }
    if (completed && verificationStatus !== "통과") {
      errors.push(
        `${directory}: CHECKLIST 완료 ${taskId}의 verification 상태는 "통과"여야 합니다.`,
      );
    }
    if (!completed && planStatus === "종료") {
      errors.push(
        `${directory}: CHECKLIST 미완료 ${taskId}의 plan을 "종료"할 수 없습니다.`,
      );
    }
    if (!completed && verificationStatus === "통과") {
      errors.push(
        `${directory}: CHECKLIST 미완료 ${taskId}의 verification을 "통과"로 둘 수 없습니다.`,
      );
    }
    return errors;
  }

  const planClosed = planStatus === "종료";
  const verificationPassed = verificationStatus === "통과";
  if (planClosed !== verificationPassed) {
    errors.push(
      `${directory}: 비-T 작업은 plan="종료"와 verification="통과"가 함께여야 합니다.`,
    );
  }

  return errors;
}

function runSelfTest() {
  const checklist = new Map([
    ["T1", true],
    ["T2", false],
  ]);
  const cases = [
    {
      expectedErrors: 0,
      record: {
        directory: "tasks/T1-valid",
        planStatus: "종료",
        verificationStatus: "통과",
        taskId: "T1",
      },
    },
    {
      expectedErrors: 1,
      record: {
        directory: "tasks/T2-invalid-plan-state",
        planStatus: "완료",
        verificationStatus: "진행 중",
        taskId: "T2",
      },
    },
    {
      expectedErrors: 2,
      record: {
        directory: "tasks/T1-stale",
        planStatus: "진행 중",
        verificationStatus: "보류",
        taskId: "T1",
      },
    },
    {
      expectedErrors: 1,
      record: {
        directory: "tasks/T2-premature-pass",
        planStatus: "진행 중",
        verificationStatus: "통과",
        taskId: "T2",
      },
    },
  ];

  for (const testCase of cases) {
    const errors = validateRecord(testCase.record, checklist);
    if (errors.length !== testCase.expectedErrors) {
      throw new Error(
        `self-test 실패: ${testCase.record.directory}에서 오류 ${testCase.expectedErrors}개를 기대했지만 ${errors.length}개였습니다.`,
      );
    }
  }
}

async function loadRecord(tasksRoot, entryName) {
  const directory = `harness/tasks/${entryName}`;
  const planPath = join(tasksRoot, entryName, "plan.md");
  const verificationPath = join(tasksRoot, entryName, "verification.md");
  let planContent;
  let verificationContent;

  try {
    [planContent, verificationContent] = await Promise.all([
      readFile(planPath, "utf8"),
      readFile(verificationPath, "utf8"),
    ]);
  } catch {
    return {
      errors: [`${directory}: plan.md와 verification.md 파일 쌍이 필요합니다.`],
      record: null,
    };
  }

  const plan = extractStatus(planContent, `${directory}/plan.md`);
  const verification = extractStatus(
    verificationContent,
    `${directory}/verification.md`,
  );
  const errors = [plan.error, verification.error].filter(Boolean);
  const taskMatch = entryName.match(/^T(\d+)-/);

  return {
    errors,
    record:
      plan.status && verification.status
        ? {
            directory,
            planStatus: plan.status,
            verificationStatus: verification.status,
            taskId: taskMatch ? `T${taskMatch[1]}` : null,
          }
        : null,
  };
}

async function main() {
  const argumentsSet = new Set(process.argv.slice(2));
  if (argumentsSet.has("--self-test")) {
    runSelfTest();
    console.log("Harness state checker self-test passed: 4 cases.");
  }

  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDirectory, "..");
  const tasksRoot = join(projectRoot, "harness", "tasks");
  const checklist = checklistStates(
    await readFile(join(projectRoot, "docs", "CHECKLIST.md"), "utf8"),
  );
  const entries = await readdir(tasksRoot, { withFileTypes: true });
  const taskDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const loaded = await Promise.all(
    taskDirectories.map((entryName) => loadRecord(tasksRoot, entryName)),
  );
  const errors = loaded.flatMap((result) => [
    ...result.errors,
    ...(result.record ? validateRecord(result.record, checklist) : []),
  ]);

  if (errors.length > 0) {
    console.error(`Harness state check failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const tItems = loaded.filter((result) => result.record?.taskId).length;
  console.log(
    `Harness state check passed: ${loaded.length} task folders (${tItems} T-items, ${loaded.length - tItems} non-T).`,
  );
}

await main();
