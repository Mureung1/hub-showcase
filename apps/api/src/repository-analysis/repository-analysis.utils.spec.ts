import {
  calculateCommitActivityPercent,
  createResultHash,
  parseGitHubRepositoryUrl,
} from "./repository-analysis.utils";

describe("parseGitHubRepositoryUrl", () => {
  it("parses a public GitHub Repository URL", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub")).toEqual({
      owner: "SubJeeLee",
      repository: "hub",
    });
  });

  it("accepts a trailing slash and .git suffix", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/SubJeeLee/hub.git/")).toEqual({
      owner: "SubJeeLee",
      repository: "hub",
    });
  });

  it.each([
    "",
    "http://github.com/SubJeeLee/hub",
    "https://example.com/SubJeeLee/hub",
    "https://github.com/SubJeeLee",
    "https://github.com/SubJeeLee/hub/issues",
  ])("rejects an unsupported URL: %s", (value) => {
    expect(parseGitHubRepositoryUrl(value)).toBeNull();
  });
});

describe("calculateCommitActivityPercent", () => {
  it("calculates commit-count activity percentages", () => {
    expect(
      calculateCommitActivityPercent([
        { login: "alpha", commitCount: 3 },
        { login: "beta", commitCount: 1 },
      ]),
    ).toEqual([
      { login: "alpha", commitCount: 3, commitActivityPercent: 75 },
      { login: "beta", commitCount: 1, commitActivityPercent: 25 },
    ]);
  });

  it("returns zero percentages when no commits exist", () => {
    expect(
      calculateCommitActivityPercent([
        { login: "alpha", commitCount: 0 },
        { login: "beta", commitCount: 0 },
      ]),
    ).toEqual([
      { login: "alpha", commitCount: 0, commitActivityPercent: 0 },
      { login: "beta", commitCount: 0, commitActivityPercent: 0 },
    ]);
  });
});

describe("createResultHash", () => {
  it("creates the same hash regardless of object key order", () => {
    const first = createResultHash({ repository: { owner: "ptop", name: "hub" }, commits: 3 });
    const second = createResultHash({ commits: 3, repository: { name: "hub", owner: "ptop" } });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when analysis data changes", () => {
    expect(createResultHash({ commits: 3 })).not.toBe(createResultHash({ commits: 4 }));
  });
});
