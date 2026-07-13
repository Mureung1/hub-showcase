import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { globMatches, validateRepository } from "../validate.mjs";

const toolsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(toolsRoot, "../..");
const fixtureRoot = (name) => path.join(toolsRoot, "test-fixtures", name);

const negativeCases = [
  ["invalid-frontmatter", "FRONTMATTER_REQUIRED"],
  ["duplicate-id", "DUPLICATE_ID"],
  ["broken-link", "BROKEN_LINK"],
  ["placeholder", "PLACEHOLDER"],
  ["secret", "SECRET_PATTERN"],
];

for (const [fixture, expectedCode] of negativeCases) {
  test(`${fixture} fixture가 ${expectedCode}로 실패한다`, () => {
    const errors = validateRepository({ root: fixtureRoot(fixture), changedFiles: [] });
    assert.ok(errors.some((error) => error.startsWith(expectedCode)), errors.join("\n"));
  });
}

test("Work Record에 선언하지 않은 변경 경로를 거부한다", () => {
  const errors = validateRepository({
    root: fixtureRoot("untraced"),
    changedFiles: [
      "docs/work-records/WI-0001-fixture.md",
      "src/uncovered.java",
    ],
  });
  assert.ok(errors.some((error) => error.startsWith("TRACEABILITY_PATH")), errors.join("\n"));
});

test("경로 glob이 루트와 중첩 경로를 정확히 매칭한다", () => {
  assert.equal(globMatches("docs/README.md", "docs/**"), true);
  assert.equal(globMatches("docs/adr/ADR-0001-x.md", "docs/**"), true);
  assert.equal(globMatches("docker-compose.observability.yml", "docker-compose*.yml"), true);
  assert.equal(globMatches("src/file.js", "backend/**"), false);
});

test("Codex Stop hook은 3단계 schema와 유효한 JSON 출력을 사용한다", () => {
  const hooks = JSON.parse(readFileSync(path.join(repositoryRoot, ".codex", "hooks.json"), "utf8"));
  assert.ok(Array.isArray(hooks.hooks.Stop));
  assert.ok(Array.isArray(hooks.hooks.Stop[0].hooks));
  assert.equal(hooks.hooks.Stop[0].hooks[0].type, "command");

  const result = spawnSync(process.execPath, [path.join(toolsRoot, "codex-stop-reminder.mjs")], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.continue, true);
  assert.equal(typeof output.systemMessage, "string");
});
