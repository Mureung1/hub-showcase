import test from "node:test";
import assert from "node:assert/strict";
import {
  formatWorkspaceRepositoryDate,
  getRepositoryWorkspaceInteractions,
  getWorkspaceRepositoryLabel,
  workspaceRepositoryMonitorSlots,
} from "./workspaceMap";

test("saved portfolios are assigned to distinct monitor slots", () => {
  const projects = [
    { id: "portfolio-1", repositoryOwner: "owner", repositoryName: "one", challengeTitle: "첫 도전", updatedAt: "2026-05-14T09:00:00.000Z" },
    { id: "portfolio-2", repositoryOwner: "owner", repositoryName: "two", challengeTitle: "두 번째 도전", updatedAt: "2026-04-02T09:00:00.000Z" },
  ];

  const interactions = getRepositoryWorkspaceInteractions(projects);

  assert.equal(interactions.length, 2);
  assert.deepEqual(interactions.map((item) => item.kind === "repository" ? item.repositoryId : ""), [
    "portfolio-1",
    "portfolio-2",
  ]);
  assert.notDeepEqual(interactions[0].position, interactions[1].position);
  assert.match(interactions[0].label, /one/);
  assert.equal(interactions[0].kind, "repository");
  if (interactions[0].kind === "repository") {
    assert.equal(interactions[0].repositoryName, "one");
    assert.equal(interactions[0].repositoryOwner, "owner");
    assert.equal(interactions[0].challengeTitle, "첫 도전");
    assert.equal(interactions[0].updatedAt, "2026-05-14T09:00:00.000Z");
  }
});

test("saved portfolios beyond available monitors are not rendered as interactions", () => {
  const projects = Array.from({ length: 20 }, (_, index) => ({
    id: `portfolio-${index}`,
    repositoryOwner: "owner",
    repositoryName: `repo-${index}`,
    challengeTitle: "도전",
    updatedAt: "2026-04-02T09:00:00.000Z",
  }));

  const interactions = getRepositoryWorkspaceInteractions(projects);

  assert.ok(interactions.length > 0);
  assert.ok(interactions.length < projects.length);
});

test("keeps persisted monitor slots when project order changes", () => {
  const interactions = getRepositoryWorkspaceInteractions([
    { id: "new", repositoryOwner: "owner", repositoryName: "new", challengeTitle: "새 도전", updatedAt: "2026-05-15T09:00:00.000Z" },
    { id: "old", repositoryOwner: "owner", repositoryName: "old", challengeTitle: "기존 도전", updatedAt: "2026-05-14T09:00:00.000Z", workspaceSlot: 3 },
  ]);

  const oldInteraction = interactions.find((item) => item.kind === "repository" && item.repositoryId === "old");
  const newInteraction = interactions.find((item) => item.kind === "repository" && item.repositoryId === "new");

  assert.deepEqual(oldInteraction?.position, workspaceRepositoryMonitorSlots[3]);
  assert.deepEqual(newInteraction?.position, workspaceRepositoryMonitorSlots[0]);
});

test("reserves persisted slots before assigning new projects", () => {
  const interactions = getRepositoryWorkspaceInteractions([
    { id: "new", repositoryOwner: "owner", repositoryName: "new", challengeTitle: "새 도전", updatedAt: "2026-05-15T09:00:00.000Z" },
    { id: "old", repositoryOwner: "owner", repositoryName: "old", challengeTitle: "기존 도전", updatedAt: "2026-05-14T09:00:00.000Z", workspaceSlot: 0 },
  ]);

  const oldInteraction = interactions.find((item) => item.kind === "repository" && item.repositoryId === "old");
  const newInteraction = interactions.find((item) => item.kind === "repository" && item.repositoryId === "new");

  assert.deepEqual(oldInteraction?.position, workspaceRepositoryMonitorSlots[0]);
  assert.deepEqual(newInteraction?.position, workspaceRepositoryMonitorSlots[1]);
});

test("saved portfolio dates are formatted for monitor labels", () => {
  assert.equal(formatWorkspaceRepositoryDate("2026-05-14T09:00:00.000Z"), "05-14");
  assert.equal(formatWorkspaceRepositoryDate("not-a-date"), "날짜 없음");
});

test("monitor labels stay readable when repository or challenge names are long", () => {
  assert.equal(
    getWorkspaceRepositoryLabel(
      "very-long-repository-name-that-needs-truncation",
      "아주 긴 기술적 도전 제목도 줄여서 보여줍니다",
    ),
    "very-long-repository… · 아주 긴 기술적 도전 제목…",
  );
});
