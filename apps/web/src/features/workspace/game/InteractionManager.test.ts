import assert from "node:assert/strict";
import test from "node:test";
import { findNearestInteraction } from "./InteractionManager";
import type { WorkspaceInteraction } from "../model/workspace.types";

const interactions: WorkspaceInteraction[] = [
  {
    id: "repository-alpha",
    kind: "repository",
    label: "alpha 기록 보기",
    position: { x: 96, y: 96 },
    activationRadius: 56,
    repositoryId: "alpha",
  },
  {
    id: "new-analysis",
    kind: "new-analysis",
    label: "새 Repository 분석",
    position: { x: 224, y: 160 },
    activationRadius: 64,
  },
];

test("returns the nearest interaction inside its activation radius", () => {
  assert.equal(
    findNearestInteraction({ x: 210, y: 150 }, interactions)?.id,
    "new-analysis",
  );
});

test("returns null when every interaction is outside its activation radius", () => {
  assert.equal(findNearestInteraction({ x: 500, y: 400 }, interactions), null);
});

test("uses the closest target when interaction areas overlap", () => {
  const overlapping: WorkspaceInteraction[] = [
    { ...interactions[0], activationRadius: 200 },
    { ...interactions[1], activationRadius: 200 },
  ];

  assert.equal(
    findNearestInteraction({ x: 190, y: 145 }, overlapping)?.id,
    "new-analysis",
  );
});
