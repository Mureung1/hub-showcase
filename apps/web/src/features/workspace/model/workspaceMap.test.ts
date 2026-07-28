import test from "node:test";
import assert from "node:assert/strict";
import { getRepositoryWorkspaceInteractions } from "./workspaceMap";

test("saved portfolios are assigned to distinct monitor slots", () => {
  const projects = [
    { id: "portfolio-1", repositoryName: "one", challengeTitle: "첫 도전" },
    { id: "portfolio-2", repositoryName: "two", challengeTitle: "두 번째 도전" },
  ];

  const interactions = getRepositoryWorkspaceInteractions(projects);

  assert.equal(interactions.length, 2);
  assert.deepEqual(interactions.map((item) => item.kind === "repository" ? item.repositoryId : ""), [
    "portfolio-1",
    "portfolio-2",
  ]);
  assert.notDeepEqual(interactions[0].position, interactions[1].position);
  assert.match(interactions[0].label, /one/);
});

test("saved portfolios beyond available monitors are not rendered as interactions", () => {
  const projects = Array.from({ length: 20 }, (_, index) => ({
    id: `portfolio-${index}`,
    repositoryName: `repo-${index}`,
    challengeTitle: "도전",
  }));

  const interactions = getRepositoryWorkspaceInteractions(projects);

  assert.ok(interactions.length > 0);
  assert.ok(interactions.length < projects.length);
});
