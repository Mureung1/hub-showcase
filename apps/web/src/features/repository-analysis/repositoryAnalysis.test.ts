import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYSIS_STATUS,
  createMockAnalysisResult,
  getRepositoryUrlError,
  parseGitHubRepositoryUrl,
} from "./repositoryAnalysis";

test("parseGitHubRepositoryUrl parses a normal GitHub repository URL", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub"), {
    owner: "SubJeeLee",
    repo: "hub",
  });
});

test("parseGitHubRepositoryUrl supports trailing slash and .git suffix", () => {
  assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub.git/"), {
    owner: "SubJeeLee",
    repo: "hub",
  });
});

test("getRepositoryUrlError blocks empty and invalid repository URLs", () => {
  assert.equal(getRepositoryUrlError(""), "분석할 GitHub Repository URL을 입력해 주세요.");
  assert.equal(
    getRepositoryUrlError("https://example.com/SubJeeLee/hub"),
    "GitHub Repository URL만 분석할 수 있습니다.",
  );
  assert.equal(
    getRepositoryUrlError("https://github.com/SubJeeLee"),
    "https://github.com/owner/repository 형식으로 입력해 주세요.",
  );
});

test("createMockAnalysisResult creates a replaceable mock result from owner and repo", () => {
  const result = createMockAnalysisResult({ owner: "SubJeeLee", repo: "hub" });

  assert.equal(result.name, "SubJeeLee/hub");
  assert.equal(result.url, "https://github.com/SubJeeLee/hub");
  assert.equal(result.owner, "SubJeeLee");
  assert.equal(result.isMock, true);
  assert.ok(result.contributors.length >= 3);
  assert.ok(result.ownerMessages.length >= 3);
  assert.ok(result.summary.includes("hub"));
});

test("ANALYSIS_STATUS keeps the UI state model explicit", () => {
  assert.deepEqual(ANALYSIS_STATUS, {
    idle: "idle",
    loading: "loading",
    success: "success",
    error: "error",
  });
});
